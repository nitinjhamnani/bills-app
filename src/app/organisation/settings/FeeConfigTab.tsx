"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Pencil, Percent, Plus, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, Switch } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { FeeConfig } from "@/lib/types";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ENABLED", label: "Enabled" },
  { key: "DISABLED", label: "Disabled" },
] as const;

type FeeFilter = (typeof FILTERS)[number]["key"];

const EMPTY_FORM = {
  billServiceCode: "",
  feeType: "FLAT" as "FLAT" | "PERCENTAGE",
  value: "",
  enabled: true,
};

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function feeKey(fee: Pick<FeeConfig, "billServiceCode">) {
  return fee.billServiceCode ?? "";
}

function serviceLabel(code: string | null) {
  return code ? code : "All services";
}

function feeAmount(fee: Pick<FeeConfig, "feeType" | "value">) {
  return fee.feeType === "FLAT" ? `₹${Number(fee.value).toLocaleString("en-IN")}` : `${fee.value}%`;
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function FeeConfigTab({ onCount }: { onCount?: (count: number) => void }) {
  const toast = useToast();
  const [fees, setFees] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const next = await apiFetch<FeeConfig[]>("/api/v1/organisation/fee-config");
      setFees(next);
      onCount?.(next.length);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load fee config",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const selected = fees.find((fee) => feeKey(fee) === selectedKey) ?? null;

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing(false);
    setSelectedKey(null);
    setFormOpen(true);
  }

  function openEdit(fee: FeeConfig) {
    setForm({
      billServiceCode: fee.billServiceCode ?? "",
      feeType: fee.feeType,
      value: String(fee.value),
      enabled: fee.enabled,
    });
    setEditing(true);
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/v1/organisation/fee-config", {
        method: "PUT",
        body: {
          billServiceCode: form.billServiceCode || null,
          feeType: form.feeType,
          value: Number(form.value),
          enabled: form.enabled,
        },
      });
      toast.success("Fee configuration saved");
      setFormOpen(false);
      setSelectedKey(form.billServiceCode);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return fees;
    return fees.filter((fee) => {
      const label = serviceLabel(fee.billServiceCode);
      return (
        label.toLowerCase().includes(query) ||
        fee.feeType.toLowerCase().includes(query) ||
        (fee.feeType === "FLAT" ? "flat" : "percentage").includes(query)
      );
    });
  }, [fees, search]);

  const counts = {
    ALL: searched.length,
    ENABLED: searched.filter((fee) => fee.enabled).length,
    DISABLED: searched.filter((fee) => !fee.enabled).length,
  };
  const visible = searched.filter((fee) => {
    if (filter === "ENABLED") return fee.enabled;
    if (filter === "DISABLED") return !fee.enabled;
    return true;
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                )}
              >
                {counts[item.key]}
              </span>
            </button>
          );
        })}
      </div>

      <ListCard>
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service or fee type"
              className={searchClass}
            />
          </div>
          <Button icon={<Plus size={16} />} onClick={openCreate}>
            Add fee
          </Button>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Percent}
            title={fees.length === 0 ? "No fees configured" : "No fees match"}
            description={
              fees.length === 0
                ? "Add a convenience fee to charge it when a client pays a bill."
                : "Try another status or clear the search."
            }
            action={
              fees.length === 0 ? (
                <Button icon={<Plus size={16} />} onClick={openCreate}>
                  Add fee
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead columns={["Applies to", "Fee", "Status", ""]} />
            <TBody>
              {visible.map((fee) => {
                const label = serviceLabel(fee.billServiceCode);
                return (
                  <TR
                    key={feeKey(fee) || "ALL"}
                    className="cursor-pointer"
                    onClick={() => setSelectedKey(feeKey(fee))}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {userInitials(label)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{label}</p>
                          <p className="text-[11px] text-slate-400">
                            {fee.billServiceCode ? "This service only" : "Every service"}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-sm font-semibold text-slate-900">
                      {feeAmount(fee)}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={fee.feeType} />
                        <StatusBadge status={fee.enabled ? "ENABLED" : "DISABLED"} />
                      </div>
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
        open={selected !== null && !formOpen}
        onClose={() => setSelectedKey(null)}
        title="Convenience fee"
        description="A service-specific fee wins over the fee that applies to every service."
        footer={
          selected ? (
            <Button icon={<Pencil size={16} />} onClick={() => openEdit(selected)}>
              Edit fee
            </Button>
          ) : undefined
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selected.feeType} />
              <StatusBadge status={selected.enabled ? "ENABLED" : "DISABLED"} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <InfoField label="Applies to" value={serviceLabel(selected.billServiceCode)} />
                <InfoField label="Amount" value={feeAmount(selected)} />
                <InfoField
                  label="Type"
                  value={selected.feeType === "FLAT" ? "Flat (INR)" : "Percentage"}
                />
                <InfoField label="Status" value={selected.enabled ? "Enabled" : "Disabled"} />
              </dl>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Update fee" : "Add fee"}
        description="Leave the bill-service code blank to apply this fee to every service."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="fee-form" loading={saving}>
              Save fee
            </Button>
          </>
        }
      >
        <form id="fee-form" onSubmit={save} className="flex flex-col gap-4">
          <Field
            label="Bill service code"
            hint="Blank applies to every service. A code already in use updates that fee."
            value={form.billServiceCode}
            onChange={(e) =>
              setForm({
                ...form,
                billServiceCode: e.target.value.toUpperCase(),
              })
            }
            placeholder="ELECTRICITY"
            readOnly={editing}
          />
          <SelectField
            label="Type"
            value={form.feeType}
            onChange={(e) =>
              setForm({
                ...form,
                feeType: e.target.value as "FLAT" | "PERCENTAGE",
              })
            }
          >
            <option value="FLAT">Flat (INR)</option>
            <option value="PERCENTAGE">Percentage</option>
          </SelectField>
          <Field
            label="Value"
            type="number"
            min={0}
            step="0.01"
            required
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Enabled</p>
              <p className="mt-0.5 text-xs text-slate-500">Charged when a client pays a bill.</p>
            </div>
            <Switch
              checked={form.enabled}
              onChange={(checked) => setForm({ ...form, enabled: checked })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
