/**
    MyGet - A multi-thread downloading library
    Copyright (C) 2014-2022 [Chandler Stimson]

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    GitHub: https://github.com/chandler-stimson/live-stream-downloader/
    Homepage: https://webextension.org/listing/hls-downloader.html
*/

/* global parse, MyGet, network, extract, helper, addEntries */

const args = new URLSearchParams(location.search);

const tabId = Number(args.get('tabId')); // original tab
const progress = document.getElementById('current-progress');

const events = {
  before: new Set(), // before download begins
  after: new Set() // after download ends
};

document.title = '正在掃描分頁媒體...';
Promise.all([
  tabId ? extract.storage(tabId) : [],
  tabId ? extract.performance(tabId): [],
  tabId ? extract.player(tabId) : []
]).then(async ([storageEntries, performanceEntries, playerEntries]) => {
  const entries = new Map();
  if (args.get('extra') === 'true') {
    try {
      const links = await new Promise(resolve => chrome.runtime.sendMessage({
        method: 'get-extra',
        tabId
      }, resolve));

      for (const url of links) {
        entries.set(url, {url});
      }
    }
    catch (e) {
      console.error(e);
    }
  }

  try {
    for (const entry of (playerEntries || [])) {
      entries.set(entry.url, entry);
    }
  }
  catch (e) {}
  try {
    for (const entry of (performanceEntries || [])) {
      entries.set(entry.url, entry);
    }
  }
  catch (e) {}
  // overwrite performanceEntries which does not include details
  try {
    for (const entry of (storageEntries || [])) {
      entries.set(entry.url, entry);
    }
  }
  catch (e) {}

  // append: accepts both JSON and url as value
  for (const s of args.getAll('append')) {
    try {
      const o = JSON.parse(s);
      if (o.url) {
        entries.set(o.url, o);
      }
    }
    catch (e) {
      entries.set(s, {
        url: s
      });
    }
  }

  let forbiddens = 0;
  // remove forbidden links
  const blocked = await network.blocked();
  for (const [stream, entry] of entries.entries()) {
    entry.blocked = blocked({
      host: args.get('href'),
      stream
    });
    if (entry.blocked.value) {
      forbiddens += 1;
    }
  }

  await addEntries(entries);

  // forbidden
  document.getElementById('forbiddens').textContent = forbiddens;
  if (forbiddens) {
    document.body.classList.add('forbidden');
  }
});

const error = e => {
  console.warn(e);
  document.title = e?.message;
  document.body.dataset.mode = 'error';
};

