import type { Metadata } from "next";
import {
  DemoEnquiryForm,
  ThinkWalnutHeroBanner,
} from "@/components/marketing/ThinkWalnutSections";

export const metadata: Metadata = {
  title: "Corporate Treasury Wallets — One Wallet, Total Spend Control",
  description:
    "Fund ring-fenced corporate treasury wallets via RTGS, NEFT, or UPI and govern departmental, vendor, and multi-branch operating expenses with full double-entry ledger control.",
};

export default function CorporateWalletsPage() {
  return (
    <div className="bg-white">
      {/* 1. Modern Split Hero Banner */}
      <ThinkWalnutHeroBanner
        badge="Corporate Treasury Wallets"
        eyebrow="Ring-Fenced Spend Governance"
        title={
          <>
            Prepaid treasury control is the smartest
            <span className="mt-1 block text-indigo-200">corporate spend strategy.</span>
          </>
        }
        subtitle="Replace untracked branch advances and exposed bank mandates with a ring-fenced corporate wallet backed by maker–checker top-up verification."
        imageSrc="/images/thinkwalnut/tw-wallets-hero.webp"
        imageAlt="Finance team managing corporate treasury wallets on Paytrix"
        ctaLabel="EXPLORE TREASURY WALLETS"
      />

      {/* 2. Intro Copy */}
      <section className="bg-white pt-16 pb-8 sm:pt-22">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="max-w-4xl text-2xl font-bold tracking-tight text-indigo-950 sm:text-4xl sm:leading-snug">
            Fund one ring-fenced Paytrix Corporate Wallet to power expenses across every department, plant, and branch
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Want predictable monthly cash outflows, zero unauthorized overdrafts, and instant multi-location payout execution? Paytrix Corporate Wallets credit balances only after verified UTR review and write an immutable double-entry ledger line on every transaction.
          </p>
        </div>
      </section>

      {/* 3. 2x2 Quadrant Matrix + Center Floating Card */}
      <section className="bg-white py-12 sm:py-18">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h3 className="text-center text-xl font-medium text-indigo-950 sm:text-3xl">
            How Paytrix Corporate Wallets empower your CFO &amp; treasury desk
          </h3>

          <div className="relative mt-10 overflow-hidden rounded-3xl border border-indigo-100 shadow-lg">
            <div className="grid sm:grid-cols-2">
              {/* Top-Left Quadrant */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-br from-indigo-200/75 via-indigo-100/60 to-indigo-50/40 p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Zero Overdraft Risk
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  Expenses execute strictly from pre-funded wallet balances — eliminating surprise bank debits or out-of-budget branch payouts.
                </p>
              </div>

              {/* Top-Right Quadrant */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-bl from-emerald-100/70 via-slate-50 to-indigo-50/30 p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Multi-Branch Velocity
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  HQ treasury funds one central wallet while authorised managers clear approved expenses across dozens of locations in one click.
                </p>
              </div>

              {/* Bottom-Left Quadrant */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-tr from-indigo-200/70 via-violet-50/60 to-white p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Cost-Centre Tagging
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  Every debit is automatically tagged with its branch, cost centre, expense category, UTR proof, and live running balance.
                </p>
              </div>

              {/* Bottom-Right Quadrant */}
              <div className="flex min-h-64 flex-col items-center justify-center bg-gradient-to-tl from-slate-200/70 via-slate-100/60 to-white p-8 text-center sm:p-12">
                <h4 className="text-2xl font-bold text-indigo-950 sm:text-3xl">
                  Maker–Checker Trust
                </h4>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-700">
                  RTGS, NEFT, and UPI treasury top-ups attach bank transfer proof and undergo dual-control verification before balances update.
                </p>
              </div>
            </div>

            {/* Center Floating Card */}
            <div className="mx-4 my-4 rounded-2xl border border-indigo-100 bg-white/95 px-8 py-6 text-center shadow-xl backdrop-blur-md sm:absolute sm:top-1/2 sm:left-1/2 sm:m-0 sm:w-72 sm:-translate-x-1/2 sm:-translate-y-1/2">
              <p className="text-xl font-extrabold leading-snug text-indigo-950 sm:text-2xl">
                One Wallet,
                <span className="block text-indigo-700">Total Control</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Contact Form */}
      <section className="border-t border-indigo-100 bg-slate-50/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <DemoEnquiryForm heading="Set up your Corporate Treasury Wallet" compact />
        </div>
      </section>
    </div>
  );
}
