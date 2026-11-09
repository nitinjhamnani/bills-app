"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { saveSession } from "@/lib/auth";
import { homeForRole, type LoginResponse } from "@/lib/types";

const QUICK_LOGINS = [
  { label: "Paytrix admin", identifier: "9999999999", password: "Password@123" },
  { label: "Meridian", identifier: "9000000001", password: "Password@123" },
  { label: "Harbor", identifier: "9000000002", password: "Password@123" },
  { label: "Nexora", identifier: "9000000003", password: "Password@123" },
];

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function signIn(nextIdentifier: string, nextPassword: string) {
    setIdentifier(nextIdentifier);
    setPassword(nextPassword);
    setError(null);
    setLoading(true);
    try {
      const login = await apiFetch<LoginResponse>("/api/v1/auth/password/login", {
        method: "POST",
        body: { identifier: nextIdentifier, password: nextPassword },
        auth: false,
      });
      saveSession(login);
      router.replace(homeForRole(login.user.role));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Invalid phone/email or password.",
      );
      setLoading(false);
    }
  }

  async function requestCode() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/branch/otp", {
        method: "POST",
        body: { phoneNumber: identifier },
        auth: false,
      });
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send a code");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/branch/password", {
        method: "POST",
        body: { phoneNumber: identifier, otp, password: newPassword },
        auth: false,
      });
      setSettingPassword(false);
      setCodeSent(false);
      setOtp("");
      setPassword(newPassword);
      setNewPassword("");
      setError(null);
      setNotice("Password saved. Sign in with this phone.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set the password");
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    void signIn(identifier, password);
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
      {notice && <p className="mt-3 text-sm font-medium text-emerald-700">{notice}</p>}

      {settingPassword ? (
        <form onSubmit={savePassword} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Phone number</span>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="\d{10}"
              placeholder="10-digit phone"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setCodeSent(false);
              }}
              className={inputClasses}
            />
          </label>
          {!codeSent ? (
            <button
              type="button"
              disabled={loading || !/^\d{10}$/.test(identifier)}
              onClick={() => void requestCode()}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Send code
            </button>
          ) : (
            <>
              <p className="text-sm text-slate-500">
                Enter the code for this phone. On this machine the code is 123456.
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Code</span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={inputClasses}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-700">New password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={72}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClasses}
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length === 0 || newPassword.length < 6}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Save password
              </button>
            </>
          )}
          {error && !codeSent && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => {
              setSettingPassword(false);
              setCodeSent(false);
              setError(null);
            }}
            className="text-sm font-semibold text-indigo-700"
          >
            Back to sign in
          </button>
        </form>
      ) : (
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
        <button
          type="button"
          onClick={() => {
            setSettingPassword(true);
            setError(null);
          }}
          className="text-sm font-semibold text-indigo-700"
        >
          Set your password
        </button>
      </form>
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs font-medium text-slate-400">Local accounts</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {QUICK_LOGINS.map((account) => (
              <button
                key={account.label}
                type="button"
                disabled={loading}
                onClick={() => void signIn(account.identifier, account.password)}
                className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
