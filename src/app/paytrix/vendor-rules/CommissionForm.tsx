"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Field, SearchableSelect, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Client } from "@/lib/types";
import { formatRange, type Commission, type CommissionRange } from "./format";

interface Named { id: string; name: string }

const CATEGORY_OPTIONS = [
  { id: "Electricity", name: "Electricity" },
  { id: "Mobile Postpaid", name: "Mobile Postpaid" },
  { id: "LPG Gas", name: "LPG Gas" },
  { id: "Water", name: "Water" },
  { id: "Insurance", name: "Insurance" },
  { id: "Loan Repayment", name: "Loan Repayment" },
  { id: "Credit Card", name: "Credit Card" },
  { id: "Broadband Postpaid", name: "Broadband Postpaid" },
  { id: "Landline Postpaid", name: "Landline Postpaid" },
  { id: "Municipal Taxes", name: "Municipal Taxes" },
  { id: "Fastag", name: "FASTag" },
] as const;

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
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [vendors, setVendors] = useState<Client[]>([]);
  const [categoryId, setCategoryId] = useState<string>(CATEGORY_OPTIONS[0].id);
  const [operatorIds, setOperatorIds] = useState<string[]>([]);
  const [vendorId, setVendorId] = useState(editing?.vendorId ?? defaultVendorId ?? "");
  const [rangeId, setRangeId] = useState("");
  const [commission, setCommission] = useState(editing ? String(editing.commission) : "");
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<RuleIssues | null>(null);

  useEffect(() => {
    apiFetch<CommissionRange[]>("/api/v1/paytrix/commissions/ranges")
      .then((rows) => setRanges(rows.filter((range) => range.isActive)))
      .catch(() => setRanges([]));
    if (editing || defaultVendorId) return;
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
  }, [editing, defaultVendorId]);

  useEffect(() => {
    if (editing) return;
    let cancelled = false;
    setOperators([]);
    setOperatorsLoading(true);
    apiFetch<Array<{ billerId: string; name: string }>>(
      `/api/v1/paytrix/commissions/providers?categoryId=${encodeURIComponent(categoryId)}`,
    )
      .then((rows) => {
        if (cancelled) return;
        setOperators(rows.map((row) => ({ id: row.billerId, name: row.name || row.billerId })));
      })
      .catch((err) => {
        if (cancelled) return;
        setOperators([]);
        toast.error(err instanceof ApiError ? err.message : "Failed to load operators");
      })
      .finally(() => {
        if (!cancelled) setOperatorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, categoryId, toast]);

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
        toast.success("Commission updated");
        onClose(true);
        return;
      }
      const result = await apiFetch<CreateOutcome>("/api/v1/paytrix/commissions", {
        method: "POST",
        body: { ...body, categoryId, operatorIds, vendorId },
      });
      if (result.skipped.length === 0) {
        toast.success(result.created.length === 1 ? "Vendor rule saved" : `${result.created.length} vendor rules saved`);
        onClose(true);
        return;
      }
      setIssues({
        attempted: result.created.length + result.skipped.length,
        created: result.created.length,
        skipped: result.skipped,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save this commission");
    } finally {
      setSaving(false);
    }
  }

  const ready = (editing || (operatorIds.length > 0 && vendorId)) && rangeId !== "" && commission.trim() !== "";

  function acknowledgeIssues() {
    const createdAny = (issues?.created ?? 0) > 0;
    setIssues(null);
    if (createdAny) onClose(true);
  }

  return (
    <>
    <Modal
      open
      onClose={saving || issues ? () => undefined : () => onClose(false)}
      size="md"
      title={editing ? "Edit commission" : "Add vendor rule"}
      description={editing
        ? "The range and percent can change. Category, operator, and vendor stay as they are."
        : "Each selected operator becomes its own approved rule at this percent and range."}
      footer={
        <>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving || issues !== null}>
            Cancel
          </Button>
          <Button form="commission-form" type="submit" loading={saving} disabled={!ready || issues !== null}>{editing ? "Save changes" : "Save"}</Button>
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
              label="Category"
              value={categoryId}
              onChange={(next) => {
                if (next === categoryId) return;
                setCategoryId(next);
                setOperatorIds([]);
                setIssues(null);
              }}
              placeholder="Select a category..."
              searchPlaceholder="Search categories..."
              options={CATEGORY_OPTIONS.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            <SearchableSelect
              label="Operators"
              multiple
              value=""
              onChange={() => undefined}
              values={operatorIds}
              onValuesChange={(next) => {
                setOperatorIds(next);
                setIssues(null);
              }}
              loading={operatorsLoading}
              placeholder={operatorsLoading ? "Loading operators..." : "Select operators..."}
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
    {issues && (
      <InvalidRulesModal
        issues={issues}
        onOk={acknowledgeIssues}
      />
    )}
    </>
  );
}

interface CreateOutcome {
  created: Commission[];
  skipped: { operatorId: string; operatorName: string; message: string }[];
}

interface RuleIssues {
  attempted: number;
  created: number;
  skipped: CreateOutcome["skipped"];
}

function InvalidRulesModal({ issues, onOk }: { issues: RuleIssues; onOk: () => void }) {
  const invalid = issues.skipped.length;
  const countLabel = `${invalid} of ${issues.attempted} ${issues.attempted === 1 ? "rule" : "rules"} ${invalid === 1 ? "was" : "were"} invalid`;
  const createdLabel = issues.created === 0
    ? "No rules were created."
    : issues.created === 1
      ? "1 rule was created."
      : `${issues.created} rules were created.`;

  return (
    <Modal
      open
      raised
      size="xl"
      onClose={onOk}
      title={issues.created === 0 ? "Rules were not created" : "Some rules were not created"}
      description={issues.created === 0
        ? "Each row is a rule that failed validation."
        : "The valid rules are already saved. Each row is a rule that failed validation."}
      footer={
        <Button icon={<Check size={15} />} onClick={onOk}>OK</Button>
      }
    >
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-950">{countLabel}</p>
        <p className="mt-0.5 text-xs text-indigo-800/80">{createdLabel}</p>
      </div>
      <ul className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-slate-200">
        {issues.skipped.map((item) => (
          <li key={item.operatorId} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
            <p className="text-sm font-semibold text-slate-900">{item.operatorName}</p>
            <p className="mt-1 text-xs font-medium leading-5 text-rose-700">{item.message}</p>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function sameAmount(left: number | null | undefined, right: number | null | undefined) {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  return Number(left) === Number(right);
}
