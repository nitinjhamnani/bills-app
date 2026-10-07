"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { SpendByServiceRow } from "@/lib/types";

export default function ClientSpendByServiceReportPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const range = useReportRange();
  const [rows, setRows] = useState<SpendByServiceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<SpendByServiceRow[]>(
          `/api/v1/clients/${clientId}/reports/spend-by-service?from=${range.applied.from}&to=${range.applied.to}`,
        );
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (clientId && range.generated) load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, range.generated, range.applied.from, range.applied.to]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  const count = useMemo(() => rows.reduce((sum, row) => sum + row.count, 0), [rows]);

  const columns: ReportColumn<SpendByServiceRow>[] = [
    { key: "service", label: "Service", render: (r) => r.billServiceName, exportValue: (r) => r.billServiceName },
    { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs">{r.billServiceCode}</span>, exportValue: (r) => r.billServiceCode },
    { key: "count", label: "Bills paid", render: (r) => r.count, exportValue: (r) => r.count },
    { key: "amount", label: "Amount paid", render: (r) => formatInr(r.amount), exportValue: (r) => r.amount },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/client/reports"
        title="Spend by Service"
        description={reportPeriodDescription(range, "Choose dates to see where wallet payments went.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Spend by Service"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`spend-by-service-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Client", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={PieChart}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No paid bills in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(r) => r.billServiceCode}
        summary={[
          { label: "Services", value: String(rows.length) },
          { label: "Bills paid", value: String(count) },
          { label: "Total paid", value: formatInr(total), tone: "accent" },
        ]}
      />
    </div>
  );
}
