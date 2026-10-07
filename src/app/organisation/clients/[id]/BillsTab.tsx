"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { BillPayment, OrgStatus } from "@/lib/types";

const FILTERS: { key: OrgStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "NA", label: "Awaiting client" },
  { key: "PENDING", label: "Awaiting pick-up" },
  { key: "IN_PROCESS", label: "In process" },
  { key: "PAID", label: "Paid" },
];

export function BillsTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrgStatus | "ALL">("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      setPayments(
        await apiFetch<BillPayment[]>(`/api/v1/organisation/clients/${clientId}/bill-payments`),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load bills",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const visible = useMemo(
    () => (filter === "ALL" ? payments : payments.filter((p) => p.orgStatus === filter)),
    [payments, filter],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: payments.length };
    for (const p of payments) c[p.orgStatus] = (c[p.orgStatus] ?? 0) + 1;
    return c;
  }, [payments]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                )}
              >
                {counts[f.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <ListCard>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No bills here"
            description="Nothing matches this filter yet."
          />
        ) : (
          <Table>
            <THead
              columns={[
                "",
                "Biller",
                "Consumer no.",
                "Amount",
                "Org status",
                "Bill status",
              ]}
            />
            <TBody>
              {visible.map((p) => {
                const expanded = expandedIds.has(p.id);
                return (
                  <Fragment key={p.id}>
                    <TR className="cursor-pointer" onClick={() => toggleExpand(p.id)}>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="text-slate-400 transition-colors hover:text-slate-700"
                        >
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </TD>
                      <TD className="font-medium text-slate-900">
                        {p.billerName}
                        <p className="text-[11px] font-normal text-slate-400">{p.billServiceName}</p>
                      </TD>
                      <TD className="font-mono text-xs">{p.customerBillAccountNumber}</TD>
                      <TD className="font-semibold text-slate-900">₹{p.amount.toLocaleString("en-IN")}</TD>
                      <TD>
                        <StatusBadge status={p.orgStatus} />
                      </TD>
                      <TD>
                        <StatusBadge status={p.billStatus} />
                      </TD>
                    </TR>
                    {expanded && (
                      <TR className="hover:bg-transparent">
                        <TD colSpan={6} className="whitespace-normal bg-slate-50/60 p-4">
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                              <div className="p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Amount
                                </p>
                                <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                                  {p.amountBreakdown.length > 0 ? (
                                    p.amountBreakdown.map((c) => (
                                      <div key={c.label} className="flex justify-between gap-4">
                                        <dt className="text-slate-500">{c.label}</dt>
                                        <dd className="font-medium text-slate-700">
                                          ₹{c.amount.toLocaleString("en-IN")}
                                        </dd>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-slate-500">Current charges</dt>
                                      <dd className="font-medium text-slate-700">
                                        ₹{p.amount.toLocaleString("en-IN")}
                                      </dd>
                                    </div>
                                  )}
                                  <div className="flex justify-between gap-4 border-t border-dashed border-slate-200 pt-1.5">
                                    <dt className="font-semibold text-slate-600">Total</dt>
                                    <dd className="font-bold text-slate-900">
                                      ₹{p.amount.toLocaleString("en-IN")}
                                    </dd>
                                  </div>
                                </dl>
                              </div>

                              <div className="p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Customer &amp; biller
                                </p>
                                <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Customer</dt>
                                    <dd className="font-medium text-slate-700">{p.customerName ?? "—"}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Mobile</dt>
                                    <dd className="font-mono font-medium text-slate-700">
                                      {p.customerMobileNumber ?? "—"}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Biller</dt>
                                    <dd className="truncate font-medium text-slate-700">{p.billerName}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Category</dt>
                                    <dd className="font-medium text-slate-700">{p.billServiceName}</dd>
                                  </div>
                                </dl>
                              </div>

                              <div className="p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Bill info
                                </p>
                                <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Bill no.</dt>
                                    <dd className="font-mono font-medium text-slate-700">{p.billNumber ?? "—"}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Period</dt>
                                    <dd className="font-medium text-slate-700">{p.billPeriod ?? "—"}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Bill date</dt>
                                    <dd className="font-medium text-slate-700">{p.billDate ?? "—"}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Due date</dt>
                                    <dd className="font-medium text-slate-700">{p.dueDate ?? "—"}</dd>
                                  </div>
                                </dl>
                              </div>

                              <div className="p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Settlement
                                </p>
                                <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Paid by client</dt>
                                    <dd className="font-medium text-slate-700">
                                      {p.clientPaidAt ? new Date(p.clientPaidAt).toLocaleDateString() : "—"}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Picked up by</dt>
                                    <dd className="font-medium text-slate-700">{p.orgPickedUpBy ?? "—"}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">Paid by</dt>
                                    <dd className="font-medium text-slate-700">{p.orgPaidBy ?? "—"}</dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">BBPS txn.</dt>
                                    <dd className="font-mono font-medium text-slate-700">
                                      {p.bbpsTransactionId ?? "—"}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-slate-500">External txn.</dt>
                                    <dd className="font-mono font-medium text-slate-700">
                                      {p.externalTransactionId ?? "—"}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                              <span className="text-xs text-slate-400">
                                {p.billPayFailureReason ? (
                                  <span className="font-medium text-rose-600">
                                    {p.billPayFailureReason}
                                  </span>
                                ) : (
                                  `Created ${new Date(p.createdAt).toLocaleString()}`
                                )}
                              </span>
                              <StatusBadge status={p.orgStatus} />
                            </div>
                          </div>
                        </TD>
                      </TR>
                    )}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
        )}
      </ListCard>
    </div>
  );
}
