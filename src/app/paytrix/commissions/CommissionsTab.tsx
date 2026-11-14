"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, Plus, SlidersHorizontal } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ListCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField, Switch } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ConfirmAction, commissionFacts } from "./ConfirmAction";
import { CommissionForm } from "./CommissionForm";
import { formatPercent, formatRange, type Commission } from "./format";

const ALL = "ALL";

export function CommissionsTab({ vendorId }: { vendorId?: string }) {
  const toast = useToast();
  const router = useRouter();
  const canEdit = getUser()?.role === "ORGANISATION_ADMIN";
  const [rows, setRows] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [operator, setOperator] = useState(ALL);
  const [vendor, setVendor] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [pending, setPending] = useState<{ row: Commission; active: boolean } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = vendorId ? `?vendorId=${vendorId}` : "";
      setRows(await apiFetch<Commission[]>(`/api/v1/paytrix/commissions${query}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load commissions");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const operators = useMemo(() => options(rows, (row) => [row.operatorId, row.operatorName]), [rows]);
  const vendors = useMemo(() => options(rows, (row) => [row.vendorId, row.vendorName]), [rows]);

  const visible = rows.filter((row) => {
    if (operator !== ALL && row.operatorId !== operator) return false;
    if (!vendorId && vendor !== ALL && row.vendorId !== vendor) return false;
    if (status === "LIVE" && !(row.status === "APPROVED" && row.isActive)) return false;
    if (status === "DRAFT" && row.status !== "DRAFT") return false;
    if (status === "INACTIVE" && row.isActive) return false;
    return true;
  });

  function askActive(row: Commission, active: boolean) {
    if (!canEdit || confirming || pending) return;
    setPending({ row, active });
  }

  async function confirmActive() {
    if (!pending) return;
    const { row, active } = pending;
    setConfirming(true);
    try {
      await apiFetch(`/api/v1/paytrix/commissions/${row.id}/active`, { method: "PATCH", body: { active } });
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isActive: active } : item)));
      setPending(null);
      toast.success(active ? "Commission activated" : "Commission deactivated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not change this commission");
    } finally {
      setConfirming(false);
    }
  }

  const columns = [
    "Active",
    "Category",
    "Operator",
    "Amount",
    ...(vendorId ? [] : ["Vendor"]),
    "Commission",
    "Status",
    "Updated",
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField label="Operator" value={operator} onChange={(e) => setOperator(e.target.value)}>
            <option value={ALL}>All</option>
            {operators.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </SelectField>
          {!vendorId && (
            <SelectField label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)}>
              <option value={ALL}>All</option>
              {vendors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </SelectField>
          )}
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value={ALL}>All</option>
            <option value="LIVE">Approved and active</option>
            <option value="DRAFT">Draft</option>
            <option value="INACTIVE">Inactive</option>
          </SelectField>
        </div>
        {canEdit && !vendorId && (
          <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>Add commission</Button>
        )}
      </div>

      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={columns.length} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={BadgePercent}
            title="No commissions yet"
            description="Add a commission for a vendor on an operator and amount range. It is approved as soon as you save it."
            action={canEdit && !vendorId ? <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>Add commission</Button> : undefined}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No commissions match"
            description="Try another operator, vendor, or status."
            action={<Button variant="outline" onClick={() => { setOperator(ALL); setVendor(ALL); setStatus(ALL); }}>Clear filters</Button>}
          />
        ) : (
          <Table>
            <THead columns={columns} />
            <TBody>
              {visible.map((row) => (
                <TR
                  key={row.id}
                  className={`cursor-pointer ${row.isActive ? "" : "text-slate-400"}`}
                  onClick={() => router.push(`/paytrix/commissions/${row.id}`)}
                >
                  <TD onClick={(event) => event.stopPropagation()}>
                    <Switch
                      checked={row.isActive}
                      disabled={!canEdit || confirming}
                      title={row.isActive ? "Active" : "Inactive"}
                      onChange={(checked) => askActive(row, checked)}
                    />
                  </TD>
                  <TD className="font-semibold text-slate-900">{row.categoryName}</TD>
                  <TD>{row.operatorName}</TD>
                  <TD>{formatRange(row.minRange, row.maxRange)}</TD>
                  {!vendorId && <TD>{row.vendorName}</TD>}
                  <TD className="font-semibold text-slate-900">{formatPercent(row.commission)}</TD>
                  <TD>
                    <StatusBadge status={row.status === "APPROVED" ? "APPROVED" : "PENDING"} label={row.status === "APPROVED" ? "Approved" : "Draft"} />
                  </TD>
                  <TD className="text-xs text-slate-500">
                    {new Date(row.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {row.updatedByName && <div>{row.updatedByName}</div>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <ConfirmAction
        open={pending != null}
        title={pending?.active ? "Activate this commission" : "Deactivate this commission"}
        summary={pending?.active
          ? "An approved, active commission can assign bills again."
          : "New bills stop going to this vendor on this commission. This is refused while the vendor still holds an unpaid bill on it."}
        details={pending ? commissionFacts(pending.row) : []}
        confirmLabel={pending?.active ? "Activate" : "Deactivate"}
        danger={pending ? !pending.active : false}
        loading={confirming}
        onCancel={() => setPending(null)}
        onConfirm={confirmActive}
      />

      {formOpen && (
        <CommissionForm
          onClose={(saved) => {
            setFormOpen(false);
            if (saved) load();
          }}
        />
      )}
    </div>
  );
}

function options(rows: Commission[], pick: (row: Commission) => [string, string]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    const [id, name] = pick(row);
    if (id) map.set(id, name || id);
  }
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "en-IN"));
}
