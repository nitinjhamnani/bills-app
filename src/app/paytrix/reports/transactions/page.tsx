"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { ReportColumn } from "@/components/reports/ReportTable";
import type { TransactionCategoryRow } from "@/lib/types";

const columns: ReportColumn<TransactionCategoryRow>[] = [
  { key: "what", label: "What", render: (row) => row.what, exportValue: (row) => row.what },
  {
    key: "moneyIn",
    label: "Money in",
    render: (row) => formatInr(row.moneyIn),
    exportValue: (row) => row.moneyIn,
  },
  {
    key: "moneyOut",
    label: "Money out",
    render: (row) => formatInr(row.moneyOut),
    exportValue: (row) => row.moneyOut,
  },
];

export default function TransactionsReportPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<TransactionCategoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<TransactionCategoryRow[]>(
          `/api/v1/paytrix/reports/transactions?from=${range.applied.from}&to=${range.applied.to}`,
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

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          moneyIn: sum.moneyIn + row.moneyIn,
          moneyOut: sum.moneyOut + row.moneyOut,
        }),
        { moneyIn: 0, moneyOut: 0 },
      ),
    [rows],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/paytrix/reports"
        title="Transactions"
        description={reportPeriodDescription(
          range,
          "Choose dates to see money in and money out for each What on Transactions.",
        )}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Transactions"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`transactions-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Paytrix", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={ArrowLeftRight}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No transactions in these dates"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period."
            : "Each row is a What from the Transactions list. Money in is a credit to Paytrix and money out is a debit."
        }
        rowKey={(row) => row.what}
        summary={[
          { label: "Money in", value: formatInr(totals.moneyIn), tone: "success" },
          { label: "Money out", value: formatInr(totals.moneyOut), tone: "danger" },
        ]}
      />
    </div>
  );
}
