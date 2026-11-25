import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Car,
  CreditCard,
  Droplets,
  FileSpreadsheet,
  Flame,
  HeartHandshake,
  Landmark,
  Receipt,
  ShieldCheck,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { JsonLd } from "@/components/marketing/JsonLd";
import { ContactSplitSection } from "@/components/marketing/ThinkWalnutSections";
import { SITE, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "Paytrix | Corporate Expense & Multi-Location Spend Management Platform",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "corporate expense management",
    "enterprise spend management India",
    "multi-branch budget control",
    "maker checker expense approvals",
    "corporate treasury wallet",
    "Paytrix",
  ],
  openGraph: {
    title: "Paytrix | Corporate Expense & Multi-Location Spend Management Platform",
    description: SITE_DESCRIPTION,
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

const METRICS = [
  {
    value: "100%",
    unit: "",
    label: "Policy-governed corporate spend visibility",
    tone: "tw-card-indigo",
  },
  {
    value: "200+",
    unit: "",
    label: "Multi-location enterprises & finance teams",
    tone: "tw-card-lavender",
  },
  {
    value: "80",
    unit: "hrs+",
    label: "Saved monthly on approvals & reconciliation",
    tone: "tw-card-slate",
  },
  {
    value: "3×",
    unit: "Faster",
    label: "Month-end financial close across branches",
    tone: "tw-card-emerald",
  },
  {
    value: "99.9%",
    unit: "",
    label: "Automated double-entry ledger accuracy",
    tone: "tw-card-indigo",
  },
  {
    value: "₹0",
    unit: "",
    label: "Unauthorized or duplicate corporate payouts",
    tone: "tw-card-lavender",
  },
];

const SOLUTION_TOOLS = [
  {
    title: "FlowPay — Automated Payables",
    body: "Eliminate manual spreadsheets and scattered portal logins. Automate vendor disbursements, recurring facility expenses, and scheduled corporate payables with zero late penalties.",
    href: "/payments#flowpay",
    tone: "tw-card-indigo",
  },
  {
    title: "SpendIQ — Expense Intelligence",
    body: "Spot anomalies across departments and locations before funds leave treasury. Every payout is auto-matched to its invoice, UTR reference, and cost centre for instant ERP export.",
    href: "/payments#spendiq",
    tone: "tw-card-slate",
  },
  {
    title: "BranchGrid — Cost-Centre Control",
    body: "Delegate operational expense execution to regional offices, plants, and stores while HQ retains centralized budget limits and multi-level maker–checker sign-offs.",
    href: "/payments#branchgrid",
    tone: "tw-card-indigo",
  },
  {
    title: "Corporate Treasury Wallets",
    body: "Fund ring-fenced corporate wallets with verified treasury top-ups so teams execute approved expenses instantly without bank overdraft risk or untracked petty cash.",
    href: "/corporate-wallets",
    tone: "tw-card-lavender",
  },
];

const CORPORATE_SPEND_CATEGORIES = [
  { icon: Briefcase, label: "Departmental Operating Budgets" },
  { icon: Users, label: "Vendor & Supplier Payouts" },
  { icon: Building2, label: "Multi-Branch Facility Spend" },
  { icon: CreditCard, label: "Corporate Card Settlements" },
  { icon: Zap, label: "Commercial Power & Energy" },
  { icon: Wifi, label: "Enterprise Telecom & Internet" },
  { icon: Car, label: "Fleet, Logistics & FASTag" },
  { icon: HeartHandshake, label: "Commercial & Group Insurance" },
  { icon: Receipt, label: "Equipment & Institutional EMIs" },
  { icon: Landmark, label: "Civic & Property Taxes" },
  { icon: Droplets, label: "Industrial Water & Utilities" },
  { icon: Flame, label: "Commercial Gas & Fuel" },
];

const FAQS = [
  {
    q: "What makes Paytrix a complete corporate expense management platform?",
    a: "Paytrix unifies departmental and branch spend budgets, maker–checker approval workflows, ring-fenced corporate treasury wallets, vendor disbursements, recurring facility payables, and audit-ready XLSX/PDF ERP statements on a single operating system.",
  },
  {
    q: "Who is Paytrix built for?",
    a: "CFOs, finance controllers, operations leaders, and multi-location enterprises in India managing expenses across headquarters, regional offices, manufacturing plants, warehouses, and retail branches.",
  },
  {
    q: "How do treasury funding and expense approvals work?",
    a: "Corporate treasury funds a ring-fenced wallet via RTGS, NEFT, or UPI. Authorised team members submit or trigger recurring corporate payables, approvers sign off under maker–checker rules, and every disbursement writes an immutable double-entry ledger line.",
  },
  {
    q: "How is enterprise workspace access provisioned?",
    a: "Access is invitation-only with stateful server-side session security and strict role isolation across corporate finance admins, branch operators, and empanelled settlement partners.",
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

      {/* =====================================================================
          1. TRUST-BUILDING REALISTIC CFO HERO + FLOATING EXPENSE UI CARDS
      ===================================================================== */}
      <section className="overflow-x-clip bg-gradient-to-br from-[#EEF2FF] via-white to-[#F5F3FF] pt-10 pb-16 sm:pt-14 sm:pb-22">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            {/* Left Copy: Corporate Expense Narrative, Compliance Seals & CTAs */}
            <div>
              <span className="inline-block text-xs font-bold tracking-wide text-indigo-700 underline decoration-indigo-300 decoration-2 underline-offset-4 sm:text-sm">
                Paytrix SpendOS · Corporate Expense Management
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-indigo-950 sm:text-5xl sm:leading-[1.12]">
                All-in-One Corporate Expense Platform to Control, Approve, and Audit Every Rupee
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Give CFOs and finance teams centralized command over departmental budgets, multi-location operating spends, vendor payouts, and corporate treasury wallets — reconciled automatically on one audit-ready ledger.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:from-indigo-800 hover:to-indigo-700"
                >
                  Book a Live Demo
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Right Studio Frame + Realistic Indian CFO Portrait + Floating Expense Cards */}
            <div className="relative mx-auto w-full max-w-[520px] pt-2">
              <div className="relative mx-auto w-full max-w-[400px] rounded-[2.75rem] border-[3px] border-indigo-100 bg-gradient-to-b from-[#F5F7FF] via-white to-[#EEF2FF] px-4 pt-5 pb-5 shadow-[0_24px_60px_-20px_rgba(67,56,202,0.22)]">
                {/* Top App Frame Speaker + Window Dots */}
                <div className="mb-2 flex items-center justify-between px-3">
                  <span className="mx-auto h-1.5 w-14 rounded-full bg-indigo-100" />
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  </div>
                </div>

                {/* Composite Portrait + Floating Spend Cards Stage */}
                <div className="relative h-[340px] sm:h-[370px]">
                  {/* Left Floating Card: Spend Allocation Donut */}
                  <div className="absolute top-10 -left-3 z-10 w-44 rounded-2xl border border-indigo-100/90 bg-white p-3.5 shadow-lg sm:-left-12 sm:w-48">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-950">Spend Allocation</span>
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                    <div className="relative mx-auto mt-2.5 flex h-28 w-28 items-center justify-center">
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                        <circle cx="18" cy="18" r="12.5" fill="none" stroke="#C7D2FE" strokeWidth="6" />
                        <circle
                          cx="18"
                          cy="18"
                          r="12.5"
                          fill="none"
                          stroke="#4338CA"
                          strokeWidth="6"
                          strokeDasharray="62 100"
                        />
                      </svg>
                      <span className="absolute -top-1 right-0 rounded-md bg-indigo-950 px-1.5 py-0.5 text-[8px] font-bold text-white shadow-xs">
                        OPEX ₹48.2L
                      </span>
                      <span className="absolute top-3 left-0 rounded bg-white/95 px-1 text-[8px] font-extrabold text-indigo-900">
                        24%
                      </span>
                      <span className="absolute bottom-2 left-1 rounded bg-white/95 px-1 text-[8px] font-extrabold text-indigo-900">
                        64%
                      </span>
                    </div>
                  </div>

                  {/* Center: Realistic Studio Cutout Indian Corporate CFO */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/thinkwalnut/home-hero-cfo.webp"
                    alt="Enterprise CFO governing corporate budgets and approvals on Paytrix"
                    className="pointer-events-none absolute bottom-0 left-1/2 z-20 h-[335px] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-[0_16px_28px_rgba(30,27,75,0.2)] sm:h-[365px]"
                  />

                  {/* Right Floating Stack: Policy Approved + Multi-Branch Control */}
                  <div className="absolute top-6 -right-2 z-30 flex w-34 flex-col gap-3 sm:-right-10 sm:w-38">
                    <div className="rounded-2xl border border-indigo-100/90 bg-white p-3.5 text-center shadow-xl">
                      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                        <ShieldCheck size={20} />
                      </span>
                      <p className="mt-2 text-[11px] font-bold text-indigo-950">Policy Approved</p>
                      <p className="text-[9px] font-semibold text-emerald-600">100% Verified</p>
                    </div>

                    <div className="rounded-2xl border border-indigo-100/90 bg-white p-3.5 text-center shadow-xl">
                      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                        <Building2 size={20} />
                      </span>
                      <p className="mt-2 text-[11px] font-bold text-indigo-950">Branch Budgets</p>
                      <p className="text-[9px] font-semibold text-slate-500">28 Cost Centres</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Spend Controls Bar Overlapping Portrait Base */}
                <div className="relative z-30 -mx-2 -mt-2 sm:-mx-8">
                  <div className="rounded-2xl border border-indigo-100/90 bg-white p-3.5 shadow-[0_14px_34px_-8px_rgba(30,27,75,0.14)]">
                    <p className="mb-2.5 text-[10px] font-semibold text-slate-400">
                      Quick Expense Controls
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {[
                        { icon: Briefcase, label: "DEPT OPEX" },
                        { icon: Users, label: "VENDOR PAY" },
                        { icon: CreditCard, label: "CORP CARDS" },
                        { icon: Zap, label: "FACILITIES" },
                        { icon: Car, label: "FLEET PAY" },
                        { icon: FileSpreadsheet, label: "ERP CLOSE" },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                              <Icon size={14} />
                            </span>
                            <span className="text-[8.5px] font-extrabold leading-tight tracking-tight text-indigo-950">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. CENTERED EXECUTIVE VISION + 2x3 PASTEL GRADIENT KPI TILES
      ===================================================================== */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="mx-auto max-w-4xl text-center text-xl leading-relaxed text-indigo-950 sm:text-3xl sm:leading-[1.42]">
            <strong className="font-bold">Modern enterprises outgrow ad-hoc expense spreadsheets fast.</strong>{" "}
            <span className="font-normal text-slate-700">
              Paytrix gives finance leaders one disciplined operating system to allocate branch budgets, enforce approval policies, automate vendor and facility disbursements, and close books in hours instead of weeks.
            </span>
          </p>

          <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((m) => (
              <div
                key={m.label}
                className={`${m.tone} flex min-h-44 flex-col items-center justify-center rounded-2xl border border-indigo-100/70 p-6 text-center transition-transform hover:-translate-y-0.5`}
              >
                <p className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
                  {m.value}{" "}
                  {m.unit && <span className="text-lg font-semibold text-indigo-700">{m.unit}</span>}
                </p>
                <p className="mt-3 max-w-[13rem] text-sm font-semibold leading-snug text-indigo-950/85">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. SPLIT "OUR PLATFORM" INDIGO BAND + REALISTIC EXECUTIVE DESK PHOTO
      ===================================================================== */}
      <section className="bg-white py-6 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            Built for Modern Finance Teams
          </h2>
        </div>

        <div className="tw-band-indigo mt-5 py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <p className="text-base leading-relaxed text-slate-700 sm:text-lg">
                Whether your company operates five offices or two hundred plants, warehouses, and retail branches, Paytrix replaces fragmented petty cash, email approvals, and manual reconciliations with automated policy controls and a real-time double-entry spend ledger.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-6 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:from-indigo-800 hover:to-indigo-700"
                >
                  BOOK A DEMO
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-xs font-bold tracking-wider text-indigo-800 uppercase hover:bg-indigo-50"
                >
                  WORKSPACE LOGIN
                </Link>
              </div>
            </div>

            <div className="lg:-my-20">
              <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/thinkwalnut/tw-home-solutions-desk.webp"
                  alt="Corporate finance leader reviewing departmental budgets and expense approvals on laptop"
                  className="h-72 w-full object-cover sm:h-96"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. 4 SPENDOS PILLAR CARDS
      ===================================================================== */}
      <section className="bg-white pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mx-auto max-w-4xl text-center text-2xl font-semibold tracking-tight text-indigo-950 sm:text-4xl sm:leading-snug">
            Modular spend management blocks engineered around how your enterprise operates
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SOLUTION_TOOLS.map((tool) => (
              <article
                key={tool.title}
                className={`${tool.tone} flex flex-col justify-between rounded-2xl border border-indigo-100/80 p-6 transition-all hover:-translate-y-1 hover:border-indigo-300`}
              >
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-indigo-950">
                    {tool.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-700">
                    {tool.body}
                  </p>
                </div>

                <div className="mt-8 pt-2">
                  <Link
                    href={tool.href}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-800 hover:text-indigo-950"
                  >
                    Explore module
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. CORPORATE & OPERATIONAL EXPENSE COVERAGE STRIP
      ===================================================================== */}
      <section className="border-y border-indigo-100/80 bg-slate-50/90 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
                Unified Corporate Spend Coverage
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
                Every operating, vendor &amp; facility expense on one ledger
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:text-indigo-900"
            >
              Explore all capabilities <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {CORPORATE_SPEND_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.label}
                  className="tw-pill-row flex items-center gap-3.5 rounded-xl border border-indigo-100 px-4 py-3 shadow-2xs"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-2xs ring-1 ring-indigo-100">
                    <Icon size={17} />
                  </span>
                  <span className="text-sm font-semibold text-indigo-950">{cat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. SPLIT CONTACT & FREE DEMO SECTION
      ===================================================================== */}
      <ContactSplitSection heading="Book a personalised SpendOS demo" />
    </>
  );
}
