"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Client } from "@/lib/types";
import { ConfirmAction } from "./ConfirmAction";
import { formatPercent, formatRange, type CommissionRange } from "./format";

interface Named { id: string; name: string }
interface DraftVendor { id: string; percent: string }

export function RuleForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [ranges, setRanges] = useState<CommissionRange[]>([]);
  const [rangesReady, setRangesReady] = useState(false);
  const [categories, setCategories] = useState<Named[]>([]);
  const [providers, setProviders] = useState<Named[]>([]);
  const [vendors, setVendors] = useState<Client[]>([]);
  const [rangeId, setRangeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [selected, setSelected] = useState<DraftVendor[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    apiFetch<CommissionRange[]>("/api/v1/paytrix/commissions/ranges")
      .then(setRanges)
      .catch(() => setRanges([]))
      .finally(() => setRangesReady(true));
    apiFetch<Array<{ categoryId: string; name: string; enabled: boolean }>>("/api/v1/paytrix/categories")
      .then((rows) => setCategories(rows.filter((row) => row.enabled).map((row) => ({ id: row.categoryId, name: row.name }))))
      .catch(() => setCategories([]));
    apiFetch<Client[]>("/api/v1/paytrix/clients")
      .then((rows) => setVendors(rows.filter((row) => row.clientType === "VENDOR" && (row.status === "ACTIVE" || row.status === "PENDING"))))
      .catch(() => setVendors([]));
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setProviders([]);
      return;
    }
    apiFetch<Array<{ billerId: string; name: string }>>(
      `/api/v1/paytrix/commissions/providers?categoryId=${encodeURIComponent(categoryId)}`,
    )
      .then((rows) => {
        const next = rows.map((row) => ({ id: row.billerId, name: row.name || row.billerId }));
        setProviders(next);
        setProviderId((current) => (next.some((item) => item.id === current) ? current : ""));
      })
      .catch(() => setProviders([]));
  }, [categoryId]);

  function toggleVendor(id: string) {
    setSelected((current) => (
      current.some((vendor) => vendor.id === id)
        ? current.filter((vendor) => vendor.id !== id)
        : [...current, { id, percent: "" }]
    ));
  }

  function setPercent(id: string, percent: string) {
    setSelected((current) => current.map((vendor) => (vendor.id === id ? { ...vendor, percent } : vendor)));
  }

  function review(event: React.FormEvent) {
    event.preventDefault();
    if (!rangeId || !categoryId || !providerId || selected.length === 0) return;
    const percents = selected.map((vendor) => vendor.percent.trim()).filter(Boolean);
    if (new Set(percents).size !== percents.length) {
      toast.error("Two vendors cannot use the same commission");
      return;
    }
    setConfirming(true);
  }

  async function save() {
    setSaving(true);
    try {
      const created = await apiFetch<{ rule: { id: string } }>("/api/v1/paytrix/commissions/rules", {
        method: "POST",
        body: {
          categoryId,
          providerBillerId: providerId,
          rangeId,
          vendors: selected.map((vendor) => ({
            vendorClientId: vendor.id,
            commissionPercent: vendor.percent.trim() ? Number(vendor.percent) : null,
          })),
        },
      });
      toast.success("Rule saved");
      onClose();
      router.push(`/paytrix/commissions/${created.rule.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save this rule");
    } finally {
      setSaving(false);
    }
  }

  const range = ranges.find((item) => item.id === rangeId);
  const categoryName = categories.find((item) => item.id === categoryId)?.name ?? "—";
  const providerName = providers.find((item) => item.id === providerId)?.name ?? "—";

  return (
    <>
    <Modal
      open
      onClose={saving ? () => undefined : onClose}
      size="xl"
      title="Add rule"
      description="Choose one amount range and the vendors who can bid. A percent you enter is live immediately. A blank percent waits for that vendor to submit a rate."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button form="rule-form" type="submit" disabled={!rangeId || !categoryId || !providerId || selected.length === 0 || saving}>
            Review
          </Button>
        </>
      }
    >
      <form id="rule-form" onSubmit={review} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Amount range</legend>
          {!rangesReady ? (
            <p className="text-xs text-slate-500">Loading ranges…</p>
          ) : ranges.length === 0 ? (
            <p className="text-xs text-slate-500">Add amount ranges in Settings before creating a rule.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ranges.map((range) => {
                const checked = rangeId === range.id;
                return (
                  <label
                    key={range.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${checked ? "border-indigo-300 bg-indigo-50 text-indigo-900" : "border-slate-200 text-slate-700"}`}
                  >
                    <input type="radio" name="range" checked={checked} onChange={() => setRangeId(range.id)} />
                    {formatRange(range.minAmount, range.maxAmount)}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Category" required value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setProviderId(""); }}>
            <option value="">Select a category</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
          <SelectField label="Provider" required value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">Select a provider</option>
            {providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Vendors</legend>
          {vendors.length === 0 ? (
            <p className="text-xs text-slate-500">No vendors are available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {vendors.map((vendor) => {
                const draft = selected.find((item) => item.id === vendor.id);
                return (
                  <div key={vendor.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex-row sm:items-center">
                    <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-800">
                      <input type="checkbox" checked={Boolean(draft)} onChange={() => toggleVendor(vendor.id)} />
                      {vendor.clientName}
                    </label>
                    {draft && (
                      <Field
                        label="Commission %"
                        type="number"
                        min={0.001}
                        max={100}
                        step="0.001"
                        value={draft.percent}
                        placeholder="Leave blank to wait for a bid"
                        onChange={(e) => setPercent(vendor.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
    <ConfirmAction
      open={confirming}
      raised
      title="Save this rule"
      summary="A percent you entered is live immediately. A blank percent waits for that vendor to submit a rate."
      confirmLabel="Save rule"
      loading={saving}
      details={[
        { label: "Category", value: categoryName },
        { label: "Provider", value: providerName },
        { label: "Amount", value: range ? formatRange(range.minAmount, range.maxAmount) : "—" },
        {
          label: "Vendors",
          value: selected.map((item) => {
            const name = vendors.find((vendor) => vendor.id === item.id)?.clientName ?? "Vendor";
            return `${name} ${item.percent.trim() ? formatPercent(Number(item.percent)) : "no rate yet"}`;
          }).join(", "),
        },
      ]}
      onCancel={() => { if (!saving) setConfirming(false); }}
      onConfirm={save}
    />
  </>
  );
}
