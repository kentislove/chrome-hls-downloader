/**
 * 社群媒體登入狀態偵測與定向貼文解析模組 (Session & Direct Post Extractor)
 * 專為 Section 容器定向解析打造：只針對指定 Post ID / URL 發起請求，精準獲取官方音畫合一 Progressive MP4
 */

const social = {
  /**
   * 檢查各社群平台登入 Cookie
   */
  async checkSessions() {
    const results = {
      facebook: false,
      instagram: false
    };

    try {
      const fbCookie = await chrome.cookies.get({ url: 'https://www.facebook.com', name: 'c_user' });
      results.facebook = Boolean(fbCookie && fbCookie.value);
    } catch (e) {
      console.warn('檢查 Facebook 登入狀態失敗：', e);
    }

    try {
      const igCookie = await chrome.cookies.get({ url: 'https://www.instagram.com', name: 'sessionid' });
      results.instagram = Boolean(igCookie && igCookie.value);
    } catch (e) {
      console.warn('檢查 Instagram 登入狀態失敗：', e);
    }

    return results;
  },

  cleanUrl(url) {
    if (!url) return '';
    let u = url
      .replace(/\\u0026/g, '&')
      .replace(/\\u002F/g, '/')
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&');

    try {
      const parsed = new URL(u);
      parsed.searchParams.delete('bytestart');
      parsed.searchParams.delete('byteend');
      return parsed.href;
    } catch (e) {
      return u.replace(/([?&])bytestart=\d+(&?)/, '$1').replace(/([?&])byteend=\d+(&?)/, '$1');
    }
  },

  /**
   * 解析 Facebook 單一特定影片或 Reels (定向解析，杜絕干擾)
   */
  async parseFacebook(url) {
    if (!url || url === 'https://www.facebook.com/' || url === 'https://www.facebook.com') {
      throw new Error('請傳入具體的 Facebook 影片、Reels 或貼文專屬連結！');
    }

    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    });
    const html = await res.text();

    // 優先尋找音畫合一的 Progressive 高畫質 MP4
    const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/) ||
                    html.match(/"playable_url_quality_hd":"([^"]+)"/) ||
                    html.match(/"hd_src":"([^"]+)"/) ||
                    html.match(/"hd_src_no_ratelimit":"([^"]+)"/) ||
                    html.match(/"progressive_download_url":"([^"]+)"/);
    const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/) ||
                    html.match(/"playable_url":"([^"]+)"/) ||
                    html.match(/"sd_src_no_ratelimit":"([^"]+)"/) ||
                    html.match(/"sd_src":"([^"]+)"/);
    const ogVideoMatch = html.match(/<meta\s+property="og:video(?::url|:secure_url)?"\s+content="([^"]+)"/i);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

    let videoUrl = '';
    let quality = '標準畫質';
    if (hdMatch && hdMatch[1]) {
      videoUrl = this.cleanUrl(hdMatch[1]);
      quality = '1080P/720P 高畫質 (音畫合一)';
    } else if (sdMatch && sdMatch[1]) {
      videoUrl = this.cleanUrl(sdMatch[1]);
      quality = '標清 (音畫合一)';
    } else if (ogVideoMatch && ogVideoMatch[1]) {
      videoUrl = this.cleanUrl(ogVideoMatch[1]);
    } else {
      // 深度尋找 representations 中的 Progressive MP4
      const repMatch = html.match(/"mime_type":"video\/mp4","base_url":"([^"]+)"/i);
      if (repMatch && repMatch[1]) {
        videoUrl = this.cleanUrl(repMatch[1]);
        quality = '高畫質 (音畫合一)';
      }
    }

    if (!videoUrl) {
      // 途徑 2：行動版端點備援 (極度純淨，徹底杜絕桌面版廣告穿插)
      try {
        const mUrl = url.replace('www.facebook.com', 'm.facebook.com');
        const mRes = await fetch(mUrl, {
          credentials: 'include',
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        const mHtml = await mRes.text();
        const mMatch = mHtml.match(/href="(\/video_redirect\/[^"]+)"/) ||
                      mHtml.match(/"browser_native_hd_url":"([^"]+)"/) ||
                      mHtml.match(/"playable_url_quality_hd":"([^"]+)"/) ||
                      mHtml.match(/"playable_url":"([^"]+)"/) ||
                      mHtml.match(/<video[^>]+src="([^"]+)"/i);
        if (mMatch && mMatch[1]) {
          let raw = mMatch[1];
          if (raw.startsWith('/video_redirect/')) {
            const redirectUrl = new URL('https://m.facebook.com' + raw);
            raw = decodeURIComponent(redirectUrl.searchParams.get('src') || raw);
          }
          videoUrl = this.cleanUrl(raw);
          quality = '行動端原畫 (音畫合一)';
        }
      } catch (e) {}
    }

    if (!videoUrl) {
      throw new Error('未能在該 Facebook 貼文中提取到 Progressive MP4 串流。');
    }

    const title = titleMatch ? titleMatch[1].replace(/ \| Facebook/g, '').trim() : 'Facebook_影片';
    return {
      url: videoUrl,
      title: `${title} [${quality}]`,
      ext: 'mp4',
      type: 'video/mp4',
      platform: 'Facebook'
    };
  },

  /**
   * 解析 Instagram 單一貼文、Reels、照片或限時動態 (定向 API 優先)
   * 具備 Carousel (輪播/Sidecar) 子項目索引解析功能，支援 ?img_index=N 參數
   */
  async parseInstagram(url) {
    if (!url) throw new Error('請傳入有效的 Instagram 連結！');

    // 解析 img_index 參數 (若有的話，img_index=1 代表第 1 張，索引為 0)
    let targetIndex = 0;
    try {
      const parsedUrl = new URL(url);
      const idxParam = parsedUrl.searchParams.get('img_index');
      if (idxParam) {
        targetIndex = Math.max(0, parseInt(idxParam, 10) - 1);
      }
    } catch (e) {}

    // 嘗試從 URL 提取 shortcode (如 /p/C123/ 或 /reel/D456/)
    const codeMatch = url.match(/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    const shortcode = codeMatch ? codeMatch[1] : null;

    // 途徑 1：優先請求 Instagram 官方輕量 JSON 端點 (__a=1&__d=dis)
    const isReelUrl = url.includes('/reel/') || url.includes('/reels/');
    if (shortcode) {
      try {
        const apiUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
        const apiRes = await fetch(apiUrl, {
          credentials: 'include',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*'
          }
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          const rootItem = data.graphql?.shortcode_media || data.items?.[0] || data;
          if (rootItem) {
            // 【核心修復】：若貼文為輪播貼文 (Carousel / Sidecar)，提取特定 img_index 對應之子媒體
            let item = rootItem;
            const sidecarEdges = rootItem.edge_sidecar_to_children?.edges;
            const carouselMedia = rootItem.carousel_media;

            if (Array.isArray(sidecarEdges) && sidecarEdges.length > 0) {
              const selectedEdge = sidecarEdges[targetIndex] || sidecarEdges[0];
              item = selectedEdge.node || selectedEdge;
            } else if (Array.isArray(carouselMedia) && carouselMedia.length > 0) {
              item = carouselMedia[targetIndex] || carouselMedia[0];
            }

            // 判斷該選取目標是否為影片 (包含 media_type === 2 或 video_versions 陣列或 Reel 網址)
            const videoVersions = item.video_versions || item.video_versions_list || [];
            const isVideo = isReelUrl || item.is_video || item.media_type === 2 || (videoVersions.length > 0) || Boolean(item.video_url);

            if (isVideo) {
              const rawVideoUrl = item.video_url || (videoVersions.length > 0 ? videoVersions[0].url : null);
              if (rawVideoUrl) {
                const vUrl = this.cleanUrl(rawVideoUrl);
                return {
                  url: vUrl,
                  title: `Instagram_${isReelUrl ? 'Reel' : '影片'}_${shortcode}_P${targetIndex + 1} [音畫合一]`,
                  ext: 'mp4',
                  type: 'video/mp4',
                  platform: 'Instagram'
                };
              }
            }
            
            // 只有純照片貼文 (非 Reel 且該子項目無影片軌) 才提取照片
            if (!isReelUrl && (item.display_url || item.image_versions2)) {
              const imgUrl = this.cleanUrl(item.display_url || item.image_versions2?.candidates?.[0]?.url);
              if (imgUrl) {
                return {
                  url: imgUrl,
                  title: `Instagram_照片_${shortcode}_P${targetIndex + 1} [原圖]`,
                  ext: 'jpg',
                  type: 'image/jpeg',
                  platform: 'Instagram'
                };
              }
            }
          }
        }
      } catch (e) {
        // API 限制時退回途徑 2
      }
    }

    // 途徑 2：標準頁面 HTML 深度提取
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    const html = await res.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/ • Instagram photos and videos/g, '').replace(/ \| Instagram/g, '').trim() : 'Instagram_媒體';

    // 途徑 2-A: 深度挖掘 HTML 內的內嵌 JSON 數據 (支援 Carousel 輪播子項目精準定位)
    try {
      const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
      let sMatch;
      while ((sMatch = scriptRegex.exec(html)) !== null) {
        const content = sMatch[1];
        if (content.includes('carousel_media') || content.includes('edge_sidecar_to_children') || content.includes('xdt_api__v1__media')) {
          const jsonObjs = content.match(/\{"[\s\S]*"\}/g) || [];
          for (const rawJson of jsonObjs) {
            try {
              const data = JSON.parse(rawJson);
              const findCarousel = (obj, d = 0) => {
                if (!obj || d > 8) return null;
                if (Array.isArray(obj.carousel_media)) return obj.carousel_media;
                if (obj.edge_sidecar_to_children?.edges) return obj.edge_sidecar_to_children.edges.map(e => e.node || e);
                for (const k of Object.keys(obj)) {
                  if (typeof obj[k] === 'object' && obj[k] !== null) {
                    const found = findCarousel(obj[k], d + 1);
                    if (found) return found;
                  }
                }
                return null;
              };
              const items = findCarousel(data);
              if (Array.isArray(items) && items.length > 0) {
                const child = items[targetIndex] || items[0];
                const vVersions = child.video_versions || child.videoVersions || [];
                const isChildVideo = child.is_video || child.media_type === 2 || vVersions.length > 0 || Boolean(child.video_url);
                if (isChildVideo) {
                  const rawVUrl = child.video_url || (vVersions.length > 0 ? vVersions[0].url : null);
                  if (rawVUrl) {
                    return {
                      url: this.cleanUrl(rawVUrl),
                      title: `${title}_P${targetIndex + 1} [音畫合一]`,
                      ext: 'mp4',
                      type: 'video/mp4',
                      platform: 'Instagram'
                    };
                  }
                } else if (child.display_url || child.image_versions2) {
                  const rawIUrl = child.display_url || child.image_versions2?.candidates?.[0]?.url;
                  if (rawIUrl) {
                    return {
                      url: this.cleanUrl(rawIUrl),
                      title: `${title}_P${targetIndex + 1} [高畫質照片]`,
                      ext: 'jpg',
                      type: 'image/jpeg',
                      platform: 'Instagram'
                    };
                  }
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    // 途徑 2-B: 深度 Regex 比對 (提取 video_versions 陣列與 video_url)
    const videoVersionMatches = Array.from(html.matchAll(/"video_versions"\s*:\s*\[\s*\{[^}]*?"url"\s*:\s*"([^"]+)"/g)).map(m => m[1]);
    const videoMatches = Array.from(html.matchAll(/"video_url"\s*:\s*"([^"]+)"/g)).map(m => m[1]);
    const allVideoMatches = [...videoVersionMatches, ...videoMatches];

    if (allVideoMatches.length > 0) {
      const selectedVideo = allVideoMatches[targetIndex] || allVideoMatches[0];
      return {
        url: this.cleanUrl(selectedVideo),
        title: `${title}_P${targetIndex + 1} [音畫合一]`,
        ext: 'mp4',
        type: 'video/mp4',
        platform: 'Instagram'
      };
    }

    const ogVideoMatch = html.match(/<meta\s+property="og:video(?::url|:secure_url)?"\s+content="([^"]+)"/i);
    if (ogVideoMatch && ogVideoMatch[1]) {
      return {
        url: this.cleanUrl(ogVideoMatch[1]),
        title: `${title} [音畫合一]`,
        ext: 'mp4',
        type: 'video/mp4',
        platform: 'Instagram'
      };
    }

    // 尋找高畫質原圖
    const imgMatches = Array.from(html.matchAll(/"display_url":"([^"]+)"/g)).map(m => m[1]);
    if (imgMatches.length > 0) {
      const selectedImg = imgMatches[targetIndex] || imgMatches[0];
      return {
        url: this.cleanUrl(selectedImg),
        title: `${title}_P${targetIndex + 1} [高畫質照片]`,
        ext: 'jpg',
        type: 'image/jpeg',
        platform: 'Instagram'
      };
    }

    const ogImgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogImgMatch && ogImgMatch[1]) {
      return {
        url: this.cleanUrl(ogImgMatch[1]),
        title: `${title} [高畫質照片]`,
        ext: 'jpg',
        type: 'image/jpeg',
        platform: 'Instagram'
      };
    }

    if (url.includes('/stories/')) {
      throw new Error('限時動態具備高隱私保護，請直接在該限動瀏覽頁面點擊頂部中央「📥 一鍵下載當前 Instagram 限動」按鈕即可直接下載！');
    }

    throw new Error('未能在該貼文中解析出媒體直連，請確認貼文權限！');
  },

  /**
   * 統一定向解析入口
   */
  async parseUrl(url) {
    if (!url) throw new Error('網址不可為空');

    if (url.includes('facebook.com')) {
      return this.parseFacebook(url);
    } else if (url.includes('instagram.com')) {
      return this.parseInstagram(url);
    } else {
      throw new Error('目前僅支援 Facebook 與 Instagram 平台定向解析！');
    }
  }
};
