import type { BillPayment } from "./types";

const KNOWN = ["ASSIGNED", "IN_PROGRESS", "VENDOR_PAID", "VERIFIED", "REIMBURSED"] as const;

const BADGE: Record<(typeof KNOWN)[number], { status: string; label: string }> = {
  ASSIGNED: { status: "PENDING", label: "Assigned" },
  IN_PROGRESS: { status: "IN_PROGRESS", label: "In progress" },
  VENDOR_PAID: { status: "AWAITING", label: "Waiting for Paytrix" },
  VERIFIED: { status: "APPROVED", label: "Verified" },
  REIMBURSED: { status: "PAID", label: "Paid to you" },
};

export function vendorStageOf(bill: Pick<BillPayment, "reimbursedAt" | "vendorStage">): string {
  if (bill.reimbursedAt) return "REIMBURSED";
  return bill.vendorStage ?? "ASSIGNED";
}

/** Known stages keep their labels. An unknown stored value still renders. */
export function vendorStageBadge(stage: string): { status: string; label?: string } {
  if ((KNOWN as readonly string[]).includes(stage)) {
    return BADGE[stage as (typeof KNOWN)[number]];
  }
  return { status: stage };
}
