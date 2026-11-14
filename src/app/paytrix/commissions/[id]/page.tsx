"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, History, Pencil, Trash2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ConfirmAction, commissionFacts } from "../ConfirmAction";
import { CommissionForm } from "../CommissionForm";
import { formatPercent, formatRange, formatWhen, type Commission, type CommissionLogEntry } from "../format";

const ACTION_LABEL: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  APPROVED: "Approved",
  ACTIVATED: "Activated",
  DEACTIVATED: "Deactivated",
  DELETED: "Deleted",
};

type PendingAction = {
  title: string;
  summary: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => Promise<void>;
};

export default function CommissionDetailPage() {
  const params = useParams<{ id: string }>();
  const commissionId = params.id;
  const router = useRouter();
  const toast = useToast();
  const canEdit = getUser()?.role === "ORGANISATION_ADMIN";

  const [commission, setCommission] = useState<Commission | null>(null);
  const [history, setHistory] = useState<CommissionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [row, log] = await Promise.all([
        apiFetch<Commission>(`/api/v1/paytrix/commissions/${commissionId}`),
        apiFetch<CommissionLogEntry[]>(`/api/v1/paytrix/commissions/${commissionId}/log`),
      ]);
      setCommission(row);
      setHistory(log);
    } catch (err) {
      setCommission(null);
      toast.error(err instanceof ApiError ? err.message : "Failed to load this commission");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commissionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function confirmPending() {
    if (!pending) return;
    setConfirming(true);
    try {
      await pending.action();
      setPending(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update this commission");
    } finally {
      setConfirming(false);
    }
  }

  function askDelete() {
    if (!commission) return;
    setPending({
      title: "Delete this commission",
      summary: "The commission is removed. This is refused while the vendor still holds an unpaid bill on it.",
      confirmLabel: "Delete",
      danger: true,
      action: async () => {
        await apiFetch(`/api/v1/paytrix/commissions/${commission.id}`, { method: "DELETE" });
        toast.success("Commission deleted");
        router.push("/paytrix/commissions");
      },
    });
  }

  function askApprove() {
    if (!commission) return;
    setPending({
      title: "Approve this commission",
      summary: commission.isActive
        ? "Bills on this operator and amount can be assigned to this vendor once it is approved."
        : "It is approved. Turn it on from the commissions list when it should assign bills.",
      confirmLabel: "Approve",
      action: async () => {
        await apiFetch(`/api/v1/paytrix/commissions/${commission.id}/approve`, { method: "POST" });
        toast.success("Commission approved");
        await load();
      },
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Link href="/paytrix/commissions" className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={14} />
        Commissions
      </Link>
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : !commission ? (
        <Card className="p-6 text-sm text-slate-600">This commission could not be loaded.</Card>
      ) : (
        <>
          <PageHeader
            title={commission.operatorName}
            description={`${commission.vendorName} · ${commission.categoryName}`}
            actions={canEdit ? (
              <>
                {commission.status === "DRAFT" && (
                  <Button icon={<Check size={16} />} onClick={askApprove}>Approve</Button>
                )}
                <Button variant="outline" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>Update</Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={askDelete}>Delete</Button>
              </>
            ) : undefined}
          />

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap gap-1">
              <StatusBadge status={commission.status === "APPROVED" ? "APPROVED" : "PENDING"} label={commission.status === "APPROVED" ? "Approved" : "Draft"} />
              <StatusBadge status={commission.isActive ? "ACTIVE" : "DISABLED"} label={commission.isActive ? "Active" : "Inactive"} />
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Category" value={commission.categoryName} />
              <Fact label="Operator" value={commission.operatorName} />
              <Fact label="Vendor" value={commission.vendorName} />
              <Fact label="Amount" value={formatRange(commission.minRange, commission.maxRange)} />
              <Fact label="Commission" value={formatPercent(commission.commission)} />
              <Fact label="Created" value={`${formatWhen(commission.createdAt)}${commission.createdByName ? ` · ${commission.createdByName}` : ""}`} />
              <Fact label="Last change" value={`${formatWhen(commission.updatedAt)}${commission.updatedByName ? ` · ${commission.updatedByName}` : ""}`} />
            </dl>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">History</h2>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No changes have been recorded yet.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-slate-100">
                {history.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{ACTION_LABEL[entry.action] ?? entry.action}</span>
                      <span className="text-xs text-slate-500">{formatWhen(entry.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{entry.summary}</p>
                    <p className="text-xs text-slate-500">{entry.actorName || entry.actorUserId || "Unknown"}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {editing && (
            <CommissionForm
              editing={commission}
              onClose={(saved) => {
                setEditing(false);
                if (saved) load();
              }}
            />
          )}
          <ConfirmAction
            open={pending != null}
            title={pending?.title ?? ""}
            summary={pending?.summary ?? ""}
            details={commissionFacts(commission)}
            confirmLabel={pending?.confirmLabel ?? "Confirm"}
            danger={pending?.danger}
            loading={confirming}
            onCancel={() => setPending(null)}
            onConfirm={confirmPending}
          />
        </>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
