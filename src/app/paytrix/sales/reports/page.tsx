"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { formatInr, formatIstDateTime } from "@/lib/report-format";
import type { SalesDashboard, SalesPaidBill, SalesPaidReport } from "@/lib/types";

interface CorporateOption {
  id: string;
  name: string;
  code: string | null;
}

function corporateSummary(corporates: CorporateOption[], selected: string[]) {
  if (corporates.length === 0) return "No corporates";
  if (selected.length === 0) return "No corporates selected";
  if (selected.length === corporates.length) return "All corporates";
  if (selected.length === 1) return corporates.find((corporate) => corporate.id === selected[0])?.name ?? "1 corporate";
  return `${selected.length} corporates`;
}

function CorporateSelect({
  corporates,
  selected,
  onChange,
}: {
  corporates: CorporateOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const listId = useId();
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const all = corporates.length > 0 && selected.length === corporates.length;
  const some = selected.length > 0 && !all;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = some;
  }, [some, open]);

  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-sm font-medium text-slate-700">Corporates</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={corporates.length === 0}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <span className="truncate">{corporates.length === 0 ? "No corporates are assigned to you" : corporateSummary(corporates, selected)}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && corporates.length > 0 && (
        <div
          id={listId}
          role="listbox"
          aria-label="Corporates"
          aria-multiselectable="true"
          className="mt-1 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-1"
        >
          <label className="flex min-h-11 cursor-pointer items-center gap-2 border-b border-slate-100 px-2 text-sm font-semibold text-slate-900">
            <input
              ref={selectAllRef}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40"
              checked={all}
              onChange={() => onChange(all ? [] : corporates.map((corporate) => corporate.id))}
            />
            Select all
          </label>
          {corporates.map((corporate) => {
            const checked = selected.includes(corporate.id);
            return (
              <label
                key={corporate.id}
                role="option"
                aria-selected={checked}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selected.filter((id) => id !== corporate.id) : [...selected, corporate.id])
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate">{corporate.name}</span>
                  {corporate.code && <span className="block font-mono text-[11px] text-slate-400">{corporate.code}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

const COLUMNS: ReportColumn<SalesPaidBill>[] = [
  {
    key: "corporate",
    label: "Corporate",
    render: (bill) => (
      <>
        <p className="font-medium text-slate-900">{bill.clientName}</p>
        {bill.clientCode && <p className="font-mono text-[11px] text-slate-400">{bill.clientCode}</p>}
      </>
    ),
    exportValue: (bill) => (bill.clientCode ? `${bill.clientName} (${bill.clientCode})` : bill.clientName),
  },
  {
    key: "vendor",
    label: "Vendor",
    render: (bill) =>
      bill.vendorName ? (
        <>
          <p className="font-medium text-slate-900">{bill.vendorName}</p>
          {bill.vendorCode && <p className="font-mono text-[11px] text-slate-400">{bill.vendorCode}</p>}
        </>
      ) : (
        "No vendor"
      ),
    exportValue: (bill) => bill.vendorName ?? "No vendor",
  },
  { key: "biller", label: "Biller", render: (bill) => bill.billerName, exportValue: (bill) => bill.billerName },
  {
    key: "consumer",
    label: "Consumer number",
    render: (bill) => <span className="font-mono text-xs">{bill.consumerNumber || "—"}</span>,
    exportValue: (bill) => bill.consumerNumber || "",
  },
  {
    key: "amount",
    label: "Amount",
    sortType: "number",
    render: (bill) => formatInr(bill.amount),
    exportValue: (bill) => bill.amount,
  },
  {
    key: "paidOn",
    label: "Paid on",
    sortType: "date",
    render: (bill) => formatIstDateTime(bill.paidAt),
    exportValue: (bill) => formatIstDateTime(bill.paidAt),
  },
  { key: "stage", label: "Stage", render: (bill) => bill.stage, exportValue: (bill) => bill.stage },
];

export default function SalesReportsPage() {
  const toast = useToast();
  const range = useReportRange();
  const [corporates, setCorporates] = useState<CorporateOption[]>([]);
  const [draftCorporates, setDraftCorporates] = useState<string[]>([]);
  const [appliedCorporates, setAppliedCorporates] = useState<string[]>([]);
  const [corporatesReady, setCorporatesReady] = useState(false);
  const [report, setReport] = useState<SalesPaidReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<SalesDashboard>("/api/v1/paytrix/sales/dashboard")
      .then((data) => {
        const rows = data.corporates.map((corporate) => ({
          id: corporate.clientId,
          name: corporate.clientName,
          code: corporate.clientCode,
        }));
        const ids = rows.map((corporate) => corporate.id);
        setCorporates(rows);
        setDraftCorporates((current) => (current.length === 0 ? ids : current));
        setAppliedCorporates((current) => (current.length === 0 ? ids : current));
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load corporates"))
      .finally(() => setCorporatesReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!range.generated || !corporatesReady) return;
    if (corporates.length > 0 && appliedCorporates.length === 0) {
      setReport({ totalAmount: 0, billCount: 0, bills: [] });
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({ from: range.applied.from, to: range.applied.to });
    if (corporates.length > 0 && appliedCorporates.length !== corporates.length) {
      appliedCorporates.forEach((id) => params.append("clientId", id));
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<SalesPaidReport>(`/api/v1/paytrix/sales/paid-bills?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load the report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.generated, range.applied.from, range.applied.to, corporatesReady, appliedCorporates.join("|")]);

  const waiting = !range.generated;
  const rows = waiting ? [] : (report?.bills ?? []);
  const description = waiting
    ? "Generate a report to choose dates and corporates."
    : `${reportPeriodDescription(range, "")} ${corporateSummary(corporates, appliedCorporates)}.`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader
        title="Reports"
        description={description}
        actions={
          <DateRangeFilter
            range={range}
            running={loading}
            openLabel="Generate report"
            changeLabel="Generate report"
            modalTitle="Generate report"
            modalDescription="Choose the dates and the corporates assigned to you, then generate the report."
            confirmLabel="Generate"
            onGenerate={() => setAppliedCorporates(draftCorporates)}
            onCancel={() => setDraftCorporates(appliedCorporates)}
            extras={
              <CorporateSelect corporates={corporates} selected={draftCorporates} onChange={setDraftCorporates} />
            }
          />
        }
      />
      <ReportTable
        title="Bills paid"
        description="Bills your corporates have already paid."
        loading={loading}
        rows={rows}
        columns={COLUMNS}
        exportFilename={`sales-paid-bills-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{
          generatedFor: getUser()?.displayName ?? "Sales",
          dateRange: `${range.applied.from} to ${range.applied.to}`,
          extraRows: [["Corporates", corporateSummary(corporates, appliedCorporates)]],
        }}
        emptyIcon={FileText}
        emptyTitle={waiting ? "Nothing to show yet" : "No bills for this selection"}
        emptyDescription={
          waiting
            ? "Use Generate report to pick a date range and corporates."
            : appliedCorporates.length === 0
              ? "Choose at least one corporate."
              : "Try a wider date range or another corporate."
        }
        rowKey={(bill) => bill.id}
        summary={
          waiting
            ? undefined
            : [
                { label: "Bills", value: String(report?.billCount ?? 0) },
                { label: "Total paid", value: formatInr(report?.totalAmount ?? 0), tone: "success" },
              ]
        }
      />
    </div>
  );
}
