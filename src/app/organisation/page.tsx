"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  IndianRupee,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { OrganisationAnalytics, OrganisationMe } from "@/lib/types";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const LINKS = [
  {
    href: "/organisation/clients",
    label: "Clients",
    description: "Onboard a client or open an existing one.",
    icon: Building2,
  },
  {
    href: "/organisation/my-payments",
    label: "My Payments",
    description: "Pick up bills clients have paid and settle them.",
    icon: Clock,
  },
  {
    href: "/organisation/users",
    label: "Users",
    description: "Add people and set what they can do.",
    icon: Users,
  },
] as const;

export default function OrganisationDashboard() {
  const router = useRouter();
  const toast = useToast();
  const isOrgAdmin = getUser()?.role === "ORGANISATION_ADMIN";
  const [me, setMe] = useState<OrganisationMe | null>(null);
  const [analytics, setAnalytics] = useState<OrganisationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<OrganisationMe>("/api/v1/organisation/me"),
      apiFetch<OrganisationAnalytics>("/api/v1/organisation/analytics"),
    ])
      .then(([profile, stats]) => {
        setMe(profile);
        setAnalytics(stats);
      })
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  }, []);

  const waiting = (analytics?.billsPendingPickup ?? 0) + (analytics?.billsInProcess ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={me ? `Welcome back, ${me.fullName}` : "Dashboard"}
        description={me ? `${me.organisationName} · ${me.organisationCode}` : "Bills waiting on your team."}
        actions={me ? <StatusBadge status={me.role} /> : undefined}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? "Checking the payment queue."
                : waiting === 0
                  ? "Nothing is waiting. New bills show up here after a client pays."
                  : "Bills a client has paid that still need a pick-up or a settlement."}
            </p>
          </div>
          <Button icon={<ChevronRight size={16} />} onClick={() => router.push("/organisation/my-payments")}>
            Open My Payments
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {loading || !analytics ? (
            <>
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </>
          ) : (
            <>
              <QueueFigure
                label="Awaiting pick-up"
                value={analytics.billsPendingPickup}
                icon={Clock}
                active={analytics.billsPendingPickup > 0}
              />
              <QueueFigure
                label="In process"
                value={analytics.billsInProcess}
                icon={ShieldAlert}
                active={analytics.billsInProcess > 0}
              />
            </>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !analytics ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Clients" value={analytics.clientCount} icon={Building2} />
            <StatCard label="Settled" value={analytics.billsPaid} icon={CheckCircle2} tone="success" />
            <StatCard label="Fetch failed" value={analytics.billsFailed} icon={XCircle} tone="danger" />
            <StatCard label="Total GMV" value={inr(analytics.totalGmv)} icon={IndianRupee} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LINKS.filter((item) => item.href !== "/organisation/users" || isOrgAdmin).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QueueFigure({
  label,
  value,
  icon: Icon,
  active,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  active: boolean;
}) {
  return (
    <div
      className={
        active
          ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          : "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      }
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
        <Icon size={14} className={active ? "text-amber-700" : "text-slate-400"} />
        {label}
      </div>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}
