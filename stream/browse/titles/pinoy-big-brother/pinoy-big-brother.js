// Pinoy Big Brother detail page functionality

// Define redirectToProfiles early to ensure it's available
window.redirectToProfiles = function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  console.log('redirectToProfiles called from pinoy-big-brother.js');
  console.log('Current location:', window.location.href);
  console.log('Current pathname:', window.location.pathname);
  
  try {
    const currentHref = window.location.href;
    
    // For file:// protocol (Windows: file:///D:/... or Unix: file:///...)
    if (currentHref.startsWith('file://')) {
      // Remove file:// prefix and handle Windows drive letter
      let path = currentHref.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
      
      // Remove the filename (index.html) if present
      if (path.endsWith('index.html') || path.endsWith('index.html/')) {
        path = path.substring(0, path.lastIndexOf('/'));
      }
      
      // Split path and find 'stream' directory
      const pathParts = path.split(/[/\\]/).filter(part => part.length > 0);
      const streamIndex = pathParts.findIndex(part => part.toLowerCase() === 'stream');
      
      if (streamIndex !== -1) {
        // Reconstruct path: everything up to and including 'stream', then add 'profiles'
        const streamPath = pathParts.slice(0, streamIndex + 1);
        
        // Handle Windows drive letter (e.g., D:)
        let profilesPath;
        if (pathParts[0] && pathParts[0].endsWith(':')) {
          // Windows path: D:/App/Website/stream/profiles/
          profilesPath = 'file:///' + streamPath.join('/') + '/profiles/';
        } else {
          // Unix path: /path/to/stream/profiles/
          profilesPath = 'file:///' + streamPath.join('/') + '/profiles/';
        }
        
        console.log('Redirecting to (file://):', profilesPath);
        window.location.href = profilesPath;
        return;
      }
    }
    
    // For http/https or fallback, use relative path
    // From stream/browse/titles/pinoy-big-brother/ to stream/profiles/
    const profilesPath = '../../../profiles/';
    console.log('Redirecting to (relative):', profilesPath);
    window.location.href = profilesPath;
  } catch (err) {
    console.error('Error in redirectToProfiles:', err);
    // Final fallback
    window.location.href = '../../../profiles/';
  }
};

