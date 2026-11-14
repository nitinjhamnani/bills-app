"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, PackageCheck, Wallet } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ProofModal } from "@/components/ProofModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { BillStatCard } from "@/components/ui/BillStatCard";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { BillPayment, ClientAnalytics, ClientType, WalletTopup } from "@/lib/types";

export function OverviewTab({ clientId, clientType }: { clientId: string; clientType?: ClientType }) {
  const toast = useToast();
  const vendor = clientType === "VENDOR";
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [assigned, setAssigned] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [topupsLoading, setTopupsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (vendor) {
          const bills = await apiFetch<BillPayment[]>(
            `/api/v1/paytrix/clients/${clientId}/assigned-bills`,
          );
          if (!cancelled) setAssigned(bills);
        } else {
          const data = await apiFetch<ClientAnalytics>(
            `/api/v1/clients/${clientId}/analytics`,
          );
          if (!cancelled) setAnalytics(data);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof ApiError ? err.message : "Failed to load analytics",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, vendor]);

  async function loadTopups() {
    setTopupsLoading(true);
    try {
      setTopups(
        await apiFetch<WalletTopup[]>(
          `/api/v1/clients/${clientId}/wallet/topups`,
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load top-ups",
      );
    } finally {
      setTopupsLoading(false);
    }
  }

  useEffect(() => {
    if (vendor) {
      setTopups([]);
      setTopupsLoading(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTopups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, vendor]);

  async function reviewTopup(id: string, approve: boolean) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/paytrix/wallet-topups/${id}/review`, {
        method: "POST",
        body: { approve },
      });
      toast.success(
        approve ? "Top-up accepted and wallet credited" : "Top-up rejected",
      );
      await loadTopups();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function stageOf(bill: BillPayment) {
    if (bill.reimbursedAt) return "REIMBURSED";
    return bill.vendorStage ?? "ASSIGNED";
  }

  function countStage(stage: "ASSIGNED" | "IN_PROGRESS" | "VENDOR_PAID" | "VERIFIED") {
    return assigned.filter((bill) => {
      const current = stageOf(bill);
      return stage === "VERIFIED" ? current === "VERIFIED" || current === "REIMBURSED" : current === stage;
    }).length;
  }

  function amountStage(stage: "ASSIGNED" | "IN_PROGRESS" | "VENDOR_PAID" | "VERIFIED") {
    return assigned
      .filter((bill) => {
        const current = stageOf(bill);
        return stage === "VERIFIED" ? current === "VERIFIED" || current === "REIMBURSED" : current === stage;
      })
      .reduce((total, bill) => total + bill.amount, 0);
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto">
      <div className={vendor ? "grid grid-cols-2 gap-4 lg:grid-cols-4" : "grid grid-cols-2 gap-4 lg:grid-cols-5"}>
        {vendor ? (
          loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <BillStatCard label="Assigned" count={countStage("ASSIGNED")} amount={amountStage("ASSIGNED")} icon={FileText} />
              <BillStatCard label="In progress" count={countStage("IN_PROGRESS")} amount={amountStage("IN_PROGRESS")} icon={Clock} tone="warning" />
              <BillStatCard label="Waiting for Paytrix" count={countStage("VENDOR_PAID")} amount={amountStage("VENDOR_PAID")} icon={Clock} />
              <BillStatCard label="Verified" count={countStage("VERIFIED")} amount={amountStage("VERIFIED")} icon={PackageCheck} tone="success" />
            </>
          )
        ) : loading || !analytics ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <BillStatCard
              label="Total bills"
              count={analytics.totalBills}
              amount={analytics.totalAmount}
              icon={FileText}
            />
            <BillStatCard
              label="Pending"
              count={analytics.pendingBills}
              amount={analytics.pendingAmount}
              icon={Clock}
              tone="warning"
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
            {!vendor && (
              <StatCard
                label="Wallet balance"
                value={`₹${analytics.walletBalance.toLocaleString("en-IN")}`}
                icon={Wallet}
              />
            )}
          </>
        )}
      </div>

      {vendor && (
        <p className="text-sm text-slate-500">
          These are bills assigned from corporates. The Bills tab lists every one. A bill appears in the vendor&apos;s Transactions only after Paytrix verifies it, and it stays on My Payments with the latest status.
        </p>
      )}

      {!vendor && <Card>
        <CardHeader
          title="Wallet top-up requests"
          description="Every top-up needs Paytrix review before the wallet is credited."
        />
        {topupsLoading ? (
          <TableSkeleton cols={5} rows={3} />
        ) : topups.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No top-up requests yet"
            description="This client hasn't submitted a top-up."
          />
        ) : (
          <Table>
            <THead columns={["Amount", "Payment mode", "Reference", "Status", "Requested", ""]} />
            <TBody>
              {topups.map((t) => (
                <TR key={t.id}>
                  <TD className="font-mono text-sm font-semibold text-slate-900">
                    ₹{t.amount.toLocaleString("en-IN")}
                  </TD>
                  <TD>{t.paymentMode}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span>{t.paymentReference ?? "—"}</span>
                      {t.hasProof && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setProofId(`/api/v1/clients/${clientId}/wallet/topups/${t.id}/proof`)}
                        >
                          View proof
                        </Button>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge status={t.status} />
                  </TD>
                  <TD className="text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TD>
                  <TD>
                    {t.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === t.id}
                          onClick={() => reviewTopup(t.id, true)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === t.id}
                          onClick={() => reviewTopup(t.id, false)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>}
      <ProofModal src={proofId} onClose={() => setProofId(null)} />
    </div>
  );
}
