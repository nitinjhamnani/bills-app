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
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-slate-300">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", currentTone.glow)} />

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-2xs",
            currentTone.bg,
          )}
        >
          <Icon size={16} className="stroke-[2.25]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-600/10">
              {count} {count === 1 ? "bill" : "bills"}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-lg font-semibold tracking-tight text-slate-900">
            ₹{amount.toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </div>
  );
}
