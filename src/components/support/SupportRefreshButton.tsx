"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

export function SupportRefreshButton({
  refreshing,
  onRefresh,
  className,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label="Refresh tickets and messages"
      title="Refresh"
      className={cn(
        "relative isolate flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-indigo-600 transition-colors hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[-60%] animate-[support-refresh-spin_2.2s_linear_infinite] bg-[conic-gradient(from_0deg,#93c5fd_0deg,#2563eb_50deg,#60a5fa_90deg,#93c5fd_150deg,#bfdbfe_260deg,#93c5fd_360deg)] motion-reduce:animate-none motion-reduce:bg-[#2563eb]"
      />
      <span aria-hidden className="pointer-events-none absolute inset-[1.5px] rounded-[6px] bg-white" />
      <RefreshCw size={16} strokeWidth={2} className={cn("relative z-10", refreshing && "animate-spin")} />
    </button>
  );
}