const download = async (segments, file, codec = '') => {
  document.body.dataset.mode = 'download';
  progress.value = 0;

  // remove discontinuity
  const timelines = {};
  for (const segment of segments) {
    timelines[segment.timeline] = timelines[segment.timeline] || [];
    timelines[segment.timeline].push(segment);
  }
  const timingObjects = Object.entries(timelines);

  if (timingObjects.length > 1) {
    const msg = `此 M3U8 包含多個時間軸（常見於廣告插入或分段媒體），請選擇您要下載的時間軸。` +
      `建議將各時間軸分開下載以獲得最佳相容性，您也可以合併下載為單一檔案。`;

    // select the longest timeline
    let suggested = 0;
    let largestObject = 0;
    for (const [id, a] of timingObjects) {
      if (largestObject < a.length) {
        suggested = id;
        largestObject = a.length;
      }
    }
    const selected = await self.prompt(msg + `\n\n` +
      timingObjects.map(([id, a]) => {
        return id + ' (包含 ' + a.length + ' 個片段)';
      }).join('\n'), {
      ok: '下載選取的時間軸',
      extra: ['個別分開下載所有時間軸', '合併下載 (忽略分軸)'],
      no: '取消',
      value: suggested
    }, true);

    if (selected === 'extra-0') {
      const jobs = [];
      for (const [timeline, segments] of timingObjects) {
        const name = file.name.replace(/\.(?=[^.]+$)/, '-' + timeline + '.');
        jobs.push({name, segments});
      }
      try {
        file.remove();
      }
      catch (e) {}
      return self.batch(jobs, codec);
    }
    else if (selected !== 'extra-1') {
      segments = timelines[selected];
    }
  }
  if (Array.isArray(segments) === false) {
    throw Error('UNKNOWN_TIMELINE');
  }

  // remove duplicated segments (e.g. video/fMP4)
  const links = [];
  segments = segments.filter(segment => {
    if (links.indexOf(segment.uri) === -1) {
      links.push(segment.uri);
      return true;
    }
    return false;
  });

  // segment with initialization map
  segments = segments.map(segment => {
    if (segment.map) {
      const uri = segment.map.resolvedUri || segment.map.uri;
      if (uri && uri !== segment.uri) {
        return [{
          ...segment,
          ...segment.map,
          cache: true // cache this fetch
        }, segment];
      }
    }
    return segment;
  }).flat();

  const stat = {
    fetched: 0,
    current: 0,
    total: segments.length
  };

  const myGet = new MyGet();
  myGet.meta['base-codec'] = codec;

  // stats
  myGet.monitor = new Proxy(myGet.monitor, {
    apply(target, self, args) {
      const [, position, chunk] = args;
      stat.current = Math.max(stat.current, position);
      stat.fetched += chunk.byteLength;

      return Reflect.apply(target, self, args);
    }
  });

  Object.assign(myGet.options, await chrome.storage.local.get({
    'threads': MyGet.OPTIONS.threads,
    'thread-timeout': MyGet.OPTIONS['thread-timeout']
  }));

  // instead of breaking, let the user retry
  myGet.options['error-handler'] = (e, source, href) => {
    return self.prompt(`伺服器連線中斷 (${source} -> ${e.message})！\n\n可在下方輸入框更新網址後重試：`, {
      ok: '重試',
      no: '取消',
      value: href
    }, true).then(v => {
      if (v) {
        try {
          new URL(v);
          return v;
        }
        catch (e) {
          console.info('URL replacement ignored', e);
        }
      }
    });
  };

  console.info('MyGet Instance', myGet);

  const timer = setInterval(() => {
    // downloading a single segment file
    if (stat.total === 1) {
      if (myGet.sizes.has(0)) {
        const percent = stat.fetched / myGet.sizes.get(0) * 100;
        document.title =
          percent.toFixed(1) + `% 已下載 [${MyGet.size(stat.fetched)}/${MyGet.size(myGet.sizes.get(0))}]` +
          ` [連線數: ${myGet.actives}]`;

        progress.value = stat.fetched;
        progress.max = myGet.sizes.get(0);
      }
      else {
        document.title = MyGet.size(stat.fetched) + ' 已下載...';
      }
    }
    // downloading multiple segment file
    else {
      document.title = (stat.current / stat.total * 100).toFixed(1) +
        `% 已下載 [${stat.current}/${stat.total}] (${MyGet.size(stat.fetched)})` + ` [連線數: ${myGet.actives}]`;

      progress.value = stat.current;
      progress.max = stat.total;
    }
    //
    if (self.aFile) {
      document.title += ' 任務 [' + self.aFile.stat.index + '/' + self.aFile.stat.total + ']';
    }
  }, 750);

  try {
    // attach disk writer
    await myGet.attach(file);

    // download
    await myGet.fetch(segments);
    clearInterval(timer);

    document.title = '下載完成！媒體檔案已就緒';
    if ('download' in file) { // Firefox
      file.download(file.name);
    }

    // try to rename
    if (myGet.meta.name && myGet.meta.ext && file.move) {
      const name = myGet.meta.name + '.' + myGet.meta.ext;
      if (name !== file.name) {
        const input = document.querySelector('[data-active=true] input[data-id=rename]');
        if (input) {
          input.disabled = false;
          input.onclick = e => {
            if (confirm(`是否將媒體檔案從 "${file.name}" 重新命名為 "${name}"？\n\n注意：如果已有同名檔案將會被覆蓋。`)) {
              file.move(name).catch(e => self.notify(e.message));
              e.target.disabled = true;
            }
          };
        }
      }
    }

    document.body.dataset.mode = 'done';
  }
  catch (e) {
    error(e);
  }
  clearInterval(timer);
};

/* queued entries wait on an unlimited promise until the user presses Start */
const queue = new Map(); // label -> {controller, resolve, promise, file, button}

/* queued entries start via the Download button and cancel via the Queue button */
const setQueued = (div, queued) => {
  const download = div.querySelector('[data-id=download]');
  const q = div.querySelector('[data-id=queue]');
  if (queued) {
    // keep the current labels so that they can be restored (they may be localized)
    download.dataset.label = download.value;
    q.dataset.label = q.value;
    download.value = '開始下載';
    download.dataset.action = 'start';
    q.value = '取消排程';
    q.dataset.action = 'cancel';
  }
  else {
    download.value = download.dataset.label || download.value;
    q.value = q.dataset.label || q.value;
    delete download.dataset.label;
    delete q.dataset.label;
    download.dataset.action = 'download';
    q.dataset.action = 'queue';
  }
};

