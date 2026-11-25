import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Car,
  CreditCard,
  Droplets,
  FileSearch,
  Flame,
  HeartHandshake,
  Landmark,
  MessageCircle,
  Phone,
  Receipt,
  ShieldCheck,
  Smartphone,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import {
  DemoEnquiryForm,
  ThinkWalnutHeroBanner,
} from "@/components/marketing/ThinkWalnutSections";

export const metadata: Metadata = {
  title: "Services — Corporate Expense Categories & SpendOS Capabilities",
  description:
    "Manage corporate operating expenses, departmental budgets, treasury wallets, vendor payouts, and recurring facility obligations from one unified Paytrix workspace.",
};

const EXPENSE_CATEGORIES = [
  {
    icon: Briefcase,
    title: "Vendor & Operational Payables",
    body: "Centralize recurring supplier payouts, contracted services, and location-level operating commitments with full maker–checker control.",
  },
  {
    icon: CreditCard,
    title: "Corporate Card Settlements",
    body: "Track corporate card billing cycles across leadership and regional teams and clear dues on schedule from treasury.",
  },
  {
    icon: Zap,
    title: "Commercial Power & Energy",
    body: "Consolidate electricity accounts across offices, manufacturing plants, and warehouses with verified due tracking before funds move.",
  },
  {
    icon: Wifi,
    title: "Enterprise Broadband & Leased Lines",
    body: "Keep branch internet, dedicated leased lines, and office connectivity accounts governed on one corporate ledger.",
  },
  {
    icon: Smartphone,
    title: "Corporate Mobile Plans",
    body: "Manage company-issued postpaid mobile connections for field, sales, and executive teams without individual reimbursement claims.",
  },
  {
    icon: Car,
    title: "Fleet, Logistics & FASTag",
    body: "Fund and monitor commercial vehicle and logistics fleet transit accounts with real-time spend visibility.",
  },
  {
    icon: HeartHandshake,
    title: "Commercial & Asset Insurance",
    body: "Never miss a corporate policy renewal — track institutional premiums with proactive schedule visibility and audit receipts.",
  },
  {
    icon: Receipt,
    title: "Equipment & Institutional EMIs",
    body: "Manage scheduled corporate loan and equipment financing obligations directly from ring-fenced treasury wallets.",
  },
  {
    icon: Landmark,
    title: "Municipal & Property Taxes",
    body: "Settle civic, commercial property, and local statutory obligations across all operating locations on time.",
  },
  {
    icon: Droplets,
    title: "Industrial & Facility Water",
    body: "Track municipal and industrial water board charges across plants, campuses, and commercial facilities.",
  },
  {
    icon: Flame,
    title: "Commercial Gas & Fuel",
    body: "Maintain commercial LPG and facility fuel accounts as structured recurring expenses rather than ad-hoc cash outlays.",
  },
  {
    icon: Phone,
    title: "Office Landline & Voice",
    body: "Keep fixed-line branch communication and reception desk accounts consolidated alongside enterprise telecom spend.",
  },
];

