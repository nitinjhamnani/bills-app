"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, Plus, SlidersHorizontal, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ListCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ConfirmAction, ruleFacts, type ActionDetail } from "./ConfirmAction";
import { formatPercent, formatRange, type CommissionRule } from "./format";
import { RuleForm } from "./RuleForm";

type PendingAction = {
  title: string;
  summary: string;
  details: ActionDetail[];
  confirmLabel: string;
  danger?: boolean;
  action: () => Promise<void>;
};

const ALL = "ALL";

export function RulesTab({ vendorId }: { vendorId?: string }) {
  const toast = useToast();
  const router = useRouter();
  const canEdit = getUser()?.role === "ORGANISATION_ADMIN";
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [vendor, setVendor] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [provider, setProvider] = useState(ALL);
  const [rangeId, setRangeId] = useState(ALL);
  const [proposal, setProposal] = useState(ALL);
  const [commissionMin, setCommissionMin] = useState("");
  const [commissionMax, setCommissionMax] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = vendorId ? `?vendorId=${vendorId}` : "";
      setRules(await apiFetch<CommissionRule[]>(`/api/v1/paytrix/commissions/rules${query}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const vendors = useMemo(() => {
    const map = new Map<string, string>();
    for (const rule of rules) {
      for (const seat of rule.vendors) map.set(seat.vendorClientId, seat.vendorName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "en-IN"));
  }, [rules]);
  const categories = useMemo(() => options(rules, (rule) => [rule.categoryId, rule.categoryName]), [rules]);
  const providers = useMemo(() => options(rules, (rule) => [rule.providerBillerId, rule.providerName]), [rules]);
  const ranges = useMemo(() => {
    const map = new Map<string, string>();
    for (const rule of rules) map.set(rule.range.id, formatRange(rule.range.minAmount, rule.range.maxAmount));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "en-IN"));
  }, [rules]);

  const commissionActive = Boolean(commissionMin.trim() || commissionMax.trim());
  const activeFilterCount = [
    !vendorId && vendor !== ALL,
    category !== ALL,
    provider !== ALL,
    rangeId !== ALL,
    proposal !== ALL,
    commissionActive,
  ].filter(Boolean).length;

  const visible = rules.filter((rule) => {
    if (!vendorId && vendor !== ALL && !rule.vendors.some((seat) => seat.vendorClientId === vendor)) return false;
    if (category !== ALL && rule.categoryId !== category) return false;
    if (provider !== ALL && rule.providerBillerId !== provider) return false;
    if (rangeId !== ALL && rule.range.id !== rangeId) return false;
    const waiting = rule.vendors.some((seat) => seat.pendingProposalId);
    if (proposal === "PENDING" && !waiting) return false;
    if (proposal === "CURRENT" && waiting) return false;
    return matchesNumber(rule.highestCommissionPercent, commissionMin, commissionMax);
  });

  function resetFilters() {
    setVendor(ALL);
    setCategory(ALL);
    setProvider(ALL);
    setRangeId(ALL);
    setProposal(ALL);
    setCommissionMin("");
    setCommissionMax("");
  }

  function askActive(rule: CommissionRule, active: boolean) {
    setPending({
      title: active ? "Activate this rule" : "Deactivate this rule",
      summary: active
        ? "The highest live rate on this rule can be assigned again."
        : "New bills in this range stay with Paytrix. Deactivation is refused while a vendor still has a waiting bill.",
      details: [
        ...ruleFacts(rule),
        { label: "Change", value: active ? "Inactive → Active" : "Active → Inactive" },
      ],
      confirmLabel: active ? "Activate" : "Deactivate",
      danger: !active,
      action: async () => {
        await apiFetch(`/api/v1/paytrix/commissions/rules/${rule.id}/active`, {
          method: "PATCH",
          body: { active },
        });
        toast.success(active ? "Rule activated" : "Rule deactivated");
        await load();
      },
    });
  }

  function askRemove(rule: CommissionRule) {
    setPending({
      title: "Remove this rule",
      summary: "The rule and its vendor rates are deleted. Removal is refused while a vendor still has a waiting bill.",
      details: [
        ...ruleFacts(rule),
        { label: "Vendors", value: rule.vendors.map((seat) => seat.vendorName).join(", ") || "None" },
        { label: "Highest rate", value: formatPercent(rule.highestCommissionPercent) },
      ],
      confirmLabel: "Remove rule",
      danger: true,
      action: async () => {
        await apiFetch(`/api/v1/paytrix/commissions/rules/${rule.id}`, { method: "DELETE" });
        toast.success("Rule removed");
        await load();
      },
    });
  }

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

  const columns = vendorId
    ? ["Category", "Provider", "Amount", "Commission", "Status", ""]
    : ["Category", "Provider", "Amount", "Vendors", "Highest", "Status", ""];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-slate-500">
          Open a rule to accept bids, enter a rate, or pause a vendor. The highest live rate is assigned.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" icon={<SlidersHorizontal size={16} />} onClick={() => setFilterOpen(true)}>
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {canEdit && !vendorId && (
            <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>Add rule</Button>
          )}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!vendorId && vendor !== ALL && (
            <FilterChip label={vendors.find(([id]) => id === vendor)?.[1] ?? vendor} onClear={() => setVendor(ALL)} />
          )}
          {category !== ALL && <FilterChip label={categories.find(([id]) => id === category)?.[1] ?? category} onClear={() => setCategory(ALL)} />}
          {provider !== ALL && <FilterChip label={providers.find(([id]) => id === provider)?.[1] ?? provider} onClear={() => setProvider(ALL)} />}
          {rangeId !== ALL && <FilterChip label={ranges.find(([id]) => id === rangeId)?.[1] ?? rangeId} onClear={() => setRangeId(ALL)} />}
          {proposal !== ALL && (
            <FilterChip label={proposal === "PENDING" ? "Bid waiting" : "No bid waiting"} onClear={() => setProposal(ALL)} />
          )}
          {commissionActive && (
            <FilterChip
              label={numberRangeLabel(commissionMin, commissionMax, "%")}
              onClear={() => { setCommissionMin(""); setCommissionMax(""); }}
            />
          )}
          <button type="button" onClick={resetFilters} className="min-h-11 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
            Clear filters
          </button>
        </div>
      )}

      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={columns.length} />
        ) : rules.length === 0 ? (
          <EmptyState
            icon={BadgePercent}
            title="No rules yet"
            description="Add a rule, choose the vendors, and enter a rate or wait for their bids."
            action={canEdit && !vendorId ? <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>Add rule</Button> : undefined}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No rules match"
            description="Try another category, provider, range, or commission."
            action={<Button variant="outline" onClick={resetFilters}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <THead columns={columns} />
            <TBody>
              {visible.map((rule) => {
                const seat = vendorId ? rule.vendors.find((item) => item.vendorClientId === vendorId) : undefined;
                const waiting = rule.vendors.filter((item) => item.pendingProposalId).length;
                return (
                  <TR
                    key={rule.id}
                    className={`cursor-pointer ${rule.active ? "" : "text-slate-400"}`}
                    onClick={() => router.push(`/paytrix/commissions/${rule.id}`)}
                  >
                    <TD className="font-semibold text-slate-900">{rule.categoryName}</TD>
                    <TD>{rule.providerName}</TD>
                    <TD>{formatRange(rule.range.minAmount, rule.range.maxAmount)}</TD>
                    {vendorId ? (
                      <TD className="font-semibold text-slate-900">{formatPercent(seat?.commissionPercent)}</TD>
                    ) : (
                      <TD>
                        {rule.vendors.map((item) => item.vendorName).join(", ") || "—"}
                        {waiting > 0 && <div className="mt-1 text-amber-800">{waiting} bid{waiting === 1 ? "" : "s"} waiting</div>}
                      </TD>
                    )}
                    {!vendorId && <TD className="font-semibold text-slate-900">{formatPercent(rule.highestCommissionPercent)}</TD>}
                    <TD>
                      <StatusBadge status={rule.active ? "ACTIVE" : "DISABLED"} label={rule.active ? "Active" : "Inactive"} />
                    </TD>
                    <TD>
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => askActive(rule, !rule.active)}>
                            {rule.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => askRemove(rule)}>Remove</Button>
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
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter rules"
        description="Narrow the list by vendor, category, provider, amount range, or commission."
        footer={
          <>
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
            <Button onClick={() => setFilterOpen(false)}>Done</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          {!vendorId && (
            <SelectField label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)}>
              <option value={ALL}>All</option>
              {vendors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </SelectField>
          )}
          <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={ALL}>All</option>
            {categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </SelectField>
          <SelectField label="Provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value={ALL}>All</option>
            {providers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </SelectField>
          <SelectField label="Amount range" value={rangeId} onChange={(e) => setRangeId(e.target.value)}>
            <option value={ALL}>All</option>
            {ranges.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </SelectField>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Min commission %" type="number" min={0} max={100} step="0.001" value={commissionMin} onChange={(e) => setCommissionMin(e.target.value)} placeholder="0" />
            <Field label="Max commission %" type="number" min={0} max={100} step="0.001" value={commissionMax} onChange={(e) => setCommissionMax(e.target.value)} placeholder="100" />
          </div>
          <SelectField label="Bids" value={proposal} onChange={(e) => setProposal(e.target.value)}>
            <option value={ALL}>All</option>
            <option value="PENDING">Waiting for Paytrix</option>
            <option value="CURRENT">No bid waiting</option>
          </SelectField>
        </div>
      </Modal>

      {formOpen && <RuleForm onClose={() => { setFormOpen(false); load(); }} />}
      <ConfirmAction
        open={pending != null}
        title={pending?.title ?? ""}
        summary={pending?.summary ?? ""}
        details={pending?.details ?? []}
        confirmLabel={pending?.confirmLabel ?? "Confirm"}
        danger={pending?.danger}
        loading={confirming}
        onCancel={() => setPending(null)}
        onConfirm={confirmPending}
      />
    </div>
  );
}

function options(rules: CommissionRule[], pick: (rule: CommissionRule) => [string, string]) {
  const map = new Map<string, string>();
  for (const rule of rules) {
    const [id, name] = pick(rule);
    if (id) map.set(id, name || id);
  }
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "en-IN"));
}

function matchesNumber(value: number | null, min: string, max: string) {
  const minN = min.trim() === "" ? null : Number(min);
  const maxN = max.trim() === "" ? null : Number(max);
  const hasMin = minN != null && Number.isFinite(minN);
  const hasMax = maxN != null && Number.isFinite(maxN);
  if (!hasMin && !hasMax) return true;
  if (value == null) return false;
  if (hasMin && value < minN) return false;
  if (hasMax && value > maxN) return false;
  return true;
}

function numberRangeLabel(min: string, max: string, suffix: string) {
  const hasMin = min.trim() !== "";
  const hasMax = max.trim() !== "";
  if (hasMin && hasMax) return `${min}${suffix} – ${max}${suffix}`;
  if (hasMin) return `From ${min}${suffix}`;
  if (hasMax) return `Up to ${max}${suffix}`;
  return "Commission";
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
    >
      {label}
      <X size={12} className="text-slate-400" />
    </button>
  );
}
