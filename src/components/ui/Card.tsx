import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface shadow-[var(--shadow-card)] transition-all duration-150 hover:border-slate-300/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A `Card` that fills whatever height its parent gives it and clips its own overflow, so a
 * `Table` (or any `flex-1 min-h-0 overflow-auto` region) placed inside scrolls internally
 * instead of growing the page. Use this for the one primary list on a page; for pages with
 * several shorter lists stacked vertically, a plain `Card` with the page itself scrolling is
 * usually the better fit.
 */
export function ListCard({
  className,
  children,
  fitContent = true,
}: {
  className?: string;
  children: React.ReactNode;
  fitContent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col min-h-0 flex-1 overflow-hidden border-slate-200/90 shadow-xs max-h-full",
        fitContent && "h-auto max-h-full",
        className,
      )}
    >
      {children}
    </Card>
  );
}






export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
      <div>
        <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 font-normal">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
      )}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

