/**
 * api.js — Phase 1 stub / Phase 2 fills the real implementation.
 *
 * apiFetch(path, options):
 *   - Always relative paths (Vite proxy handles /api → localhost:3001)
 *   - Reads Bearer token from localStorage
 *   - Returns { ok, status, data } — never throws on 4xx/5xx
 *   - On network failure: { ok: false, status: 0, data: null }
 */

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('jamie_token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(path, { ...options, headers });
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}

export function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}
