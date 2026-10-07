"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDate } from "@/lib/report-format";
import type { BillPayment } from "@/lib/types";

function daysOverdue(dueDate: string | null) {
  if (!dueDate) return null;
  const due = new Date(dueDate.length <= 10 ? `${dueDate}T00:00:00+05:30` : dueDate);
  return Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ClientOutstandingBillsReportPage() {
  const toast = useToast();
  const router = useRouter();
  const clientId = getUser()?.clientId ?? "";
  const [rows, setRows] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<BillPayment[]>(`/api/v1/clients/${clientId}/reports/outstanding-bills`);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (clientId) load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const totalDue = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);

  const columns: ReportColumn<BillPayment>[] = [
    {
      key: "biller",
      label: "Biller",
      render: (p) => (
        <>
          <p className="font-medium text-slate-900">{p.billerName}</p>
          <p className="text-[11px] text-slate-400">{p.billServiceName}</p>
        </>
      ),
      exportValue: (p) => `${p.billerName} (${p.billServiceName})`,
    },
    {
      key: "consumer",
      label: "Consumer no.",
      render: (p) => <span className="font-mono text-xs">{p.customerBillAccountNumber}</span>,
      exportValue: (p) => p.customerBillAccountNumber,
    },
    { key: "amount", label: "Amount", render: (p) => formatInr(p.amount), exportValue: (p) => p.amount },
    { key: "dueDate", label: "Due date", render: (p) => formatIstDate(p.dueDate), exportValue: (p) => p.dueDate ?? "" },
    {
      key: "overdue",
      label: "Days overdue",
      render: (p) => {
        const overdue = daysOverdue(p.dueDate);
        if (overdue === null) return "—";
        return overdue > 0 ? (
          <span className="font-semibold text-rose-600">{overdue}</span>
        ) : (
          <span className="text-slate-400">Not yet due</span>
        );
      },
      exportValue: (p) => {
        const overdue = daysOverdue(p.dueDate);
        if (overdue === null) return "";
        return overdue > 0 ? overdue : 0;
      },
    },
    { key: "billStatus", label: "Bill status", render: (p) => <StatusBadge status={p.billStatus} />, exportValue: (p) => p.billStatus },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/client/reports"
        title="Outstanding Bills"
        description="Bills fetched but not yet paid, as of now."
        actions={
          <Button size="sm" onClick={() => router.push("/client/my-payments")}>
            Pay now
          </Button>
        }
      />
      <ReportTable
        title="Outstanding Bills"
        description={loading ? "Loading..." : `${rows.length} bill${rows.length === 1 ? "" : "s"} awaiting your payment`}
        loading={loading}
        rows={rows}
        columns={columns}
        exportFilename="outstanding-bills"
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Client" }}
        emptyIcon={Clock}
        emptyTitle="Nothing outstanding"
        summary={[
          { label: "Bills awaiting payment", value: String(rows.length) },
          { label: "Total due", value: formatInr(totalDue), tone: "danger" },
        ]}
        emptyDescription="Every fetched bill has been paid."
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push("/client/my-payments")}
      />
    </div>
  );
}
