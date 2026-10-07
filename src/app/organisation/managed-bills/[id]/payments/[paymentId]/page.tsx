"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { eventMeta, EVENT_TONE_CLASSES } from "@/lib/activity-log";
import type { BillActivityLogEntry, BillPayment } from "@/lib/types";

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export default function OrganisationManagedBillPaymentDetailsPage() {
  const params = useParams<{ id: string; paymentId: string }>();
  const billId = params.id;
  const paymentId = params.paymentId;
  const toast = useToast();

  const [payment, setPayment] = useState<BillPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<BillActivityLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setPayment(
        await apiFetch<BillPayment>(
          `/api/v1/organisation/managed-bills/${billId}/payments/${paymentId}`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill");
    } finally {
      setLoading(false);
    }
  }

  async function loadLog() {
    setLogLoading(true);
    try {
      setLog(
        await apiFetch<BillActivityLogEntry[]>(
          `/api/v1/organisation/managed-bills/${billId}/payments/${paymentId}/activity-log`,
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load activity log",
      );
    } finally {
      setLogLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId, paymentId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href={`/organisation/managed-bills/${billId}`}
        className="mb-2 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 hover:text-accent"
      >
        <ArrowLeft size={14} /> Back to bill
      </Link>

      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {loading ? "Loading..." : (payment?.billerName ?? "Bill payment")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {payment
              ? `${payment.customerName ?? "—"} · ${payment.customerBillAccountNumber}`
              : " "}
          </p>
        </div>
      </div>

      {loading || !payment ? (
        <TableSkeleton cols={6} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <Card className="shrink-0">
            <CardHeader title="Bill payment" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
              <InfoField label="Bill number" value={payment.billNumber ?? "—"} />
              <InfoField label="Bill period" value={payment.billPeriod ?? "—"} />
              <InfoField label="Bill date" value={payment.billDate ?? "—"} />
              <InfoField
                label="Amount"
                value={<span className="text-base font-bold text-slate-900">₹{payment.amount.toLocaleString("en-IN")}</span>}
              />
              <InfoField label="Payment status" value={<StatusBadge status={payment.paymentStatus} />} />
              <InfoField label="Org status" value={<StatusBadge status={payment.orgStatus} />} />
              <InfoField label="Bill status" value={<StatusBadge status={payment.billStatus} />} />
              <InfoField label="Due date" value={payment.dueDate ?? "—"} />
              <InfoField
                label="Paid by client"
                value={
                  payment.clientPaidAt
                    ? `${payment.clientPaidBy ?? "—"} · ${new Date(payment.clientPaidAt).toLocaleDateString()}`
                    : "—"
                }
              />
              <InfoField label="Picked up by" value={payment.orgPickedUpBy ?? "—"} />
              <InfoField label="Paid by organisation" value={payment.orgPaidBy ?? "—"} />
              <InfoField label="BBPS txn." value={payment.bbpsTransactionId ?? "—"} />
              <InfoField label="External txn." value={payment.externalTransactionId ?? "—"} />
              <InfoField label="Bill type" value={payment.billType ?? "—"} />
              {payment.billPayFailureReason && (
                <div className="col-span-2 min-w-0 sm:col-span-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Failure reason
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-rose-600">
                    {payment.billPayFailureReason}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="shrink-0 overflow-hidden">
            <CardHeader
              title="Activity log"
              description="Every event for this specific bill cycle, newest first."
            />
            {logLoading ? (
              <TableSkeleton cols={3} rows={3} />
            ) : log.length === 0 ? (
              <EmptyState
                icon={History}
                title="No activity yet"
                description="Events for this bill cycle will show up here."
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col divide-y divide-border-subtle overflow-y-auto p-2">
                {log.map((entry, i) => {
                  const meta = eventMeta(entry.eventType);
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          EVENT_TONE_CLASSES[meta.tone],
                        )}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                        {entry.description && (
                          <p className="mt-0.5 text-xs text-slate-500">{entry.description}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-[11px] text-slate-400">
                        <p>{new Date(entry.createdAt).toLocaleString()}</p>
                        {entry.actor && <p>{entry.actor}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
