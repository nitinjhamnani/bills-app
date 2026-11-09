export interface CommissionRange {
  id: string;
  minAmount: number;
  maxAmount: number | null;
  createdAt: string;
}

export interface CommissionVendorRate {
  id: string;
  vendorClientId: string;
  vendorName: string;
  commissionPercent: number | null;
  active: boolean;
  pendingProposalId: string | null;
  pendingCommissionPercent: number | null;
}

export interface CommissionRule {
  id: string;
  categoryId: string;
  categoryName: string;
  providerBillerId: string;
  providerName: string;
  range: { id: string; minAmount: number; maxAmount: number | null };
  vendors: CommissionVendorRate[];
  highestCommissionPercent: number | null;
  active: boolean;
  createdAt: string;
}

export interface VendorCommissionRule {
  id: string;
  categoryId: string;
  categoryName: string;
  providerBillerId: string;
  providerName: string;
  range: { id: string; minAmount: number; maxAmount: number | null };
  commissionPercent: number | null;
  rateActive: boolean;
  pendingProposalId: string | null;
  pendingCommissionPercent: number | null;
  createdAt: string;
}

export interface CommissionHistoryEntry {
  id: string;
  vendorClientId: string | null;
  vendorName: string | null;
  eventType: string;
  commissionPercent: number | null;
  actor: string;
  createdAt: string;
}

export function formatRange(minAmount: number, maxAmount: number | null) {
  const money = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return maxAmount == null ? `${money(minAmount)} and above` : `${money(minAmount)} – ${money(maxAmount)}`;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null) return "—";
  return `${Number(value)}%`;
}

export function historyText(entry: CommissionHistoryEntry) {
  const vendor = entry.vendorName ?? "A vendor";
  const percent = formatPercent(entry.commissionPercent);
  switch (entry.eventType) {
    case "VENDOR_ADDED":
      return `${vendor} was added`;
    case "VENDOR_REMOVED":
      return `${vendor} was removed`;
    case "RATE_ENTERED":
      return `Paytrix set ${vendor} to ${percent}`;
    case "BID_SUBMITTED":
      return `${vendor} submitted ${percent}`;
    case "BID_ACCEPTED":
      return `Paytrix accepted ${vendor} at ${percent}`;
    case "BID_REJECTED":
      return `Paytrix rejected ${vendor}'s ${percent} bid`;
    case "VENDOR_PAUSED":
      return `${vendor} was paused`;
    case "VENDOR_RESUMED":
      return `${vendor} was resumed`;
    case "RULE_ACTIVATED":
      return "The rule was activated";
    case "RULE_DEACTIVATED":
      return "The rule was deactivated";
    default:
      return entry.eventType;
  }
}
