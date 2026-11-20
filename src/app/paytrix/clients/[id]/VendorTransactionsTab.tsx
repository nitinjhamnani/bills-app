"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

export type VendorTransactionRecord = {
  id: string;
  vendorId: string;
  type: "CREDIT" | "DEBIT";
  category: "BILL_PAID" | "COMMISSION" | string;
  amount: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

type TypeFilter = "ALL" | "CREDIT" | "DEBIT";

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CREDIT", label: "Credits" },
  { key: "DEBIT", label: "Debits" },
];

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function categoryLabel(category: string) {
  if (category === "BILL_PAID") return "Bill paid";
  if (category === "COMMISSION") return "Commission";
  return category;
}

export function VendorTransactionsTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<VendorTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<VendorTransactionRecord[]>(`/api/v1/paytrix/clients/${clientId}/transactions`)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load transactions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        categoryLabel(row.category).toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query) ||
        (row.createdByName ?? "").toLowerCase().includes(query) ||
        (row.createdBy ?? "").toLowerCase().includes(query) ||
        String(row.amount).includes(query),
    );
  }, [rows, search]);

  const counts = useMemo<Record<TypeFilter, number>>(
    () => ({
      ALL: searched.length,
      CREDIT: searched.filter((row) => row.type === "CREDIT").length,
      DEBIT: searched.filter((row) => row.type === "DEBIT").length,
    }),
    [searched],
  );

  const visible = useMemo(
    () => (typeFilter === "ALL" ? searched : searched.filter((row) => row.type === typeFilter)),
    [searched, typeFilter],
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TYPE_FILTERS.map((item) => {
          const active = typeFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTypeFilter(item.key);
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
              placeholder="Search by category, amount, or recorded by"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={rows.length === 0 ? "No vendor transactions yet" : "No transactions match"}
            description={
              rows.length === 0
                ? "Transactions recorded for this vendor appear here."
                : "Try another filter or clear the search."
            }
          />
        ) : (
          <>
            <Table>
              <THead columns={["Date & Time", "Type", "Category", "Amount", "Recorded by"]} />
              <TBody>
                {paged.map((row) => (
                  <TR key={row.id}>
                    <TD className="text-xs text-slate-500">{when(row.createdAt)}</TD>
                    <TD>
                      <StatusBadge
                        status={row.type === "CREDIT" ? "COMPLETED" : "PENDING"}
                        label={row.type}
                      />
                    </TD>
                    <TD className="font-medium text-slate-900">{categoryLabel(row.category)}</TD>
                    <TD className="font-mono font-semibold text-slate-900">{inr(row.amount)}</TD>
                    <TD className="text-slate-600">
                      {row.createdByName
                        ? `${row.createdByName}${row.createdBy ? ` (${row.createdBy})` : ""}`
                        : row.createdBy ?? "—"}
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
