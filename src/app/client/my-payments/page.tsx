"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { CorpPayment } from "@/lib/types";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Where the corporate's payment is now. The settler's name is not shown to the corporate. */
function stage(payment: CorpPayment): { status: string; label: string } {
  if (payment.isVerified) return { status: "PAID", label: "Paid to biller" };
  if (payment.billPaidOn) {
    return payment.billAssignedTo === "VENDOR"
      ? { status: "IN_PROGRESS", label: "Being confirmed" }
      : { status: "PAID", label: "Paid to biller" };
  }
  if (payment.billAssignedToStatus === "IN_PROGRESS") return { status: "IN_PROGRESS", label: "In progress" };
  return { status: "PENDING", label: "Received" };
}

export default function ClientMyPaymentsPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const [payments, setPayments] = useState<CorpPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiFetch<CorpPayment[]>(`/api/v1/clients/${clientId}/my-payments`);
        if (!cancelled) setPayments(rows);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load payments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, toast]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return payments;
    return payments.filter(
      (payment) =>
        payment.consumerNumber.toLowerCase().includes(needle) ||
        payment.billerName.toLowerCase().includes(needle),
    );
  }, [payments, query]);

  const total = useMemo(() => visible.reduce((sum, payment) => sum + payment.billAmount, 0), [visible]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="My Payments" description="Bills you have paid, and where each payment is now." />

      <div className="flex shrink-0 flex-col gap-3 rounded-xl bg-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-semibold text-slate-700">
          Paid
          <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
            {visible.length}
          </span>
          <span className="ml-2 font-medium text-slate-500">{inr(total)}</span>
        </span>
        <label className="relative flex items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Biller or consumer number"
            aria-label="Search payments"
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-sm sm:w-64"
          />
        </label>
      </div>

      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={payments.length === 0 ? "No payments yet" : "No payments match"}
            description={
              payments.length === 0 ? "Bills you pay from My Dues show up here." : "Try another biller or consumer number."
            }
          />
        ) : (
          <>
            <div className="hidden min-h-0 flex-1 flex-col md:flex">
              <Table>
                <THead columns={["Biller", "Consumer no.", "Amount", "Paid on", "Status"]} />
                <TBody>
                  {visible.map((payment) => {
                    const expanded = expandedIds.has(payment.id);
                    const current = stage(payment);
                    return (
                      <Fragment key={payment.id}>
                        <TR className="cursor-pointer" onClick={() => toggleExpand(payment.id)}>
                          <TD>
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-slate-400">
                                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{payment.billerName}</p>
                                <p className="text-[11px] font-medium text-slate-400">{payment.categoryName}</p>
                                {payment.branchName && (
                                  <p className="text-[11px] font-medium text-slate-500">{payment.branchName}</p>
                                )}
                              </div>
                            </div>
                          </TD>
                          <TD onClick={(e) => e.stopPropagation()}>
                            <CopyableChip text={payment.consumerNumber} label="consumer number" />
                          </TD>
                          <TD className="font-mono text-sm font-semibold text-slate-900">{inr(payment.billAmount)}</TD>
                          <TD className="text-slate-500">{formatWhen(payment.corpPaymentOn)}</TD>
                          <TD>
                            <StatusBadge status={current.status} label={current.label} />
                          </TD>
                        </TR>
                        {expanded && (
                          <TR className="hover:bg-transparent">
                            <TD colSpan={5} className="bg-slate-50 px-4 py-3 whitespace-normal!">
                              <PaymentDetail payment={payment} />
                            </TD>
                          </TR>
                        )}
                      </Fragment>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 md:hidden">
              <ul className="flex flex-col gap-3">
                {visible.map((payment) => {
                  const expanded = expandedIds.has(payment.id);
                  const current = stage(payment);
                  return (
                    <li
                      key={payment.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-card)]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(payment.id)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{payment.billerName}</p>
                            <p className="text-xs text-slate-500">{payment.consumerNumber}</p>
                          </div>
                          <p className="shrink-0 font-mono text-sm font-semibold text-slate-900">
                            {inr(payment.billAmount)}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <StatusBadge status={current.status} label={current.label} />
                          <span className="text-xs text-slate-500">Paid {formatWhen(payment.corpPaymentOn)}</span>
                        </div>
                      </button>
                      {expanded && (
                        <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                          <PaymentDetail payment={payment} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </ListCard>
    </div>
  );
}

function PaymentDetail({ payment }: { payment: CorpPayment }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <DetailField label="Due" value={formatWhen(payment.dueDate)} />
        <DetailField label="Cycle" value={payment.billCycle ?? "—"} />
        <DetailField label="Paid on" value={formatWhen(payment.corpPaymentOn)} />
        <DetailField label="Paid to biller" value={formatWhen(payment.billPaidOn)} />
        <DetailField label="Transaction ref." value={payment.transactionReferenceNumber ?? "—"} mono />
        <DetailField label="BBPS ref." value={payment.bbpsExternalReference ?? "—"} mono />
        <DetailField label="Verified" value={payment.isVerified ? formatWhen(payment.verifiedOn) : "Not yet"} />
        <DetailField label="Payment id" value={payment.id.slice(0, 8)} mono />
      </dl>
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm text-slate-900", mono ? "font-mono font-medium" : "font-medium")}>
        {value}
      </dd>
    </div>
  );
}
