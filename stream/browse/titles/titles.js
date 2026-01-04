// Titles detail page functionality
(() => {
  let currentTitle = null;

  function getTitleIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('title') || 'stranger-things'; // Default to stranger-things
  }

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

  async function loadTitleData() {
    const titleId = getTitleIdFromUrl();
    
    // Use API if available, otherwise fallback to hardcoded data
    if (window.titlesAPI) {
      currentTitle = await window.titlesAPI.getTitleById(titleId);
    } else {
      // Fallback to old method
      currentTitle = getTitleById(titleId);
    }
    
    if (!currentTitle) {
      console.error('Title not found:', titleId);
      // Redirect to browse if title not found
      redirectTo('../index.html');
      return;
    }

    // Update page title
    document.title = `Stream | ${currentTitle.title}`;

    // Update hero background
    const heroBackground = document.getElementById('title-hero-background');
    if (heroBackground) {
      if (currentTitle.backgroundImage) {
        heroBackground.style.backgroundImage = `url(${currentTitle.backgroundImage})`;
        heroBackground.style.backgroundSize = 'cover';
        heroBackground.style.backgroundPosition = 'center';
        heroBackground.style.backgroundRepeat = 'no-repeat';
      } else if (currentTitle.backgroundGradient) {
        heroBackground.style.background = currentTitle.backgroundGradient;
      }
      // Add overlay effects
      heroBackground.style.backgroundImage = (heroBackground.style.backgroundImage || '') + 
        (heroBackground.style.backgroundImage ? ', ' : '') +
        `radial-gradient(circle at 20% 50%, rgba(79, 70, 229, 0.3) 0%, transparent 50%),
         radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)`;
    }

    // Update title name
    const titleName = document.getElementById('title-name');
    if (titleName) {
      titleName.textContent = currentTitle.title;
    }

    // Update meta information
    const matchEl = document.getElementById('title-match');
    const yearEl = document.getElementById('title-year');
    const ratingEl = document.getElementById('title-rating');
    const seasonsEl = document.getElementById('title-seasons');
    const qualityEl = document.getElementById('title-quality');

    // Clear all separators first
    [matchEl, yearEl, ratingEl, seasonsEl, qualityEl].forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.classList.remove('has-separator');
      }
    });

    // Build visible meta items array
    const visibleItems = [];
    if (currentTitle.match && matchEl) {
      matchEl.textContent = `${currentTitle.match}% Match`;
      matchEl.style.display = 'inline';
      visibleItems.push(matchEl);
    }
    if (currentTitle.year && yearEl) {
      yearEl.textContent = currentTitle.year.toString();
      yearEl.style.display = 'inline';
      visibleItems.push(yearEl);
    }
    if (currentTitle.rating && ratingEl) {
      ratingEl.textContent = currentTitle.rating;
      ratingEl.style.display = 'inline';
      visibleItems.push(ratingEl);
    }
    if (currentTitle.seasons && seasonsEl) {
      const seasonText = currentTitle.seasons === 1 ? '1 Season' : `${currentTitle.seasons} Seasons`;
      seasonsEl.textContent = seasonText;
      seasonsEl.style.display = 'inline';
      visibleItems.push(seasonsEl);
    }
    if (currentTitle.quality && qualityEl) {
      qualityEl.textContent = currentTitle.quality;
      qualityEl.style.display = 'inline';
      visibleItems.push(qualityEl);
    }

    // Add separators to all but the last visible item
    visibleItems.forEach((el, index) => {
      if (index < visibleItems.length - 1) {
        el.classList.add('has-separator');
      }
    });

    // Update description
    const descriptionEl = document.getElementById('title-description');
    if (descriptionEl) {
      descriptionEl.textContent = currentTitle.description;
    }

    // Update season selector
    const seasonLabel = document.getElementById('season-label');
    if (seasonLabel && currentTitle.currentSeason) {
      seasonLabel.textContent = `Season ${currentTitle.currentSeason}`;
    }

    // Render episodes
    renderEpisodes();

    // Render similar titles
    renderSimilarTitles();
  }

  async function renderEpisodes() {
    if (!currentTitle || !currentTitle.episodes) return;

    const episodesList = document.getElementById('episodes-list');
    if (!episodesList) return;

    episodesList.innerHTML = '';

    // Initialize watch history if available
    if (window.watchHistory && typeof window.watchHistory.init === 'function') {
      await window.watchHistory.init();
    }

    for (const episode of currentTitle.episodes) {
      const episodeEl = document.createElement('div');
      episodeEl.className = 'title-detail__episode';

      // Get watch progress for this episode
      let progressPercent = 0;
      if (window.watchHistory && episode.src) {
        try {
          const progress = await window.watchHistory.getProgress(episode.src, episode.title);
          if (progress) {
            progressPercent = progress.progressPercent || 0;
          }
        } catch (e) {
          console.error('Error loading progress for episode:', e);
        }
      }

      const episodeNumber = document.createElement('div');
      episodeNumber.className = 'title-detail__episode-number';
      episodeNumber.textContent = episode.number;

      const episodeContent = document.createElement('div');
      episodeContent.className = 'title-detail__episode-content';

      const thumbnailEl = document.createElement('div');
      thumbnailEl.className = 'title-detail__episode-thumbnail';
      
      // Add progress bar if there's progress
      if (progressPercent > 0 && progressPercent < 95) {
        const progressBar = document.createElement('div');
        progressBar.className = 'title-detail__episode-progress-bar';
        
        const progressFilled = document.createElement('div');
        progressFilled.className = 'title-detail__episode-progress-filled';
        progressFilled.style.width = `${progressPercent}%`;
        
        progressBar.appendChild(progressFilled);
        thumbnailEl.appendChild(progressBar);
      }

      const episodeInfo = document.createElement('div');
      episodeInfo.className = 'title-detail__episode-info';

      const episodeTitle = document.createElement('h3');
      episodeTitle.className = 'title-detail__episode-title';
      episodeTitle.textContent = episode.title;

      const episodeDescription = document.createElement('p');
      episodeDescription.className = 'title-detail__episode-description';
      episodeDescription.textContent = episode.description;

      const episodeMeta = document.createElement('div');
      episodeMeta.className = 'title-detail__episode-meta';
      const durationSpan = document.createElement('span');
      durationSpan.textContent = episode.duration;
      episodeMeta.appendChild(durationSpan);

      episodeInfo.appendChild(episodeTitle);
      episodeInfo.appendChild(episodeDescription);
      episodeInfo.appendChild(episodeMeta);

      episodeContent.appendChild(thumbnailEl);
      episodeContent.appendChild(episodeInfo);

      episodeEl.appendChild(episodeNumber);
      episodeEl.appendChild(episodeContent);

      episodesList.appendChild(episodeEl);
    }
  }

  function renderSimilarTitles() {
    if (!currentTitle || !currentTitle.similarTitles) return;

    const moreGrid = document.getElementById('more-grid');
    if (!moreGrid) return;

    moreGrid.innerHTML = '';

    currentTitle.similarTitles.forEach((similar) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'title-detail__more-item';
      itemEl.style.cursor = 'pointer';
      itemEl.addEventListener('click', async () => {
        // Try to find the title ID for the similar title
        let similarTitleId = null;
        
        // If API is available, search for the title
        if (window.titlesAPI) {
          try {
            const allTitles = await window.titlesAPI.getAllTitles();
            const foundTitle = allTitles.find(t => 
              t.title.toLowerCase() === similar.title.toLowerCase()
            );
            if (foundTitle) {
              similarTitleId = foundTitle.id;
            }
          } catch (e) {
            console.error('Error searching for similar title:', e);
          }
        }
        
        // Fallback to hardcoded data if available
        if (!similarTitleId && typeof TITLES_DATA !== 'undefined') {
          similarTitleId = Object.keys(TITLES_DATA).find(id => 
            TITLES_DATA[id].title.toLowerCase() === similar.title.toLowerCase()
          );
        }
        
        if (similarTitleId) {
          window.location.href = `index.html?id=${similarTitleId}`;
        }
      });

      const seasonText = similar.seasons === 1 ? '1 Season' : `${similar.seasons} Seasons`;

      itemEl.innerHTML = `
        <div class="title-detail__more-thumbnail"></div>
        <div class="title-detail__more-info">
          <h3>${similar.title}</h3>
          <p>${similar.year} • ${similar.rating} • ${seasonText}</p>
        </div>
      `;

      moreGrid.appendChild(itemEl);
    });
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
    if (profile.iconImage && (profile.iconImage.startsWith('http://') || profile.iconImage.startsWith('https://'))) {
      const iconImg = document.createElement('img');
      // iconImage is a Supabase URL
      iconImg.src = profile.iconImage;
      iconImg.alt = 'Profile icon';
      iconImg.style.width = '100%';
      iconImg.style.height = '100%';
      iconImg.style.objectFit = 'cover';
      iconImg.style.borderRadius = 'inherit';
      element.appendChild(iconImg);
      hasValidIcon = true;
    }
    
    // Display emoji if no valid icon image
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
      // Update nav avatar (top right corner)
      if (navAvatar) {
        updateAvatarWithIcon(navAvatar, profile);
      }
      
      // Update dropdown avatar
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
        // Show kids logo for kids profile
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
        // Hide kids logo for regular profile
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

      // Require a chosen profile
      let profile = getActiveProfile();
      if (!profile) {
        redirectTo('../../profiles/');
        return;
      }

      // Load icon data from database if profile has an ID
      if (profile.id) {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('icon_id, icon_image, icon_emoji')
            .eq('id', profile.id)
            .eq('user_id', sessionData.session.user.id)
            .single();

          if (!error && profileData) {
            // Merge icon data from database
            profile.iconId = profileData.icon_id;
            profile.iconImage = profileData.icon_image;
            profile.iconEmoji = profileData.icon_emoji;
            // Update localStorage with icon data
            localStorage.setItem('activeProfile', JSON.stringify(profile));
          }
        } catch (e) {
          console.error('Error loading profile icons from database:', e);
          // Fallback to localStorage if database fails
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

      // Update profile display
      updateDropdownProfile(profile);

      // Load and display title data (now async)
      await loadTitleData();

      // Setup dropdown handlers
      const dropdown = document.getElementById('profile-dropdown');
      const manageProfiles = document.getElementById('manage-profiles');
      const signOut = document.getElementById('sign-out');
      const currentProfileItem = document.getElementById('current-profile-item');

      if (currentProfileItem) {
        currentProfileItem.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Use the global redirectToProfiles function to ensure correct path
          if (window.redirectToProfiles) {
            window.redirectToProfiles(e);
          } else {
            redirectTo('../../profiles/');
          }
        });
      }

      if (manageProfiles) {
        manageProfiles.addEventListener('click', () => {
          redirectTo('../../profiles/');
        });
      }

      if (signOut) {
        signOut.addEventListener('click', async () => {
          if (supabase) {
            await supabase.auth.signOut();
          }
          localStorage.removeItem('activeProfile');
          redirectTo('../../');
        });
      }

      // Use the global toggleProfileDropdown function from browse.js
      if (typeof window.toggleProfileDropdown === 'function') {
        console.log('Using global toggleProfileDropdown');
      } else {
        console.warn('toggleProfileDropdown not available');
      }

    } catch (error) {
      console.error('Error in titles.js init:', error);
    }
  }

  // Expose redirect function globally
  window.redirectToProfiles = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Calculate correct path based on current location
    const currentPath = window.location.pathname;
    let profilesPath = '../../profiles/';
    // If we're in titles subdirectory, need to go up two levels
    if (currentPath.includes('/browse/titles/')) {
      profilesPath = '../../profiles/';
    } else if (currentPath.includes('/browse/')) {
      profilesPath = '../profiles/';
    }
    window.location.href = profilesPath;
  };

  // Expose function to navigate to a title detail page
  window.navigateToTitle = function(titleId) {
    window.location.href = `titles/index.html?id=${titleId}`;
  };

  document.addEventListener('DOMContentLoaded', init);
})();

