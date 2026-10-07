import Link from "next/link";
import { ArrowRight, Building2, FileText, ShieldCheck, Wallet } from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Managed bills",
    body: "Register consumer accounts once. PayOps fetches due bills so your team is not chasing PDFs and portals.",
  },
  {
    icon: Wallet,
    title: "Prepaid wallets",
    body: "Clients fund a wallet. Every payment is a ledger debit, with a clear opening and closing balance.",
  },
  {
    icon: ShieldCheck,
    title: "Controlled settlement",
    body: "Organisation teams pick up client-paid bills and settle with billers. Makers, checkers, and an audit trail stay in the same workspace.",
  },
];

const STEPS = [
  { step: "01", title: "Onboard the account", body: "Add the biller, consumer number, and who can act on it." },
  { step: "02", title: "Fetch what is due", body: "PayOps pulls the latest bill. If nothing is due, the account is marked already paid." },
  { step: "03", title: "Pay and settle", body: "The client pays from the wallet. The organisation settles with the biller and records the outcome." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-100 bg-slate-50">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">B2B bill payments</p>
            <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Fetch, pay, and settle enterprise bills in one workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              PayOps Suite is built for organisations that collect and pay utility and service bills on behalf of their clients — with wallets, approvals, and reports that operations teams can actually use.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white shadow-xs hover:from-indigo-800 hover:to-indigo-700"
              >
                Login
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-slate-50"
              >
                View services
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-elevated)]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Who signs in</p>
            <ul className="mt-4 flex flex-col gap-4">
              {[
                { role: "Organisation", detail: "Onboard clients, pick up payments, settle with billers." },
                { role: "Client", detail: "Register bills, fund the wallet, and pay what is due." },
                { role: "Platform", detail: "Provision organisations and oversee the network." },
              ].map((item) => (
                <li key={item.role} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    <Building2 size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{item.role}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Why PayOps</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Operations first, not another bill portal.</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            The product follows how bill work actually happens: fetch what is due, pay from a funded wallet, then settle with the biller under dual control.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">How a bill moves through PayOps</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((item) => (
              <article key={item.step} className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
                <p className="font-mono text-xs font-bold text-indigo-600">{item.step}</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-800 via-indigo-700 to-violet-700 px-6 py-12 text-white sm:px-12">
          <h2 className="max-w-xl text-3xl font-bold tracking-tight">Access is by invitation</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-indigo-100">
            There is no public self-signup. Authorised organisations receive workspace logins from us; they issue client access themselves.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
          >
            Login
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
