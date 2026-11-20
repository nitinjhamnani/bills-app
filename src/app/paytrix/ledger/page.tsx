"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Search, SlidersHorizontal } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, THead, TR, TablePagination } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type OrganisationTransaction = {
  id: string;
  entryType: "CREDIT" | "DEBIT";
  amount: number;
  category: string;
  description: string;
  counterpartyId: string | null;
  counterpartyName: string | null;
  counterpartyType: "CORP" | "VENDOR" | null;
  createdAt: string;
};

type Direction = "ALL" | "CREDIT" | "DEBIT";
type PartyKind = "ALL" | "CORP" | "VENDOR";

const DIRECTION_TABS: { key: Direction; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CREDIT", label: "Money in" },
  { key: "DEBIT", label: "Money out" },
];

const CATEGORY_LABELS: Record<string, string> = {
  RECHARGE: "Recharge",
  BILL_PAID: "Vendor payment",
  BILLER_PAID: "Biller payment",
  COMMISSION: "Commission",
};

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ");
}

function partyKind(type: OrganisationTransaction["counterpartyType"]) {
  if (type === "CORP") return "Corporate";
  if (type === "VENDOR") return "Vendor";
  return "";
}

export default function OrganisationLedgerPage() {
  const toast = useToast();
  const currentRole = getUser()?.role;
  const isAdmin = currentRole === "SUPER_ADMIN" || currentRole === "ORGANISATION_ADMIN";
  const [rows, setRows] = useState<OrganisationTransaction[]>([]);
  const [loading, setLoading] = useState(isAdmin);
  const [filterOpen, setFilterOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("ALL");
  const [partyKindFilter, setPartyKindFilter] = useState<PartyKind>("ALL");
  const [partyId, setPartyId] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    apiFetch<OrganisationTransaction[]>("/api/v1/paytrix/transactions")
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load ledger");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, toast]);

  const parties = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; type: OrganisationTransaction["counterpartyType"] }>();
    for (const row of rows) {
      if (!row.counterpartyId || seen.has(row.counterpartyId)) continue;
      seen.set(row.counterpartyId, {
        id: row.counterpartyId,
        name: row.counterpartyName ?? row.counterpartyId,
        type: row.counterpartyType,
      });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const categories = useMemo(() => {
    return [...new Set(rows.map((row) => row.category))].sort();
  }, [rows]);

  const narrowed = useMemo(() => {
    let result = rows;
    if (partyKindFilter !== "ALL") result = result.filter((row) => row.counterpartyType === partyKindFilter);
    if (partyId !== "ALL") result = result.filter((row) => row.counterpartyId === partyId);
    if (category !== "ALL") result = result.filter((row) => row.category === category);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((row) => new Date(row.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`).getTime();
      result = result.filter((row) => new Date(row.createdAt).getTime() <= to);
    }
    if (amountMin) {
      const min = Number(amountMin);
      result = result.filter((row) => row.amount >= min);
    }
    if (amountMax) {
      const max = Number(amountMax);
      result = result.filter((row) => row.amount <= max);
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      result = result.filter((row) =>
        [row.description, row.counterpartyName, categoryLabel(row.category)]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      );
    }
    return result;
  }, [rows, partyKindFilter, partyId, category, dateFrom, dateTo, amountMin, amountMax, search]);

  const counts = useMemo<Record<Direction, number>>(
    () => ({
      ALL: narrowed.length,
      CREDIT: narrowed.filter((row) => row.entryType === "CREDIT").length,
      DEBIT: narrowed.filter((row) => row.entryType === "DEBIT").length,
    }),
    [narrowed],
  );

  const visible = useMemo(
    () => (direction === "ALL" ? narrowed : narrowed.filter((row) => row.entryType === direction)),
    [narrowed, direction],
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  const activeFilterCount = [
    partyKindFilter !== "ALL",
    partyId !== "ALL",
    category !== "ALL",
    Boolean(dateFrom),
    Boolean(dateTo),
    Boolean(amountMin),
    Boolean(amountMax),
  ].filter(Boolean).length;

  function resetFilters() {
    setDirection("ALL");
    setPartyKindFilter("ALL");
    setPartyId("ALL");
    setCategory("ALL");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSearch("");
    setCurrentPage(1);
  }

  if (!isAdmin) {
    return (
      <PageHeader
        title="Ledger"
        description="Only a Paytrix admin can see the organisation ledger."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Ledger"
        description="Wallet recharges, bill payments, vendor payouts, and commissions across Paytrix."
        actions={
          <Button variant="outline" size="sm" icon={<SlidersHorizontal size={14} />} onClick={() => setFilterOpen(true)}>
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        }
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {DIRECTION_TABS.map((item) => {
          const active = direction === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setDirection(item.key);
                setCurrentPage(1);
              }}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors",
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
              placeholder="Search by description, corporate, vendor, or category"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={rows.length === 0 ? "No ledger entries yet" : "No matching ledger entries"}
            description={
              rows.length === 0
                ? "Wallet recharges, bill payments, vendor payouts, and commissions appear here."
                : "Widen or reset the filters."
            }
          />
        ) : (
          <>
            <Table>
              <THead columns={["When", "Direction", "What", "With", "Amount"]} />
              <TBody>
                {paged.map((row) => (
                  <TR key={row.id}>
                    <TD className="text-xs text-slate-500">{when(row.createdAt)}</TD>
                    <TD className={cn("font-semibold", row.entryType === "CREDIT" ? "text-emerald-700" : "text-rose-700")}>
                      {row.entryType === "CREDIT" ? "Money in" : "Money out"}
                    </TD>
                    <TD>
                      <p className="font-semibold text-slate-900">{row.description}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">{categoryLabel(row.category)}</p>
                    </TD>
                    <TD>
                      <p className="font-medium text-slate-900">{row.counterpartyName ?? "—"}</p>
                      {partyKind(row.counterpartyType) && (
                        <p className="mt-0.5 text-[11px] font-medium text-slate-400">{partyKind(row.counterpartyType)}</p>
                      )}
                    </TD>
                    <TD className="font-mono font-semibold text-slate-900">{inr(row.amount)}</TD>
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

      <Modal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter ledger"
        description="Applies immediately. Close this once the list looks right."
        footer={
          <>
            <Button variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Done</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Direction"
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as Direction);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            <option value="CREDIT">Money in</option>
            <option value="DEBIT">Money out</option>
          </SelectField>
          <SelectField
            label="Category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {categoryLabel(item)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Party type"
            value={partyKindFilter}
            onChange={(e) => {
              setPartyKindFilter(e.target.value as PartyKind);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            <option value="CORP">Corporates</option>
            <option value="VENDOR">Vendors</option>
          </SelectField>
          <SelectField
            label="With"
            value={partyId}
            onChange={(e) => {
              setPartyId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Everyone</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </SelectField>
          <Field
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Field
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Field
            label="Min amount"
            type="number"
            min={0}
            value={amountMin}
            onChange={(e) => {
              setAmountMin(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Field
            label="Max amount"
            type="number"
            min={0}
            value={amountMax}
            onChange={(e) => {
              setAmountMax(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
