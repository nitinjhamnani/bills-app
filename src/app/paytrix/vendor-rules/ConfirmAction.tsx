"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatPercent, formatRange, type Commission } from "./format";

export type ActionDetail = { label: string; value: string };

export function commissionFacts(commission: Commission): ActionDetail[] {
  return [
    { label: "Category", value: commission.categoryName },
    { label: "Operator", value: commission.operatorName },
    { label: "Vendor", value: commission.vendorName },
    { label: "Amount", value: formatRange(commission.minRange, commission.maxRange) },
    { label: "Commission", value: formatPercent(commission.commission) },
  ];
}

export function ConfirmAction({
  open,
  title,
  summary,
  details,
  confirmLabel,
  danger = false,
  loading = false,
  raised = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  summary: string;
  details: ActionDetail[];
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  raised?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      dismissable={!loading}
      raised={raised}
      title={title}
      description={summary}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2 text-sm">
        {details.map((line) => (
          <div key={line.label} className="contents">
            <dt className="text-slate-500">{line.label}</dt>
            <dd className="font-medium text-slate-900">{line.value}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
