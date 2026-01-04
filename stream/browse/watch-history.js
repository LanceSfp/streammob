// Watch History Management
// Handles saving and loading user watch progress

class WatchHistory {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.currentProfile = null;
    this.saveInterval = null;
    this.lastSaveTime = 0;
    this.saveThrottle = 5000; // Save every 5 seconds
  }

  async init() {
    console.log('WatchHistory.init() called');
    this.supabase = typeof initSupabase === 'function' ? initSupabase() : null;
    if (!this.supabase) {
      console.warn('Supabase not initialized, watch history will use localStorage only');
    }

    try {
      if (this.supabase) {
        const { data: sessionData } = await this.supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          this.currentUser = sessionData.session.user;
          console.log('User loaded:', this.currentUser ? 'Yes' : 'No');
        }
      }
    } catch (e) {
      console.error('Error getting session:', e);
    }

    // Get current profile - CRITICAL: This must be loaded
    try {
      const profileData = localStorage.getItem('activeProfile');
      console.log('Profile data from localStorage:', profileData ? 'Found' : 'Not found');
      if (profileData) {
        this.currentProfile = JSON.parse(profileData);
        console.log('Profile loaded:', this.currentProfile ? { id: this.currentProfile.id, name: this.currentProfile.name } : 'Failed to parse');
      } else {
        console.warn('No activeProfile in localStorage - watch history will use "default" profile ID');
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
    
    console.log('WatchHistory initialized:', {
      hasUser: !!this.currentUser,
      hasProfile: !!this.currentProfile,
      profileId: this.currentProfile?.id || 'default'
    });
  }

  // Generate a unique video ID from URL or title
  generateVideoId(videoUrl, videoTitle) {
    if (videoUrl) {
      // Extract a unique identifier from URL
      const urlMatch = videoUrl.match(/\/([^\/]+\.(m3u8|mp4))/);
      if (urlMatch) {
        return urlMatch[1].replace(/\.(m3u8|mp4)$/, '');
      }
    }
    // Fallback to title-based ID
    return videoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // Save watch progress
  async saveProgress(videoUrl, videoTitle, currentTime, duration, thumbnailUrl = null) {
    console.log('saveProgress called:', { videoUrl, videoTitle, currentTime, duration, hasUser: !!this.currentUser, hasProfile: !!this.currentProfile });
    
    if (!this.currentUser || !this.currentProfile) {
      // Fallback to localStorage
      console.log('No user/profile, saving to localStorage');
      this.saveProgressToLocalStorage(videoUrl, videoTitle, currentTime, duration, thumbnailUrl);
      return;
    }

    const videoId = this.generateVideoId(videoUrl, videoTitle);
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Throttle saves
    const now = Date.now();
    if (now - this.lastSaveTime < this.saveThrottle) {
      return;
    }
    this.lastSaveTime = now;

    try {
      const { error } = await this.supabase
        .from('watch_history')
        .upsert({
          user_id: this.currentUser.id,
          profile_id: this.currentProfile.id,
          video_id: videoId,
          video_title: videoTitle,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          watch_time: currentTime,
          duration: duration,
          progress_percent: progressPercent,
          last_watched_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,profile_id,video_id'
        });

      if (error) {
        console.error('Error saving watch history:', error);
        // Fallback to localStorage
        this.saveProgressToLocalStorage(videoUrl, videoTitle, currentTime, duration, thumbnailUrl);
      } else {
        // Also save to localStorage as backup
        this.saveProgressToLocalStorage(videoUrl, videoTitle, currentTime, duration, thumbnailUrl);
      }
    } catch (e) {
      console.error('Error saving watch history:', e);
      this.saveProgressToLocalStorage(videoUrl, videoTitle, currentTime, duration, thumbnailUrl);
    }
  }

  // Save to localStorage as fallback
  saveProgressToLocalStorage(videoUrl, videoTitle, currentTime, duration, thumbnailUrl) {
    try {
      // Make sure profile is loaded
      if (!this.currentProfile) {
        const profileData = localStorage.getItem('activeProfile');
        if (profileData) {
          try {
            this.currentProfile = JSON.parse(profileData);
          } catch (e) {
            console.error('Error parsing profile:', e);
          }
        }
      }
      
      const videoId = this.generateVideoId(videoUrl, videoTitle);
      const profileId = this.currentProfile?.id || 'default';
      const key = `watch_history_${profileId}`;
      
      console.log('Saving to localStorage:', { key, videoId, profileId });
      
      let history = {};
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          history = JSON.parse(stored);
          console.log('Existing history found:', Object.keys(history).length, 'items');
        }
      } catch (e) {
        console.error('Error parsing existing history:', e);
      }

      history[videoId] = {
        videoUrl,
        videoTitle,
        currentTime,
        duration,
        thumbnailUrl,
        progressPercent: duration > 0 ? (currentTime / duration) * 100 : 0,
        lastWatchedAt: new Date().toISOString()
      };

      localStorage.setItem(key, JSON.stringify(history));
      console.log('Saved to localStorage successfully. Key:', key, 'VideoId:', videoId);
      
      // Verify it was saved
      const verify = localStorage.getItem(key);
      console.log('Verification - localStorage has data:', !!verify);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  // Load watch progress for a video
  async getProgress(videoUrl, videoTitle) {
    if (!this.currentUser || !this.currentProfile) {
      return this.getProgressFromLocalStorage(videoUrl, videoTitle);
    }

    const videoId = this.generateVideoId(videoUrl, videoTitle);

    try {
      const { data, error } = await this.supabase
        .from('watch_history')
        .select('watch_time, duration, progress_percent')
        .eq('user_id', this.currentUser.id)
        .eq('profile_id', this.currentProfile.id)
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading watch history:', error);
        return this.getProgressFromLocalStorage(videoUrl, videoTitle);
      }

      if (data) {
        return {
          currentTime: data.watch_time,
          duration: data.duration,
          progressPercent: data.progress_percent
        };
      }
    } catch (e) {
      console.error('Error loading watch history:', e);
    }

    return this.getProgressFromLocalStorage(videoUrl, videoTitle);
  }

  // Get progress from localStorage
  getProgressFromLocalStorage(videoUrl, videoTitle) {
    try {
      const videoId = this.generateVideoId(videoUrl, videoTitle);
      const profileId = this.currentProfile?.id || 'default';
      const key = `watch_history_${profileId}`;
      
      const stored = localStorage.getItem(key);
      if (stored) {
        const history = JSON.parse(stored);
        if (history[videoId]) {
          return {
            currentTime: history[videoId].currentTime,
            duration: history[videoId].duration,
            progressPercent: history[videoId].progressPercent
          };
        }
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
    return null;
  }

  // Get all watch history (for Continue Watching section)
  async getAllHistory(limit = 20) {
    console.log('getAllHistory called:', { hasUser: !!this.currentUser, hasProfile: !!this.currentProfile, limit });
    
    if (!this.currentUser || !this.currentProfile) {
      console.log('No user/profile, loading from localStorage');
      const localHistory = await this.getAllHistoryFromLocalStorage(limit);
      console.log('LocalStorage history:', localHistory);
      return localHistory;
    }

    try {
      const { data, error } = await this.supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('profile_id', this.currentProfile.id)
        .order('last_watched_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error loading watch history:', error);
        return this.getAllHistoryFromLocalStorage(limit);
      }

      console.log('Database history loaded:', data);
      return data || [];
    } catch (e) {
      console.error('Error loading watch history from database:', e);
      console.log('Falling back to localStorage');
      const localHistory = await this.getAllHistoryFromLocalStorage(limit);
      console.log('LocalStorage history (fallback):', localHistory);
      return localHistory;
    }
  }

  // Get all history from localStorage
  getAllHistoryFromLocalStorage(limit) {
    try {
      // Make sure profile is loaded
      if (!this.currentProfile) {
        const profileData = localStorage.getItem('activeProfile');
        if (profileData) {
          try {
            this.currentProfile = JSON.parse(profileData);
            console.log('Profile loaded in getAllHistoryFromLocalStorage:', this.currentProfile?.id);
          } catch (e) {
            console.error('Error parsing profile:', e);
          }
        }
      }
      
      const profileId = this.currentProfile?.id || 'default';
      const key = `watch_history_${profileId}`;
      console.log('Loading from localStorage with key:', key, 'profileId:', profileId);
      
      // Also check all possible keys to debug
      console.log('All localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('watch_history_')));
      
      const stored = localStorage.getItem(key);
      console.log('LocalStorage stored data:', stored ? 'Found (' + stored.length + ' chars)' : 'null');
      if (stored) {
        const history = JSON.parse(stored);
        console.log('Parsed history object:', history);
        console.log('History object keys:', Object.keys(history));
        const items = Object.values(history)
          .sort((a, b) => new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0))
          .slice(0, limit);
        console.log('Sorted and limited items:', items);
        return items;
      } else {
        // Try to find any watch history keys
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('watch_history_'));
        if (allKeys.length > 0) {
          console.log('Found watch history keys but not matching profile:', allKeys);
          // Try loading from the first one found
          const firstKey = allKeys[0];
          const storedAlt = localStorage.getItem(firstKey);
          if (storedAlt) {
            console.log('Loading from alternative key:', firstKey);
            const history = JSON.parse(storedAlt);
            const items = Object.values(history)
              .sort((a, b) => new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0))
              .slice(0, limit);
            return items;
          }
        }
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
    console.log('No localStorage history found, returning empty array');
    return [];
  }

  // Clear watch history for a video
  async clearProgress(videoUrl, videoTitle) {
    if (!this.currentUser || !this.currentProfile) {
      this.clearProgressFromLocalStorage(videoUrl, videoTitle);
      return;
    }

    const videoId = this.generateVideoId(videoUrl, videoTitle);

    try {
      await this.supabase
        .from('watch_history')
        .delete()
        .eq('user_id', this.currentUser.id)
        .eq('profile_id', this.currentProfile.id)
        .eq('video_id', videoId);
    } catch (e) {
      console.error('Error clearing watch history:', e);
    }

    this.clearProgressFromLocalStorage(videoUrl, videoTitle);
  }

  clearProgressFromLocalStorage(videoUrl, videoTitle) {
    try {
      const videoId = this.generateVideoId(videoUrl, videoTitle);
      const profileId = this.currentProfile?.id || 'default';
      const key = `watch_history_${profileId}`;
      
      const stored = localStorage.getItem(key);
      if (stored) {
        const history = JSON.parse(stored);
        delete history[videoId];
        localStorage.setItem(key, JSON.stringify(history));
      }
    } catch (e) {
      console.error('Error clearing from localStorage:', e);
    }
  }
}

// Create global instance
window.watchHistory = new WatchHistory();

