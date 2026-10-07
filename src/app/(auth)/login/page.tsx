import Link from "next/link";
import { BadgeCheck, Building2, ShieldCheck, Wallet } from "lucide-react";
import { isWorkspaceEnabled } from "@/lib/workspace";
import { LoginForm } from "./LoginForm";

const POINTS = [
  {
    icon: ShieldCheck,
    title: "Fetch what is due",
    body: "Electricity, water, gas, broadband, and other utility bills, pulled for each company on the book.",
  },
  {
    icon: Wallet,
    title: "Pay from a wallet",
    body: "Client companies pay from a prepaid balance. Every debit stays on the ledger.",
  },
  {
    icon: BadgeCheck,
    title: "Settle with the biller",
    body: "Organisation teams pick up the cycle, settle, and keep an audit trail.",
  },
];

const ROLES = [
  {
    title: "Organisation",
    body: "Onboard client companies, fund wallets, pick up payments, and settle with utilities.",
  },
  {
    title: "Client company",
    body: "Register consumer numbers, see what is due, and pay from a prepaid balance.",
  },
  {
    title: "Platform",
    body: "Provision organisations and keep each tenant’s bill work separate.",
  },
];

const FAQS = [
  {
    q: "Who can sign in?",
    a: "People whose organisation or client company has been issued a Paytrix login. There is no public self-signup. After sign-in you land in the platform, organisation, or client workspace that matches your role.",
  },
  {
    q: "Which phone number or email do I use?",
    a: "The phone number or email on the account your administrator created. It is not necessarily the address you use for other company systems.",
  },
  {
    q: "I don’t have a password.",
    a: "Ask the administrator who onboarded your organisation or client company. This page does not create accounts or reset passwords.",
  },
  {
    q: "Can I pay a utility bill from this page?",
    a: "No. Sign in first. Bills are fetched, paid from the company wallet, and settled with the biller inside the workspace.",
  },
];

export default function LoginPage() {
  return (
    <>
      <section className="lg:grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-slate-900 px-6 py-12 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black tracking-wider text-indigo-800">
                Px
              </span>
              <span className="text-lg font-bold tracking-tight">Paytrix</span>
            </div>
            <h1 className="mt-8 max-w-md text-3xl font-bold tracking-tight sm:text-4xl sm:leading-[1.12]">
              The workspace for utility bills your companies pay.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-indigo-100 sm:text-base">
              Paytrix is for organisations in India that fetch, pay, and settle electricity, water, gas, broadband, and other utility bills for the companies they serve.
            </p>
            <ul className="mt-8 flex max-w-md flex-col gap-4">
              {POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-indigo-100/90">{item.body}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="relative mt-10 text-sm text-indigo-200/90">
            Access is by invitation. Aligarh · utility bills for companies across India.
          </p>
        </div>

        <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-8 lg:py-16">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-elevated)] sm:p-8">
              {isWorkspaceEnabled ? <LoginForm /> : <ClosedAccess />}
            </div>
            <p className="mt-5 text-center text-sm text-slate-500">
              Need a workspace?{" "}
              <Link href="/contact" className="font-semibold text-indigo-700 hover:text-indigo-800">
                Contact Paytrix
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Who signs in</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              One login, the workspace your role is meant to see.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Platform, organisation, and client users never share a book. After you sign in, Paytrix opens only the records you are allowed to act on.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ROLES.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Building2 size={18} aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Questions about signing in</h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQS.map((item) => (
              <details key={item.q} className="group px-5 py-4 sm:px-6">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-indigo-600 group-open:rotate-45" aria-hidden>
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
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Workspace access</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">By invitation only</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        The Paytrix workspace is not on the public internet. There is no self-signup, and this site does not accept credentials.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        When your organisation is onboarded, your administrator will issue a phone number or email and a password for the private workspace.
      </p>
    </>
  );
}
