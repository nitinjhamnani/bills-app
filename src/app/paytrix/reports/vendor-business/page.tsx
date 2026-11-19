"use client";

import { useEffect, useMemo, useState } from "react";
import { Store } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { ReportColumn } from "@/components/reports/ReportTable";
import type { VendorBusinessRow } from "@/lib/types";

const columns: ReportColumn<VendorBusinessRow>[] = [
  { key: "vendor", label: "Vendor", render: (row) => row.vendorName, exportValue: (row) => row.vendorName },
  {
    key: "vendorId",
    label: "Vendor ID",
    render: (row) => <span className="font-mono text-xs">{row.vendorId}</span>,
    exportValue: (row) => row.vendorId,
  },
  {
    key: "assigned",
    label: "Bills assigned",
    render: (row) => row.billsAssigned,
    exportValue: (row) => row.billsAssigned,
  },
  {
    key: "assignedAmount",
    label: "Assigned amount",
    render: (row) => formatInr(row.assignedAmount),
    exportValue: (row) => row.assignedAmount,
  },
  { key: "paid", label: "Bills paid", render: (row) => row.billsPaid, exportValue: (row) => row.billsPaid },
  {
    key: "paidAmount",
    label: "Paid amount",
    render: (row) => formatInr(row.paidAmount),
    exportValue: (row) => row.paidAmount,
  },
];

export default function VendorBusinessReportPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<VendorBusinessRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<VendorBusinessRow[]>(
          `/api/v1/paytrix/reports/vendor-business?from=${range.applied.from}&to=${range.applied.to}`,
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
          assigned: sum.assigned + row.billsAssigned,
          assignedAmount: sum.assignedAmount + row.assignedAmount,
          paid: sum.paid + row.billsPaid,
          paidAmount: sum.paidAmount + row.paidAmount,
        }),
        { assigned: 0, assignedAmount: 0, paid: 0, paidAmount: 0 },
      ),
    [rows],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/paytrix/reports"
        title="Vendor business"
        description={reportPeriodDescription(
          range,
          "Choose dates to see bills assigned to each vendor and bills that vendor paid.",
        )}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Vendor business"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`vendor-business-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Paytrix", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Store}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No vendors in these dates"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period."
            : "Assigned bills use the date the bill was given to the vendor. Paid bills use the date the vendor paid the biller."
        }
        rowKey={(row) => row.vendorId}
        summary={[
          { label: "Assigned", value: String(totals.assigned) },
          { label: "Assigned amount", value: formatInr(totals.assignedAmount) },
          { label: "Paid", value: String(totals.paid) },
          { label: "Paid amount", value: formatInr(totals.paidAmount), tone: "success" },
        ]}
      />
    </div>
  );
}
