// ============================================================
// Job Management — Auth interactions
// Drives the "work order" stub: ticket id, route progress, and
// the two form flows (login / register).
// ============================================================

const API_BASE_URL = '/api';
const BRANCHES = ['Andheri', 'Thane', 'Dadar', 'Vashi'];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function pad(n, len) {
  return String(n).padStart(len, '0');
}

function generateTicketId() {
  const year = new Date().getFullYear();
  const seq = pad(Math.floor(Math.random() * 9000) + 1000, 4);
  return `WO-${year}-${seq}`;
}

function setTicketId() {
  const el = document.getElementById('ticketId');
  if (el) el.textContent = generateTicketId();
}

function buildRoute(activeIndex) {
  const line = document.getElementById('routeLine');
  if (!line) return;

  line.innerHTML = '';

  const progress = document.createElement('div');
  progress.className = 'route-progress';
  progress.id = 'routeProgress';
  line.appendChild(progress);

  BRANCHES.forEach((name, i) => {
    const stop = document.createElement('div');
    stop.className = 'stop' + (i === activeIndex ? ' is-active' : '');
    stop.dataset.index = i;
    stop.innerHTML = `<span class="stop-dot"></span><span class="stop-name">${name}</span>`;
    line.appendChild(stop);
  });

  updateRouteProgress(activeIndex);
}

function updateRouteProgress(activeIndex) {
  const progress = document.getElementById('routeProgress');
  const line = document.getElementById('routeLine');
  if (!progress || !line) return;

  const stops = line.querySelectorAll('.stop');
  stops.forEach((s, i) => s.classList.toggle('is-active', i === activeIndex));

  // width runs from ~4% (first stop) to ~96% (last stop)
  const ratio = BRANCHES.length > 1 ? activeIndex / (BRANCHES.length - 1) : 0;
  const pct = 4 + ratio * 92;
  progress.style.width = pct + '%';
}

// Ambient cycling on the login page (no branch context to anchor to)
function startAmbientRoute() {
  let idx = 0;
  buildRoute(idx);
  if (prefersReducedMotion) return;

  setInterval(() => {
    idx = (idx + 1) % BRANCHES.length;
    updateRouteProgress(idx);
  }, 2600);
}

// Branch-driven route on the register page
function bindBranchRoute() {
  const select = document.getElementById('branch');
  buildRoute(-1);

  if (!select) return;

  select.addEventListener('change', () => {
    const idx = BRANCHES.indexOf(select.value);
    updateRouteProgress(idx);

    const stamp = document.getElementById('stubStamp');
    if (stamp) {
      if (idx > -1) {
        stamp.textContent = `Routing · ${select.value}`;
        stamp.classList.remove('stamp-pending');
      } else {
        stamp.textContent = 'Awaiting branch';
        stamp.classList.add('stamp-pending');
      }
    }
  });
}

// Password visibility toggle
function bindPasswordToggles() {
  document.querySelectorAll('.toggle-visibility').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      btn.innerHTML = isHidden ? eyeOffIcon() : eyeIcon();
    });
  });
}

function eyeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function eyeOffIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'message ' + type;
}

function clearMessage(el) {
  el.textContent = '';
  el.className = 'message';
}

function setLoading(button, loading) {
  button.classList.toggle('is-loading', loading);
  button.disabled = loading;
}

// ---------------- Login form ----------------

function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const message = document.getElementById('loginMessage');
  const button = document.getElementById('loginButton');
  const stamp = document.getElementById('stubStamp');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage(message);

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showMessage(message, 'Enter your username and password to continue.', 'error');
      return;
    }

    setLoading(button, true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.detail || 'Invalid username or password.';
        showMessage(message, errorMessage, 'error');
        return;
      }

      localStorage.setItem('access_token', data.data.access);
      localStorage.setItem('refresh_token', data.data.refresh);
      localStorage.setItem('username', username);
      localStorage.setItem('branch', data.data.branch || '');
      localStorage.setItem('role', data.data.role || '');
      localStorage.setItem('klickit-theme', 'dark');

      showMessage(message, 'Login successful. Redirecting...', 'success');

      if (stamp) {
        stamp.textContent = 'Authorized';
        stamp.classList.remove('stamp-pending');
      }

      setTimeout(() => {
        window.location.replace('./index.html');
      }, 700);
    } catch (error) {
      console.error(error);
      showMessage(message, 'Unable to connect to server.', 'error');
    } finally {
      setLoading(button, false);
    }
  });
}

// ---------------- Register form ----------------

function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const message = document.getElementById('registerMessage');
  const button = document.getElementById('registerButton');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage(message);

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phoneEl = document.getElementById('phone');
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const branch = document.getElementById('branch').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!username || !email || !branch || !password || !confirmPassword) {
      showMessage(message, 'Fill in every required field before submitting.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showMessage(message, 'Passwords do not match.', 'error');
      return;
    }

    if (password.length < 8) {
      showMessage(message, 'Password must be at least 8 characters.', 'error');
      return;
    }

    setLoading(button, true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, phone, branch, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = 'Registration failed.';
        const errors = Object.values(data);
        if (errors.length > 0) {
          errorMessage = errors.flat().join(' ');
        }
        showMessage(message, errorMessage, 'error');
        return;
      }

      showMessage(message, 'Account created successfully. Redirecting to login...', 'success');

      setTimeout(() => {
        window.location.replace('login.html');
      }, 1000);
    } catch (error) {
      console.error(error);
      showMessage(message, 'Unable to connect to server.', 'error');
    } finally {
      setLoading(button, false);
    }
  });
}

// ---------------- Boot ----------------

document.addEventListener('DOMContentLoaded', () => {
  setTicketId();
  bindPasswordToggles();

  if (document.getElementById('loginForm')) {
    startAmbientRoute();
    initLoginForm();
  }

  if (document.getElementById('registerForm')) {
    bindBranchRoute();
    initRegisterForm();
  }
});