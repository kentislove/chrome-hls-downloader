# 開發版本歷史總覽 (Development History & Release Archive)

本文件完整記錄 HLS 串流與社群全能下載器自 v43 啟動以來的迭代演進歷程與里程碑紀錄。

---

## 📊 版本演進時序表 (v43 ~ v66)

| 版本號 | 內部核心版本 | 核心主題與重大里程碑 | 說明文件 | 商店封裝包 |
| :--- | :--- | :--- | :--- | :--- |
| **v43** | 0.6.1 | HLS 原版擴充套件導入與專案基底確立 | [說明](VERSION_NOTES_v43.md) | - |
| **v44** | 0.6.2 | 繁體中文化、AES-128 大端序解密修復、手動網址輸入列 | [說明](VERSION_NOTES_v44.md) | `hls_downloader_v44_chrome_store.zip` |
| **v45** | 1.0.0 | 社群平台深度整合啟動 (Facebook / Instagram / TikTok) | [說明](VERSION_NOTES_v45.md) | `hls_social_downloader_v45_chrome_store.zip` |
| **v46** | 1.0.1 | 內容腳本注入時機與背景通訊除錯修復 | [說明](VERSION_NOTES_v46.md) | `hls_social_downloader_v46_chrome_store.zip` |
| **v47** | 1.0.2 | 來源網址 (Referer) 偽裝與跨域存取安全性強化 | [說明](VERSION_NOTES_v47.md) | `hls_social_downloader_v47_chrome_store.zip` |
| **v48** | 1.0.3 | 媒體類型嗅探器 (MIME Sniffer) 升級，精準識別切片串流 | [說明](VERSION_NOTES_v48.md) | `hls_social_downloader_v48_chrome_store.zip` |
| **v49** | 1.1.0 | 快取優先 (Cache-First) 架構導入，大幅降低重複流量 | [說明](VERSION_NOTES_v49.md) | `hls_social_downloader_v49_chrome_store.zip` |
| **v50** | 1.2.0 | 一鍵捕獲面板與全域懸浮下載按鈕升級 | [說明](VERSION_NOTES_v50.md) | `hls_social_downloader_v50_chrome_store.zip` |
| **v51** | 1.2.1 | 網址參數清洗演算法優化，去除分段切片邊界限制 | [說明](VERSION_NOTES_v51.md) | `hls_social_downloader_v51_chrome_store.zip` |
| **v52** | 1.3.0 | 目標 DOM 精準隔離，杜絕相鄰廣告干擾 | [說明](VERSION_NOTES_v52.md) | `hls_social_downloader_v52_chrome_store.zip` |
| **v53** | 1.4.0 | 音視訊分離軌道自動合併 (AV Merge) 與 IG 定位精準度強化 | [說明](VERSION_NOTES_v53.md) | `hls_social_downloader_v53_chrome_store.zip` |
| **v54** | 1.5.0 | Section 定向 API 優先架構，支援 Progressive MP4 直連 | [說明](VERSION_NOTES_v54.md) | `hls_social_downloader_v54_chrome_store.zip` |
| **v55** | 1.5.1 | 按鈕可見度層級調整與特定容器定位錨點強化 | [說明](VERSION_NOTES_v55.md) | `hls_social_downloader_v55_chrome_store.zip` |
| **v56** | 1.6.0 | 媒體格式自動校驗與 Facebook Reels 長片解析修復 | [說明](VERSION_NOTES_v56.md) | `hls_social_downloader_v56_chrome_store.zip` |
| **v57** | 1.6.1 | 限時動態 (Stories) 與短片 (Reels) 中央視窗精準過濾 | [說明](VERSION_NOTES_v57.md) | `hls_social_downloader_v57_chrome_store.zip` |
| **v58** | 1.7.0 | 真實環境跨平台相容性優化與多執行緒並行穩定性 | [說明](VERSION_NOTES_v58.md) | `hls_social_downloader_v58_chrome_store.zip` |
| **v59** | 1.8.0 | 輪播貼文側邊欄定位與背景腳本持久化常駐 | [說明](VERSION_NOTES_v59.md) | `hls_social_downloader_v59_chrome_store.zip` |
| **v60** | 1.9.0 | 廣告元件深層隔離與「照片加音樂」本機合成引擎初版 | [說明](VERSION_NOTES_v60.md) | `hls_social_downloader_v60_chrome_store.zip` |
| **v61** | 2.0.0 | DOM 本體直取優先 (DOM Direct Capture)，杜絕全域推薦劫持 | [說明](VERSION_NOTES_v61.md) | `hls_social_downloader_v61_chrome_store.zip` |
| **v62** | 2.0.1 | 實時串流原速 1:1 錄製時長修復，徹底消除倍速壓縮問題 | [說明](VERSION_NOTES_v62.md) | `hls_social_downloader_v62_chrome_store.zip` |
| **v63** | 2.1.0 | 長片超時保護與緩衝防中斷機制，成功錄製 52 秒長 Reel | [說明](VERSION_NOTES_v63.md) | `hls_social_downloader_v63_chrome_store.zip` |
| **v64** | 2.2.0 | **畫布雙緩衝防破格機制** + 5 Mbps 高碼率，**徹底消除畫格撕裂** | [說明](VERSION_NOTES_v64.md) | `hls_social_downloader_v64_chrome_store.zip` |
| **v65** | 2.3.0 | **IG 限時動態頂部居中控制面板** + React 雙向原圖/MP4 直取 + CORS 防護 | [說明](VERSION_NOTES_v65.md) | `hls_social_downloader_v65_chrome_store.zip` |
| **v66** | 2.4.0 | **IG 多頁輪播精準分頁提取** + 媒體型態防護牆 (拒絕 JFIF 冒充影片) | [說明](VERSION_NOTES_v66.md) | `hls_social_downloader_v66_chrome_store.zip` |

---

## 🏆 重大技術里程碑回顧

1. **里程碑一（v44）**：AES-128 大端序解密修復，確立通用 M3U8 串流無損下載能力。
2. **里程碑二（v61）**：DOM 本體直接接管，徹底排除社群平台贊助廣告與推薦演算法的干擾。
3. **里程碑三（v64）**：專屬高畫質畫布雙緩衝（Canvas Buffer）與 5 Mbps 高碼率，徹底消滅動態適應串流（MSE）長片錄製時的破格與馬賽克。
4. **里程碑四（v65）**：IG 限時動態頂部水平居中面板與 React 官方直連 0 秒極速無損導出。
5. **里程碑五（v66）**：IG 輪播貼文分頁 (`?img_index=N`) 精準索引與媒體型態防護牆，徹底解決影片誤抓縮圖問題。
