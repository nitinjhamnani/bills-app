import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  MapPin,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { ThinkWalnutHeroBanner } from "@/components/marketing/ThinkWalnutSections";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us — Modernising Corporate Expense Management",
  description:
    "Paytrix is a modern corporate expense and spend management platform in India empowering multi-location enterprises with real-time budget, wallet, and payout control.",
};

const GOVERNANCE_PILLARS = [
  {
    icon: ShieldCheck,
    name: "Policy & Disbursement Architecture",
    role: "Verified Payables & Zero-Duplicate Controls",
    bio: "Every vendor and recurring facility account on Paytrix is indexed uniquely across the organisation. Liabilities are verified upfront before disbursement, preventing duplicate debits and ensuring clean UTR traceability.",
  },
  {
    icon: Building2,
    name: "Corporate Treasury & Cost-Centre Control",
    role: "Ring-Fenced Wallets & Location-Scoped Access",
    bio: "Built for multi-location enterprises — headquarters, manufacturing plants, retail chains, warehouses, and institutions — giving CFOs one ring-fenced treasury wallet while local managers run site expenses.",
  },
  {
    icon: Store,
    name: "Multi-Rail & Partner Ecosystem",
    role: "Intelligent Routing & Maker–Checker Governance",
    bio: "Combines direct instant payment execution with rule-based settlement partner routing, configurable commercial slabs, corporate privacy protection, and end-to-end settlement verification.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* 1. Modern Split Hero Banner */}
      <ThinkWalnutHeroBanner
        badge="About Paytrix"
        eyebrow="Our Mission"
        title={
          <>
            Reinventing Corporate
            <span className="mt-1 block text-indigo-200">Expense &amp; Spend Control.</span>
          </>
        }
        subtitle="We help finance leaders replace fragmented spreadsheets, manual approvals, and scattered payouts with a single real-time spend operating system."
        imageSrc="/images/thinkwalnut/tw-about-hero.webp"
        imageAlt="Paytrix product and engineering team building corporate expense software"
      />

      {/* 2. Mission & Solving a Big Problem Narrative */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-22">
        <p className="text-sm leading-relaxed text-slate-700 sm:text-base">
          {SITE.name} is an enterprise spend management platform that digitises, automates, and governs corporate expenses for multi-location companies across India — uniting departmental budgets, vendor payouts, corporate card dues, fleet transit, insurance, statutory taxes, and facility utilities under one roof.
        </p>

        <h2 className="mt-9 text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
          Our mission is to give finance teams effortless control over every corporate rupee.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
          We eliminate chaotic reimbursement threads, manual spreadsheet trackers, and untracked branch transfers by giving CFOs, controllers, and site operators a single double-entry ledger for every business obligation.
        </p>

        <h2 className="mt-9 text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
          Solving a critical enterprise finance bottleneck
        </h2>
        <div className="mt-3 space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
          <p>
            Growing multi-branch businesses in India still spend hundreds of finance hours every month chasing branch invoices, logging into dozens of disconnected portals, and reconciling bank statements line by line at month-end.
          </p>
          <p>
            Delayed email sign-offs, missing vouchers, duplicate payouts on obligations already cleared locally, and unverified vendor transfers create avoidable penalties and audit friction.
          </p>
          <p>
            {SITE.name} SpendOS brings ring-fenced corporate treasury wallets, configurable maker–checker workflows, automated payable verification, and one-click Excel &amp; PDF ERP exports into one cohesive platform built for scale.
          </p>
        </div>
      </section>

      {/* 3. Architecture & Governance Cards */}
      <section className="border-y border-indigo-100/80 bg-slate-50/80 py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
            Platform Foundation
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            Engineered for financial accountability at every step
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {GOVERNANCE_PILLARS.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.name}
                  className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[var(--shadow-elevated)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                    <Icon size={24} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-indigo-950">{card.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-indigo-700">{card.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.bio}</p>
                </article>
              );
            })}
          </div>

          <p className="mt-12 text-lg font-semibold leading-relaxed text-indigo-950 sm:text-2xl">
            {SITE.name} empowers modern enterprises across India to scale multi-location operations with complete spend confidence.
          </p>
        </div>
      </section>

      {/* 4. Office & Invitation-Only Onboarding */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
              <Users size={15} /> Enterprise Onboarding
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
              Headquartered in {SITE.locality}, built for enterprises across {SITE.country}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {SITE.name} provisions dedicated role-isolated workspaces for corporate groups, their regional branches, and empanelled settlement partners. Connect with our team at {SITE.addressLines.join(", ")} to tailor SpendOS for your organisation.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-6 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700"
              >
                Talk to our team <ArrowRight size={16} />
              </Link>
              <Link
                href="/payments"
                className="inline-flex min-h-11 items-center rounded-xl border border-indigo-200 bg-white px-5 text-sm font-semibold text-indigo-900 hover:bg-indigo-50"
              >
                Explore SpendOS Suite
              </Link>
            </div>
          </div>

          <address className="tw-card-indigo rounded-2xl border border-indigo-100 p-7 not-italic">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-2xs">
              <MapPin size={20} aria-hidden />
            </span>
            <p className="mt-4 text-base font-bold text-indigo-950">{SITE.name}</p>
            {SITE.addressLines.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-slate-700">
                {line}
              </p>
            ))}
            <p className="text-sm text-slate-700">{SITE.country}</p>
            <a
              href={`tel:${SITE.phoneTel}`}
              className="mt-4 block text-sm font-bold text-indigo-700 hover:text-indigo-950"
            >
              {SITE.phoneDisplay}
            </a>
          </address>
        </div>
      </section>
    </div>
  );
}
