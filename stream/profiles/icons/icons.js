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

  // Initialize Supabase for saving icon to database
  const supabase = initSupabase();
  let currentUser = null;
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      currentUser = sessionData.session.user;
    }
  }

  const nameEl = document.getElementById('icon-picker-name');
  const currentAvatarEl = document.getElementById('icon-picker-current-avatar');

  if (nameEl) {
    nameEl.textContent = profile.name || 'Profile';
  }

  if (currentAvatarEl) {
    if (profile.iconImage) {
      currentAvatarEl.innerHTML = '';
      const img = document.createElement('img');
      img.src = profile.iconImage;
      img.alt = 'Profile';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '50%';
      currentAvatarEl.appendChild(img);
    } else {
      currentAvatarEl.textContent = profile.iconEmoji || (profile.is_kids ? '👧' : '🙂');
    }
  }

  const classicsRow = document.getElementById('icon-row-classics');
  const strangerRow = document.getElementById('icon-row-stranger');

  // First icon is lance.png image, rest are emojis
  const classicIcons = [
    { type: 'image', src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/lance.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vbGFuY2UucG5nIiwiaWF0IjoxNzY2NjM2NTM3LCJleHAiOjIwODE5OTY1Mzd9.CdZ7bnfPtzdZxMXeocEYLhfMBGbVhfAS8WaIZVr2swk' },
    { type: 'emoji', value: '🧡' },
    { type: 'emoji', value: '💛' },
    { type: 'emoji', value: '💙' },
    { type: 'emoji', value: '🐻' },
    { type: 'emoji', value: '🦸‍♀️' },
    { type: 'emoji', value: '😎' },
    { type: 'emoji', value: '🎭' },
    { type: 'emoji', value: '😡' }
  ];
  const strangerIcons = [
    { type: 'image', src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/lance.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vbGFuY2UucG5nIiwiaWF0IjoxNzY2NjM2NTM3LCJleHAiOjIwODE5OTY1Mzd9.CdZ7bnfPtzdZxMXeocEYLhfMBGbVhfAS8WaIZVr2swk' },
    { type: 'image', src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/len.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vbGVuLnBuZyIsImlhdCI6MTc2NjYzNjY0MywiZXhwIjoyMDgxOTk2NjQzfQ.ajv525AampV4l2dHutRCUNNl0mXfixuWlPZwCJNVT9I' },
    { type: 'image', src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/vianca.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vdmlhbmNhLnBuZyIsImlhdCI6MTc2NjY3NDM2MCwiZXhwIjoyMDgyMDM0MzYwfQ.FINWUJ1XpLBD9Z9nwDHVlz8_oc258_RSyaV3-e6sKjU' },
    { type: 'image', src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/kenneth.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0va2VubmV0aC5wbmciLCJpYXQiOjE3NjY2NzQzNzcsImV4cCI6MjA4MjAzNDM3N30.Ki14w98pIKQgGvD1ADl_ZkjgPq5ATZJKksl5M2NhgDA' },
    { type: 'image', src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/ashley.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vYXNobGV5LnBuZyIsImlhdCI6MTc2NjY3NDM5NiwiZXhwIjoyMDgyMDM0Mzk2fQ.oeikeVwogSryeLIVDTGkQXhzlSug3vSZGUSG-3mX0CE' },
    { type: 'image', src: 'https://zsbimpglrsvpwsbyzkbj.supabase.co/storage/v1/object/sign/stream/jiro.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wZWM5YjY2MS05MzE0LTQwODAtYmU4NS1iMjJjYTc3YmUxMTMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdHJlYW0vamlyby5wbmciLCJpYXQiOjE3NjY2NzQ0MDksImV4cCI6MjA4MjAzNDQwOX0.aPX8awmZL0tRn8R5CfvkfP43ajWiuml5W1PFyDVoPSY' },
    '🎧', '🕶️', '👾', '🚲'
  ];

  function createTile(iconData, group, index) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'icon-picker__tile';

    if (iconData.type === 'image') {
      const img = document.createElement('img');
      img.className = 'icon-picker__image';
      img.src = iconData.src;
      img.alt = 'Profile icon';
      tile.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.className = 'icon-picker__emoji';
      span.textContent = iconData.value || iconData;
      tile.appendChild(span);
    }

    const id = `${group}-${index}`;
    if (profile.iconId === id) {
      tile.classList.add('icon-picker__tile--selected');
    }

    const displayValue = iconData.type === 'image' ? iconData.src : (iconData.value || iconData);

    tile.addEventListener('click', async () => {
      profile.iconId = id;
      if (iconData.type === 'image') {
        profile.iconImage = iconData.src;
        profile.iconEmoji = null;
      } else {
        profile.iconEmoji = iconData.value || iconData;
        profile.iconImage = null;
      }
      localStorage.setItem('activeProfile', JSON.stringify(profile));

      // Save icon data to database immediately
      if (profile.id && supabase && currentUser) {
        try {
          const updateData = {
            icon_id: profile.iconId,
            icon_image: profile.iconImage,
            icon_emoji: profile.iconEmoji
          };

          const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id)
            .eq('user_id', currentUser.id);

          if (error) {
            console.error('Error saving icon to database:', error);
            // Still continue - icon is saved in localStorage
          }
        } catch (e) {
          console.error('Error saving profile icons to database:', e);
        }
      }

      if (currentAvatarEl) {
        if (iconData.type === 'image') {
          currentAvatarEl.innerHTML = `<img src="${iconData.src}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          currentAvatarEl.textContent = iconData.value || iconData;
        }
      }

      document
        .querySelectorAll('.icon-picker__tile')
        .forEach((el) => el.classList.remove('icon-picker__tile--selected'));
      tile.classList.add('icon-picker__tile--selected');

      // Go back to edit profile after selection
      window.location.href = '../edit/';
    });

    return tile;
  }

  if (classicsRow) {
    classicIcons.forEach((emoji, i) => {
      classicsRow.appendChild(createTile(emoji, 'classic', i));
    });
  }

  if (strangerRow) {
    strangerIcons.forEach((emoji, i) => {
      strangerRow.appendChild(createTile(emoji, 'stranger', i));
    });
  }
});


