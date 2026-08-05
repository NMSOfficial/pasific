/**
 * Strips any trailing slash from VITE_API_URL before it gets concatenated
 * with a leading-slash path (`${API_BASE}/api/...`) elsewhere. Without this,
 * a trailing slash on the env var (an easy copy/paste mistake, e.g.
 * "https://host.app/" instead of "https://host.app") produces a
 * double-slash URL like "https://host.app//api/grade" — Express's exact
 * path matching doesn't match that against "/api/grade", so every request
 * silently 404s before it ever reaches the route handler.
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
