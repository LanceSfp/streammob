// Basic Supabase auth helpers for Stream
// 1. Fill in your own Supabase URL + anon key below.
// 2. Include this file (and the Supabase CDN script) on any page that needs auth.

const SUPABASE_URL = 'https://zsbimpglrsvpwsbyzkbj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYmltcGdscnN2cHdzYnl6a2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTM2MDksImV4cCI6MjA4MjA2OTYwOX0.X3uqParpSsUkGs1i_PDEk92gxNDoQnLF8dl-fZeyqAU';

let supabaseClient = null;

function initSupabase() {
  if (!window.supabase) {
    console.error('Supabase library not found. Make sure the CDN script is included before auth.js.');
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

function showAuthMessage(id, message, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.dataset.type = type;
  el.hidden = !message;
}

document.addEventListener('DOMContentLoaded', () => {
  const supabase = initSupabase();
  if (!supabase) return;

  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      showAuthMessage('auth-error', '');

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value.trim();

      if (!email || !password) {
        showAuthMessage('auth-error', 'Please enter your email and password.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        showAuthMessage('auth-error', error.message || 'Unable to sign in. Please try again.');
        return;
      }

      // Signed in successfully – send them to profiles/browse
      window.location.href = '../profiles/';
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      showAuthMessage('signup-error', '');

      const email = signupForm.email.value.trim();
      const password = signupForm.password.value.trim();

      if (!email || !password) {
        showAuthMessage('signup-error', 'Please enter an email and password.');
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        showAuthMessage('signup-error', error.message || 'Unable to sign up. Please try again.');
        return;
      }

      showAuthMessage(
        'signup-error',
        'Check your email to confirm your account, then you can sign in.',
        'success'
      );
      signupForm.reset();
    });
  }
});


