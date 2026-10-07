"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { ReportTable } from "@/components/reports/ReportTable";
import {
  DateRangeFilter,
  useReportRange,
  type DateRangeFilterHandle,
} from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { clientBillColumns } from "@/components/reports/bill-columns";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { formatInr, formatIstDate } from "@/lib/report-format";
import type { BillPayment } from "@/lib/types";

type JourneyFilter = "ALL" | "UNPAID" | "AWAITING" | "IN_PROCESS" | "SETTLED";

const STATUS_OPTIONS: { key: JourneyFilter; label: string }[] = [
  { key: "ALL", label: "All bills" },
  { key: "UNPAID", label: "Unpaid" },
  { key: "AWAITING", label: "Paid, not yet settled" },
  { key: "IN_PROCESS", label: "Being processed" },
  { key: "SETTLED", label: "Settled" },
];

function matchesJourney(row: BillPayment, filter: JourneyFilter) {
  if (filter === "ALL") return true;
  if (filter === "UNPAID") return row.orgStatus === "NA";
  if (filter === "AWAITING") return row.orgStatus === "PENDING";
  if (filter === "IN_PROCESS") return row.orgStatus === "IN_PROCESS";
  return row.orgStatus === "PAID";
}

function statusLabel(status: JourneyFilter) {
  return STATUS_OPTIONS.find((option) => option.key === status)?.label ?? status;
}

export default function ClientBillStatementReportPage() {
  const toast = useToast();
  const router = useRouter();
  const clientId = getUser()?.clientId ?? "";
  const range = useReportRange();
  const criteriaRef = useRef<DateRangeFilterHandle>(null);
  const [rows, setRows] = useState<BillPayment[]>([]);
  const [status, setStatus] = useState<JourneyFilter>("ALL");
  const [appliedStatus, setAppliedStatus] = useState<JourneyFilter>("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<BillPayment[]>(
          `/api/v1/clients/${clientId}/reports/bill-statement?from=${range.applied.from}&to=${range.applied.to}`,
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

  const visible = useMemo(() => rows.filter((row) => matchesJourney(row, appliedStatus)), [rows, appliedStatus]);
  const total = useMemo(() => visible.reduce((sum, row) => sum + Number(row.amount || 0), 0), [visible]);
  const showing = range.generated
    ? `Showing ${appliedStatus === "ALL" ? "all bills" : `${statusLabel(appliedStatus).toLowerCase()} bills`} from ${formatIstDate(range.applied.from)} to ${formatIstDate(range.applied.to)}.`
    : "Choose dates and a status to see your bills.";

  const criteria = (
    <DateRangeFilter
      ref={criteriaRef}
      range={range}
      variant="button"
      running={loading}
      openLabel="Choose dates"
      changeLabel="Change dates"
      modalTitle="Which bills do you want to see?"
      modalDescription="Pick a period and a status, then show your bills."
      confirmLabel="Show bills"
      onGenerate={() => setAppliedStatus(status)}
      onCancel={() => setStatus(appliedStatus)}
      extras={
        <SelectField
          label="Bill status"
          value={status}
          onChange={(e) => setStatus(e.target.value as JourneyFilter)}
          className="sm:col-span-2 [&_select]:min-h-9 [&_select]:py-1.5"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </SelectField>
      }
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/client/reports"
        title="Bill Payment Statement"
        description={showing}
        actions={criteria}
      />
      <ReportTable
        title="Your bills"
        loading={loading}
        rows={range.generated ? visible : []}
        columns={clientBillColumns({ includeOrgStatus: true })}
        exportFilename={`bill-statement-${range.applied.from}-to-${range.applied.to}${appliedStatus === "ALL" ? "" : `-${appliedStatus.toLowerCase()}`}`}
        exportMeta={{
          generatedFor: getUser()?.displayName ?? "Client",
          dateRange: `${range.applied.from} to ${range.applied.to} · ${statusLabel(appliedStatus)}`,
        }}
        emptyIcon={FileText}
        emptyTitle={!range.generated ? "Nothing to show yet" : rows.length === 0 ? "No bills in these dates" : "No bills in this status"}
        emptyDescription={
          !range.generated
            ? "Use Choose dates at the top to pick a period and a status."
            : rows.length === 0
              ? "Try a wider date range."
              : "Try another status, or a wider date range."
        }
        emptyAction={
          <Button size="sm" variant={range.generated ? "outline" : "primary"} onClick={() => criteriaRef.current?.open()}>
            {range.generated ? "Change dates" : "Choose dates"}
          </Button>
        }
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/client/managed-bills/${p.billId}`)}
        summary={
          range.generated
            ? [
                { label: "Status", value: statusLabel(appliedStatus) },
                { label: "Bills", value: String(visible.length) },
                { label: "Total amount", value: formatInr(total), tone: "accent" },
              ]
            : undefined
        }
      />
    </div>
  );
}
