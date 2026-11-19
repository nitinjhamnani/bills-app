import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-200/70",
        className,
      )}
    >
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

/** A skeleton shaped like the Table component's rows, for list-loading states. */
export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="divide-y divide-border-subtle">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-1.5 h-5 w-16" />
      </div>
    </div>
  );
}
