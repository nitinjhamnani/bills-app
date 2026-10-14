"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { moduleForRole, type LoginResponse } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const login = await apiFetch<LoginResponse>("/api/v1/auth/password/login", {
        method: "POST",
        body: { identifier, password },
        auth: false,
      });
      saveSession(login);
      router.replace(`/${moduleForRole(login.user.role)}/dashboard`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Invalid phone/email or password.",
      );
      setLoading(false);
    }
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
          disabled={loading || !identifier || !password}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </>
  );
}
