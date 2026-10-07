import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Droplets,
  FileText,
  Flame,
  Landmark,
  Phone,
  ShieldCheck,
  Smartphone,
  Tv,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { HeroIllustration } from "@/components/marketing/HeroIllustration";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SITE, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "Paytrix | B2B Utility Bill Payments for Companies in India",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "B2B bill payments",
    "utility bill payments India",
    "corporate electricity bill payment",
    "company utility payments",
    "Paytrix",
  ],
  openGraph: {
    title: "Paytrix | B2B Utility Bill Payments for Companies in India",
    description: SITE_DESCRIPTION,
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

const UTILITIES = [
  { icon: Zap, label: "Electricity" },
  { icon: Droplets, label: "Water" },
  { icon: Flame, label: "Gas and LPG" },
  { icon: Wifi, label: "Broadband" },
  { icon: Smartphone, label: "Mobile postpaid" },
  { icon: Tv, label: "DTH" },
  { icon: Phone, label: "Landline" },
  { icon: Landmark, label: "Municipal dues" },
];

const AUDIENCES = [
  {
    title: "Companies with many sites",
    body: "Offices, plants, stores, and warehouses each carry their own consumer numbers. Paytrix keeps every account, due amount, and payment in one operating view.",
  },
  {
    title: "Facility and property teams",
    body: "Pay utilities for the occupiers you manage without chasing portal logins, PDFs, and ad-hoc transfers for each site.",
  },
  {
    title: "Bill-payment businesses",
    body: "Onboard client companies, hold funds in prepaid wallets, and settle with billers as a daily operation — with roles for the people who initiate and the people who approve.",
  },
  {
    title: "Finance and shared services",
    body: "Give finance a ledger and an audit trail. Opening balance, credits, debits, and closing balance replace spreadsheet reconstructions at month end.",
  },
];

const CAPABILITIES = [
  {
    icon: FileText,
    title: "Managed utility accounts",
    body: "Register each consumer number once. Paytrix fetches the latest bill, refreshes the due amount, and records when the biller says the account is already paid.",
  },
  {
    icon: Wallet,
    title: "Prepaid client wallets",
    body: "Client companies fund a wallet before any bill is paid. Every top-up and every payment is a ledger line, not an untracked transfer.",
  },
  {
    icon: ShieldCheck,
    title: "Settlement under control",
    body: "After a client pays from the wallet, organisation users pick up the cycle and settle with the biller. Maker–checker rules can require a second person.",
  },
  {
    icon: ClipboardList,
    title: "Reports finance can export",
    body: "Bill statements, payment history, wallet activity, funding, and settlement registers — generated for a date range and exported to Excel or PDF.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Onboard the consumer account",
    body: "Add the utility, the consumer number, and who is allowed to act on it. One managed bill per account, reused every cycle.",
  },
  {
    step: "02",
    title: "Fetch what is due",
    body: "Paytrix pulls the latest bill. If the biller shows nothing due, the account is marked already paid. No payment is invented.",
  },
  {
    step: "03",
    title: "Pay from the wallet",
    body: "The client company pays the due amount from its prepaid balance. The debit, the bill, and the balance stay on the same record.",
  },
  {
    step: "04",
    title: "Settle with the biller",
    body: "Organisation teams pick up the paid cycle, settle with the utility, and record the outcome. The audit log keeps who did what, and when.",
  },
];

const FAQS = [
  {
    q: "What utility bills can Paytrix handle?",
    a: "Paytrix is built for the utility bills Indian organisations pay every month: electricity, water, piped gas and LPG, broadband, mobile postpaid, DTH, landline, and municipal dues. An organisation turns on the services it actually settles.",
  },
  {
    q: "Who is Paytrix for?",
    a: "Organisations and companies in India that pay utility bills for themselves or for the clients they serve — multi-site businesses, facility teams, and bill-payment businesses. It is not a consumer UPI app.",
  },
  {
    q: "How does a company pay a bill?",
    a: "The client funds a prepaid wallet. When a fetch finds an amount due, the client pays from that balance. The organisation then settles with the biller. Already-paid fetches update the account without creating a payment.",
  },
  {
    q: "Can anyone sign up?",
    a: "No. Workspace access is by invitation. Authorised organisations receive logins from Paytrix, and they issue access to their own client companies.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />

      <section className="relative overflow-hidden border-b border-slate-100 bg-slate-50">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-emerald-100/80 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              B2B utility bill payments · India
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.08]">
              Pay every utility bill your companies owe,{" "}
              <span className="text-indigo-700">from one workspace.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Paytrix fetches electricity, water, gas, broadband, and other utility bills for the companies you serve, pays them from a prepaid wallet, and settles with billers under maker–checker control.
            </p>
            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "Fetch", "Due amounts pulled in automatically"],
                ["02", "Pay", "Wallet debited for each company"],
                ["03", "Settle", "Biller settlement on the same record"],
              ].map(([step, title, body]) => (
                <li key={step} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-[var(--shadow-card)]">
                  <p className="font-mono text-[11px] font-bold text-indigo-600">{step}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white shadow-xs hover:from-indigo-800 hover:to-indigo-700"
              >
                Talk to Paytrix
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-slate-50"
              >
                See utilities and services
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Already provisioned?{" "}
              <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">
                Sign in to the workspace
              </Link>
            </p>
          </div>
          <HeroIllustration />
        </div>
      </section>

      <section aria-label="Utility categories" className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Utility bills Indian companies pay every month
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {UTILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <Icon size={15} className="text-indigo-600" aria-hidden />
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Who it is for</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            For organisations that pay utility bills as a business, not a one-off chore.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            If your team pays electricity for a dozen sites, or runs bill payments for other companies, the work is the same every cycle: find the due amount, collect the money, and settle with the utility. Paytrix is that operating system.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {AUDIENCES.map((item) => (
            <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">The workspace</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Fetch, fund, pay, and settle — without leaving the record.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {CAPABILITIES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon size={20} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.body}</p>
                </article>
              );
            })}
          </div>
          <Link href="/services" className="mt-8 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800">
            Explore services
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900">
          How a utility bill moves through Paytrix
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Each step stays explicit, so operations and finance can explain a payment months later.
        </p>
        <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => (
            <li key={item.step} className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-slate-200">
              <p className="font-mono text-xs font-bold text-indigo-600">{item.step}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Controls</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Money movement your finance team can stand behind.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Utility payments repeat. The risk is a missed due date, a double payment, or a settlement nobody can trace. Paytrix separates those actions and logs them.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Prepaid, not overdraft", body: "A bill is paid only from a funded wallet. There is a ledger line for every credit and debit." },
              { title: "Roles stay separate", body: "Platform, organisation, and client users never share a workspace or each other’s bills." },
              { title: "A second person, when you need one", body: "Approval rules can require a checker before settlement goes through." },
              { title: "An audit trail", body: "Fetches, wallet payments, pick-ups, and biller settlements are timestamped." },
            ].map((item) => (
              <li key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <BadgeCheck size={16} className="text-indigo-600" aria-hidden />
                  {item.title}
                </span>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Questions teams ask first</h2>
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
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-800 via-indigo-700 to-violet-700 px-6 py-12 text-white sm:px-12">
          <h2 className="max-w-xl text-3xl font-bold tracking-tight">Bring your utility book onto Paytrix</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-indigo-100">
            Tell us the companies you pay for, the cities you cover, and the utilities on the book. Access is by invitation — there is no public self-signup.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
            >
              Contact {SITE.name}
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
