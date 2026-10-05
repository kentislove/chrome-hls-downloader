# 版本說明文件 (VERSION NOTES) - v57_Stories_And_Reels_Precision_Fix

## 📅 版本日期：2026-10-04
## 📌 版本號碼：v57 (擴充套件 Manifest 版本 1.6.0)

---

### 一、版本更新宗旨與三大核心 BUG 攻克
本版本專門針對使用者實測回報的三項關鍵問題進行底層修復：

1. **修復 BUG 1 (Facebook 限動永遠只抓 1-1 或重複抓第一個朋友)**：
   - 成因：Facebook 限動在輪播切換時，舊朋友的 `<video>` 元素依然殘留於 DOM 樹內，`querySelector` 永遠只命中第 1 個。
   - 修正：改用 `getActiveStoryVideo` 動態鎖定 `!paused` 且螢幕正中央的活躍視訊，並在後端啟用 15 秒即時時間窗過濾，徹底排除歷史殘留串流！
2. **修復 BUG 2 (Facebook Reel 全部只抓到純音效軌)**：
   - 成因：Facebook 的音效軌 URL（`tag=sve_sound`）不包含 "audio" 字樣，先前 URL 比對失效，把純音軌誤認為影片。
   - 修正：在 `worker.js` 嚴格讀取 HTTP Response Header 的 `Content-Type`，強制判定 `isVideo` 並排除 `isAudio`；同時前端深入挖掘 Facebook Reel 頁面原生 Progressive 音畫合一 MP4 直連！
3. **修復 BUG 3 (Instagram 限動抓到別人或歷史錯位影片)**：
   - 成因：Instagram Stories 輪播 DOM 節點重疊，加上後端捕獲佇列跨限動污染。
   - 修正：前端精確對焦當前焦點限動元素，並透過 `isStory: true` 指令通知背景只匹配當前 15 秒內即時抵達的串流，點誰就下載誰，絕不錯位！

---

### 二、檔案結構與封包
- `v3/manifest.json`：版本號升級至 1.6.0。
- `v3/worker.js`：Response Header Content-Type 強制檢驗、15 秒限動即時時間窗過濾。
- `v3/content_scripts/social_detector.js`：`getActiveStoryVideo` 動態焦點鎖定、Facebook Reels 頁面原生 Progressive MP4 抽取、Facebook Stories 專屬頂層控制面板。
- `hls_social_downloader_v57_chrome_store.zip`：正式 Chrome 擴充套件封裝檔。
- 歷史版本收攏確認：`v56` 已依規則 11 移入 `HLFMIX`。
