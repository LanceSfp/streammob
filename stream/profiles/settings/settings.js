document.addEventListener('DOMContentLoaded', async () => {
  const raw = localStorage.getItem('activeProfile');
  if (!raw) {
    // If no active profile, go back to profiles chooser
    window.location.href = '../';
    return;
  }

  let profile;
  try {
    profile = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid activeProfile in localStorage', e);
    window.location.href = '../';
    return;
  }

  // Load icon data from database if available
  const supabase = initSupabase();
  if (profile.id && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
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
          localStorage.setItem('activeProfile', JSON.stringify(profile));
        }
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

  const nameEl = document.getElementById('settings-profile-name');
  const avatarEl = document.getElementById('settings-profile-avatar');
  const avatarIconEl = document.getElementById('settings-profile-avatar-icon');
  const topCard = document.querySelector('.profile-settings__card');

  if (nameEl) {
    nameEl.textContent = profile.name || 'Profile';
  }

  if (avatarEl) {
    avatarEl.style.background = profile.is_kids
      ? 'linear-gradient(135deg, #22c55e, #15803d)'
      : 'linear-gradient(135deg, #2563eb, #1d4ed8)';
  }

  if (avatarIconEl) {
    if (profile.iconImage && (profile.iconImage.startsWith('http://') || profile.iconImage.startsWith('https://'))) {
      avatarIconEl.innerHTML = '';
      const img = document.createElement('img');
      // iconImage is a Supabase URL
      img.src = profile.iconImage;
      img.alt = 'Profile icon';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      avatarIconEl.appendChild(img);
    } else {
      avatarIconEl.textContent = profile.iconEmoji || (profile.is_kids ? '👧' : '🙂');
    }
  }

  // Update page title to include profile name
  if (profile.name) {
    document.title = `Stream | ${profile.name} settings`;
  }

  // Clicking the top card goes to edit profile page
  if (topCard) {
    topCard.addEventListener('click', () => {
      window.location.href = '../edit/';
    });
  }

  // Profile Lock Modal functionality
  const lockModal = document.getElementById('lock-modal');
  const lockVerifyModal = document.getElementById('lock-verify-modal');
  const lockOptionsModal = document.getElementById('lock-options-modal');
  const lockBtn = document.getElementById('settings-profile-lock');
  const lockModalClose = document.getElementById('lock-modal-close');
  const lockCancelBtn = document.getElementById('lock-cancel-btn');
  const lockSaveBtn = document.getElementById('lock-save-btn');
  const lockError = document.getElementById('lock-error');
  const codeInputs = [
    document.getElementById('code-0'),
    document.getElementById('code-1'),
    document.getElementById('code-2'),
    document.getElementById('code-3')
  ];
  
  // Verification modal elements
  const lockVerifyModalClose = document.getElementById('lock-verify-modal-close');
  const lockVerifyCancelBtn = document.getElementById('lock-verify-cancel-btn');
  const lockVerifyError = document.getElementById('lock-verify-error');
  const verifyCodeInputs = [
    document.getElementById('verify-code-0'),
    document.getElementById('verify-code-1'),
    document.getElementById('verify-code-2'),
    document.getElementById('verify-code-3')
  ];
  
  // Options modal elements
  const lockOptionsModalClose = document.getElementById('lock-options-modal-close');
  const lockOptionsCancelBtn = document.getElementById('lock-options-cancel-btn');
  const lockReplaceBtn = document.getElementById('lock-replace-btn');
  const lockRemoveBtn = document.getElementById('lock-remove-btn');
  
  let currentLockCode = null; // Store the verified lock code

  function toggleLockModal(open) {
    if (!lockModal) {
      console.error('Lock modal element not found');
      return;
    }
    lockModal.classList.toggle('is-open', open);
    lockModal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      // Reset inputs
      codeInputs.forEach(input => {
        if (input) input.value = '';
      });
      if (lockError) lockError.hidden = true;
      // Focus first input
      setTimeout(() => {
        if (codeInputs[0]) codeInputs[0].focus();
      }, 100);
    } else {
      // Remove focus when closing
      codeInputs.forEach(input => {
        if (input) input.blur();
      });
      setTimeout(() => {
        lockModal.setAttribute('aria-hidden', 'true');
      }, 50);
    }
  }

  function toggleVerifyModal(open) {
    if (!lockVerifyModal) return;
    lockVerifyModal.classList.toggle('is-open', open);
    lockVerifyModal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      verifyCodeInputs.forEach(input => {
        if (input) input.value = '';
      });
      if (lockVerifyError) lockVerifyError.hidden = true;
      setTimeout(() => {
        if (verifyCodeInputs[0]) verifyCodeInputs[0].focus();
      }, 100);
    } else {
      verifyCodeInputs.forEach(input => {
        if (input) input.blur();
      });
      setTimeout(() => {
        lockVerifyModal.setAttribute('aria-hidden', 'true');
      }, 50);
    }
  }

  function toggleOptionsModal(open) {
    if (!lockOptionsModal) return;
    lockOptionsModal.classList.toggle('is-open', open);
    lockOptionsModal.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (!open) {
      setTimeout(() => {
        lockOptionsModal.setAttribute('aria-hidden', 'true');
      }, 50);
    }
  }

  function showLockError(message) {
    if (!lockError) return;
    lockError.textContent = message;
    lockError.hidden = !message;
  }

  // Open modal when clicking on Profile Lock card
  if (lockBtn) {
    lockBtn.addEventListener('click', async (e) => {
      // Don't trigger if clicking the chevron button
      if (e.target.closest('.profile-settings__chevron')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      
      // Check if profile already has a lock code
      let existingLockCode = profile.lock_code || null;
      if (!existingLockCode && profile.id) {
        // Try to get from localStorage
        try {
          const storedProfile = JSON.parse(localStorage.getItem('activeProfile') || '{}');
          if (storedProfile.id === profile.id && storedProfile.lockCode) {
            existingLockCode = storedProfile.lockCode;
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Also check database
      if (!existingLockCode && profile.id && supabase) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('lock_code')
              .eq('id', profile.id)
              .eq('user_id', sessionData.session.user.id)
              .single();
            
            if (profileData && profileData.lock_code) {
              existingLockCode = profileData.lock_code;
            }
          }
        } catch (e) {
          console.error('Error checking lock code:', e);
        }
      }
      
      if (existingLockCode) {
        // Profile has a lock code, show verification modal first
        currentLockCode = existingLockCode;
        toggleVerifyModal(true);
      } else {
        // No lock code, show set lock modal directly
        toggleLockModal(true);
      }
    });
    
    // Also handle Enter key for accessibility
    lockBtn.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        // Same logic as click handler
        let existingLockCode = profile.lock_code || null;
        if (existingLockCode) {
          currentLockCode = existingLockCode;
          toggleVerifyModal(true);
        } else {
          toggleLockModal(true);
        }
      }
    });
  }

  // Close modal handlers
  if (lockModalClose) {
    lockModalClose.addEventListener('click', () => {
      toggleLockModal(false);
    });
  }

  if (lockCancelBtn) {
    lockCancelBtn.addEventListener('click', () => {
      toggleLockModal(false);
    });
  }

  // Close modal on backdrop click
  const lockBackdrop = lockModal?.querySelector('.lock-modal__backdrop');
  if (lockBackdrop) {
    lockBackdrop.addEventListener('click', (e) => {
      if (e.target === lockBackdrop) {
        toggleLockModal(false);
      }
    });
  }

  // Verification modal handlers
  if (lockVerifyModalClose) {
    lockVerifyModalClose.addEventListener('click', () => {
      toggleVerifyModal(false);
      currentLockCode = null;
    });
  }

  if (lockVerifyCancelBtn) {
    lockVerifyCancelBtn.addEventListener('click', () => {
      toggleVerifyModal(false);
      currentLockCode = null;
    });
  }

  const verifyBackdrop = lockVerifyModal?.querySelector('.lock-modal__backdrop');
  if (verifyBackdrop) {
    verifyBackdrop.addEventListener('click', (e) => {
      if (e.target === verifyBackdrop) {
        toggleVerifyModal(false);
        currentLockCode = null;
      }
    });
  }

  // Options modal handlers
  if (lockOptionsModalClose) {
    lockOptionsModalClose.addEventListener('click', () => {
      toggleOptionsModal(false);
      currentLockCode = null;
    });
  }

  if (lockOptionsCancelBtn) {
    lockOptionsCancelBtn.addEventListener('click', () => {
      toggleOptionsModal(false);
      currentLockCode = null;
    });
  }

  const optionsBackdrop = lockOptionsModal?.querySelector('.lock-modal__backdrop');
  if (optionsBackdrop) {
    optionsBackdrop.addEventListener('click', (e) => {
      if (e.target === optionsBackdrop) {
        toggleOptionsModal(false);
        currentLockCode = null;
      }
    });
  }

  // Handle replace lock code
  if (lockReplaceBtn) {
    lockReplaceBtn.addEventListener('click', () => {
      toggleOptionsModal(false);
      toggleLockModal(true);
    });
  }

  // Handle remove lock code
  if (lockRemoveBtn) {
    lockRemoveBtn.addEventListener('click', async () => {
      if (!profile.id) {
        alert('Profile ID not found');
        return;
      }

      const supabase = initSupabase();
      if (!supabase) {
        alert('Unable to connect to database');
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          alert('Please log in to remove lock code');
          return;
        }

        // Remove lock code from database
        const { error } = await supabase
          .from('profiles')
          .update({ lock_code: null })
          .eq('id', profile.id)
          .eq('user_id', sessionData.session.user.id);

        if (error) {
          console.error('Error removing lock code:', error);
          alert('Unable to remove lock code. Please try again.');
          return;
        }

        // Update profile in localStorage
        profile.lockCode = null;
        profile.lock_code = null;
        localStorage.setItem('activeProfile', JSON.stringify(profile));

        // Close modal and show success
        toggleOptionsModal(false);
        currentLockCode = null;
        alert('Profile lock removed successfully!');
      } catch (e) {
        console.error('Error removing lock code:', e);
        alert('An error occurred. Please try again.');
      }
    });
  }

  // Handle verification code input
  verifyCodeInputs.forEach((input, index) => {
    if (!input) return;

    input.addEventListener('input', (e) => {
      const value = e.target.value;
      // Only allow digits
      if (value && !/^\d$/.test(value)) {
        e.target.value = '';
        return;
      }

      // Auto-advance to next input
      if (value && index < verifyCodeInputs.length - 1) {
        verifyCodeInputs[index + 1]?.focus();
      }

      if (lockVerifyError) lockVerifyError.hidden = true;

      // Auto-verify when all 4 digits are entered
      if (value && index === verifyCodeInputs.length - 1) {
        const enteredCode = verifyCodeInputs.map(inp => inp?.value || '').join('');
        if (enteredCode.length === 4 && currentLockCode) {
          if (enteredCode === currentLockCode) {
            // Code verified, show options modal
            toggleVerifyModal(false);
            toggleOptionsModal(true);
          } else {
            // Wrong code
            if (lockVerifyError) {
              lockVerifyError.textContent = 'Incorrect code. Please try again.';
              lockVerifyError.hidden = false;
            }
            // Clear inputs
            verifyCodeInputs.forEach(inp => {
              if (inp) inp.value = '';
            });
            if (verifyCodeInputs[0]) verifyCodeInputs[0].focus();
          }
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        verifyCodeInputs[index - 1]?.focus();
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        verifyCodeInputs[index - 1]?.focus();
      }
      if (e.key === 'ArrowRight' && index < verifyCodeInputs.length - 1) {
        verifyCodeInputs[index + 1]?.focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text');
      const digits = pastedData.replace(/\D/g, '').slice(0, 4);
      digits.split('').forEach((digit, i) => {
        if (verifyCodeInputs[index + i]) {
          verifyCodeInputs[index + i].value = digit;
        }
      });
      const lastFilledIndex = Math.min(index + digits.length - 1, verifyCodeInputs.length - 1);
      verifyCodeInputs[lastFilledIndex]?.focus();
      
      // Auto-verify if all 4 digits pasted
      if (digits.length === 4 && currentLockCode) {
        if (digits === currentLockCode) {
          toggleVerifyModal(false);
          toggleOptionsModal(true);
        } else {
          if (lockVerifyError) {
            lockVerifyError.textContent = 'Incorrect code. Please try again.';
            lockVerifyError.hidden = false;
          }
          verifyCodeInputs.forEach(inp => {
            if (inp) inp.value = '';
          });
          if (verifyCodeInputs[0]) verifyCodeInputs[0].focus();
        }
      }
    });
  });

  // Handle code input - auto-advance and only allow digits
  codeInputs.forEach((input, index) => {
    if (!input) return;

    input.addEventListener('input', (e) => {
      const value = e.target.value;
      // Only allow digits
      if (value && !/^\d$/.test(value)) {
        e.target.value = '';
        return;
      }

      // Auto-advance to next input
      if (value && index < codeInputs.length - 1) {
        codeInputs[index + 1]?.focus();
      }

      showLockError('');
    });

    input.addEventListener('keydown', (e) => {
      // Handle backspace - go to previous input if current is empty
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        codeInputs[index - 1]?.focus();
      }
      // Handle arrow keys
      if (e.key === 'ArrowLeft' && index > 0) {
        codeInputs[index - 1]?.focus();
      }
      if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
        codeInputs[index + 1]?.focus();
      }
    });

    // Handle paste - extract digits and fill inputs
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text');
      const digits = pastedData.replace(/\D/g, '').slice(0, 4);
      digits.split('').forEach((digit, i) => {
        if (codeInputs[index + i]) {
          codeInputs[index + i].value = digit;
        }
      });
      // Focus last filled input or last input
      const lastFilledIndex = Math.min(index + digits.length - 1, codeInputs.length - 1);
      codeInputs[lastFilledIndex]?.focus();
    });
  });

  // Handle save lock code
  if (lockSaveBtn) {
    lockSaveBtn.addEventListener('click', async () => {
      const code = codeInputs.map(input => input?.value || '').join('');
      
      if (code.length !== 4) {
        showLockError('Please enter a 4-digit code');
        return;
      }

      if (!/^\d{4}$/.test(code)) {
        showLockError('Code must contain only digits');
        return;
      }

      if (!profile.id) {
        showLockError('Profile ID not found');
        return;
      }

      const supabase = initSupabase();
      if (!supabase) {
        showLockError('Unable to connect to database');
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          showLockError('Please log in to save lock code');
          return;
        }

        // Save lock code to database
        const { error } = await supabase
          .from('profiles')
          .update({ lock_code: code })
          .eq('id', profile.id)
          .eq('user_id', sessionData.session.user.id);

        if (error) {
          console.error('Error saving lock code:', error);
          
          // Check if the error is due to missing column
          if (error.code === 'PGRST204' || error.message?.includes('lock_code')) {
            showLockError('Database column missing. Please add lock_code column to profiles table. See console for SQL.');
            console.error('To fix this, run this SQL in your Supabase SQL Editor:');
            console.error('ALTER TABLE profiles ADD COLUMN lock_code TEXT;');
            // Fallback: save to localStorage only
            profile.lockCode = code;
            localStorage.setItem('activeProfile', JSON.stringify(profile));
            console.warn('Lock code saved to localStorage only. Add the database column for persistent storage.');
            toggleLockModal(false);
            alert('Lock code saved locally. Please add the database column for full functionality.');
            return;
          }
          
          showLockError('Unable to save lock code. Please try again.');
          return;
        }

        // Update profile in localStorage
        profile.lockCode = code;
        profile.lock_code = code;
        localStorage.setItem('activeProfile', JSON.stringify(profile));

        // Close modal and show success
        toggleLockModal(false);
        currentLockCode = code; // Update current lock code
        alert('Profile lock code saved successfully!');
      } catch (e) {
        console.error('Error saving lock code:', e);
        showLockError('An error occurred. Please try again.');
      }
    });
  }
});


