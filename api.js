/* ═══════════════════════════════════════════════
   api.js — shared helpers for all frontend pages
   ═══════════════════════════════════════════════ */

const API = 'http://localhost:5000/api';

// ── Token helpers ─────────────────────────────────
const Auth = {
  setToken: (t) => localStorage.setItem('authToken', t),
  getToken: ()  => localStorage.getItem('authToken'),
  removeToken: () => localStorage.removeItem('authToken'),
  setUser:  (u) => localStorage.setItem('authUser', JSON.stringify(u)),
  getUser:  ()  => JSON.parse(localStorage.getItem('authUser') || 'null'),
  removeUser: () => localStorage.removeItem('authUser'),
  clear:    ()  => { Auth.removeToken(); Auth.removeUser(); },
  isLoggedIn: () => !!Auth.getToken(),
};

// ── Fetch wrapper ─────────────────────────────────
async function apiFetch(path, opts = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({ success: false, message: 'Unexpected server response.' }));
  return { ok: res.ok, status: res.status, data };
}

// ── Alert helper ──────────────────────────────────
function showAlert(containerId, type, message) {
  const icons = { error: '⚠', success: '✓', warning: '!' };
  const el = document.getElementById(containerId);
  if (!el) return;
  const msgs = Array.isArray(message)
    ? `<ul>${message.map(m => `<li>${m.msg || m}</li>`).join('')}</ul>`
    : message;
  el.innerHTML = `<div class="alert ${type}"><span class="alert-icon">${icons[type] || '•'}</span><div>${msgs}</div></div>`;
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

// ── Button loading state ──────────────────────────
function setLoading(btn, isLoading, label = 'Submit') {
  btn.disabled = isLoading;
  btn.innerHTML = isLoading
    ? `<span class="spinner"></span>Please wait…`
    : label;
}

// ── Password strength ─────────────────────────────
function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw))    score++;
  if (/[@$!%*?&#^()_\-+=]/.test(pw)) score++;
  return score;
}

const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const strengthColors = ['', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60'];
