class VideoPlayer {
  constructor() {
    this.video = document.getElementById('video-element');
    this.container = document.getElementById('video-player');
    this.controls = document.getElementById('controls');
    this.loadingSpinner = document.getElementById('loading-spinner');
    this.subtitleOverlay = document.getElementById('subtitle-overlay');
    this.ratingOverlay = document.getElementById('rating-overlay');
    this.settingsPanel = document.getElementById('settings-panel');
    this.episodesPanel = document.getElementById('episodes-panel');
    this.pauseOverlay = document.getElementById('pause-overlay');

    // Controls
    this.playBtn = document.getElementById('play-btn');
    this.volumeBtn = document.getElementById('volume-btn');
    this.volumeSlider = document.getElementById('volume-slider');
    this.volumeSliderFilled = document.getElementById('volume-slider-filled');
    this.progressBar = document.getElementById('progress-bar');
    this.progressFilled = document.getElementById('progress-filled');
    this.progressHandle = document.getElementById('progress-handle');
    this.progressTimestamp = document.getElementById('progress-timestamp');
    this.progressThumbnail = document.getElementById('progress-thumbnail');
    this.progressThumbnailImg = document.getElementById('progress-thumbnail-img');
    this.timeDisplay = document.getElementById('time-display');
    this.durationDisplay = document.getElementById('duration-display');
    this.skipBackwardBtn = document.getElementById('skip-backward-btn'); // Fixed ID
    this.skipForwardBtn = document.getElementById('skip-forward-btn');   // Fixed ID
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.backBtn = document.getElementById('back-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsClose = document.getElementById('settings-close');
    this.episodesBtn = document.getElementById('episodes-btn');
    this.episodesClose = document.getElementById('episodes-close');
    this.episodesListContainer = document.getElementById('episodes-list-container');

    // New Controls
    this.skipMontageBtn = document.getElementById('skip-montage-btn');
    this.skipMontageProgress = document.getElementById('skip-montage-progress');
    this.nextEpisodeBtn = document.getElementById('next-episode-btn');
    this.nextEpisodeProgress = document.getElementById('next-episode-progress');

    // X-Ray
    this.xrayOverlay = document.getElementById('xray-overlay-container');
    this.xrayAllBtn = document.getElementById('xray-all-btn');
    this.xrayPreview = document.getElementById('xray-preview');
    this.xrayPanel = document.getElementById('xray-panel');
    this.xrayClose = document.getElementById('xray-close');
    this.xrayContent = document.getElementById('xray-content');
    this.xrayTabs = document.querySelectorAll('.video-player__xray-panel-tab');

    // State
    this.isXRayOpen = false;
    this.currentXRayTab = 'all';
    this.xrayData = {
      cast: [],
      trivia: []
    };
    this.thumbnailCache = {}; // Cache for generated thumbnails
    this.thumbnailTimeout = null;
    this.thumbnailVideo = null; // Hidden video element for thumbnail generation

    // Initialize
    this.init();
    this.initXRay();
  }

  loadXRayData() {
    // Data is now loaded via <script src="xray.js">
    if (window.xrayData) {
      this.xrayData = window.xrayData;
      console.log('X-Ray data synced from xray.js:', this.xrayData);
    } else {
      console.warn('xray.js not loaded or window.xrayData missing. Using empty data.');
      this.xrayData = { cast: [], trivia: [], music: [] };
    }
    this.updateXRay();
  }

  initXRay() {
    // Load external data
    this.loadXRayData();

    // Toggle X-Ray panel when clicking anywhere on the overlay header/container
    if (this.xrayOverlay) {
      // Find the chevron specifically for collapse/expand logic
      const chevron = this.xrayOverlay.querySelector('.video-player__xray-chevron');
      if (chevron) {
        chevron.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent opening the side panel
          this.xrayOverlay.classList.toggle('collapsed');
        });
      }

      this.xrayOverlay.addEventListener('click', (e) => {
        // Prevent click from bubbling to video (which toggles play/pause)
        e.stopPropagation();

        // Only open side panel if we are NOT collapsed (optional UX choice, but safest)
        // For now, let's allow it to open even if collapsed, or maybe check:
        // if (this.xrayOverlay.classList.contains('collapsed')) return;

        this.toggleXRay(true);
      });
    }

