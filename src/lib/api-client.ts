import {
  clearSession,
  getMountedSessionId,
  getSession,
  peekBrowserSession,
  saveSession,
  type StoredSession,
} from "./auth";
import type { LoginResponse } from "./types";
import { API_BASE_URL } from "./workspace";

function withRequestId(message: string, requestId: string | null) {
  if (!requestId) return message;
  return `${message} (request ${requestId})`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

type InflightListener = (count: number) => void;

let inflight = 0;
const inflightListeners = new Set<InflightListener>();

function setInflight(next: number) {
  inflight = Math.max(0, next);
  inflightListeners.forEach((listener) => listener(inflight));
}

export function subscribeInflight(listener: InflightListener) {
  inflightListeners.add(listener);
  listener(inflight);
  return () => {
    inflightListeners.delete(listener);
  };
}

export function getInflightCount() {
  return inflight;
}

export const NAV_COUNTS_CHANGED_EVENT = "nav-counts-changed";

export function notifyNavCountsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAV_COUNTS_CHANGED_EVENT));
}

function beginRequest() {
  setInflight(inflight + 1);
}

function endRequest() {
  setInflight(inflight - 1);
}

let redirectingToLogin = false;
let refreshPromise: Promise<StoredSession | null> | null = null;

function redirectExpiredSession(sessionId?: string) {
  if (typeof window === "undefined") return;
  clearSession(sessionId);
  if (window.location.pathname === "/login" || redirectingToLogin) return;
  redirectingToLogin = true;
  window.location.replace("/login?reason=session_expired");
}

async function refreshSessionOnce(expectedSessionId: string): Promise<StoredSession | null> {
  if (!API_BASE_URL) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const latest = peekBrowserSession();
    if (!latest || latest.sessionId !== expectedSessionId) {
      return null;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: latest.refreshToken }),
      });
      if (!response.ok) {
        return null;
      }
      const nextLogin = (await response.json()) as LoginResponse;
      return saveSession(nextLogin);
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function resolveActiveSession(): Promise<StoredSession | null> {
  const mountedId = getMountedSessionId();
  const current = mountedId ? getSession() : peekBrowserSession();
  if (!current) {
    return null;
  }
  if (Date.now() >= current.accessExpiresAt - 30_000) {
    return await refreshSessionOnce(current.sessionId);
  }
  return current;
}

export async function logoutSession(): Promise<void> {
  const current = peekBrowserSession();
  if (current && API_BASE_URL) {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${current.accessToken}` },
      });
    } catch {
      // Best-effort server revocation
    }
  }
  redirectingToLogin = false;
  clearSession();
}

export async function trackedFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  beginRequest();
  try {
    let activeSession: StoredSession | null = null;
    const nextInit: RequestInit = { ...init };
    if (API_BASE_URL && input.startsWith(API_BASE_URL)) {
      activeSession = await resolveActiveSession();
      if (activeSession) {
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${activeSession.accessToken}`);
        nextInit.headers = headers;
      }
    }

    let response = await fetch(input, nextInit);
    if (response.status === 401 && activeSession) {
      const refreshed = await refreshSessionOnce(activeSession.sessionId);
      if (refreshed && !(init?.body instanceof FormData)) {
        const retryHeaders = new Headers(init?.headers);
        retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);
        response = await fetch(input, { ...init, headers: retryHeaders });
      }
      if (response.status === 401) {
        redirectExpiredSession(activeSession.sessionId);
      }
    }
    const reqMethod = (init?.method ?? "GET").toUpperCase();
    if (reqMethod !== "GET" && response.ok) {
      notifyNavCountsChanged();
    }
    return response;
  } finally {
    endRequest();
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  if (!API_BASE_URL) {
    throw new ApiError("Workspace is not available on this site.", 503);
  }

  let activeSession: StoredSession | null = null;
  if (auth) {
    activeSession = await resolveActiveSession();
    if (!activeSession) {
      redirectExpiredSession();
      throw new ApiError("Sign in to continue", 401, "UNAUTHENTICATED");
    }
  } else {
    redirectingToLogin = false;
  }

  const execute = async (token?: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  beginRequest();
  try {
    let response = await execute(activeSession?.accessToken);

    if (response.status === 401 && auth && activeSession) {
      const refreshed = await refreshSessionOnce(activeSession.sessionId);
      if (refreshed) {
        activeSession = refreshed;
        response = await execute(refreshed.accessToken);
      }
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      let errorCode: string | undefined;
      try {
        const errorBody = await response.json();
        message = errorBody.message ?? message;
        errorCode = errorBody.errorCode;
      } catch {
        // Fallback to status message
      }
      message = withRequestId(message, response.headers.get("X-Request-Id"));
      if (auth && response.status === 401) {
        redirectExpiredSession(activeSession?.sessionId);
      }
      throw new ApiError(message, response.status, errorCode);
    }

    if (method !== "GET" && !path.startsWith("/api/v1/auth/")) {
      notifyNavCountsChanged();
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } finally {
    endRequest();
  }
}

export async function extractErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errorBody = await response.json();
    return withRequestId(errorBody.message ?? fallback, response.headers.get("X-Request-Id"));
  } catch {
    return fallback;
  }
}
