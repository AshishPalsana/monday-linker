const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    // express-validator returns { errors: [{msg, path}] }; other routes return { error: "..." }
    const message = errData.error || errData.errors?.[0]?.msg || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data   = errData;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const authApi = {
  login: (data) => request('POST', '/api/auth/login', data, null),
};

export const timeEntriesApi = {
  // Pass today's local date so the server uses the correct calendar day
  // regardless of the server's own timezone.
  getToday:  (token)           => request('GET',   `/api/time-entries?date=${new Date().toLocaleDateString('en-CA')}`, undefined, token),
  clockIn:   (token, data)     => request('POST',  '/api/time-entries/clock-in',     data,      token),
  clockOut:  (token, id, data) => request('PATCH', `/api/time-entries/${id}/clock-out`, data,  token),
};

export const workOrderApi = {
  prepareInvoice: (id, token) => request('POST', `/api/billing/work-orders/${id}/prepare-invoice`, {}, token),
};
