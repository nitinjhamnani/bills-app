import Link from "next/link";
import { BadgeCheck, Building2, ShieldCheck, Store, Wallet } from "lucide-react";
import { isWorkspaceEnabled } from "@/lib/workspace";
import { LoginForm } from "./LoginForm";

const POINTS = [
  {
    icon: ShieldCheck,
    title: "Centralised corporate spend governance",
    body: "Control departmental budgets, vendor payouts, corporate cards, and multi-branch facility expenses from one place.",
  },
  {
    icon: Wallet,
    title: "Ring-fenced corporate treasury wallets",
    body: "Disburse strictly from pre-funded treasury balances with zero overdraft risk and real-time double-entry ledger tracking.",
  },
  {
    icon: BadgeCheck,
    title: "Maker–checker approvals & ERP close",
    body: "Enforce role-based sign-offs before money moves and export audit-ready XLSX and PDF statements in one click.",
  },
];

const ROLES = [
  {
    icon: ShieldCheck,
    title: "Platform & Finance Operations",
    body: "Onboard corporate entities and partners, configure spend categories, verify treasury top-ups, and oversee platform ledgers.",
  },
  {
    icon: Building2,
    title: "Corporate HQ & Branch Teams",
    body: "Manage cost-centre accounts, fund corporate wallets, approve single or bulk expenses, and export financial statements.",
  },
  {
    icon: Store,
    title: "Empanelled Settlement Partners",
    body: "Execute rule-assigned corporate disbursements with client privacy preserved, submit UTR proofs, and track commissions.",
  },
];

const FAQS = [
  {
    q: "Who can sign in?",
    a: "Authorised operations staff, onboarded corporate finance and branch users, and empanelled settlement partners. There is no public self-signup — after sign-in you are routed automatically to your authorised workspace.",
  },
  {
    q: "Which phone number or email do I use?",
    a: "Use the exact phone number or work email provisioned on your Paytrix account by your administrator.",
  },
  {
    q: "I don’t have a password.",
    a: "Contact the administrator who issued your login. Account creation and credential resets are managed centrally by your organisation administrator.",
  },
  {
    q: "Can I initiate a corporate payout directly from this page?",
    a: "No. Sign in first — all corporate expenses, approvals, and wallet disbursements execute strictly inside your authenticated workspace.",
  },
];

export default function LoginPage() {
  return (
    <>
      <section className="lg:grid lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-2">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-indigo-900 px-6 py-12 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="relative">
            {/* Clean Paytrix Logo Without Subtext */}
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black tracking-wider text-indigo-800 shadow-sm">
                Px
              </span>
              <span className="text-xl font-extrabold tracking-tight">Paytrix</span>
            </Link>

            <h1 className="mt-8 max-w-md text-3xl font-bold tracking-tight sm:text-4xl sm:leading-[1.12]">
              The operating system for every rupee your company spends.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-indigo-100 sm:text-base">
              Paytrix connects corporate finance teams, regional branches, and settlement partners on one real-time, policy-governed spend ledger.
            </p>

            <ul className="mt-8 flex max-w-md flex-col gap-4">
              {POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300 ring-1 ring-white/15">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-indigo-100/90 sm:text-sm">
                        {item.body}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="relative mt-10 text-xs font-medium text-indigo-200/85">
            Invitation-only workspace · Stateful session security · Role-isolated access
          </p>
        </div>

        <div className="tw-band-soft flex items-center justify-center px-4 py-12 sm:px-8 lg:py-16">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-8">
              {isWorkspaceEnabled ? <LoginForm /> : <ClosedAccess />}
            </div>
            <p className="mt-5 text-center text-sm text-slate-600">
              Need enterprise workspace onboarding?{" "}
              <Link href="/contact" className="font-bold text-indigo-700 hover:text-indigo-900">
                Contact Paytrix
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-indigo-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
              Who signs in
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950">
              One login, routed directly to your authorised workspace.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Finance controllers, branch managers, and settlement partners operate with strict tenant isolation. After sign-in, Paytrix opens only the budgets and records assigned to your role.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ROLES.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="tw-card-indigo rounded-2xl border border-indigo-100/80 p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-2xs">
                    <Icon size={20} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-indigo-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-indigo-100 bg-slate-50/80">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-indigo-950">
            Questions about signing in
          </h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            {FAQS.map((item) => (
              <details key={item.q} className="group px-5 py-4 sm:px-6">
                <summary className="cursor-pointer list-none text-sm font-semibold text-indigo-950 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-indigo-600 transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ClosedAccess() {
  return (
    <>
      <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
        Workspace access
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-indigo-950">
        By invitation only
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        The Paytrix workspace is not open to public self-signup, and this deployment is configured for public information only.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        When your organisation is onboarded, your administrator will issue credentials for the private workspace.
      </p>
    </>
  );
}
