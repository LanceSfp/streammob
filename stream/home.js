(() => {
  function redirectTo(path) {
    window.location.href = path;
  }

  function getActiveProfile() {
    try {
      const raw = localStorage.getItem('activeProfile');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function init() {
    const supabase = initSupabase();
    if (!supabase) return;

    // Check if user is signed in
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      // User is signed in - check if they have a profile
      const profile = getActiveProfile();
      if (profile) {
        // User has a profile, redirect to browse
        redirectTo('browse/');
      } else {
        // User doesn't have a profile, redirect to profiles
        redirectTo('profiles/');
      }
    }
    // If not signed in, allow them to stay on the home page
  }

  document.addEventListener('DOMContentLoaded', init);
})();

