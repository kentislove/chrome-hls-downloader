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

/* global network, extract */

if (typeof importScripts !== 'undefined') {
  self.importScripts('network/core.js');
  self.importScripts('network/icon.js');
  self.importScripts('context.js');
  self.importScripts('/plugins/blob-detector/tld.js');
  self.importScripts('/plugins/blob-detector/core.js');
  self.importScripts('/data/job/extract.js');
  self.importScripts('social/session.js');
}

self.notify = (tabId, text, title) => {
  chrome.action.setBadgeBackgroundColor({
    color: 'red'
  });
  chrome.action.setBadgeText({
    tabId,
    text
  });
  chrome.action.setTitle({
    tabId,
    title
  });
};

/* extra objects */
const extra = {};

const open = async (tab, extra = []) => {
  const win = await chrome.windows.getCurrent();

  const prefs = await chrome.storage.local.get({
    width: 800,
    height: 500 // for Windows we need this
  });
  const left = win.left + Math.round((win.width - 800) / 2);
  const top = win.top + Math.round((win.height - 500) / 2);

  const args = new URLSearchParams();
  if (tab) {
    args.set('tabId', tab.id);
    args.set('title', tab.title || '');
    args.set('href', tab.url || '');
  }
  for (const {key, value} of extra) {
    args.append(key, value);
  }

  return chrome.windows.create({
    url: '/data/job/index.html?' + args.toString(),
    width: prefs.width,
    height: prefs.height,
    left,
    top,
    type: 'popup'
  });
};
chrome.action.onClicked.addListener(tab => open(tab));
chrome.action.setBadgeBackgroundColor({
  color: '#666666'
});

const badge = (n, tabId) => {
  if (n) {
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        '16': '/data/icons/active/16.png',
        '32': '/data/icons/active/32.png',
        '48': '/data/icons/active/48.png'
      }
    });

    chrome.action.setBadgeText({
      tabId: tabId,
      text: new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(n)
    });
  }
  else {
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        '16': '/data/icons/16.png',
        '32': '/data/icons/32.png',
        '48': '/data/icons/48.png'
      }
    });
    chrome.action.setBadgeText({
      tabId: tabId,
      text: ''
    });
  }
};

/* 分頁最新捕獲影音儲存庫 (支援 session 快取防休眠) */
const capturedMediaByTab = new Map();

// 初始化還原 session 快取
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
  chrome.storage.session.get('capturedMedia', res => {
    if (res && res.capturedMedia) {
      for (const [k, v] of Object.entries(res.capturedMedia)) {
        capturedMediaByTab.set(Number(k), v);
      }
    }
  });
}

let persistTimer = null;
function persistCapturedMedia() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      const obj = {};
      for (const [k, v] of capturedMediaByTab.entries()) {
        obj[k] = v;
      }
      chrome.storage.session.set({ capturedMedia: obj }).catch(() => {});
    }
  }, 1000);
}

const observe = d => {
  // hard-coded excludes
  if (d.initiator && d.initiator.startsWith('https://www.youtube.com')) {
    return;
  }

  // 記錄該分頁捕獲的媒體串流
  if (d.tabId) {
    let contentType = '';
    if (d.responseHeaders && Array.isArray(d.responseHeaders)) {
      const ct = d.responseHeaders.find(h => h.name && h.name.toLowerCase() === 'content-type');
      if (ct) contentType = (ct.value || '').toLowerCase();
    }

    const u = d.url.toLowerCase();
    const isAudio = contentType.startsWith('audio/') || u.includes('mime_type=audio') || u.includes('tag=sve_sound') || u.includes('tag=sve_audio');
    const isVideo = contentType.startsWith('video/') || u.includes('mime_type=video') || u.includes('xpv_progressive') || u.includes('sve_hd') || u.includes('sve_sd');

    const list = capturedMediaByTab.get(d.tabId) || [];
    list.unshift({
      url: d.url,
      initiator: d.initiator,
      timeStamp: Date.now(),
      contentType: contentType,
      isAudio: isAudio,
      isVideo: isVideo,
      isProgressive: u.includes('xpv_progressive') || (isVideo && !isAudio && u.includes('.mp4'))
    });
    if (list.length > 50) list.pop();
    capturedMediaByTab.set(d.tabId, list);
    persistCapturedMedia();
  }

  // unsupported content types

  // unsupported content types
  if (
    d.url.includes('.m3u8') === false &&
    d.url.includes('.mpd') === false &&
    d.type !== 'media' &&
    d.responseHeaders.some(({name, value}) => {
      return (name === 'content-type' || name === 'Content-Type') && value && value.startsWith('text/html');
    })) {
    return;
  }

  chrome.scripting.executeScript({
    target: {
      tabId: d.tabId
    },
    func: (size, v) => {
      self.storage = self.storage || new Map();
      self.ports = self.ports || new Set();
      if (self.storage.has(v.url) === false) {
        for (const port of self.ports) {
          try {
            port.postMessage({
              cmd: 'media-detected',
              value: v
            });
          }
          catch (e) {}
        }
      }
      self.storage.set(v.url, v);

      if (self.storage.size > size) {
        for (const [href] of self.storage) {
          self.storage.delete(href);
          if (self.storage.size <= size) {
            break;
          }
        }
      }

      return self.storage.size;
    },
    args: [200, {
      url: d.url,
      initiator: d.initiator,
      timeStamp: d.timeStamp,
      responseHeaders: d.responseHeaders.filter(o => network.HEADERS.includes(o.name.toLowerCase()))
    }]
  }).then(c => badge(c[0].result, d.tabId)).catch(() => {});
};

