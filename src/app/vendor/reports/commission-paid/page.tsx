"use client";

import { useEffect, useMemo, useState } from "react";
import { Percent } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDateTime } from "@/lib/report-format";
import type { VendorCommissionPaidRow } from "@/lib/types";

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${value}%`;
}

const columns: ReportColumn<VendorCommissionPaidRow>[] = [
  {
    key: "billId",
    label: "Bill ID",
    render: (row) => <span className="font-mono text-xs">{row.billId}</span>,
    exportValue: (row) => row.billId,
  },
  { key: "category", label: "Category", render: (row) => row.category, exportValue: (row) => row.category },
  { key: "billAmount", label: "Bill amount", render: (row) => formatInr(row.billAmount), exportValue: (row) => row.billAmount },
  {
    key: "percent",
    label: "Commission",
    render: (row) => formatPercent(row.commissionPercent),
    exportValue: (row) => row.commissionPercent ?? "",
  },
  {
    key: "commission",
    label: "Commission amount",
    render: (row) => formatInr(row.commissionAmount),
    exportValue: (row) => row.commissionAmount,
  },
  { key: "paidOn", label: "Paid on", render: (row) => formatIstDateTime(row.paidOn), exportValue: (row) => row.paidOn ?? "" },
];

export default function VendorCommissionPaidPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<VendorCommissionPaidRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<VendorCommissionPaidRow[]>(
          `/api/v1/client/reports/commission-paid?from=${range.applied.from}&to=${range.applied.to}`,
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

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.commissionAmount, 0), [rows]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/vendor/reports"
        title="Commission paid"
        description={reportPeriodDescription(range, "Choose dates to see commission you paid to Paytrix.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Commission paid"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`commission-paid-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Vendor", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Percent}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No commission paid in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Commission is included once Paytrix marks it received."}
        rowKey={(row) => row.billId}
        summary={[
          { label: "Bills", value: String(range.generated ? rows.length : 0) },
          { label: "Commission paid", value: formatInr(range.generated ? total : 0), tone: "accent" },
        ]}
      />
    </div>
  );
}
