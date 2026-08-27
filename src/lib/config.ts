// PharmaChain runtime config
// VITE_API_URL lets the frontend target a deployed backend (e.g. on Vercel).
// When unset, relative /api paths are used (Vite dev proxy → Express on localhost:41837).
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Helper: prepend the API base URL to a path, preserving relative calls when no base is set
export function apiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
