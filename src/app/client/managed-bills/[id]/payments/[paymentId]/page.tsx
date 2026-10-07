"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, History } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { Button } from "@/components/ui/Button";
import { ReasonModal } from "@/components/ui/ReasonModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { eventMeta, EVENT_TONE_CLASSES } from "@/lib/activity-log";
import type { BillActivityLogEntry, BillPayment, Dispute } from "@/lib/types";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function ManagedBillPaymentDetailsPage() {
  const params = useParams<{ id: string; paymentId: string }>();
  const billId = params.id;
  const paymentId = params.paymentId;
  const router = useRouter();
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";

  const [payment, setPayment] = useState<BillPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<BillActivityLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const next = await apiFetch<BillPayment>(
        `/api/v1/clients/${clientId}/managed-bills/${billId}/payments/${paymentId}`,
      );
      setPayment(next);
      if (next.billStatus === "PAID") await loadDisputes();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill");
    } finally {
      setLoading(false);
    }
  }

  async function loadDisputes() {
    try {
      setDisputes(await apiFetch<Dispute[]>(`/api/v1/bill-payments/${paymentId}/disputes`));
    } catch {
      // The dispute action still works if this read fails.
    }
  }

  async function submitDispute(reason: string) {
    try {
      await apiFetch(`/api/v1/bill-payments/${paymentId}/disputes`, {
        method: "POST",
        body: { reason },
      });
      toast.success("Dispute raised — the organisation will review it");
      setDisputeModalOpen(false);
      await loadDisputes();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to raise dispute");
    }
  }

  async function loadLog() {
    setLogLoading(true);
    try {
      setLog(
        await apiFetch<BillActivityLogEntry[]>(
          `/api/v1/clients/${clientId}/managed-bills/${billId}/payments/${paymentId}/activity-log`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load activity log");
    } finally {
      setLogLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadLog();
  }, [billId, paymentId]);

  const openDispute = disputes.find(
    (dispute) => dispute.status === "RAISED" || dispute.status === "UNDER_REVIEW",
  );
  const latestDispute = disputes[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={14} />}
          onClick={() => router.push(`/client/managed-bills/${billId}`)}
        >
          Bill
        </Button>
      </div>

      {loading || !payment ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {userInitials(payment.billerName)}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                  {payment.billerName}
                </h1>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {payment.customerName ?? "—"} · {payment.customerBillAccountNumber}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-2xl font-semibold tracking-tight text-slate-900">
                {inr(payment.amount)}
              </p>
              <StatusBadge status={payment.billStatus} />
              <StatusBadge status={payment.paymentStatus} />
              {payment.billStatus === "PAID" &&
                (openDispute ? (
                  <span className="text-xs font-medium text-amber-700">Under review</span>
                ) : latestDispute ? (
                  <StatusBadge status={latestDispute.status} />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<AlertTriangle size={14} />}
                    onClick={() => setDisputeModalOpen(true)}
                  >
                    Raise dispute
                  </Button>
                ))}
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
            <h2 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              This cycle
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <InfoField label="Bill number" value={payment.billNumber ?? "—"} />
              <InfoField label="Period" value={payment.billPeriod ?? "—"} />
              <InfoField label="Bill date" value={formatDate(payment.billDate)} />
              <InfoField label="Due date" value={formatDate(payment.dueDate)} />
              <InfoField label="Amount" value={inr(payment.amount)} />
              <InfoField label="Bill type" value={payment.billType ?? "—"} />
              <InfoField
                label="Paid by client"
                value={
                  payment.clientPaidAt
                    ? `${payment.clientPaidBy ?? "—"} · ${formatWhen(payment.clientPaidAt)}`
                    : "—"
                }
              />
              <InfoField label="Picked up by" value={payment.orgPickedUpBy ?? "—"} />
              <InfoField label="Paid by organisation" value={payment.orgPaidBy ?? "—"} />
              <InfoField label="BBPS transaction" value={payment.bbpsTransactionId ?? "—"} />
              <InfoField label="External transaction" value={payment.externalTransactionId ?? "—"} />
              {payment.billPayFailureReason && (
                <InfoField label="Failure reason" value={payment.billPayFailureReason} />
              )}
            </dl>
            {payment.amountBreakdown.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                {payment.amountBreakdown.map((part) => (
                  <InfoField key={part.label} label={part.label} value={inr(part.amount)} />
                ))}
              </dl>
            )}
          </div>

          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
              <p className="mt-0.5 text-xs text-slate-500">Events for this cycle, newest first.</p>
            </div>
            {logLoading ? (
              <div className="flex flex-col gap-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : log.length === 0 ? (
              <EmptyState
                icon={History}
                title="No activity yet"
                description="Events for this bill cycle show up here."
              />
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {log.map((entry, index) => {
                  const meta = eventMeta(entry.eventType);
                  const Icon = meta.icon;
                  return (
                    <div key={index} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          EVENT_TONE_CLASSES[meta.tone],
                        )}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                        {entry.description && (
                          <p className="mt-0.5 text-xs text-slate-500">{entry.description}</p>
                        )}
                        {entry.actor && <p className="mt-0.5 text-xs text-slate-400">{entry.actor}</p>}
                      </div>
                      <p className="shrink-0 text-[11px] font-medium text-slate-400">
                        {formatWhen(entry.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <ReasonModal
        open={disputeModalOpen}
        title="Raise a dispute"
        label="Reason"
        confirmLabel="Raise dispute"
        onCancel={() => setDisputeModalOpen(false)}
        onConfirm={submitDispute}
      />
    </div>
  );
}
