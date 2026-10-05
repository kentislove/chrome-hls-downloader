# 版本更新說明 (Version 45 - v0.7.0)

## 更新主旨
整合社群媒體下載雙模支援（Facebook、Instagram、TikTok），引入瀏覽器登入憑證（Session / Cookies）即時識別架構，支援下載好友限定私人影片、Reels 與限時動態（Stories）。

---

## 主要更新內容

### 1. 雙模下載架構實現 (方案 C)
- **模式一：網頁注入浮動下載按鈕 (Content Script 模式)**
  - 當使用者瀏覽 Instagram、Facebook 或 TikTok 時，自動在限時動態、Reels、影片或高解析度照片旁呈現「📥 下載」浮動按鈕。
  - 點擊按鈕直接擷取當前畫面呈現之串流，即時傳遞至擴充功能主視窗啟動下載。
- **模式二：主控面板手動貼上網址解析 (Background / Panel 模式)**
  - 擴充功能主面板支援貼上 FB、IG、TikTok 網址。
  - 背景程序自動以目前登入之身分憑證向伺服器查詢並解析真實 MP4 串流或高畫質圖檔網址。

### 2. 瀏覽器登入狀態儀表板 (Social Session Dashboard)
- 新增 `chrome.cookies` 權限與 Session 狀態偵測模組：
  - **Facebook**：偵測 `c_user` 與 `xs` Cookie，確認登入狀態與用戶 ID。
  - **Instagram**：偵測 `sessionid` 與 `ds_user_id` Cookie，支援讀取私人帳號動態與好友限定限動。
  - **TikTok**：偵測 `sessionid` Cookie，支援取得原始無浮水印之 `playAddr` 高畫質影片。
- 於主控面板頂端即時以綠色/紅色狀態燈號顯示三大社群平台的登入狀態，並提供「🔄 重新整理狀態」按鈕。

### 3. 保留與相容現有核心
- 完整保留 `v44` 已修復之 AES-128 加密 M3U8 串流多執行緒解密與下載管線。
- 完整保留手動貼上 M3U8 網址功能與進度條介面。
