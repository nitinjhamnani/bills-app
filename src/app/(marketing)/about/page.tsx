import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Scale, Users } from "lucide-react";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Paytrix is a B2B utility bill payments platform for organisations and companies in India. Learn who it is built for and how bill work is controlled.",
  keywords: ["about Paytrix", "B2B bill payments India", "utility payments for companies"],
  openGraph: {
    title: "About Paytrix | B2B Utility Bill Payments",
    description:
      "Paytrix is a B2B utility bill payments platform for organisations and companies in India. Learn who it is built for and how bill work is controlled.",
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

const AUDIENCE = [
  {
    icon: Building2,
    title: "Organisations",
    body: "Bill-payment businesses and operating companies that onboard clients, collect funds into wallets, and settle electricity, water, gas, broadband, and other Indian utilities.",
  },
  {
    icon: Users,
    title: "Client companies",
    body: "Businesses that need a controlled way to register consumer accounts, see what is due this cycle, and pay from a prepaid balance instead of ad-hoc transfers.",
  },
  {
    icon: Scale,
    title: "Platform operators",
    body: "The team that provisions organisations, keeps each tenant’s data separate, and oversees the network without sitting inside day-to-day bill work.",
  },
];

const PRINCIPLES = [
  {
    title: "A managed bill is the account",
    body: "The consumer number is registered once and reused. Fetching does not create a new account, and paying does not depend on someone retyping the biller details.",
  },
  {
    title: "A fetch is not a payment",
    body: "Fetching tells you what is due. If the utility shows the account is already paid, Paytrix records that and stops. A payment cycle opens only when there is an amount to pay.",
  },
  {
    title: "Client payment and biller settlement are different steps",
    body: "The client pays from the wallet. The organisation settles with the utility afterwards. Those are separate actions, each with an owner and a timestamp.",
  },
  {
    title: "Access is issued, not self-serve",
    body: "There is no public signup. Paytrix provisions an organisation. That organisation issues logins to its own staff and client companies.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">About Paytrix</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            The workspace Indian organisations use to pay utility bills for companies.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Paytrix is a B2B bill payments platform. It is not a consumer UPI app. It is where an organisation fetches utility bills, takes payment from a client wallet, and settles with the biller under maker–checker control.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Why utility bills break operations teams</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              A company with sites across India does not have one electricity bill. It has a consumer number for each connection, a due date that moves, and a portal that looks different for every discom, water board, and gas company. Broadband, mobile, and DTH add another set of logins.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              When a bill-payment business does this for many client companies, the failure modes are familiar: a bill fetched twice, a wallet debited for an amount that was already paid outside the platform, or a settlement with the utility that finance cannot match to the client payment.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              Paytrix keeps those steps separate so the people running the book, and the people explaining it later, are looking at the same record.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">What “done” looks like</h2>
            <ul className="mt-4 flex flex-col gap-4 text-sm leading-relaxed text-slate-700">
              <li>
                <strong className="text-slate-900">Every connection has an owner.</strong> A managed bill names the utility, the consumer number, and the client company it belongs to.
              </li>
              <li>
                <strong className="text-slate-900">Due amounts are fetched, not guessed.</strong> Operators work from the latest bill, including a clear already-paid outcome.
              </li>
              <li>
                <strong className="text-slate-900">Funds sit in a wallet first.</strong> Client companies pay from a prepaid balance. Settlement with the utility is the organisation’s next action.
              </li>
              <li>
                <strong className="text-slate-900">The trail survives the month.</strong> Reports cover bills, payments, wallets, funding, and settlement for the dates finance asks for.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">How the product is designed</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {PRINCIPLES.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Who it is for</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Paytrix serves organisations and the companies on their book. Each role sees only its own work.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {AUDIENCE.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Based in Aligarh, built for companies across India</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              Paytrix works with organisations that pay utility bills for companies they operate or serve. The team is at {SITE.addressLines[0]}, {SITE.addressLines[1]}, {SITE.addressLines[2]}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700"
              >
                Contact the team
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-slate-50"
              >
                See services
              </Link>
            </div>
          </div>
          <address className="rounded-2xl border border-slate-200 bg-white p-6 not-italic shadow-[var(--shadow-card)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <MapPin size={18} aria-hidden />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-900">{SITE.name}</p>
            {SITE.addressLines.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-slate-600">
                {line}
              </p>
            ))}
            <p className="text-sm text-slate-600">{SITE.country}</p>
            <a href={`tel:${SITE.phoneTel}`} className="mt-4 block text-sm font-semibold text-indigo-700 hover:text-indigo-800">
              {SITE.phoneDisplay}
            </a>
          </address>
        </div>
      </section>
    </div>
  );
}
