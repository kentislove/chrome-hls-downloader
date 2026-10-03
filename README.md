# HLS 串流影片下載器 Chrome 擴充套件 (繁體中文版)
# HLS Stream Downloader Chrome Extension (Traditional Chinese & English)

> 🚀 自動偵測網頁中的 HLS (M3U8) 串流、支援 AES-128 加密影片解密、多執行緒極速下載並組合成 MP4/TS 檔案！  
> 🚀 Automatically detect HLS (M3U8) web streams, decrypt AES-128 encrypted segments, download in multiple threads, and save directly to MP4/TS!

---

## 🌐 語言選擇 / Language Selection
- [繁體中文說明手冊 (Traditional Chinese)](#-繁體中文說明手冊)
- [English Documentation & Manual](#-english-documentation--manual)

---

# 🇹🇼 繁體中文說明手冊

## ✨ 核心功能特色

1. **純繁體中文操作介面**：
   - 全面翻新操作視窗、右鍵選單、進度監控、畫質選擇器與下載設定，專為繁體中文使用者打造。
2. **支援 AES-128 串流解密（修復端序重大問題）**：
   - 完美支援標準 AES-128 加密串流。修正了原版在解析初始向量 (IV) 時因 CPU 小端序架構產生的位元組反轉問題，確保加密影片解密百分之百正確無雜訊。
   - 內建金鑰快取 (Key Cache)，同一部影片上千個切片無須重複連線向伺服器請求同一把金鑰，大幅降低伺服器負載並提升下載速度。
3. **新增手動輸入網址功能**：
   - 面板頂部新增「手動輸入網址列」，使用者可直接貼上 M3U8 播放清單網址或影片連結，按下「+ 新增任務」即可直接下載，無需等待網頁加載。
4. **多執行緒高速平行下載**：
   - 支援 1 ~ 5 個執行緒並行抓取影片切片，即使網路波動也能自動重試。
5. **預設封裝升級為 MP4**：
   - 支援將抓取切片直接封裝儲存為最通用的 MP4 格式，或原始 TS、MKV 檔案，相容任何播放器。
6. **防休眠與背景執行**：
   - 支援喚醒鎖定 (Screen Wake Lock)，下載大檔案時防止電腦進入睡眠。

---

## 💻 安裝教學（Chrome 開發者模式載入）

1. **開啟 Google Chrome 擴充功能頁面**：
   - 在網址列輸入 `chrome://extensions/` 並按下 Enter。
2. **啟用開發者模式**：
   - 將右上角的 **「開發者模式」** 開關切換為開啟（呈現藍色）。
3. **載入擴充套件**：
   - 點擊左上角的 **「載入未封裝項目」**。
   - 選取本專案內的 **`v3`** 資料夾（路徑：`chrome-hls-downloader/v3`）。
4. **固定在工具列**：
   - 點擊 Chrome 右上角的「拼圖」圖示，找到「HLS 串流影片下載器」，點擊旁邊的圖釘圖示將其釘選。

---

## 📖 操作指南

### 方法一：直接貼上 M3U8 網址下載
1. 點擊瀏覽器右上角擴充套件圖示開啟下載面板。
2. 在頂部的輸入框貼上 M3U8 網址（例如：`https://.../video.m3u8`）。
3. 點擊旁邊的 **「+ 新增任務」** 或按下 Enter。
4. 任務出現在清單中後，點擊右側的 **「立即下載」** 按鈕。
5. 選取電腦中的儲存位置與檔名，點擊儲存即可開始高速下載！

### 方法二：瀏覽網頁時自動攔截
1. 在 Chrome 中打開任何播放 HLS/M3U8 影片的網頁並讓影片開始播放。
2. 右上角的擴充套件圖示會顯示偵測到的影片數量（角標數字）。
3. 點擊圖示開啟面板，找到你想下載的畫質串流，點擊 **「立即下載」** 即可。

### 方法三：拖曳或剪貼簿貼上
- 直接將網頁上的影片超連結拖曳至下載器視窗。
- 將電腦中的本機 `.m3u8` 檔案拖入視窗。
- 在視窗內按下鍵盤 **Ctrl + V**，自動解析剪貼簿中的影片連結。

---

# 🇺🇸 English Documentation & Manual

## ✨ Key Features

1. **Fully Localized Traditional Chinese & Clean UI**:
   - Polished interface, context menus, quality prompts, and settings.
2. **Robust AES-128 Stream Decryption (Endianness Bug Fixed)**:
   - Fixed the critical bug in `m3u8-parser` IV handling where `Uint32Array` buffer caused byte-swapping on Little-Endian CPU architectures. All AES-128 encrypted HLS streams decrypt with 100% accuracy.
   - Built-in key memory cache prevents thousands of redundant key requests to origin servers.
3. **Manual URL Input Bar**:
   - Convenient input bar at the top of the popup allows direct pasting of any `.m3u8` or media URL with immediate job queuing.
4. **Multi-Threaded Parallel Downloads**:
   - Supports 1 to 5 simultaneous download threads with configurable retry threshold.
5. **MP4 / TS / MKV Output Formats**:
   - Direct container selection: MP4 (highest compatibility), TS (raw transport stream), or MKV.
6. **Screen Wake Lock API**:
   - Prevents your operating system from sleeping during long download sessions.

---

## 💻 Installation (Load Unpacked in Chrome)

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the upper-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the **`v3`** directory inside this repository.
5. Pin the extension to your Chrome toolbar for quick access.

---

## 📖 Usage Guide

### Method 1: Direct M3U8 URL Download
1. Click the extension icon in your Chrome toolbar to open the download dialog.
2. Paste any M3U8 manifest URL in the input bar at the top.
3. Click **"+ Add Job"** (`+ 新增任務`) or press Enter.
4. Click **"Download"** (`立即下載`) next to the job entry.
5. Pick your destination folder and file name to begin downloading.

### Method 2: Automatic Web Sniffing
1. Navigate to any webpage playing an HLS/M3U8 video.
2. The extension badge icon will display the count of detected media streams.
3. Click the icon, pick your desired stream quality, and click **Download**.

### Method 3: Drag & Drop / Clipboard
- Drag HTML links or local `.m3u8` files directly into the window.
- Press **Ctrl + V** inside the extension window to extract and load URLs from the clipboard.

---

## 📜 License & Acknowledgements

- Based on the open-source architecture by Chandler Stimson ([Live Stream Downloader](https://github.com/chandler-stimson/live-stream-downloader)).
- Licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.
- Enhanced, debugged, and localized by **kentislove**.
