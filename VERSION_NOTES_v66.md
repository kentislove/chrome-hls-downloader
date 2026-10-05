# v66 版本更新說明書 (IG Carousel Slide Precision & Media-Type Guard Fix)

## 📌 版本基本資訊
- **版本號**：v66 (內部擴充功能版本 2.4.0)
- **基底驗證**：v65 已確認通用 M3U8 串流、Facebook 短片/長片/限動、以及 Instagram Stories 限動全數 100% 成功無誤！
- **本次修正主題**：徹底解決 Instagram 多頁輪播貼文（Carousel / Sidecar，帶有 `?img_index=N` 參數）在切換至影片頁面時，誤下載為靜態縮圖照片 (JFIF / JPG) 的致命問題！

---

## 🛠️ 重點修復原理與技術解析 (老師模式解說)

### 1. 為什麼輪播貼文第 3 頁影片會「變成只有 JFIF 照片」？
- **根本原因一（後台解析誤把影片封面照片當作主角）**：
  在舊版中，前端點擊下載影片時，發送了後台請求至 `session.js` 進行定向解析。但現代 IG 頁面原始碼中，輪播貼文的每一頁影片都同時帶有預覽圖 (`display_url`)。舊版在正規表達式比對時，未能正確遍歷內嵌的輪播子項目清單 (`carousel_media`)，找不到影片時便盲目回退到縮圖，結果把第 3 頁影片的封面 JFIF / JPG 縮圖傳給了下載器！
- **根本原因二（背景下載器缺乏媒體型態防護牆）**：
  在舊版的 `worker.js` 中，收到後台解析結果後便直接呼叫瀏覽器下載。即使前端明明是點擊「下載影片」，背景下載器卻毫無防備地直接把 JFIF 照片存了下來！
- **根本原因三（前端網址遺失輪播索引參數）**：
  舊版在尋找貼文父層連結時，有時只抓到了貼文根網址（例如 `/p/DeBUFjYlNzI/`），而丟失了網址列當前的分頁參數 `?img_index=3`，導致後台只能從第 1 頁（預設封面）開始抓取。

---

### 2. v66 的終極解決方案

1. **多層級媒體型態防護牆 (Media-Type Guard)**：
   - 在 `worker.js` 與 `social_detector.js` 中嚴格加入型態校驗：當使用者點擊「下載影片」時，若後台解析到的結果是靜態縮圖（副檔名為 `.jpg` 或 `.jfif`），**一律斷然拒絕下載並拋出攔截警告**！
   - 絕不再讓封面縮圖李代桃僵冒充影片！

2. **前端現場播放器直接接管防線 (Live DOM Takeover)**：
   - 當後台解析未能即時返回 MP4 影片時，前端立即啟動眼前正在播放之 `<video>` 節點的「串流接管引擎」，以 5 Mbps 高碼率、畫布雙緩衝、1:1 原速錄製眼前播放中的第 3 頁影片，**保證 100% 產出真正的音畫合一 MP4 影片**！

3. **`session.js` 內嵌輪播樹狀結構深度提取 (Carousel JSON Parser)**：
   - 深度解析 IG 網頁內的 `<script>` 內嵌 JSON 樹，依據 `targetIndex`（對應 `img_index` 參數）精準定位對應的分頁子項目。
   - 若子項目為影片（具備 `video_versions` 或 `is_video === true`），精準提取其官方 1080P MP4 直連！

4. **輪播分頁索引序號動態標籤 (`_P{idx}`)**：
   - 在按鈕顯示與下載檔名中自動注入分頁資訊（例如：`Instagram_輪播影片 (第 3 頁)`，存檔檔名為 `Instagram_輪播影片_P3_xxxx.mp4`）。
   - 第 2 頁照片則為 `Instagram_照片_P2_xxxx.jpg`，條理分明、絕不混淆！

---

## 📂 檔案異動清單
1. `v3/manifest.json`：版本號升級至 2.4.0。
2. `v3/worker.js`：
   - 在 `download-specific-post` 加入嚴格的 `request.isVideo` 防偽圖片冒充檢驗。
3. `v3/social/session.js`：
   - 重構 `parseInstagram` 的 HTML 提取分支，支援 `carousel_media` 內嵌結構尋訪與 `video_versions` 陣列定位。
4. `v3/content_scripts/social_detector.js`：
   - 在 `findPostUrl` 中確保 `/p/` 貼文頁面之 `?img_index=N` 參數永遠完整保留。
   - 在 `downloadVideo` 階段 3 傳入 `isVideo: true`，並在非 MP4 時無縫切換本機播放器串流接管。
   - 在 `scanVideos` 與 `scanImages` 中動態加入分頁序號標籤。
5. `hls_social_downloader_v66_chrome_store.zip`：打包完成之擴充功能壓縮檔。
