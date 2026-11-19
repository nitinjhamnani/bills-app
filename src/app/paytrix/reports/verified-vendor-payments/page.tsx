"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDateTime } from "@/lib/report-format";
import type { ReportColumn } from "@/components/reports/ReportTable";
import type { VerifiedVendorPaymentRow } from "@/lib/types";

const columns: ReportColumn<VerifiedVendorPaymentRow>[] = [
  { key: "corp", label: "Corporate", render: (row) => row.corpName, exportValue: (row) => row.corpName },
  {
    key: "corpId",
    label: "Corporate ID",
    render: (row) => <span className="font-mono text-xs">{row.corpId}</span>,
    exportValue: (row) => row.corpId,
  },
  { key: "paidBy", label: "Paid by", render: (row) => row.paidByName, exportValue: (row) => row.paidByName },
  {
    key: "paidById",
    label: "Paid by ID",
    render: (row) => <span className="font-mono text-xs">{row.paidById}</span>,
    exportValue: (row) => row.paidById,
  },
  {
    key: "billId",
    label: "Bill ID",
    render: (row) => <span className="font-mono text-xs">{row.billId}</span>,
    exportValue: (row) => row.billId,
  },
  {
    key: "amount",
    label: "Bill amount",
    render: (row) => formatInr(row.billAmount),
    exportValue: (row) => row.billAmount,
  },
  {
    key: "paidOn",
    label: "Paid on",
    render: (row) => formatIstDateTime(row.paidOn),
    exportValue: (row) => formatIstDateTime(row.paidOn),
  },
];

export default function VerifiedVendorPaymentsReportPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<VerifiedVendorPaymentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<VerifiedVendorPaymentRow[]>(
          `/api/v1/paytrix/reports/verified-vendor-payments?from=${range.applied.from}&to=${range.applied.to}`,
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

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.billAmount, 0), [rows]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/paytrix/reports"
        title="Bills Paid"
        description={reportPeriodDescription(
          range,
          "Choose dates to see bills a company raised that a vendor paid and Paytrix verified.",
        )}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Bills Paid"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`bills-paid-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Paytrix", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={BadgeCheck}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No verified vendor payments in these dates"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period."
            : "The period is the date the vendor paid. Paytrix must already have verified that payment."
        }
        rowKey={(row) => `${row.billId}-${row.paidOn}`}
        summary={[
          { label: "Bills", value: String(rows.length) },
          { label: "Total", value: formatInr(total), tone: "success" },
        ]}
      />
    </div>
  );
}
