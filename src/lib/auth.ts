"use client";

import type { LoginResponse, UserProfile } from "./types";

const SESSION_KEY = "paytrix.auth.session";
const LEGACY_TOKEN_KEY = "b2bfintech.accessToken";
const LEGACY_USER_KEY = "b2bfintech.user";
const CHANNEL_NAME = "paytrix.auth";

export interface StoredSession {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  user: UserProfile;
}

type SessionListener = (session: StoredSession | null) => void;

const listeners = new Set<SessionListener>();
let broadcastChannel: BroadcastChannel | null = null;
let storageListenerAttached = false;
let mountedSessionId: string | null = null;

function ensureCrossTabSync() {
  if (typeof window === "undefined") return;
  if (!storageListenerAttached) {
    storageListenerAttached = true;
    window.addEventListener("storage", (event) => {
      if (event.key === SESSION_KEY || event.key === null) {
        const next = readStoredSession();
        notifyListeners(next);
      }
    });
  }
  if (!broadcastChannel && typeof BroadcastChannel !== "undefined") {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = () => {
      const next = readStoredSession();
      notifyListeners(next);
    };
  }
}

function notifyListeners(session: StoredSession | null) {
  listeners.forEach((listener) => listener(session));
}

function broadcastChange() {
  ensureCrossTabSync();
  try {
    broadcastChannel?.postMessage({ ts: Date.now() });
  } catch {
    // Ignore closed channel errors
  }
}

function cleanupLegacyKeys() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_USER_KEY);
}

function isValidStoredSession(candidate: unknown): candidate is StoredSession {
  if (!candidate || typeof candidate !== "object") return false;
  const s = candidate as Partial<StoredSession>;
  return (
    typeof s.sessionId === "string" &&
    s.sessionId.length > 0 &&
    typeof s.accessToken === "string" &&
    s.accessToken.length > 0 &&
    typeof s.refreshToken === "string" &&
    s.refreshToken.length > 0 &&
    typeof s.accessExpiresAt === "number" &&
    Boolean(s.user && typeof s.user.userId === "string" && typeof s.user.portal === "string" && typeof s.user.role === "string")
  );
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  cleanupLegacyKeys();
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredSession(parsed)) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(login: LoginResponse): StoredSession {
  const stored: StoredSession = {
    sessionId: login.sessionId,
    accessToken: login.accessToken,
    refreshToken: login.refreshToken,
    accessExpiresAt: Date.now() + login.expiresInSeconds * 1000,
    user: login.user,
  };
  if (typeof window !== "undefined") {
    cleanupLegacyKeys();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
    mountedSessionId = stored.sessionId;
    notifyListeners(stored);
    broadcastChange();
  }
  return stored;
}

export function updateSessionUser(sessionId: string, user: UserProfile) {
  if (typeof window === "undefined") return;
  const current = readStoredSession();
  if (!current || current.sessionId !== sessionId) return;
  const updated: StoredSession = { ...current, user };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  notifyListeners(updated);
}

export function bindMountedSession(sessionId: string | null) {
  mountedSessionId = sessionId;
}

export function getMountedSessionId(): string | null {
  return mountedSessionId;
}

export function getSession(): StoredSession | null {
  const current = readStoredSession();
  if (!current) return null;
  if (mountedSessionId && current.sessionId !== mountedSessionId) {
    return null;
  }
  return current;
}

/** Reads the raw browser session without the mounted-tab check (used on /login and initial mount). */
export function peekBrowserSession(): StoredSession | null {
  return readStoredSession();
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function getUser(): UserProfile | null {
  return getSession()?.user ?? null;
}

export function clearSession(expectedSessionId?: string) {
  if (typeof window === "undefined") return;
  cleanupLegacyKeys();
  if (expectedSessionId) {
    const current = readStoredSession();
    if (current && current.sessionId !== expectedSessionId) {
      return;
    }
  }
  mountedSessionId = null;
  window.localStorage.removeItem(SESSION_KEY);
  notifyListeners(null);
  broadcastChange();
}

export function subscribeSessionChanges(listener: SessionListener): () => void {
  ensureCrossTabSync();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
