"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { OrganisationGmvRow } from "@/lib/types";

export default function PlatformGmvReportPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<OrganisationGmvRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<OrganisationGmvRow[]>(
          `/api/v1/platform/reports/gmv?from=${range.applied.from}&to=${range.applied.to}`,
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

  const totalAmount = useMemo(() => rows.reduce((sum, r) => sum + r.totalAmount, 0), [rows]);
  const totalBills = useMemo(() => rows.reduce((sum, r) => sum + r.billsPaid, 0), [rows]);

  const columns: ReportColumn<OrganisationGmvRow>[] = [
    {
      key: "organisation",
      label: "Organisation",
      render: (o) => (
        <>
          <p className="font-medium text-slate-900">{o.organisationName}</p>
          <p className="font-mono text-[11px] text-slate-400">{o.organisationCode}</p>
        </>
      ),
      exportValue: (o) => `${o.organisationName} (${o.organisationCode})`,
    },
    { key: "bills", label: "Bills settled", render: (o) => o.billsPaid, exportValue: (o) => o.billsPaid },
    { key: "amount", label: "Total amount", render: (o) => formatInr(o.totalAmount), exportValue: (o) => o.totalAmount },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/platform/reports"
        title="Platform GMV"
        description={reportPeriodDescription(range, "Choose dates to see bill value settled, by organisation.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Platform GMV"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`platform-gmv-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Platform", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        summary={
          range.generated
            ? [
                { label: "Bills settled", value: String(totalBills) },
                { label: "Total GMV", value: formatInr(totalAmount), tone: "success" },
              ]
            : undefined
        }
        emptyIcon={TrendingUp}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No settlements in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(o) => o.organisationId}
      />
    </div>
  );
}
