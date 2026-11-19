"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { ReportColumn } from "@/components/reports/ReportTable";
import type { CorporateBusinessRow } from "@/lib/types";

const columns: ReportColumn<CorporateBusinessRow>[] = [
  { key: "corp", label: "Corporate", render: (row) => row.corpName, exportValue: (row) => row.corpName },
  {
    key: "corpId",
    label: "Corporate ID",
    render: (row) => <span className="font-mono text-xs">{row.corpId}</span>,
    exportValue: (row) => row.corpId,
  },
  { key: "raised", label: "Bills raised", render: (row) => row.billsRaised, exportValue: (row) => row.billsRaised },
  {
    key: "raisedAmount",
    label: "Raised amount",
    render: (row) => formatInr(row.raisedAmount),
    exportValue: (row) => row.raisedAmount,
  },
  { key: "paid", label: "Bills paid", render: (row) => row.billsPaid, exportValue: (row) => row.billsPaid },
  {
    key: "paidAmount",
    label: "Paid amount",
    render: (row) => formatInr(row.paidAmount),
    exportValue: (row) => row.paidAmount,
  },
];

export default function CorporateBusinessReportPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<CorporateBusinessRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<CorporateBusinessRow[]>(
          `/api/v1/paytrix/reports/corporate-business?from=${range.applied.from}&to=${range.applied.to}`,
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

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          raised: sum.raised + row.billsRaised,
          raisedAmount: sum.raisedAmount + row.raisedAmount,
          paid: sum.paid + row.billsPaid,
          paidAmount: sum.paidAmount + row.paidAmount,
        }),
        { raised: 0, raisedAmount: 0, paid: 0, paidAmount: 0 },
      ),
    [rows],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/paytrix/reports"
        title="Corporate business"
        description={reportPeriodDescription(
          range,
          "Choose dates to see bills each company raised and bills paid to the biller.",
        )}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Corporate business"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`corporate-business-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Paytrix", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Building2}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No companies in these dates"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period."
            : "Raised bills use the date the company paid from its wallet. Paid bills use the date the biller was paid."
        }
        rowKey={(row) => row.corpId}
        summary={[
          { label: "Raised", value: String(totals.raised) },
          { label: "Raised amount", value: formatInr(totals.raisedAmount) },
          { label: "Paid", value: String(totals.paid) },
          { label: "Paid amount", value: formatInr(totals.paidAmount), tone: "success" },
        ]}
      />
    </div>
  );
}
