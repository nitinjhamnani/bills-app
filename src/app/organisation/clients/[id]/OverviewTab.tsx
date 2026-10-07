"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, PackageCheck, Wallet } from "lucide-react";
import { apiFetch, ApiError, trackedFetch } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { BillStatCard } from "@/components/ui/BillStatCard";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { ClientAnalytics, WalletTopup } from "@/lib/types";
import { API_BASE_URL } from "@/lib/workspace";

export function OverviewTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [topupsLoading, setTopupsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch<ClientAnalytics>(
          `/api/v1/clients/${clientId}/analytics`,
        );
        if (!cancelled) setAnalytics(data);
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
  }, [clientId]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTopups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function reviewTopup(id: string, approve: boolean) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/organisation/wallet-topups/${id}/review`, {
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

  async function viewProof(documentId: string) {
    try {
      const res = await trackedFetch(
        `${API_BASE_URL}/api/v1/documents/${documentId}/file`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      toast.error("Could not open the payment proof");
    }
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading || !analytics ? (
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
            <StatCard
              label="Wallet balance"
              value={`₹${analytics.walletBalance.toLocaleString("en-IN")}`}
              icon={Wallet}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader
          title="Wallet top-up requests"
          description="Every top-up needs organisation review before the wallet is credited."
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
                      {t.documentId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewProof(t.documentId as string)}
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
      </Card>
    </div>
  );
}
