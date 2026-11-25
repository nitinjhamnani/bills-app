import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BellRing,
  Briefcase,
  Car,
  ChevronRight,
  CreditCard,
  Droplets,
  FileSpreadsheet,
  Flame,
  GitBranch,
  HeartHandshake,
  Landmark,
  Receipt,
  ShieldCheck,
  Target,
  Users,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import {
  BalancedControlIllustration,
  PowerBillIsometricIllustration,
  PowerPayUtilitiesIllustration,
  ZeroLateFeesPuzzleIllustration,
} from "@/components/marketing/ThinkWalnutIllustrations";
import {
  DemoEnquiryForm,
  ThinkWalnutHeroBanner,
} from "@/components/marketing/ThinkWalnutSections";

export const metadata: Metadata = {
  title: "Expense Suite — FlowPay, SpendIQ & BranchGrid",
  description:
    "Automate corporate expense approvals, multi-branch operating budgets, vendor disbursements, and recurring facility payables with Paytrix SpendOS.",
};

const EXPENSE_CATEGORIES = [
  { icon: Briefcase, label: "Departmental OpEx" },
  { icon: Users, label: "Vendor & Supplier Payouts" },
  { icon: CreditCard, label: "Corporate Card Dues" },
  { icon: Zap, label: "Commercial Power & Energy" },
  { icon: Wifi, label: "Enterprise Broadband & Telecom" },
  { icon: Car, label: "Fleet & FASTag Expenses" },
  { icon: HeartHandshake, label: "Commercial Insurance" },
  { icon: Receipt, label: "Equipment & Loan EMIs" },
  { icon: Landmark, label: "Municipal & Property Taxes" },
  { icon: Droplets, label: "Facility Water & Utilities" },
  { icon: Flame, label: "Commercial Gas & Fuel" },
  { icon: GitBranch, label: "Branch Cost-Centre Budgets" },
];

const BRANCHGRID_CARDS = [
  {
    icon: BellRing,
    title: "Proactive due-date & budget alerts",
    body: "Stay ahead of upcoming vendor milestones, recurring facility cycles, and threshold alerts so no branch incurs a late penalty.",
    tint: "bg-sky-50/80 border-sky-100",
  },
  {
    icon: ShieldCheck,
    title: "Duplicate-payout & policy guardrails",
    body: "Every recurring account and vendor invoice is verified before disbursement — blocking duplicate debits and out-of-policy requests automatically.",
    tint: "bg-indigo-50/80 border-indigo-100",
  },
  {
    icon: FileSpreadsheet,
    title: "ERP-ready XLSX & PDF MIS reports",
    body: "Export date-range expense ledgers, cost-centre rollups, spend-by-category summaries, and treasury statements in one click.",
    tint: "bg-emerald-50/80 border-emerald-100",
  },
  {
    icon: BadgeCheck,
    title: "Multi-level maker–checker workflows",
    body: "Separate expense initiation from financial sign-off with configurable approval chains tailored to your corporate hierarchy.",
    tint: "bg-violet-50/80 border-violet-100",
  },
  {
    icon: GitBranch,
    title: "Location & cost-centre scoping",
    body: "Empower plant managers and branch admins to manage their own site expenses while HQ finance oversees the master treasury wallet.",
    tint: "bg-indigo-50/80 border-indigo-100",
  },
  {
    icon: Landmark,
    title: "Automated partner & vendor routing",
    body: "Route high-value disbursements through approved settlement rules with transparent slab tracking and end-to-end UTR verification.",
    tint: "bg-slate-100/80 border-slate-200",
  },
];

