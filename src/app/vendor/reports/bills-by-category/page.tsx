"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { VendorCategoryPaidRow } from "@/lib/types";

const columns: ReportColumn<VendorCategoryPaidRow>[] = [
  { key: "category", label: "Category", render: (row) => row.category, exportValue: (row) => row.category },
  { key: "bills", label: "Bills paid", render: (row) => row.bills, exportValue: (row) => row.bills },
  { key: "amount", label: "Total amount", render: (row) => formatInr(row.amount), exportValue: (row) => row.amount },
];

export default function VendorBillsByCategoryPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<VendorCategoryPaidRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<VendorCategoryPaidRow[]>(
          `/api/v1/client/reports/bills-by-category?from=${range.applied.from}&to=${range.applied.to}`,
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
    () => rows.reduce((sum, row) => ({ bills: sum.bills + row.bills, amount: sum.amount + row.amount }), { bills: 0, amount: 0 }),
    [rows],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/vendor/reports"
        title="Bills by category"
        description={reportPeriodDescription(range, "Choose dates to see bills you paid, grouped by category.")}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Bills by category"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`bills-by-category-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Vendor", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={PieChart}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No bills paid in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range."}
        rowKey={(row) => row.category}
        summary={[
          { label: "Categories", value: String(range.generated ? rows.length : 0) },
          { label: "Bills paid", value: String(range.generated ? totals.bills : 0) },
          { label: "Total amount", value: formatInr(range.generated ? totals.amount : 0), tone: "accent" },
        ]}
      />
    </div>
  );
}
