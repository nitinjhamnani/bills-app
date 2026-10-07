"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { clientBillColumns } from "@/components/reports/bill-columns";
import { formatInr } from "@/lib/report-format";
import type { BillPayment } from "@/lib/types";

export default function ClientPaymentHistoryReportPage() {
  const toast = useToast();
  const router = useRouter();
  const clientId = getUser()?.clientId ?? "";
  const range = useReportRange();
  const [rows, setRows] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<BillPayment[]>(
          `/api/v1/clients/${clientId}/reports/payment-history?from=${range.applied.from}&to=${range.applied.to}`,
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/client/reports"
        title="Payment History"
        description={reportPeriodDescription(range, "Choose dates to see bills paid from the wallet.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Payment History"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={clientBillColumns({ includePaidAt: true, includeOrgStatus: true })}
        exportFilename={`payment-history-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Client", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={History}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No payments in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/client/managed-bills/${p.billId}`)}
        summary={[{ label: "Payments", value: String(rows.length) }, { label: "Total paid", value: formatInr(total), tone: "success" }]}
      />
    </div>
  );
}
