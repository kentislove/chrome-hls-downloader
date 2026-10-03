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

/* global args */

document.getElementById('page').textContent = args.get('href') || '空白頁面';
document.getElementById('title').textContent = args.get('title') || '無標題';

document.getElementById('referer-selector').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('referer').textContent)
    .then(() => self.notify('參照來源網址 (Referer) 已複製到剪貼簿'))
    .catch(e => self.notify(e.message));
};
document.getElementById('page-selector').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('page').textContent)
    .then(() => self.notify('網頁連結已複製到剪貼簿'))
    .catch(e => self.notify(e.message));
};
document.getElementById('title-selector').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('title').textContent)
    .then(() => self.notify('網頁標題已複製到剪貼簿'))
    .catch(e => self.notify(e.message));
};
