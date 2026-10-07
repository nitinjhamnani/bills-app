"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, StatusChips } from "@/components/reports/ReportTable";
import { DateRangeFilter, reportPeriodDescription, useReportRange } from "@/components/reports/DateRangeFilter";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { orgSettlementColumns } from "@/components/reports/bill-columns";
import { formatInr } from "@/lib/report-format";
import type { BillPayment, Client, OrgStatus } from "@/lib/types";

type StatusFilter = "SETTLEMENT" | "ALL" | OrgStatus;
type DateField = "createdAt" | "clientPaidAt" | "orgPaidAt";

export default function OrganisationSettlementPipelineReportPage() {
  const toast = useToast();
  const router = useRouter();
  const range = useReportRange();
  const [clientId, setClientId] = useState("ALL");
  const [appliedClientId, setAppliedClientId] = useState("ALL");
  const [dateField, setDateField] = useState<DateField>("createdAt");
  const [appliedDateField, setAppliedDateField] = useState<DateField>("createdAt");
  const [orgStatus, setOrgStatus] = useState<StatusFilter>("SETTLEMENT");
  const [clients, setClients] = useState<Client[]>([]);
  const [rows, setRows] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<Client[]>("/api/v1/organisation/clients").then(setClients).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          from: range.applied.from,
          to: range.applied.to,
          dateField: appliedDateField,
          orgStatus: "ALL",
        });
        if (appliedClientId !== "ALL") params.set("clientId", appliedClientId);
        const data = await apiFetch<BillPayment[]>(`/api/v1/organisation/reports/settlement-pipeline?${params}`);
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
  }, [range.generated, range.applied.from, range.applied.to, appliedClientId, appliedDateField]);

  const clientLabel = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c]));
    return (id: string) => {
      const c = map.get(id);
      if (!c) return "Unknown client";
      return c.clientCode ? `${c.clientName} (${c.clientCode})` : c.clientName;
    };
  }, [clients]);

  const visible = useMemo(() => {
    if (orgStatus === "ALL") return rows;
    if (orgStatus === "SETTLEMENT") return rows.filter((r) => r.orgStatus !== "NA");
    return rows.filter((r) => r.orgStatus === orgStatus);
  }, [rows, orgStatus]);

  const counts = useMemo(() => {
    return {
      SETTLEMENT: rows.filter((r) => r.orgStatus !== "NA").length,
      PENDING: rows.filter((r) => r.orgStatus === "PENDING").length,
      IN_PROCESS: rows.filter((r) => r.orgStatus === "IN_PROCESS").length,
      PAID: rows.filter((r) => r.orgStatus === "PAID").length,
      ALL: rows.length,
    };
  }, [rows]);

  const total = useMemo(() => visible.reduce((sum, row) => sum + row.amount, 0), [visible]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/organisation/reports"
        title="Settlement Register"
        description={reportPeriodDescription(range, "Choose dates to see bills in settlement or already settled.")}
        actions={
          <DateRangeFilter
            range={range}
            running={loading}
            onGenerate={() => {
              setAppliedClientId(clientId);
              setAppliedDateField(dateField);
            }}
            onCancel={() => {
              setClientId(appliedClientId);
              setDateField(appliedDateField);
            }}
            extras={
              <>
                <SelectField label="Date means" value={dateField} onChange={(e) => setDateField(e.target.value as DateField)} className="[&_select]:min-h-9 [&_select]:py-1.5">
                  <option value="createdAt">Bill created</option>
                  <option value="clientPaidAt">Client paid</option>
                  <option value="orgPaidAt">Org settled</option>
                </SelectField>
                <SelectField label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="[&_select]:min-h-9 [&_select]:py-1.5">
                  <option value="ALL">All clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName}
                      {c.clientCode ? ` (${c.clientCode})` : ""}
                    </option>
                  ))}
                </SelectField>
              </>
            }
          />
        }
      />
      {range.generated && (
        <StatusChips
          value={orgStatus}
          onChange={setOrgStatus}
          options={[
            { key: "SETTLEMENT", label: "Settlement", count: counts.SETTLEMENT },
            { key: "PENDING", label: "Awaiting pick-up", count: counts.PENDING },
            { key: "IN_PROCESS", label: "In process", count: counts.IN_PROCESS },
            { key: "PAID", label: "Settled", count: counts.PAID },
            { key: "ALL", label: "All statuses" },
          ]}
        />
      )}
      <ReportTable
        title="Settlement Register"
        loading={loading}
        rows={range.generated ? visible : []}
        columns={orgSettlementColumns(clientLabel)}
        exportFilename={`settlement-register-${range.applied.from}-to-${range.applied.to}`}
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation", dateRange: `${range.applied.from} to ${range.applied.to}` }}
        emptyIcon={Send}
        emptyTitle={!range.generated ? "Nothing to show yet" : "No settlements in these dates"}
        emptyDescription={!range.generated ? "Use Choose dates at the top to pick a period." : "Try a wider date range or another Date means."}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/organisation/managed-bills/${p.billId}`)}
        summary={[
          { label: "Bills", value: String(visible.length) },
          { label: "Total amount", value: formatInr(total), tone: "accent" },
        ]}
      />
    </div>
  );
}
