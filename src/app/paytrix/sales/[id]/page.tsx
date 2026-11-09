"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, IndianRupee } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { CardHeader, ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatInr, formatIstDate } from "@/lib/report-format";
import type { SalesBill, SalesCorporate } from "@/lib/types";

function stageStatus(stage: string) {
  if (stage === "Reimbursed") return "PAID";
  if (stage === "In progress") return "IN_PROGRESS";
  if (stage === "Unpaid") return "DUE";
  return "AWAITING";
}

export default function SalesCorporatePage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const toast = useToast();
  const [corporate, setCorporate] = useState<SalesCorporate | null>(null);
  const [bills, setBills] = useState<SalesBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch<SalesCorporate>(`/api/v1/paytrix/sales/corporates/${clientId}`),
      apiFetch<SalesBill[]>(`/api/v1/paytrix/sales/corporates/${clientId}/bills`),
    ])
      .then(([summary, rows]) => {
        if (cancelled) return;
        setCorporate(summary);
        setBills(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Failed to load this corporate");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const progress = corporate
    ? `${corporate.unpaidCount} unpaid · ${corporate.withVendorCount} with the vendor · ${corporate.waitingForCheckCount} waiting for check · ${corporate.waitingToPayVendorCount} waiting to pay the vendor · ${corporate.reimbursedCount} reimbursed`
    : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <Link
          href="/paytrix/sales"
          className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-700"
        >
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <PageHeader
          title={loading ? "Corporate" : (corporate?.clientName ?? "Corporate")}
          description={
            corporate
              ? [corporate.clientCode, corporate.onboardingStep].filter(Boolean).join(" · ")
              : undefined
          }
          actions={
            corporate ? (
              <div className="flex items-center gap-2">
                <StatusBadge status={corporate.accountStatus} />
              </div>
            ) : undefined
          }
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : corporate ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Business done till date"
            value={formatInr(corporate.businessAmount)}
            trend={`${corporate.businessCount} paid bills`}
            icon={IndianRupee}
            tone="success"
          />
          <StatCard
            label="This month"
            value={formatInr(corporate.monthBusinessAmount ?? 0)}
            trend={`${corporate.monthBusinessCount ?? 0} paid bills`}
            icon={IndianRupee}
          />
        </div>
      ) : null}

      <ListCard fitContent={false}>
        <CardHeader title="Bills" description={progress ?? "Bills for this corporate."} />
        {loading ? null : bills.length === 0 ? (
          <EmptyState icon={FileText} title="No bills" description="This corporate has no bills yet." />
        ) : (
          <Table>
            <THead columns={["Biller", "Consumer number", "Amount", "Due date", "Stage"]} />
            <TBody>
              {bills.map((bill) => (
                <TR key={bill.id}>
                  <TD className="font-semibold text-slate-900">{bill.billerName}</TD>
                  <TD className="font-mono">{bill.consumerNumber || "—"}</TD>
                  <TD>{formatInr(bill.amount)}</TD>
                  <TD>{formatIstDate(bill.dueDate)}</TD>
                  <TD>
                    <StatusBadge status={stageStatus(bill.stage)} label={bill.stage} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>
    </div>
  );
}