/* clear old list on remove */
chrome.tabs.onRemoved.addListener(tabId => {
  // clear rules
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId]
  });
});

/* clear old list on reload */
// chrome.tabs.onUpdated.addListener((tabId, info) => {
//   if (info.status === 'loading') {
//     badge(0, tabId);
//   }
// });

let detectMedia = true;

{
  const registry = [];
  // Firefox requires a distinct callback per registration
  const wrapper = () => navigator.userAgent.includes('Firefox') ? d => observe(d) : observe;
  const install = () => {
    for (const o of registry) {
      if (o.added === false) {
        chrome.webRequest.onHeadersReceived.addListener(o.fn, o.filter, ['responseHeaders']);
        o.added = true;
        console.info(o.name, 'network observer is installed');
      }
    }
  };
  const uninstall = () => {
    for (const o of registry) {
      if (o.added) {
        chrome.webRequest.onHeadersReceived.removeListener(o.fn);
        o.added = false;
        console.info(o.name, 'network observer is removed');
      }
    }
  };
  const push = (filter, name) => registry.push({
    fn: wrapper(),
    filter,
    added: false,
    name
  });

  // builds the registry on first call only; later calls just (re-)install
  const enable = () => {
    if (enable.done) {
      install();
      return;
    }
    enable.done = true;

    // media
    push({
      urls: ['*://*/*'],
      types: ['media']
    }, 'media type');
    install();

    // media types
    network.types({
      core: true
    }).then(types => {
      push({
        urls: types.map(s => '*://*/*.' + s + '*'),
        types: ['xmlhttprequest']
      }, 'xml on core types');

      // 社群平台影音 CDN 與動態串流監聽 (Facebook, Instagram)
      push({
        urls: [
          '*://*.fbcdn.net/*',
          '*://*.cdninstagram.com/*',
          '*://*/*bytestart=*'
        ],
        types: ['xmlhttprequest', 'media', 'other']
      }, 'social media network stream');

      if (detectMedia) {
        install();
      }
    });

    // https://iandevlin.com/html5/webvtt-example.html
    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/track
    // https://demos.jwplayer.com/closed-captions/
    network.types({
      core: false,
      sub: true
    }).then(types => {
      push({
        urls: types.map(s => '*://*/*.' + s + '*'),
        types: ['xmlhttprequest', 'other']
      }, 'xml/other on core sub type');
      if (detectMedia) {
        install();
      }
    });
  };

  chrome.storage.local.get({
    'detect-media': true
  }, prefs => {
    detectMedia = prefs['detect-media'];
    if (detectMedia) {
      enable();
    }
  });

  chrome.storage.onChanged.addListener(ps => {
    if (ps['detect-media']) {
      detectMedia = ps['detect-media'].newValue;
      if (detectMedia) {
        enable();
      }
      else {
        uninstall();
      }
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'get-extra') {
    response(extra[request.tabId] || []);
    delete extra[request.tabId];
  }
  else if (request.method === 'media-detected' && detectMedia) {
    observe({
      ...request.d,
      timeStamp: Date.now(),
      tabId: sender.tab.id,
      initiator: sender.url
    });
  }
  else if (request.method === 'check-social-sessions') {
    social.checkSessions().then(response);
    return true; // 非同步回應
  }
  else if (request.method === 'parse-social-url') {
    social.parseUrl(request.url)
      .then(res => response({ result: res }))
      .catch(err => response({ error: err.message }));
    return true; // 非同步回應
  }
  else if (request.method === 'open-downloader-for-media') {
    open(sender?.tab, [{ key: 'append', value: JSON.stringify(request.item) }]);
    response({ success: true });
  }
  else if (request.method === 'open-downloader-current-tab') {
    open(sender.tab);
    response({ success: true });
  }
  else if (request.method === 'download-cached-file') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename || `社群媒體_${Date.now()}.mp4`,
      saveAs: Boolean(request.saveAs)
    }, downloadId => {
      if (chrome.runtime.lastError) {
        response({ error: chrome.runtime.lastError.message });
      } else {
        response({ success: true, downloadId });
      }
    });
    return true; // 非同步回應
  }
  else if (request.method === 'download-specific-post') {
    social.parseUrl(request.postUrl)
      .then(item => {
        if (!item || !item.url) throw new Error('未能從該貼文中獲取可下載之媒體串流！');
        const isUrlImage = item.url.includes('.jpg') || item.url.includes('.jpeg') || item.url.includes('.jfif') || item.url.includes('.webp');
        if (request.isVideo && (item.ext !== 'mp4' || isUrlImage)) {
          throw new Error('解析結果為靜態縮圖而非真實影片，已自動轉由前端即時接管錄製！');
        }
        const safeName = (request.filename || `${item.title || '社群媒體'}.${item.ext || 'mp4'}`).replace(/[\/\\:*?"<>|]/g, '_');
        chrome.downloads.download({
          url: item.url,
          filename: safeName,
          saveAs: false
        }, downloadId => {
          if (chrome.runtime.lastError) {
            response({ error: chrome.runtime.lastError.message });
          } else {
            response({ success: true, downloadId, title: item.title, url: item.url });
          }
        });
      })
      .catch(err => {
        response({ error: err.message });
      });
    return true; // 非同步回應
  }
  else if (request.method === 'get-active-audio') {
    const tabId = sender?.tab?.id;
    const list = capturedMediaByTab.get(tabId) || [];
    // 找出最近捕獲的音效軌 (isAudio: true 且非圖片)
    const audioEntry = list.find(m => m.isAudio && !m.url.includes('.jpg') && !m.url.includes('.png'));
    if (audioEntry) {
      response({ success: true, audioUrl: audioEntry.url });
    } else {
      // 保底尋找 sve_sound 或 audio 關鍵字
      const fallback = list.find(m => m.url.includes('sve_sound') || m.url.includes('mime_type=audio') || m.url.includes('tag=sve_audio'));
      response({ success: Boolean(fallback), audioUrl: fallback ? fallback.url : null });
    }
    return true;
  }
  else if (request.method === 'download-active-media') {
    const tabId = sender?.tab?.id;
    let list = capturedMediaByTab.get(tabId) || [];
    let match = null;
    let audioMatch = null;

    // 清理網址中的分段 Range 限制，確保下載完整影片檔而非局部切片
    const cleanVideoUrl = rawUrl => {
      try {
        const u = new URL(rawUrl);
        u.searchParams.delete('bytestart');
        u.searchParams.delete('byteend');
        return u.href;
      } catch (e) {
        return rawUrl.replace(/([?&])bytestart=\d+(&?)/, '$1').replace(/([?&])byteend=\d+(&?)/, '$1');
      }
    };

    // 嚴格過濾廣告穿插串流 (徹底排除 Facebook/Instagram 贊助預載)
    const filterAds = pool => pool.filter(m => {
      const u = m.url.toLowerCase();
      if (u.includes('sponsored') || u.includes('is_ad=1') || u.includes('&ad_id=')) return false;
      return true;
    });

    const now = Date.now();
    // 【核心修復】：若為限時動態，只允許匹配最近 15 秒內剛剛請求的活躍串流，徹底消除第 1-1 部與歷史錯位！
    let searchPool = filterAds(list);
    if (request.isStory) {
      const recentPool = searchPool.filter(m => (now - (m.timeStamp || 0)) < 15000);
      if (recentPool.length > 0) {
        searchPool = recentPool;
      }
    }

    const reversedList = searchPool.slice().reverse();

    if (request.targetUrl) {
      match = { url: request.targetUrl, isProgressive: true };
    } else if (request.postUrl) {
      const idMatch = request.postUrl.match(/(?:reel\/|reels\/|videos\/|p\/|v=)(\w+)/);
      const postId = idMatch ? idMatch[1] : null;

      if (postId) {
        // 優先比對包含該 ID 且為視訊的串流
        match = reversedList.find(m => m.url.includes(postId) && (m.isProgressive || (m.isVideo && !m.isAudio))) ||
                reversedList.find(m => m.url.includes(postId) && !m.isAudio);
      }
    }

    if (!match) {
      if (request.platform === 'Facebook') {
        // 過濾合法的 Facebook 影音串流 (徹底排除圖片與純音效軌)
        const getFbStreams = (pool) => pool.slice().reverse().filter(m => {
          if (!m.url.includes('fbcdn.net')) return false;
          const u = m.url.toLowerCase();
          if (u.includes('.jpg') || u.includes('.jpeg') || u.includes('.png') || u.includes('.webp') || u.includes('.jfif')) return false;
          return m.isVideo || u.includes('.mp4') || u.includes('sve_') || u.includes('xpv_');
        });

        let fbStreams = getFbStreams(searchPool);
        if (fbStreams.length === 0 && searchPool !== list) {
          fbStreams = getFbStreams(list); // 回退至全分頁佇列
        }

        // 1. 優先尋找完整音視訊合一 Progressive MP4 (必須非純音軌)
        match = fbStreams.find(m => (m.isProgressive || m.url.includes('xpv_progressive') || m.url.includes('progressive')) && !m.isAudio);
        
        // 2. 若無 Progressive，強制只選畫面軌 (isVideo === true 且 isAudio === false)
        if (!match && fbStreams.length > 0) {
          const videoTrack = fbStreams.find(m => !m.isAudio && (m.isVideo || m.url.includes('sve_hd') || m.url.includes('sve_sd')));
          const audioTrack = fbStreams.find(m => m.isAudio);

          if (videoTrack) {
            match = videoTrack;
            if (audioTrack) {
              audioMatch = audioTrack;
            }
          } else {
            // 保底只選非音軌者
            match = fbStreams.find(m => !m.isAudio) || fbStreams[0];
          }
        }
      } else if (request.platform === 'Instagram') {
        // 過濾合法的 Instagram 影音串流 (徹底排除圖片與純音軌)
        const getIgStreams = (pool) => pool.slice().reverse().filter(m => {
          if (!m.url.includes('cdninstagram.com') && !m.url.includes('fbcdn.net')) return false;
          const u = m.url.toLowerCase();
          if (u.includes('.jpg') || u.includes('.jpeg') || u.includes('.png') || u.includes('.webp') || u.includes('.jfif')) return false;
          return u.includes('.mp4');
        });

        let igStreams = getIgStreams(searchPool);
        if (igStreams.length === 0 && searchPool !== list) {
          igStreams = getIgStreams(list); // 回退至全分頁佇列
        }

        match = igStreams.find(m => !m.isAudio) || igStreams[0];
      } else {
        match = reversedList.find(m => !m.isAudio && m.url.includes('.mp4')) || reversedList[0];
      }
    }

    if (!match) {
      response({ error: '尚未偵測到影片播放串流，請先讓影片播放 1~2 秒以利捕捉！' });
      return true;
    }

    const fullUrl = cleanVideoUrl(match.url);
    const baseName = request.filename ? request.filename.replace(/\.mp4$/i, '') : `${request.platform || '社群'}_影片_${Date.now()}`;

    // 如果同時捕獲到視訊軌與音效軌 (Facebook DASH 雙軌)
    if (audioMatch) {
      const fullAudioUrl = cleanVideoUrl(audioMatch.url);
      // 下載視訊軌
      chrome.downloads.download({
        url: fullUrl,
        filename: `${baseName}_【畫面軌】.mp4`,
        saveAs: false
      });
      // 同步下載音效軌
      chrome.downloads.download({
        url: fullAudioUrl,
        filename: `${baseName}_【音效軌】.mp4`,
        saveAs: false
      }, downloadId => {
        response({ success: true, isDualTrack: true, downloadId });
      });
      return true;
    }

    // 單一完整串流 (Progressive MP4 音畫合一)
    chrome.downloads.download({
      url: fullUrl,
      filename: `${baseName}.mp4`,
      saveAs: false
    }, downloadId => {
      if (chrome.runtime.lastError) {
        response({ error: chrome.runtime.lastError.message });
      } else {
        response({ success: true, downloadId, url: fullUrl });
      }
    });
    return true; // 非同步回應
  }
  else if (request.method === 'parse-and-open') {
    social.parseUrl(request.url)
      .then(item => {
        open(sender?.tab, [{ key: 'append', value: JSON.stringify(item) }]);
        response({ success: true, item });
      })
      .catch(err => {
        console.warn('社群媒體背景解析失敗：', err);
        response({ error: err.message });
      });
    return true; // 非同步回應
  }
});

