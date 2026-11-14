export interface CommissionRange {
  id: string;
  minAmount: number;
  maxAmount: number | null;
  isActive: boolean;
}

export interface Commission {
  id: string;
  minRange: number;
  maxRange: number | null;
  categoryId: string;
  categoryCode: string | null;
  categoryName: string;
  operatorId: string;
  operatorName: string;
  vendorId: string;
  vendorName: string;
  commission: number;
  status: "APPROVED" | "DRAFT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  createdByName: string | null;
  updatedById: string | null;
  updatedByName: string | null;
}

export function formatRange(minAmount: number, maxAmount: number | null) {
  const money = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return maxAmount == null ? `${money(minAmount)} and above` : `${money(minAmount)} – ${money(maxAmount)}`;
}

export interface CommissionLogEntry {
  id: string;
  action: string;
  summary: string;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number(value)}%`;
}
