// Set global toggle function IMMEDIATELY - before IIFE executes
// This ensures it's available even if the rest of the script fails
console.log('browse.js: Setting up global toggleProfileDropdown BEFORE IIFE');
window.toggleProfileDropdown = function (e) {
  console.log('toggleProfileDropdown called (global function)');
  if (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  const dd = document.getElementById('profile-dropdown');
  if (dd) {
    const isOpen = dd.classList.contains('is-open') || dd.getAttribute('data-open') === 'true';
    console.log('Dropdown state - isOpen:', isOpen);
    if (isOpen) {
      console.log('Closing dropdown');
      dd.classList.remove('is-open');
      dd.setAttribute('data-open', 'false');
      dd.style.setProperty('opacity', '0', 'important');
      dd.style.setProperty('visibility', 'hidden', 'important');
      dd.style.setProperty('pointer-events', 'none', 'important');
    } else {
      console.log('Opening dropdown');
      dd.classList.add('is-open');
      dd.setAttribute('data-open', 'true');
      dd.style.setProperty('opacity', '1', 'important');
      dd.style.setProperty('visibility', 'visible', 'important');
      dd.style.setProperty('pointer-events', 'auto', 'important');
      dd.style.setProperty('display', 'block', 'important');

      // Verify it's visible
      setTimeout(() => {
        const computed = window.getComputedStyle(dd);
        console.log('After opening - computed styles:', {
          opacity: computed.opacity,
          visibility: computed.visibility,
          display: computed.display
        });
        if (computed.opacity === '0' || computed.visibility === 'hidden') {
          console.log('Still hidden, forcing again');
          dd.style.setProperty('opacity', '1', 'important');
          dd.style.setProperty('visibility', 'visible', 'important');
        }
      }, 50);
    }
  } else {
    console.error('Dropdown element not found in global function');
  }
};
console.log('browse.js: Global toggleProfileDropdown set:', typeof window.toggleProfileDropdown);

(() => {
  // Debug: Log when script starts executing
  console.log('browse.js script started executing (IIFE)');

  function redirectTo(path) {
    console.log('Redirecting to:', path);
    window.location.href = path;
  }

  // Expose redirect function globally for inline onclick
  window.redirectToProfiles = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    console.log('redirectToProfiles called - redirecting to profiles page');

    try {
      // Construct absolute URL to profiles directory (most reliable method)
      const currentUrl = new URL(window.location.href);
      let pathname = currentUrl.pathname;

      // Find the index of '/stream' in the pathname
      const streamIndex = pathname.indexOf('/stream');
      if (streamIndex !== -1) {
        // Get everything up to and including '/stream', then add '/profiles/'
        const basePath = pathname.substring(0, streamIndex + '/stream'.length);
        const profilesPath = basePath + '/profiles/';
        const profilesUrl = currentUrl.protocol + '//' + currentUrl.host + profilesPath;

        console.log('Redirecting to:', profilesUrl);
        window.location.href = profilesUrl;
        return;
      }
    } catch (err) {
      console.error('Error constructing absolute URL:', err);
    }

    // Fallback: Calculate relative path based on current location
    const currentPath = window.location.pathname;
    const currentHref = window.location.href;

    let profilesPath = '../profiles/';

    // Check if we're in pinoy-big-brother subfolder (need to go up 3 levels)
    if (currentPath.match(/\/browse\/titles\/pinoy-big-brother\//) || currentHref.match(/\/browse\/titles\/pinoy-big-brother\//)) {
      profilesPath = '../../../profiles/';
    }
    // Check if we're in titles directory (need to go up 2 levels)
    else if (currentPath.match(/\/browse\/titles\//) || currentHref.match(/\/browse\/titles\//)) {
      profilesPath = '../../profiles/';
    }
    // If we're in browse directory (need to go up 1 level)
    else if (currentPath.match(/\/browse\//) || currentHref.match(/\/browse\//)) {
      profilesPath = '../profiles/';
    }

    console.log('Calculated profiles path:', profilesPath, 'from pathname:', currentPath, 'href:', currentHref);
    redirectTo(profilesPath);
  };

  function getActiveProfile() {
    try {
      const raw = localStorage.getItem('activeProfile');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function handleSignOut() {
    const supabase = initSupabase();
    if (!supabase) return;

    await supabase.auth.signOut();
    localStorage.removeItem('activeProfile');
    redirectTo('../');
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

    if (profile && textSpan) {
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

      if (profile.is_kids) {
        // Show kids logo for kids profile
        if (kidsLogo) {
          kidsLogo.style.display = 'flex';
        }
        if (dropdownAvatar) {
          dropdownAvatar.style.display = 'none';
        }
        textSpan.textContent = 'Kids';
      } else {
        // Hide kids logo for regular profile
        if (kidsLogo) {
          kidsLogo.style.display = 'none';
        }
        if (dropdownAvatar) {
          dropdownAvatar.style.display = 'block';
        }
        textSpan.textContent = profile.name || 'Profile';
      }
    }
  }

  function setupDropdownHandlers() {
    const dropdown = document.getElementById('profile-dropdown');
    const manageProfiles = document.getElementById('manage-profiles');
    const transferProfile = document.getElementById('transfer-profile');
    const account = document.getElementById('account');
    const helpCenter = document.getElementById('help-center');
    const signOut = document.getElementById('sign-out');
    const currentProfileItem = document.getElementById('current-profile-item');

    // Handle first item click - redirect to profiles to switch
    if (currentProfileItem) {
      // Add multiple handlers to ensure it works
      const handleProfileClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Current profile item clicked (browse.js) - redirecting to profiles');
        redirectTo('../profiles/');
        return false;
      };

      // Add handlers in both phases
      currentProfileItem.addEventListener('click', handleProfileClick, { capture: true });
      currentProfileItem.addEventListener('click', handleProfileClick, { capture: false });

      // Also make it visually clear it's clickable
      currentProfileItem.style.cursor = 'pointer';
      currentProfileItem.style.setProperty('cursor', 'pointer', 'important');

      console.log('Current profile item click handler set up');
    } else {
      console.error('Current profile item not found!');
    }

    if (manageProfiles) {
      manageProfiles.addEventListener('click', () => {
        redirectTo('../profiles/');
      });
    }

    if (transferProfile) {
      transferProfile.addEventListener('click', () => {
        // TODO: Implement transfer profile functionality
        console.log('Transfer profile clicked');
      });
    }

    if (account) {
      account.addEventListener('click', () => {
        // TODO: Implement account page
        console.log('Account clicked');
      });
    }

    if (helpCenter) {
      helpCenter.addEventListener('click', () => {
        // TODO: Implement help center
        console.log('Help center clicked');
      });
    }

    if (signOut) {
      signOut.addEventListener('click', handleSignOut);
    }
  }

  function initializeDropdown() {
    console.log('initializeDropdown called');
    // Wait a bit to ensure DOM is ready and other scripts have loaded
    setTimeout(() => {
      console.log('initializeDropdown timeout fired');
      const dropdown = document.getElementById('profile-dropdown');
      const profileContainer = document.querySelector('.nav__profile-container');

      console.log('Elements found:', {
        dropdown: !!dropdown,
        profileContainer: !!profileContainer,
        dropdownId: dropdown ? dropdown.id : 'not found',
        containerClass: profileContainer ? profileContainer.className : 'not found'
      });

      if (!dropdown || !profileContainer) {
        console.error('Dropdown elements not found', { dropdown: !!dropdown, profileContainer: !!profileContainer });
        return;
      }

      // Ensure container has position relative
      const containerStyle = window.getComputedStyle(profileContainer);
      if (containerStyle.position === 'static') {
        profileContainer.style.setProperty('position', 'relative', 'important');
        console.log('Set container position to relative');
      }

      // Force initial hidden state
      dropdown.classList.remove('is-open');
      dropdown.setAttribute('data-open', 'false');
      dropdown.style.setProperty('opacity', '0', 'important');
      dropdown.style.setProperty('visibility', 'hidden', 'important');
      dropdown.style.setProperty('pointer-events', 'none', 'important');

      const profileTrigger = document.querySelector('.nav__profile-trigger');
      const profileAvatar = document.querySelector('.nav__avatar');
      const profileLabel = document.getElementById('nav-profile-label');
      const profileArrow = document.querySelector('.nav__profile-arrow');

      // Toggle dropdown on click - DISABLED: Use global function from HTML instead
      // This local function should NOT be called - the HTML inline onclick handles it
      const toggleDropdown = (e) => {
        console.warn('browse.js toggleDropdown called - this should not happen!');

        // Check if dropdown was just opened (within last 500ms)
        if (window._dropdownState && window._dropdownState.openTime) {
          const timeSinceOpen = Date.now() - window._dropdownState.openTime;
          if (timeSinceOpen < 500 && window._dropdownState.isOpen) {
            console.log('Ignoring toggleDropdown - dropdown just opened', timeSinceOpen + 'ms ago');
            return false;
          }
        }

        // Always use global function if available
        if (window.toggleProfileDropdown && typeof window.toggleProfileDropdown === 'function') {
          console.log('browse.js: Redirecting to global toggleProfileDropdown');
          return window.toggleProfileDropdown(e);
        }

        // If global function doesn't exist, log error and do nothing
        console.error('Global toggleProfileDropdown not available! Doing nothing.');
        return false;
      };

      // Note: toggleProfileDropdown is already defined at top level (outside IIFE)
      // This ensures it's available immediately, even if init() fails or redirects

      // Expose a test function
      window.testDropdown = () => {
        const dd = document.getElementById('profile-dropdown');
        console.log('Dropdown element:', dd);
        console.log('Dropdown classes:', dd ? dd.className : 'N/A');
        console.log('Dropdown styles:', dd ? window.getComputedStyle(dd) : 'N/A');
        if (dd) {
          dd.classList.add('is-open');
          dd.setAttribute('data-open', 'true');
          dd.style.setProperty('opacity', '1', 'important');
          dd.style.setProperty('visibility', 'visible', 'important');
          dd.style.setProperty('pointer-events', 'auto', 'important');
          console.log('Test: Forced dropdown open');
        }
      };

      // Show dropdown (for debugging - can be called directly)
      window.showProfileDropdown = () => {
        dropdown.classList.add('is-open');
        dropdown.setAttribute('style', visibleStyle);
      };

      // Hide dropdown
      const hideDropdown = () => {
        dropdown.classList.remove('is-open');
        dropdown.setAttribute('data-open', 'false');
        dropdown.style.setProperty('opacity', '0', 'important');
        dropdown.style.setProperty('visibility', 'hidden', 'important');
        dropdown.style.setProperty('pointer-events', 'none', 'important');
      };

      // Make profile trigger clickable with multiple methods for maximum compatibility
      if (profileTrigger) {
        profileTrigger.style.setProperty('cursor', 'pointer', 'important');
        profileTrigger.style.setProperty('pointer-events', 'auto', 'important');
        profileTrigger.setAttribute('role', 'button');
        profileTrigger.setAttribute('tabindex', '0');

        // Don't add click handlers here - the inline onclick in HTML already handles it
        // Adding handlers here causes double-toggling
        // The inline onclick will call window.toggleProfileDropdown which is defined in HTML
        console.log('Skipping browse.js click handlers - using inline onclick instead');

        // Also support keyboard - use global function
        profileTrigger.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (window.toggleProfileDropdown && typeof window.toggleProfileDropdown === 'function') {
              window.toggleProfileDropdown(e);
            }
          }
        });
      }

      // Make individual elements clickable and ensure cursor
      // NO CLICK HANDLERS - inline onclick in HTML handles it
      if (profileAvatar) {
        profileAvatar.style.setProperty('cursor', 'pointer', 'important');
        profileAvatar.style.setProperty('pointer-events', 'auto', 'important');
        // No click handler - inline onclick in HTML handles it
      }

      if (profileLabel) {
        profileLabel.style.setProperty('cursor', 'pointer', 'important');
        profileLabel.style.setProperty('pointer-events', 'auto', 'important');
        // No click handler - inline onclick in HTML handles it
      }

      if (profileArrow) {
        profileArrow.style.setProperty('cursor', 'pointer', 'important');
        profileArrow.style.setProperty('pointer-events', 'auto', 'important');
        // No click handler - inline onclick in HTML handles it
      }

      // Close dropdown when clicking outside - robust version with state management
      let clickTimeout;
      const handleOutsideClick = (e) => {
        const now = Date.now();
        const clickId = 'outside_' + now + '_' + Math.random().toString(36).substr(2, 9);

        console.log('=== handleOutsideClick called ===', clickId);
        console.log('Event details:', {
          id: clickId,
          target: e.target,
          currentTarget: e.currentTarget,
          handled: e._dropdownHandled,
          handledId: e._dropdownHandled,
          toggleTime: e._dropdownToggleTime,
          state: window._dropdownState ? JSON.parse(JSON.stringify(window._dropdownState)) : null
        });

        // Check if this event was already handled by toggle function
        if (e._dropdownHandled) {
          console.log('Ignoring click - already handled by toggle', {
            handledId: e._dropdownHandled,
            clickId: clickId
          });
          return;
        }

        // Check if click is on the trigger/container - if so, ignore it completely
        const clickedOnTrigger = profileContainer && profileContainer.contains(e.target);
        if (clickedOnTrigger) {
          console.log('Ignoring click - clicked on trigger/container', {
            target: e.target,
            clickId: clickId
          });
          return;
        }

        // Check if this is the same click that opened it (within 100ms)
        if (e._dropdownToggleTime && (now - e._dropdownToggleTime) < 100) {
          console.log('Ignoring click - same click that opened dropdown', {
            toggleTime: e._dropdownToggleTime,
            now: now,
            diff: now - e._dropdownToggleTime,
            clickId: clickId
          });
          return;
        }

        // Check protection state
        if (window._dropdownState) {
          if (window._dropdownState.isOpening) {
            console.log('Ignoring click - dropdown is opening', clickId);
            return;
          }
          if (now < window._dropdownState.ignoreClicksUntil) {
            console.log('Ignoring click - within protection period', {
              now: now,
              ignoreUntil: window._dropdownState.ignoreClicksUntil,
              remaining: window._dropdownState.ignoreClicksUntil - now,
              clickId: clickId
            });
            return;
          }
        }

        // Check if click is inside container or dropdown
        const clickedInsideContainer = profileContainer && profileContainer.contains(e.target);
        const clickedInsideDropdown = dropdown && dropdown.contains(e.target);

        // If click is inside, don't close
        if (clickedInsideContainer || clickedInsideDropdown) {
          console.log('Click inside container/dropdown, not closing', {
            insideContainer: clickedInsideContainer,
            insideDropdown: clickedInsideDropdown,
            target: e.target,
            clickId: clickId
          });
          return;
        }

        // Check if dropdown is actually open
        const isOpen = dropdown.classList.contains('is-open') ||
          dropdown.getAttribute('data-open') === 'true' ||
          (window._dropdownState && window._dropdownState.isOpen);

        if (!isOpen) {
          console.log('Dropdown not open, ignoring click', clickId);
          return;
        }

        console.log('Outside click detected, scheduling close check', clickId);

        // Clear any pending timeout
        clearTimeout(clickTimeout);

        // Use a delay to ensure this isn't the same click that opened it
        clickTimeout = setTimeout(() => {
          console.log('Outside click timeout fired', clickId);

          // Re-check state after delay
          if (window._dropdownState) {
            if (window._dropdownState.isOpening || Date.now() < window._dropdownState.ignoreClicksUntil) {
              console.log('Ignoring click after delay - still protected', {
                isOpening: window._dropdownState.isOpening,
                ignoreUntil: window._dropdownState.ignoreClicksUntil,
                now: Date.now(),
                clickId: clickId
              });
              return;
            }
          }

          // Double-check if still inside
          const stillInsideContainer = profileContainer && profileContainer.contains(e.target);
          const stillInsideDropdown = dropdown && dropdown.contains(e.target);

          if (stillInsideContainer || stillInsideDropdown) {
            console.log('Still inside after delay, not closing', clickId);
            return;
          }

          // Final check if dropdown is still open
          const stillOpen = dropdown.classList.contains('is-open') ||
            dropdown.getAttribute('data-open') === 'true';

          if (stillOpen) {
            console.log('CLOSING dropdown - confirmed outside click after delay', clickId);
            hideDropdown();
            if (window._dropdownState) {
              window._dropdownState.isOpen = false;
            }
          } else {
            console.log('Dropdown already closed, not doing anything', clickId);
          }
        }, 300);
      };

      // Register handler with delay to ensure it runs after toggle handlers
      setTimeout(() => {
        document.addEventListener('click', handleOutsideClick, { capture: false });
        console.log('Outside click handler registered in browse.js');
      }, 150);

      // Prevent dropdown from closing when clicking inside it
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, { capture: false });

      dropdown.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, { capture: false });

      // Also prevent closing when clicking on the trigger
      if (profileTrigger) {
        profileTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
        }, { capture: false });

        profileTrigger.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
        }, { capture: false });
      }

      // Prevent closing when clicking on container
      if (profileContainer) {
        profileContainer.addEventListener('click', (e) => {
          e.stopPropagation();
        }, { capture: false });

        profileContainer.addEventListener('mousedown', (e) => {
          e.stopPropagation();
        }, { capture: false });
      }
    }, 200); // Wait 200ms for other scripts to load
  }

  async function init() {
    console.log('init() function called');
    try {
      const supabase = initSupabase();
      if (!supabase) {
        console.error('Supabase not initialized');
        // Still initialize dropdown even without auth
        initializeDropdown();
        return;
      }

      // Require an auth session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('No session, redirecting to login');
        redirectTo('../login/');
        return;
      }

      // Require a chosen profile
      let profile = getActiveProfile();
      if (!profile) {
        console.log('No profile, redirecting to profiles');
        redirectTo('../profiles/');
        return;
      }

      // Check if profile has a lock code and verify it
      let hasLockCode = false;
      if (profile.id) {
        // Check database first
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('lock_code')
            .eq('id', profile.id)
            .eq('user_id', sessionData.session.user.id)
            .single();

          if (!error && profileData && profileData.lock_code) {
            hasLockCode = true;
          }
        } catch (e) {
          console.error('Error checking profile lock from database:', e);
        }
      }

      // Also check localStorage (fallback for profiles saved before database column existed)
      if (!hasLockCode && profile.lockCode) {
        hasLockCode = true;
      }

      if (hasLockCode) {
        // Profile has a lock code, check if it's been verified in this session
        const isUnlocked = sessionStorage.getItem(`profile_${profile.id}_unlocked`) === 'true';
        if (!isUnlocked) {
          // Not verified, redirect back to profiles to enter code
          console.log('Profile is locked, redirecting to profiles');
          redirectTo('../profiles/');
          return;
        }
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

      const label = document.getElementById('nav-profile-label');
      if (label) {
        label.textContent = profile.name || 'Profile';
      }

      // Update dropdown to show current profile first
      updateDropdownProfile(profile);

      // Initialize dropdown behavior (must be after profile update)
      initializeDropdown();

      // Setup other handlers
      setupDropdownHandlers();
      console.log('init() completed successfully');

      // Load and display Continue Watching section (with delay to ensure DOM is ready)
      setTimeout(() => {
        loadContinueWatching();
      }, 500);
    } catch (error) {
      console.error('Error in init():', error);
      // Still try to initialize dropdown even if there's an error
      try {
        initializeDropdown();
      } catch (e) {
        console.error('Error initializing dropdown:', e);
      }
      setTimeout(() => {
        loadContinueWatching();
      }, 500);
    }
  }

  // Load and display Continue Watching section
  async function loadContinueWatching() {
    console.log('loadContinueWatching called');

    // Wait for watch history to be available
    if (!window.watchHistory) {
      console.log('watchHistory not available, initializing...');
      // Try to initialize if WatchHistory class exists
      if (typeof WatchHistory !== 'undefined') {
        console.log('WatchHistory class found, creating instance');
        window.watchHistory = new WatchHistory();
        await window.watchHistory.init();
        console.log('watchHistory initialized');
      } else {
        console.log('WatchHistory class not found, waiting for script to load...');
        // Wait a bit for the script to load
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (window.watchHistory) {
              console.log('watchHistory became available');
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          setTimeout(() => {
            clearInterval(checkInterval);
            console.log('Timeout waiting for watchHistory');
            resolve();
          }, 3000);
        });
      }
    }

    if (!window.watchHistory) {
      console.warn('Watch history not available after initialization attempt');
      return;
    }

    // CRITICAL: Ensure watch history is initialized (loads user/profile)
    // Even if the object exists, init() might not have been called yet
    try {
      console.log('Initializing watch history before loading...');
      await window.watchHistory.init();
    } catch (e) {
      console.error('Error initializing watch history:', e);
    }

    try {
      console.log('Loading continue watching history...');
      const history = await window.watchHistory.getAllHistory(20);
      console.log('Watch history loaded:', history);
      console.log('History type:', typeof history, 'Is array:', Array.isArray(history), 'Length:', history ? history.length : 0);

      if (history && Array.isArray(history) && history.length > 0) {
        console.log('Rendering', history.length, 'items in Continue Watching');
        renderContinueWatching(history);
      } else {
        console.log('No watch history found or empty array');
        // Hide the section if no history
        const row = document.getElementById('continue-watching-row');
        if (row) {
          row.style.display = 'none';
        }
      }
    } catch (e) {
      console.error('Error loading continue watching:', e);
      console.error('Error stack:', e.stack);
    }
  }

  // Render Continue Watching section
  function renderContinueWatching(history) {
    const row = document.getElementById('continue-watching-row');
    const rail = document.getElementById('continue-watching-rail');

    if (!row || !rail) {
      console.error('Continue Watching elements not found:', { row: !!row, rail: !!rail });
      return;
    }

    console.log('Rendering Continue Watching with', history.length, 'items');
    rail.innerHTML = '';

    let renderedCount = 0;
    history.forEach(item => {
      console.log('Processing history item:', item);
      const videoId = item.video_id || (window.watchHistory ? window.watchHistory.generateVideoId(item.videoUrl || item.video_url, item.videoTitle || item.video_title) : '');
      const progressPercent = item.progress_percent || item.progressPercent || 0;
      const thumbnailUrl = item.thumbnail_url || item.thumbnailUrl || 'pbb.png';
      const videoTitle = item.video_title || item.videoTitle || 'Video';
      const videoUrl = item.video_url || item.videoUrl;

      console.log('Item details:', { videoId, progressPercent, thumbnailUrl, videoTitle, videoUrl });

      // Skip if progress is 100% or very close to end
      if (progressPercent >= 95) {
        console.log('Skipping item - progress too high:', progressPercent);
        return;
      }

      if (!videoUrl) {
        console.log('Skipping item - no video URL');
        return;
      }

      const tile = document.createElement('a');
      tile.className = 'tile tile--continue';
      if (videoUrl) {
        // Determine which episode HTML file to use based on video URL or title
        let episodePage = null;

        // Decode URL to check properly
        const decodedUrl = decodeURIComponent(videoUrl);
        const lowerTitle = videoTitle.toLowerCase();

        // Check for Day 1 (ep1.html)
        if (decodedUrl.includes('Day 1') || decodedUrl.includes('Day%201') ||
          videoUrl.includes('Day%201') || lowerTitle.includes('day 1')) {
          episodePage = 'players/ep1.html';
        }
        // Check for Day 2 (ep2.html if it exists)
        else if (decodedUrl.includes('Day 2') || decodedUrl.includes('Day%202') ||
          videoUrl.includes('Day%202') || lowerTitle.includes('day 2')) {
          episodePage = 'players/ep2.html';
        }
        // Check for highlights
        else if (decodedUrl.includes('Highlight') || videoUrl.includes('Highlight') ||
          lowerTitle.includes('highlight')) {
          episodePage = 'players/highlight-1.html';
        }

        // Use episode page if found, otherwise fallback to generic player
        if (episodePage) {
          tile.href = episodePage;
        } else {
          // Fallback to generic player with parameters
          tile.href = `players/index.html?src=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(videoTitle)}`;
        }
      } else {
        tile.href = '#';
      }

      console.log('Created tile with href:', tile.href, 'for video:', videoTitle);
      tile.style.backgroundImage = `url('${thumbnailUrl}')`;
      tile.style.backgroundSize = 'cover';
      tile.style.backgroundPosition = 'center';
      tile.style.textDecoration = 'none';
      tile.style.display = 'block';
      tile.style.position = 'relative';

      // Progress bar overlay
      const progressBar = document.createElement('div');
      progressBar.className = 'tile__progress-bar';
      progressBar.style.position = 'absolute';
      progressBar.style.bottom = '0';
      progressBar.style.left = '0';
      progressBar.style.right = '0';
      progressBar.style.height = '4px';
      progressBar.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      progressBar.style.zIndex = '2';

      const progressFilled = document.createElement('div');
      progressFilled.className = 'tile__progress-filled';
      progressFilled.style.position = 'absolute';
      progressFilled.style.bottom = '0';
      progressFilled.style.left = '0';
      progressFilled.style.height = '4px';
      progressFilled.style.backgroundColor = '#e50914';
      progressFilled.style.width = `${progressPercent}%`;
      progressFilled.style.transition = 'width 0.3s ease';
      progressFilled.style.zIndex = '3';

      progressBar.appendChild(progressFilled);
      tile.appendChild(progressBar);

      // Add hover overlay with episode info
      const hoverOverlay = document.createElement('div');
      hoverOverlay.className = 'tile__hover-overlay';

      // Calculate minutes remaining
      const duration = item.duration || 0;
      const currentTime = item.watch_time || item.currentTime || 0;
      const remainingSeconds = Math.max(0, duration - currentTime);
      const remainingMinutes = Math.floor(remainingSeconds / 60);
      const remainingSecondsDisplay = Math.floor(remainingSeconds % 60);

      let timeRemaining = '';
      if (remainingMinutes > 0) {
        timeRemaining = `${remainingMinutes}m ${remainingSecondsDisplay}s left`;
      } else if (remainingSecondsDisplay > 0) {
        timeRemaining = `${remainingSecondsDisplay}s left`;
      } else {
        timeRemaining = 'Finished';
      }

      hoverOverlay.innerHTML = `
        <div class="tile__hover-content">
          <div class="tile__hover-title">${videoTitle}</div>
          <div class="tile__hover-time">${timeRemaining}</div>
        </div>
      `;

      tile.appendChild(hoverOverlay);

      rail.appendChild(tile);
      renderedCount++;
    });

    console.log('Rendered', renderedCount, 'items in Continue Watching');
    if (rail.children.length > 0) {
      row.style.display = 'block';
      console.log('Continue Watching section is now visible');
    } else {
      console.log('No items to display in Continue Watching');
      row.style.display = 'none';
    }
  }

  // Note: toggleProfileDropdown is already defined at top level (outside IIFE)
  // No need to redefine it here

  // Run on DOM ready, but also wait a bit for CSS to load
  console.log('Setting up init, readyState:', document.readyState);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOMContentLoaded fired');
      setTimeout(init, 100);
    });
  } else {
    console.log('DOM already ready, calling init');
    setTimeout(init, 100);
  }

  // Also try to initialize dropdown immediately if DOM is ready
  if (document.readyState !== 'loading') {
    setTimeout(() => {
      const dd = document.getElementById('profile-dropdown');
      const trigger = document.querySelector('.nav__profile-trigger');
      if (dd && trigger && typeof initializeDropdown === 'function') {
        console.log('Attempting early dropdown initialization');
        initializeDropdown();
      }
    }, 300);
  }
})();


