"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Clock,
  FileText,
  MessageCircle,
  PackageCheck,
  Send,
  ArrowLeftRight,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { BillStatCard } from "@/components/ui/BillStatCard";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { OnboardingTracker, type CompanyDetails } from "@/components/OnboardingTracker";
import type { BillPayment, ClientAccount } from "@/lib/types";
import { vendorStageBadge, vendorStageOf } from "@/lib/vendor-stage";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function vendorStage(bill: BillPayment): string {
  return vendorStageOf(bill);
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const user = getUser();
  const canAct = user?.role === "CLIENT_ADMIN";
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepBusy, setStepBusy] = useState<"company" | "kyc" | "contract" | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<ClientAccount>("/api/v1/client/account"),
      apiFetch<BillPayment[]>("/api/v1/client/assigned-bills").catch(() => [] as BillPayment[]),
    ])
      .then(([nextAccount, nextBills]) => {
        setAccount(nextAccount);
        setBills(nextBills);
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load vendor dashboard"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitCompany(details: CompanyDetails) {
    setStepBusy("company");
    try {
      setAccount(await apiFetch<ClientAccount>("/api/v1/client/onboarding", { method: "PUT", body: details }));
      toast.success("Company information saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save company information");
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
          description="Company information, eKYC, then the contract. The rest of the vendor workspace opens after the contract is signed."
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
            onOpenEsign={() => router.push("/vendor/onboarding/esign")}
          />
        </div>
      </div>
    );
  }

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
        title={user?.displayName ? `Welcome back, ${user.displayName}` : "Dashboard"}
        description="Bills a corporate pays are assigned to you. Follow them on My Payments until Paytrix verifies them. Verified bills also appear under Transactions."
        actions={user?.role ? <StatusBadge status={user.role} /> : undefined}
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
          <Button size="sm" variant="outline" onClick={() => router.push("/vendor/assigned-bills")}>
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
                    onClick={() => router.push("/vendor/assigned-bills")}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => router.push("/vendor/assigned-bills")}
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Send size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">My Payments</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Pay the biller, then mark the bill paid for Paytrix to verify.
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/vendor/transactions")}
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <ArrowLeftRight size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Transactions</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Track bill reimbursements and commissions with Paytrix.
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/vendor/support")}
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <MessageCircle size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Support</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Raise a ticket if a payment or settlement needs help.
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
      </div>
    </div>
  );
}