(() => {
  function getActiveProfile() {
    try {
      const raw = localStorage.getItem('activeProfile');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function redirectTo(path) {
    window.location.href = path;
  }

  function updateAvatarWithIcon(element, profile) {
    if (!element || !profile) return;
    
    // Clear any existing content
    element.innerHTML = '';
    element.style.background = profile.is_kids
      ? 'linear-gradient(135deg, #22c55e, #15803d)'
      : 'linear-gradient(135deg, #22c55e, #0ea5e9)';
    
    // Display icon if available
    let hasValidIcon = false;
    if (profile.iconImage) {
      if (profile.iconImage.startsWith('http://') || profile.iconImage.startsWith('https://')) {
        const iconImg = document.createElement('img');
        iconImg.src = profile.iconImage;
        iconImg.alt = 'Profile icon';
        iconImg.style.width = '100%';
        iconImg.style.height = '100%';
        iconImg.style.objectFit = 'cover';
        iconImg.style.borderRadius = 'inherit';
        iconImg.onerror = function() {
          console.error('Failed to load profile icon:', {
            attemptedSrc: this.src,
            iconImage: profile.iconImage,
            currentPath: window.location.pathname
          });
          this.style.display = 'none';
        };
        element.appendChild(iconImg);
        hasValidIcon = true;
      }
    }
    
    if (!hasValidIcon && profile.iconEmoji) {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = profile.iconEmoji;
      iconSpan.style.fontSize = '1.2rem';
      iconSpan.style.display = 'flex';
      iconSpan.style.alignItems = 'center';
      iconSpan.style.justifyContent = 'center';
      iconSpan.style.width = '100%';
      iconSpan.style.height = '100%';
      element.appendChild(iconSpan);
    }
  }

  function updateDropdownProfile(profile) {
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    const navAvatar = document.querySelector('.nav__avatar');
    const kidsLogo = document.getElementById('profile-kids-logo');
    const textSpan = document.getElementById('profile-name-text');
    const label = document.getElementById('nav-profile-label');
    
    if (profile) {
      if (navAvatar) {
        updateAvatarWithIcon(navAvatar, profile);
      }
      
      if (dropdownAvatar) {
        if (profile.is_kids) {
          dropdownAvatar.style.background = 'linear-gradient(135deg, #22c55e, #15803d)';
        } else {
          dropdownAvatar.style.background = 'linear-gradient(135deg, #22c55e, #0ea5e9)';
        }
        updateAvatarWithIcon(dropdownAvatar, profile);
      }
      
      if (label) {
        label.textContent = profile.name || 'Profile';
      }
      
      if (profile.is_kids) {
        if (kidsLogo) {
          kidsLogo.style.display = 'flex';
        }
        if (dropdownAvatar) {
          dropdownAvatar.style.display = 'none';
        }
        if (textSpan) {
          textSpan.textContent = 'Kids';
        }
      } else {
        if (kidsLogo) {
          kidsLogo.style.display = 'none';
        }
        if (dropdownAvatar) {
          dropdownAvatar.style.display = 'block';
        }
        if (textSpan) {
          textSpan.textContent = profile.name || 'Profile';
        }
      }
    }
  }

  async function init() {
    console.log('pinoy-big-brother.js initialized');
    try {
      const supabase = initSupabase();
      if (!supabase) {
        console.error('Supabase not initialized');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        redirectTo('../../login/');
        return;
      }

      let profile = getActiveProfile();
      if (!profile) {
        redirectTo('../../../profiles/');
        return;
      }

      if (profile.id) {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('icon_id, icon_image, icon_emoji')
            .eq('id', profile.id)
            .eq('user_id', sessionData.session.user.id)
            .single();

          if (!error && profileData) {
            profile.iconId = profileData.icon_id;
            profile.iconImage = profileData.icon_image;
            profile.iconEmoji = profileData.icon_emoji;
            localStorage.setItem('activeProfile', JSON.stringify(profile));
          }
        } catch (e) {
          console.error('Error loading profile icons from database:', e);
          try {
            const iconsData = localStorage.getItem('profileIcons');
            if (iconsData) {
              const icons = JSON.parse(iconsData);
              if (icons[profile.id]) {
                profile = { ...profile, ...icons[profile.id] };
                localStorage.setItem('activeProfile', JSON.stringify(profile));
              }
            }
          } catch (e2) {
            console.error('Error loading profile icons from localStorage:', e2);
          }
        }
      }

      updateDropdownProfile(profile);

      const dropdown = document.getElementById('profile-dropdown');
      const manageProfiles = document.getElementById('manage-profiles');
      const signOut = document.getElementById('sign-out');
      const currentProfileItem = document.getElementById('current-profile-item');

      if (manageProfiles) {
        manageProfiles.addEventListener('click', (e) => {
          window.redirectToProfiles(e);
        });
      }

      if (signOut) {
        signOut.addEventListener('click', async () => {
          if (supabase) {
            await supabase.auth.signOut();
          }
          localStorage.removeItem('activeProfile');
          redirectTo('../../../');
        });
      }

      if (typeof window.toggleProfileDropdown === 'function') {
        console.log('Using global toggleProfileDropdown');
      } else {
        console.warn('toggleProfileDropdown not available');
      }

      const tabs = document.querySelectorAll('.title-detail__tab');
      const episodesList = document.getElementById('episodes-list');
      const highlightsList = document.getElementById('highlights-list');
      const seasonBar = document.getElementById('season-bar');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('title-detail__tab--active'));
          tab.classList.add('title-detail__tab--active');
          
          const tabName = tab.getAttribute('data-tab');
          
          if (tabName === 'highlights') {
            if (episodesList) episodesList.style.display = 'none';
            if (highlightsList) {
              highlightsList.style.display = 'flex';
              highlightsList.style.flexDirection = 'row';
              highlightsList.style.gap = '16px';
            }
            if (seasonBar) seasonBar.style.display = 'none';
            
            setupHighlightsNavigation();
          } else if (tabName === 'episodes') {
            if (episodesList) episodesList.style.display = 'flex';
            if (highlightsList) highlightsList.style.display = 'none';
            if (seasonBar) seasonBar.style.display = 'flex';
            
            setupEpisodeNavigation();
          } else {
            if (episodesList) episodesList.style.display = 'none';
            if (highlightsList) highlightsList.style.display = 'none';
            if (seasonBar) seasonBar.style.display = 'flex';
          }
          
          console.log('Switched to tab:', tabName);
        });
      });

      const seasonBtns = document.querySelectorAll('.title-detail__season-btn');
      seasonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          seasonBtns.forEach(b => b.classList.remove('title-detail__season-btn--active'));
          btn.classList.add('title-detail__season-btn--active');
          
          const season = btn.textContent.trim();
          console.log('Switched to season:', season);
        });
      });

      const heroVideo = document.getElementById('hero-video');
      const volumeBtn = document.getElementById('volume-btn');
      
      if (heroVideo && volumeBtn) {
        heroVideo.muted = true;
        volumeBtn.classList.add('muted');
        
        volumeBtn.addEventListener('click', () => {
          if (heroVideo.muted) {
            heroVideo.muted = false;
            volumeBtn.classList.remove('muted');
          } else {
            heroVideo.muted = true;
            volumeBtn.classList.add('muted');
          }
        });
      }

      // Setup scroll-based pause/play functionality with audio fade transitions
      const heroBanner = document.querySelector('.title-detail__hero');
      if (heroVideo && heroBanner) {
        // Variables to track fade state
        let fadeAnimationId = null;
        let isFading = false;
        const fadeDuration = 500; // 500ms fade duration
        const targetVolume = 1; // Full volume
        
        // Function to fade out audio
        function fadeOutAudio(callback) {
          if (isFading) return; // Prevent multiple fades
          isFading = true;
          
          const startVolume = heroVideo.volume;
          const startTime = performance.now();
          
          function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / fadeDuration, 1);
            
            // Ease out curve for smooth fade
            const easeOut = 1 - Math.pow(1 - progress, 3);
            heroVideo.volume = startVolume * (1 - easeOut);
            
            if (progress < 1) {
              fadeAnimationId = requestAnimationFrame(animate);
            } else {
              heroVideo.volume = 0;
              isFading = false;
              fadeAnimationId = null;
              if (callback) callback();
            }
          }
          
          fadeAnimationId = requestAnimationFrame(animate);
        }
        
        // Function to fade in audio
        function fadeInAudio(callback) {
          if (isFading) return; // Prevent multiple fades
          isFading = true;
          
          const startVolume = heroVideo.volume;
          const startTime = performance.now();
          
          function animate(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / fadeDuration, 1);
            
            // Ease in curve for smooth fade
            const easeIn = Math.pow(progress, 3);
            heroVideo.volume = startVolume + (targetVolume - startVolume) * easeIn;
            
            if (progress < 1) {
              fadeAnimationId = requestAnimationFrame(animate);
            } else {
              heroVideo.volume = targetVolume;
              isFading = false;
              fadeAnimationId = null;
              if (callback) callback();
            }
          }
          
          fadeAnimationId = requestAnimationFrame(animate);
        }
        
        // Use Intersection Observer to detect when hero banner is in view
        const observerOptions = {
          root: null, // Use viewport as root
          rootMargin: '0px',
          threshold: 0.1 // Trigger when 10% of the banner is visible
        };
        
        const observer = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            // Cancel any ongoing fade
            if (fadeAnimationId) {
              cancelAnimationFrame(fadeAnimationId);
              fadeAnimationId = null;
              isFading = false;
            }
            
            if (entry.isIntersecting) {
              // Hero banner is visible - play video with fade in
              if (heroVideo.paused) {
                // Start playing first, then fade in
                const playPromise = heroVideo.play();
                if (playPromise !== undefined) {
                  playPromise.then(function() {
                    heroVideo.volume = 0; // Start at 0 volume
                    fadeInAudio();
                  }).catch(function(error) {
                    console.log('Video play on scroll failed:', error);
                  });
                }
              } else if (heroVideo.volume < targetVolume) {
                // Video is already playing but volume is low - fade in
                fadeInAudio();
              }
            } else {
              // Hero banner is not visible - fade out then pause
              if (!heroVideo.paused && heroVideo.volume > 0) {
                fadeOutAudio(function() {
                  // Pause after fade out completes
                  heroVideo.pause();
                });
              } else if (!heroVideo.paused) {
                // If already at 0 volume, just pause
                heroVideo.pause();
              }
            }
          });
        }, observerOptions);
        
        // Start observing the hero banner
        observer.observe(heroBanner);
        console.log('Scroll-based pause/play with audio fade initialized');
      }

      loadSubtitlesFallback();

      setupEpisodeNavigation();

      // Setup Play button to navigate to player with user interaction flag
      const playButton = document.querySelector('.title-detail__btn--play');
      if (playButton) {
        playButton.addEventListener('click', () => {
          // Set flag indicating user interaction (clicking Play)
          sessionStorage.setItem('userInteracted', 'true');
          // Navigate to player
          window.location.href = '../../players/ep1.html';
        });
      }

      // Setup Episode thumbnail clicks to navigate to player
      const episodeCards = document.querySelectorAll('.title-detail__episode-card');
      episodeCards.forEach((card, index) => {
        const episodeNumber = card.querySelector('.title-detail__episode-card-number');
        const episodeNum = episodeNumber ? parseInt(episodeNumber.textContent.trim()) : null;
        
        // Make card clickable if it's a valid episode
        if (episodeNum === 1 || episodeNum === 2) {
          card.style.cursor = 'pointer';
          card.addEventListener('click', () => {
            // Set flag indicating user interaction (clicking episode)
            sessionStorage.setItem('userInteracted', 'true');
            // Navigate to appropriate episode player
            if (episodeNum === 1) {
              window.location.href = '../../players/ep1.html';
            } else if (episodeNum === 2) {
              window.location.href = '../../players/ep2.html';
            }
          });
        }
      });

    } catch (error) {
      console.error('Error in pinoy-big-brother.js init:', error);
    }
  }

  function setupHighlightsNavigation() {
    const highlightsList = document.getElementById('highlights-list');
    const navLeft = document.getElementById('episodes-nav-left');
    const navRight = document.getElementById('episodes-nav-right');

    if (!highlightsList || !navLeft || !navRight) {
      console.warn('Highlights navigation elements not found');
      return;
    }

    function updateNavButtons() {
      const scrollLeft = highlightsList.scrollLeft;
      const scrollWidth = highlightsList.scrollWidth;
      const clientWidth = highlightsList.clientWidth;
      const maxScroll = scrollWidth - clientWidth;

      if (scrollLeft <= 0) {
        navLeft.style.opacity = '0.3';
        navLeft.disabled = true;
      } else {
        navLeft.style.opacity = '1';
        navLeft.disabled = false;
      }

      if (scrollLeft >= maxScroll - 1) {
        navRight.style.opacity = '0.3';
        navRight.disabled = true;
      } else {
        navRight.style.opacity = '1';
        navRight.disabled = false;
      }
    }

    updateNavButtons();

    highlightsList.addEventListener('scroll', updateNavButtons);

    window.addEventListener('resize', updateNavButtons);

    navLeft.addEventListener('click', () => {
      const cardWidth = highlightsList.querySelector('.title-detail__episode-card')?.offsetWidth || 320;
      const gap = 16;
      const scrollAmount = cardWidth + gap;
      highlightsList.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    });

    navRight.addEventListener('click', () => {
      const cardWidth = highlightsList.querySelector('.title-detail__episode-card')?.offsetWidth || 320;
      const gap = 16;
      const scrollAmount = cardWidth + gap;
      highlightsList.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    });
  }

  function setupEpisodeNavigation() {
    const episodesList = document.getElementById('episodes-list');
    const navLeft = document.getElementById('episodes-nav-left');
    const navRight = document.getElementById('episodes-nav-right');

    if (!episodesList || !navLeft || !navRight) {
      console.warn('Episode navigation elements not found');
      return;
    }

    function updateNavButtons() {
      const scrollLeft = episodesList.scrollLeft;
      const scrollWidth = episodesList.scrollWidth;
      const clientWidth = episodesList.clientWidth;
      const maxScroll = scrollWidth - clientWidth;

      if (scrollLeft <= 0) {
        navLeft.style.opacity = '0.3';
        navLeft.disabled = true;
      } else {
        navLeft.style.opacity = '1';
        navLeft.disabled = false;
      }

      if (scrollLeft >= maxScroll - 1) {
        navRight.style.opacity = '0.3';
        navRight.disabled = true;
      } else {
        navRight.style.opacity = '1';
        navRight.disabled = false;
      }
    }

    updateNavButtons();

    episodesList.addEventListener('scroll', updateNavButtons);

    window.addEventListener('resize', updateNavButtons);

    navLeft.addEventListener('click', () => {
      const cardWidth = episodesList.querySelector('.title-detail__episode-card')?.offsetWidth || 320;
      const gap = 16;
      const scrollAmount = cardWidth + gap;
      episodesList.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    });

    navRight.addEventListener('click', () => {
      const cardWidth = episodesList.querySelector('.title-detail__episode-card')?.offsetWidth || 320;
      const gap = 16;
      const scrollAmount = cardWidth + gap;
      episodesList.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    });
  }

  function loadSubtitlesFallback() {
    const video = document.getElementById('hero-video');
    const subtitleOverlay = document.getElementById('subtitle-overlay');
    if (!video || !subtitleOverlay) {
      console.error('Video or subtitle overlay not found');
      return;
    }
    
    function hideNativeTracks() {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = 'hidden';
      }
    }
    
    video.addEventListener('loadedmetadata', hideNativeTracks);
    video.addEventListener('loadstart', hideNativeTracks);
    
    hideNativeTracks();
    
    const vttUrl = 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/pbbpreview.vtt?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vcGJicHJldmlldy52dHQiLCJpYXQiOjE3NjY1NTEwNTQsImV4cCI6MjA4MTkxMTA1NH0.uLBGLL4eCwvbrkpI3jrDrfdz3XzrkRurFu291t72osI';
    
    console.log('Loading subtitles...');
    
    fetch(vttUrl)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch VTT: ' + response.status);
        console.log('VTT file fetched successfully');
        return response.text();
      })
      .then(vttText => {
        console.log('VTT text received, length:', vttText.length);
        
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
                start: parseVTTTime(start),
                end: parseVTTTime(end),
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
        
        console.log('Parsed', cues.length, 'subtitle cues');
        
        setupSubtitleDisplayFromCues(cues);
      })
      .catch(error => {
        console.error('Failed to load subtitles:', error);
      });
  }
  
  function setupSubtitleDisplayFromCues(cues) {
    const video = document.getElementById('hero-video');
    const subtitleOverlay = document.getElementById('subtitle-overlay');
    if (!video || !subtitleOverlay || !cues || cues.length === 0) {
      console.error('setupSubtitleDisplayFromCues: Missing elements or cues', { video: !!video, subtitleOverlay: !!subtitleOverlay, cuesCount: cues ? cues.length : 0 });
      return;
    }
    
    console.log('Setting up subtitle display with', cues.length, 'cues');
    
    subtitleOverlay.style.cssText = 'position: absolute !important; bottom: 70px !important; left: 55% !important; transform: translateX(-50%) !important; background: rgba(0, 0, 0, 0.9) !important; color: #ffffff !important; z-index: 10000 !important; padding: 10px 20px !important; border-radius: 4px !important; font-size: 1.1rem !important; font-weight: 600 !important; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9) !important; max-width: 80% !important; text-align: center !important; opacity: 0 !important; visibility: hidden !important; display: block !important; pointer-events: none !important;';
    
    function updateSubtitle() {
      if (!video || video.paused) return;
      
      const currentTime = video.currentTime;
      let activeCue = null;
      
      for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        if (currentTime >= cue.start && currentTime <= cue.end) {
          activeCue = cue;
          break;
        }
      }
      
      if (activeCue && activeCue.text) {
        subtitleOverlay.textContent = activeCue.text;
        subtitleOverlay.style.setProperty('opacity', '1', 'important');
        subtitleOverlay.style.setProperty('visibility', 'visible', 'important');
        subtitleOverlay.style.setProperty('display', 'block', 'important');
        subtitleOverlay.classList.add('show');
      } else {
        subtitleOverlay.style.setProperty('opacity', '0', 'important');
        subtitleOverlay.style.setProperty('visibility', 'hidden', 'important');
        subtitleOverlay.classList.remove('show');
      }
    }
    
    video.addEventListener('timeupdate', updateSubtitle);
    
    updateSubtitle();
    
    setInterval(updateSubtitle, 100);
    
    console.log('Subtitle display setup complete');
  }
  
  function parseVTTTime(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const hours = parseFloat(parts[0]) || 0;
      const minutes = parseFloat(parts[1]) || 0;
      const seconds = parseFloat(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  document.addEventListener('DOMContentLoaded', init);
})();