"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { BranchBillsRow } from "@/lib/types";

const columns: ReportColumn<BranchBillsRow>[] = [
  { key: "branch", label: "Branch", render: (row) => row.branchName, exportValue: (row) => row.branchName },
  {
    key: "branchId",
    label: "Branch ID",
    render: (row) => <span className="font-mono text-xs">{row.branchId}</span>,
    exportValue: (row) => row.branchId,
  },
  {
    key: "billId",
    label: "Bill ID",
    render: (row) => <span className="font-mono text-xs">{row.billId ?? "—"}</span>,
    exportValue: (row) => row.billId ?? "",
  },
  {
    key: "amount",
    label: "Amount",
    render: (row) => (row.billId ? formatInr(row.billAmount) : "—"),
    exportValue: (row) => row.billAmount ?? "",
  },
  {
    key: "branchBills",
    label: "Bills",
    render: (row) => row.branchBills,
    exportValue: (row) => row.branchBills,
  },
  {
    key: "branchTotal",
    label: "Branch total",
    render: (row) => formatInr(row.branchTotal),
    exportValue: (row) => row.branchTotal,
  },
];

export default function BillsByBranchReportPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const range = useReportRange();
  const [rows, setRows] = useState<BranchBillsRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<BranchBillsRow[]>(
          `/api/v1/clients/${clientId}/reports/branch-bills?from=${range.applied.from}&to=${range.applied.to}`,
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

  const totals = useMemo(() => {
    const branches = new Set<string>();
    let bills = 0;
    let amount = 0;
    for (const row of rows) {
      branches.add(row.branchId);
      if (row.billId) {
        bills += 1;
        amount += row.billAmount ?? 0;
      }
    }
    return { branches: branches.size, bills, amount };
  }, [rows]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/client/reports"
        title="Bills by branch"
        description={reportPeriodDescription(
          range,
          "Choose dates to see bills each branch paid from the wallet.",
        )}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Bills by branch"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`bills-by-branch-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Corporate", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={GitBranch}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No branches yet"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period."
            : "Bills are those paid from the company wallet. The total on each row is that branch's bills added together."
        }
        rowKey={(row) => `${row.branchId}-${row.billId ?? "none"}`}
        summary={[
          { label: "Branches", value: String(totals.branches) },
          { label: "Bills", value: String(totals.bills) },
          { label: "Amount", value: formatInr(totals.amount), tone: "accent" },
        ]}
      />
    </div>
  );
}
