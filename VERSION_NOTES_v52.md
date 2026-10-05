# 版本說明文件 (VERSION NOTES) - v52_Social_Downloader_Target_DOM_Fix

## 📅 版本日期：2026-10-04
## 📌 版本號碼：v52 (擴充套件 Manifest 版本 1.1.0)

---

### 一、版本更新宗旨與背景
在前一版本中，使用者反饋了兩大關鍵操作問題：
1. **TikTok/抖音干擾問題**：安裝下載器後，TikTok 網頁會出現畫面卡住無法播放、但背景持續有聲音的現象，點擊按鈕亦無反應。依照使用者明確指示，本版本**全面停用 TikTok 與抖音之監聽與腳本注入**，回歸純淨播放體驗。
2. **Facebook / Instagram 下載目標錯誤問題**：過去版本在動態饋給頁面（Feed）中，當背景攔截到多筆串流時，採用全域初次匹配，導致抓取的總是頁面最上方的廣告、其他貼文或舊快取，而非使用者當前點選的特定照片或影片。

---

### 二、核心修正與技術演進 (為什麼這樣做？)

#### 1. 完全停用 TikTok / 抖音模組 (暫停維護)
- **修改位置**：`manifest.json`、`worker.js`、`social_detector.js`
- **實作內容**：移除了 `tiktok.com` 與 `douyin.com` 的主機權限、內容腳本匹配規則及 WebRequest 監聽。
- **用意與功能**：避免擴充套件的媒體封包監聽器干擾 TikTok 原生 MSE 解碼管道，徹底恢復原站之流暢播放。

#### 2. DOM 節點與 React 內部實例深度挖掘 (React Fiber / Props Mining)
- **修改位置**：`content_scripts/social_detector.js` (`extractMediaUrlFromReact`)
- **實作內容**：當使用者在 Facebook 或 Instagram 上點擊特定貼文的下載按鈕時，腳本不再全頁盲找，而是直接針對該 `<video>` 節點及其父層 DOM，向上檢索 React 隱藏屬性（`__reactProps$`、`__reactFiber$`）。
- **用意與功能**：直接從 Meta 官方 React 元件的記憶體資料中，撈出該特定貼文專屬綁定的 `playable_url_quality_hd`、`browser_native_hd_url` 或 `video_url` 直連網址，100% 精準對準該貼文！

#### 3. 貼文專屬網址 (Permalink) 與逆向時序匹配
- **修改位置**：`worker.js`、`social_detector.js`
- **實作內容**：
  - 提取該貼文容器專屬的連結（包含 Reel ID、Post ID、Video ID）。
  - 在背景服務中將原先「由舊到新」的匹配改為「**由新到舊 (`list.slice().reverse()`)**」，並優先比對包含該貼文 ID 的串流。
- **用意與功能**：使用者滾動到第 5 個貼文點擊下載時，擴充套件會優先鎖定「當前最新播放、最新產生請求」的串流，絕不會再抓到最上方的第 1 個無關影片！

#### 4. 照片精準下載 (Canvas 記憶體無損複製 + 最高解析度提取)
- **修改位置**：`content_scripts/social_detector.js` (`exportSpecificImage`)
- **實作內容**：精準綁定在貼文的特定 `<img>` 元素上，過濾頭像與小圖標，並自動取用 `srcset` 中最大解析度的原圖來源或 Canvas 畫布直出。
- **用意與功能**：點哪張照片就下載哪張照片，徹底實現獨立框架、指定目標的精確下載。

---

### 三、檔案結構變更
- `v3/manifest.json`：移除 tiktok/douyin，版本升級至 1.1.0。
- `v3/worker.js`：移除 tiktok cdn 監聽，重構逆向時序匹配與 postUrl 比對邏輯。
- `v3/content_scripts/social_detector.js`：全新精準 DOM 鎖定與 React Fiber 解析引擎。
- `hls_social_downloader_v52_chrome_store.zip`：正式 Chrome 擴充套件封裝檔。
