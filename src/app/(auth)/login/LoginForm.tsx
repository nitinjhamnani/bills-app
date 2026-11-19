"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  clearSession,
  peekBrowserSession,
  saveSession,
  subscribeSessionChanges,
  updateSessionUser,
} from "@/lib/auth";
import { homeForUser, type LoginResponse, type SessionResponse } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (reason === "session_replaced") {
      setNotice("Your previous session ended because you signed in elsewhere.");
    } else if (reason === "session_expired") {
      setNotice("Your session expired. Please sign in again.");
    }

    async function checkActiveSession() {
      const existing = peekBrowserSession();
      if (!existing) {
        if (!cancelled) setCheckingExisting(false);
        return;
      }
      try {
        const confirmed = await apiFetch<SessionResponse>("/api/v1/auth/session");
        if (cancelled) return;
        updateSessionUser(confirmed.sessionId, confirmed.user);
        router.replace(homeForUser(confirmed.user));
      } catch {
        clearSession(existing.sessionId);
        if (!cancelled) setCheckingExisting(false);
      }
    }

    void checkActiveSession();

    const unsubscribe = subscribeSessionChanges((next) => {
      if (!cancelled && next) {
        router.replace(homeForUser(next.user));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  async function signIn(nextIdentifier: string, nextPassword: string) {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const login = await apiFetch<LoginResponse>("/api/v1/auth/password/login", {
        method: "POST",
        body: { identifier: nextIdentifier.trim(), password: nextPassword },
        auth: false,
      });
      saveSession(login);
      router.replace(homeForUser(login.user));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Invalid phone/email or password.",
      );
      setLoading(false);
    }
  }

  function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    void signIn(identifier, password);
  }

  if (checkingExisting) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 py-10 text-sm text-slate-500">
        <Loader2 size={20} className="animate-spin text-indigo-600" />
        Checking session...
      </div>
    );
  }

  const inputClasses =
    "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Workspace access</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Use the phone number or email on your account. There is no public self-signup.
      </p>

      {notice && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
          {notice}
        </div>
      )}

      <form onSubmit={handleCredentials} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Phone number or email</span>
          <input
            type="text"
            required
            autoFocus
            placeholder="9876543210 or you@company.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={inputClasses}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Password</span>
          <span className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClasses} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !identifier.trim() || !password}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </>
  );
}
