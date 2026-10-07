import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  History,
  PackageCheck,
  RefreshCw,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type EventTone = "neutral" | "info" | "warning" | "danger" | "success";

export const EVENT_META: Record<string, { label: string; icon: LucideIcon; tone: EventTone }> = {
  CREATED: { label: "Bill created", icon: FilePlus2, tone: "neutral" },
  FETCH_SUCCESS: { label: "Fetched from biller", icon: RefreshCw, tone: "info" },
  FETCH_FAILED_TRANSIENT: { label: "Fetch failed — will retry", icon: AlertTriangle, tone: "warning" },
  FETCH_FAILED_PERMANENT: { label: "Fetch failed permanently", icon: XCircle, tone: "danger" },
  CLIENT_PAID: { label: "Paid by client", icon: Send, tone: "success" },
  ORG_PICKED_UP: { label: "Picked up by organisation", icon: PackageCheck, tone: "info" },
  ORG_PAID: { label: "Paid by organisation", icon: CheckCircle2, tone: "success" },
  ORG_MARK_FAILED: { label: "Marked failed by organisation", icon: XCircle, tone: "danger" },
};

export const EVENT_TONE_CLASSES: Record<EventTone, string> = {
  neutral: "bg-slate-100 text-slate-500",
  info: "bg-blue-50 text-blue-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-rose-50 text-rose-600",
  success: "bg-emerald-50 text-emerald-600",
};

export function eventMeta(eventType: string) {
  return EVENT_META[eventType] ?? { label: eventType, icon: History, tone: "neutral" as const };
}
