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
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { OnboardingTracker, type CompanyDetails } from "@/components/OnboardingTracker";
import type { BillPayment, ClientAccount, ClientAnalytics } from "@/lib/types";
import { vendorStageBadge, vendorStageOf } from "@/lib/vendor-stage";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function BranchHomeDashboard() {
  const toast = useToast();
  const user = getUser();
  const [home, setHome] = useState<{
    branchName: string;
    managedBillCount: number;
    pendingCount: number;
    pendingAmount: number;
    branchCount?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{
      branchName: string;
      managedBillCount: number;
      pendingCount: number;
      pendingAmount: number;
      branchCount?: number;
    }>(`/api/v1/clients/${user?.clientId}/branch-home`)
      .then(setHome)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={home?.branchName ?? "Branch"}
        description={
          !home || (home.branchCount ?? 1) === 1
            ? "Bills registered for this branch, and fetched cycles still waiting to be paid."
            : home.branchCount === 0
              ? "An admin can assign you to a branch."
              : "Bills registered for your branches, and fetched cycles still waiting to be paid."
        }
      />
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Managed bills" value={String(home?.managedBillCount ?? 0)} icon={FileText} />
          <StatCard label="Unpaid cycles" value={String(home?.pendingCount ?? 0)} icon={Clock} />
          <StatCard label="Unpaid amount" value={inr(Number(home?.pendingAmount ?? 0))} icon={Send} />
        </div>
      )}
    </div>
  );
}

export default function ClientDashboard() {
  const user = getUser();
  if (user?.role === "BRANCH_USER") return <BranchHomeDashboard />;
  return <CorporateDashboard />;
}

function vendorStage(bill: BillPayment): string {
  return vendorStageOf(bill);
}