const WORKSPACE_MODULES = [
  {
    icon: FileSearch,
    title: "Centralised Expense & Payable Registry",
    body: "Register every recurring vendor, facility, and branch account once across the organisation. Paytrix verifies live amounts due and automatically prevents duplicate payouts on already-settled cycles.",
    points: [
      "Global uniqueness check prevents duplicate account entries",
      "Automated due-amount verification before disbursement",
      "Single or bulk Excel onboarding for multi-site rollouts",
    ],
    tone: "tw-card-indigo",
  },
  {
    icon: Wallet,
    title: "Ring-Fenced Corporate Treasury Wallets",
    body: "Corporate treasury funds a dedicated wallet via RTGS, NEFT, or UPI with transfer proof. Every approved expense writes an immutable, category-tagged debit entry on the ledger.",
    points: [
      "Pre-funded balance eliminates bank overdraft risk",
      "Granular cost-centre & expense-category tagging",
      "Maker–checker review before treasury credits post",
    ],
    tone: "tw-card-slate",
  },
  {
    icon: Landmark,
    title: "Intelligent Direct & Partner Disbursements",
    body: "Execute corporate disbursements directly over instant payment networks or route specialised high-value payouts through empanelled settlement partners under configurable slab rules.",
    points: [
      "Direct rail execution or rule-based partner routing",
      "Configurable amount-slab fee & commission engine",
      "End-to-end UTR proof and settlement confirmation",
    ],
    tone: "tw-card-indigo",
  },
  {
    icon: BarChart3,
    title: "CFO Analytics & ERP-Ready Statements",
    body: "Generate structured date-range financial reports tailored for CFOs, controllers, and operations teams — ready to drop straight into your accounting close.",
    points: [
      "Spend-by-category, cost-centre & branch rollups",
      "One-click Excel (.xlsx) and PDF statement exports",
      "Complete wallet, payout & settlement registers",
    ],
    tone: "tw-card-lavender",
  },
  {
    icon: ShieldCheck,
    title: "Maker–Checker Governance & Access Scoping",
    body: "HQ admins, regional branch operators, and external partners work with strict tenant boundaries, stateful server-side sessions, and timestamped audit logs.",
    points: [
      "Dual-control approvals on sensitive treasury actions",
      "Branch operators scoped strictly to assigned locations",
      "Complete corporate privacy on partner-routed payouts",
    ],
    tone: "tw-card-slate",
  },
  {
    icon: MessageCircle,
    title: "In-Workspace Support & Exception Resolution",
    body: "Finance and branch teams raise support threads directly inside Paytrix, keeping every inquiry or payout exception permanently linked to the exact transaction record.",
    points: [
      "Threaded in-workspace resolution history",
      "Real-time unread status indicators for operations",
      "Exception logs tied directly to the ledger entry",
    ],
    tone: "tw-card-emerald",
  },
];

export default function ServicesPage() {
  return (
    <div className="bg-white">
      <ThinkWalnutHeroBanner
        badge="Capabilities & Services"
        eyebrow="Corporate Expense Management · Treasury Wallets · Approvals"
        title="Every recurring corporate & facility expense, governed in one place."
        subtitle="Consolidate departmental budgets, vendor disbursements, corporate cards, and multi-site operational expenses on one audit-ready platform."
        imageSrc="/images/thinkwalnut/tw-services-hero.webp"
        imageAlt="Paytrix corporate expense management and analytics dashboard"
      />

      {/* Corporate Spend Categories */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-22">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
              Expense Coverage
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Comprehensive corporate &amp; operational spend categories
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Enable expense verticals globally or per subsidiary so each business unit and branch sees only the accounts and budgets assigned to it.
            </p>
          </div>
          <Link
            href="/payments"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:text-indigo-950"
          >
            Explore FlowPay &amp; SpendOS <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EXPENSE_CATEGORIES.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/60 via-white to-white p-6 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                  <Icon size={20} aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-bold text-indigo-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Workspace Capabilities */}
      <section className="border-t border-indigo-100/80 bg-slate-50/70 py-16 sm:py-22">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
            What the Paytrix SpendOS platform includes
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {WORKSPACE_MODULES.map((service) => {
              const Icon = service.icon;
              return (
                <article
                  key={service.title}
                  className={`${service.tone} flex flex-col rounded-2xl border border-indigo-100/80 p-7`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-2xs ring-1 ring-indigo-100">
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3 className="mt-5 text-xl font-bold tracking-tight text-indigo-950">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{service.body}</p>
                  <ul className="mt-5 flex flex-col gap-2 text-sm text-indigo-950/85">
                    {service.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-indigo-100 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <DemoEnquiryForm heading="Tell us how your organisation manages corporate expenses" compact />
        </div>
      </section>
    </div>
  );
}
