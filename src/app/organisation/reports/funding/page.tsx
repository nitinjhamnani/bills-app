"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, StatusChips, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDateTime } from "@/lib/report-format";
import type { AdjustmentRow, Client, FundingRow } from "@/lib/types";

const MODE_LABELS: Record<string, string> = {
  RTGS: "RTGS",
  NEFT: "NEFT",
  UPI: "UPI",
  CASH: "Cash",
  OTHER: "Other",
};

export default function OrganisationFundingReportPage() {
  const toast = useToast();
  const router = useRouter();
  const range = useReportRange();
  const [status, setStatus] = useState("ALL");
  const [clientId, setClientId] = useState("ALL");
  const [appliedClientId, setAppliedClientId] = useState("ALL");
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<FundingRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
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
        if (status !== "ALL") params.set("status", status);
        if (appliedClientId !== "ALL") params.set("clientId", appliedClientId);
        const adjParams = new URLSearchParams({ from: range.applied.from, to: range.applied.to });
        if (appliedClientId !== "ALL") adjParams.set("clientId", appliedClientId);
        const [fundingResult, creditResult] = await Promise.allSettled([
          apiFetch<FundingRow[]>(`/api/v1/organisation/reports/funding?${params}`),
          apiFetch<AdjustmentRow[]>(`/api/v1/organisation/reports/funding-adjustments?${adjParams}`),
        ]);
        if (cancelled) return;
        if (fundingResult.status === "fulfilled") setRows(fundingResult.value);
        else {
          setRows([]);
          toast.error(fundingResult.reason instanceof ApiError ? fundingResult.reason.message : "Failed to load top-ups");
        }
        if (creditResult.status === "fulfilled") setAdjustments(creditResult.value);
        else {
          setAdjustments([]);
          toast.error(creditResult.reason instanceof ApiError ? creditResult.reason.message : "Failed to load wallet credits");
        }
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
  }, [range.generated, range.applied.from, range.applied.to, status, appliedClientId]);

  const completed = useMemo(
    () => rows.filter((r) => r.status === "COMPLETED").reduce((sum, r) => sum + r.amount, 0),
    [rows],
  );
  const adjustmentTotal = useMemo(() => adjustments.reduce((sum, r) => sum + r.amount, 0), [adjustments]);

  const columns: ReportColumn<FundingRow>[] = [
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
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount), exportValue: (r) => r.amount },
    { key: "mode", label: "Mode", render: (r) => MODE_LABELS[r.paymentMode] ?? r.paymentMode, exportValue: (r) => r.paymentMode },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} />, exportValue: (r) => r.status },
    { key: "ref", label: "Reference", render: (r) => r.paymentReference ?? "—", exportValue: (r) => r.paymentReference ?? "" },
    { key: "requestedBy", label: "Requested by", render: (r) => r.requestedBy ?? "—", exportValue: (r) => r.requestedBy ?? "" },
    { key: "reviewedBy", label: "Reviewed by", render: (r) => r.reviewedBy ?? "—", exportValue: (r) => r.reviewedBy ?? "" },
    { key: "date", label: "Requested", render: (r) => formatIstDateTime(r.createdAt), exportValue: (r) => formatIstDateTime(r.createdAt) },
  ];

  const adjustmentColumns: ReportColumn<AdjustmentRow>[] = [
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
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount), exportValue: (r) => r.amount },
    { key: "description", label: "Note", render: (r) => r.description ?? "—", exportValue: (r) => r.description ?? "" },
    { key: "date", label: "Credited", render: (r) => formatIstDateTime(r.createdAt), exportValue: (r) => formatIstDateTime(r.createdAt) },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <ReportPageHeader
        backHref="/organisation/reports"
        title="Wallet Funding"
        description={reportPeriodDescription(range, "Choose dates to see top-up requests and wallet credits.")}
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
      {range.generated && (
        <StatusChips
          value={status}
          onChange={setStatus}
          options={[
            { key: "ALL", label: "All" },
            { key: "PENDING", label: "Pending" },
            { key: "COMPLETED", label: "Completed" },
            { key: "REJECTED", label: "Rejected" },
          ]}
        />
      )}
      <ReportTable
        title="Top-up Requests"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`funding-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Wallet}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No top-up requests in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range or clear filters."}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/organisation/clients/${r.clientId}`)}
        fillHeight={false}
        summary={[
          { label: "Requests", value: String(rows.length) },
          { label: "Completed top-ups", value: formatInr(completed), tone: "success" },
        ]}
      />
      <ReportTable
        title="Manual wallet credits"
        description="Organisation ADJUSTMENT credits in the same period."
        loading={loading}
        rows={range.generated ? adjustments : []}
        columns={adjustmentColumns}
        exportFilename={`funding-adjustments-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Wallet}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No manual credits in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Organisation wallet credits will show up here."}
        rowKey={(r, i) => `${r.clientId}-${r.createdAt}-${i}`}
        onRowClick={(r) => router.push(`/organisation/clients/${r.clientId}`)}
        fillHeight={false}
        summary={[
          { label: "Credits", value: String(adjustments.length) },
          { label: "Adjustment total", value: formatInr(adjustmentTotal), tone: "accent" },
        ]}
      />
    </div>
  );
}
