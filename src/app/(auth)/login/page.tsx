import Link from "next/link";
import { isWorkspaceEnabled } from "@/lib/workspace";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-8">
        {isWorkspaceEnabled ? <LoginForm /> : <ClosedAccess />}
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">
        <Link href="/" className="font-semibold text-slate-500 hover:text-indigo-700">
          Back to home
        </Link>
      </p>
    </div>
  );
}

function ClosedAccess() {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Workspace access</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">By invitation only</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        The PayOps workspace is not on the public internet. There is no self-signup, and this site
        does not accept credentials.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        When your organisation is onboarded, your administrator will issue a phone number or email
        and a password for the private workspace.
      </p>
    </>
  );
}
