import { Droplets, Wifi, Zap } from "lucide-react";

const BILLS = [
  { icon: Zap, name: "Electricity", site: "Gurugram HQ", amount: "₹18,420", delay: "0s" },
  { icon: Droplets, name: "Water", site: "Noida plant", amount: "₹6,240", delay: "0.4s" },
  { icon: Wifi, name: "Broadband", site: "Bengaluru office", amount: "₹3,180", delay: "0.8s" },
];

export function HeroIllustration() {
  return (
    <div className="hero-stage relative mx-auto w-full max-w-lg lg:max-w-none" aria-hidden="true">
      <div className="hero-orbit" />
      <div className="hero-grid" />

      <div className="hero-float-wallet absolute top-5 right-4 z-20 w-40 rounded-2xl border border-white/50 bg-white/95 p-3.5 shadow-[var(--shadow-elevated)] sm:right-6 sm:w-44">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Company wallet</p>
        <p className="relative mt-1 h-7">
          <span className="hero-balance-before absolute inset-0 text-lg font-bold tracking-tight text-slate-900">₹4,80,000</span>
          <span className="hero-balance-after absolute inset-0 text-lg font-bold tracking-tight text-slate-900">₹4,52,160</span>
        </p>
        <p className="relative mt-1 h-4 text-[11px] font-semibold">
          <span className="hero-balance-before absolute inset-0 text-emerald-600">Funded</span>
          <span className="hero-balance-after absolute inset-0 text-indigo-700">3 bills debited</span>
        </p>
      </div>

      <div className="hero-float-panel relative z-10 mt-14 mr-4 mb-16 rounded-3xl border border-white/40 bg-white/95 p-4 shadow-[var(--shadow-elevated)] sm:mr-10 sm:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Helios Facilities</p>
            <span className="relative inline-flex h-6 items-center">
            <span className="hero-phase-fetch inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 text-[10px] font-bold text-indigo-700">
              <span className="hero-pulse h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Fetching
            </span>
            <span className="hero-phase-pay absolute inset-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-50 px-2.5 text-[10px] font-bold text-amber-700">
              Paying
            </span>
            <span className="hero-phase-done absolute inset-0 inline-flex items-center justify-center rounded-full bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-700">
              Paid
            </span>
          </span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-900">This month’s utility run</p>
        </div>

        <div className="relative mt-4 flex flex-col gap-2.5">
          <span className="hero-scan" />
          {BILLS.map((bill) => {
            const Icon = bill.icon;
            return (
              <div
                key={bill.name}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-xs ring-1 ring-slate-100">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{bill.name}</span>
                  <span className="block truncate text-xs text-slate-500">{bill.site}</span>
                </span>
                <span className="relative h-10 w-[5.5rem] shrink-0 text-right">
                  <span className="hero-fetch-label absolute inset-0 flex items-center justify-end text-xs font-semibold text-slate-400" style={{ animationDelay: bill.delay }}>
                    Fetching
                  </span>
                  <span className="hero-due-label absolute inset-0 flex flex-col items-end justify-center" style={{ animationDelay: bill.delay }}>
                    <span className="text-sm font-bold text-slate-900">{bill.amount}</span>
                    <span className="text-[10px] font-semibold text-amber-600">Due</span>
                  </span>
                  <span className="hero-paid-label absolute inset-0 flex flex-col items-end justify-center" style={{ animationDelay: bill.delay }}>
                    <span className="text-sm font-bold text-slate-900">{bill.amount}</span>
                    <span className="text-[10px] font-semibold text-emerald-600">Paid</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hero-float-settle absolute bottom-4 left-3 z-20 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/95 px-3.5 py-3 shadow-[var(--shadow-elevated)] sm:left-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path className="hero-check" d="M5 12.5 9.2 17 19 7" />
          </svg>
        </span>
        <span>
          <span className="block text-xs font-bold text-slate-900">Settled with billers</span>
          <span className="block text-[11px] text-slate-500">No portal login this cycle</span>
        </span>
      </div>

      <svg className="hero-flow-line pointer-events-none absolute top-16 right-10 z-0 hidden h-28 w-28 sm:block" viewBox="0 0 120 120" fill="none">
        <path d="M96 18 C 70 18, 48 48, 36 96" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeDasharray="4 6" />
        <path className="hero-flow-dash" d="M96 18 C 70 18, 48 48, 36 96" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
