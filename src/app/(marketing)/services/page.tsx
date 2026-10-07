import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  FileSearch,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services",
  description: "Bill fetch, wallets, payments, settlement, reports, and support.",
};

const SERVICES = [
  {
    icon: FileSearch,
    title: "Bill fetch and managed accounts",
    body: "Register each consumer number once. PayOps fetches the latest bill, refreshes due amounts, and records when the biller says the account is already paid — without creating a false payment.",
    points: ["Electricity, broadband, DTH, and other configured services", "Auto-fetch on a schedule, or retry a failed fetch", "One managed bill per consumer account"],
  },
  {
    icon: Wallet,
    title: "Client wallets",
    body: "Clients request a top-up. The organisation credits the wallet. Payments then debit that balance, with a statement of opening, credits, debits, and closing.",
    points: ["Prepaid balance before any bill payment", "Ledger for every movement", "Organisation-side funding review"],
  },
  {
    icon: Landmark,
    title: "Payments and settlement",
    body: "When a fetch finds an amount due, a payment cycle opens. The client pays from the wallet. Organisation users pick up the cycle and mark it settled with the biller.",
    points: ["Client pay from wallet", "Organisation pick-up and settle", "Maker–checker where your rules require it"],
  },
  {
    icon: BarChart3,
    title: "Reports",
    body: "Operations and finance pull date-range extracts instead of exporting raw screens. Bill statements, payment history, wallet activity, GMV, funding, and settlement registers.",
    points: ["Choose dates, then generate", "Excel and PDF export", "Role-specific catalogues for client, organisation, and platform"],
  },
  {
    icon: ShieldCheck,
    title: "Controls and audit",
    body: "Access is split by role. Sensitive money actions can require a second person. An audit log records who moved money and when.",
    points: ["Organisation and client user management", "Approval rules for settlement", "Audit extract by date range"],
  },
  {
    icon: MessageCircle,
    title: "Support and disputes",
    body: "Clients raise tickets from the workspace. Disputes sit on the payment they belong to, so the operations team is not reconciling email threads against bill numbers.",
    points: ["In-product support tickets", "Payment-linked disputes", "Conversation kept on the record"],
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Services</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Everything needed to run bill payments as an operation.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            From the first fetch to biller settlement, PayOps is one product. You enable the services your organisation offers; clients see only the accounts and payments they own.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                  <Icon size={20} />
                </span>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{service.title}</h2>
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
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Access is by invitation</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              There is no public self-signup. Your organisation administrator issues access when your workspace is provisioned.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700"
          >
            Login
          </Link>
        </div>
      </section>
    </div>
  );
}
