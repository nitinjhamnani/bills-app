"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDate, formatIstDateTime } from "@/lib/report-format";
import type { AgingRow } from "@/lib/types";

export default function OrganisationAgingReportPage() {
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<AgingRow[]>("/api/v1/organisation/reports/aging");
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overdue = useMemo(() => rows.filter((r) => r.daysStuck >= 1).length, [rows]);
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);

  const columns: ReportColumn<AgingRow>[] = [
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
    {
      key: "biller",
      label: "Biller",
      render: (r) => (
        <>
          <p className="font-medium text-slate-900">{r.billerName}</p>
          <p className="font-mono text-[11px] text-slate-400">{r.customerBillAccountNumber}</p>
        </>
      ),
      exportValue: (r) => `${r.billerName} / ${r.customerBillAccountNumber}`,
    },
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount), exportValue: (r) => r.amount },
    { key: "status", label: "Org status", render: (r) => <StatusBadge status={r.orgStatus} />, exportValue: (r) => r.orgStatus },
    { key: "due", label: "Due date", render: (r) => formatIstDate(r.dueDate), exportValue: (r) => r.dueDate ?? "" },
    { key: "since", label: "Stuck since", render: (r) => formatIstDateTime(r.stuckSince), exportValue: (r) => formatIstDateTime(r.stuckSince) },
    {
      key: "days",
      label: "Days stuck",
      render: (r) => (
        <span className={r.daysStuck >= 1 ? "font-semibold text-rose-600" : "text-slate-600"}>{r.daysStuck}</span>
      ),
      exportValue: (r) => r.daysStuck,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/organisation/reports"
        title="Aging / Stuck Queue"
        description="Bills waiting for pick-up or still in process, oldest first."
      />
      <ReportTable
        title="Aging / Stuck Queue"
        loading={loading}
        rows={rows}
        columns={columns}
        exportFilename="aging-queue"
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation" }}
        summary={[
          { label: "Stuck bills", value: String(rows.length) },
          { label: "Stuck 1+ days", value: String(overdue), tone: "danger" },
          { label: "Amount in queue", value: formatInr(total), tone: "accent" },
        ]}
        emptyIcon={Clock}
        emptyTitle="Nothing stuck"
        emptyDescription="The settlement queue is clear."
        rowKey={(r) => r.paymentId}
        onRowClick={(r) => router.push(`/organisation/managed-bills/${r.billId}`)}
      />
    </div>
  );
}
