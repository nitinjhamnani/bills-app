"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays, Clock, IndianRupee } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { CardHeader, ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatInr } from "@/lib/report-format";
import type { SalesCorporate, SalesDashboard } from "@/lib/types";

function progressLine(row: SalesCorporate) {
  return [
    `${row.unpaidCount} unpaid`,
    `${row.withVendorCount} with the vendor`,
    `${row.waitingForCheckCount} waiting for check`,
    `${row.waitingToPayVendorCount} waiting to pay the vendor`,
    `${row.reimbursedCount} reimbursed`,
  ].join(" · ");
}

export default function SalesDashboardPage() {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<SalesDashboard>("/api/v1/paytrix/sales/dashboard")
      .then(setDashboard)
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
    // toast identity changes every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Dashboard"
        description="Business from the corporates you brought in. Bills they have not paid yet are left out of the total."
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Business done till date"
            value={formatInr(dashboard?.businessAmount ?? 0)}
            trend={`${dashboard?.businessCount ?? 0} paid bills`}
            icon={IndianRupee}
            tone="success"
          />
          <StatCard
            label="This month"
            value={formatInr(dashboard?.monthBusinessAmount ?? 0)}
            trend={`${dashboard?.monthBusinessCount ?? 0} paid bills`}
            icon={CalendarDays}
          />
          <StatCard
            label="Corporates"
            value={dashboard?.corporateCount ?? 0}
            icon={Building2}
          />
          <StatCard
            label="Bills in progress"
            value={dashboard?.inProgressCount ?? 0}
            trend="With the vendor, waiting for a check, or waiting to be paid"
            icon={Clock}
            tone="warning"
          />
        </div>
      )}

      <ListCard fitContent={false}>
        <CardHeader
          title="Corporates"
          description="Business done is the amount these companies have already paid."
        />
        {loading ? null : !dashboard || dashboard.corporates.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No corporates yet"
            description="When Paytrix assigns a corporate to you, its business and bill progress show up here."
          />
        ) : (
          <Table>
            <THead columns={["Corporate", "Business done", "Onboarding", "Bill progress"]} />
            <TBody>
              {dashboard.corporates.map((row) => (
                <TR key={row.clientId}>
                  <TD>
                    <Link
                      href={`/paytrix/sales/${row.clientId}`}
                      className="font-semibold text-slate-900 hover:text-blue-700"
                    >
                      {row.clientName}
                    </Link>
                    {row.clientCode && (
                      <div className="mt-0.5 font-mono text-[11px] text-slate-400">{row.clientCode}</div>
                    )}
                  </TD>
                  <TD>
                    <div className="font-semibold text-slate-900">{formatInr(row.businessAmount)}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{row.businessCount} paid bills</div>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={row.accountStatus} />
                      <span className="text-[11px] text-slate-500">{row.onboardingStep}</span>
                    </div>
                  </TD>
                  <TD className="whitespace-normal">
                    <span className="text-[11px] leading-5 text-slate-500">{progressLine(row)}</span>
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
