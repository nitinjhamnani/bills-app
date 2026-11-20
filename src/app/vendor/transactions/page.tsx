"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Copy, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { ListCard } from "@/components/ui/Card";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { ClientAccount } from "@/lib/types";
import { cn } from "@/lib/cn";

type VendorTransaction = {
  id: string;
  billPaymentId: string;
  corporateName: string | null;
  billerName: string | null;
  consumerNumber: string | null;
  billAmount: number;
  billPaidOn: string | null;
  commissionPercent: number | null;
  commissionAmount: number;
  commissionStatus: "PENDING" | "RECEIVED";
  commissionReference: string | null;
  commissionMode: string | null;
  paymentStatus: "PENDING" | "PAID";
  paymentMode: string | null;
  paymentMadeOn: string | null;
  paymentReference: string | null;
};

type Filter = "ALL" | "AWAITING" | "PAID" | "COMMISSION_DUE" | "COMMISSION_RECEIVED";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "AWAITING", label: "Paytrix owes you" },
  { key: "PAID", label: "Paytrix paid you" },
  { key: "COMMISSION_DUE", label: "You owe Paytrix" },
  { key: "COMMISSION_RECEIVED", label: "You paid Paytrix" },
];

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function hasCommission(row: VendorTransaction) {
  return row.commissionPercent != null;
}

function matches(row: VendorTransaction, filter: Filter) {
  if (filter === "AWAITING") return row.paymentStatus === "PENDING";
  if (filter === "PAID") return row.paymentStatus === "PAID";
  if (filter === "COMMISSION_DUE") return hasCommission(row) && row.commissionStatus === "PENDING";
  if (filter === "COMMISSION_RECEIVED") return row.commissionStatus === "RECEIVED";
  return true;
}

export default function VendorTransactionsPage() {
  const toast = useToast();
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [rows, setRows] = useState<VendorTransaction[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ClientAccount>("/api/v1/client/account")
      .then(async (next) => {
        setAccount(next);
        if (next.clientType !== "VENDOR") return;
        setRows(await apiFetch<VendorTransaction[]>("/api/v1/client/transactions"));
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load transactions"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        (row.billerName ?? "").toLowerCase().includes(query) ||
        (row.consumerNumber ?? "").toLowerCase().includes(query) ||
        (row.paymentReference ?? "").toLowerCase().includes(query) ||
        (row.commissionReference ?? "").toLowerCase().includes(query),
    );
  }, [rows, search]);

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      ALL: searched.length,
      AWAITING: searched.filter((row) => matches(row, "AWAITING")).length,
      PAID: searched.filter((row) => matches(row, "PAID")).length,
      COMMISSION_DUE: searched.filter((row) => matches(row, "COMMISSION_DUE")).length,
      COMMISSION_RECEIVED: searched.filter((row) => matches(row, "COMMISSION_RECEIVED")).length,
    }),
    [searched],
  );

  const visible = useMemo(() => searched.filter((row) => matches(row, filter)), [searched, filter]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  const awaiting = rows.filter((row) => row.paymentStatus === "PENDING");
  const paid = rows.filter((row) => row.paymentStatus === "PAID");
  const commissionDue = rows.filter((row) => hasCommission(row) && row.commissionStatus === "PENDING");
  const commissionReceived = rows.filter((row) => row.commissionStatus === "RECEIVED");
  const sum = (items: VendorTransaction[], pick: (row: VendorTransaction) => number) =>
    items.reduce((total, row) => total + pick(row), 0);

  if (account && account.clientType !== "VENDOR") {
    return <PageHeader title="Transactions" description="This page is for vendor accounts." />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Transactions"
        description="You pay the biller. Paytrix pays that bill amount back to you. You pay Paytrix the commission on the bill."
      />

      {loading ? (
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Paytrix owes you"
            value={inr(sum(awaiting, (row) => row.billAmount))}
            icon={ArrowLeftRight}
            tone="warning"
            trend={`${awaiting.length} bills to pay back`}
          />
          <StatCard
            label="Paytrix paid you"
            value={inr(sum(paid, (row) => row.billAmount))}
            icon={ArrowLeftRight}
            tone="success"
            trend={`${paid.length} bills paid back`}
          />
          <StatCard
            label="You owe Paytrix"
            value={inr(sum(commissionDue, (row) => row.commissionAmount))}
            icon={ArrowLeftRight}
            tone="warning"
            trend={`${commissionDue.length} commissions to pay`}
          />
          <StatCard
            label="You paid Paytrix"
            value={inr(sum(commissionReceived, (row) => row.commissionAmount))}
            icon={ArrowLeftRight}
            tone="success"
            trend={`${commissionReceived.length} commissions paid`}
          />
        </div>
      )}

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setFilter(item.key);
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

      <ListCard fitContent={false}>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="relative sm:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by biller, consumer no., or reference"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={rows.length === 0 ? "No settlements yet" : "No transactions match"}
            description={
              rows.length === 0
                ? "Bills appear here after Paytrix verifies a payment you marked paid."
                : "Try another status filter or clear the search."
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={[
                  "Biller",
                  "Consumer",
                  "Bill amount",
                  "Paytrix reimbursement",
                  "Commission to Paytrix",
                ]}
              />
              <TBody>
                {paged.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <p className="font-semibold text-slate-900">{row.billerName ?? "Bill"}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        Paid to biller {when(row.billPaidOn)}
                      </p>
                    </TD>
                    <TD>
                      {row.consumerNumber ? (
                        <button
                          type="button"
                          title="Copy consumer number"
                          onClick={() => copyText(`consumer:${row.id}`, row.consumerNumber!)}
                          className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                        >
                          <span>{row.consumerNumber}</span>
                          {copiedKey === `consumer:${row.id}` ? (
                            <Check size={11} className="text-emerald-600" />
                          ) : (
                            <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                          )}
                        </button>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="font-mono text-sm font-semibold text-slate-900">
                      {inr(row.billAmount)}
                    </TD>
                    <TD>
                      <StatusBadge
                        status={row.paymentStatus === "PAID" ? "PAID" : "AWAITING"}
                        label={row.paymentStatus === "PAID" ? "Paid back to you" : "Owes you this amount"}
                      />
                      {row.paymentStatus === "PAID" && (
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                          {when(row.paymentMadeOn)}
                          {row.paymentMode ? ` · ${row.paymentMode}` : ""}
                          {row.paymentReference ? ` · ${row.paymentReference}` : ""}
                        </p>
                      )}
                    </TD>
                    <TD>
                      <StatusBadge
                        status={!hasCommission(row) ? "NONE" : row.commissionStatus === "RECEIVED" ? "PAID" : "PENDING"}
                        label={
                          !hasCommission(row)
                            ? "No commission"
                            : row.commissionStatus === "RECEIVED"
                              ? "You paid Paytrix"
                              : "You owe Paytrix"
                        }
                      />
                      {hasCommission(row) && (
                        <p className="mt-1 font-mono text-xs font-semibold text-slate-700">
                          {inr(row.commissionAmount)} · {row.commissionPercent}%
                        </p>
                      )}
                      {row.commissionStatus === "RECEIVED" && (
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                          {row.commissionMode ?? "—"}
                          {row.commissionReference ? ` · ${row.commissionReference}` : ""}
                        </p>
                      )}
                    </TD>
                  </TR>
                ))}
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
