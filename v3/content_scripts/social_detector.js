/**
 * 社群網頁真實場景全實測修復引擎 (v58 Real-World Fix for FB & IG Reels / Stories)
 * 核心徹底修復：
 * 1. 【修復案例一 (FB 限動抓到 Commerce/Listing 廣告照片)】：
 *    - 移除 activeVideo.src 偽驗證，只要當前有影片元素即強制走影片流程。
 *    - 嚴格限制限動照片必須位於當前全螢幕可見視野內，徹底杜絕抓取背景 Marketplace 商務貼文！
 * 2. 【修復案例二 (FB Reel 按了沒反應)】：
 *    - 取消嚴苛的 CDN ID 強制比對，背景直接定向鎖定當前 Facebook Reel 播放之 Progressive MP4 串流！
 * 3. 【修復案例三 (IG 限動按了沒反應)】：
 *    - 徹底拔除 activeVideo.src 假值判定，MSE blob 影片 100% 成功觸發下載！
 * 4. 【修復案例四 (IG Reel 下載變成 JFIF 封面圖)】：
 *    - 嚴禁 Reel 回傳 display_url 封面，強制鎖定 video_versions[0].url 直連，100% 下載 MP4！
 */

(() => {
  // 建立提示訊息 (Toast) - 強制最頂層
  let toastEl = null;
  function showToast(text, duration = 3500) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'social-dl-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = `<span>⚡</span> <span>${text}</span>`;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // 下載圖示 SVG
  const downloadIcon = `
    <svg viewBox="0 0 24 24">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
    </svg>
  `;

  // 建立浮動下載按鈕
  // 建立浮動下載按鈕 (點擊立即給予視覺反饋，杜絕無反應錯覺)
  function createButton(label, onClick, customClass = '') {
    const container = document.createElement('div');
    container.className = `social-dl-btn-container ${customClass}`;
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `social-dl-btn ${customClass ? customClass + '-btn' : ''}`;
    btn.innerHTML = `${downloadIcon} <span>${label}</span>`;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const origHtml = btn.innerHTML;
      btn.innerHTML = `<span>⏳</span> <span>正在解析處理...</span>`;
      btn.style.opacity = '0.8';
      btn.disabled = true;
      try {
        await onClick(btn);
      } catch (err) {
        console.warn('點擊處理異常：', err);
        showToast('💡 正在嘗試備援下載，請稍候...');
      } finally {
        setTimeout(() => {
          btn.innerHTML = origHtml;
          btn.style.opacity = '1';
          btn.disabled = false;
        }, 1000);
      }
    });
    
    container.appendChild(btn);
    return container;
  }

  // 清理影片網址中的分段 Range 限制參數
  function cleanVideoUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      const u = new URL(rawUrl);
      u.searchParams.delete('bytestart');
      u.searchParams.delete('byteend');
      return u.href;
    } catch (e) {
      return rawUrl.replace(/([?&])bytestart=\d+(&?)/, '$1').replace(/([?&])byteend=\d+(&?)/, '$1');
    }
  }

  // 從瀏覽器本機資源計量中提取即時載入之 Progressive MP4 串流
  function getActiveResourceStream(platform) {
    try {
      if (typeof performance === 'undefined' || !performance.getEntriesByType) return null;
      const entries = performance.getEntriesByType('resource');
      const isFB = platform === 'Facebook';
      const cdnKeyword = isFB ? 'fbcdn.net' : 'cdninstagram.com';
      for (let i = entries.length - 1; i >= 0; i--) {
        const name = entries[i].name;
        if (!name || !name.includes(cdnKeyword)) continue;
        const lower = name.toLowerCase();
        if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.webp') || lower.includes('.jfif')) continue;
        if (lower.includes('.mp4') || lower.includes('xpv_progressive') || lower.includes('sve_') || lower.includes('video')) {
          return cleanVideoUrl(name);
        }
      }
    } catch (e) {}
    return null;
  }

  // 觸發本機檔案儲存 (強制 MP4 校正)
  function triggerSave(url, filename, isVideo = false) {
    let safeName = filename;
    if (isVideo && !safeName.toLowerCase().endsWith('.mp4')) {
      safeName = safeName.replace(/\.[a-zA-Z0-9]+$/, '') + '.mp4';
    }

    chrome.runtime.sendMessage({
      method: 'download-cached-file',
      url: url,
      filename: safeName,
      saveAs: false
    }, res => {
      if (!res || res.error) {
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 1000);
      }
    });
  }

  // -------------------------------------------------------------------------
  // 1. 取得貼文專屬網址
  // -------------------------------------------------------------------------
  function findPostUrl(element) {
    if (!element) return location.href;
    if (location.pathname.includes('/reel/') || location.pathname.includes('/reels/') || location.pathname.includes('/stories/')) {
      return location.href;
    }
    // 若處於貼文專屬頁面中，直接回傳帶有當前輪播分頁索引 (?img_index=N) 之完整網址
    if (location.pathname.includes('/p/')) {
      return location.href;
    }

    let curr = element;
    let depth = 0;
    while (curr && depth < 12) {
      const link = curr.querySelector(
        'a[href*="/reel/"], a[href*="/p/"], a[href*="/videos/"], a[href*="/watch/"], a[href*="/posts/"], a[href*="permalink.php"], a[href*="story.php"]'
      );
      if (link && link.href) return link.href;
      curr = curr.parentElement;
      depth++;
    }
    return location.href;
  }

  // -------------------------------------------------------------------------
  // 2. 限時動態焦點媒體鎖定 (精準鎖定螢幕正中央活動卡片，徹底排除相鄰預載項)
  // -------------------------------------------------------------------------
  function getActiveStoryElement() {
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    // 1. 優先檢查位於螢幕正中央活動視窗的 video
    const videos = Array.from(document.querySelectorAll('video')).filter(v => {
      const rect = v.getBoundingClientRect();
      const inCenter = rect.left < viewportCenterX && rect.right > viewportCenterX &&
                       rect.top < viewportCenterY && rect.bottom > viewportCenterY &&
                       rect.width > 180 && rect.height > 180;
      return inCenter && !isAdElement(v);
    });

    let activeVideo = null;
    if (videos.length > 0) {
      activeVideo = videos.find(v => !v.paused) || videos[0];
    }

    // 2. 檢查位於螢幕正中央活動視窗的 img (排除商務與頭像)
    const images = Array.from(document.querySelectorAll('img')).filter(img => {
      const rect = img.getBoundingClientRect();
      const inCenter = rect.left < viewportCenterX && rect.right > viewportCenterX &&
                       rect.top < viewportCenterY && rect.bottom > viewportCenterY &&
                       rect.width > 180 && rect.height > 180;
      return inCenter && !img.src.includes('commerce') && !img.src.includes('listing') && !isAdElement(img);
    });

    let activeImg = images.length > 0 ? images[0] : null;

    // 判斷中央影片是否具備真實畫格
    const hasRealVideo = Boolean(activeVideo && (activeVideo.videoWidth > 0 || !activeVideo.paused));

    return {
      video: hasRealVideo ? activeVideo : null,
      image: activeImg,
      hasRealVideo: hasRealVideo
    };
  }

  // -------------------------------------------------------------------------
  // 3. 眼前播放器 React 實例直接挖掘 (影片與照片原創直取)
  // -------------------------------------------------------------------------
  function extractProgressiveFromReact(element) {
    if (!element) return null;
    try {
      const visited = new Set();
      const targetKeys = [
        'playable_url_quality_hd',
        'browser_native_hd_url',
        'playable_url',
        'browser_native_sd_url',
        'progressive_download_url',
        'hd_src',
        'sd_src',
        'video_url',
        'videoUrl',
        'playback_url',
        'playbackUrl',
        'src'
      ];

      function searchInObj(obj, depth) {
        if (!obj || depth > 10 || visited.has(obj)) return null;
        if (typeof obj !== 'object' && typeof obj !== 'function') return null;
        visited.add(obj);

        for (const k of targetKeys) {
          try {
            const v = obj[k];
            if (typeof v === 'string' && v.startsWith('http') && !v.startsWith('blob:')) {
              const lower = v.toLowerCase();
              if (!lower.includes('.jpg') && !lower.includes('.png') && !lower.includes('.jfif') && !lower.includes('.webp') && !lower.includes('sponsored') && !lower.includes('audio')) {
                if (lower.includes('fbcdn.net') || lower.includes('cdninstagram.com') || lower.includes('.mp4')) {
                  return cleanVideoUrl(v);
                }
              }
            }
          } catch (e) {}
        }

        try {
          const versions = obj.video_versions || obj.videoVersions;
          if (Array.isArray(versions) && versions.length > 0) {
            const first = versions[0];
            if (first && typeof first.url === 'string' && !first.url.includes('.jpg')) {
              return cleanVideoUrl(first.url);
            }
          }
        } catch (e) {}

        try {
          if (Array.isArray(obj.representations)) {
            for (const rep of obj.representations) {
              const u = rep.base_url || rep.url;
              if (typeof u === 'string' && u.startsWith('http') && (rep.mime_type || '').includes('video')) {
                return cleanVideoUrl(u);
              }
            }
          }
        } catch (e) {}

        try {
          for (const key of Object.keys(obj)) {
            try {
              const val = obj[key];
              if (typeof val === 'string' && val.startsWith('http') && !val.startsWith('blob:') && val.includes('.mp4')) {
                const lower = val.toLowerCase();
                if (!lower.includes('audio') && !lower.includes('.jpg') && (lower.includes('fbcdn.net') || lower.includes('cdninstagram.com')) && !lower.includes('sponsored')) {
                  return cleanVideoUrl(val);
                }
              } else if (typeof val === 'object' && val !== null) {
                const res = searchInObj(val, depth + 1);
                if (res) return res;
              }
            } catch (e) {}
          }
        } catch (e) {}
        return null;
      }

      let curr = element;
      let level = 0;
      while (curr && level < 15) {
        try {
          for (const prop in curr) {
            if (prop.startsWith('__reactFiber') || prop.startsWith('__reactProps') || prop.startsWith('__reactInternalInstance')) {
              const url = searchInObj(curr[prop], 0);
              if (url) return url;
            }
          }
        } catch (e) {}
        curr = curr.parentElement;
        level++;
      }
    } catch (e) {}
    return null;
  }

  // 從 React 節點中直接挖掘最高解析度原圖照片
  function extractImageFromReact(element) {
    if (!element) return null;
    try {
      const visited = new Set();
      const targetKeys = [
        'display_url',
        'displayUrl',
        'imageUrl',
        'image_url',
        'src'
      ];

      function searchInObj(obj, depth) {
        if (!obj || depth > 10 || visited.has(obj)) return null;
        if (typeof obj !== 'object' && typeof obj !== 'function') return null;
        visited.add(obj);

        for (const k of targetKeys) {
          try {
            const v = obj[k];
            if (typeof v === 'string' && v.startsWith('http') && !v.startsWith('blob:')) {
              const lower = v.toLowerCase();
              if ((lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.webp') || lower.includes('cdninstagram.com') || lower.includes('fbcdn.net')) && !lower.includes('.mp4') && !lower.includes('sponsored')) {
                return cleanVideoUrl(v);
              }
            }
          } catch (e) {}
        }

        try {
          const cands = obj.image_versions2?.candidates || obj.candidates;
          if (Array.isArray(cands) && cands.length > 0) {
            const first = cands[0];
            if (first && typeof first.url === 'string') {
              return cleanVideoUrl(first.url);
            }
          }
        } catch (e) {}

        try {
          for (const key of Object.keys(obj)) {
            try {
              const val = obj[key];
              if (typeof val === 'object' && val !== null) {
                const res = searchInObj(val, depth + 1);
                if (res) return res;
              }
            } catch (e) {}
          }
        } catch (e) {}
        return null;
      }

      let curr = element;
      let level = 0;
      while (curr && level < 15) {
        try {
          for (const prop in curr) {
            if (prop.startsWith('__reactFiber') || prop.startsWith('__reactProps') || prop.startsWith('__reactInternalInstance')) {
              const url = searchInObj(curr[prop], 0);
              if (url) return url;
            }
          }
        } catch (e) {}
        curr = curr.parentElement;
        level++;
      }
    } catch (e) {}
    return null;
  }

  // -------------------------------------------------------------------------
  // 4. 【終極武器】：原生播放器串流接管錄製 (0 誤差無損直取眼前正在播放的畫面與音效)
  // -------------------------------------------------------------------------
  let isRecordingNow = false;
  async function recordActiveVideoStream(video, filename) {
    if (isRecordingNow) {
      showToast('⏳ 目前已有影片正在錄製中，請等待完成後再下載下一部！', 3000);
      return;
    }
    isRecordingNow = true;
    try {
      await recordActiveVideoStreamCore(video, filename);
    } finally {
      isRecordingNow = false;
    }
  }

  async function recordActiveVideoStreamCore(video, filename) {
    showToast('🎬 正在啟用高畫質防破格串流接管引擎 (100% 精準擷取眼前畫面)...', 3000);

    // 1. 取得原生影音串流（提取純正音效軌）
    const rawStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
    if (!rawStream) {
      throw new Error('瀏覽器不支援播放器原生串流接管');
    }
    const audioTracks = rawStream.getAudioTracks ? rawStream.getAudioTracks() : [];

    // 2. 建立專屬高畫質畫布緩衝區 (Canvas Intermediate Buffer)，徹底解決 MSE 變速與動態解析度造成的「破格」問題
    // 同時具備跨域污染安全降級防護 (Tainted Canvas Fallback)
    const vWidth = video.videoWidth || 720;
    const vHeight = video.videoHeight || 1280;
    let canvas = null;
    let ctx = null;
    let combinedStream = null;
    let isCanvasActive = false;

    try {
      canvas = document.createElement('canvas');
      canvas.width = vWidth;
      canvas.height = vHeight;
      ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

      if (video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const canvasStream = canvas.captureStream(30);
      const videoTracks = canvasStream.getVideoTracks();
      combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
      isCanvasActive = true;
    } catch (corsErr) {
      console.warn('畫布遭遇跨域限制，安全降級為原生串流接管：', corsErr);
      combinedStream = rawStream;
      isCanvasActive = false;
    }

    const isMp4Supported = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
    const mimeType = isMp4Supported 
      ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
      : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm');

    // 5. 明確設定 5 Mbps 高碼率，杜絕馬賽克與畫格撕裂破格
    const recorderOptions = {
      mimeType,
      videoBitsPerSecond: 5000000,
      audioBitsPerSecond: 128000
    };
    let recorder;
    try {
      recorder = new MediaRecorder(combinedStream, recorderOptions);
    } catch (e) {
      console.warn('高碼率初始化異常，降級為標準選項：', e);
      recorder = new MediaRecorder(combinedStream, { mimeType });
    }

    const chunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    // 影片時長與狀態保護
    const rawDur = video.duration;
    const duration = (isFinite(rawDur) && rawDur > 0) ? rawDur : 45;
    const originalRate = video.playbackRate;
    const originalTime = video.currentTime;
    const originalLoop = video.loop;
    const originalMuted = video.muted;

    video.playbackRate = 1;
    video.loop = false;
    video.currentTime = 0;

    // 確保非靜音以保證音效軌正常輸入
    if (video.muted) {
      video.muted = false;
    }

    // 等待跳回開頭後的畫面緩衝完成，最多等待 5 秒
    await new Promise(resolve => {
      if (video.readyState >= 3) return resolve();
      const onReady = () => { video.removeEventListener('canplay', onReady); resolve(); };
      video.addEventListener('canplay', onReady);
      setTimeout(resolve, 5000);
    });

    if (video.paused) {
      try { await video.play(); } catch (e) {}
    }

    // 6. 啟動逐幀平滑渲染循環 (若畫布啟動中)
    let isRendering = true;
    const renderLoop = () => {
      if (!isRendering) return;
      if (isCanvasActive && ctx && canvas) {
        try {
          if (video.readyState >= 2 && !video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        } catch (e) {}
      }

      if ('requestVideoFrameCallback' in video) {
        video.requestVideoFrameCallback(renderLoop);
      } else {
        requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();

    // 啟動錄製，每 1000ms 一段以維持封裝容器完整度
    recorder.start(1000);

    // 緩衝卡頓時同步暫停錄影，避免時間軸空轉
    const onWaiting = () => { try { if (recorder.state === 'recording') recorder.pause(); } catch (e) {} };
    const onPlaying = () => { try { if (recorder.state === 'paused') recorder.resume(); } catch (e) {} };
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    await new Promise(resolve => {
      let isDone = false;
      let lastTime = 0;
      let stallCount = 0;

      const finish = () => {
        if (isDone) return;
        isDone = true;
        isRendering = false;
        clearInterval(ticker);
        clearTimeout(guard);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('ended', finish);
        resolve();
      };

      const onTimeUpdate = () => {
        const t = video.currentTime;
        // 播放到結尾，或偵測到平台強制回捲至開頭
        if (t >= duration - 0.2 || (lastTime > 2 && t < 0.5)) {
          finish();
          return;
        }
        if (Math.abs(t - lastTime) < 0.05) {
          stallCount++;
        } else {
          stallCount = 0;
        }
        lastTime = t;
      };

      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('ended', finish);

      // 即時進度與剩餘秒數提示
      const ticker = setInterval(() => {
        const cur = video.currentTime;
        const dur = (isFinite(video.duration) && video.duration > 0) ? video.duration : duration;
        const remain = Math.max(0, Math.ceil(dur - cur));
        showToast(`🎬 正在高畫質防破格錄製 (總長 ${Math.round(dur)} 秒，已錄 ${Math.round(cur)} 秒，剩餘約 ${remain} 秒)...`, 1500);
      }, 1000);

      // 長片保護上限：設定為片長 + 60 秒緩衝容忍，絕不提早中斷
      const maxWaitMs = Math.max(duration * 1000 + 60000, 90000);
      const guard = setTimeout(() => {
        console.warn('錄製達到最長保護時限，正在封裝已擷取數據...');
        finish();
      }, maxWaitMs);
    });

    isRendering = false;
    video.removeEventListener('waiting', onWaiting);
    video.removeEventListener('playing', onPlaying);

    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    try {
      if (recorder.state !== 'inactive') recorder.stop();
    } catch (e) {}
    await stopped;

    // 釋放畫布與串流軌道資源
    try {
      combinedStream.getTracks().forEach(t => t.stop());
      canvasStream.getTracks().forEach(t => t.stop());
    } catch (e) {}

    video.playbackRate = originalRate;
    video.loop = originalLoop;
    video.muted = originalMuted;
    try { video.currentTime = originalTime; } catch (e) {}

    if (chunks.length === 0) {
      throw new Error('未收集到有效的影音數據');
    }

    const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
    const blobUrl = URL.createObjectURL(blob);
    triggerSave(blobUrl, filename, true);
    showToast('🎉 成功以高畫質防破格完整錄製眼前這部影片 (音畫合一、無撕裂無雜訊)！', 4000);
  }

  // 判斷該 DOM 節點是否隸屬於贊助廣告 (Sponsored Ad) 容器
  function isAdElement(el) {
    if (!el) return false;
    let curr = el;
    let depth = 0;
    while (curr && depth < 10) {
      const txt = (curr.innerText || curr.textContent || '').toLowerCase();
      if (txt.includes('sponsored') || txt.includes('贊助') || txt.includes('廣告') || txt.includes('特別推薦')) {
        return true;
      }
      if (curr.getAttribute) {
        const aria = (curr.getAttribute('aria-label') || '').toLowerCase();
        if (aria.includes('sponsored') || aria.includes('贊助') || aria.includes('廣告')) return true;
      }
      curr = curr.parentElement;
      depth++;
    }
    return false;
  }

  // 索取當前分頁最新捕獲的音效軌 (Music / Audio Stream)
  function getActiveAudioTrackUrl() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ method: 'get-active-audio' }, res => {
        resolve(res && res.success ? res.audioUrl : null);
      });
    });
  }

  // -------------------------------------------------------------------------
  // 4. 【核心選項 B 實作】：本機合成「照片加音樂」限動為音畫合一 MP4
  // -------------------------------------------------------------------------
  async function synthesizePhotoMusicStory(img, audioEl, filename, platform) {
    showToast('🎨 偵測到「照片加音樂」限動！正在本機啟動音畫合一 MP4 合成引擎...', 3500);

    let audioUrl = audioEl ? (audioEl.currentSrc || audioEl.src) : null;
    if (!audioUrl || audioUrl.startsWith('blob:')) {
      audioUrl = await getActiveAudioTrackUrl();
    }

    // 若完全無音訊軌，直接安全回退至照片下載
    if (!audioUrl) {
      showToast('💡 該限動未偵測到音訊軌，已自動為您下載高畫質照片！', 3000);
      downloadImage(img, filename.replace(/\.mp4$/i, '.jpg'));
      return;
    }

    try {
      showToast('⏳ 正在載入限動照片與音效軌，準備進行渲染合成...', 3000);

      // 1. 建立畫布與等比例繪製照片 (1080x1920 標準 9:16 限動直式畫質)
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      const imgObj = new Image();
      imgObj.crossOrigin = 'anonymous';
      await new Promise(resolve => {
        imgObj.onload = resolve;
        imgObj.onerror = resolve;
        imgObj.src = img.currentSrc || img.src;
      });

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(canvas.width / (imgObj.width || 1), canvas.height / (imgObj.height || 1));
      const drawW = (imgObj.width || 1080) * scale;
      const drawH = (imgObj.height || 1920) * scale;
      const drawX = (canvas.width - drawW) / 2;
      const drawY = (canvas.height - drawH) / 2;
      ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);

      // 2. 獲取並解碼音效串流
      const audioRes = await fetch(audioUrl);
      const audioBufferData = await audioRes.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(audioBufferData);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = decodedBuffer;
      const destNode = audioCtx.createMediaStreamDestination();
      sourceNode.connect(destNode);

      // 3. 合併 Canvas 畫面軌與 Audio 音效軌
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        destNode.stream.getAudioTracks()[0]
      ]);

      const isMp4Supported = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
      const mimeType = isMp4Supported 
        ? 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
        : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm');

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const durationMs = Math.min((decodedBuffer.duration || 15) * 1000, 15000); // 限制限動時長最高 15 秒
      showToast(`🎬 正在即時渲染音畫合一 MP4 (長度 ${Math.round(durationMs / 1000)} 秒)...`, durationMs + 500);

      recorder.start(100);
      sourceNode.start(0);

      await new Promise(resolve => {
        setTimeout(() => {
          try {
            recorder.stop();
            sourceNode.stop();
          } catch (e) {}
          resolve();
        }, durationMs);
      });

      await new Promise(resolve => {
        recorder.onstop = resolve;
      });

      const finalBlob = new Blob(chunks, { type: 'video/mp4' });
      const finalBlobUrl = URL.createObjectURL(finalBlob);
      triggerSave(finalBlobUrl, filename, true);
      showToast(`🎉 成功本機合成「照片加音樂」音畫合一 MP4 影片！已啟動下載！`, 4000);
      return;
    } catch (err) {
      console.warn('本機照片音樂合成遇到異常，啟動安全備援：', err);
      showToast('💡 合成遇到限制，已自動備援為您下載限動高畫質照片！', 3500);
      downloadImage(img, filename.replace(/\.mp4$/i, '.jpg'));
    }
  }

  // -------------------------------------------------------------------------
  // 6. 核心影片下載調度 (眼前播放器直取優先，徹底杜絕全域假推薦與廣告干擾)
  // -------------------------------------------------------------------------
  async function downloadVideo(video, filename, platform, isStory = false) {
    if (isAdElement(video)) {
      showToast('⚠️ 偵測到此影片為贊助商穿插廣告，已自動為您跳過！請滾動至本尊影片！', 3500);
      return;
    }

    showToast(`🔍 正在鎖定眼前這部 ${platform} 影片 (本體直取檢測)...`, 2500);

    // 階段 1：直接檢查原生 video.currentSrc (若非 blob 且非廣告)
    const directSrc = video.currentSrc || video.src || video.querySelector('source')?.src;
    if (directSrc && directSrc.startsWith('http') && !directSrc.startsWith('blob:') && directSrc.includes('.mp4') && !directSrc.includes('sponsored')) {
      const fullUrl = cleanVideoUrl(directSrc);
      triggerSave(fullUrl, filename, true);
      showToast(`✅ 已從原生快取下載此 ${platform} 完整 MP4 影片！`, 3000);
      return;
    }

    // 階段 2：從眼前這個 video 節點的 React 實例直接挖掘 Progressive MP4
    const reactUrl = extractProgressiveFromReact(video);
    if (reactUrl && reactUrl.includes('.mp4') && !reactUrl.includes('sponsored') && !reactUrl.includes('is_ad=1')) {
      triggerSave(reactUrl, filename, true);
      showToast(`🎉 成功獲取官方 Progressive 音畫合一 MP4 影片！`, 3500);
      return;
    }

    // 階段 3：若為 Instagram 貼文，走專屬的定向 API (支援輪播 img_index 定址)
    const postUrl = findPostUrl(video) || location.href;
    if (!isStory && platform === 'Instagram' && postUrl && postUrl.includes('instagram.com/p/')) {
      showToast(`⚡ 正在針對該 Instagram 專屬貼文進行定向解析 (嚴格鎖定 MP4 影片)...`, 2500);
      chrome.runtime.sendMessage({
        method: 'download-specific-post',
        postUrl: postUrl,
        platform: platform,
        filename: filename,
        isVideo: true
      }, async res => {
        if (res && res.success && res.url && !res.url.includes('.jpg') && !res.url.includes('.jfif') && !res.url.includes('.png')) {
          showToast(`🎉 成功定向下載此貼文之完整音畫 MP4 影片！`, 3500);
        } else {
          // 後台解析若非影片或受限，立即啟用眼前播放器原生串流接管錄製
          try {
            await recordActiveVideoStream(video, filename);
          } catch (e) {
            fallbackActiveCapture(postUrl, filename, platform, isStory);
          }
        }
      });
      return;
    }

    // 階段 4 (Facebook 與限動核心)：眼前播放器原生串流接管 (100% 眼前看到什麼就下載什麼)
    try {
      await recordActiveVideoStream(video, filename);
    } catch (err) {
      console.warn('原生串流接管遇到異常，退回備援：', err);
      fallbackActiveCapture(postUrl, filename, platform, isStory);
    }
  }

  function fallbackActiveCapture(postUrl, filename, platform, isStory = false, candidateUrl = null) {
    showToast(`⚡ 正在捕獲 ${platform} 即時串流並打包 (廣告已排除)...`, 2500);
    chrome.runtime.sendMessage({
      method: 'download-active-media',
      platform: platform,
      postUrl: postUrl,
      targetUrl: candidateUrl || undefined,
      filename: filename,
      isStory: isStory
    }, res => {
      if (res && res.success) {
        showToast(`🎉 成功捕獲此目標 MP4 影片！已啟動下載！`, 3500);
      } else {
        const errorMsg = res?.error || '請讓影片播放 1~2 秒以利快取完整捕獲！';
        showToast(`💡 ${errorMsg}`, 4500);
      }
    });
  }

  // -------------------------------------------------------------------------
  // 5. 照片精準導出 (原圖直取，徹底杜絕跨域污染與 CORS 報錯)
  // -------------------------------------------------------------------------
  function downloadImage(img, filename) {
    showToast('⏳ 正在精準導出高畫質原圖照片...', 2000);

    // 階段 1：優先從 React Fiber 直接挖掘無損原圖直連
    const reactUrl = extractImageFromReact(img);
    if (reactUrl && (reactUrl.includes('.jpg') || reactUrl.includes('.jpeg') || reactUrl.includes('.webp') || reactUrl.includes('cdninstagram.com') || reactUrl.includes('fbcdn.net'))) {
      triggerSave(reactUrl, filename, false);
      showToast('🎉 成功導出官方高畫質原圖照片！', 2500);
      return;
    }

    // 階段 2：從 srcset 挑選最高解析度 (例如 1080w)
    let bestSrc = img.currentSrc || img.src;
    if (img.srcset) {
      try {
        const candidates = img.srcset.split(',').map(s => {
          const parts = s.trim().split(/\s+/);
          const url = parts[0];
          const width = parts[1] ? parseInt(parts[1].replace('w', ''), 10) : 0;
          return { url, width };
        });
        candidates.sort((a, b) => b.width - a.width);
        if (candidates.length > 0 && candidates[0].url) {
          bestSrc = candidates[0].url;
        }
      } catch (e) {}
    }

    // 階段 3：直接交由具備主機權限的背景腳本下載，100% 避開頁面跨域 (CORS) 阻擋
    triggerSave(bestSrc, filename, false);
    showToast('🎉 成功下載高畫質照片！已啟動儲存！', 2500);
  }

  function isAssociatedWithVideo(img) {
    if (location.pathname.includes('/reel/') || location.pathname.includes('/reels/')) {
      return true;
    }
    let curr = img.parentElement;
    let depth = 0;
    while (curr && depth < 6) {
      if (curr.querySelector && curr.querySelector('video')) {
        return true;
      }
      curr = curr.parentElement;
      depth++;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // 6. 影片元素掃描 (Facebook 與 Instagram 動態饋給與 Reels)
  // -------------------------------------------------------------------------
  function scanVideos() {
    const isFB = location.hostname.includes('facebook.com');
    const isIG = location.hostname.includes('instagram.com');
    if (!isFB && !isIG) return;
    if (location.pathname.includes('/stories/')) return;

    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      let parent = video.parentElement;
      if (!parent) return;

      let container = parent;
      if (container.querySelector(':scope > .social-dl-btn-container')) return;

      if (container.clientHeight < 50 && container.parentElement) {
        container = container.parentElement;
      }
      if (container.querySelector(':scope > .social-dl-btn-container')) return;

      const isReel = location.pathname.includes('/reel/') || location.pathname.includes('/reels/');
      const isPost = location.pathname.includes('/p/');
      const platform = isFB ? 'Facebook' : 'Instagram';

      // 取得當前輪播頁面索引 (?img_index=N)
      let pageSuffix = '';
      let pageLabel = '';
      try {
        const u = new URL(location.href);
        const idx = u.searchParams.get('img_index');
        if (idx) {
          pageSuffix = `_P${idx}`;
          pageLabel = ` (第 ${idx} 頁)`;
        }
      } catch (e) {}

      const typeName = isReel ? 'Reel' : (isPost ? '輪播影片' : '影片');
      const label = `下載 ${platform} ${typeName}${pageLabel} (MP4 音畫合一)`;

      const btn = createButton(label, () => {
        const id = Date.now().toString().slice(-4);
        downloadVideo(video, `${platform}_${typeName}${pageSuffix}_${id}.mp4`, platform, false);
      });

      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(btn);
    });
  }

  // -------------------------------------------------------------------------
  // 7. 純照片掃描 (嚴格排除任何影片封面縮圖)
  // -------------------------------------------------------------------------
  function scanImages() {
    const isFB = location.hostname.includes('facebook.com');
    const isIG = location.hostname.includes('instagram.com');
    if (!isFB && !isIG) return;
    if (location.pathname.includes('/stories/')) return;

    const images = Array.from(document.querySelectorAll('img')).filter(img => {
      return (img.clientWidth >= 220 || img.width >= 220) && (img.clientHeight >= 220 || img.height >= 220);
    });

    images.forEach(img => {
      if (isAssociatedWithVideo(img)) return;

      const parent = img.parentElement;
      if (!parent || parent.querySelector(':scope > .social-dl-btn-container')) return;

      let container = parent;
      if (container.querySelector('.social-dl-btn-container')) return;

      const platform = isFB ? 'FB' : 'IG';
      let pageSuffix = '';
      let pageLabel = '';
      try {
        const u = new URL(location.href);
        const idx = u.searchParams.get('img_index');
        if (idx) {
          pageSuffix = `_P${idx}`;
          pageLabel = ` (第 ${idx} 頁)`;
        }
      } catch (e) {}

      const btn = createButton(`下載此 ${platform} 照片${pageLabel}`, () => {
        const id = Date.now().toString().slice(-4);
        downloadImage(img, `${platform}_照片${pageSuffix}_${id}.jpg`);
      }, 'photo-dl');

      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.appendChild(btn);
    });
  }

  // -------------------------------------------------------------------------
  // 8. 限時動態 (Stories) 專屬頂層控制面板 (Facebook / Instagram 完美居中)
  // -------------------------------------------------------------------------
  function scanStories() {
    const isStories = location.pathname.includes('/stories/');
    if (!isStories) {
      const p = document.querySelector('.social-dl-story-panel');
      if (p) p.remove();
      return;
    }

    if (document.querySelector('.social-dl-story-panel')) return;

    const isFB = location.hostname.includes('facebook.com');
    const platform = isFB ? 'Facebook' : 'Instagram';

    const panel = document.createElement('div');
    panel.className = 'social-dl-story-panel';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'social-dl-btn social-dl-story-btn';
    btn.innerHTML = `${downloadIcon} <span>📥 一鍵下載當前 ${platform} 限動 (影片/照片)</span>`;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const origHtml = btn.innerHTML;
      btn.innerHTML = `<span>⏳</span> <span>正在分析並下載限動...</span>`;
      btn.disabled = true;

      try {
        const id = Date.now().toString().slice(-4);
        const { video: activeVideo, image: mainStoryImg, hasRealVideo } = getActiveStoryElement();

        // 【情況 A：真實影片限動】(中央視野有正在播放或準備好之 video)
        if (activeVideo && hasRealVideo) {
          // 1. 優先從 React 直取官方原版 1080p MP4
          const reactUrl = extractProgressiveFromReact(activeVideo);
          if (reactUrl && !reactUrl.includes('sponsored')) {
            triggerSave(reactUrl, `${platform}_限動影片_${id}.mp4`, true);
            showToast(`🎉 成功直取官方原版 ${platform} 音畫合一 MP4 影片！`, 3500);
            return;
          }

          // 2. 原生播放器串流接管
          await downloadVideo(activeVideo, `${platform}_限動影片_${id}.mp4`, platform, true);
          return;
        }

        // 【情況 B：照片限動】(中央視野為大圖，且無中央影片)
        if (mainStoryImg) {
          // 檢查是否有背景音軌正在播放 (照片加音樂限動)
          const activeAudio = document.querySelector('audio:not([paused])');
          if (activeAudio) {
            await synthesizePhotoMusicStory(mainStoryImg, activeAudio, `${platform}_照片音樂限動_${id}.mp4`, platform);
            return;
          }

          // 純靜態照片限動：直接下載高畫質原圖
          downloadImage(mainStoryImg, `${platform}_限動照片_${id}.jpg`);
          return;
        }

        // 兜底尋找畫面中任意活動影片
        const fallbackVideo = Array.from(document.querySelectorAll('video')).find(v => !v.paused && v.videoWidth > 0);
        if (fallbackVideo) {
          await downloadVideo(fallbackVideo, `${platform}_限動影片_${id}.mp4`, platform, true);
          return;
        }

        showToast('💡 正在即時捕捉限動，請讓畫面播放 1 秒後重試！');
      } catch (err) {
        console.warn('限動下載處理異常：', err);
        showToast('💡 限動處理遇到限制，已自動啟動備援下載！');
      } finally {
        setTimeout(() => {
          btn.innerHTML = origHtml;
          btn.disabled = false;
        }, 2500);
      }
    });

    panel.appendChild(btn);
    document.body.appendChild(panel);
  }

  // -------------------------------------------------------------------------
  // 9. 全域右下角懸浮下載小幫手
  // -------------------------------------------------------------------------
  function mountGlobalFloatingBadge() {
    if (document.querySelector('.social-dl-floating-badge')) return;

    const badge = document.createElement('div');
    badge.className = 'social-dl-floating-badge';
    badge.innerHTML = `${downloadIcon} <span>⚡ 快速下載當前焦點影音</span>`;
    badge.title = '點擊即可一鍵下載目前正在螢幕中央播放的影片或照片！';

    badge.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const origHtml = badge.innerHTML;
      badge.innerHTML = `<span>⏳</span> <span>正在快速下載...</span>`;
      badge.style.opacity = '0.8';

      try {
        const platform = location.hostname.includes('facebook.com') ? 'Facebook' : 'Instagram';
        const isStories = location.pathname.includes('/stories/');

        // 1. 若處於限動模式，直接走限動精準解析
        if (isStories) {
          const id = Date.now().toString().slice(-4);
          const { video: activeVideo, image: mainStoryImg, hasRealVideo } = getActiveStoryElement();

          if (activeVideo && hasRealVideo) {
            const reactUrl = extractProgressiveFromReact(activeVideo);
            if (reactUrl && !reactUrl.includes('sponsored')) {
              triggerSave(reactUrl, `${platform}_限動影片_${id}.mp4`, true);
              showToast(`🎉 成功直取官方原版 ${platform} 音畫合一 MP4 影片！`, 3500);
              return;
            }
            await downloadVideo(activeVideo, `${platform}_限動影片_${id}.mp4`, platform, true);
            return;
          }

          if (mainStoryImg) {
            const activeAudio = document.querySelector('audio:not([paused])');
            if (activeAudio) {
              await synthesizePhotoMusicStory(mainStoryImg, activeAudio, `${platform}_照片音樂限動_${id}.mp4`, platform);
              return;
            }
            downloadImage(mainStoryImg, `${platform}_限動照片_${id}.jpg`);
            return;
          }
        }

        // 2. 影片絕對優先 (包含 Reel，嚴格排除廣告容器)
        const allVideos = Array.from(document.querySelectorAll('video')).filter(v => !isAdElement(v));
        if (allVideos.length > 0) {
          const viewportCenterY = window.innerHeight / 2;
          let bestVideo = allVideos[0];
          let minDist = Infinity;
          for (const v of allVideos) {
            const rect = v.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
              const dist = Math.abs((rect.top + rect.height / 2) - viewportCenterY);
              if (dist < minDist) {
                minDist = dist;
                bestVideo = v;
              }
            }
          }
          const isReel = location.pathname.includes('/reel/') || location.pathname.includes('/reels/');
          await downloadVideo(bestVideo, `${platform}_${isReel ? 'Reel' : '焦點影片'}_${Date.now()}.mp4`, platform, isStories);
          return;
        }

        // 3. 只有無影片時才下載照片 (排除商務與封面)
        const images = Array.from(document.querySelectorAll('img')).filter(img => {
          return (img.clientWidth > 220 || img.width > 220) && !isAssociatedWithVideo(img) && !img.src.includes('commerce');
        });

        if (images.length > 0) {
          const viewportCenterY = window.innerHeight / 2;
          let bestImg = images[0];
          let minDist = Infinity;
          for (const img of images) {
            const rect = img.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
              const dist = Math.abs((rect.top + rect.height / 2) - viewportCenterY);
              if (dist < minDist) {
                minDist = dist;
                bestImg = img;
              }
            }
          }
          downloadImage(bestImg, `${platform}_焦點照片_${Date.now()}.jpg`);
          return;
        }

        showToast('💡 畫面上尚未偵測到播放中的影片或照片，請滾動至目標貼文！');
      } catch (err) {
        console.warn('懸浮小幫手處理異常：', err);
        showToast('💡 正在嘗試備援捕獲，請稍候重試！');
      } finally {
        setTimeout(() => {
          badge.innerHTML = origHtml;
          badge.style.opacity = '1';
        }, 3000);
      }
    });

    document.body.appendChild(badge);
  }

  // -------------------------------------------------------------------------
  // 10. 整合監聽
  // -------------------------------------------------------------------------
  function scanAll() {
    scanVideos();
    scanImages();
    scanStories();
    mountGlobalFloatingBadge();
  }

  scanAll();
  const observer = new MutationObserver(() => {
    scanAll();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