{
  // double ESC (within 1 second) cancels all queue items at once;
  // programmatic (e.isTrusted === false) invocations skip the confirmation
  let stamp = 0;
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') {
      stamp = 0;
      return;
    }
    const now = Date.now();
    if (stamp && now - stamp < 1000) {
      stamp = 0;
      if (queue.size && (e.isTrusted === false || confirm('確定要取消所有排程中的下載任務嗎？'))) {
        for (const [div, record] of queue) {
          record.controller.abort(Error('QUEUE_ABORT')); // rejects the unlimited promise
          setQueued(div, false);
        }
        queue.clear();
        self.notify('已取消所有排程任務');
      }
    }
    else {
      stamp = now;
    }
  });
}

/* prepare the changes that a rejected save request requires; null when there is nothing to adjust */
const adjust = opts => {
  const msgs = [];

  // remove illegal or problematic characters from the suggested name for Windows, macOS, Linux
  // https://github.com/chandler-stimson/live-stream-downloader/issues/46
  let name = opts.suggestedName || '';
  const n = name.replace(
    /[\\/:*?"<>|\0]|^[\s.]+|[\s.]+$|[~`!@#$%^&+={}[\];,]/g,
    '_'
  );
  if (n !== name) {
    msgs.push(`檔案名稱 "${name}" 包含特殊或不支援的字元，已自動調整為 "${n}"。`);
    name = n;
  }

  // the file type filter must be dropped when a MIME type or an extension is not acceptable
  const types = Array.isArray(opts.types) ? opts.types : [];
  const accept = types[0]?.accept;
  const invalid = accept && Object.entries(accept).some(([mime, exts]) => {
    return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mime) === false ||
      exts.some(ext => /^\.[^.]{1,15}$/.test(ext) === false);
  });
  if (types.length && (!accept || invalid)) {
    msgs.push('請求的檔案類型篩選被系統檔案對話框拒絕，已自動調整。可使用「所有檔案」篩選器選取任意檔名。');
    return {
      name,
      dropTypes: true,
      msg: msgs.join('\n')
    };
  }

  return msgs.length ? {
    name,
    msg: msgs.join('\n')
  } : null;
};

/* ask user for picking a location; when the request fails, report the required changes
   to the user and let the dialog itself provide the user gesture that each retried request needs */
const pickSaveFile = async opts => {
  let attempts = 0;
  let firstError = null;
  for (;;) {
    try {
      // use the original name
      return await window.showSaveFilePicker(opts);
    }
    catch (e) {
      if (e?.name !== 'AbortError') {
        console.error(e);
      }
      firstError = firstError || e;
      attempts += 1;

      // do not retry endlessly; the first error is the actual cause
      if (attempts >= 3) {
        throw firstError;
      }
      // an unknown error cannot be fixed by retrying with a fresh gesture
      if (e?.name !== 'AbortError' && e instanceof TypeError === false) {
        throw e;
      }

      const proposal = adjust(opts);
      try {
        // activating this dialog hands its user gesture over to the retried picker call below
        const name = await self.prompt(proposal ? `檔案儲存對話框被取消或拒絕。\n\n${proposal.msg}\n\n是否修改檔案名稱後重試？` : `檔案儲存對話框被中斷。\n\n是否修改檔案名稱後重試？`, {
          ok: '重試',
          no: '取消',
          value: proposal ? proposal.name : (opts.suggestedName || '')
        });

        if (name) {
          opts.suggestedName = name;
        }
        else {
          // the user cleared the box; let the file dialog suggest a name
          delete opts.suggestedName;
        }
        if (proposal?.dropTypes) {
          delete opts.types;
        }
      }
      catch {
        // the user canceled the dialog; keep the original picker error
        throw firstError;
      }
    }
  }
};

