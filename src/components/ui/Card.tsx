import { cn } from "@/lib/cn";
import { FillList } from "@/components/ui/Table";

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
 * A card around a list. By default it is as tall as its rows and does not shrink, so a
 * scrolling page shows every row. Pass `fitContent={false}` for the one list that should
 * fill the screen and scroll inside itself.
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
  const card = (
    <Card
      className={cn(
        "flex flex-col overflow-hidden border-slate-200/90 shadow-xs",
        fitContent ? "shrink-0" : "min-h-0 max-h-full flex-1",
        className,
      )}
    >
      {children}
    </Card>
  );
  return fitContent ? card : <FillList>{card}</FillList>;
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

