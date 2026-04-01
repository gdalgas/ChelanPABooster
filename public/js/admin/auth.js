// ── Auth ──────────────────────────────────────────────────────────────────────
// Login, logout, token management.
// Requires: loadEvents and loadBoard to be defined (by events.js and board.js).

let token = sessionStorage.getItem('admin_token') || '';

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function handleUnauthorized() {
  sessionStorage.removeItem('admin_token');
  location.reload();
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'block';
}

// ── Login form ────────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password  = document.getElementById('password').value;
  const loginError = document.getElementById('login-error');
  loginError.style.display = 'none';
  const btn = e.currentTarget.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const res  = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      token = password;
      sessionStorage.setItem('admin_token', token);
      showApp();
      loadEvents();
      loadBoard();
      loadGallery();
    } else {
      loginError.textContent = data.error || 'Sign in failed';
      loginError.style.display = 'block';
    }
  } catch {
    loginError.textContent = 'Network error. Please try again.';
    loginError.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
  sessionStorage.removeItem('admin_token');
  token = '';
  location.reload();
});

