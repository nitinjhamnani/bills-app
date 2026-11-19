import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export const TONES = {
  accent: {
    bg: "bg-blue-50/80 text-blue-600 ring-1 ring-blue-500/20",
    glow: "from-blue-500/10 to-indigo-500/5",
    indicator: "bg-blue-600",
  },
  success: {
    bg: "bg-emerald-50/80 text-emerald-600 ring-1 ring-emerald-500/20",
    glow: "from-emerald-500/10 to-teal-500/5",
    indicator: "bg-emerald-600",
  },
  warning: {
    bg: "bg-amber-50/80 text-amber-600 ring-1 ring-amber-500/20",
    glow: "from-amber-500/10 to-orange-500/5",
    indicator: "bg-amber-600",
  },
  danger: {
    bg: "bg-rose-50/80 text-rose-600 ring-1 ring-rose-500/20",
    glow: "from-rose-500/10 to-pink-500/5",
    indicator: "bg-rose-600",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "accent",
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  trend?: string;
}) {
  const currentTone = TONES[tone] || TONES.accent;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-slate-300">
      <div className={cn("absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r", currentTone.glow)} />

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
            {trend && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/15">
                {trend}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-lg font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
