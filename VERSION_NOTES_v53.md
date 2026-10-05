# 版本說明文件 (VERSION NOTES) - v53_AV_Merge_And_IG_Precision_Fix

## 📅 版本日期：2026-10-04
## 📌 版本號碼：v53 (擴充套件 Manifest 版本 1.2.0)

---

### 一、版本更新宗旨與背景
使用者在實測中提出了三項極具深度且具體的問題：
1. **Facebook 影片音畫分離問題**：
   - 下載 Facebook 影片時，有的只有畫面（沒有聲音），有的只有聲音（沒有畫面）。
   - 原因：Facebook 的 DASH 串流將視訊軌與音效軌拆分，過去版本僅隨機抓取最先匹配的一軌，導致缺漏。
2. **Instagram 照片順序錯亂問題**：
   - 下載 Instagram 照片時順序錯誤，甚至抓到下一篇別人的動態照片。
   - 原因：Instagram 採用動態虛擬滾動與提前預載（Preload）機制，靜態綁定圖片按鈕會鎖定到預載或隱藏的圖片元素。
3. **Instagram 限時動態（Stories）下載不完全**：
   - 限時動態內的影片或照片無法完整下載。
   - 原因：限動照片大部分未設置 `srcset` 屬性，且限動全螢幕播放器具有操作遮罩層，影片串流亦帶有 Range 切片限制。

---

### 二、核心修正與技術演進 (為什麼這樣做？)

#### 1. Facebook 音畫合一 (Progressive MP4 優先 + DASH 雙軌成對捕獲)
- **修改位置**：`content_scripts/social_detector.js` 與 `worker.js`
- **實作內容**：
  - 前端 React 挖掘深度升級，最高優先檢索自帶音視訊的 `playable_url_quality_hd`、`browser_native_hd_url` 等 Progressive MP4 串流。
  - 後端攔截器若檢測到為 Facebook DASH 分離串流，會自動同時識別並鎖定同一貼文之**【純畫面軌】**與**【純音效軌】**，同時觸發雙軌下載（命名為 `Facebook_影片軌_...` 與 `Facebook_音效軌_...`），徹底杜絕音畫分離缺漏問題！

#### 2. Instagram 動態視窗中心鎖定 (Active Viewport Selector)
- **修改位置**：`content_scripts/social_detector.js` (`getCurrentlyVisibleImage` 與 `scanInstagramFeed`)
- **實作內容**：
  - 改為在「貼文容器級別 (`<article>`)」掛載下載按鈕，並於使用者**點擊按鈕的當下**，動態計算該貼文內所有圖片相對於目前視窗中心（Viewport Center）的幾何距離。
  - 嚴格鎖定當前正位於螢幕正中央、完全呈現的可見照片；嚴格隔離容器，不跨文章選取。
- **功能效果**：徹底杜絕抓到下一篇預載照片或別人的動態，點擊當下看見哪一張就下載哪一張！

#### 3. Instagram 限時動態 (Stories) 專屬全螢幕頂層面板
- **修改位置**：`content_scripts/social_detector.js` (`scanInstagramStories`) 與 `social_detector.css`
- **實作內容**：
  - 在限動頁面 (`/stories/`) 自動掛載獨立的頂層懸浮控制按鈕（`z-index: 2147483647`），保證不被限動操作層遮擋。
  - 自動偵測當前限動是影片還是照片：若為照片，無須依賴 `srcset` 即可直接提取全螢幕無損原圖；若為影片，自動清除切片限制參數，完整下載整段限動影片。

---

### 三、檔案結構與封包
- `v3/manifest.json`：版本號升級至 1.2.0。
- `v3/content_scripts/social_detector.js`：全新視窗中心選取演算法與限動專屬處理器。
- `v3/content_scripts/social_detector.css`：新增限動頂層面板樣式。
- `v3/worker.js`：Facebook DASH 音效軌與畫面軌雙軌成對識別與下載機制。
- `hls_social_downloader_v53_chrome_store.zip`：正式 Chrome 擴充套件封裝檔。
