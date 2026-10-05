# v59 版本更新說明書 (Carousel Sidecar & SW Persistence Fix)

## 📌 版本基本資訊
- **版本號**：v59 (內部擴充功能版本 1.8.0)
- **更新主題**：Instagram 輪播多媒體精準定址下載與按鈕無反應終極修復
- **核心修正對象**：
  1. Facebook 限時動態 (`https://www.facebook.com/stories/...`) 點擊無反應問題。
  2. Facebook Reel 短影音 (`https://www.facebook.com/reel/1066626692394571`) 點擊無反應問題。
  3. Instagram 限時動態 (`https://www.instagram.com/stories/...`) 點擊無反應問題。
  4. Instagram 輪播貼文 (`https://www.instagram.com/p/.../?img_index=3`) 影片下載成 JFIF 圖片問題。
  5. 保留 Instagram 輪播純照片 (`?img_index=2`) 下載原圖功能完好不受影響。

---

## 🛠️ 重點修復原理與技術解析

### 1. Instagram 輪播貼文 (Carousel / Sidecar) 子項目索引定位
- **問題根因**：
  以往 Instagram 定向 API 只檢驗貼文最外層的根物件 (`shortcode_media`)。在輪播貼文中，最外層的 `is_video` 為 false，其真正的影片與照片是放在 `edge_sidecar_to_children.edges` 或 `carousel_media` 陣列中。因此程式誤判為純照片，抓取了封面縮圖（JFIF/JPG），導致 `img_index=3` 下載成圖片。
- **解決方案**：
  在 `social/session.js` 中新增 URL 參數 `img_index` 解析。如果網址包含 `?img_index=3`，即鎖定子陣列第 2 索引：
  - 若該子項目為影片（包含 `video_versions` 或 `is_video: true`），100% 導出音畫合一的 MP4 串流。
  - 若該子項目為照片（例如 `img_index=2`），則正常導出高清原圖 JPG，兩者完美共存。

### 2. 按鈕「無反應」現象的徹底根絕
- **問題根因**：
  1. **React 遍歷屬性拋錯崩潰**：在 Facebook/Instagram 現代前端中，直接以迴圈遍歷 DOM 物件上的 React 內部 Fiber 屬性時，會因為 Proxy 陷阱拋出 `TypeError`，導致按鈕的點擊監聽器中途崩潰終止。
  2. **Service Worker 閒置休眠清空記憶體**：Chrome Manifest V3 的背景腳本（Service Worker）閒置 30 秒後會自動休眠，記憶體中的 `capturedMediaByTab` 被釋放為空，導致喚醒時無法匹配串流。
  3. **缺乏即時點擊視覺狀態**：按鈕在背景進行非同步網路解析時，按鈕表面沒有任何狀態改變，使用者以為按鈕壞掉。
- **解決方案**：
  1. **按鈕即時動態回饋**：點擊下載的瞬間，按鈕文字立即變成「⏳ 正在解析處理...」，杜絕無反應錯覺。
  2. **Performance 本機資源即時直取**：在網頁端透過 `performance.getEntriesByType('resource')` 直接抓取瀏覽器剛剛從 `fbcdn.net` 或 `cdninstagram.com` 下載的真正 MP4 串流，直接交付下載。
  3. **Service Worker 串流持久化**：使用 `chrome.storage.session` 同步持久化儲存分頁媒體串流清單，即使背景休眠重啟，資料依然完好無損。
  4. **全方位異常安全隔離**：所有 React 探測與點擊事件均以嚴格的 `try...catch` 包裹，保證任何單點異常都不會中斷下載流程。

---

## 📂 檔案異動清單
1. `v3/manifest.json`：版本號升級為 1.8.0。
2. `v3/social/session.js`：新增 `img_index` 輪播多媒體定址解析，支援 Facebook 現代 Progressive 串流。
3. `v3/worker.js`：加入 `chrome.storage.session` 快取防休眠機制，修復 `match` 變數宣告。
4. `v3/content_scripts/social_detector.js`：新增 `getActiveResourceStream` 本機直取，加入按鈕點擊狀態動態回饋，全包覆 try-catch 異常隔離。
5. `hls_social_downloader_v59_chrome_store.zip`：打包完成之擴充功能壓縮檔。