export default function PaymentsPage() {
  return (
    <div className="bg-white">
      {/* =====================================================================
          1. MODERN SPLIT HERO BANNER
      ===================================================================== */}
      <ThinkWalnutHeroBanner
        badge="Paytrix SpendOS"
        eyebrow="Corporate Expense Management"
        title={
          <>
            Run corporate spend
            <span className="mt-1 block text-indigo-200">
              with total clarity &amp; speed.
            </span>
          </>
        }
        subtitle="Automate expense approvals, ring-fenced treasury wallets, vendor payouts, and multi-branch recurring payables on one unified platform."
        imageSrc="/images/thinkwalnut/tw-payments-hero.webp"
        imageAlt="Finance team managing corporate expenses on Paytrix SpendOS"
        ctaLabel="BOOK A LIVE DEMO"
      />

      {/* 3-Module Suite Sub-Navigation Banner (Original Creative Terminology) */}
      <section className="tw-band-indigo border-b border-indigo-100 py-8 text-center sm:py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xl font-extrabold tracking-tight text-indigo-950 sm:text-3xl">
            <a href="#flowpay" className="transition-colors hover:text-indigo-700">
              FlowPay
            </a>
            <span className="text-indigo-300">·</span>
            <a href="#spendiq" className="transition-colors hover:text-indigo-700">
              SpendIQ
            </a>
            <span className="text-indigo-300">·</span>
            <a href="#branchgrid" className="transition-colors hover:text-indigo-700">
              BranchGrid
            </a>
          </div>
          <p className="mt-2.5 text-base font-medium text-indigo-900/80 sm:text-xl">
            three connected engines powering modern corporate expense control
          </p>
        </div>
      </section>

      {/* =====================================================================
          2. TOTAL CONTROL · COMPLETE VISIBILITY · INCREASED EFFICIENCY + 3D ORBIT
      ===================================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/45 to-slate-50/70 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
              Total Control
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-indigo-950/85 sm:text-base">
              <li className="flex items-center gap-2">
                <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                Pre-approved corporate spend policies
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                Automated double-entry reconciliation
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                Multi-tier maker–checker sign-offs
              </li>
            </ul>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-3 lg:items-center">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
                Complete Visibility
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm font-medium text-indigo-950/85 sm:text-base">
                <li className="flex items-center gap-2">
                  <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                  Live spend dashboards by cost centre
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                  Structured invoice &amp; payable capture
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                  Immutable audit trail on every rupee
                </li>
              </ul>
            </div>

            <div>
              <BalancedControlIllustration />
            </div>

            <div>
              <h3 className="text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
                Increased Efficiency
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm font-medium text-indigo-950/85 sm:text-base">
                <li className="flex items-center gap-2">
                  <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                  Eliminate manual reimbursement chasing
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                  Predictable treasury wallet cashflow
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight size={16} className="shrink-0 text-indigo-700" />
                  3× faster monthly financial close
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. OUTCOMES + 3D ZERO PENALTIES GUARANTEE
      ===================================================================== */}
      <section className="bg-white py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            Built for high-velocity CFO &amp; finance teams
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Disciplined OpEx",
                points: ["Enforce department budgets", "Streamlined approval routing", "Zero manual portal juggling"],
              },
              {
                title: "Predictable Treasury",
                points: ["Real-time liability forecast", "Ring-fenced corporate wallets", "Zero surprise bank overdrafts"],
              },
              {
                title: "Spend Intelligence",
                points: ["Branch & category benchmarks", "Duplicate-payout prevention", "Instant anomaly detection"],
              },
              {
                title: "Effortless Books Close",
                points: ["Wallet ↔ UTR auto-matching", "One-click XLSX & PDF exports", "Statutory-ready ledger"],
              },
            ].map((card) => (
              <article
                key={card.title}
                className="tw-card-indigo rounded-2xl border border-indigo-100/80 p-6"
              >
                <h3 className="text-xl font-bold leading-snug text-indigo-950">{card.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {card.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-14 text-center">
            <p className="text-xl font-medium text-indigo-950 sm:text-2xl">The Paytrix Guarantee</p>
            <div className="mt-3 inline-block rounded-xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 px-8 py-3 text-xl font-bold text-white shadow-md sm:text-3xl">
              Zero out-of-policy spend · Zero late penalties
            </div>
            <div className="mt-8">
              <ZeroLateFeesPuzzleIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. "HOW FLOWPAY WORKS" DIAGONAL STAIRCASE
      ===================================================================== */}
      <section className="tw-band-soft relative overflow-hidden py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            How <span className="text-indigo-700">FlowPay</span> automates corporate disbursements
          </h2>

          <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-start">
            <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-100 via-indigo-50 to-white p-7 shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-indigo-950">1. Capture</h3>
                <Target size={26} className="text-indigo-700" />
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-indigo-950/85">
                Vendor invoices, recurring facility payables, and branch obligations are captured automatically with live amount verification and duplicate guards.
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-violet-100/90 via-indigo-50/70 to-white p-7 shadow-md lg:mt-14">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-indigo-700">2. Approve</h3>
                <BadgeCheck size={26} className="text-indigo-700" />
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-indigo-950/85">
                Authorised managers approve single or bulk payouts from your funded corporate wallet under role-based maker–checker rules.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-100/80 via-emerald-50/60 to-white p-7 shadow-md lg:mt-28">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-indigo-950">3. Reconcile</h3>
                <Wallet size={26} className="text-emerald-700" />
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-indigo-950/85">
                Disbursements settle instantly across direct or partner rails, with UTR proofs, receipts, and ERP-ready XLSX/PDF statements attached.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-7 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-sm hover:from-indigo-800 hover:to-indigo-700"
            >
              BOOK A DEMO
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. FLOWPAY — CORPORATE EXPENSE PILL GRID + 3D AUTOPAY DOCK
      ===================================================================== */}
      <section id="flowpay" className="scroll-mt-24 bg-white py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
            Automated Corporate Disbursements
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            FlowPay
          </h2>
          <p className="mt-2 text-lg font-medium text-slate-600">
            Every recurring corporate &amp; operational expense, settled from one workflow
          </p>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPENSE_CATEGORIES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="tw-pill-row flex items-center gap-3.5 rounded-xl border border-indigo-100 px-4 py-3 shadow-2xs"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 ring-1 ring-indigo-100">
                      <Icon size={17} />
                    </span>
                    <span className="text-sm font-medium text-indigo-950">{item.label}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <PowerPayUtilitiesIllustration />
            </div>
          </div>

          <div className="mt-10 max-w-4xl space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">
            <p>
              <strong className="text-indigo-950">Verified corporate payables only:</strong> FlowPay validates invoice and consumer parameters upfront so finance teams never pay an unverified or already-settled obligation.
            </p>
            <p className="font-medium text-indigo-900/85">
              Configure approval thresholds, department budgets, and partner payout rules around your exact corporate org chart.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. SPENDIQ — 3D AUDIT PRISM + SPEND INTELLIGENCE FEATURES
      ===================================================================== */}
      <section id="spendiq" className="scroll-mt-24 border-y border-indigo-100/70 bg-slate-50/80 py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <PowerBillIsometricIllustration />

            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
                Real-Time Spend Intelligence
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
                SpendIQ
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
                Catch cost spikes and duplicate obligations across branches before funds leave your corporate wallet. SpendIQ links every expense permanently to its digital voucher, approval log, UTR, and double-entry ledger line for effortless statutory audit.
              </p>
            </div>
          </div>

          <h3 className="mt-14 text-center text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
            Enterprise Spend-Control Capabilities
          </h3>

          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Policy & Approval Guardrails",
                bullets: [
                  "Role-based maker–checker sign-offs",
                  "Pre-disbursement liability verification",
                  "Single & bulk corporate payout execution",
                ],
              },
              {
                title: "Cost-Centre & Trend Analytics",
                bullets: [
                  "Spend-by-category & branch rollups",
                  "Duplicate & already-settled cycle detection",
                  "Department, site & partner ledger views",
                ],
              },
              {
                title: "Audit & ERP Readiness",
                bullets: [
                  "Unified operating & facility spend book",
                  "One-click Excel (.xlsx) & PDF exports",
                  "Timestamped immutable audit trail",
                ],
              },
            ].map((col) => (
              <div key={col.title} className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-2xs">
                <h4 className="text-xl font-semibold text-indigo-950">{col.title}</h4>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {col.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. BRANCHGRID — 6 COST-CENTRE GOVERNANCE CARDS
      ===================================================================== */}
      <section id="branchgrid" className="scroll-mt-24 bg-white py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
            Multi-Location Spend Governance
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            BranchGrid
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
            Built on a single-source-of-truth ledger so HQ finance controllers, regional plant/branch managers, and settlement partners collaborate seamlessly within strict role boundaries.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BRANCHGRID_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <h3 className="text-lg font-bold leading-snug text-indigo-950">
                      {card.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{card.body}</p>
                  </div>

                  <div
                    className={`mt-6 flex h-28 items-center justify-center rounded-xl border ${card.tint}`}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
                      <Icon size={28} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          8. DEMO FORM SECTION
      ===================================================================== */}
      <section className="border-t border-indigo-100 bg-slate-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <DemoEnquiryForm heading="Book a personalised SpendOS demo" compact />
        </div>
      </section>
    </div>
  );
}