const run = async (div, picked, button) => {
  const label = button.value; // preserve for restoring (it may be localized)
  document.body.dataset.mode = 'prepare';

  try {
    div.dataset.active = true;

    const opts = helper.options(div);
    let file = picked || self.aFile;
    // ask user for picking
    if (!file) {
      file = await pickSaveFile(opts);
    }

    button.value = '正在處理中...';

    // run pre
    for (const callback of events.before) {
      await callback(div.entry);
    }

    if (div.entry instanceof File) {
      await new Promise((resolve, reject) => {
        document.title = '正在解析 M3U8 播放清單...';
        document.body.dataset.mode = 'parse';
        const reader = new FileReader();
        reader.onload = () => parse(reader.result, file, undefined, undefined, (segments, file, codec) => {
          document.title = '正在下載 ' + segments[0].base;
          return download(segments, file, codec);
        }).then(resolve, reject);
        reader.readAsText(div.entry, 'utf-8');
      });
    }
    else {
      if (helper.downloadable(div)) {
        document.title = '正在下載 ' + div.entry.url;
        await download([{
          uri: div.entry.url
        }], file);
      }
      else {
        document.title = '正在解析 M3U8 播放清單...';
        document.body.dataset.mode = 'parse';
        await parse(div.entry.url, file, undefined, undefined, (segments, file, codec) => {
          document.title = '正在下載 ' + segments[0].base;
          return download(segments, file, codec);
        });
      }
    }
    div.classList.remove('error');
    div.classList.add('done');
  }
  catch (e) {
    // the user dismissed the file picker dialog; this is not an error
    if (e?.name === 'AbortError') {
      document.body.dataset.mode = 'ready';
      self.notify('已取消檔案對話框；點擊下載按鈕可再次嘗試。', 5000);
    }
    else {
      div.classList.remove('done');
      div.classList.add('error');
      error(e);
    }
  }

  // run post
  for (const callback of events.after) {
    /* success, done */
    callback(
      document.body.dataset.mode === 'done',
      'aFile' in self ? self.aFile.stat.index === self.aFile.stat.total : true
    );
  }

  button.value = label;
  div.dataset.active = false;
};

document.getElementById('hrefs').onsubmit = async e => {
  e.preventDefault();
  const button = e.submitter;
  const div = button.closest('label');

  // dispatch on the stable action (button.value may be localized)
  const action = button.dataset.action;

  // queue: pick the location now; the download continues once Start is pressed
  if (action === 'queue') {
    document.body.dataset.mode = 'prepare';
    try {
      const file = await pickSaveFile(helper.options(div));

      const record = {
        controller: new AbortController(),
        file,
        button: div.querySelector('[data-id=download]')
      };
      record.promise = new Promise((resolve, reject) => {
        record.resolve = resolve;
        // abort listener rejects the unlimited promise
        record.controller.signal.addEventListener('abort', () => {
          reject(record.controller.signal.reason || Error('QUEUE_ABORT'));
        });
      });
      record.promise.then(() => {
        if (queue.delete(div)) {
          setQueued(div, false);
          run(div, record.file, record.button);
        }
      }, () => {});

      queue.set(div, record);
      setQueued(div, true);
      self.notify('點擊「開始下載」以啟動。連按兩次 Esc 可取消所有排程。', 5000);
      document.body.dataset.mode = 'ready';
    }
    catch (e) {
      // the user dismissed the file picker dialog; this is not an error
      if (e?.name === 'AbortError') {
        document.body.dataset.mode = 'ready';
        self.notify('已取消檔案對話框；點擊排程按鈕可再次嘗試。', 5000);
      }
      else {
        div.classList.remove('done');
        div.classList.add('error');
        error(e);
      }
    }
    return;
  }

  // Start resolves the queued promise; the continuation starts the download
  if (action === 'start') {
    queue.get(div)?.resolve();
    return;
  }

  // remove a single job from the queue
  if (action === 'cancel') {
    const record = queue.get(div);
    if (record) {
      record.controller.abort(Error('QUEUE_ABORT')); // rejects the unlimited promise
      queue.delete(div);
      setQueued(div, false);
    }
    return;
  }

  run(div, null, button);
};

/* 手動輸入影片 / M3U8 網址事件監聽 */
{
  const input = document.getElementById('manual-url-input');
  const btn = document.getElementById('manual-url-btn');
  if (input && btn) {
    const submitUrl = () => {
      const raw = input.value.trim();
      if (!raw) {
        self.notify('請先輸入或貼上影片網址！', 2000);
        input.focus();
        return;
      }
      try {
        const url = new URL(raw).href;
        const entries = new Map();
        entries.set(url, { url });
        addEntries(entries);
        input.value = '';
        self.notify('已成功新增下載任務！', 2000);
      } catch (e) {
        self.notify('網址格式無效，請確認是否包含 http:// 或 https://', 3000);
      }
    };
    btn.onclick = submitUrl;
    input.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitUrl();
      }
    };
  }
}
