/**
 * Workspace (authenticated API) is opt-in at build time.
 * A marketing-only deploy omits NEXT_PUBLIC_API_BASE_URL so the browser never
 * has a backend origin to call. Local `.env.local` sets the URL so /login works.
 */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export const isWorkspaceEnabled = API_BASE_URL.length > 0;
