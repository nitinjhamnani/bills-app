import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Droplets,
  FileSearch,
  Flame,
  Landmark,
  MessageCircle,
  Phone,
  ShieldCheck,
  Smartphone,
  Tv,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Pay electricity, water, gas, broadband, mobile, DTH, and other utility bills for companies in India. Paytrix covers bill fetch, wallets, settlement, reports, and maker–checker.",
  keywords: [
    "electricity bill payment for companies",
    "water bill payment B2B",
    "broadband bill payment India",
    "utility bill settlement",
    "Paytrix services",
  ],
  openGraph: {
    title: "Utility Bill Payment Services | Paytrix",
    description:
      "Pay electricity, water, gas, broadband, mobile, DTH, and other utility bills for companies in India. Paytrix covers bill fetch, wallets, settlement, reports, and maker–checker.",
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

const UTILITIES = [
  {
    icon: Zap,
    title: "Electricity",
    body: "Consumer numbers across discoms, fetched each cycle so due amounts are current before anyone pays.",
  },
  {
    icon: Droplets,
    title: "Water",
    body: "Municipal and board connections for offices, plants, and properties your organisation looks after.",
  },
  {
    icon: Flame,
    title: "Gas and LPG",
    body: "Piped gas and commercial LPG accounts, kept as managed bills rather than one-off portal visits.",
  },
  {
    icon: Wifi,
    title: "Broadband",
    body: "Site-level internet accounts, with a fetch that shows what is due before the wallet is debited.",
  },
  {
    icon: Smartphone,
    title: "Mobile postpaid",
    body: "Postpaid connections billed to a company, registered once and paid from the client wallet.",
  },
  {
    icon: Tv,
    title: "DTH",
    body: "Direct-to-home accounts that sit on the same book as the rest of a site’s utilities.",
  },
  {
    icon: Phone,
    title: "Landline",
    body: "Fixed-line accounts that still arrive every month and still need a consumer number on file.",
  },
  {
    icon: Landmark,
    title: "Municipal dues",
    body: "Civic charges your operations team already treats as part of the monthly utility run.",
  },
];

const SERVICES = [
  {
    icon: FileSearch,
    title: "Bill fetch and managed accounts",
    body: "Register each consumer number once. Paytrix fetches the latest bill, refreshes due amounts, and records when the utility says the account is already paid — without creating a false payment.",
    points: [
      "Electricity, water, gas, broadband, mobile, DTH, and other configured utilities",
      "Scheduled fetch, or a retry when a fetch fails",
      "One managed bill per consumer account",
    ],
  },
  {
    icon: Wallet,
    title: "Client wallets",
    body: "Client companies request a top-up. The organisation credits the wallet. Bill payments then debit that balance, with a statement of opening, credits, debits, and closing.",
    points: [
      "Prepaid balance before any utility is paid",
      "A ledger line for every movement",
      "Organisation review before funds are credited",
    ],
  },
  {
    icon: Landmark,
    title: "Payments and biller settlement",
    body: "When a fetch finds an amount due, a payment cycle opens. The client pays from the wallet. Organisation users pick up the cycle and mark it settled with the utility.",
    points: [
      "Client payment from the prepaid wallet",
      "Organisation pick-up and settlement with the biller",
      "Maker–checker where your approval rules require it",
    ],
  },
  {
    icon: BarChart3,
    title: "Reports for operations and finance",
    body: "Pull a date range instead of exporting raw screens. Bill statements, payment history, wallet activity, funding, and settlement registers are generated for the role that needs them.",
    points: [
      "Choose dates, then generate",
      "Excel and PDF export",
      "Separate catalogues for client, organisation, and platform",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Controls and audit",
    body: "Access is split by role. Sensitive money actions can require a second person. An audit log records who moved money and when.",
    points: [
      "Organisation and client user management",
      "Approval rules for settlement",
      "Audit extract by date range",
    ],
  },
  {
    icon: MessageCircle,
    title: "Support and disputes",
    body: "Client companies raise tickets inside the workspace. Disputes sit on the payment they belong to, so the operations team is not matching email threads to bill numbers.",
    points: [
      "In-product support tickets",
      "Disputes linked to the payment",
      "The conversation stays on the record",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Services</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Utility bill payments for companies, run as an operation.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Paytrix covers the utilities Indian organisations pay — electricity, water, gas, broadband, mobile, DTH, and more — and the controls around them. You enable the services your organisation offers. Client companies see only their own accounts and payments.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Utilities on the platform</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          These are the bill types operations teams run every month. An organisation switches on the categories it settles. A client company only sees the consumer accounts registered for it.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {UTILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">What the workspace includes</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon size={20} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{service.body}</p>
                  <ul className="mt-5 flex flex-col gap-2 text-sm text-slate-700">
                    {service.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Who does what</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Organisation</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-slate-700">
              <li>Onboard client companies and their users.</li>
              <li>Enable the utility services the organisation will settle.</li>
              <li>Review wallet top-ups and credit the prepaid balance.</li>
              <li>Pick up client-paid bills and settle with the utility.</li>
              <li>Set approval rules and read the audit log.</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Client company</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-slate-700">
              <li>Register consumer numbers for the utilities they pay.</li>
              <li>Fetch bills and see whether an amount is due.</li>
              <li>Fund the wallet and pay from that balance.</li>
              <li>Download statements for the accounts they own.</li>
              <li>Raise a support ticket or a dispute on a payment.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tell us which utilities are on your book</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Share the companies, cities, and bill types you pay. Workspace access is issued after your organisation is onboarded.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700"
          >
            Contact Paytrix
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
