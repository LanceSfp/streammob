class LiveVideoPlayer {
  constructor() {
    this.video = document.getElementById('video-element');
    this.container = document.getElementById('video-player');
    this.controls = document.getElementById('controls');
    this.loadingSpinner = document.getElementById('loading-spinner');
    this.subtitleOverlay = document.getElementById('subtitle-overlay');
    this.settingsPanel = document.getElementById('settings-panel');

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
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.backBtn = document.getElementById('back-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsClose = document.getElementById('settings-close');
    this.episodeInfoShow = document.getElementById('episode-info-show');
    this.episodeInfoEpisode = document.getElementById('episode-info-episode');

    // State
    this.isPlaying = false;
    this.isFullscreen = false;
    this.isLive = true; // Live streams don't have duration
    this.hls = null;
    this.currentAudioTrack = null;
    this.audioTracksContainer = document.getElementById('audio-tracks');
    this.controlsTimeout = null;
    this.isAdjustingVolume = false;
    this.thumbnailCache = {};
    this.thumbnailTimeout = null;
    this.thumbnailVideo = null;
    this.autoplayJustStarted = false;

    // Initialize
    this.init();
  }

  async init() {
    // Set up video source from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const videoSrc = urlParams.get('src') || '';
    const title = urlParams.get('title') || 'Live Channel';

    // Set episode info (channel name)
    if (this.episodeInfoShow) {
      this.episodeInfoShow.textContent = title;
    }
    if (this.episodeInfoEpisode) {
      this.episodeInfoEpisode.textContent = '';
    }

    if (!videoSrc) {
      console.error('No video source provided');
      return;
    }

    // Check if source is M3U8 (HLS) - typical for live streams
    if (videoSrc.endsWith('.m3u8') || videoSrc.includes('.m3u8')) {
      this.loadM3U8(videoSrc);
    } else {
      // Regular video file
      this.video.src = videoSrc;
    }

    // Load audio tracks
    this.loadTracks();

    // Set up event listeners
    this.setupEventListeners();

    // Auto-hide controls
    this.setupControlsAutoHide();

    // Setup loading spinner
    this.setupLoadingSpinner();

    // Initialize volume slider filled portion
    this.updateVolumeSliderFilled();
  }

  setupLoadingSpinner() {
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

    this.video.addEventListener('playing', () => {
      this.hideLoadingSpinner();
    });

    this.video.addEventListener('error', () => {
      this.hideLoadingSpinner();
    });
  }

  showLoadingSpinner() {
    // Create spinner if it doesn't exist
    let spinner = document.getElementById('loading-spinner');
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.id = 'loading-spinner';
      spinner.className = 'video-player__loading';
      spinner.innerHTML = '<div class="video-player__loading-spinner"></div>';
      this.container.appendChild(spinner);
    }
    spinner.classList.add('active');
  }

  hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      spinner.classList.remove('active');
    }
  }

  loadM3U8(m3u8Url) {
    this.showLoadingSpinner();

    // Use HLS.js for M3U8 playback
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true, // Better for live streams
        backBufferLength: 30
      });
      hls.loadSource(m3u8Url);
      hls.attachMedia(this.video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, ready to play');
        this.setupAudioTracks();
        this.selectFilipinoAudioTrack();
      });

      hls.on(Hls.Events.FRAG_LOADING, () => {
        if (this.video.readyState < 3) {
          this.showLoadingSpinner();
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
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
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      this.video.src = m3u8Url;
    } else {
      console.error('HLS not supported in this browser. Please use a modern browser or install HLS.js.');
    }
  }

  selectFilipinoAudioTrack() {
    if (!this.hls || !this.hls.audioTracks || this.hls.audioTracks.length === 0) {
      return;
    }

    // Look for Filipino audio track
    const filipinoTrackIndex = this.hls.audioTracks.findIndex(track => {
      const lang = (track.lang || '').toLowerCase();
      const name = (track.name || '').toLowerCase();
      return lang.includes('fil') || lang.includes('tag') || lang.includes('tl') ||
        name.includes('filipino') || name.includes('tagalog');
    });

    if (filipinoTrackIndex >= 0) {
      this.hls.audioTrack = filipinoTrackIndex;
      this.currentAudioTrack = 'fil';
      console.log('Filipino audio track selected');
    } else if (this.hls.audioTracks.length > 0) {
      this.hls.audioTrack = 0;
      console.log('No Filipino audio track found, using default track');
    }
  }

  setupEventListeners() {
    // Video events
    this.video.addEventListener('loadedmetadata', () => {
      this.setupAudioTracks();
    });

    this.video.addEventListener('timeupdate', () => {
      this.updateProgress();
    });

    this.video.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayButton();
    });

    this.video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.video.addEventListener('volumechange', () => {
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

    // Toggle play/pause when clicking the main container
    const handleMainClick = (e) => {
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

    // Volume
    this.volumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
    });

    this.volumeSlider.addEventListener('mousedown', () => {
      this.isAdjustingVolume = true;
    });

    this.volumeSlider.addEventListener('input', (e) => {
      const newVolume = e.target.value / 100;
      this.video.volume = newVolume;
      if (newVolume > 0 && this.video.muted) {
        this.video.muted = false;
      }
      this.updateVolumeSliderFilled();
    });

    const handleVolumeSliderRelease = () => {
      this.isAdjustingVolume = false;
      setTimeout(() => {
        if (this.video.volume > 0 && this.video.muted) {
          this.video.muted = false;
        }
        this.updateVolumeButton();
      }, 50);
    };

    this.volumeSlider.addEventListener('mouseup', handleVolumeSliderRelease);
    this.volumeSlider.addEventListener('change', handleVolumeSliderRelease);
    this.volumeSlider.addEventListener('touchstart', () => {
      this.isAdjustingVolume = true;
    });
    this.volumeSlider.addEventListener('touchend', handleVolumeSliderRelease);

    // Progress bar - show hover effects but disable seeking for live streams
    if (this.progressBar) {
      this.progressBar.addEventListener('mousemove', (e) => {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        if (this.progressHandle) {
          this.progressHandle.style.left = `${percent * 100}%`;
        }
        // Show timestamp preview (for live, show "LIVE" or buffer info)
        if (this.progressTimestamp) {
          this.progressTimestamp.textContent = 'LIVE';
          this.progressTimestamp.style.left = `${percent * 100}%`;
        }
      });

      this.progressBar.addEventListener('mouseenter', () => {
        if (this.progressTimestamp) {
          this.progressTimestamp.style.opacity = '1';
          this.progressTimestamp.style.visibility = 'visible';
        }
        if (this.progressHandle) {
          this.progressHandle.style.opacity = '1';
        }
      });

      this.progressBar.addEventListener('mouseleave', () => {
        if (this.progressTimestamp) {
          this.progressTimestamp.style.opacity = '0';
          this.progressTimestamp.style.visibility = 'hidden';
        }
        if (this.progressHandle) {
          this.progressHandle.style.opacity = '0';
        }
      });

      // Disable clicking for seeking on live streams
      this.progressBar.style.cursor = 'default';
    }

    // Fullscreen
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    // Settings
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
        window.location.href = '../browse/';
      }
    });

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  setupControlsAutoHide() {
    const HIDE_DELAY = 3000;

    const showControlsAndReset = () => {
      clearTimeout(this.controlsTimeout);
      this.showControls();

      this.controlsTimeout = setTimeout(() => {
        if (!this.video.paused) {
          this.hideControls();
        }
      }, HIDE_DELAY);
    };

    this.container.addEventListener('mousemove', showControlsAndReset);
    this.container.addEventListener('click', showControlsAndReset);
    this.container.addEventListener('touchstart', showControlsAndReset);

    showControlsAndReset();

    this.video.addEventListener('play', () => {
      showControlsAndReset();
    });

    this.video.addEventListener('pause', () => {
      clearTimeout(this.controlsTimeout);
      this.showControls();
    });
  }

  showControls() {
    this.controls.classList.add('show');
  }

  hideControls() {
    if (this.video.paused) return;
    this.controls.classList.remove('show');
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
  }

  updateProgress() {
    // For live streams, show buffer progress instead of playback progress
    if (this.isLive && this.video.buffered.length > 0) {
      const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
      const bufferedStart = this.video.buffered.start(0);
      const bufferedRange = bufferedEnd - bufferedStart;
      
      // Show buffer as a percentage (approximate)
      if (bufferedRange > 0) {
        const bufferPercent = Math.min(100, (bufferedRange / 30) * 100); // Assume 30s buffer max
        if (this.progressFilled) {
          this.progressFilled.style.width = `${bufferPercent}%`;
        }
        if (this.progressHandle) {
          this.progressHandle.style.left = `${bufferPercent}%`;
        }
      }
      
      // Show "LIVE" in time display
      if (this.timeDisplay) {
        this.timeDisplay.textContent = 'LIVE';
      }
    } else if (this.video.duration) {
      // Regular video with duration
      const percent = (this.video.currentTime / this.video.duration) * 100;
      if (this.progressFilled) {
        this.progressFilled.style.width = `${percent}%`;
      }
      if (this.progressHandle) {
        this.progressHandle.style.left = `${percent}%`;
      }
      
      if (this.timeDisplay) {
        this.timeDisplay.textContent = this.formatTime(this.video.currentTime);
      }
    }
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

  toggleMute() {
    this.video.muted = !this.video.muted;
    if (!this.video.muted) {
      this.volumeSlider.value = this.video.volume * 100;
    }
    this.updateVolumeButton();
  }

  updateVolumeButton() {
    if (this.video.muted) {
      this.volumeBtn.classList.add('muted');
      this.volumeBtn.querySelector('.volume-icon').style.display = 'none';
      this.volumeBtn.querySelector('.volume-muted-icon').style.display = 'block';
    } else {
      this.volumeBtn.classList.remove('muted');
      this.volumeBtn.querySelector('.volume-icon').style.display = 'block';
      this.volumeBtn.querySelector('.volume-muted-icon').style.display = 'none';
    }
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
    this.settingsPanel.classList.toggle('show');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.video.volume = Math.min(1, this.video.volume + 0.1);
          this.volumeSlider.value = this.video.volume * 100;
          this.updateVolumeSliderFilled();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.video.volume = Math.max(0, this.video.volume - 0.1);
          this.volumeSlider.value = this.video.volume * 100;
          this.updateVolumeSliderFilled();
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

  loadTracks() {
    // Only load audio tracks for live streams
    this.setupDefaultTracks();
  }

  setupAudioTracks() {
    if (!this.audioTracksContainer) return;

    this.audioTracksContainer.innerHTML = '';

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

  selectAudioTrack(trackId) {
    this.currentAudioTrack = trackId;

    if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length > 0) {
      if (trackId === 'fil') {
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
          this.hls.audioTrack = 0;
        }
      } else {
        this.hls.audioTrack = 0;
      }
    }
  }

  setupDefaultTracks() {
    this.currentAudioTrack = 'fil';
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
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const player = new LiveVideoPlayer();
  player.setupFullscreenListeners();

  // Make player globally accessible for debugging
  window.liveVideoPlayer = player;
});

