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
import { ListCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
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
  const canAct = user?.role === "VENDOR_ADMIN";
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
        description="Bills Paytrix assigns to you appear under Bill Payments. Verified settlements also appear under Transactions."
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

      <ListCard>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Assigned bills</h2>
            <p className="mt-0.5 text-xs text-slate-500">Recent bills currently assigned to this vendor account.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => router.push("/vendor/assigned-bills")}>
            Bill Payments
          </Button>
        </div>
        {loading ? (
          <TableSkeleton cols={5} rows={4} />
        ) : bills.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No assigned bills yet"
            description="Bills appear here once Paytrix assigns them to your vendor account."
          />
        ) : (
          <Table>
            <THead columns={["Biller", "Consumer", "Amount", "Status", ""]} />
            <TBody>
              {bills.slice(0, 8).map((bill) => {
                const stage = vendorStageBadge(vendorStage(bill));
                return (
                  <TR
                    key={bill.id}
                    className="cursor-pointer"
                    onClick={() => router.push("/vendor/assigned-bills")}
                  >
                    <TD>
                      <p className="font-semibold text-slate-900">{bill.billerName}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {bill.billServiceName}
                      </p>
                    </TD>
                    <TD>
                      <p className="font-mono text-xs font-semibold text-slate-800">
                        {bill.customerBillAccountNumber}
                      </p>
                      {bill.customerName && (
                        <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                          {bill.customerName}
                        </p>
                      )}
                    </TD>
                    <TD className="font-mono text-sm font-semibold text-slate-900">
                      {inr(bill.amount)}
                    </TD>
                    <TD>
                      <StatusBadge status={stage.status} label={stage.label} />
                    </TD>
                    <TD>
                      <ChevronRight size={16} className="ml-auto text-slate-300" />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </ListCard>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => router.push("/vendor/assigned-bills")}
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
            <Send size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Bill Payments</span>
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
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
