"use client";

import { useEffect, useMemo, useState } from "react";
import { Percent } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr } from "@/lib/report-format";
import type { ReportColumn } from "@/components/reports/ReportTable";
import type { VendorCommissionReportRow } from "@/lib/types";

const columns: ReportColumn<VendorCommissionReportRow>[] = [
  { key: "vendor", label: "Vendor", render: (row) => row.vendorName, exportValue: (row) => row.vendorName },
  {
    key: "vendorId",
    label: "Vendor ID",
    render: (row) => <span className="font-mono text-xs">{row.vendorId}</span>,
    exportValue: (row) => row.vendorId,
  },
  {
    key: "earned",
    label: "Commission earned",
    render: (row) => formatInr(row.commissionEarned),
    exportValue: (row) => row.commissionEarned,
  },
  {
    key: "pending",
    label: "Pending with vendor",
    render: (row) => formatInr(row.commissionPending),
    exportValue: (row) => row.commissionPending,
  },
];

export default function VendorCommissionReportPage() {
  const toast = useToast();
  const range = useReportRange();
  const [rows, setRows] = useState<VendorCommissionReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<VendorCommissionReportRow[]>(
          `/api/v1/paytrix/reports/vendor-commission?from=${range.applied.from}&to=${range.applied.to}`,
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
          earned: sum.earned + row.commissionEarned,
          pending: sum.pending + row.commissionPending,
        }),
        { earned: 0, pending: 0 },
      ),
    [rows],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/paytrix/reports"
        title="Vendor commission"
        description={reportPeriodDescription(
          range,
          "Choose dates to see commission received from each vendor. Pending is what is still owed.",
        )}
        actions={<DateRangeFilter range={range} running={loading} />}
      />
      <ReportTable
        title="Vendor commission"
        loading={loading}
        rows={range.generated ? rows : []}
        columns={columns}
        exportFilename={`vendor-commission-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Paytrix", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Percent}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No vendors yet"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period."
            : "Earned commission was marked received in these dates. Pending is commission that is still with the vendor."
        }
        rowKey={(row) => row.vendorId}
        summary={[
          { label: "Commission earned", value: formatInr(totals.earned), tone: "success" },
          { label: "Pending", value: formatInr(totals.pending) },
        ]}
      />
    </div>
  );
}
