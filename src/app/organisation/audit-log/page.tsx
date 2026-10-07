"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge, formatStatusLabel } from "@/components/StatusBadge";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { formatIstDateTime } from "@/lib/report-format";
import type { AuditLogEntry } from "@/lib/types";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";

function humanize(value: string) {
  return formatStatusLabel(value.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

export default function OrganisationAuditLogPage() {
  const toast = useToast();
  const range = useReportRange();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<AuditLogEntry[]>(
          `/api/v1/organisation/audit-log?from=${range.applied.from}&to=${range.applied.to}`,
        );
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load audit log");
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

  const columns: ReportColumn<AuditLogEntry>[] = [
    { key: "when", label: "When", render: (e) => formatIstDateTime(e.createdAt), exportValue: (e) => formatIstDateTime(e.createdAt) },
    {
      key: "actor",
      label: "Actor",
      render: (e) => (
        <div className="flex flex-col items-start gap-1">
          {e.actorRole ? <StatusBadge status={e.actorRole} /> : <span className="text-xs font-medium text-slate-500">System</span>}
          {e.actorUserId ? <CopyableChip text={e.actorUserId} label="actor" /> : <span className="text-[11px] text-slate-400">—</span>}
        </div>
      ),
      exportValue: (e) => e.actorRole ?? "System",
    },
    { key: "action", label: "Action", render: (e) => humanize(e.action), exportValue: (e) => humanize(e.action) },
    {
      key: "record",
      label: "Record",
      render: (e) => (
        <>
          <p className="font-medium text-slate-800">{e.entityType ? humanize(e.entityType) : "—"}</p>
          {e.entityId ? <CopyableChip text={e.entityId} label="record id" className="mt-1" /> : null}
        </>
      ),
      exportValue: (e) => [e.entityType, e.entityId].filter(Boolean).join(" "),
    },
    { key: "details", label: "Details", render: (e) => e.details || "—", exportValue: (e) => e.details ?? "" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/organisation/reports"
        title="Audit log"
        description={reportPeriodDescription(range, "Choose dates to see every money-moving action and who did it.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Audit extract"
        loading={loading}
        rows={range.generated ? entries : []}
        columns={columns}
        exportFilename={`audit-log-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        summary={range.generated ? [{ label: "Entries", value: String(entries.length), tone: "accent" }] : undefined}
        emptyIcon={History}
        emptyTitle={!range.generated ? "Nothing to show yet" : "Nothing recorded in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(e, i) => `${e.createdAt}-${e.action}-${i}`}
      />
    </div>
  );
}
