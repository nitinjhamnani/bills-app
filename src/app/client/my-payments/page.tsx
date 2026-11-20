"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, FileText, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { CorpPayment } from "@/lib/types";

type StageFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "PAID";

const STAGE_FILTERS: { key: StageFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Received" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "PAID", label: "Paid to biller" },
];

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
function stage(payment: CorpPayment): { key: Exclude<StageFilter, "ALL">; status: string; label: string } {
  if (payment.isVerified) return { key: "PAID", status: "PAID", label: "Paid to biller" };
  if (payment.billPaidOn) {
    return payment.billAssignedTo === "VENDOR"
      ? { key: "IN_PROGRESS", status: "IN_PROGRESS", label: "Being confirmed" }
      : { key: "PAID", status: "PAID", label: "Paid to biller" };
  }
  if (payment.billAssignedToStatus === "IN_PROGRESS") {
    return { key: "IN_PROGRESS", status: "IN_PROGRESS", label: "In progress" };
  }
  return { key: "PENDING", status: "PENDING", label: "Received" };
}

export default function ClientMyPaymentsPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const [payments, setPayments] = useState<CorpPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`Copied ${text}`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return payments;
    return payments.filter(
      (payment) =>
        payment.consumerNumber.toLowerCase().includes(needle) ||
        payment.billerName.toLowerCase().includes(needle) ||
        payment.categoryName.toLowerCase().includes(needle) ||
        (payment.branchName ?? "").toLowerCase().includes(needle),
    );
  }, [payments, query]);

  const counts = useMemo<Record<StageFilter, number>>(() => {
    const next: Record<StageFilter, number> = {
      ALL: searched.length,
      PENDING: 0,
      IN_PROGRESS: 0,
      PAID: 0,
    };
    for (const payment of searched) {
      const st = stage(payment).key;
      next[st] += 1;
    }
    return next;
  }, [searched]);

  const visible = useMemo(() => {
    if (stageFilter === "ALL") return searched;
    return searched.filter((payment) => stage(payment).key === stageFilter);
  }, [searched, stageFilter]);

  const total = useMemo(() => visible.reduce((sum, payment) => sum + payment.billAmount, 0), [visible]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

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
      <PageHeader title="Bill Payments" description="Bills you have paid, and where each payment is now." />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {STAGE_FILTERS.map((item) => {
          const active = stageFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setStageFilter(item.key);
                setCurrentPage(1);
              }}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                )}
              >
                {counts[item.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-semibold text-slate-700">
        <span>
          Paid bills
          <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-700">
            {visible.length}
          </span>
          {visible.length !== payments.length && (
            <span className="ml-1 text-slate-400">of {payments.length}</span>
          )}
        </span>
        <span className="font-mono text-slate-700">Total paid: {inr(total)}</span>
      </div>

      <ListCard fitContent={false}>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="relative sm:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by biller, consumer no., or branch"
              aria-label="Search payments"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={7} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={payments.length === 0 ? "No payments yet" : "No payments match"}
            description={
              payments.length === 0
                ? "Bills you pay from Bill Dues show up here."
                : "Try another status filter or search query."
            }
          />
        ) : (
          <>
            <Table>
              <THead columns={["Biller", "Branch", "Consumer", "Due date", "Paid on", "Amount", "Status"]} />
              <TBody>
                {paged.map((payment) => {
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
                              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                                {payment.categoryName}
                              </p>
                            </div>
                          </div>
                        </TD>
                        <TD className="text-xs font-medium text-slate-700">{payment.branchName ?? "—"}</TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Copy consumer number"
                            onClick={() => copyText(`consumer:${payment.id}`, payment.consumerNumber)}
                            className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                          >
                            <span>{payment.consumerNumber}</span>
                            {copiedKey === `consumer:${payment.id}` ? (
                              <Check size={11} className="text-emerald-600" />
                            ) : (
                              <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                            )}
                          </button>
                        </TD>
                        <TD className="text-xs text-slate-600">{formatWhen(payment.dueDate)}</TD>
                        <TD className="text-xs text-slate-500">{formatWhen(payment.corpPaymentOn)}</TD>
                        <TD className="font-mono text-sm font-semibold text-slate-900">
                          {inr(payment.billAmount)}
                        </TD>
                        <TD>
                          <StatusBadge status={current.status} label={current.label} />
                        </TD>
                      </TR>
                      {expanded && (
                        <TR className="hover:bg-transparent">
                          <TD colSpan={7} className="bg-slate-50 px-4 py-3 whitespace-normal!">
                            <PaymentDetail payment={payment} />
                          </TD>
                        </TR>
                      )}
                    </Fragment>
                  );
                })}
              </TBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={visible.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
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
