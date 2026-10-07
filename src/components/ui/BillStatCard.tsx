import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { TONES } from "./StatCard";

/** Like StatCard, but for a bucket of bills that needs both a count and a total amount shown
 * together (e.g. "Pending — 4 bills — ₹12,400") instead of one headline figure. */
export function BillStatCard({
  label,
  count,
  amount,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  count: number;
  amount: number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  const currentTone = TONES[tone] || TONES.accent;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", currentTone.glow)} />

      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105",
            currentTone.bg,
          )}
        >
          <Icon size={19} className="stroke-[2.25]" />
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-600/10">
          {count} {count === 1 ? "bill" : "bills"}
        </span>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-900">
        ₹{amount.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
