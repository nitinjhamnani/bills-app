"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Receipt, SlidersHorizontal } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CardHeader, ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { LedgerEntryDto } from "@/lib/types";

type EntryTypeFilter = "ALL" | "DEBIT" | "CREDIT";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const CATEGORIES = ["TOPUP", "BILL_PAYMENT", "REFUND", "FEE", "ADJUSTMENT"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  TOPUP: "Top-up",
  BILL_PAYMENT: "Bill payment",
  REFUND: "Refund",
  FEE: "Fee",
  ADJUSTMENT: "Adjustment",
};

const SORT_LABELS: Record<SortKey, string> = {
  date_desc: "Date (newest first)",
  date_asc: "Date (oldest first)",
  amount_desc: "Amount (high to low)",
  amount_asc: "Amount (low to high)",
};

const EXPORT_COLUMNS = ["When", "Type", "Category", "Amount", "Balance after", "Description"];

export function TransactionsTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [entries, setEntries] = useState<LedgerEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryTypeFilter>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      try {
        const data = await apiFetch<LedgerEntryDto[]>(
          `/api/v1/clients/${clientId}/wallet/ledger`,
        );
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Failed to load transactions",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const visible = useMemo(() => {
    let result = entries;
    if (entryType !== "ALL")
      result = result.filter((e) => e.entryType === entryType);
    if (category !== "ALL")
      result = result.filter((e) => e.referenceType === category);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((e) => new Date(e.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`).getTime();
      result = result.filter((e) => new Date(e.createdAt).getTime() <= to);
    }
    if (amountMin) {
      const min = Number(amountMin);
      result = result.filter((e) => e.amount >= min);
    }
    if (amountMax) {
      const max = Number(amountMax);
      result = result.filter((e) => e.amount <= max);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e) =>
        (e.description ?? "").toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        case "date_desc":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
  }, [entries, entryType, category, dateFrom, dateTo, amountMin, amountMax, search, sort]);

  const activeFilterCount = [
    entryType !== "ALL",
    category !== "ALL",
    Boolean(dateFrom),
    Boolean(dateTo),
    Boolean(amountMin),
    Boolean(amountMax),
    Boolean(search.trim()),
    sort !== "date_desc",
  ].filter(Boolean).length;

  function resetFilters() {
    setEntryType("ALL");
    setCategory("ALL");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSearch("");
  }

  function exportRows() {
    return visible.map((e) => [
      new Date(e.createdAt).toLocaleString(),
      e.entryType,
      CATEGORY_LABELS[e.referenceType] ?? e.referenceType,
      e.amount,
      e.balanceAfter,
      e.description ?? "",
    ]);
  }

  function exportCsv() {
    if (visible.length === 0) {
      toast.error("Nothing to export with the current filters");
      return;
    }
    const escapeCell = (value: unknown) => {
      const str = String(value ?? "");
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csv = [EXPORT_COLUMNS, ...exportRows()]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${clientId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${visible.length} transactions as CSV`);
  }

  async function exportPdf() {
    if (visible.length === 0) {
      toast.error("Nothing to export with the current filters");
      return;
    }
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Client transactions", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [EXPORT_COLUMNS],
        body: exportRows().map((row) => [
          row[0],
          row[1],
          row[2],
          `Rs. ${Number(row[3]).toLocaleString("en-IN")}`,
          `Rs. ${Number(row[4]).toLocaleString("en-IN")}`,
          row[5],
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
      doc.save(`transactions-${clientId}.pdf`);
      toast.success(`Exported ${visible.length} transactions as PDF`);
    } catch {
      toast.error("Could not generate the PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ListCard>
        <CardHeader
          title="All transactions"
          description={
            loading
              ? "Loading..."
              : `${visible.length} of ${entries.length} transactions`
          }
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<SlidersHorizontal size={14} />}
                onClick={() => setFilterModalOpen(true)}
              >
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={14} />}
                onClick={exportCsv}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<FileText size={14} />}
                loading={exportingPdf}
                onClick={exportPdf}
              >
                Export PDF
              </Button>
            </div>
          }
        />
        {loading ? (
          <TableSkeleton cols={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No matching transactions"
            description="Try widening or resetting the filters above."
          />
        ) : (
          <Table>
            <THead
              columns={[
                "When",
                "Type",
                "Category",
                "Amount",
                "Balance after",
                "Description",
              ]}
            />
            <TBody>
              {visible.map((e, i) => (
                <TR key={i}>
                  <TD className="text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </TD>
                  <TD
                    className={cn(
                      "font-medium",
                      e.entryType === "CREDIT"
                        ? "text-emerald-600"
                        : "text-red-600",
                    )}
                  >
                    {e.entryType}
                  </TD>
                  <TD>
                    <StatusBadge status={e.referenceType} />
                  </TD>
                  <TD>₹{e.amount.toLocaleString("en-IN")}</TD>
                  <TD>₹{e.balanceAfter.toLocaleString("en-IN")}</TD>
                  <TD className="text-slate-500">{e.description ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filter transactions"
        description="Applies immediately - close this once you're happy with the results."
        footer={
          <>
            <Button variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
            <Button onClick={() => setFilterModalOpen(false)}>Done</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as EntryTypeFilter)}
          >
            <option value="ALL">All</option>
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </SelectField>
          <SelectField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </SelectField>
          <Field
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Field
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Field
            label="Min amount"
            type="number"
            min={0}
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
          />
          <Field
            label="Max amount"
            type="number"
            min={0}
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
          />
          <Field
            label="Search description"
            className="sm:col-span-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. bill, top-up..."
          />
          <SelectField
            label="Sort by"
            className="sm:col-span-2"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </SelectField>
        </div>
      </Modal>
    </div>
  );
}
