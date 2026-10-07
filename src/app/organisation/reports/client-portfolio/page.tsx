"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { ReportTable, type ReportColumn } from "@/components/reports/ReportTable";
import { ReportPageHeader } from "@/components/reports/ReportPageHeader";
import { formatInr, formatIstDate } from "@/lib/report-format";
import type { ClientPortfolioRow } from "@/lib/types";

const CLIENT_TYPE_LABELS: Record<string, string> = {
  CORPORATE: "Corporate",
  PARTNER: "Partner",
};

export default function OrganisationClientPortfolioReportPage() {
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<ClientPortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<ClientPortfolioRow[]>("/api/v1/organisation/reports/client-portfolio");
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
      wallet: rows.reduce((sum, row) => sum + row.walletBalance, 0),
      outstanding: rows.reduce((sum, row) => sum + row.outstandingAmount, 0),
      pending: rows.reduce((sum, row) => sum + row.pendingSettlementAmount, 0),
      settled: rows.reduce((sum, row) => sum + row.totalPaidAmount, 0),
    }),
    [rows],
  );

  const columns: ReportColumn<ClientPortfolioRow>[] = [
    {
      key: "client",
      label: "Client",
      render: (c) => (
        <>
          <p className="font-medium text-slate-900">{c.clientName}</p>
          {c.clientCode && <p className="font-mono text-[11px] text-slate-400">{c.clientCode}</p>}
        </>
      ),
      exportValue: (c) => (c.clientCode ? `${c.clientName} (${c.clientCode})` : c.clientName),
    },
    { key: "type", label: "Type", render: (c) => CLIENT_TYPE_LABELS[c.clientType] ?? c.clientType, exportValue: (c) => c.clientType },
    { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} />, exportValue: (c) => c.status },
    { key: "onboarded", label: "Onboarded", render: (c) => formatIstDate(c.createdAt), exportValue: (c) => formatIstDate(c.createdAt) },
    { key: "balance", label: "Wallet balance", render: (c) => formatInr(c.walletBalance), exportValue: (c) => c.walletBalance },
    { key: "outstanding", label: "Outstanding", render: (c) => formatInr(c.outstandingAmount), exportValue: (c) => c.outstandingAmount },
    { key: "pending", label: "Pending settlement", render: (c) => formatInr(c.pendingSettlementAmount), exportValue: (c) => c.pendingSettlementAmount },
    { key: "bills", label: "Bills processed", render: (c) => c.totalBillPayments, exportValue: (c) => c.totalBillPayments },
    { key: "paid", label: "Lifetime settled", render: (c) => formatInr(c.totalPaidAmount), exportValue: (c) => c.totalPaidAmount },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ReportPageHeader
        backHref="/organisation/reports"
        title="Client Portfolio"
        description="Current wallets, outstanding dues, and lifetime settled volume."
      />
      <ReportTable
        title="Client Portfolio"
        loading={loading}
        rows={rows}
        columns={columns}
        exportFilename="client-portfolio"
        exportMeta={{ generatedFor: getUser()?.displayName ?? "Organisation" }}
        emptyIcon={Building2}
        emptyTitle="No clients yet"
        emptyDescription="Onboarded clients will show up here."
        rowKey={(c) => c.clientId}
        onRowClick={(c) => router.push(`/organisation/clients/${c.clientId}`)}
        summary={[
          { label: "Wallet", value: formatInr(totals.wallet) },
          { label: "Outstanding", value: formatInr(totals.outstanding), tone: "danger" },
          { label: "In flight", value: formatInr(totals.pending), tone: "accent" },
          { label: "Lifetime settled", value: formatInr(totals.settled), tone: "success" },
        ]}
      />
    </div>
  );
}
