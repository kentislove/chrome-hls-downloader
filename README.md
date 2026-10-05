# HLS & Social Media Video Downloader (HLS & 社群全能影片下載器) - v66

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Manifest Version: 3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/version-2.4.0_(v66)-orange.svg)](DEVELOPMENT_HISTORY.md)
[![Language: Dual](https://img.shields.io/badge/Language-English_%7C_%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-purple.svg)](README_%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87%E6%95%99%E5%AD%B8.md)

A high-performance streaming media and social backup extension for Google Chrome. Features universal M3U8 (HLS) stream extraction with AES-128 decryption, as well as native support for personal backup of videos, photos, Reels, and Stories from Facebook and Instagram.

一款專為 Google Chrome 開發的高效能串流與社群影音備份下載擴充功能，支援 M3U8 (HLS) 串流下載、AES-128 加密解密，並深度整合 Facebook 與 Instagram 個人影音、照片、Reels、限時動態（Stories）及多頁輪播貼文之精準備份。

---

## ⚠️ 重要合規聲明與免責條款 (Important Legal Disclaimer)

> ### 🔒 個人帳號備份專用聲明 (Personal Backup Use Only)
> 本擴充功能所提供之 **Facebook (臉書)** 與 **Instagram** 下載功能，**嚴格且僅限於使用者下載與備份自己個人帳號內所發布之照片、影片、Reels 與限時動態**。
>
> 1. **僅限個人自用備份**：本工具專為個人社群媒體資料存檔與防遺失設計，切勿用於下載未經授權之他人著作物。
> 2. **嚴禁商業營利與未授權散布**：嚴禁將下載內容用於商業用途、二次發布或任何侵犯他人智慧財產權與個人隱私之行為。
> 3. **遵守平台規範**：使用者應遵守各社群平台之服務條款（Terms of Service）。使用者需對自身的下載行為負擔完全之法律責任。
>
> 詳細合規條款請參閱 [DISCLAIMER.md (免責聲明與使用規範)](DISCLAIMER.md)。

---

## 🌟 核心特色 (Core Features)

### 1. 完整 M3U8 (HLS) 串流下載與 AES-128 自動解密
- **多執行緒並行下載**：自動偵測網頁中的 `.m3u8` 清單，並行下載分段 `.ts` 碎片並自動封裝為無損 MP4 / TS 影片。
- **大端序 AES-128 核心解密**：徹底修復 x86 架構端序顛倒問題，內建金鑰快取（Key Cache），加密切片秒速解密。
- **手動網址輸入列**：主介面提供手動輸入網址功能，可直接貼上 M3U8 連結一鍵加入下載任務。

### 2. Facebook (臉書) 影音與長片精準接管
- **動態播放器原生接管 (DOM Direct Capture)**：嚴格鎖定眼前正在播放的影片，徹底杜絕廣告穿插與全域假推薦劫持。
- **畫布雙緩衝防震牆 (Canvas Buffer) + 5 Mbps 高碼率**：解決 MSE 自我適應串流解析度突變造成的關鍵畫格撕裂，徹底告別長片破格與馬賽克。
- **原速 1:1 完整時長錄製**：精準計算時長，解除倍速壓縮限制，長達 1 分鐘以上的 Reels 與長片皆可完整收錄。

### 3. Instagram (IG) 限時動態與多頁輪播精準解析
- **頂部居中專屬浮動面板**：限時動態瀏覽時，操作面板永遠置頂水平居中（`left: 50%`），醒目美觀、絕不被遮擋。
- **React 官方直連深度採掘**：優先從底層提取官方 1080P MP4 影片或無損大圖，0 秒極速直接儲存。
- **多頁輪播分頁精準定址 (`?img_index=N`)**：徹底解決輪播第 3 頁影片誤抓為封面 JFIF / JPG 縮圖的痛點，內建媒體型態防護牆，嚴格保證影片下載為 MP4。
- **跨域安全防護 (CORS Tainted Canvas Fallback)**：遭遇跨域保護時自動無縫降級為原生串流接管，永不中斷報錯。

---

## 📥 安裝教學 (Installation Guide)

### 開發者模式載入 (開發與測試用)：
1. 開啟 Chrome 瀏覽器，於網址列輸入 `chrome://extensions/` 並按 Enter。
2. 開啟右上角的「**開發人員模式 (Developer mode)**」。
3. 點擊左上角的「**載入未封裝項目 (Load unpacked)**」。
4. 選擇本專案目錄中的 **`v3`** 資料夾。
5. 載入成功後，即可在擴充功能清單中看到「**HLS 串流與社群全能下載器**」！
6. 點擊 Chrome 擴充套件「拼圖」圖示，將本工具釘選至工具列方便隨時調用。

### Chrome 線上應用程式商店審核封裝包：
- 本專案目錄提供經完整測試打包之最新擴充功能壓縮檔：
  `hls_social_downloader_v66_chrome_store.zip`

---

## 🎬 使用指南 (Usage Guide)

### 模式一：M3U8 串流影片下載
- **自動捕獲**：在一般影音網站播放影片時，右上角擴充功能圖示會即時顯示偵測到的串流數量，點擊圖示進入面板點擊「立即下載」。
- **手動貼上**：在面板上方貼上任意 `.m3u8` 網址，點擊「+ 新增任務」即可全速並行下載。

### 模式二：Facebook 影片與長 Reel 下載
- 瀏覽 Facebook 影片或 Reels 時，播放器右上角會自動浮現 `📥 下載 Facebook Reel (MP4 音畫合一)` 按鈕。
- 點擊後系統自動以 1:1 原速接管串流與高畫質畫布雙緩衝，下載完整無破格之 MP4 影片。

### 模式三：Instagram 限時動態與輪播貼文下載
- **限時動態 (Stories)**：進入限動全螢幕播放時，頂部正中央會浮現 `📥 一鍵下載當前 Instagram 限動 (影片/照片)` 按鈕，自動識別影片或照片一鍵秒速存檔。
- **多頁輪播 (Carousel)**：切換到任意頁面（如 `?img_index=3`），按鈕動態顯示 `📥 下載 Instagram 輪播影片 (第 3 頁)`，精準下載當前分頁的真實 MP4 影片。

---

## 📂 專案架構 (Architecture)

```text
├── v3/                              # Chrome Extension Manifest V3 原始碼
│   ├── manifest.json                # 擴充功能清單宣告 (Version 2.4.0)
│   ├── worker.js                    # 後台 Service Worker (含多執行緒下載、社群媒體監聽與型態防護)
│   ├── _locales/                    # 繁體中文 (zh_TW) 與英文 (en) 多國語言包
│   ├── content_scripts/             # 頁面注入腳本
│   │   ├── social_detector.js       # 社群媒體偵測器 (含 DOM 接管、React 直取、畫布防破格緩衝)
│   │   └── social_detector.css      # 懸浮按鈕與置頂面板樣式
│   ├── social/                      # 社群解析模組
│   │   └── session.js               # Facebook / Instagram 定向 API 與輪播 JSON 深度提取
│   ├── data/job/                    # M3U8 多執行緒下載與合併核心
│   └── plugins/                     # 串流嗅探外掛
├── DISCLAIMER.md                    # 免責聲明與個人備份合規使用規範
├── DEVELOPMENT_HISTORY.md           # v43 至 v66 完整版本演進時序表
├── README_繁體中文教學.md            # 詳細繁體中文課堂風格教學手冊
└── README.md                        # 本說明文件 (Dual Language)
```

---

## 📜 歷史版本系列 (Version Notes Archive)
完整歷史記錄請參閱 [DEVELOPMENT_HISTORY.md](DEVELOPMENT_HISTORY.md)。
- [v66 說明書 (輪播影片分頁精準下載與型態防護)](VERSION_NOTES_v66.md)
- [v65 說明書 (IG 限動頂部居中控制面板與 React 直取)](VERSION_NOTES_v65.md)
- [v64 說明書 (畫布雙緩衝徹底修復長片破格)](VERSION_NOTES_v64.md)
- [v63 說明書 (長片錄製超時保護與緩衝防中斷)](VERSION_NOTES_v63.md)
- [v62 說明書 (1:1 原速無損接管時長修復)](VERSION_NOTES_v62.md)
- [v61 說明書 (DOM 本體直取優先杜絕推薦干擾)](VERSION_NOTES_v61.md)
- [v45 ~ v60 各版本說明書](DEVELOPMENT_HISTORY.md)

---

## 📄 授權條款 (License)
本專案採用 [Mozilla Public License 2.0 (MPL-2.0)](LICENSE) 開源授權。
