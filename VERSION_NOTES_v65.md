# v65 版本更新說明書 (IG Stories Floating Panel & CORS Fallback Fix)

## 📌 版本基本資訊
- **版本號**：v65 (內部擴充功能版本 2.3.0)
- **基底驗證**：v64 已確認通用 M3U8 串流、Facebook Reels、52秒長片與限動全數 100% 成功無破格！
- **本次修正主題**：專攻 Instagram (IG) 限時動態（Stories）下載與面板喚醒，導入螢幕頂部完美居中浮動面板、精準視窗活動元件鎖定、React 雙向原創直取 (MP4/JPG)，以及跨域污染 (CORS Tainted Canvas) 安全降級機制！

---

## 🛠️ 重點修復原理與技術解析 (老師模式解說)

### 1. 為什麼 IG 限時動態之前會「點擊沒反應」？
- **根本原因一（位置偏離與按鈕被忽略）**：
  在舊版中，限動面板固定在全螢幕右上角 (`top: 18px; right: 70px`)。在現代寬螢幕（如 2K、4K 或 1080p）下，IG 限動卡片永遠水平居中在畫面中央（寬約 450px），舊按鈕被遠遠甩到右側邊緣，且容易與 IG 原生的靜音或關閉按鈕重疊或被忽視。
- **根本原因二（照片限動誤入音訊合成泥淖）**：
  舊版只要在中央偵測到圖片，就誤以為是「照片加音樂限動」，強制嘗試尋找音訊軌並進行合成。但 IG 絕大多數的照片限動是純照片，無音訊軌時回退到舊版照片下載，而舊版照片下載又呼叫了會受跨域污染（CORS）阻擋的畫布導出或頁面 `fetch`，導致程式拋出安全性異常中斷，使用者看起來就是完全「沒反應」！
- **根本原因三（背景預載相鄰限動誤判）**：
  IG 在播放當前限動時，會在背景 DOM 預先載入下一則限動的影片。舊版只用 `videos.length === 1` 判定，結果當使用者在看純照片時，卻抓到了背景預載的隱藏影片，導致下載邏輯錯亂。

---

### 2. v65 的終極解決方案

1. **螢幕頂部水平居中專屬控制面板 (Top-Center Floating Banner)**：
   - 面板樣式強制升級為 `top: 16px; left: 50%; transform: translateX(-50%)`，以最大層級 `z-index: 2147483647` 懸浮於主視窗正上方。
   - 無論螢幕寬度如何，按鈕永遠穩穩當當地正對著限動主舞台上方，立體漸層光暈極為醒目，100% 絕不偏離、絕不被遮擋！
2. **視窗正中央活動元件精準鎖定 (`getActiveStoryElement`)**：
   - 嚴格以螢幕正中心交叉點（`innerWidth / 2`, `innerHeight / 2`）為基準，只有正處於中央視野播放的 `<video>` 或可見大圖 `<img>` 才會被選取。
   - 徹底杜絕兩側與背景隱藏預載項的干擾！
3. **React Fiber 雙向原創直取 (0 秒極速無損下載)**：
   - **影片限動**：直接從 React 提取官方 1080P 音畫合一 MP4 串流，0 秒瞬間啟動下載！
   - **照片限動**：直接從 React 提取官方無損大圖（或解析 `srcset` 取 1080w 最高解析度），並直接交由後台具有主機權限的下載模組存檔，**100% 避開任何跨域 (CORS) 限制**！
4. **跨域污染安全降級防護 (Tainted Canvas Fallback)**：
   - 在高畫質錄影引擎中，為畫布雙緩衝加入完整的安全防護：若遭遇 IG 視訊的跨域污染限制，自動無縫降級為原生播放器串流接管，並維持 5 Mbps 高碼率，絕不報錯崩潰！

---

## 📂 檔案異動清單
1. `v3/manifest.json`：版本號升級至 2.3.0。
2. `v3/content_scripts/social_detector.css`：
   - 限動控制面板全面升級為螢幕頂部水平居中（`left: 50%; transform: translateX(-50%)`）與雙向立體漸層樣式。
3. `v3/content_scripts/social_detector.js`：
   - 新增 `getActiveStoryElement` 精準鎖定中央活動視窗元件。
   - 新增 `extractImageFromReact` 直接提取官方無損原圖。
   - 升級 `downloadImage` 為後台直取架構，徹底杜絕 CORS 與 Canvas Taint 錯誤。
   - 升級 `recordActiveVideoStreamCore` 加入跨域安全降級防護。
   - 重構 `scanStories` 與懸浮小幫手的限動解析邏輯。
4. `v3/social/session.js`：
   - 優化 Instagram 貼文解析對 Stories 網址的引導提示。
5. `hls_social_downloader_v65_chrome_store.zip`：打包完成之擴充功能壓縮檔。
