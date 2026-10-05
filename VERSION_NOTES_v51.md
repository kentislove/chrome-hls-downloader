# 版本更新說明 (Version 51 - v1.0.1 完整影片修復版)

## 更新主旨：解決下載影片只有 100~200KB 局部切片的問題

### 1. 根本原因深度分析
- **問題現象**：點擊下載後，Chrome 順利開始下載，但儲存下來的 MP4 檔案只有 100~200KB，打開播放是黑畫面或只有幾秒。
- **技術真相（老師講原理）**：
  現代社群播放器（Facebook、Instagram、TikTok）為了節省網路頻寬，在播放影片時不會一次請求整支影片，而是發送帶有分段範圍（HTTP Byte-Range）的請求，例如：
  `https://scontent...fbcdn.net/...mp4?bytestart=0&byteend=204800&...`
  當外掛攔截到這個連線並直接交給 Chrome 下載時，Chrome 傻傻地照著網址去下載，結果只抓到了開頭的 `200KB` 切片（即影片的前導標頭 moov atom），而不是整支完整的 MP4 影片！

### 2. 核心解決方案 (`cleanVideoUrl`)
在 `worker.js` 與 `social_detector.js` 中新增了「**網址分段範圍自動清洗機制**」：
- 在發起下載前，自動解析目標網址並將 `bytestart` 與 `byteend` 參數完全移除！
- 當這兩個切片參數被拿掉後，伺服器就會認定這是一個「**請求整支影片**」的標準下載連線，回傳包含完整 19 秒、數 MB 到數十 MB 的完整高畫質 MP4 影片檔案！

---

## 異動檔案清冊
1. `v3/worker.js`：在 `download-active-media` 執行下載前，自動清洗 `bytestart` 與 `byteend`。
2. `v3/content_scripts/social_detector.js`：在直連下載時自動清洗 Range 切片參數。
3. `v3/manifest.json`：版本號提升至 `1.0.1`。
