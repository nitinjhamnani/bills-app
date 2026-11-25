import type { Metadata } from "next";
import { Award, Gift, Send, Sparkles, Users } from "lucide-react";
import { DemoEnquiryForm } from "@/components/marketing/ThinkWalnutSections";

export const metadata: Metadata = {
  title: "Digital Gift Cards — Corporate Gifting, Rewards & Incentives",
  description:
    "Issue 500+ branded Paytrix Digital Gift Cards across India and internationally for employee rewards, festive corporate gifting, channel incentives, and customer loyalty — tracked on one expense ledger.",
};

const GIFTING_PROGRAMS = [
  {
    icon: Award,
    title: "Employee Rewards & R&R",
    body: "Recognise top performers, work anniversaries, and spot awards instantly without physical voucher logistics.",
    tone: "tw-card-indigo",
  },
  {
    icon: Gift,
    title: "Festive & Corporate Gifting",
    body: "Delight teams and clients during Diwali, New Year, and company milestones with choice across 500+ leading brands.",
    tone: "tw-card-lavender",
  },
  {
    icon: Users,
    title: "Channel & Dealer Incentives",
    body: "Accelerate distributor, retail, and sales partner targets with instant digital gift card payouts tied to performance.",
    tone: "tw-card-slate",
  },
  {
    icon: Send,
    title: "Bulk Dispatch & Ledger Sync",
    body: "Upload recipient lists in one click, deliver via email or SMS, and reconcile every rupee under your department budget.",
    tone: "tw-card-emerald",
  },
];

export default function GiftCardsPage() {
  return (
    <div className="bg-white">
      {/* =====================================================================
          1. HERO BANNER (Matches ThinkWalnut Gift-cards.html)
      ===================================================================== */}
      <section className="relative min-h-[380px] overflow-hidden bg-[#0B0F29] sm:min-h-[450px]">
        {/* Right-side realistic gift photography */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/thinkwalnut/tw-giftcards-hero.webp"
          alt="Joyful celebration with wrapped gifts powered by Paytrix Digital Gift Cards"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right sm:object-center"
        />
        {/* Smooth dark-indigo left gradient fade into the bright right image */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#080B20] via-[#171642]/90 via-48% to-slate-950/10"
        />

        <div className="relative z-10 mx-auto flex min-h-[380px] max-w-6xl flex-col justify-between px-4 py-10 sm:min-h-[450px] sm:px-6 sm:py-14">
          <div>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 ring-1 ring-white/20">
              <Sparkles size={14} className="text-emerald-300" />
              Gift Cards
            </span>
          </div>

          <div className="mt-12 max-w-xl text-white">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.16]">
              Happy customers &amp; teams, is the best business strategy ever
            </h1>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. 500+ BRANDED DIGITAL GIFT CARDS INTRO
      ===================================================================== */}
      <section className="bg-white pt-16 pb-8 sm:pt-22">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="max-w-4xl text-2xl font-bold tracking-tight text-indigo-950 sm:text-4xl sm:leading-snug">
            More than 500+ branded Paytrix Digital Gift Cards available in India as well as internationally
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Want to drive higher revenue, reward high-performing teams, incentivise channel partners, and build stronger customer loyalty? Paytrix Digital Gift Cards are one of the surest, smartest, and most cost-effective ways to run corporate gifting at scale.
          </p>
        </div>
      </section>

      {/* =====================================================================
          3. 2x2 QUADRANT MATRIX + CENTER FLOATING "ONE CARD, MANY BENEFITS"
      ===================================================================== */}
      <section className="bg-white py-12 sm:py-18">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h3 className="text-center text-xl font-medium text-indigo-950 sm:text-3xl">
            Here are multiple ways in which our Paytrix Digital Gift Cards can help your business
          </h3>

          <div className="relative mt-10 overflow-hidden rounded-3xl border border-indigo-100 shadow-lg">
            <div className="grid sm:grid-cols-2">
              {/* Top-Left Quadrant: Increased Revenue */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-br from-indigo-200/80 via-indigo-100/60 to-indigo-50/40 p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Increased Revenue
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  2 in 5 recipients spend well above the face value of their Digital Gift Card, driving higher order value and engagement.
                </p>
              </div>

              {/* Top-Right Quadrant: Twice the Customers */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-bl from-emerald-100/65 via-slate-50 to-indigo-50/35 p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Twice the Reach
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  Digital Gift Cards are gifted across employees, partners, and customers — effortlessly doubling brand exposure.
                </p>
              </div>

              {/* Bottom-Left Quadrant: Easy Tracking */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-tr from-indigo-200/70 via-violet-50/60 to-white p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Easy Tracking
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  Integrated directly with your Paytrix corporate expense ledger so finance teams can track issuances, redemptions, and budgets in real time.
                </p>
              </div>

              {/* Bottom-Right Quadrant: Strong Relationships */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-tl from-slate-200/75 via-slate-100/60 to-white p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Strong Relationships
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  Build lasting loyalty with employees, dealers, and customers by pairing instant digital delivery with 500+ loved brands.
                </p>
              </div>
            </div>

            {/* Center Floating Card */}
            <div className="mx-4 my-4 rounded-2xl border border-indigo-100 bg-white/95 px-8 py-6 text-center shadow-xl backdrop-blur-md sm:absolute sm:top-1/2 sm:left-1/2 sm:m-0 sm:w-72 sm:-translate-x-1/2 sm:-translate-y-1/2">
              <p className="text-xl font-extrabold leading-snug text-indigo-950 sm:text-2xl">
                One Card,
                <span className="block text-indigo-700">Many Benefits</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. CORPORATE GIFTING & INCENTIVE PROGRAMS STRIP
      ===================================================================== */}
      <section className="border-y border-indigo-100/80 bg-slate-50/70 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
              Corporate Gifting &amp; Rewards
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
              Governed on the same Paytrix corporate expense platform
            </h3>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GIFTING_PROGRAMS.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className={`${item.tone} rounded-2xl border border-indigo-100/80 p-6 transition-transform hover:-translate-y-0.5`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-2xs ring-1 ring-indigo-100">
                    <Icon size={20} />
                  </span>
                  <h4 className="mt-4 text-base font-bold text-indigo-950">{item.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. CONTACT FORM (Matches ThinkWalnut Gift-cards.html Bottom)
      ===================================================================== */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <DemoEnquiryForm heading="For Details, Contact Us" compact />
        </div>
      </section>
    </div>
  );
}
