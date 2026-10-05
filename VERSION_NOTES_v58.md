# 版本說明文件 (VERSION NOTES) - v58_Real_World_Fix_FB_IG_Reels_Stories

## 📅 版本日期：2026-10-04
## 📌 版本號碼：v58 (擴充套件 Manifest 版本 1.7.0)

---

### 一、版本更新宗旨：攻克四個真實線上案例
本版本依據使用者所提供的四個真實網址與操作異常進行靶向修復：

1. **案例一 (FB 限動下載到背景 Commerce/Listing 廣告照片且無影片)**：
   - 網址：`https://www.facebook.com/stories/2368626216484092/UzpfSVNDOjI3NzYyMzEwMzEzNDQ0NDgz/...`
   - 成因：限動影片採用 MSE 串流，其 `video.src` 為空值字串，被判定為無影片而落入照片備援邏輯；而備援照片未限制在可見容器內，誤抓了背景 Marketplace 商務廣告。
   - 修正：移除 `src` 假值限制，只要存在 `<video>` 標籤即強制走影片下載；照片嚴格限制在當前可見視窗內，過濾所有 Commerce/Listing 廣告！
2. **案例二 (FB Reel 按了按鈕沒有反應)**：
   - 網址：`https://www.facebook.com/reel/1621040342971977`
   - 成因：CDN 網址不帶貼文數字 ID，過度嚴苛的字串匹配導致比對失敗且 Toast 權重不足。
   - 修正：優化 Facebook 串流比對容錯，自動回退並挑選最新活動之 Progressive MP4 視訊串流，確保必定觸發下載！
3. **案例三 (IG 限動按了按鈕沒有反應)**：
   - 網址：`https://www.instagram.com/stories/travelwithdonalin/3999731744571676208/`
   - 成因：Instagram MSE blob 播放器的 `video.src` 同樣為空字串，導致 `if (activeVideo && activeVideo.src)` 判定為 false 直接中斷。
   - 修正：只要偵測到當前活動 `<video>`，立即啟動下載，徹底解決按鈕假死問題！
4. **案例四 (IG Reel 下載變成 JFIF 封面圖而非影片)**：
   - 網址：`https://www.instagram.com/reels/Dd-yxPGT5hc/`
   - 成因：Reel API 數據中缺少 `is_video` 標記，直接落入 `display_url` 提取邏輯，將封面圖當成原圖下載。
   - 修正：Reel 網址嚴格判定為影片媒體，強制提取 `video_versions[0].url`，100% 確保下載為高畫質 MP4 影片！

---

### 二、檔案結構與封包
- `v3/manifest.json`：版本號升級至 1.7.0。
- `v3/social/session.js`：Reel 貼文強制 MP4 輸出，嚴禁回傳封面圖。
- `v3/worker.js`：串流比對自動回退容錯機制，保證按鈕必定響應。
- `v3/content_scripts/social_detector.js`：徹底修復限動影片 MSE 空值判定與廣告圖排除。
- `hls_social_downloader_v58_chrome_store.zip`：正式 Chrome 擴充套件封裝檔。
- 歷史版本收攏確認：`v57` 已依規則 11 移入 `HLFMIX`。
