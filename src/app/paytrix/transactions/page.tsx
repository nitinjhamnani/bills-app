"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, THead, TR } from "@/components/ui/Table";
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

const CATEGORY_LABELS: Record<string, string> = {
  RECHARGE: "Recharge",
  BILL_PAID: "Vendor payment",
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

export default function OrganisationTransactionsPage() {
  const toast = useToast();
  const isAdmin = getUser()?.role === "ORGANISATION_ADMIN";
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

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    apiFetch<OrganisationTransaction[]>("/api/v1/paytrix/transactions")
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
  }, [isAdmin]);

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

  const visible = useMemo(() => {
    let result = rows;
    if (direction !== "ALL") result = result.filter((row) => row.entryType === direction);
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
  }, [rows, direction, partyKindFilter, partyId, category, dateFrom, dateTo, amountMin, amountMax, search]);

  const activeFilterCount = [
    direction !== "ALL",
    partyKindFilter !== "ALL",
    partyId !== "ALL",
    category !== "ALL",
    Boolean(dateFrom),
    Boolean(dateTo),
    Boolean(amountMin),
    Boolean(amountMax),
    Boolean(search.trim()),
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
  }

  if (!isAdmin) {
    return (
      <PageHeader
        title="Transactions"
        description="Only a Paytrix admin can see organisation transactions."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Transactions"
        description={
          loading ? "Loading..." : `${visible.length} of ${rows.length} organisation transactions`
        }
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
      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={rows.length === 0 ? "No transactions yet" : "No matching transactions"}
            description={
              rows.length === 0
                ? "Wallet recharges, bill payments, vendor payouts, and commissions appear here."
                : "Widen or reset the filters."
            }
          />
        ) : (
          <Table>
            <THead columns={["When", "Direction", "What", "With", "Amount"]} />
            <TBody>
              {visible.map((row) => (
                <TR key={row.id}>
                  <TD className="text-slate-500">{when(row.createdAt)}</TD>
                  <TD className={cn("font-semibold", row.entryType === "CREDIT" ? "text-emerald-700" : "text-rose-700")}>
                    {row.entryType === "CREDIT" ? "Money in" : "Money out"}
                  </TD>
                  <TD>
                    <p className="font-medium text-slate-900">{row.description}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">{categoryLabel(row.category)}</p>
                  </TD>
                  <TD>
                    <p className="font-medium text-slate-900">{row.counterpartyName ?? "—"}</p>
                    {partyKind(row.counterpartyType) && (
                      <p className="mt-1 text-[11px] font-medium text-slate-400">{partyKind(row.counterpartyType)}</p>
                    )}
                  </TD>
                  <TD className="font-mono font-semibold text-slate-900">{inr(row.amount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter transactions"
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
          <SelectField label="Direction" value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            <option value="ALL">All</option>
            <option value="CREDIT">Money in</option>
            <option value="DEBIT">Money out</option>
          </SelectField>
          <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
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
            onChange={(e) => setPartyKindFilter(e.target.value as PartyKind)}
          >
            <option value="ALL">All</option>
            <option value="CORP">Corporates</option>
            <option value="VENDOR">Vendors</option>
          </SelectField>
          <SelectField label="With" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="ALL">Everyone</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </SelectField>
          <Field label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Field label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Field label="Min amount" type="number" min={0} value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
          <Field label="Max amount" type="number" min={0} value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
          <Field
            label="Search"
            className="sm:col-span-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, category, or description"
          />
        </div>
      </Modal>
    </div>
  );
}
