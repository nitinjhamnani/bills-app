"use client";

import { useEffect, useState } from "react";
import { BadgePercent } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ListCard } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TBody, TD, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { ClientAccount } from "@/lib/types";
import { ConfirmAction, ruleFacts } from "@/app/paytrix/commissions/ConfirmAction";
import { formatPercent, formatRange, type VendorCommissionRule } from "@/app/paytrix/commissions/format";

export default function VendorRulesPage() {
  const toast = useToast();
  const canPropose = getUser()?.role === "CLIENT_ADMIN";
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [rules, setRules] = useState<VendorCommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState<VendorCommissionRule | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    apiFetch<ClientAccount>("/api/v1/client/account")
      .then(async (next) => {
        setAccount(next);
        if (next.clientType !== "VENDOR") return;
        setRules(await apiFetch<VendorCommissionRule[]>("/api/v1/client/commission-rules"));
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load rules"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPropose(rule: VendorCommissionRule) {
    setProposing(rule);
    setDraft("");
    setConfirming(false);
  }

  function reviewProposal() {
    const value = Number(draft);
    if (!proposing || !draft.trim() || Number.isNaN(value) || value <= 0 || value > 100) {
      toast.error("Enter a commission between 0.001 and 100");
      return;
    }
    setConfirming(true);
  }

  async function propose() {
    if (!proposing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/client/commission-rules/${proposing.id}/proposals`, {
        method: "POST",
        body: { commissionPercent: Number(draft) },
      });
      toast.success("Commission sent to Paytrix");
      setConfirming(false);
      setProposing(null);
      setRules(await apiFetch<VendorCommissionRule[]>("/api/v1/client/commission-rules"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send this commission");
    } finally {
      setSaving(false);
    }
  }

  if (account && account.clientType !== "VENDOR") {
    return <PageHeader title="Commissions" description="Commission rules are assigned to vendor accounts." />;
  }

  const active = account?.status === "ACTIVE";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Commissions"
        description="A rate you submit stays pending until Paytrix approves it. A rate Paytrix enters is already approved."
      />
      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={BadgePercent}
            title="No rules assigned"
            description="When Paytrix adds this account to a rule, it shows up here."
          />
        ) : (
          <Table>
            <THead columns={["Category", "Provider", "Amount", "Commission", "Status", ""]} />
            <TBody>
              {rules.map((rule) => {
                const approved = rule.commissionPercent != null && rule.pendingCommissionPercent == null;
                return (
                <TR key={rule.id}>
                  <TD className="font-semibold text-slate-900">{rule.categoryName}</TD>
                  <TD>{rule.providerName}</TD>
                  <TD>{formatRange(rule.range.minAmount, rule.range.maxAmount)}</TD>
                  <TD className="whitespace-normal">
                    <span className="font-semibold text-slate-900">{formatPercent(rule.commissionPercent)}</span>
                    {rule.pendingCommissionPercent != null && (
                      <p className="mt-1 text-amber-800">
                        {formatPercent(rule.pendingCommissionPercent)} is waiting for Paytrix
                      </p>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge status={approved ? "APPROVED" : "PENDING"} label={approved ? "Approved" : "Pending"} />
                  </TD>
                  <TD>
                    {canPropose && active && rule.pendingCommissionPercent == null && (
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => openPropose(rule)}>
                          {rule.commissionPercent == null ? "Submit rate" : "Propose rate"}
                        </Button>
                      </div>
                    )}
                  </TD>
                </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={proposing != null}
        onClose={() => { if (!saving) { setProposing(null); setConfirming(false); } }}
        title={proposing?.commissionPercent == null ? "Submit a commission" : "Propose a commission"}
        description={
          proposing
            ? `${proposing.categoryName} · ${proposing.providerName}. ${
              proposing.commissionPercent == null
                ? "No rate is live yet."
                : `The current rate is ${formatPercent(proposing.commissionPercent)}.`
            }`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setProposing(null)}>Cancel</Button>
            <Button onClick={reviewProposal} disabled={saving}>Review</Button>
          </>
        }
      >
        <Field
          label="Commission %"
          type="number"
          min={0.001}
          max={100}
          step="0.001"
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </Modal>
      {proposing && (
        <ConfirmAction
          open={confirming}
          raised
          title={proposing.commissionPercent == null ? "Submit this rate" : "Propose this rate"}
          summary={
            proposing.commissionPercent == null
              ? "Paytrix has to accept this before it becomes the live rate."
              : "The current rate stays live until Paytrix accepts this proposal."
          }
          confirmLabel="Send to Paytrix"
          loading={saving}
          details={[
            ...ruleFacts(proposing),
            { label: "Current rate", value: formatPercent(proposing.commissionPercent) },
            { label: "Your rate", value: formatPercent(Number(draft)) },
          ]}
          onCancel={() => { if (!saving) setConfirming(false); }}
          onConfirm={propose}
        />
      )}
    </div>
  );
}