function VendorDashboard({ userName, role }: { userName?: string; role?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<BillPayment[]>("/api/v1/client/assigned-bills")
      .then(setBills)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load assigned bills"))
      .finally(() => setLoading(false));
  }, []);

  const stages = {
    ASSIGNED: bills.filter((bill) => vendorStage(bill) === "ASSIGNED"),
    IN_PROGRESS: bills.filter((bill) => vendorStage(bill) === "IN_PROGRESS"),
    VENDOR_PAID: bills.filter((bill) => vendorStage(bill) === "VENDOR_PAID"),
    VERIFIED: bills.filter((bill) => vendorStage(bill) === "VERIFIED" || vendorStage(bill) === "REIMBURSED"),
  };
  const amount = (rows: BillPayment[]) => rows.reduce((total, bill) => total + bill.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={userName ? `Welcome back, ${userName}` : "Dashboard"}
        description="Bills a corporate pays are assigned to you. Follow them on My Payments until Paytrix verifies them. Verified bills also appear under Transactions."
        actions={role ? <StatusBadge status={role} /> : undefined}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <BillStatCard label="Assigned" count={stages.ASSIGNED.length} amount={amount(stages.ASSIGNED)} icon={FileText} />
            <BillStatCard label="In progress" count={stages.IN_PROGRESS.length} amount={amount(stages.IN_PROGRESS)} icon={Clock} tone="warning" />
            <BillStatCard label="Waiting for Paytrix" count={stages.VENDOR_PAID.length} amount={amount(stages.VENDOR_PAID)} icon={Send} />
            <BillStatCard label="Verified" count={stages.VERIFIED.length} amount={amount(stages.VERIFIED)} icon={PackageCheck} tone="success" />
          </>
        )}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Assigned bills</h2>
            <p className="mt-0.5 text-xs text-slate-500">Every bill currently assigned to this account.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => router.push("/client/assigned-bills")}>
            My Payments
          </Button>
        </div>
        {loading ? (
          <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        ) : bills.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Bills appear here after a corporate pays and a rule matches this account.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {bills.map((bill) => {
              const stage = vendorStageBadge(vendorStage(bill));
              return (
                <li key={bill.id}>
                  <button
                    type="button"
                    onClick={() => router.push("/client/assigned-bills")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{bill.billerName}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {bill.corporateName ?? "Corporate"} · {bill.customerBillAccountNumber}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-900">{inr(bill.amount)}</span>
                    <StatusBadge status={stage.status} label={stage.label} />
                    <ChevronRight size={16} className="shrink-0 text-slate-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function CorporateDashboard() {
  const router = useRouter();
  const toast = useToast();
  const user = getUser();
  const clientId = user?.clientId ?? "";
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const vendor = account?.clientType === "VENDOR";

  useEffect(() => {
    Promise.all([
      apiFetch<ClientAnalytics>(`/api/v1/clients/${clientId}/analytics`),
      apiFetch<ClientAccount>("/api/v1/client/account"),
    ])
      .then(([nextAnalytics, nextAccount]) => {
        setAnalytics(nextAnalytics);
        setAccount(nextAccount);
      })
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));
  }, []);

  const pending = analytics?.pendingBills ?? 0;
  const canAct = user?.role === "CLIENT_ADMIN";
  const [stepBusy, setStepBusy] = useState<"company" | "kyc" | "contract" | null>(null);

  async function submitCompany(details: CompanyDetails) {
    setStepBusy("company");
    try {
      setAccount(await apiFetch<ClientAccount>("/api/v1/client/onboarding", { method: "PUT", body: details }));
      toast.success(account?.corporateKind === "INDIVIDUAL" ? "Personal information saved" : "Company information saved");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : account?.corporateKind === "INDIVIDUAL"
            ? "Could not save personal information"
            : "Could not save company information",
      );
    } finally {
      setStepBusy(null);
    }
  }

  async function completeKyc() {
    setStepBusy("kyc");
    try {
      setAccount(await apiFetch<ClientAccount>("/api/v1/client/onboarding/kyc-complete", { method: "POST" }));
      toast.success("eKYC saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save eKYC");
    } finally {
      setStepBusy(null);
    }
  }

  if (!loading && account?.status === "PENDING") {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title={user?.displayName ? `Welcome, ${user.displayName}` : "Welcome"}
          description={
            account?.corporateKind === "INDIVIDUAL"
              ? "Personal information, eKYC, then the contract. The rest of the workspace opens after the contract is signed."
              : "Company information, eKYC, then the contract. The rest of the workspace opens after the contract is signed."
          }
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <OnboardingTracker
            kind={account.corporateKind}
            companyDone={account.detailsSubmitted}
            kycDone={account.kycStatus === "COMPLETE"}
            contractDone={account.contractStatus === "SIGNED"}
            canAct={canAct}
            busy={stepBusy}
            onSubmitCompany={(details) => void submitCompany(details)}
            onCompleteKyc={() => void completeKyc()}
            onOpenEsign={() => router.push("/client/onboarding/esign")}
          />
        </div>
      </div>
    );
  }

  if (!loading && vendor) {
    return <VendorDashboard userName={user?.displayName} role={user?.role} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={user?.displayName ? `Welcome back, ${user.displayName}` : "Dashboard"}
        description={
          vendor
            ? "Bills Paytrix assigns to you are under Assigned bills. Mark one paid after you pay the biller."
            : "Pay due bills from the wallet, and see what is still open."
        }
        actions={user?.role ? <StatusBadge status={user.role} /> : undefined}
      />

      <div className={vendor ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 lg:grid-cols-2"}>
        {!vendor && (
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
                  ? "A top-up is credited after Paytrix accepts it."
                  : "A Client Admin requests a top-up when more funds are needed."}
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Wallet size={16} />
            </span>
          </div>
          {user?.role === "CLIENT_ADMIN" && !vendor && (
            <Button icon={<Plus size={16} />} onClick={() => router.push("/client/wallet")}>
              Top up wallet
            </Button>
          )}
        </section>
        )}

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
          {!vendor && (
            <Button icon={<Send size={16} />} onClick={() => router.push("/client/my-dues")}>
              {pending > 0 ? "Pay bills" : "My Payments"}
            </Button>
          )}
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
          onClick={() => router.push(vendor ? "/client/assigned-bills" : "/client/managed-bills")}
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <FileText size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">{vendor ? "Assigned bills" : "Managed bills"}</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {vendor ? "Pay the biller, then mark the bill paid for Paytrix to verify." : "Add a bill and follow each cycle."}
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
