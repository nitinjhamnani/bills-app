"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { Client, RevenueByClientRow } from "@/lib/types";

export default function OrganisationRevenueReportPage() {
  const toast = useToast();
  const router = useRouter();
  const range = useReportRange();
  const [clientId, setClientId] = useState("ALL");
  const [appliedClientId, setAppliedClientId] = useState("ALL");
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<RevenueByClientRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<Client[]>("/api/v1/organisation/clients").then(setClients).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ from: range.applied.from, to: range.applied.to });
        if (appliedClientId !== "ALL") params.set("clientId", appliedClientId);
        const data = await apiFetch<RevenueByClientRow[]>(`/api/v1/organisation/reports/revenue-by-client?${params}`);
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
  }, [range.generated, range.applied.from, range.applied.to, appliedClientId]);

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.totalAmount, 0), [rows]);
  const fees = useMemo(() => rows.reduce((sum, r) => sum + r.feeCount, 0), [rows]);

  const columns: ReportColumn<RevenueByClientRow>[] = [
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
    { key: "count", label: "Fee entries", render: (r) => r.feeCount, exportValue: (r) => r.feeCount },
    { key: "amount", label: "Fee amount", render: (r) => formatInr(r.totalAmount), exportValue: (r) => r.totalAmount },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/organisation/reports"
        title="Revenue Report"
        description={reportPeriodDescription(range, "Choose dates to see convenience fee income by client.")}
        actions={
          <DateRangeFilter
            range={range}
            running={loading}
            onGenerate={() => setAppliedClientId(clientId)}
            onCancel={() => setClientId(appliedClientId)}
            extras={
              <SelectField label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="sm:col-span-2 [&_select]:min-h-9 [&_select]:py-1.5">
                <option value="ALL">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName}
                    {c.clientCode ? ` (${c.clientCode})` : ""}
                  </option>
                ))}
              </SelectField>
            }
          />
        }
      />
      <ReportTable
        title="Revenue by Client"
        description={loading ? "Loading..." : `${rows.length} client${rows.length === 1 ? "" : "s"} with fee income`}
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`revenue-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={IndianRupee}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No fee revenue in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "No convenience fees were charged in this period."}
        rowKey={(r) => r.clientId}
        onRowClick={(r) => router.push(`/organisation/clients/${r.clientId}`)}
        summary={[
          { label: "Clients", value: String(rows.length) },
          { label: "Fee entries", value: String(fees) },
          { label: "Total fee revenue", value: formatInr(total), tone: "success" },
        ]}
      />
    </div>
  );
}
