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
    const message = errData.error || errData.errors?.[0]?.msg || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data   = errData;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export const integrationApi = {
  // ── Xero OAuth ─────────────────────────────────────────────────────────────
  getXeroStatus:   (token)              => request('GET',  '/api/xero/status',      undefined, token),
  connectXero:     (token)              => request('GET',  '/api/xero/connect',     undefined, token),
  disconnectXero:  (token)              => request('POST', '/api/xero/disconnect',  undefined, token),

  // ── Xero Work Order Sync ───────────────────────────────────────────────────
  /**
   * Get the Xero Project sync status for a Work Order.
   * @param {string} mondayItemId - Monday.com pulse/item ID
   * @param {string} token - JWT auth token
   * @returns {{ synced: boolean, xeroProjectId?: string, workOrderId?: string, error?: string }}
   */
  getXeroSyncStatus: (mondayItemId, token) =>
    request('GET', `/api/xero/sync-status/${mondayItemId}`, undefined, token),

  /**
   * Retry failed Xero Project creation for a Work Order.
   * @param {string} mondayItemId - Monday.com pulse/item ID
   * @param {string} token - JWT auth token
   */
  retryXeroSync: (mondayItemId, token) =>
    request('POST', `/api/xero/retry-sync/${mondayItemId}`, undefined, token),

  // ── CompanyCam (placeholder until backend is ready) ────────────────────────
  getCompanyCamStatus: (token) => request('GET', '/api/xero/status', undefined, token),
};