    if (this.xrayClose) {
      // Use stopPropagation to prevent immediate re-opening if it bubbles
      this.xrayClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleXRay(false);
      });
    }

    if (this.xrayTabs) {
      this.xrayTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          this.currentXRayTab = e.target.dataset.tab;
          this.updateXRayTabs();
          this.renderXRayContent();
        });
      });
    }

    // Update X-Ray on timeupdate
    this.video.addEventListener('timeupdate', () => this.updateXRay());

    // Initial update to show content immediately
    this.updateXRay();
  }

  toggleXRay(forceState) {
    this.isXRayOpen = forceState !== undefined ? forceState : !this.isXRayOpen;

    // Toggle UI
    if (this.isXRayOpen) {
      this.xrayPanel.classList.add('show');
      // this.video.pause(); // Auto-pause removed per user request
      this.renderXRayContent();
    } else {
      this.xrayPanel.classList.remove('show');
    }
  }

  updateXRayTabs() {
    this.xrayTabs.forEach(tab => {
      if (tab.dataset.tab === this.currentXRayTab) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  updateXRay() {
    const currentTime = this.video.currentTime || 0;

    // Check for active content
    const activeCastItems = this.xrayData.cast.filter(item => currentTime >= item.start && currentTime <= item.end);
    const activeTriviaItems = this.xrayData.trivia.filter(item => currentTime >= item.start && currentTime <= item.end);
    const activeMusicItems = this.xrayData.music ? this.xrayData.music.filter(item => currentTime >= item.start && currentTime <= item.end) : [];

    // Toggle overlay visibility based on whether ANY content is active
    if (this.xrayOverlay) {
      const hasActiveContent = activeCastItems.length > 0 || activeTriviaItems.length > 0 || activeMusicItems.length > 0;
      if (hasActiveContent) {
        this.xrayOverlay.classList.add('show');
      } else {
        this.xrayOverlay.classList.remove('show');
      }
    }

    // Generate a unique key for the current content state
    let contentKey = '';
    activeMusicItems.forEach(item => contentKey += `music:${item.title}|`);
    activeTriviaItems.forEach(item => contentKey += `trivia:${item.text}|`);
    activeCastItems.forEach(item => contentKey += `cast:${item.name}|`);

    // If content hasn't changed, do nothing The check below prevents flicker
    if (this.lastXRayKey === contentKey) {
      return;
    }

    this.lastXRayKey = contentKey;

    // Update Overlay Preview
    if (this.xrayPreview) {
      let html = '';

      // Render all active music
      activeMusicItems.forEach(item => {
        html += `
          <div class="xray-preview-content xray-music-item">
             <div class="xray-music-visualizer">
               <div class="visualizer-bar"></div>
               <div class="visualizer-bar"></div>
               <div class="visualizer-bar"></div>
               <div class="visualizer-bar"></div>
             </div>
             <div class="xray-music-info">
               <div class="xray-music-title">${item.title}</div>
               <div class="xray-music-artist">${item.artist}</div>
             </div>
          </div>
        `;
      });

      // Render all active trivia
      activeTriviaItems.forEach(item => {
        html += `
          <div class="xray-preview-content">
            <div class="xray-preview-title">General trivia</div>
            <div class="xray-preview-text">${item.text}</div>
          </div>
        `;
      });

      // Render all active cast
      activeCastItems.forEach(item => {
        html += `
          <div class="xray-preview-content xray-preview-cast">
            <img src="${item.image}" alt="${item.name}">
            <div class="xray-preview-cast-info">
              <div class="xray-preview-name">${item.name}</div>
              <div class="xray-preview-role">${item.role}</div>
            </div>
          </div>
        `;
      });

      this.xrayPreview.innerHTML = html;
    }
  }

  renderXRayContent() {
    const currentTime = this.video.currentTime;
    const activeCast = this.xrayData.cast.filter(item => currentTime >= item.start && currentTime <= item.end);
    const activeTrivia = this.xrayData.trivia.filter(item => currentTime >= item.start && currentTime <= item.end);
    const activeMusic = this.xrayData.music ? this.xrayData.music.filter(item => currentTime >= item.start && currentTime <= item.end) : [];

    let html = '';

    // Render Cast
    if (this.currentXRayTab === 'all' || this.currentXRayTab === 'cast') {
      if (activeCast.length > 0) {
        html += '<div class="xray-section"><div class="xray-section-title">Cast in Scene</div>';
        activeCast.forEach(item => {
          html += `
            <div class="xray-item">
              <img src="${item.image}" class="xray-item-image" alt="${item.name}">
              <div class="xray-item-info">
                <div class="xray-item-name">${item.name}</div>
                <div class="xray-item-role">${item.role}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      } else if (this.currentXRayTab === 'cast') {
        html += '<div class="video-player__xray-panel-empty">No cast info for this scene.</div>';
      }
    }

    // Render Music
    if (this.currentXRayTab === 'all' || this.currentXRayTab === 'music') {
      if (activeMusic.length > 0) {
        html += '<div class="xray-section"><div class="xray-section-title">Music</div>';
        activeMusic.forEach(item => {
          html += `
            <div class="xray-music-item">
               <div class="xray-music-visualizer">
                 <div class="visualizer-bar"></div>
                 <div class="visualizer-bar"></div>
                 <div class="visualizer-bar"></div>
                 <div class="visualizer-bar"></div>
               </div>
               <div class="xray-music-info">
                 <div class="xray-music-title">${item.title}</div>
                 <div class="xray-music-artist">${item.artist}</div>
               </div>
            </div>
          `;
        });
        html += '</div>';
      } else if (this.currentXRayTab === 'music') {
        html += '<div class="video-player__xray-panel-empty">No music playing in this scene.</div>';
      }
    }

    // Render Trivia
    if (this.currentXRayTab === 'all' || this.currentXRayTab === 'trivia') {
      if (activeTrivia.length > 0) {
        html += '<div class="xray-section"><div class="xray-section-title">Trivia</div>';
        activeTrivia.forEach(item => {
          html += `
            <div class="xray-trivia-item">
              <div class="xray-trivia-text">${item.text}</div>
            </div>
          `;
        });
        html += '</div>';
      } else if (this.currentXRayTab === 'trivia') {
        html += '<div class="video-player__xray-panel-empty">No trivia for this scene.</div>';
      }
    }

    if (html === '') {
      html = '<div class="video-player__xray-panel-empty">No X-Ray info available for this scene.</div>';
    }

    this.xrayContent.innerHTML = html;
  }


  async init() {
    // Initialize watch history
    if (window.watchHistory) {
      await window.watchHistory.init();
    }

    // Set up video source from URL params or default
    const urlParams = new URLSearchParams(window.location.search);
    const videoSrc = urlParams.get('src') || this.video.querySelector('source')?.src || 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/pbbpreview.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vcGJicHJldmlldy5tcDQiLCJpYXQiOjE3NjY1NDYzOTEsImV4cCI6MjA4MTkwNjM5MX0.z_xVpZPnyaRMZ-8namUoqzqZyEkO7yCzhKsuxAzwnYU';
    const episodeInfoElement = document.getElementById('episode-info');
    const existingTitle = episodeInfoElement ? episodeInfoElement.textContent.trim() : '';
    const title = urlParams.get('title') || existingTitle || 'Pinoy Big Brother S1: Day 1: The Big Opening';

    // Store video info for watch history
    this.videoUrl = videoSrc;
    this.videoTitle = title;
    this.thumbnailUrl = urlParams.get('thumbnail') || null;

    console.log('VideoPlayer initialized:', {
      videoUrl: this.videoUrl,
      videoTitle: this.videoTitle,
      thumbnailUrl: this.thumbnailUrl
    });

    // Parse and set episode info in bottom controls
    this.setupEpisodeInfo(title);

    // Check if source is M3U8 (HLS)
    if (videoSrc.endsWith('.m3u8') || videoSrc.includes('.m3u8')) {
      // Use HLS.js for M3U8 playback
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        // Convert signed URL to public URL for M3U8 (segments must be public)
        // Signed URLs format: /storage/v1/object/sign/stream/path?token=...
        // Public URLs format: /storage/v1/object/public/stream/path
        let publicM3U8Url = videoSrc;
        if (videoSrc.includes('/object/sign/')) {
          // Extract the path from signed URL
          const urlMatch = videoSrc.match(/\/object\/sign\/stream\/(.+?)(\?|$)/);
          if (urlMatch) {
            const filePath = urlMatch[1];
            // Construct public URL
            const baseUrl = videoSrc.split('/storage/')[0];
            publicM3U8Url = `${baseUrl}/storage/v1/object/public/stream/${filePath}`;
            console.log('Converted signed M3U8 URL to public URL:', publicM3U8Url);
          }
        }
        this.loadM3U8Direct(publicM3U8Url);
      } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        // Convert signed URL to public URL
        let publicM3U8Url = videoSrc;
        if (videoSrc.includes('/object/sign/')) {
          const urlMatch = videoSrc.match(/\/object\/sign\/stream\/(.+?)(\?|$)/);
          if (urlMatch) {
            const filePath = urlMatch[1];
            const baseUrl = videoSrc.split('/storage/')[0];
            publicM3U8Url = `${baseUrl}/storage/v1/object/public/stream/${filePath}`;
          }
        }
        this.video.src = publicM3U8Url;
      } else {
        console.error('HLS not supported in this browser. Please use a modern browser or install HLS.js.');
        this.video.src = videoSrc; // Fallback attempt
      }
    } else {
      // Regular video file (MP4, WebM, etc.)
      this.video.src = videoSrc;
    }

    // Load subtitle and audio tracks
    this.loadTracks();

    // Set up event listeners
    this.setupEventListeners();

    // Auto-hide controls
    this.setupControlsAutoHide();

    // Initialize volume slider filled portion
    this.updateVolumeSliderFilled();

    // Setup loading spinner
    this.setupLoadingSpinner();

    // Load saved watch progress
    this.loadWatchProgress();

    // Setup watch history tracking
    this.setupWatchHistoryTracking();
  }

  setupLoadingSpinner() {
    if (!this.loadingSpinner) return;

    // Hide spinner initially if video is already loaded
    if (this.video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
      this.hideLoadingSpinner();
    }

    // Show spinner when video is loading/buffering
    this.video.addEventListener('loadstart', () => {
      this.showLoadingSpinner();
    });

    this.video.addEventListener('waiting', () => {
      this.showLoadingSpinner();
    });

    // Hide spinner when video can play
    this.video.addEventListener('loadeddata', () => {
      this.hideLoadingSpinner();
    });

    this.video.addEventListener('canplay', () => {
      this.hideLoadingSpinner();
    });

    this.video.addEventListener('canplaythrough', () => {
      this.hideLoadingSpinner();
    });

    this.video.addEventListener('playing', () => {
      this.hideLoadingSpinner();
    });

    // Also hide on error
    this.video.addEventListener('error', () => {
      this.hideLoadingSpinner();
    });
  }

  showLoadingSpinner() {
    if (this.loadingSpinner) {
      this.loadingSpinner.classList.add('active');
    }
  }

  hideLoadingSpinner() {
    if (this.loadingSpinner) {
      this.loadingSpinner.classList.remove('active');
    }
  }

  async loadM3U8WithSignedUrls(m3u8Url) {
    try {
      // Extract base path from the M3U8 URL
      const urlObj = new URL(m3u8Url);
      const pathMatch = urlObj.pathname.match(/\/stream\/(.+\.m3u8)/);
      if (!pathMatch) {
        console.error('Could not parse M3U8 path');
        this.loadM3U8Direct(m3u8Url);
        return;
      }
      const m3u8Path = decodeURIComponent(pathMatch[1]);
      const baseDir = m3u8Path.substring(0, m3u8Path.lastIndexOf('/'));

      console.log('M3U8 path:', m3u8Path);
      console.log('Base directory:', baseDir);

      const supabase = initSupabase();
      if (!supabase) {
        console.warn('Supabase not available, using direct load');
        this.loadM3U8Direct(m3u8Url);
        return;
      }

      // Fetch and parse the M3U8 playlist
      console.log('Fetching M3U8 playlist...');
      const response = await fetch(m3u8Url);
      if (!response.ok) {
        throw new Error(`Failed to fetch M3U8: ${response.status}`);
      }
      const playlistText = await response.text();

      // Parse playlist and generate signed URLs for all segments
      const lines = playlistText.split('\n');
      const segmentLines = [];
      const segmentPromises = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() && !line.startsWith('#')) {
          // This is a segment file
          const segmentName = line.trim();
          const segmentPath = `${baseDir}/${segmentName}`;
          segmentLines.push({ index: i, segmentName, segmentPath, originalLine: line });

          // Generate signed URL
          segmentPromises.push(
            supabase.storage
              .from('stream')
              .createSignedUrl(segmentPath, 3600)
              .then(({ data, error }) => ({
                index: i,
                signedUrl: data?.signedUrl || null,
                error,
                segmentName
              }))
          );
        }
      }

      console.log(`Generating ${segmentPromises.length} signed URLs...`);
      const signedUrlResults = await Promise.all(segmentPromises);

      // Build URL map
      const urlMap = new Map();
      let successCount = 0;
      let failCount = 0;

      for (const result of signedUrlResults) {
        if (result.signedUrl && result.signedUrl.startsWith('http')) {
          urlMap.set(result.index, result.signedUrl);
          successCount++;
        } else {
          console.error(`Failed to generate signed URL for ${result.segmentName}:`, result.error);
          failCount++;
        }
      }

      console.log(`Signed URL generation: ${successCount} success, ${failCount} failed`);

      if (failCount > 0) {
        console.warn('Some segments failed to get signed URLs');
      }

      // Rewrite playlist with signed URLs
      const rewrittenLines = lines.map((line, index) => {
        if (urlMap.has(index)) {
          return urlMap.get(index);
        }
        return line;
      });

      const rewrittenPlaylist = rewrittenLines.join('\n');

      // Create a blob and object URL
      const blob = new Blob([rewrittenPlaylist], { type: 'application/vnd.apple.mpegurl' });
      const objectUrl = URL.createObjectURL(blob);

      console.log('Playlist rewritten, loading from object URL');

      // Initialize HLS with the rewritten playlist
      const hls = new Hls({
        enableWorker: false, // Disable worker to avoid CORS issues with blob URLs
        lowLatencyMode: false,
        backBufferLength: 90
      });

      // Load the rewritten playlist from object URL
      hls.loadSource(objectUrl);
      hls.attachMedia(this.video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, ready to play');
        // Don't hide immediately, wait for canplay event
        // Setup audio tracks UI
        this.setupAudioTracks();
        // Try to select Filipino audio track if available
        this.selectFilipinoAudioTrack();
      });

      // Wait for video to be ready before starting playback
      this.video.addEventListener('canplay', () => {
        if (this.video.hasAttribute('autoplay') && this.video.paused) {
          // Check if user clicked Play button (user interaction flag)
          const userInteracted = sessionStorage.getItem('userInteracted') === 'true';

          if (userInteracted) {
            // User clicked Play, so we can play with sound
            this.video.muted = false;
            this.video.volume = 1;
            // Clear the flag after using it
            sessionStorage.removeItem('userInteracted');
          } else {
            // No user interaction, try with sound first, fallback to muted
            this.video.muted = false;
            this.video.volume = 1;
          }

          // Mark that autoplay is starting
          this.autoplayJustStarted = true;
          // Start playback if autoplay is enabled
          this.video.play().then(() => {
            // Clear the flag after a short delay to allow normal play/pause
            setTimeout(() => {
              this.autoplayJustStarted = false;
            }, 1000);
          }).catch(err => {
            console.log('Autoplay with sound prevented, trying muted:', err);
            this.autoplayJustStarted = false;
            // If autoplay with sound fails, play muted (user can unmute manually)
            this.video.muted = true;
            this.video.volume = 1;
            this.video.play().then(() => {
              this.autoplayJustStarted = true;
              setTimeout(() => {
                this.autoplayJustStarted = false;
              }, 1000);
            }).catch(err2 => {
              console.log('Autoplay with muted also prevented:', err2);
              this.autoplayJustStarted = false;
            });
          });
        }
      }, { once: true });

      hls.on(Hls.Events.FRAG_LOADING, () => {
        // Only show if video is actually waiting
        if (this.video.readyState < 3) {
          this.showLoadingSpinner();
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        // Fragment loaded, check if we can hide
        if (this.video.readyState >= 3 && !this.video.paused) {
          this.hideLoadingSpinner();
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        this.hideLoadingSpinner();
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, try to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, try to recover');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              hls.destroy();
              break;
          }
        }
      });

      this.hls = hls;
      this.m3u8ObjectUrl = objectUrl; // Store for cleanup

    } catch (error) {
      console.error('Error loading M3U8 with signed URLs:', error);
      this.loadM3U8Direct(m3u8Url);
    }
  }

  loadM3U8Direct(m3u8Url) {
    this.showLoadingSpinner();

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90
    });
    hls.loadSource(m3u8Url);
    hls.attachMedia(this.video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('HLS manifest parsed, ready to play');
      // Don't hide immediately, wait for canplay event
      // Setup audio tracks UI
      this.setupAudioTracks();
      // Try to select Filipino audio track if available
      this.selectFilipinoAudioTrack();
    });

    // Wait for video to be ready before starting playback
    this.video.addEventListener('canplay', () => {
      if (this.video.hasAttribute('autoplay') && this.video.paused) {
        // Check if user clicked Play button (user interaction flag)
        const userInteracted = sessionStorage.getItem('userInteracted') === 'true';

        if (userInteracted) {
          // User clicked Play, so we can play with sound
          this.video.muted = false;
          this.video.volume = 1;
          // Clear the flag after using it
          sessionStorage.removeItem('userInteracted');
        } else {
          // No user interaction, try with sound first, fallback to muted
          this.video.muted = false;
          this.video.volume = 1;
        }

        // Mark that autoplay is starting
        this.autoplayJustStarted = true;
        // Start playback if autoplay is enabled
        this.video.play().then(() => {
          // Clear the flag after a short delay to allow normal play/pause
          setTimeout(() => {
            this.autoplayJustStarted = false;
          }, 1000);
        }).catch(err => {
          console.log('Autoplay with sound prevented, trying muted:', err);
          this.autoplayJustStarted = false;
          // If autoplay with sound fails, play muted (user can unmute manually)
          this.video.muted = true;
          this.video.volume = 1;
          this.video.play().then(() => {
            this.autoplayJustStarted = true;
            setTimeout(() => {
              this.autoplayJustStarted = false;
            }, 1000);
          }).catch(err2 => {
            console.log('Autoplay with muted also prevented:', err2);
            this.autoplayJustStarted = false;
          });
        });
      }
    }, { once: true });

    hls.on(Hls.Events.FRAG_LOADING, () => {
      // Only show if video is actually waiting
      if (this.video.readyState < 3) {
        this.showLoadingSpinner();
      }
    });

    hls.on(Hls.Events.FRAG_LOADED, () => {
      // Fragment loaded, check if we can hide
      if (this.video.readyState >= 3 && !this.video.paused) {
        this.hideLoadingSpinner();
      }
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error('HLS error:', data);
      this.hideLoadingSpinner();
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            break;
        }
      }
    });

    this.hls = hls;
  }

  selectFilipinoAudioTrack() {
    if (!this.hls || !this.hls.audioTracks || this.hls.audioTracks.length === 0) {
      return;
    }

    // Look for Filipino audio track
    // Check for common Filipino language codes: 'fil', 'tl', 'tgl', or 'tag'
    const filipinoTrackIndex = this.hls.audioTracks.findIndex(track => {
      const lang = (track.lang || '').toLowerCase();
      const name = (track.name || '').toLowerCase();
      return lang.includes('fil') || lang.includes('tag') || lang.includes('tl') ||
        name.includes('filipino') || name.includes('tagalog');
    });

    if (filipinoTrackIndex >= 0) {
      this.hls.audioTrack = filipinoTrackIndex;
      this.currentAudioTrack = 'fil';
      console.log('Filipino audio track selected:', this.hls.audioTracks[filipinoTrackIndex]);
    } else if (this.hls.audioTracks.length > 0) {
      // If no Filipino track found, use the first available track
      this.hls.audioTrack = 0;
      console.log('No Filipino audio track found, using default track');
    }
  }

  setupEventListeners() {
    // Video events
    this.video.addEventListener('loadedmetadata', () => {
      this.updateDuration();
      this.setupSubtitleTracks();
      this.setupAudioTracks();
    });

    // Start autoplay for regular video files (non-HLS)
    this.video.addEventListener('canplay', () => {
      if (this.video.hasAttribute('autoplay') && this.video.paused) {
        // Check if user clicked Play button (user interaction flag)
        const userInteracted = sessionStorage.getItem('userInteracted') === 'true';

        if (userInteracted) {
          // User clicked Play, so we can play with sound
          this.video.muted = false;
          this.video.volume = 1;
          // Clear the flag after using it
          sessionStorage.removeItem('userInteracted');
        } else {
          // No user interaction, try with sound first, fallback to muted
          this.video.muted = false;
          this.video.volume = 1;
        }

        // Mark that autoplay is starting
        this.autoplayJustStarted = true;
        this.video.play().then(() => {
          // Clear the flag after a short delay to allow normal play/pause
          setTimeout(() => {
            this.autoplayJustStarted = false;
          }, 1000);
        }).catch(err => {
          console.log('Autoplay with sound prevented, trying muted:', err);
          this.autoplayJustStarted = false;
          // If autoplay with sound fails, play muted (user can unmute manually)
          this.video.muted = true;
          this.video.volume = 1;
          this.video.play().then(() => {
            this.autoplayJustStarted = true;
            setTimeout(() => {
              this.autoplayJustStarted = false;
            }, 1000);
          }).catch(err2 => {
            console.log('Autoplay with muted also prevented:', err2);
            this.autoplayJustStarted = false;
          });
        });
      }
    }, { once: true });

    this.video.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.updateSubtitles();

      // Update Overlay Buttons Visibility
      const currentTime = this.video.currentTime || 0;
      const duration = this.video.duration || 0;

      // Skip Montage (Intro): Show during first 95 seconds
      if (this.skipMontageBtn) {
        if (currentTime > 0 && currentTime < 95) {
          this.skipMontageBtn.style.display = 'block';
        } else {
          this.skipMontageBtn.style.display = 'none';
        }
      }

      // Next Episode: Show during last 60 seconds
      if (this.nextEpisodeBtn) {
        if (duration > 0 && (duration - currentTime) < 60) {
          this.nextEpisodeBtn.style.display = 'block';
        } else {
          this.nextEpisodeBtn.style.display = 'none';
        }
      }
    });


    this.video.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayButton();
      this.hidePauseOverlay();
      // Show age rating at start of video
      this.showAgeRating();
    });

    this.video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayButton();
      this.showPauseOverlay();
    });

    this.video.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.video.addEventListener('progress', () => {
      this.updateBuffer();
    });

    this.video.addEventListener('volumechange', () => {
      // Only update UI, don't interfere with mute state
      // The mute state should only be changed by:
      // 1. User clicking the mute button (handled by toggleMute)
      // 2. User adjusting the slider (handled by input event)
      this.updateVolumeButton();
      this.updateVolumeSliderFilled();
    });

    // Enable sound on first user interaction
    const enableSoundOnInteraction = () => {
      if (this.video.muted && this.video.readyState >= 2) {
        this.video.muted = false;
        this.updateVolumeButton();
      }
    };

    // Listen for first user interaction to enable sound
    const interactionEvents = ['click', 'touchstart', 'keydown'];
    const enableSoundOnce = () => {
      enableSoundOnInteraction();
      interactionEvents.forEach(event => {
        document.removeEventListener(event, enableSoundOnce);
      });
    };
    interactionEvents.forEach(event => {
      document.addEventListener(event, enableSoundOnce, { once: true });
    });

    // Play/Pause
    this.playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      enableSoundOnInteraction();
      this.togglePlay();
    });

    // Toggle play/pause when clicking the main container or controls overlay
    const handleMainClick = (e) => {
      // Don't toggle if clicking on a button, slider, or other interactive element
      const interactiveElements = ['BUTTON', 'INPUT', 'A', 'SVG', 'PATH', 'IMG'];
      if (interactiveElements.includes(e.target.tagName) || e.target.closest('button')) {
        return;
      }

      enableSoundOnInteraction();
      this.togglePlay();
    };

    if (this.controls) {
      this.controls.addEventListener('click', handleMainClick);
    }
    this.video.addEventListener('click', handleMainClick);

    // Skip Backward
    if (this.skipBackwardBtn) {
      this.skipBackwardBtn.addEventListener('click', () => this.rewind(10));
    }

    // Skip Forward
    if (this.skipForwardBtn) {
      this.skipForwardBtn.addEventListener('click', () => this.forward(10));
    }

    // Skip Montage Button
    if (this.skipMontageBtn) {
      this.skipMontageBtn.addEventListener('click', () => {
        // Skip to end of intro (e.g., 95s)
        this.video.currentTime = 95;
      });
    }

    // Next Episode Button - handled in setupNextEpisode() method

    // Help button
    if (this.helpBtn) {
      this.helpBtn.addEventListener('click', () => {
        // Help functionality can be added here
        console.log('Help clicked');
      });
    }

    // Episodes button
    if (this.episodesBtn) {
      this.episodesBtn.addEventListener('click', () => {
        this.toggleEpisodesPanel();
      });
    }

    // Episodes panel close button
    if (this.episodesClose) {
      this.episodesClose.addEventListener('click', () => {
        this.toggleEpisodesPanel();
      });
    }

    // Initialize episodes panel
    this.setupEpisodesPanel();

    // Subtitles button (opens settings panel)
    if (this.subtitlesBtn) {
      this.subtitlesBtn.addEventListener('click', () => this.toggleSettings());
    }

    // Volume
    this.volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      // Don't call enableSoundOnInteraction here - toggleMute handles mute/unmute
      this.toggleMute();
    });
    this.volumeSlider.addEventListener('mousedown', () => {
      this.isAdjustingVolume = true;
    });

    this.volumeSlider.addEventListener('input', (e) => {
      const newVolume = e.target.value / 100;
      this.video.volume = newVolume;
      // Unmute when adjusting volume slider if it was muted and volume > 0
      if (newVolume > 0 && this.video.muted) {
        this.video.muted = false;
      }
      // Update the filled portion
      this.updateVolumeSliderFilled();
    });

    const handleVolumeSliderRelease = () => {
      this.isAdjustingVolume = false;
      // Ensure video is not muted when releasing slider if volume > 0
      // Use setTimeout to ensure this happens after any volumechange events
      setTimeout(() => {
        if (this.video.volume > 0 && this.video.muted) {
          this.video.muted = false;
        }
        this.updateVolumeButton();
      }, 50);
    };

    this.volumeSlider.addEventListener('mouseup', handleVolumeSliderRelease);

    this.volumeSlider.addEventListener('change', handleVolumeSliderRelease);

    // Handle touch events for mobile
    this.volumeSlider.addEventListener('touchstart', () => {
      this.isAdjustingVolume = true;
    });

    this.volumeSlider.addEventListener('touchend', handleVolumeSliderRelease);

    // Progress bar
    this.progressBar.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent click from bubbling to video/controls (which would pause)
      const rect = this.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.video.currentTime = percent * this.video.duration;
    });

    this.progressBar.addEventListener('mousemove', (e) => {
      const rect = this.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.progressHandle.style.left = `${percent * 100}%`;

      // Show timestamp preview
      if (this.video.duration) {
        const hoverTime = percent * this.video.duration;
        this.showProgressTimestamp(e, hoverTime);
        this.showProgressThumbnail(e, hoverTime);
      }
    });

    this.progressBar.addEventListener('mouseenter', () => {
      if (this.progressTimestamp) {
        this.progressTimestamp.style.opacity = '1';
        this.progressTimestamp.style.visibility = 'visible';
      }
      if (this.progressThumbnail) {
        this.progressThumbnail.style.opacity = '1';
        this.progressThumbnail.style.visibility = 'visible';
      }
    });

    this.progressBar.addEventListener('mouseleave', () => {
      if (this.progressTimestamp) {
        this.progressTimestamp.style.opacity = '0';
        this.progressTimestamp.style.visibility = 'hidden';
      }
      if (this.progressThumbnail) {
        this.progressThumbnail.style.opacity = '0';
        this.progressThumbnail.style.visibility = 'hidden';
      }
    });

    // Fullscreen
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    // Settings (if settings button exists)
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => this.toggleSettings());
    }
    if (this.settingsClose) {
      this.settingsClose.addEventListener('click', () => this.toggleSettings());
    }

    // Back button
    this.backBtn.addEventListener('click', () => {
      if (this.isFullscreen) {
        this.exitFullscreen();
      } else {
        window.location.href = '../titles/pinoy-big-brother/';
      }
    });

    // Skip Montage button
    this.setupSkipMontage();

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  setupSkipMontage() {
    if (!this.skipMontageBtn) return;

    // Detect current episode from URL
    const currentPage = window.location.pathname.split('/').pop() || 'ep1.html';
    
    // Episode-specific timestamps for Skip Montage
    let MONTAGE_START = 0;
    let MONTAGE_END = 54; // Default for Episode 1
    
    if (currentPage.includes('ep2')) {
      MONTAGE_START = 0;
      MONTAGE_END = 50; // Episode 2: Change this to your desired end time (in seconds)
    } else if (currentPage.includes('ep1')) {
      MONTAGE_START = 0;
      MONTAGE_END = 54; // Episode 1: 54 seconds
    }
    // Add more episodes as needed:
    // else if (currentPage.includes('ep3')) {
    //   MONTAGE_START = 0;
    //   MONTAGE_END = 60; // Episode 3: 60 seconds
    // }
    
    const MONTAGE_DURATION = MONTAGE_END - MONTAGE_START;

    // Show/hide skip button based on current time
    this.video.addEventListener('timeupdate', () => {
      const currentTime = this.video.currentTime;

      if (currentTime >= MONTAGE_START && currentTime < MONTAGE_END) {
        this.skipMontageBtn.classList.add('show');

        // Update progress bar
        if (this.skipMontageProgress) {
          const progress = ((currentTime - MONTAGE_START) / MONTAGE_DURATION) * 100;
          this.skipMontageProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
      } else {
        this.skipMontageBtn.classList.remove('show');
        if (this.skipMontageProgress) {
          this.skipMontageProgress.style.width = '0%';
        }
      }
    });

    // Skip to end of montage when clicked
    this.skipMontageBtn.addEventListener('click', () => {
      this.video.currentTime = MONTAGE_END;
      this.skipMontageBtn.classList.remove('show');
      if (this.skipMontageProgress) {
        this.skipMontageProgress.style.width = '0%';
      }
    });

    // Setup Next Episode button
    this.setupNextEpisode();
  }

  setupNextEpisode() {
    if (!this.nextEpisodeBtn) return;

    // Detect current episode from URL
    const currentPage = window.location.pathname.split('/').pop() || 'ep1.html';
    
    // Episode-specific timestamps for Next Episode
    let NEXT_EPISODE_START = 26 * 60 + 15; // Default for Episode 1: 26:15 (1575 seconds)
    let NEXT_EPISODE_END = 26 * 60 + 26;   // Default for Episode 1: 26:26 (1586 seconds)
    
    if (currentPage.includes('ep2')) {
      NEXT_EPISODE_START = 1387;  // Episode 2: 23:07 (1387 seconds)
      NEXT_EPISODE_END = 1413;     // Episode 2: 23:33 (1413 seconds)
    } else if (currentPage.includes('ep1')) {
      NEXT_EPISODE_START = 26 * 60 + 15; // Episode 1: 26:15 (1575 seconds)
      NEXT_EPISODE_END = 26 * 60 + 26;    // Episode 1: 26:26 (1586 seconds)
    }
    // Add more episodes as needed:
    // else if (currentPage.includes('ep3')) {
    //   NEXT_EPISODE_START = 25 * 60 + 0;  // Episode 3: 25:00 (1500 seconds)
    //   NEXT_EPISODE_END = 25 * 60 + 20;   // Episode 3: 25:20 (1520 seconds)
    // }
    
    const NEXT_EPISODE_DURATION = NEXT_EPISODE_END - NEXT_EPISODE_START;

    // Show/hide next episode button based on current time
    this.video.addEventListener('timeupdate', () => {
      if (!this.video.duration) return;

      const currentTime = this.video.currentTime;

      // Show button only during the specified time range
      if (currentTime >= NEXT_EPISODE_START && currentTime <= NEXT_EPISODE_END) {
        this.nextEpisodeBtn.classList.add('show');

        // Update progress bar
        if (this.nextEpisodeProgress) {
          const progress = ((currentTime - NEXT_EPISODE_START) / NEXT_EPISODE_DURATION) * 100;
          this.nextEpisodeProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
      } else {
        this.nextEpisodeBtn.classList.remove('show');
        if (this.nextEpisodeProgress) {
          this.nextEpisodeProgress.style.width = '0%';
        }
      }
    });

    // Load next episode when clicked
    this.nextEpisodeBtn.addEventListener('click', () => {
      this.loadNextEpisode();
    });
  }

  loadNextEpisode() {
    // Get current episode from URL
    const currentPage = window.location.pathname.split('/').pop() || 'ep1.html';

    // Define episodes in order (same as in setupEpisodesPanel)
    const episodes = [
      {
        number: 1,
        title: 'Day 1: The Big Opening',
        page: 'ep1.html'
      },
      {
        number: 2,
        title: 'Day 2',
        page: 'ep2.html'
      },
      {
        number: 3,
        title: 'Day 3',
        page: 'ep3.html'
      },
      {
        number: 4,
        title: 'Day 4',
        page: 'ep4.html'
      },
      {
        number: 5,
        title: 'Day 5',
        page: 'ep5.html'
      }
    ];

    // Find current episode index
    const currentIndex = episodes.findIndex(ep => ep.page === currentPage);

    // Get next episode
    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];
      if (nextEpisode && nextEpisode.page) {
        // Set user interaction flag for autoplay
        sessionStorage.setItem('userInteracted', 'true');
        // Navigate to next episode
        window.location.href = nextEpisode.page;
      }
    }
  }

  setupControlsAutoHide() {
    const HIDE_DELAY = 3000; // 3 seconds

    // Show controls and reset timeout on user interaction
    const showControlsAndReset = () => {
      clearTimeout(this.controlsTimeout);
      this.showControls();

      // Hide after 3 seconds if video is playing
      this.controlsTimeout = setTimeout(() => {
        if (!this.video.paused) {
          this.hideControls();
        }
      }, HIDE_DELAY);
    };

    // Mouse events
    this.container.addEventListener('mousemove', showControlsAndReset);
    this.container.addEventListener('click', showControlsAndReset);

    // Touch events for mobile
    this.container.addEventListener('touchstart', showControlsAndReset);
    this.container.addEventListener('touchend', showControlsAndReset);

    // Show controls initially
    showControlsAndReset();

    // Hide on mouse leave (only for mouse, not touch)
    this.container.addEventListener('mouseleave', () => {
      if (!this.video.paused) {
        this.hideControls();
      }
    });

    // Pause/resume handling - show controls when paused
    this.video.addEventListener('play', () => {
      showControlsAndReset();
    });

    this.video.addEventListener('pause', () => {
      clearTimeout(this.controlsTimeout);
      this.showControls(); // Always show controls when paused
    });
  }

  showControls() {
    this.controls.classList.add('show');
  }

  hideControls() {
    // Don't hide if video is paused
    if (this.video.paused) return;
    this.controls.classList.remove('show');
  }

  togglePlay() {
    // Prevent pausing immediately after autoplay starts
    if (this.autoplayJustStarted && !this.video.paused) {
      return;
    }

    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
  }

  updateDuration() {
    if (this.durationDisplay && this.video.duration) {
      const duration = isNaN(this.video.duration) ? 0 : this.video.duration;
      this.durationDisplay.textContent = this.formatTime(duration);
    }
  }

  updateBuffer() {
    if (!this.progressBar || !this.video.buffered.length) return;
    // We can implement buffer visualization if needed, or just leave it empty if no buffer element
    // For now, let's assume we have a buffer bar
    // const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
    // const duration = this.video.duration;
    // if (duration > 0 && this.bufferBar) {
    //   this.bufferBar.style.width = `${(bufferedEnd / duration) * 100}%`;
    // }
  }

  showPauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.classList.add('show');
    }
  }

  hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.classList.remove('show');
    }
  }

  updatePlayButton() {
    const playIcon = this.playBtn.querySelector('.play-icon');
    const pauseIcon = this.playBtn.querySelector('.pause-icon');

    if (this.isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  rewind(seconds) {
    this.video.currentTime = Math.max(0, this.video.currentTime - seconds);
  }

  forward(seconds) {
    this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + seconds);
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    if (!this.video.muted) {
      this.volumeSlider.value = this.video.volume * 100;
    }
    // Update the button icon immediately
    this.updateVolumeButton();
  }

  updateVolumeButton() {
    // Only show muted icon if actually muted, not just because volume is 0
    if (this.video.muted) {
      this.volumeBtn.classList.add('muted');
      this.volumeBtn.querySelector('.volume-icon').style.display = 'none';
      this.volumeBtn.querySelector('.volume-muted-icon').style.display = 'block';
    } else {
      this.volumeBtn.classList.remove('muted');
      this.volumeBtn.querySelector('.volume-icon').style.display = 'block';
      this.volumeBtn.querySelector('.volume-muted-icon').style.display = 'none';
    }
    // Update slider to match current volume
    if (this.volumeSlider) {
      this.volumeSlider.value = this.video.volume * 100;
      this.updateVolumeSliderFilled();
    }
  }

  updateVolumeSliderFilled() {
    if (this.volumeSliderFilled && this.volumeSlider) {
      const percent = this.volumeSlider.value;
      this.volumeSliderFilled.style.width = `${percent}%`;
    }
  }

  updateProgress() {
    if (!this.video.duration) return;

    const percent = (this.video.currentTime / this.video.duration) * 100;
    this.progressFilled.style.width = `${percent}%`;
    this.progressHandle.style.left = `${percent}%`;

    if (this.timeDisplay) {
      this.timeDisplay.textContent = this.formatTime(this.video.currentTime);
    }
  }

  showProgressTimestamp(e, time) {
    if (!this.progressTimestamp || !this.progressBar) return;

    const rect = this.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;

    // Update timestamp text
    this.progressTimestamp.textContent = this.formatTime(time);

    // Position timestamp above the progress bar, centered on hover position
    const leftPosition = percent * 100;
    this.progressTimestamp.style.left = `${leftPosition}%`;
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  showProgressThumbnail(e, time) {
    if (!this.progressThumbnail || !this.progressThumbnailImg || !this.video) return;

    const rect = this.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const leftPercent = percent * 100;

    // Position thumbnail
    this.progressThumbnail.style.left = `${leftPercent}%`;

    // Round time to nearest 5 seconds for caching
    const roundedTime = Math.floor(time / 5) * 5;
    
    // Check cache first
    if (this.thumbnailCache[roundedTime]) {
      this.progressThumbnailImg.src = this.thumbnailCache[roundedTime];
      return;
    }

    // Generate thumbnail from video (with debouncing to avoid too many seeks)
    if (this.thumbnailTimeout) {
      clearTimeout(this.thumbnailTimeout);
    }

    this.thumbnailTimeout = setTimeout(() => {
      this.generateThumbnail(roundedTime).then(thumbnailUrl => {
        if (thumbnailUrl && this.progressThumbnailImg) {
          // Cache the thumbnail
          this.thumbnailCache[roundedTime] = thumbnailUrl;
          this.progressThumbnailImg.src = thumbnailUrl;
        }
      }).catch(err => {
        // Silently fail - thumbnail generation is optional
        console.log('Could not generate thumbnail:', err);
      });
    }, 150); // Debounce thumbnail generation
  }

  generateThumbnail(time) {
    return new Promise((resolve, reject) => {
      if (!this.video || !this.video.readyState) {
        reject('Video not ready');
        return;
      }

      // Create hidden video element for thumbnail generation if it doesn't exist
      if (!this.thumbnailVideo) {
        this.thumbnailVideo = document.createElement('video');
        this.thumbnailVideo.style.position = 'absolute';
        this.thumbnailVideo.style.width = '1px';
        this.thumbnailVideo.style.height = '1px';
        this.thumbnailVideo.style.opacity = '0';
        this.thumbnailVideo.style.pointerEvents = 'none';
        this.thumbnailVideo.style.top = '-9999px';
        this.thumbnailVideo.muted = true;
        this.thumbnailVideo.playsInline = true;
        this.thumbnailVideo.preload = 'metadata';
        this.thumbnailVideo.crossOrigin = 'anonymous';
        
        // Copy source from main video
        const source = this.video.querySelector('source');
        if (source && source.src) {
          const sourceElement = document.createElement('source');
          sourceElement.src = source.src;
          sourceElement.type = source.type || 'application/x-mpegURL';
          this.thumbnailVideo.appendChild(sourceElement);
        } else if (this.video.currentSrc) {
          this.thumbnailVideo.src = this.video.currentSrc;
        } else if (this.video.src) {
          this.thumbnailVideo.src = this.video.src;
        } else {
          reject('No video source available');
          return;
        }
        
        document.body.appendChild(this.thumbnailVideo);
      }

      const thumbVideo = this.thumbnailVideo;

      // Wait for video to be ready
      const onLoadedMetadata = () => {
        thumbVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
        
        // Seek to target time
        thumbVideo.currentTime = time;

        // Wait for seek to complete
        const onSeeked = () => {
          try {
            // Create canvas to capture frame
            const canvas = document.createElement('canvas');
            canvas.width = thumbVideo.videoWidth || 320;
            canvas.height = thumbVideo.videoHeight || 180;
            const ctx = canvas.getContext('2d');
            
            // Draw video frame to canvas
            ctx.drawImage(thumbVideo, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Clean up
            thumbVideo.removeEventListener('seeked', onSeeked);
            
            resolve(thumbnailUrl);
          } catch (error) {
            thumbVideo.removeEventListener('seeked', onSeeked);
            reject(error);
          }
        };

        thumbVideo.addEventListener('seeked', onSeeked, { once: true });
        
        // Timeout fallback
        setTimeout(() => {
          thumbVideo.removeEventListener('seeked', onSeeked);
          reject('Seek timeout');
        }, 2000);
      };

      if (thumbVideo.readyState >= 1) {
        // Metadata already loaded
        onLoadedMetadata();
      } else {
        thumbVideo.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        thumbVideo.load();
      }
    });
  }

  showAgeRating() {
    // Show once per page load
    if (!this.ratingOverlay || this.ratingShown) {
      return;
    }

    this.ratingShown = true;
    this.ratingOverlay.classList.add('show');

    setTimeout(() => {
      if (this.ratingOverlay) {
        this.ratingOverlay.classList.remove('show');
      }
    }, 6000); // Show for 6 seconds
  }


  toggleFullscreen() {
    if (!this.isFullscreen) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  enterFullscreen() {
    if (this.container.requestFullscreen) {
      this.container.requestFullscreen();
    } else if (this.container.webkitRequestFullscreen) {
      this.container.webkitRequestFullscreen();
    } else if (this.container.mozRequestFullScreen) {
      this.container.mozRequestFullScreen();
    } else if (this.container.msRequestFullscreen) {
      this.container.msRequestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  setupFullscreenListeners() {
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.updateFullscreenButton();
    });

    document.addEventListener('webkitfullscreenchange', () => {
      this.isFullscreen = !!document.webkitFullscreenElement;
      this.updateFullscreenButton();
    });

    document.addEventListener('mozfullscreenchange', () => {
      this.isFullscreen = !!document.mozFullScreenElement;
      this.updateFullscreenButton();
    });

    document.addEventListener('MSFullscreenChange', () => {
      this.isFullscreen = !!document.msFullscreenElement;
      this.updateFullscreenButton();
    });
  }

  updateFullscreenButton() {
    const fullscreenIcon = this.fullscreenBtn.querySelector('.fullscreen-icon');
    const fullscreenExitIcon = this.fullscreenBtn.querySelector('.fullscreen-exit-icon');

    if (this.isFullscreen) {
      fullscreenIcon.style.display = 'none';
      fullscreenExitIcon.style.display = 'block';
    } else {
      fullscreenIcon.style.display = 'block';
      fullscreenExitIcon.style.display = 'none';
    }
  }

  toggleSettings() {
    // Close episodes panel if open
    if (this.episodesPanel && this.episodesPanel.classList.contains('show')) {
      this.episodesPanel.classList.remove('show');
    }

    // Toggle settings panel
    this.settingsPanel.classList.toggle('show');
  }


  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger if typing in input
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.rewind(10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.forward(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.video.volume = Math.min(1, this.video.volume + 0.1);
          this.volumeSlider.value = this.video.volume * 100;
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.video.volume = Math.max(0, this.video.volume - 0.1);
          this.volumeSlider.value = this.video.volume * 100;
          break;
        case 'm':
          e.preventDefault();
          this.toggleMute();
          break;
        case 'f':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Escape':
          if (this.settingsPanel.classList.contains('show')) {
            this.toggleSettings();
          } else if (this.isFullscreen) {
            this.exitFullscreen();
          }
          break;
      }
    });
  }

  // Subtitle functionality
  loadTracks() {
    // Load subtitle tracks
    const subtitleUrl = new URLSearchParams(window.location.search).get('subtitles') ||
      'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/pbbpreview.vtt?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vcGJicHJldmlldy52dHQiLCJpYXQiOjE3NjY1NTEwNTQsImV4cCI6MjA4MTkxMTA1NH0.uLBGLL4eCwvbrkpI3jrDrfdz3XzrkRurFu291t72osI';

    this.loadSubtitleFile(subtitleUrl);

    // Setup default audio and subtitle tracks
    this.setupDefaultTracks();
  }

  async loadSubtitleFile(url) {
    try {
      const response = await fetch(url);
      const vttText = await response.text();
      this.parseVTT(vttText);
    } catch (error) {
      console.error('Failed to load subtitles:', error);
    }
  }

  parseVTT(vttText) {
    const cues = [];
    const lines = vttText.split('\n');
    let currentCue = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('-->')) {
        if (currentCue && currentCue.text) {
          cues.push(currentCue);
        }

        const parts = line.split('-->');
        if (parts.length === 2) {
          const start = parts[0].trim();
          const end = parts[1].trim().split(' ')[0];
          currentCue = {
            start: this.parseVTTTime(start),
            end: this.parseVTTTime(end),
            text: ''
          };
        }
      } else if (currentCue && line && !line.match(/^\d+$/) && line !== 'WEBVTT' && !line.includes('-->') && !line.startsWith('line:')) {
        if (currentCue.text) {
          currentCue.text += ' ' + line;
        } else {
          currentCue.text = line;
        }
      }
    }

    if (currentCue && currentCue.text) {
      cues.push(currentCue);
    }

    this.subtitleCues = cues;
  }

  parseVTTTime(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const hours = parseFloat(parts[0]) || 0;
      const minutes = parseFloat(parts[1]) || 0;
      const seconds = parseFloat(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  setupSubtitleTracks() {
    // Add Filipino subtitle tracks
    const tracks = [
      { id: 'off', label: 'Off', lang: 'off' },
      { id: 'fil', label: 'Filipino', lang: 'fil' }
    ];

    tracks.forEach(track => {
      const option = document.createElement('button');
      option.className = 'video-player__settings-option';
      option.dataset.track = track.id;
      option.dataset.lang = track.lang;

      if (track.id === 'off') {
        option.classList.add('active');
      }

      option.innerHTML = `
        <span>${track.label}</span>
        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

      option.addEventListener('click', () => {
        this.selectSubtitleTrack(track.id);

        document.querySelectorAll('#subtitle-tracks .video-player__settings-option').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
      });

      this.subtitleTracksContainer.appendChild(option);
    });
  }

  setupAudioTracks() {
    if (!this.audioTracksContainer) return;

    // Clear existing audio track options
    this.audioTracksContainer.innerHTML = '';

    // Add Filipino audio track
    const tracks = [
      { id: 'fil', label: 'Filipino', lang: 'fil' }
    ];

    tracks.forEach(track => {
      const option = document.createElement('button');
      option.className = 'video-player__settings-option';
      option.dataset.track = track.id;
      option.dataset.lang = track.lang;

      if (track.id === 'fil') {
        option.classList.add('active');
      }

      option.innerHTML = `
        <span>${track.label}</span>
        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

      option.addEventListener('click', () => {
        this.selectAudioTrack(track.id);

        document.querySelectorAll('#audio-tracks .video-player__settings-option').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
      });

      this.audioTracksContainer.appendChild(option);
    });
  }

  selectSubtitleTrack(trackId) {
    this.currentSubtitleTrack = trackId;

    if (trackId === 'off') {
      this.subtitleOverlay.classList.remove('show');
      this.subtitleOverlay.textContent = '';
    }
  }

  selectAudioTrack(trackId) {
    this.currentAudioTrack = trackId;

    // Switch audio track using HLS.js if available
    if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length > 0) {
      if (trackId === 'fil') {
        // Find Filipino track
        const filipinoTrackIndex = this.hls.audioTracks.findIndex(track => {
          const lang = (track.lang || '').toLowerCase();
          const name = (track.name || '').toLowerCase();
          return lang.includes('fil') || lang.includes('tag') || lang.includes('tl') ||
            name.includes('filipino') || name.includes('tagalog');
        });

        if (filipinoTrackIndex >= 0) {
          this.hls.audioTrack = filipinoTrackIndex;
          console.log('Switched to Filipino audio track');
        } else {
          console.log('Filipino audio track not found, using default');
          this.hls.audioTrack = 0;
        }
      } else {
        // For other tracks, use the first available (or implement track selection logic)
        this.hls.audioTrack = 0;
      }
    } else {
      console.log('Audio track changed to:', trackId, '(HLS not available)');
    }
  }

  setupDefaultTracks() {
    this.currentSubtitleTrack = 'off';
    this.currentAudioTrack = 'fil';
  }

  updateSubtitles() {
    if (this.currentSubtitleTrack === 'off' || !this.subtitleCues.length) {
      this.subtitleOverlay.classList.remove('show');
      return;
    }

    const currentTime = this.video.currentTime;
    let activeCue = null;

    for (let i = 0; i < this.subtitleCues.length; i++) {
      const cue = this.subtitleCues[i];
      if (currentTime >= cue.start && currentTime <= cue.end) {
        activeCue = cue;
        break;
      }
    }

    if (activeCue && activeCue.text) {
      this.subtitleOverlay.textContent = activeCue.text;
      this.subtitleOverlay.classList.add('show');
    } else {
      this.subtitleOverlay.classList.remove('show');
    }
  }

  setupEpisodeInfo(title) {
    if (!this.episodeInfoShow || !this.episodeInfoEpisode) return;

    // Parse title format: "Show Name S1: Day 1: Episode Title" or "Show Name S1:E1 Episode Title"
    // Extract show name and format episode as "S1: Day 1: Episode Title"
    const match = title.match(/^(.+?)\s+S(\d+)[:\s]+(?:E(\d+)[:\s]+)?(?:Day\s+(\d+)(?:\s*:\s*(.+?))?|(.+?))$/i);
    if (match) {
      const showName = match[1];
      const season = match[2];
      const episode = match[3];
      const day = match[4];
      const episodeTitle = match[5];
      const fallback = match[6];

      this.episodeInfoShow.textContent = showName;

      // Format as "S1: Day 1: Episode Title" if we have day and title
      if (day && episodeTitle) {
        this.episodeInfoEpisode.textContent = `S${season}: Day ${day}: ${episodeTitle}`;
      } else if (day) {
        this.episodeInfoEpisode.textContent = `S${season}: Day ${day}`;
      } else if (fallback) {
        // Use the fallback match (everything after "S1:")
        this.episodeInfoEpisode.textContent = `S${season}: ${fallback}`;
      } else {
        this.episodeInfoEpisode.textContent = `S${season}${episode ? `:E${episode}` : ''}`;
      }
    } else {
      // Fallback: try to split at first occurrence of "S"
      const sIndex = title.indexOf(' S');
      if (sIndex > 0) {
        this.episodeInfoShow.textContent = title.substring(0, sIndex);
        // Extract everything after "S" as episode info
        const episodePart = title.substring(sIndex + 2); // Skip " S"
        this.episodeInfoEpisode.textContent = episodePart;
      } else {
        // Default: use full title as show name
        this.episodeInfoShow.textContent = title;
        this.episodeInfoEpisode.textContent = '';
      }
    }
  }

  toggleEpisodesPanel() {
    if (!this.episodesPanel) return;

    // Close settings panel if open
    if (this.settingsPanel && this.settingsPanel.classList.contains('show')) {
      this.settingsPanel.classList.remove('show');
    }

    // Toggle episodes panel
    const isShowing = this.episodesPanel.classList.contains('show');
    if (isShowing) {
      this.episodesPanel.classList.remove('show');
    } else {
      this.episodesPanel.classList.add('show');
      // Refresh episodes list to update active state
      this.setupEpisodesPanel();
    }
  }

  setupEpisodesPanel() {
    if (!this.episodesListContainer) return;

    // Define episodes data - matching thumbnails from pinoy-big-brother/index.html
    // Note: From players/ directory, use ../ to go to browse/ directory
    const episodes = [
      {
        number: 1,
        title: 'Day 1: The Big Opening',
        duration: '26m',
        thumbnail: '../day1-thumbnail.jpg',
        src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/public/stream/pbb/Day%201/Day1.m3u8',
        page: 'ep1.html'
      },
      {
        number: 2,
        title: 'Day 2: The First Challenge',
        duration: '23m',
        thumbnail: '../day2-thumbnail.jpg',
        src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/public/stream/pbb/Day%202/Day2.m3u8',
        page: 'ep2.html'
      },
      {
        number: 3,
        title: 'Day 3: ???',
        duration: 'Coming Soon',
        thumbnail: '../pbb.png',
        src: null,
        page: null
      },
      {
        number: 4,
        title: 'Day 4: ???',
        duration: 'Coming Soon',
        thumbnail: '../pbb.png',
        src: null,
        page: null
      },
      {
        number: 5,
        title: 'Day 5: ???',
        duration: 'Coming Soon',
        thumbnail: '../pbb.png',
        src: null,
        page: null
      }
    ];

    // Clear existing episodes
    this.episodesListContainer.innerHTML = '';

    // Get current episode from URL or default to episode 1
    const currentPage = window.location.pathname.split('/').pop() || 'ep1.html';

    // Render episodes
    episodes.forEach(episode => {
      const episodeItem = document.createElement('button');
      episodeItem.className = 'video-player__episode-item';
      episodeItem.dataset.episode = episode.number;

      // Mark current episode as active
      if (episode.page === currentPage || (currentPage === 'ep1.html' && episode.number === 1)) {
        episodeItem.classList.add('active');
      }

      // Set thumbnail background
      const thumbnailStyle = episode.thumbnail
        ? `background-image: url('${episode.thumbnail}');`
        : 'background: rgba(255, 255, 255, 0.1);';

      episodeItem.innerHTML = `
        <div class="video-player__episode-thumbnail" style="${thumbnailStyle}"></div>
        <div class="video-player__episode-info">
          <div class="video-player__episode-number">Episode ${episode.number}</div>
          <h4 class="video-player__episode-title">${episode.title}</h4>
          <div class="video-player__episode-duration">${episode.duration}</div>
        </div>
      `;

      // Add click handler
      episodeItem.addEventListener('click', () => {
        if (episode.page && episode.src) {
          this.loadEpisode(episode);
        } else {
          console.log('Episode not available yet:', episode.title);
        }
      });

      // Disable if not available
      if (!episode.page || !episode.src) {
        episodeItem.style.opacity = '0.5';
        episodeItem.style.cursor = 'not-allowed';
      }

      this.episodesListContainer.appendChild(episodeItem);
    });
  }

  loadEpisode(episode) {
    if (!episode || !episode.page) return;

    // Set user interaction flag for autoplay
    sessionStorage.setItem('userInteracted', 'true');

    // Navigate to episode page
    window.location.href = episode.page;
  }

  showPauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.classList.add('show');
    }
  }

  hidePauseOverlay() {
    if (this.pauseOverlay) {
      this.pauseOverlay.classList.remove('show');
    }
  }

  // Load saved watch progress
  async loadWatchProgress() {
    if (!window.watchHistory || !this.videoUrl || !this.videoTitle) return;

    try {
      const progress = await window.watchHistory.getProgress(this.videoUrl, this.videoTitle);
      if (progress && progress.currentTime > 0 && progress.duration > 0) {
        // Only resume if not near the end (within 10 seconds)
        if (progress.currentTime < progress.duration - 10) {
          this.video.addEventListener('loadedmetadata', () => {
            this.video.currentTime = progress.currentTime;
            console.log('Resumed from:', progress.currentTime, 'seconds');
          }, { once: true });
        }
      }
    } catch (e) {
      console.error('Error loading watch progress:', e);
    }
  }

  // Setup watch history tracking
  setupWatchHistoryTracking() {
    if (!window.watchHistory) return;

    // Save progress periodically
    this.watchHistorySaveInterval = setInterval(() => {
      this.saveWatchProgress();
    }, 5000); // Save every 5 seconds

    // Save on pause
    this.video.addEventListener('pause', () => {
      this.saveWatchProgress();
    });

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveWatchProgress();
    });
  }

  // Save watch progress
  async saveWatchProgress() {
    if (!window.watchHistory || !this.videoUrl || !this.videoTitle) {
      console.log('Cannot save watch progress:', {
        hasWatchHistory: !!window.watchHistory,
        videoUrl: this.videoUrl,
        videoTitle: this.videoTitle
      });
      return;
    }
    if (!this.video.duration || this.video.duration === 0) {
      console.log('Video duration not available yet');
      return;
    }

    const currentTime = this.video.currentTime;
    const duration = this.video.duration;

    // Don't save if video just started (less than 5 seconds)
    if (currentTime < 5) {
      console.log('Video just started, not saving yet (currentTime:', currentTime, ')');
      return;
    }

    try {
      console.log('Saving watch progress:', {
        videoUrl: this.videoUrl,
        videoTitle: this.videoTitle,
        currentTime: currentTime,
        duration: duration,
        progressPercent: (currentTime / duration) * 100
      });
      await window.watchHistory.saveProgress(
        this.videoUrl,
        this.videoTitle,
        currentTime,
        duration,
        this.thumbnailUrl
      );
      console.log('Watch progress saved successfully');
    } catch (e) {
      console.error('Error saving watch progress:', e);
    }
  }

}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const player = new VideoPlayer();
  player.setupFullscreenListeners();

  // Make player globally accessible for debugging
  window.videoPlayer = player;
});

