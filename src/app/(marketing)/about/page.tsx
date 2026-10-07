import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Scale, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Why PayOps Suite exists and who it is built for.",
};

const AUDIENCE = [
  {
    icon: Building2,
    title: "Organisations",
    body: "Bill-payment businesses that onboard clients, collect funds into wallets, and settle with electricity, broadband, DTH, and other billers.",
  },
  {
    icon: Users,
    title: "Clients",
    body: "Companies that need a controlled way to register consumer accounts, see what is due, and pay from a prepaid balance instead of ad-hoc transfers.",
  },
  {
    icon: Scale,
    title: "Platform operators",
    body: "The team that provisions organisations, keeps tenancy separate, and oversees the network without sitting in day-to-day bill work.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">About</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Built for teams that pay other companies’ bills, every day.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            PayOps Suite is a B2B operations product. It is not a consumer UPI app. It is the workspace organisations use to fetch bills, take payment from client wallets, and settle with billers under maker–checker control.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">The problem we designed for</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              Enterprise bill work is repetitive and easy to get wrong: the same consumer numbers return every cycle, amounts change, some bills are already paid outside the platform, and settlement with the biller is a different step from the client’s wallet payment.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              PayOps keeps those steps explicit. A managed bill is the account. A fetch tells you what is due. A payment cycle is created only when there is something to pay. Already-paid fetches update the account without inventing a payment. Settlement is a separate organisation action, with an audit log.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">How we operate</h3>
            <ul className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-slate-700">
              <li>
                <strong className="text-slate-900">Prepaid, not overdraft.</strong> Clients pay from a funded wallet. There is a ledger line for every credit and debit.
              </li>
              <li>
                <strong className="text-slate-900">Roles stay separate.</strong> Platform, organisation, and client users never share a workspace.
              </li>
              <li>
                <strong className="text-slate-900">Money movement is logged.</strong> Fetch outcomes, client payments, pick-ups, and biller settlements are timestamped for the people who have to explain them later.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Who it is for</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {AUDIENCE.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </article>
              );
            })}
          </div>
          <Link
            href="/services"
            className="mt-10 inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700"
          >
            See services
          </Link>
        </div>
      </section>
    </div>
  );
}
