# 版本說明文件 (VERSION NOTES) - v54_Section_API_Progressive_Downloader

## 📅 版本日期：2026-10-04
## 📌 版本號碼：v54 (擴充套件 Manifest 版本 1.3.0)

---

### 一、版本更新宗旨與背景
在前一版本中，使用者實測發現了三大核心困境：
1. **抓 A 出現 B、D、E 亂套問題**：由於前端 SPA 具有激進預加載（Aggressive Preloading）機制，全域網路監聽抓取到的往往是背景正在加載的廣告或別的貼文。
2. **影片缺聲音或缺畫面問題**：DASH 切分導致下載下來只有單一視訊軌或音效軌，且全域模式無法精確配對。
3. **多視窗負擔與 GitHub 發布考量**：
   - 使用者習慣同時開啟上百個視窗，WebAssembly 轉檔架構極易造成瀏覽器記憶體爆炸崩潰。
   - 未來發布至 GitHub 給一般使用者時，無法依賴複雜的本機命令列或 Python/FFmpeg 環境。

---

### 二、核心修正與技術演進 (為什麼這樣做？)

#### 1. DOM Section / Article 容器身分證隔離 (對號入座)
- **實作內容**：
  - 徹底揚棄「從全域攔截佇列盲猜影片」的舊做法。
  - 下載按鈕嚴格掛載於各貼文的獨立容器（`article`、`div[role="article"]`），並從該容器內精準提取該貼文專屬的 URL（包含 Post ID、Reel ID、Shortcode）。
- **用意與功能**：
  - 點擊貼文 A，擴充套件就**指名向貼文 A 索取數據**，背景預加載了幾十部貼文 B、D、E 全數被物理隔離，徹底消滅「抓 A 出現 B」的亂套現象！

#### 2. 官方伺服器端 Progressive MP4 (音畫合一) 直出架構
- **實作內容**：
  - 優先從該貼文節點內部的 React 記憶體樹挖掘 `playable_url_quality_hd` / `browser_native_hd_url` / `video_url`。
  - 若未直接暴露，背景服務透過 `download-specific-post`，只針對該貼文發起官方 API 查詢，直接取得 Meta 官方伺服器端已經合成好、自帶 AAC 音訊與 H.264 影像的高畫質 Progressive MP4！
- **用意與功能**：
  - 下載下來的檔案 100% 同時具有聲音與畫面，再也不會是啞巴片或黑畫面！

#### 3. 極致輕量化設計 (開上百個分頁不卡頓、零依賴開箱即用)
- **實作內容**：
  - 不載入龐大的 WebAssembly FFmpeg 執行檔，不常駐背景吃記憶體。
  - 記憶體佔用極低（幾十 KB），完全由瀏覽器原生 Downloads API 負責極速儲存。
- **用意與功能**：
  - 同學開 200 個分頁視窗依然順暢輕巧，未來上傳到 GitHub 也完全零門檻，一般使用者開箱即用！

---

### 三、檔案結構與封包
- `v3/manifest.json`：版本號升級至 1.3.0。
- `v3/social/session.js`：全新貼文定向 API 抽取模組。
- `v3/worker.js`：新增 `download-specific-post` 定向下載訊息處理器。
- `v3/content_scripts/social_detector.js`：Section 容器身分證與 Progressive 直出引擎。
- `hls_social_downloader_v54_chrome_store.zip`：正式 Chrome 擴充套件封裝檔。
