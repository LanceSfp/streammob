document.addEventListener('DOMContentLoaded', async () => {
  const raw = localStorage.getItem('activeProfile');
  if (!raw) {
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

  const supabase = initSupabase();
  if (!supabase) {
    console.error('Supabase not initialized');
    window.location.href = '../';
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.href = '../../login/';
    return;
  }

  // Load icon data from database if available
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

  const nameInput = document.getElementById('edit-profile-name');
  const avatarEl = document.getElementById('edit-profile-avatar');
  const avatarIconEl = document.getElementById('edit-profile-avatar-icon');
  const avatarClickable = document.getElementById('edit-profile-avatar');
  const saveButton = document.getElementById('edit-profile-save');

  if (nameInput) {
    nameInput.value = profile.name || '';
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
      img.style.borderRadius = '16px';
      avatarIconEl.appendChild(img);
    } else {
      avatarIconEl.textContent = profile.iconEmoji || (profile.is_kids ? '👧' : '🙂');
    }
  }

  const emailEl = document.getElementById('edit-profile-email');
  if (emailEl) {
    emailEl.textContent = profile.email || 'email@example.com';
  }

  if (profile.name) {
    document.title = `Stream | Edit ${profile.name}`;
  }

  if (avatarClickable) {
    avatarClickable.style.cursor = 'pointer';
    avatarClickable.addEventListener('click', () => {
      window.location.href = '../icons/';
    });
  }

  // Handle save button
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      if (!profile.id) {
        console.error('Profile ID not found');
        return;
      }

      const newName = nameInput ? nameInput.value.trim() : profile.name;

      if (!newName) {
        alert('Please enter a name.');
        return;
      }

      // Update profile in localStorage (includes name and icon data)
      profile.name = newName;
      localStorage.setItem('activeProfile', JSON.stringify(profile));

      // Update profile in database (name and icon data)
      const updateData = {
        name: newName,
        icon_id: profile.iconId || null,
        icon_image: profile.iconImage || null,
        icon_emoji: profile.iconEmoji || null
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
        .eq('user_id', sessionData.session.user.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Unable to save changes. Please try again.');
        return;
      }

      // Redirect back to settings page
      window.location.href = '../settings/';
    });
  }

  // Handle delete button
  const deleteButton = document.getElementById('edit-profile-delete');
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      if (!profile.id) {
        console.error('Profile ID not found');
        return;
      }

      const confirmed = confirm('Are you sure you want to delete this profile? This action cannot be undone.');
      if (!confirmed) {
        return;
      }

      // Delete from database
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id)
        .eq('user_id', sessionData.session.user.id);

      if (error) {
        console.error('Error deleting profile:', error);
        alert('Unable to delete profile. Please try again.');
        return;
      }

      // Clear from localStorage if it's the active profile
      // (It likely is, since we are editing it, but good to be safe)
      const currentActive = localStorage.getItem('activeProfile');
      if (currentActive) {
        try {
          const parsed = JSON.parse(currentActive);
          if (parsed.id === profile.id) {
            localStorage.removeItem('activeProfile');
          }
        } catch (e) {
          console.error('Error parsing activeProfile', e);
        }
      }

      // Redirect to profile selection page
      window.location.href = '../';
    });
  }
});


