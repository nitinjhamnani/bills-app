"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Field, SearchableSelect, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Client } from "@/lib/types";
import { formatRange, type Commission, type CommissionRange } from "./format";

interface Named { id: string; name: string }

const DEFAULT_CATEGORY_ID = "Electricity";

/** Adds an approved commission, or edits the range and rate of one. */
export function CommissionForm({
  editing,
  defaultVendorId,
  onClose,
}: {
  editing?: Commission;
  defaultVendorId?: string;
  onClose: (saved: boolean) => void;
}) {
  const toast = useToast();
  const [ranges, setRanges] = useState<CommissionRange[]>([]);
  const [operators, setOperators] = useState<Named[]>([]);
  const [vendors, setVendors] = useState<Client[]>([]);
  const categoryId = editing?.categoryCode ?? DEFAULT_CATEGORY_ID;
  const [operatorId, setOperatorId] = useState(editing?.operatorId ?? "");
  const [vendorId, setVendorId] = useState(editing?.vendorId ?? defaultVendorId ?? "");
  const [rangeId, setRangeId] = useState("");
  const [commission, setCommission] = useState(editing ? String(editing.commission) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<CommissionRange[]>("/api/v1/paytrix/commissions/ranges")
      .then((rows) => setRanges(rows.filter((range) => range.isActive)))
      .catch(() => setRanges([]));
    if (editing) return;
    apiFetch<Array<{ billerId: string; name: string }>>(
      `/api/v1/paytrix/commissions/providers?categoryId=${encodeURIComponent(DEFAULT_CATEGORY_ID)}`,
    )
      .then((rows) => setOperators(rows.map((row) => ({ id: row.billerId, name: row.name || row.billerId }))))
      .catch(() => setOperators([]));
    if (!defaultVendorId) {
      apiFetch<Client[]>("/api/v1/paytrix/clients")
        .then((rows) =>
          setVendors(
            rows.filter(
              (row) =>
                row.clientType === "VENDOR" &&
                (row.status === "ACTIVE" || row.status === "PENDING"),
            ),
          ),
        )
        .catch(() => setVendors([]));
    }
  }, [editing, defaultVendorId]);

  useEffect(() => {
    if (!editing || rangeId || ranges.length === 0) return;
    const match = ranges.find((range) => sameAmount(range.minAmount, editing.minRange) && sameAmount(range.maxAmount, editing.maxRange));
    if (match) setRangeId(match.id);
  }, [editing, rangeId, ranges]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const range = ranges.find((item) => item.id === rangeId);
    if (!range) return;
    setSaving(true);
    try {
      const body = {
        minRange: range.minAmount,
        maxRange: range.maxAmount,
        commission: Number(commission),
      };
      if (editing) {
        await apiFetch(`/api/v1/paytrix/commissions/${editing.id}`, { method: "PUT", body });
      } else {
        await apiFetch("/api/v1/paytrix/commissions", {
          method: "POST",
          body: { ...body, categoryId: DEFAULT_CATEGORY_ID, operatorId, vendorId },
        });
      }
      toast.success(editing ? "Commission updated" : "Commission saved");
      onClose(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save this commission");
    } finally {
      setSaving(false);
    }
  }

  const ready = (editing || (operatorId && vendorId)) && rangeId !== "" && commission.trim() !== "";

  return (
    <Modal
      open
      onClose={saving ? () => undefined : () => onClose(false)}
      size="md"
      title={editing ? "Edit commission" : "Add commission"}
      description={editing
        ? "The range and percent can change. Category, operator, and vendor stay as they are."
        : "A new commission is approved straight away. Its amount band comes from the range you pick."}
      footer={
        <>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
          <Button form="commission-form" type="submit" loading={saving} disabled={!ready}>{editing ? "Save changes" : "Save"}</Button>
        </>
      }
    >
      <form id="commission-form" onSubmit={save} className="flex flex-col gap-4">
        {editing ? (
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Category</dt>
            <dd className="font-medium text-slate-900">{editing.categoryName}</dd>
            <dt className="text-slate-500">Operator</dt>
            <dd className="font-medium text-slate-900">{editing.operatorName}</dd>
            <dt className="text-slate-500">Vendor</dt>
            <dd className="font-medium text-slate-900">{editing.vendorName}</dd>
          </dl>
        ) : (
          <>
            <SearchableSelect
              label="Operator"
              value={operatorId}
              onChange={setOperatorId}
              placeholder="Select an operator..."
              searchPlaceholder="Search operators..."
              options={operators.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            {!defaultVendorId && (
              <SearchableSelect
                label="Vendor"
                value={vendorId}
                onChange={setVendorId}
                placeholder="Select a vendor..."
                searchPlaceholder="Search vendors..."
                options={vendors.map((vendor) => ({
                  value: vendor.id,
                  label: vendor.clientName,
                  sublabel: vendor.clientCode ?? undefined,
                }))}
              />
            )}
          </>
        )}
        <SelectField label="Range" required value={rangeId} onChange={(e) => setRangeId(e.target.value)}>
          <option value="">{ranges.length === 0 ? "No ranges in Settings" : "Select a range"}</option>
          {ranges.map((range) => (
            <option key={range.id} value={range.id}>{formatRange(range.minAmount, range.maxAmount)}</option>
          ))}
        </SelectField>
        <Field
          label="Commission %"
          type="number"
          required
          min={0.001}
          max={100}
          step="0.001"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
        />
      </form>
    </Modal>
  );
}

function sameAmount(left: number | null | undefined, right: number | null | undefined) {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  return Number(left) === Number(right);
}
