import {
  Ban,
  CheckCircle2,
  Clock,
  LoaderCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";

type StatusTone = "neutral" | "danger" | "success" | "info" | "warning" | "refund";

/** Classifies any of the app's status strings by keyword into a shared colour tone, so every
 * list (bills, top-ups, redemptions, disputes) reads consistently without per-page mapping. */
function statusTone(status: string): StatusTone {
  const s = status.toUpperCase();
  if (/(FAILED|REJECTED|INVALID|SUSPENDED|TERMINATED)/.test(s)) return "danger";
  if (
    /(PAID|COMPLETED|APPROVED|VALID|ACTIVE|RESOLVED|SUCCESS|ENABLED)/.test(s) &&
    !/PENDING/.test(s)
  )
    return "success";
  if (/(PROCESSING|PICKED_UP|IN_PROGRESS|IN_PROCESS)/.test(s)) return "info";
  if (/(PENDING|REQUESTED|RAISED|QUEUED|UNDER_REVIEW|^DUE$|DISABLED|AWAITING)/.test(s))
    return "warning";
  if (/REFUND/.test(s)) return "refund";
  return "neutral";
}

const BADGE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-800 ring-slate-300",
  danger: "bg-rose-50/90 text-rose-800 ring-rose-300/80",
  success: "bg-emerald-50/90 text-emerald-800 ring-emerald-300/80",
  info: "bg-indigo-50/90 text-indigo-800 ring-indigo-300/80",
  warning: "bg-amber-50/90 text-amber-800 ring-amber-300/80",
  refund: "bg-violet-50/90 text-violet-800 ring-violet-300/80",
};

const TEXT_CLASSES: Record<StatusTone, string> = {
  neutral: "text-slate-700",
  danger: "text-rose-700",
  success: "text-emerald-700",
  info: "text-indigo-700",
  warning: "text-amber-700",
  refund: "text-violet-700",
};

function StatusIcon({ status }: { status: string }) {
  const s = status.toUpperCase();
  const className = "shrink-0";
  if (/(SUSPENDED|TERMINATED|DISABLED)/.test(s)) {
    return <Ban size={12} className={className} aria-hidden />;
  }
  const tone = statusTone(status);
  if (tone === "danger") return <XCircle size={12} className={className} aria-hidden />;
  if (tone === "success") return <CheckCircle2 size={12} className={className} aria-hidden />;
  if (tone === "info") return <LoaderCircle size={12} className={className} aria-hidden />;
  if (tone === "warning") return <Clock size={12} className={className} aria-hidden />;
  if (tone === "refund") return <RotateCcw size={12} className={className} aria-hidden />;
  return null;
}

/** Turns `IN_PROCESS` into `In Process`. Short tokens such as `NA` stay as written. */
export function formatStatusLabel(status: string) {
  if (status.length <= 3 && !status.includes("_")) return status;
  return status
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight ring-1 ${BADGE_CLASSES[tone]}`}
    >
      <StatusIcon status={status} />
      {formatStatusLabel(status)}
    </span>
  );
}

/** Same colour classification as `StatusBadge`, but as plain bold text (no pill) - for dense
 * label/value grids like bill cards, where a full badge per field would be too heavy. */
export function StatusText({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${TEXT_CLASSES[tone]}`}>
      <StatusIcon status={status} />
      {formatStatusLabel(status)}
    </span>
  );
}
