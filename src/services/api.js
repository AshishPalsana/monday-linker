import { getCSTDate } from '../utils/cstTime';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Module-level re-auth hook. AuthProvider registers this after getting the
// Monday identity so any 401 can silently refresh the JWT and retry.
let _reauthFn = null;
let _currentToken = null;
let _reauthInProgress = null; // Promise — prevents parallel re-auth races

export function registerReauth(fn) {
  _reauthFn = fn;
}

export function setCurrentToken(token) {
  _currentToken = token;
}

async function reauth() {
  if (!_reauthFn) return null;
  // Deduplicate: if re-auth is already running, wait for it
  if (_reauthInProgress) return _reauthInProgress;
  _reauthInProgress = _reauthFn().finally(() => { _reauthInProgress = null; });
  return _reauthInProgress;
}

async function request(method, path, body, token) {
  const tok = token ?? _currentToken;
  const headers = { 'Content-Type': 'application/json' };
  if (tok) headers['Authorization'] = `Bearer ${tok}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // On 401: silently refresh the JWT once and retry
  if (res.status === 401) {
    const newToken = await reauth();
    if (newToken) {
      const retryHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${newToken}` };
      const retry = await fetch(`${BASE}${path}`, {
        method,
        headers: retryHeaders,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (!retry.ok) {
        const errData = await retry.json().catch(() => ({}));
        const message = errData.error || errData.errors?.[0]?.msg || `HTTP ${retry.status}`;
        const err = new Error(message);
        err.status = retry.status;
        err.data = errData;
        throw err;
      }
      return retry.status === 204 ? null : retry.json();
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error || errData.errors?.[0]?.msg || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = errData;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const authApi = {
  login: (data) => request('POST', '/api/auth/login', data, null),
};

export const timeEntriesApi = {
  getToday:  (token)           => request('GET',   `/api/time-entries?date=${getCSTDate()}`, undefined, token),
  clockIn:   (token, data)     => request('POST',  '/api/time-entries/clock-in',     data,      token),
  clockOut:  (token, id, data) => request('PATCH', `/api/time-entries/${id}/clock-out`, data,  token),
};

export const workOrderApi = {
  prepareInvoice: (id, token) => request('POST', `/api/billing/work-orders/${id}/prepare-invoice`, {}, token),
};

export const technicianApi = {
  getAll:         (token)       => request('GET',  '/api/technicians',                  undefined, token),
  syncFromMonday: (token)       => request('POST', '/api/technicians/sync-from-monday', {},        token),
};

export const customerApi = {
  syncAll: (token) => request('POST', '/api/customers/sync-all', {}, token),
};

export const locationsApi = {
  getAll: (token)         => request('GET',   '/api/locations',     undefined, token),
  create: (token, data)    => request('POST',  '/api/locations',     data, token),
  update: (token, id, data) => request('PATCH', `/api/locations/${id}`, data, token),
};
