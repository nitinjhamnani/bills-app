import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgePercent,
  BarChart3,
  Building2,
  GitBranch,
  Network,
  UserCheck,
} from "lucide-react";
import { PlatformSatisfactionIllustration } from "@/components/marketing/ThinkWalnutIllustrations";
import {
  DemoEnquiryForm,
  ThinkWalnutHeroBanner,
} from "@/components/marketing/ThinkWalnutSections";

export const metadata: Metadata = {
  title: "Enterprise Spend Cloud — Multi-Entity & Partner Ecosystem",
  description:
    "Connect corporate finance headquarters, regional cost centres, business development teams, and settlement partners on one unified spend cloud.",
};

const PLATFORM_PILLARS = [
  {
    icon: UserCheck,
    title: "Digital Entity & Partner Onboarding",
    body: "Structured KYC verification, e-signed commercial agreements, and controlled workspace provisioning for corporate entities and partners.",
    tone: "tw-card-indigo",
  },
  {
    icon: Building2,
    title: "Portfolio & Business Attribution",
    body: "Dedicated portfolio views track onboarded corporate groups, monthly spend volumes, and unit performance cleanly.",
    tone: "tw-card-slate",
  },
  {
    icon: GitBranch,
    title: "Cost-Centre & Plant Hierarchy",
    body: "Map operating accounts by branch, factory, or store and scope regional operators strictly to the sites they manage.",
    tone: "tw-card-indigo",
  },
  {
    icon: BadgePercent,
    title: "Configurable Slab & Policy Engine",
    body: "Define amount-based routing tiers, approval thresholds, and commercial rules across every corporate spend category.",
    tone: "tw-card-slate",
  },
  {
    icon: Network,
    title: "Privacy-First Partner Disbursements",
    body: "Route specialised disbursements to empanelled settlement partners with corporate identity protected and automated UTR verification.",
    tone: "tw-card-lavender",
  },
  {
    icon: BarChart3,
    title: "Executive MIS & ERP Exports",
    body: "Role-tailored financial reporting across HQ finance, cost centres, and partners — exportable in one click to Excel (.xlsx) and PDF.",
    tone: "tw-card-slate",
  },
];

export default function EngagementPlatformPage() {
  return (
    <div className="bg-white">
      {/* 1. Modern Split Hero Banner */}
      <ThinkWalnutHeroBanner
        badge="Enterprise Spend Cloud"
        eyebrow="Shortest distance between an expense request and closed books is the"
        title="Connected workspace your teams run."
        subtitle="Align HQ finance controllers, distributed branch managers, and settlement partners on one shared source of financial truth."
        imageSrc="/images/thinkwalnut/tw-engagement-hero.webp"
        imageAlt="Enterprise finance and operations leaders collaborating on Paytrix Spend Cloud"
        ctaLabel="SCHEDULE AN ENTERPRISE DEMO"
      />

      {/* 2. Intro + 3D Enterprise Hub Illustration */}
      <section className="bg-white py-16 sm:py-22">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-2xl tracking-tight text-indigo-950 sm:text-4xl sm:leading-snug">
            <strong className="font-bold">At Paytrix, we partner with CFOs,</strong>{" "}
            <span className="font-normal text-slate-700">
              finance controllers, and multi-location operations teams across India
            </span>
          </h2>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              <p>
                We modernise corporate expense management through role-isolated, audit-ready workspaces. Paytrix gives enterprises the flexibility to onboard subsidiaries and branches, configure spend policies, and govern every rupee from treasury top-up to final settlement.
              </p>
              <p>
                Governance and speed live on the same record — delivering real-time visibility for CFOs, frictionless execution for site managers, and transparent reconciliation for disbursement partners.
              </p>
            </div>

            <div>
              <PlatformSatisfactionIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* 3. 2x3 Platform Capability Cards */}
      <section className="bg-white pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mx-auto max-w-4xl text-center text-2xl font-semibold tracking-tight text-indigo-950 sm:text-4xl">
            Purpose-built capabilities across every stakeholder in corporate spend
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className={`${item.tone} rounded-2xl border border-indigo-100/80 p-7 transition-transform hover:-translate-y-0.5`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo-800 shadow-2xs ring-1 ring-indigo-100">
                    <Icon size={24} />
                  </span>
                  <h3 className="mt-5 text-xl font-bold leading-snug text-indigo-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Bottom Split Indigo Banner + 3D Illustration */}
      <section className="tw-band-indigo py-14 sm:py-18">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-base leading-relaxed text-indigo-950 sm:text-lg">
              Every enterprise has its own cost-centre hierarchy, approval matrix, and operating footprint — so Paytrix SpendOS adapts roles, limits, and workflows to fit how your finance team actually runs.
            </p>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-7 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-sm hover:from-indigo-800 hover:to-indigo-700"
              >
                BOOK A WALKTHROUGH
              </Link>
            </div>
          </div>

          <div>
            <PlatformSatisfactionIllustration />
          </div>
        </div>
      </section>

      {/* 5. Contact Form */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <DemoEnquiryForm heading="Connect with our Enterprise Solutions Team" compact />
        </div>
      </section>
    </div>
  );
}
