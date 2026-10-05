# 版本說明文件 (VERSION NOTES) - v56_Media_Format_And_FB_Reels_Fix

## 📅 版本日期：2026-10-04
## 📌 版本號碼：v56 (擴充套件 Manifest 版本 1.5.0)

---

### 一、版本更新宗旨與回測對齊
根據使用者極具價值的實測反饋，本版本採取「**嚴格保留正常功能，精準攻克異常環節**」的方針：

#### ✅ 完整保留的正常功能（完全不動其成功邏輯）：
1. **Facebook 限時動態（Stories）照片與影片下載**：100% 正常，原汁原味保留！
2. **Facebook 一般貼文照片下載**：100% 正常，原汁原味保留！
3. **Instagram 動態牆貼文照片下載**：100% 正常，原汁原味保留！

#### ❌ 專注解決的異常環節：
1. **Instagram 影片與 Reel 下載變成 JFIF 圖片格式**：
   - 成因：Instagram 每個影片容器都帶有一張封面縮圖（Poster Image）。前版在掃描圖片時將按鈕掛在封面圖上，且小幫手在部分條件下回退到了封面圖，導致下載下來的是 JFIF 靜態圖片而非影片。
2. **Facebook Reel 照片影片、焦點影片與一般影片異常**：
   - 成因：Facebook Reels 與 Watch 頁面使用特殊的播放器外殼與 DASH 串流，後端在過濾媒體時未嚴格排除圖片與靜態請求，導致影片串流捕獲失敗。

---

### 二、核心修正與技術演進 (為什麼這樣做？)

#### 1. 封面縮圖防錯機制 (No Poster as Photo)
- **實作內容**：
  - 新增 `isAssociatedWithVideo(img)` 判定函數，嚴格檢索圖片周圍 6 層 DOM 樹是否存在 `<video>`，或是否處於 `/reel/` 頁面。
  - 只要屬於影片相關封面縮圖，**100% 嚴禁掛載任何照片下載按鈕**！
- **用意與功能**：
  - 使用者在 Instagram 影片或 Reel 上，只能看見「下載影片 (MP4)」按鈕，徹底杜絕誤點封面圖下載成 JFIF 的現象！

#### 2. 全域小幫手「影片絕對優先原則」
- **實作內容**：
  - 重構右下角 `⚡ 快速下載當前焦點影音` 小幫手。
  - 只要頁面上存在任何 `<video>` 標籤，小幫手**100% 絕對優先鎖定影片進行 MP4 下載**，嚴禁在有影片的情況下掉落去下載圖片！只有整頁完全沒有任何影片的純照片貼文，才允許下載照片。

#### 3. Facebook Reels & 一般影片過濾器強化
- **實作內容**：
  - 在 `worker.js` 的 `download-active-media` 中，對 `fbcdn.net` 的請求建立嚴格過濾白名單，徹底排除 `.jpg`、`.png`、`.jfif` 等圖片雜訊。
  - 鎖定 `xpv_progressive` 與包含 `bytestart` 的高畫質串流，剝離 Range 切片參數，直接輸出完整的 Progressive MP4 檔案！

---

### 三、檔案結構與封包
- `v3/manifest.json`：版本號升級至 1.5.0。
- `v3/worker.js`：強化 Facebook 與 Instagram 串流白名單，強制 MP4 輸出。
- `v3/content_scripts/social_detector.js`：全面實裝封面縮圖防錯與影片絕對優先機制。
- `hls_social_downloader_v56_chrome_store.zip`：正式 Chrome 擴充套件封裝檔。
- 歷史版本收攏確認：`v55` 已依規則 11 移入 `HLFMIX`。
