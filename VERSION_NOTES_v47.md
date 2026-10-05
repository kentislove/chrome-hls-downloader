# 版本更新說明 (Version 47 - v0.8.1)

## 更新主旨
緊急修復 `referer.js` 空值崩潰錯誤（解決「Cannot read properties of null」）、修復 TikTok CDN 防盜鏈 403 Forbidden 禁止存取問題、擴充 Facebook 新版 GraphQL 串流欄位識別，並完善分頁傳遞參數。

---

## 錯誤日誌中文翻譯與深度分析

### 1. 錯誤一：`TypeError: Cannot read properties of null (reading 'startsWith') at referer.js:73:15`
- **中文翻譯**：型別錯誤：無法讀取空值 (null) 的 'startsWith' 屬性（發生於 `referer.js` 第 73 行）。
- **問題根因**：當使用者在社群網頁上點擊「📥 下載」按鈕時，外掛開啟了下載任務視窗，但在下載管線啟動前，`referer.js` 試圖讀取 `args.get('href')`。當該值為 null 時，直接呼叫 `.startsWith('http')` 導致 JavaScript 嚴重異常崩潰，造成整個下載流程直接中斷！
- **修復方案**：加入空值安全保護，並且當來源網址為空時，自動根據媒體目標網址（TikTok、Douyin、Instagram、Facebook）智慧推導並補全來源參照位址。

### 2. 錯誤二：`Failed to load resource: the server responded with a status of 403 ()` (TikTok CDN)
- **中文翻譯**：載入資源失敗：伺服器回應狀態碼 403（HTTP 403 Forbidden，禁止存取）。
- **問題根因**：TikTok 的內容傳遞網路（CDN）伺服器設有嚴格的防盜鏈檢驗機制，若下載請求時缺少正確的 `Referer: https://www.tiktok.com/` 標頭，伺服器就會拒絕連線。因錯誤一導致防盜鏈規則設定被中斷，使 TikTok 拒絕了檔案傳輸。
- **修復方案**：修復 `referer.js` 並自動在下載 TikTok / 抖音影音時注入官方 Referer 標頭，伺服器不再阻擋，下載順暢無阻。

### 3. 錯誤三：`社群媒體背景解析失敗：Error: 未能在 Facebook 頁面找到可下載的影片串流`
- **中文翻譯**：背景解析失敗：未能在 Facebook 頁面找到可下載的影片串流。
- **問題根因**：Facebook 採用動態 GraphQL 架構，影片串流在最新版頁面中已改用 `browser_native_hd_url` 與 `browser_native_sd_url` 等新欄位儲存。
- **修復方案**：全面擴充解析正則表達式，並在解析未果時自動將分頁正在播放的串流無縫呈現在下載清單中。

---

## 本次異動檔案
1. `v3/data/job/plugins/referer.js`：修正空值崩潰，增加社群平台防盜鏈偽裝。
2. `v3/worker.js`：確保開啟下載器視窗時完整傳遞分頁物件 `sender?.tab`。
3. `v3/social/session.js`：擴充 Facebook 新版串流正則表達式。
4. `v3/manifest.json`：版本號升級至 `0.8.1`。
