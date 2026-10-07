import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: string[];
}) {
  return (
    <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={12} className="text-slate-300" />}
                <span className={idx === breadcrumbs.length - 1 ? "text-slate-700 font-bold" : "hover:text-slate-600"}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
      )}
    </div>
  );
}


