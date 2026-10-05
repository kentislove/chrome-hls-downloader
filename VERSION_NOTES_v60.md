# v60 版本更新說明書 (FB Ad Isolation & Music Story Synthesis)

## 📌 版本基本資訊
- **版本號**：v60 (內部擴充功能版本 1.9.0)
- **更新主題**：Facebook 穿插廣告徹底排除、Reel 定向鎖定與限動「照片加音樂」本機合成 MP4 引擎
- **核心修正對象**：
  1. Facebook 限時動態 (`https://www.facebook.com/stories/170794081071600/UzpfSVNDOjE4MzE4OTEyODc4Mjg0ODA=/`)：
     - 解決抓錯焦點、抓錯影片問題。
     - 解決「照片加音樂」只有下載純音效軌的問題 -> 實裝【選項 B】：本機合成 1080x1920 音畫合一 MP4 影片！
  2. Facebook Reel 短影音 (`https://www.facebook.com/reel/907232852463031`)：
     - 徹底解決背景穿插廣告預載導致定位抓錯的問題，精準定向鎖定本尊 Progressive MP4！

---

## 🛠️ 重點修復原理與技術解析

### 1. Facebook 穿插廣告與背景預載污染的徹底根除
- **問題根因**：
  當使用者在瀏覽 Facebook Reel 或限動時，Facebook 會積極在背景預先載入（Prefetch）穿插的商業贊助廣告（Sponsored Ad）以及下一個動態的片段。舊程式在網路或資源計量中，盲目抓取最後一個請求的媒體，導致最後進到快取的往往是背景預載的廣告，造成「抓 A 出現 B、抓 Reel 抓到廣告」。
- **解決方案**：
  1. **定向解析優先權最高**：具有貼文/Reel 專屬網址時，第一優先直接發起背景定向解析（`download-specific-post`），針對特定 Reel ID 向官方抓取中繼資料，完全不受前台背景預載廣告污染。
  2. **DOM 廣告容器智慧識別**：新增 `isAdElement()`，深入檢查 DOM 節點及其父層是否標註為「贊助 (Sponsored)」、「特別推薦」或包含廣告專屬屬性，若是廣告節點直接自動跳過！
  3. **串流與背景過濾**：在 `worker.js` 中新增 `filterAds()`，過濾所有帶有廣告特徵之串流。

### 2. 限動「照片加音樂」本機合成 MP4 引擎 (選項 B)
- **問題根因**：
  許多限動發布者是上傳一張靜態照片配上流行音樂貼圖。這類限動在 Facebook 播放時，只有圖片與純音訊軌，完全沒有視訊畫面軌！舊程式因偵測到聲音在播，就把純音軌下載下來，導致使用者點開檔案只有聲音、沒有畫面。
- **解決方案 (依使用者選定之選項 B 實裝)**：
  1. **三態限動判讀引擎**：精準偵測當前限動是「真實視訊影片」、「純照片」，還是「照片加音樂」。
  2. **本機畫布與音訊渲染合成**：
     - 透過離線 Canvas（1080x1920，標準 9:16 限動規格）繪製該張高清照片。
     - 透過 `AudioContext` 解碼背景捕獲之完整音樂音效軌。
     - 利用 `canvas.captureStream(30)` 與 `AudioContext Destination` 將畫面與音效軌合併為 `MediaStream`。
     - 使用瀏覽器原生 `MediaRecorder` 在本機直接即時錄製合成 15 秒、音畫合一的完整 MP4 影片，並直接啟動下載！

---

## 📂 檔案異動清單
1. `v3/manifest.json`：版本號升級為 1.9.0。
2. `v3/social/session.js`：強化 `parseFacebook`，新增行動端純淨端點備援，徹底杜絕桌面版廣告干擾。
3. `v3/worker.js`：新增 `get-active-audio` 音訊軌索取接口，新增 `filterAds` 廣告過濾。
4. `v3/content_scripts/social_detector.js`：
   - 實裝 `synthesizePhotoMusicStory` 本機音畫合一 MP4 合成器。
   - 新增 `isAdElement` 廣告容器過濾。
   - 重構 `downloadVideo` 調度順序（定向解析第一優先）。
   - 重構 `scanStories` 與懸浮小幫手為三態限動判讀引擎。
5. `hls_social_downloader_v60_chrome_store.zip`：打包完成之擴充功能壓縮檔。
