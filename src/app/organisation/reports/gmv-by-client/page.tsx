"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { ClientGmvRow } from "@/lib/types";

export default function OrganisationGmvByClientReportPage() {
  const toast = useToast();
  const router = useRouter();
  const range = useReportRange();
  const [rows, setRows] = useState<ClientGmvRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<ClientGmvRow[]>(
          `/api/v1/organisation/reports/gmv-by-client?from=${range.applied.from}&to=${range.applied.to}`,
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

  const clientPaid = useMemo(() => rows.reduce((sum, row) => sum + row.clientPaidAmount, 0), [rows]);
  const orgSettled = useMemo(() => rows.reduce((sum, row) => sum + row.orgSettledAmount, 0), [rows]);

  const columns: ReportColumn<ClientGmvRow>[] = [
    {
      key: "client",
      label: "Client",
      render: (r) => (
        <>
          <p className="font-medium text-slate-900">{r.clientName}</p>
          {r.clientCode && <p className="font-mono text-[11px] text-slate-400">{r.clientCode}</p>}
        </>
      ),
      exportValue: (r) => (r.clientCode ? `${r.clientName} (${r.clientCode})` : r.clientName),
    },
    { key: "paidCount", label: "Client-paid bills", render: (r) => r.clientPaidCount, exportValue: (r) => r.clientPaidCount },
    { key: "paidAmt", label: "Client-paid amount", render: (r) => formatInr(r.clientPaidAmount), exportValue: (r) => r.clientPaidAmount },
    { key: "settledCount", label: "Org-settled bills", render: (r) => r.orgSettledCount, exportValue: (r) => r.orgSettledCount },
    { key: "settledAmt", label: "Org-settled amount", render: (r) => formatInr(r.orgSettledAmount), exportValue: (r) => r.orgSettledAmount },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/organisation/reports"
        title="GMV by Client"
        description={reportPeriodDescription(range, "Choose dates to see wallet-paid and organisation-settled volume.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="GMV by Client"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`gmv-by-client-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={TrendingUp}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No GMV in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(r) => r.clientId}
        onRowClick={(r) => router.push(`/organisation/clients/${r.clientId}`)}
        summary={
          range.generated
            ? [
                { label: "Client-paid GMV", value: formatInr(clientPaid), tone: "accent" },
                { label: "Org-settled GMV", value: formatInr(orgSettled), tone: "success" },
              ]
            : undefined
        }
      />
    </div>
  );
}
