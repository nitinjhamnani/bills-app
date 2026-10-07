"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDateTime } from "@/lib/report-format";
import type { BillLedgerEntry, WalletStatement } from "@/lib/types";

export default function ClientWalletStatementReportPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const range = useReportRange();
  const [statement, setStatement] = useState<WalletStatement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<WalletStatement>(
          `/api/v1/clients/${clientId}/reports/wallet-statement?from=${range.applied.from}&to=${range.applied.to}`,
        );
        if (!cancelled) setStatement(data);
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

  const columns: ReportColumn<BillLedgerEntry>[] = [
    { key: "when", label: "When", render: (e) => formatIstDateTime(e.createdAt), exportValue: (e) => formatIstDateTime(e.createdAt) },
    {
      key: "type",
      label: "Type",
      render: (e) => (
        <span className={cn("font-medium", e.entryType === "CREDIT" ? "text-emerald-600" : "text-red-600")}>
          {e.entryType}
        </span>
      ),
      exportValue: (e) => e.entryType,
    },
    { key: "category", label: "Category", render: (e) => <StatusBadge status={e.referenceType} />, exportValue: (e) => e.referenceType },
    { key: "amount", label: "Amount", render: (e) => formatInr(e.amount), exportValue: (e) => e.amount },
    { key: "balance", label: "Balance after", render: (e) => formatInr(e.balanceAfter), exportValue: (e) => e.balanceAfter },
    { key: "description", label: "Description", render: (e) => e.description ?? "—", exportValue: (e) => e.description ?? "" },
  ];

  const rows = statement?.entries ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/client/reports"
        title="Wallet Statement"
        description={reportPeriodDescription(range, "Choose dates to see opening, closing, and every wallet movement.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Wallet Statement"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`wallet-statement-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Client", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        summary={
          range.generated && statement
            ? [
                { label: "Opening balance", value: formatInr(statement.openingBalance) },
                { label: "Total credits", value: formatInr(statement.totalCredits), tone: "success" },
                { label: "Total debits", value: formatInr(statement.totalDebits), tone: "danger" },
                { label: "Closing balance", value: formatInr(statement.closingBalance), tone: "accent" },
              ]
            : undefined
        }
        emptyIcon={Receipt}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No activity in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(e, i) => `${e.createdAt}-${e.referenceType}-${i}`}
      />
    </div>
  );
}
