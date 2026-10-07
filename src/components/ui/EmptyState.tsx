import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      {/* Soft radial backdrop ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="h-44 w-44 rounded-full bg-blue-50/80 blur-2xl" />
      </div>

      {/* Decorative Icon Ring Container */}
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-50 to-slate-100 text-blue-600 shadow-sm ring-1 ring-blue-600/15">
        <Icon size={28} className="stroke-[1.75]" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500/20 border border-white"></span>
        </span>
      </div>

      <div className="relative z-10 max-w-sm">
        <h3 className="text-base font-bold tracking-tight text-slate-800">{title}</h3>
        {description && (
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && <div className="relative z-10 mt-2">{action}</div>}
    </div>
  );
}

