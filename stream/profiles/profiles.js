(() => {
  const MAX_PROFILES = 5;

  let grid;
  let manageBtn;
  let limitMsg;
  let modal;
  let modalClose;
  let modalCancel;
  let modalForm;
  let modalError;

  let supabase;
  let currentUser = null;
  let profiles = [];
  let isManaging = false;
  let lockModal;
  let lockCodeInputs;
  let lockError;
  let lockCancelBtn;
  let pendingNavigation = null;

  function setManageMode(on) {
    isManaging = on;
    document.body.classList.toggle('is-managing-profiles', on);
    if (manageBtn) {
      manageBtn.textContent = on ? 'Done' : 'Manage Profiles';
    }
  }

  function toggleModal(open) {
    if (!modal) return;
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      if (modalForm) modalForm.reset();
      if (modalError) modalError.hidden = true;
      const nameInput = modal.querySelector('#profile-name');
      if (nameInput) nameInput.focus();
    }
  }

  function showError(message) {
    if (!modalError) return;
    modalError.textContent = message;
    modalError.hidden = !message;
  }

  function toggleLockModal(open) {
    if (!lockModal) {
      console.warn('Lock modal not initialized');
      return;
    }
    try {
      lockModal.classList.toggle('is-open', open);
      if (open) {
        lockModal.setAttribute('aria-hidden', 'false');
        // Reset inputs
        if (lockCodeInputs) {
          lockCodeInputs.forEach(input => {
            if (input) {
              input.value = '';
              input.blur(); // Remove focus before showing
            }
          });
        }
        if (lockError) lockError.hidden = true;
        // Focus first input after a short delay to ensure modal is visible
        setTimeout(() => {
          if (lockCodeInputs && lockCodeInputs[0]) {
            lockCodeInputs[0].focus();
          }
        }, 150);
      } else {
        // Remove focus from all inputs before hiding
        if (lockCodeInputs) {
          lockCodeInputs.forEach(input => {
            if (input) input.blur();
          });
        }
        // Set aria-hidden after removing focus
        setTimeout(() => {
          lockModal.setAttribute('aria-hidden', 'true');
        }, 50);
      }
    } catch (error) {
      console.error('Error toggling lock modal:', error);
    }
  }

  function showLockError(message) {
    if (!lockError) return;
    lockError.textContent = message;
    lockError.hidden = !message;
  }

  function showLockModalAndVerify(correctCode) {
    return new Promise((resolve) => {
      toggleLockModal(true);
      pendingNavigation = { resolve, correctCode };
    });
  }

  function verifyLockCode(enteredCode, correctCode) {
    return enteredCode === correctCode;
  }

  // Helper function to merge icon data with profile
  // Icon data now comes from database, but we still check localStorage as fallback
  function mergeProfileWithIcons(profile) {
    if (!profile || !profile.id) return profile;
    // Icon data should already be in profile from database
    // But we can still merge from localStorage as fallback for backwards compatibility
    try {
      const iconsData = localStorage.getItem('profileIcons');
      if (iconsData) {
        const icons = JSON.parse(iconsData);
        if (icons[profile.id] && (!profile.icon_image && !profile.icon_emoji)) {
          // Only use localStorage if database doesn't have icon data
          return { ...profile, ...icons[profile.id] };
        }
      }
    } catch (e) {
      console.error('Error reading profile icons:', e);
    }
    // Map database column names to expected property names
    if (profile.icon_image || profile.icon_emoji) {
      return {
        ...profile,
        iconImage: profile.icon_image,
        iconEmoji: profile.icon_emoji,
        iconId: profile.icon_id
      };
    }
    return profile;
  }

  function createProfileTile(profile) {
    // Merge icon data before creating the tile
    const profileWithIcons = mergeProfileWithIcons(profile);
    
    const btn = document.createElement('button');
    btn.className = 'profile';
    btn.type = 'button';
    btn.setAttribute('aria-label', profileWithIcons.name);
    btn.style.cursor = 'pointer';
    btn.disabled = false;
    // Use both onclick and addEventListener to ensure it works
    const handleProfileClick = async function(e) {
      console.log('=== PROFILE CLICK HANDLER FIRED ===', profileWithIcons.name);
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      
      console.log('Profile clicked:', profileWithIcons.name, 'isManaging:', isManaging);
      
      try {
        // Merge icon data before storing
        // Check for lock_code in database profile, or in localStorage (fallback)
        let lockCode = profile.lock_code || null;
        if (!lockCode && profile.id) {
          // Try to get from localStorage if it was saved there
          try {
            const storedProfile = JSON.parse(localStorage.getItem('activeProfile') || '{}');
            if (storedProfile.id === profile.id && storedProfile.lockCode) {
              lockCode = storedProfile.lockCode;
            }
          } catch (e) {
            // Ignore localStorage errors
            console.error('Error reading lock code from localStorage:', e);
          }
        }
        
        const profileToStore = { ...profileWithIcons, lock_code: lockCode };
        localStorage.setItem('activeProfile', JSON.stringify(profileToStore));
        
        if (isManaging) {
          console.log('Navigating to settings');
          window.location.href = './settings/';
          return;
        }
        
        // Check if profile has a lock code
        if (lockCode && lockCode.trim() !== '' && typeof showLockModalAndVerify === 'function' && lockModal) {
          console.log('Profile has lock code, showing modal');
          // Show lock modal and verify code before navigating
          try {
            const verified = await showLockModalAndVerify(lockCode);
            if (verified) {
              // Store verification in sessionStorage to allow access
              sessionStorage.setItem(`profile_${profile.id}_unlocked`, 'true');
              console.log('Lock verified, navigating to browse');
              window.location.href = '../browse/';
            } else {
              // User cancelled or entered wrong code, don't navigate
              console.log('Lock verification failed or cancelled');
              localStorage.removeItem('activeProfile');
            }
          } catch (error) {
            console.error('Error in lock verification:', error);
            // On error, allow access (fail open) - but still try to navigate
            sessionStorage.setItem(`profile_${profile.id}_unlocked`, 'true');
            window.location.href = '../browse/';
          }
        } else {
          // No lock code, proceed normally
          console.log('No lock code, navigating to browse');
          window.location.href = '../browse/';
        }
      } catch (error) {
        console.error('Error in profile click handler:', error);
        // On error, try to proceed anyway
        try {
          window.location.href = '../browse/';
        } catch (navError) {
          console.error('Failed to navigate:', navError);
        }
      }
    };
    
    // Try multiple ways to attach the handler
    btn.onclick = handleProfileClick;
    btn.addEventListener('click', handleProfileClick, true); // Capture phase
    btn.addEventListener('click', handleProfileClick, false); // Bubble phase
    btn.addEventListener('mousedown', function(e) {
      console.log('Mouse down on profile:', profileWithIcons.name);
      e.preventDefault();
      handleProfileClick(e);
    });
    
    // Test if button is clickable at all
    console.log('Button created for:', profileWithIcons.name, 'Button element:', btn);
    
    console.log('Profile tile created for:', profileWithIcons.name);

    const avatar = document.createElement('div');
    avatar.className = 'profile__avatar';
    avatar.style.background = profileWithIcons.is_kids
      ? 'linear-gradient(135deg, #22c55e, #15803d)'
      : 'linear-gradient(135deg, #2563eb, #1d4ed8)';

    // Display icon if available
    let hasValidIcon = false;
    if (profileWithIcons.iconImage && (profileWithIcons.iconImage.startsWith('http://') || profileWithIcons.iconImage.startsWith('https://'))) {
      const iconImg = document.createElement('img');
      // iconImage is a Supabase URL
      iconImg.src = profileWithIcons.iconImage;
      iconImg.alt = 'Profile icon';
      iconImg.style.width = '100%';
      iconImg.style.height = '100%';
      iconImg.style.objectFit = 'cover';
      iconImg.style.borderRadius = 'inherit';
      iconImg.style.position = 'absolute';
      iconImg.style.inset = '0';
      iconImg.style.zIndex = '1';
      avatar.appendChild(iconImg);
      hasValidIcon = true;
    }
    
    // Display emoji if no valid icon image
    if (!hasValidIcon && profileWithIcons.iconEmoji) {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = profileWithIcons.iconEmoji;
      iconSpan.style.fontSize = 'clamp(3rem, 8vw, 4.5rem)';
      iconSpan.style.position = 'absolute';
      iconSpan.style.inset = '0';
      iconSpan.style.display = 'flex';
      iconSpan.style.alignItems = 'center';
      iconSpan.style.justifyContent = 'center';
      iconSpan.style.zIndex = '1';
      avatar.appendChild(iconSpan);
    }

    // Edit (pencil) icon overlay – only visible in manage mode via CSS
    const editIcon = document.createElement('span');
    editIcon.className = 'profile__edit-icon';
    editIcon.setAttribute('aria-hidden', 'true');
    editIcon.style.zIndex = '2';
    avatar.appendChild(editIcon);

    // Lock icon overlay – only visible when profile has a lock code
    let lockCode = profile.lock_code || null;
    if (!lockCode && profile.id) {
      // Try to get from localStorage if it was saved there
      try {
        const storedProfile = JSON.parse(localStorage.getItem('activeProfile') || '{}');
        if (storedProfile.id === profile.id && storedProfile.lockCode) {
          lockCode = storedProfile.lockCode;
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    if (lockCode) {
      const lockIcon = document.createElement('img');
      lockIcon.className = 'profile__lock-icon';
      lockIcon.src = './lock.png';
      lockIcon.alt = 'Profile is locked';
      lockIcon.setAttribute('aria-hidden', 'true');
      lockIcon.style.zIndex = '3';
      avatar.appendChild(lockIcon);
    }

    const label = document.createElement('span');
    label.className = 'profile__label';
    label.textContent = profileWithIcons.name;
    label.style.pointerEvents = 'none';
    label.style.userSelect = 'none';

    const kid = document.createElement('span');
    kid.className = 'profile__label profile__label--kid';
    kid.textContent = profileWithIcons.is_kids ? 'Kids' : '';
    kid.style.pointerEvents = 'none';
    kid.style.userSelect = 'none';

    // Make sure avatar and all children don't interfere with clicks
    avatar.style.pointerEvents = 'none';
    if (avatar.children) {
      Array.from(avatar.children).forEach(child => {
        child.style.pointerEvents = 'none';
      });
    }

    btn.appendChild(avatar);
    btn.appendChild(label);
    if (profileWithIcons.is_kids) btn.appendChild(kid);
    
    // Ensure button itself is clickable
    btn.style.pointerEvents = 'auto';
    btn.style.userSelect = 'none';
    btn.style.position = 'relative';
    btn.style.zIndex = '10';
    
    // Add a test click handler that just alerts
    const testHandler = function() {
      alert('Button clicked! Profile: ' + profileWithIcons.name);
    };
    btn.addEventListener('click', testHandler, { once: true });
    
    return btn;
  }

  function renderProfiles() {
    if (!grid) {
      console.error('Grid element not found');
      return;
    }
    grid.innerHTML = '';

    console.log('Rendering', profiles.length, 'profiles');
    profiles.forEach((p) => {
      const tile = createProfileTile(p);
      if (tile) {
        grid.appendChild(tile);
        console.log('Added profile tile to grid:', p.name, 'Element:', tile);
        // Verify it's in the DOM and test click
        setTimeout(() => {
          const inDom = document.body.contains(tile);
          console.log('Tile in DOM?', inDom, 'for profile:', p.name);
          // Test if we can programmatically trigger click
          if (inDom) {
            console.log('Button onclick:', tile.onclick, 'Button type:', tile.type, 'Button disabled:', tile.disabled);
          }
        }, 100);
      } else {
        console.error('Failed to create tile for profile:', p.name);
      }
    });

    const limitReached = profiles.length >= MAX_PROFILES;
    if (limitMsg) {
      limitMsg.hidden = !limitReached;
    }

    if (!limitReached) {
      const addTile = document.createElement('button');
      addTile.className = 'profile profile--add';
      addTile.setAttribute('aria-label', 'Add profile');
      addTile.addEventListener('click', () => toggleModal(true));

      const avatar = document.createElement('div');
      avatar.className = 'profile__avatar profile__avatar--add';
      const plus = document.createElement('span');
      plus.className = 'profile__plus';
      plus.textContent = '+';
      avatar.appendChild(plus);

      const label = document.createElement('span');
      label.className = 'profile__label';
      label.textContent = 'Add Profile';

      addTile.appendChild(avatar);
      addTile.appendChild(label);
      grid.appendChild(addTile);
    }
  }

  async function fetchProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,name,is_kids,icon_id,icon_image,icon_emoji,lock_code')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Unable to load profiles', error);
      return;
    }
    profiles = data || [];
    
    // Merge lock_code from localStorage if not in database
    profiles.forEach(profile => {
      if (!profile.lock_code && profile.id) {
        try {
          const storedProfile = JSON.parse(localStorage.getItem('activeProfile') || '{}');
          if (storedProfile.id === profile.id && storedProfile.lockCode) {
            profile.lock_code = storedProfile.lockCode;
          }
        } catch (e) {
          // Ignore
        }
      }
    });
    
    renderProfiles();
  }

  async function handleCreateProfile(event) {
    event.preventDefault();
    showError('');

    if (profiles.length >= MAX_PROFILES) {
      showError('You can have up to 5 profiles per account.');
      return;
    }

    const name = modalForm.name.value.trim();
    const isKids = modalForm.is_kids.checked;

    if (!name) {
      showError('Please enter a name.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .insert({ name, is_kids: isKids, user_id: currentUser.id });

    if (error) {
      console.error(error);
      showError(error.message || 'Unable to create profile.');
      return;
    }

    toggleModal(false);
    await fetchProfiles();
  }

  async function init() {
    try {
      // Get DOM elements after DOM is ready
      grid = document.getElementById('profiles-grid');
      manageBtn = document.getElementById('manage-profiles-btn');
      limitMsg = document.getElementById('profiles-limit');
      modal = document.getElementById('profile-modal');
      modalClose = document.getElementById('profile-modal-close');
      modalCancel = document.getElementById('profile-cancel');
      modalForm = document.getElementById('profile-form');
      modalError = document.getElementById('profile-error');

      if (!grid) {
        console.error('profiles-grid element not found');
        return;
      }

      supabase = initSupabase();
      if (!supabase) return;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = '../login/';
        return;
      }
      currentUser = sessionData.session.user;

      // Ensure modals are closed on page load
      if (modal) {
        toggleModal(false);
      }
      
      // Ensure lock modal is closed and properly hidden
      if (lockModal) {
        lockModal.classList.remove('is-open');
        lockModal.setAttribute('aria-hidden', 'true');
        // Remove focus from any inputs
        if (lockCodeInputs) {
          lockCodeInputs.forEach(input => {
            if (input) input.blur();
          });
        }
      }

      if (manageBtn) {
        manageBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setManageMode(!isManaging);
          return false;
        });
      } else {
        console.warn('manage-profiles-btn element not found');
      }
      
      if (modalClose) {
        modalClose.addEventListener('click', () => toggleModal(false));
      }
      if (modalCancel) {
        modalCancel.addEventListener('click', () => toggleModal(false));
      }
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) toggleModal(false);
        });
      }
      if (modalForm) {
        modalForm.addEventListener('submit', handleCreateProfile);
      }

      // Setup lock modal (optional - won't break if elements don't exist)
      try {
        lockModal = document.getElementById('lock-modal');
        lockCodeInputs = [
          document.getElementById('lock-code-0'),
          document.getElementById('lock-code-1'),
          document.getElementById('lock-code-2'),
          document.getElementById('lock-code-3')
        ];
        lockError = document.getElementById('lock-error');
        lockCancelBtn = document.getElementById('lock-cancel-btn');

        // Handle lock code input - auto-advance and only allow digits
        if (lockCodeInputs && lockCodeInputs.length > 0 && lockCodeInputs.some(inp => inp)) {
        lockCodeInputs.forEach((input, index) => {
          if (!input) return;

          input.addEventListener('input', (e) => {
            const value = e.target.value;
            // Only allow digits
            if (value && !/^\d$/.test(value)) {
              e.target.value = '';
              return;
            }

            // Auto-advance to next input
            if (value && index < lockCodeInputs.length - 1) {
              lockCodeInputs[index + 1]?.focus();
            }

            showLockError('');

            // Auto-verify when all 4 digits are entered
            if (value && index === lockCodeInputs.length - 1) {
              const enteredCode = lockCodeInputs.map(inp => inp?.value || '').join('');
              if (enteredCode.length === 4 && pendingNavigation) {
                const isCorrect = verifyLockCode(enteredCode, pendingNavigation.correctCode);
                if (isCorrect) {
                  toggleLockModal(false);
                  pendingNavigation.resolve(true);
                  pendingNavigation = null;
                } else {
                  showLockError('Incorrect code. Please try again.');
                  // Clear inputs
                  lockCodeInputs.forEach(inp => {
                    if (inp) inp.value = '';
                  });
                  if (lockCodeInputs[0]) lockCodeInputs[0].focus();
                }
              }
            }
          });

          input.addEventListener('keydown', (e) => {
            // Handle backspace - go to previous input if current is empty
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
              lockCodeInputs[index - 1]?.focus();
            }
            // Handle arrow keys
            if (e.key === 'ArrowLeft' && index > 0) {
              lockCodeInputs[index - 1]?.focus();
            }
            if (e.key === 'ArrowRight' && index < lockCodeInputs.length - 1) {
              lockCodeInputs[index + 1]?.focus();
            }
          });

          // Handle paste
          input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedData.replace(/\D/g, '').slice(0, 4);
            digits.split('').forEach((digit, i) => {
              if (lockCodeInputs[index + i]) {
                lockCodeInputs[index + i].value = digit;
              }
            });
            // Focus last filled input or last input
            const lastFilledIndex = Math.min(index + digits.length - 1, lockCodeInputs.length - 1);
            lockCodeInputs[lastFilledIndex]?.focus();
            
            // Auto-verify if all 4 digits pasted
            if (digits.length === 4 && pendingNavigation) {
              const isCorrect = verifyLockCode(digits, pendingNavigation.correctCode);
              if (isCorrect) {
                toggleLockModal(false);
                pendingNavigation.resolve(true);
                pendingNavigation = null;
              } else {
                showLockError('Incorrect code. Please try again.');
                lockCodeInputs.forEach(inp => {
                  if (inp) inp.value = '';
                });
                if (lockCodeInputs[0]) lockCodeInputs[0].focus();
              }
            }
          });
        });
      }

        // Close lock modal handlers
        if (lockCancelBtn) {
          lockCancelBtn.addEventListener('click', () => {
            toggleLockModal(false);
            if (pendingNavigation) {
              pendingNavigation.resolve(false);
              pendingNavigation = null;
            }
          });
        }

        const lockBackdrop = lockModal?.querySelector('.lock-modal__backdrop');
        if (lockBackdrop) {
          lockBackdrop.addEventListener('click', (e) => {
            if (e.target === lockBackdrop) {
              toggleLockModal(false);
              if (pendingNavigation) {
                pendingNavigation.resolve(false);
                pendingNavigation = null;
              }
            }
          });
        }
      } catch (error) {
        console.warn('Lock modal setup failed, but profiles will still work:', error);
      }

      await fetchProfiles();
    } catch (error) {
      console.error('Error in init:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();


