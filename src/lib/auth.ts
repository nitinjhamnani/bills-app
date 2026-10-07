"use client";

import type { LoginResponse, UserProfile } from "./types";

const TOKEN_KEY = "b2bfintech.accessToken";
const USER_KEY = "b2bfintech.user";

/**
 * Session storage for the password login flow (implementation plan section 2/8.1).
 * Deliberately simple localStorage for Phase 0 - fine for a JWT-bearer SPA where the token
 * itself (not a cookie/session) is the credential sent on every API call.
 */
export function saveSession(login: LoginResponse) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, login.accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(login.user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
