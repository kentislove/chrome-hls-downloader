# 版本更新說明文件 (v44_HLS_Downloader_Fix_Decrypt)

- **版本編號**：v44
- **建置日期**：2026 年 10 月 3 日
- **開發目標**：修復 v43 中 AES-128 解密模組金鑰網址變數順序錯誤問題。

---

## 📌 本次修復重大錯誤說明 (Bug Fix)

### 🐛 錯誤現象與原因分析
- **錯誤訊息**：
  `ReferenceError: href is not defined at DGet.flush (decrypt.js:73:47)`
- **中文解釋**：
  在解密模組 (`decrypt.js`) 的 `flush` 處理函數中，為了提高效能加入金鑰快取 (`key-cache`) 時，先嘗試讀取了 `href` 變數，但定義該變數的 `const {href} = new URL(...)` 寫在快取判斷的下方，導致 JavaScript 引擎在讀取尚未宣告的變數時拋出「變數未定義」的引用錯誤，中斷了下載管道 (`pipe is broken`)。

### 🔧 修正方法
- 在 `v3/data/job/mget/plugins/decrypt.js` 中，將 `const {href} = new URL(segment.key.uri, segment.base || segment.uri);` 移至金鑰快取檢查最上方，確保金鑰網址正確解析後再進行快取查詢與請求，徹底修復變數未定義之錯誤。

---

## 📂 載入新版本路徑
在 Chrome 擴充功能頁面中，請重新載入或重新選取未封裝目錄為：
`F:\雜記\v44_HLS_Downloader_Fix_Decrypt\v3`
