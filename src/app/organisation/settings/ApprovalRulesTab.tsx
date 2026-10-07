"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Pencil, Search, ShieldCheck } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { userInitials } from "@/components/UserMenu";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { ApprovalRule } from "@/lib/types";

const LABELS: Record<ApprovalRule["actionType"], string> = {
  BILL_PAYMENT: "Bill settlement",
  OFFLINE_TOPUP_CREDIT: "Wallet top-up credit",
};

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function ApprovalRulesTab({ onCount }: { onCount?: (count: number) => void }) {
  const toast = useToast();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ApprovalRule | null>(null);
  const [editing, setEditing] = useState<ApprovalRule | null>(null);
  const [minAmount, setMinAmount] = useState("");
  const [count, setCount] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const next = await apiFetch<ApprovalRule[]>("/api/v1/organisation/approval-rules");
      setRules(next);
      onCount?.(next.length);
      setSelected((current) =>
        current ? (next.find((rule) => rule.actionType === current.actionType) ?? null) : null,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load approval rules",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function openEdit(rule: ApprovalRule) {
    setEditing(rule);
    setMinAmount(String(rule.minAmount));
    setCount(String(rule.requiredApproverCount));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/organisation/approval-rules/${editing.actionType}`, {
        method: "PUT",
        body: {
          minAmount: Number(minAmount),
          requiredApproverCount: Number(count),
        },
      });
      toast.success("Approval rule updated");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rules;
    return rules.filter((rule) => {
      const label = LABELS[rule.actionType] ?? rule.actionType;
      return (
        label.toLowerCase().includes(query) ||
        rule.actionType.toLowerCase().includes(query)
      );
    });
  }, [rules, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListCard>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="relative sm:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search approval rules"
              className={searchClass}
            />
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={rules.length === 0 ? "No approval rules" : "No rules match"}
            description={
              rules.length === 0
                ? "Checker thresholds for bill settlement and wallet credits show up here."
                : "Try another name or clear the search."
            }
          />
        ) : (
          <Table>
            <THead columns={["Rule", "Threshold", "Approvers", ""]} />
            <TBody>
              {visible.map((rule) => {
                const label = LABELS[rule.actionType] ?? rule.actionType;
                return (
                  <TR
                    key={rule.actionType}
                    className="cursor-pointer"
                    onClick={() => setSelected(rule)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {userInitials(label)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{label}</p>
                          <p className="text-[11px] text-slate-400">
                            {rule.requiredApproverCount === 0
                              ? "Auto-approved"
                              : "Needs a checker"}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-sm font-semibold text-slate-900">
                      {inr(Number(rule.minAmount))}
                    </TD>
                    <TD className="text-slate-600">
                      {rule.requiredApproverCount} approver{rule.requiredApproverCount === 1 ? "" : "s"}
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

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Approval rule"
        description="Amounts at or above the threshold need this many checker approvals. Zero approvers auto-approves every amount."
        footer={
          selected && getUser()?.role === "ORGANISATION_ADMIN" ? (
            <Button icon={<Pencil size={16} />} onClick={() => openEdit(selected)}>
              Edit rule
            </Button>
          ) : undefined
        }
      >
        {selected && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <InfoField
                label="Action"
                value={LABELS[selected.actionType] ?? selected.actionType}
              />
              <InfoField label="Min amount" value={inr(Number(selected.minAmount))} />
              <InfoField
                label="Required approvers"
                value={String(selected.requiredApproverCount)}
              />
              <InfoField
                label={selected.requiredApproverCount === 0 ? "Every amount" : "Below the threshold"}
                value="Auto-approved"
              />
            </dl>
          </div>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit approval rule"
        description={
          editing
            ? `${LABELS[editing.actionType]}. Set required approvers to 0 to auto-approve every amount.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="approval-rule-form" loading={saving}>
              Save rule
            </Button>
          </>
        }
      >
        <form id="approval-rule-form" onSubmit={save} className="flex flex-col gap-4">
          <Field
            label="Min amount (INR)"
            type="number"
            min={0}
            required
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
          <Field
            label="Required approvers"
            type="number"
            min={0}
            required
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}
