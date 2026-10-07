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
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="mt-4 h-3 w-20" />
      <Skeleton className="mt-2 h-6 w-16" />
    </div>
  );
}
