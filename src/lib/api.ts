// PharmaChain API client - connects the existing UI to the real MongoDB backend
// Uses relative /api paths (Vite dev proxy -> Express on :41837; production Express serves both)
import { apiUrl } from './config';

const TOKEN_KEY = 'pharma_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: any;
  auth?: boolean;
}

async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    const message =
      err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')
        ? 'Unable to reach the PharmaChain backend. Please make sure the backend server is running and reachable.'
        : err?.message || 'Network request failed.';
    throw new ApiError(message, 0);
  }

  let data: any = null;
  let responseText = '';
  try {
    responseText = await res.text();
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    // Keep the raw response so deployment errors are actionable.
  }

  if (!res.ok) {
    const htmlResponse = responseText.trim().startsWith('<') || responseText.startsWith('The page');
    const message = data?.error || data?.message || (htmlResponse
      ? `The API endpoint is not available on this deployment (${res.status}). Check the Vercel serverless API configuration.`
      : `Request failed (${res.status})`);
    throw new ApiError(message, res.status);
  }

  if (data === null) {
    throw new ApiError('The server returned an invalid non-JSON response. Check the deployment API configuration.', res.status);
  }

  return data as T;
}

// ---------- Auth ----------
export const authApi = {
  register: (payload: any) => request('/api/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (email: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => request('/api/auth/me'),
  getUsers: () => request('/api/auth/users'),
  getDealers: () => request('/api/auth/dealers'),
  approveUser: (id: string) => request(`/api/auth/users/${id}/approve`, { method: 'POST' }),
  rejectUser: (id: string) => request(`/api/auth/users/${id}/reject`, { method: 'POST' }),
  listUsers: (role?: string) => {
    const qs = role ? `?role=${encodeURIComponent(role)}` : '';
    return request(`/api/auth/users/by-role${qs}`);
  },
};

// ---------- Medicines ----------
export const medicineApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/medicines${qs ? `?${qs}` : ''}`);
  },
  register: (payload: any) => request('/api/medicines/register', { method: 'POST', body: payload }),
  getById: (id: string) => request(`/api/medicines/${id}`),
  getCatalog: (q = '') => request(`/api/medicines/catalog${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  updateStatus: (id: string, status: string) =>
    request(`/api/medicines/${id}/status`, { method: 'PATCH', body: { status } }),
  search: (q: string) => request(`/api/medicines?q=${encodeURIComponent(q)}`),
};

// ---------- QR Verification ----------
export const qrApi = {
  getByQrId: (qrId: string) => request(`/api/qr/verify/${encodeURIComponent(qrId)}`, { auth: false }),
  verify: (payload: { qrId: string; location?: string; device?: string; geo?: any }) =>
    request('/api/qr/verify', { method: 'POST', body: payload, auth: false }),
  getHistory: (qrId: string) => request(`/api/qr/verify/${encodeURIComponent(qrId)}/history`),
};

// ---------- Shipments ----------
export const shipmentApi = {
  list: () => request('/api/shipments'),
  create: (payload: any) => request('/api/shipments', { method: 'POST', body: payload }),
  getById: (id: string) => request(`/api/shipments/${id}`),
  getByQrId: (qrId: string) => request(`/api/shipments/qr/${encodeURIComponent(qrId)}`, { auth: false }),
  updateStatus: (id: string, payload: any) =>
    request(`/api/shipments/${id}/status`, { method: 'PATCH', body: payload }),
  assignTransport: (id: string, transportId: string) =>
    request(`/api/shipments/${id}/assign`, { method: 'PATCH', body: { transportId } }),
  acceptDelivery: (id: string) =>
    request(`/api/shipments/${id}/accept`, { method: 'POST' }),
};

// ---------- Tracking ----------
export const trackingApi = {
  updateLocation: (shipmentId: string, payload: any) =>
    request(`/api/tracking/${shipmentId}/location`, { method: 'POST', body: payload }),
  uploadProof: (shipmentId: string, payload: any) =>
    request(`/api/tracking/${shipmentId}/proof`, { method: 'POST', body: payload }),
  getTimeline: (shipmentId: string) => request(`/api/tracking/timeline/${shipmentId}`),
  getPublicTracking: (qrId: string) => request(`/api/tracking/public/${encodeURIComponent(qrId)}`, { auth: false }),
};

// ---------- Transport Box ----------
export const transportBoxApi = {
  list: () => request('/api/transport-box/list'),
  directory: () => request('/api/transport-box/directory'),
  create: (payload: any) => request('/api/transport-box/create', { method: 'POST', body: payload }),
  get: (boxId: string) => request(`/api/transport-box/${encodeURIComponent(boxId)}`),
  scan: (boxId: string, payload: any = {}) =>
    request(`/api/transport-box/${encodeURIComponent(boxId)}/scan`, { method: 'POST', body: payload }),
  updateStatus: (boxId: string, payload: any) =>
    request(`/api/transport-box/${encodeURIComponent(boxId)}/status`, { method: 'PUT', body: payload }),
  updateLocation: (boxId: string, payload: any) =>
    request(`/api/transport-box/${encodeURIComponent(boxId)}/location`, { method: 'POST', body: payload }),
  getTimeline: (boxId: string) => request(`/api/transport-box/${encodeURIComponent(boxId)}/timeline`),
  getPublic: (boxId: string) => request(`/api/transport-box/public/${encodeURIComponent(boxId)}`, { auth: false }),
};

// ---------- Admin ----------
export const adminApi = {
  importCatalog: (rows: any[]) => request('/api/admin/catalog/import', { method: 'POST', body: { rows } }),
  seedCatalog: () => request('/api/admin/catalog/seed', { method: 'POST' }),
  getCatalog: (q = '', source = '') => {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (source) qs.set('source', source);
    const s = qs.toString();
    return request(`/api/admin/catalog${s ? `?${s}` : ''}`);
  },
  getStats: () => request('/api/admin/stats'),
};

// ---------- Stock ----------
export const stockApi = {
  list: () => request('/api/stock'),
  getLowStock: (threshold: number = 50) => request(`/api/stock/low?threshold=${threshold}`),
};
