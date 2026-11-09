"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ListCard } from "@/components/ui/Card";
import { Field, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { Client } from "@/lib/types";
import { ConfirmAction, ruleFacts, type ActionDetail } from "../ConfirmAction";
import {
  formatPercent,
  formatRange,
  historyText,
  type CommissionHistoryEntry,
  type CommissionRule,
} from "../format";

type PendingAction = {
  title: string;
  summary: string;
  details: ActionDetail[];
  confirmLabel: string;
  danger?: boolean;
  raised?: boolean;
  action: () => Promise<void>;
};

interface Detail {
  rule: CommissionRule;
  history: CommissionHistoryEntry[];
}

export default function CommissionRulePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const canEdit = getUser()?.role === "ORGANISATION_ADMIN";
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [rateFor, setRateFor] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Client[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [percent, setPercent] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await apiFetch<Detail>(`/api/v1/paytrix/commissions/rules/${params.id}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load this rule");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (!addOpen) return;
    apiFetch<Client[]>("/api/v1/paytrix/clients")
      .then((rows) => setVendors(rows.filter((row) => row.clientType === "VENDOR" && (row.status === "ACTIVE" || row.status === "PENDING"))))
      .catch(() => setVendors([]));
  }, [addOpen]);

  async function confirmPending() {
    if (!pending) return;
    setConfirming(true);
    try {
      await pending.action();
      setPending(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update this rule");
    } finally {
      setConfirming(false);
    }
  }

  function askVendor(event: React.FormEvent) {
    event.preventDefault();
    if (!vendorId || !detail) return;
    const name = vendors.find((vendor) => vendor.id === vendorId)?.clientName ?? "Selected vendor";
    const typed = percent.trim();
    setPending({
      title: "Add this vendor",
      summary: typed
        ? "The percent is live as soon as you confirm. The vendor pays it to Paytrix."
        : "No rate is live yet. The vendor can submit a bid for Paytrix to accept.",
      details: [
        ...ruleFacts(detail.rule),
        { label: "Vendor", value: name },
        { label: "Commission", value: typed ? formatPercent(Number(typed)) : "None yet" },
      ],
      confirmLabel: "Add vendor",
      raised: true,
      action: async () => {
        await apiFetch(`/api/v1/paytrix/commissions/rules/${params.id}/vendors`, {
          method: "POST",
          body: { vendorClientId: vendorId, commissionPercent: typed ? Number(typed) : null },
        });
        toast.success("Vendor added");
        setAddOpen(false);
        setVendorId("");
        setPercent("");
        await load();
      },
    });
  }

  function askRate(event: React.FormEvent) {
    event.preventDefault();
    if (!rateFor || !detail || !percent.trim()) return;
    const seat = detail.rule.vendors.find((item) => item.vendorClientId === rateFor);
    setPending({
      title: "Save this rate",
      summary: "This becomes the live rate immediately. A different pending bid is rejected. Waiting bills use this rate when the vendor marks them paid.",
      details: [
        ...ruleFacts(detail.rule),
        { label: "Vendor", value: seat?.vendorName ?? "Vendor" },
        { label: "Current rate", value: formatPercent(seat?.commissionPercent) },
        { label: "New rate", value: formatPercent(Number(percent)) },
      ],
      confirmLabel: "Save rate",
      raised: true,
      action: async () => {
        await apiFetch(`/api/v1/paytrix/commissions/rules/${params.id}/vendors/${rateFor}/rate`, {
          method: "PUT",
          body: { commissionPercent: Number(percent) },
        });
        toast.success("Commission saved");
        setRateFor(null);
        setPercent("");
        await load();
      },
    });
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
        <PageHeader title="Rule" breadcrumbs={["Commissions", "Rule"]} />
        <TableSkeleton cols={4} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
        <PageHeader title="Rule not found" breadcrumbs={["Commissions", "Rule"]} />
        <Button variant="outline" onClick={() => router.push("/paytrix/commissions")}>Back to commissions</Button>
      </div>
    );
  }

  const { rule, history } = detail;
  const taken = new Set(rule.vendors.map((seat) => seat.vendorClientId));
  const available = vendors.filter((vendor) => !taken.has(vendor.id));

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <PageHeader
        title={rule.categoryName}
        description={`${rule.providerName} · ${formatRange(rule.range.minAmount, rule.range.maxAmount)}. The highest live rate is assigned, and that vendor pays it to Paytrix.`}
        breadcrumbs={["Commissions", rule.categoryName]}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/paytrix/commissions")}>Back</Button>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setPending({
                  title: rule.active ? "Deactivate this rule" : "Activate this rule",
                  summary: rule.active
                    ? "New bills in this range stay with Paytrix. Deactivation is refused while a vendor still has a waiting bill."
                    : "The highest live rate on this rule can be assigned again.",
                  details: [
                    ...ruleFacts(rule),
                    { label: "Change", value: rule.active ? "Active → Inactive" : "Inactive → Active" },
                  ],
                  confirmLabel: rule.active ? "Deactivate" : "Activate",
                  danger: rule.active,
                  action: async () => {
                    await apiFetch(`/api/v1/paytrix/commissions/rules/${rule.id}/active`, {
                      method: "PATCH",
                      body: { active: !rule.active },
                    });
                    toast.success(rule.active ? "Rule deactivated" : "Rule activated");
                    await load();
                  },
                })}
              >
                {rule.active ? "Deactivate" : "Activate"}
              </Button>
            )}
          </>
        }
      />

      <div className="flex items-center gap-2">
        <StatusBadge status={rule.active ? "ACTIVE" : "DISABLED"} label={rule.active ? "Active" : "Inactive"} />
        <span className="text-xs font-medium text-slate-500">
          Highest live rate {formatPercent(rule.highestCommissionPercent)}
        </span>
      </div>

      <ListCard>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Vendors</h2>
          {canEdit && <Button size="sm" onClick={() => setAddOpen(true)}>Add vendor</Button>}
        </div>
        <Table>
          <THead columns={["Vendor", "Live rate", "Bid", "Status", ""]} />
          <TBody>
            {rule.vendors.length === 0 ? (
              <TR>
                <TD colSpan={5}>No vendors on this rule yet.</TD>
              </TR>
            ) : rule.vendors.map((seat) => (
              <TR key={seat.id}>
                <TD className="font-semibold text-slate-900">{seat.vendorName}</TD>
                <TD className="font-semibold text-slate-900">{formatPercent(seat.commissionPercent)}</TD>
                <TD>
                  {seat.pendingCommissionPercent != null ? (
                    <span className="text-amber-800">{formatPercent(seat.pendingCommissionPercent)} waiting</span>
                  ) : "—"}
                </TD>
                <TD>
                  <StatusBadge status={seat.active ? "ACTIVE" : "DISABLED"} label={seat.active ? "In contest" : "Paused"} />
                </TD>
                <TD>
                  {canEdit && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {seat.pendingProposalId && (
                        <>
                          <Button size="sm" onClick={() => setPending({
                            title: "Accept this bid",
                            summary: "This percent becomes the vendor's live rate. A bill already assigned stays with that vendor.",
                            details: [
                              ...ruleFacts(rule),
                              { label: "Vendor", value: seat.vendorName },
                              { label: "Live rate", value: formatPercent(seat.commissionPercent) },
                              { label: "Bid", value: formatPercent(seat.pendingCommissionPercent) },
                            ],
                            confirmLabel: "Accept bid",
                            action: async () => {
                              await apiFetch(`/api/v1/paytrix/commissions/proposals/${seat.pendingProposalId}/accept`, { method: "POST" });
                              toast.success("Bid accepted");
                              await load();
                            },
                          })}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => setPending({
                            title: "Reject this bid",
                            summary: "The bid is declined. The live rate stays as it is.",
                            details: [
                              ...ruleFacts(rule),
                              { label: "Vendor", value: seat.vendorName },
                              { label: "Live rate", value: formatPercent(seat.commissionPercent) },
                              { label: "Bid", value: formatPercent(seat.pendingCommissionPercent) },
                            ],
                            confirmLabel: "Reject bid",
                            danger: true,
                            action: async () => {
                              await apiFetch(`/api/v1/paytrix/commissions/proposals/${seat.pendingProposalId}/reject`, { method: "POST" });
                              toast.success("Bid rejected");
                              await load();
                            },
                          })}>Reject</Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setRateFor(seat.vendorClientId); setPercent(seat.commissionPercent == null ? "" : String(seat.commissionPercent)); }}>Enter rate</Button>
                      <Button size="sm" variant="outline" onClick={() => setPending({
                        title: seat.active ? "Pause this vendor" : "Resume this vendor",
                        summary: seat.active
                          ? "The vendor keeps the rate but is left out of new assignments. Pause is refused while they still have a waiting bill."
                          : "This vendor can be assigned again when their rate is the highest live rate.",
                        details: [
                          ...ruleFacts(rule),
                          { label: "Vendor", value: seat.vendorName },
                          { label: "Live rate", value: formatPercent(seat.commissionPercent) },
                          { label: "Change", value: seat.active ? "In contest → Paused" : "Paused → In contest" },
                        ],
                        confirmLabel: seat.active ? "Pause" : "Resume",
                        danger: seat.active,
                        action: async () => {
                          await apiFetch(`/api/v1/paytrix/commissions/rules/${rule.id}/vendors/${seat.vendorClientId}/active`, {
                            method: "PATCH",
                            body: { active: !seat.active },
                          });
                          toast.success(seat.active ? "Vendor paused" : "Vendor resumed");
                          await load();
                        },
                      })}>
                        {seat.active ? "Pause" : "Resume"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPending({
                        title: "Remove this vendor",
                        summary: "The vendor leaves the rule and a pending bid is deleted. Removal is refused while they still have a waiting bill.",
                        details: [
                          ...ruleFacts(rule),
                          { label: "Vendor", value: seat.vendorName },
                          { label: "Live rate", value: formatPercent(seat.commissionPercent) },
                        ],
                        confirmLabel: "Remove vendor",
                        danger: true,
                        action: async () => {
                          await apiFetch(`/api/v1/paytrix/commissions/rules/${rule.id}/vendors/${seat.vendorClientId}`, { method: "DELETE" });
                          toast.success("Vendor removed");
                          await load();
                        },
                      })}>Remove</Button>
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <ListCard>
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">History</h2>
        </div>
        {history.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No changes yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-slate-800">{historyText(entry)}</span>
                <span className="text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {entry.actor ? ` · ${entry.actor}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      <Modal
        open={addOpen}
        onClose={() => { if (!confirming) setAddOpen(false); }}
        title="Add vendor"
        description="A percent you enter is live immediately. Leave it blank and the vendor can submit a bid."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button form="add-vendor" type="submit" disabled={!vendorId || confirming}>Review</Button>
          </>
        }
      >
        <form id="add-vendor" onSubmit={askVendor} className="flex flex-col gap-4">
          <SelectField label="Vendor" required value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select a vendor</option>
            {available.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.clientName}</option>)}
          </SelectField>
          <Field label="Commission %" type="number" min={0.001} max={100} step="0.001" value={percent} placeholder="Optional" onChange={(e) => setPercent(e.target.value)} />
        </form>
      </Modal>

      <Modal
        open={rateFor != null}
        onClose={() => { if (!confirming) setRateFor(null); }}
        title="Enter commission"
        description="This rate is live as soon as you save it. The vendor pays it to Paytrix."
        footer={
          <>
            <Button variant="outline" onClick={() => setRateFor(null)}>Cancel</Button>
            <Button form="enter-rate" type="submit" disabled={confirming}>Review</Button>
          </>
        }
      >
        <form id="enter-rate" onSubmit={askRate}>
          <Field label="Commission %" type="number" min={0.001} max={100} step="0.001" required value={percent} onChange={(e) => setPercent(e.target.value)} />
        </form>
      </Modal>
      <ConfirmAction
        open={pending != null}
        title={pending?.title ?? ""}
        summary={pending?.summary ?? ""}
        details={pending?.details ?? []}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        danger={pending?.danger}
        raised={pending?.raised}
        loading={confirming}
        onCancel={() => setPending(null)}
        onConfirm={confirmPending}
      />
    </div>
  );
}
