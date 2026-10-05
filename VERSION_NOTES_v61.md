# v61 版本更新說明書 (DOM Direct Capture & Stream Hook)

## 📌 版本基本資訊
- **版本號**：v61 (內部擴充功能版本 2.0.0)
- **更新主題**：拔除全域推薦假影片黑洞、導入播放器本體直取與 W3C 原生串流接管引擎
- **核心修正對象**：
  1. 徹底解決 Facebook Reel 抓 A 出現 B、抓 Reel 出現隨機推薦影片的問題。
  2. 解決 Facebook 限動影片與焦點影片抓錯對象的問題。
  3. 保留「照片加音樂」限動本機合成 1080x1920 音畫合一 MP4 引擎與原圖下載功能。

---

## 🛠️ 重點修復原理與技術解析

### 1. 徹底斬斷「Facebook 伺服器端推薦假影片」黑洞
- **問題根因**：
  先前版本嘗試透過背景 `fetch(postUrl)` 請求原始碼，但 Facebook 伺服器端對於未登入或機器人爬蟲請求，故意在 HTML 中塞入全域推薦影片；同時先前程式中的 `extractProgressiveFromPage` 會去搜尋全域第一個 `<script>`，導致所有 Reel 都下載成同一個全域推薦影片！
- **解決方案**：
  1. **完全拔除全域 script 掃描 (`extractProgressiveFromPage`)**。
  2. **Facebook 全面停止背景 `fetch(postUrl)` 爬蟲**，絕不向伺服器要假網頁。
  3. 目光 100% 聚焦在**眼前螢幕正中央正在播放的這一個 `<video>` 播放器節點本身**！

### 2. 導入 W3C 原生播放器串流接管引擎 (`recordActiveVideoStream`)
- **技術原理**：
  在現代 Web 標準中，任何正在播放中的 HTML5 `<video>` 標籤，均可透過 `video.captureStream()` 直接獲取其解碼後的即時畫面軌與音訊軌。
  - **0 誤差直取**：因為是直接接管眼前這個播放器的硬體輸出，不管 Facebook 切割多少 MSE blob 片段、不管背景預載了多少廣告，**眼前播什麼，錄製下來就是什麼，100% 絕對不會被調包！**
  - **高速轉錄**：啟動接管時以 2.5 倍速高速播放直錄，15 秒短片僅需 6 秒即可無損錄製完畢並打包為 MP4 下載！
  - **雙軌保證**：畫面與音效同時接管，徹底告別「只有聲音沒有畫面」的窘境！

---

## 📂 檔案異動清單
1. `v3/manifest.json`：版本號升級為 2.0.0。
2. `v3/content_scripts/social_detector.js`：
   - 拔除 `extractProgressiveFromPage` 與 Facebook 背景靜態解析。
   - 實裝 `recordActiveVideoStream` 原生播放器串流接管引擎。
   - 重構 `downloadVideo` 調度流程，Facebook 全面走「本體直取 + 串流接管」。
3. `hls_social_downloader_v61_chrome_store.zip`：打包完成之擴充功能壓縮檔。
