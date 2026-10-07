"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpCircle } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDateTime } from "@/lib/report-format";
import type { FundingRow } from "@/lib/types";

export default function ClientTopUpReportPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const range = useReportRange();
  const [rows, setRows] = useState<FundingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<FundingRow[]>(
          `/api/v1/clients/${clientId}/reports/top-ups?from=${range.applied.from}&to=${range.applied.to}`,
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

  const total = useMemo(
    () => rows.filter((r) => r.status === "COMPLETED").reduce((sum, row) => sum + row.amount, 0),
    [rows],
  );

  const columns: ReportColumn<FundingRow>[] = [
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount), exportValue: (r) => r.amount },
    { key: "mode", label: "Mode", render: (r) => r.paymentMode, exportValue: (r) => r.paymentMode },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, exportValue: (r) => r.status },
    { key: "ref", label: "Reference", render: (r) => r.paymentReference ?? "—", exportValue: (r) => r.paymentReference ?? "" },
    { key: "requested", label: "Requested", render: (r) => formatIstDateTime(r.createdAt), exportValue: (r) => formatIstDateTime(r.createdAt) },
    { key: "reviewedBy", label: "Reviewed by", render: (r) => r.reviewedBy ?? "—", exportValue: (r) => r.reviewedBy ?? "" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/client/reports"
        title="Top-up Requests"
        description={reportPeriodDescription(range, "Choose dates to see funding requests you submitted.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Top-up Requests"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`top-ups-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Client", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={ArrowUpCircle}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No top-up requests in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(r) => r.id}
        summary={[
          { label: "Requests", value: String(rows.length) },
          { label: "Completed amount", value: formatInr(total), tone: "success" },
        ]}
      />
    </div>
  );
}