/* delete all leftover cache requests */
{
  const once = async () => {
    for (const key of await caches.keys()) {
      caches.delete(key);
    }
  };
  chrome.runtime.onStartup.addListener(once);
}

/* delete all old indexedDB databases left from "v2" version */
{
  const once = () => indexedDB.databases().then(dbs => {
    for (const db of dbs) {
      indexedDB.deleteDatabase(db.Name);
    }
  });
  if (indexedDB.databases) {
    chrome.runtime.onInstalled.addListener(once);
    chrome.runtime.onStartup.addListener(once);
  }
}

/* cross-extension MCP support */
chrome.runtime.onMessageExternal.addListener((request, sender, response) => {
  if (request.cmd === 'mcp.json') {
    fetch('mcp/mcp.json').then(r => r.json()).then(response);
    return true;
  }
  else if (request.cmd === 'mcp.output') {
    fetch('mcp/mcp.output').then(r => r.text()).then(response);
    return true;
  }
  else {
    response({
      error: 'unknown-request'
    });
  }
});

/* external access */
chrome.runtime.onConnectExternal.addListener(eport => {
  eport.onMessage.addListener(async request => {
    if (request.cmd === 'find-media') {
      const find = async (opts = {}) => {
        const {tabId, query, open} = opts;

        if (tabId != null) {
          return await chrome.tabs.get(tabId);
        }

        if (query && !open) {
          const tabs = await chrome.tabs.query(query);

          if (tabs.length) {
            return tabs[0];
          }
        }

        if (open && query?.url) {
          return await chrome.tabs.create({
            url: query.url
          });
        }

        return null;
      };
      try {
        const tab = await find(request);

        const observe = iport => {
          if (iport.sender.tab && iport.sender.tab.id === tab.id) {
            iport.onMessage.addListener(request => eport.postMessage(request));
            iport.onDisconnect.addListener(() => eport.disconnect());
          }
        };
        chrome.runtime.onConnect.addListener(observe);

        await chrome.scripting.executeScript({
          target: {
            tabId: tab.id,
            allFrames: true
          },
          func: () => {
            const port = chrome.runtime.connect({
              name: 'page'
            });
            self.ports = self.ports || new Set();
            self.ports.add(port);
          }
        });

        const entries = new Map();
        try {
          for (const entry of await extract.player(tab.id)) {
            entries.set(entry.url, entry);
          }
        }
        catch (e) {}
        try {
          for (const entry of await extract.performance(tab.id)) {
            entries.set(entry.url, entry);
          }
        }
        catch (e) {}
        // overwrite performanceEntries which does not include details
        try {
          for (const entry of await extract.storage(tab.id)) {
            entries.set(entry.url, entry);
          }
        }
        catch (e) {}

        if (entries.size) {
          if (request.stream) {
            for (const value of entries.values()) {
              eport.postMessage({
                cmd: 'media-detected',
                value
              });
            }
          }
          else {
            // Send all detected media to the agent at once
            eport.postMessage([...entries.values()].map(value => ({
              cmd: 'media-detected',
              value
            })));
          }
        }

        setTimeout(() => chrome.runtime.onConnect.removeListener(observe), 5000);
      }
      catch (e) {
        console.error(e);
        eport.postMessage({
          error: e.message
        });
      }
    }
    else if (request.cmd === 'download-media') {
      if (request.jobs) {
        open(undefined, request.jobs.map(job => ({
          key: 'append',
          value: job.initiator ? JSON.stringify({
            url: job.url,
            initiator: job.initiator
          }) : (job.url || job)
        })));
        eport.postMessage({
          cmd: 'queued'
        });
      }
      else {
        eport.postMessage({
          error: 'request must include "jobs" key'
        });
      }
    }
  });
});

/* FAQs & Feedback (已停用外部網站彈出視窗與追蹤) */
{
  // 保持擴充套件乾淨獨立，不彈出外部官網干擾使用者
}
