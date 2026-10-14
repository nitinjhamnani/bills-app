"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  MessageCircle,
  PackageCheck,
  Plus,
  Send,
  Wallet,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { BillStatCard } from "@/components/ui/BillStatCard";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ClientAnalytics } from "@/lib/types";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function ClientDashboard() {
  const router = useRouter();
  const toast = useToast();
  const user = getUser();
  const clientId = user?.clientId ?? "";
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ClientAnalytics>(`/api/v1/clients/${clientId}/analytics`)
      .then(setAnalytics)
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  }, []);

  const pending = analytics?.pendingBills ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={user?.displayName ? `Welcome back, ${user.displayName}` : "Dashboard"}
        description="Pay due bills from the wallet, and see what is still open."
        actions={user?.role ? <StatusBadge status={user.role} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Available balance</p>
              {loading || !analytics ? (
                <Skeleton className="mt-2 h-8 w-40" />
              ) : (
                <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-slate-900">
                  {inr(analytics.walletBalance)}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {user?.role === "CLIENT_ADMIN"
                  ? "A top-up is credited after the organisation accepts it."
                  : "A Client Admin requests a top-up when more funds are needed."}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Wallet size={16} />
            </span>
          </div>
          {user?.role === "CLIENT_ADMIN" && (
            <Button icon={<Plus size={16} />} onClick={() => router.push("/client/wallet")}>
              Top up wallet
            </Button>
          )}
        </section>

        <section
          className={
            !loading && pending > 0
              ? "flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs sm:p-5"
              : "flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Due now</p>
              {loading || !analytics ? (
                <Skeleton className="mt-2 h-8 w-40" />
              ) : (
                <>
                  <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-slate-900">
                    {inr(analytics.pendingAmount)}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {pending === 0
                      ? "No bills are waiting for payment."
                      : `${pending} ${pending === 1 ? "bill" : "bills"} currently due on the latest cycle.`}
                  </p>
                </>
              )}
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Clock size={16} />
            </span>
          </div>
          <Button icon={<Send size={16} />} onClick={() => router.push("/client/my-payments")}>
            {pending > 0 ? "Pay bills" : "My Payments"}
          </Button>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading || !analytics ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <BillStatCard
              label="All bills"
              count={analytics.totalBills}
              amount={analytics.totalAmount}
              icon={FileText}
            />
            <BillStatCard
              label="Paid"
              count={analytics.paidBills}
              amount={analytics.paidAmount}
              icon={CheckCircle2}
              tone="success"
            />
            <BillStatCard
              label="Completed"
              count={analytics.completedBills}
              amount={analytics.completedAmount}
              icon={PackageCheck}
              tone="success"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => router.push("/client/managed-bills")}
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <FileText size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Managed bills</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Add a bill and follow each cycle.
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/client/support")}
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <MessageCircle size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Support</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Raise a ticket if a payment is stuck.
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
      </div>
    </div>
  );
}
