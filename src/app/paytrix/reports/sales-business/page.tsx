"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { ReportColumn } from "@/components/reports/ReportTable";
import type { SalesBusinessRow } from "@/lib/types";

const columns: ReportColumn<SalesBusinessRow>[] = [
  {
    key: "sales",
    label: "Sales person",
    render: (row) => row.salesPersonName,
    exportValue: (row) => row.salesPersonName,
  },
  {
    key: "salesId",
    label: "Sales ID",
    render: (row) => <span className="font-mono text-xs">{row.salesUserId}</span>,
    exportValue: (row) => row.salesUserId,
  },
  {
    key: "corp",
    label: "Corporate",
    render: (row) => row.corpName ?? "—",
    exportValue: (row) => row.corpName ?? "",
  },
  {
    key: "corpId",
    label: "Corporate ID",
    render: (row) => <span className="font-mono text-xs">{row.corpId ?? "—"}</span>,
    exportValue: (row) => row.corpId ?? "",
  },
  { key: "paid", label: "Bills paid", render: (row) => row.billsPaid, exportValue: (row) => row.billsPaid },
  {
    key: "paidAmount",
    label: "Paid amount",
    render: (row) => formatInr(row.paidAmount),
    exportValue: (row) => row.paidAmount,
  },
  {
    key: "salesTotal",
    label: "Sales total",
    render: (row) => formatInr(row.salesPaidAmount),
    exportValue: (row) => row.salesPaidAmount,
  },
];

export default function SalesBusinessReportPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<SalesBusinessRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<SalesBusinessRow[]>(
          `/api/v1/paytrix/reports/sales-business?from=${range.applied.from}&to=${range.applied.to}`,
        );
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (range.generated) load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.generated, range.applied.from, range.applied.to]);

  const totals = useMemo(() => {
    const seen = new Set<string>();
    return rows.reduce(
      (sum, row) => {
        const bills = sum.bills + (row.corpId ? row.billsPaid : 0);
        const amount = sum.amount + (row.corpId ? row.paidAmount : 0);
        seen.add(row.salesUserId);
        return { bills, amount, people: seen.size };
      },
      { bills: 0, amount: 0, people: 0 },
    );
  }, [rows]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/paytrix/reports"
        title="Sales business"
        description={reportPeriodDescription(
          range,
          "Choose dates to see bills paid by the companies assigned to each sales person.",
        )}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Sales business"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`sales-business-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Paytrix", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Users}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No sales people yet"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period."
            : "Paid bills are those settled with the biller in the period. Sales total is that person's companies added together."
        }
        rowKey={(row) => `${row.salesUserId}-${row.corpId ?? "none"}`}
        summary={[
          { label: "Sales people", value: String(totals.people) },
          { label: "Bills paid", value: String(totals.bills) },
          { label: "Paid amount", value: formatInr(totals.amount), tone: "success" },
        ]}
      />
    </div>
  );
}
