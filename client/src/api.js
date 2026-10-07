async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  list: () => request('/api/monitors'),
  create: (body) => request('/api/monitors', { method: 'POST', body }),
  update: (id, body) => request(`/api/monitors/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`/api/monitors/${id}`, { method: 'DELETE' }),
  checkNow: (id) => request(`/api/monitors/${id}/check`, { method: 'POST' }),
  results: (id, limit = 80) => request(`/api/monitors/${id}/results?limit=${limit}`),
  failures: (id) => request(`/api/monitors/${id}/failures?limit=30`),
};

export function fmtMs(ms) {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} sec` : `${ms} ms`;
}

export function fmtTime(date) {
  if (!date) return 'never';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(date) {
  return new Date(date).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function fmtAgo(date) {
  if (!date) return 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function fmtPct(v) {
  return v == null ? '—' : `${v}%`;
}
