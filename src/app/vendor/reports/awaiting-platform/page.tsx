"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDateTime } from "@/lib/report-format";
import type { VendorAwaitingRow } from "@/lib/types";

const columns: ReportColumn<VendorAwaitingRow>[] = [
  {
    key: "billId",
    label: "Bill ID",
    render: (row) => <span className="font-mono text-xs">{row.billId}</span>,
    exportValue: (row) => row.billId,
  },
  { key: "category", label: "Category", render: (row) => row.category, exportValue: (row) => row.category },
  { key: "amount", label: "Amount", render: (row) => formatInr(row.amount), exportValue: (row) => row.amount },
  { key: "paidOn", label: "Paid on", render: (row) => formatIstDateTime(row.paidOn), exportValue: (row) => row.paidOn ?? "" },
];

export default function VendorAwaitingPlatformPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<VendorAwaitingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<VendorAwaitingRow[]>(
          `/api/v1/client/reports/awaiting-platform?from=${range.applied.from}&to=${range.applied.to}`,
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

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/vendor/reports"
        title="Awaiting Paytrix"
        description={reportPeriodDescription(range, "Choose dates to see bills you paid that Paytrix has not paid back.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Awaiting Paytrix"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`awaiting-paytrix-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Vendor", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Clock}
        emptyTitle={!range.generated ? "Nothing to show yet" : "Nothing waiting on Paytrix in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Paytrix has paid you back for the bills you paid in this period."}
        rowKey={(row) => row.billId}
        summary={[
          { label: "Bills", value: String(range.generated ? rows.length : 0) },
          { label: "Awaiting", value: formatInr(range.generated ? total : 0), tone: "accent" },
        ]}
      />
    </div>
  );
}
