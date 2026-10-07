"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDate } from "@/lib/report-format";
import type { OrganisationPortfolioRow } from "@/lib/types";

export default function PlatformOrganisationPortfolioReportPage() {
  const toast = useToast();
  const [rows, setRows] = useState<OrganisationPortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<OrganisationPortfolioRow[]>("/api/v1/platform/reports/organisations");
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => ({
      clients: rows.reduce((sum, row) => sum + row.clientCount, 0),
      gmv: rows.reduce((sum, row) => sum + row.totalGmv, 0),
    }),
    [rows],
  );

  const columns: ReportColumn<OrganisationPortfolioRow>[] = [
    {
      key: "organisation",
      label: "Organisation",
      render: (o) => (
        <>
          <p className="font-medium text-slate-900">{o.organisationName}</p>
          <p className="font-mono text-[11px] text-slate-400">{o.organisationCode}</p>
        </>
      ),
      exportValue: (o) => `${o.organisationName} (${o.organisationCode})`,
    },
    { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} />, exportValue: (o) => o.status },
    { key: "onboarded", label: "Onboarded", render: (o) => formatIstDate(o.createdAt), exportValue: (o) => formatIstDate(o.createdAt) },
    { key: "clients", label: "Clients", render: (o) => o.clientCount, exportValue: (o) => o.clientCount },
    { key: "staff", label: "Staff", render: (o) => o.staffCount, exportValue: (o) => o.staffCount },
    { key: "gmv", label: "Total GMV", render: (o) => formatInr(o.totalGmv), exportValue: (o) => o.totalGmv },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/platform/reports"
        title="Organisation Portfolio"
        description="Every organisation, status, headcount, and lifetime GMV."
      />
      <ReportTable
        title="Organisation Portfolio"
        loading={loading}
        rows={rows}
        columns={columns}
        exportFilename="organisation-portfolio"
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Platform" }}
        summary={[
          { label: "Organisations", value: String(rows.length) },
          { label: "Clients", value: String(totals.clients) },
          { label: "Lifetime GMV", value: formatInr(totals.gmv), tone: "success" },
        ]}
        emptyIcon={Building2}
        emptyTitle="No organisations yet"
        emptyDescription="Onboarded organisations will show up here."
        rowKey={(o) => o.organisationId}
      />
    </div>
  );
}
