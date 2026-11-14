"use client";

import { useCallback, useEffect, useState } from "react";
import { Hash, Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ListCard } from "@/components/ui/Card";
import { Checkbox, Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatRange, type CommissionRange } from "../commissions/format";

export function RangesTab({ onCount }: { onCount?: (count: number) => void }) {
  const toast = useToast();
  const canAdd = getUser()?.role === "ORGANISATION_ADMIN";
  const [ranges, setRanges] = useState<CommissionRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [openEnded, setOpenEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await apiFetch<CommissionRange[]>("/api/v1/paytrix/commissions/ranges");
      setRanges(next);
      onCount?.(next.length);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load amount ranges");
    } finally {
      setLoading(false);
    }
    // toast identity changes every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function close() {
    setOpen(false);
    setMinAmount("");
    setMaxAmount("");
    setOpenEnded(false);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/v1/paytrix/commissions/ranges", {
        method: "POST",
        body: {
          minAmount: Number(minAmount),
          maxAmount: openEnded || maxAmount.trim() === "" ? null : Number(maxAmount),
        },
      });
      toast.success("Amount range added");
      close();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add this range");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(range: CommissionRange, active: boolean) {
    setTogglingId(range.id);
    try {
      await apiFetch(`/api/v1/paytrix/commissions/ranges/${range.id}/active`, {
        method: "PATCH",
        body: { active },
      });
      toast.success(active ? "Range activated" : "Range deactivated");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update this range");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-slate-500">
          Ranges are inclusive. Two active ranges cannot share an amount. Only active ranges appear in the commission form.
        </p>
        {canAdd && (
          <Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            Add range
          </Button>
        )}
      </div>

      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={3} />
        ) : ranges.length === 0 ? (
          <EmptyState
            icon={Hash}
            title="No amount ranges yet"
            description="Add the first inclusive range. Commission rules choose from this list."
            action={canAdd ? <Button icon={<Plus size={16} />} onClick={() => setOpen(true)}>Add range</Button> : undefined}
          />
        ) : (
          <Table>
            <THead columns={["Amount range", "Status", ""]} />
            <TBody>
              {ranges.map((range) => (
                <TR key={range.id} className={range.isActive ? "" : "text-slate-400"}>
                  <TD className="font-semibold text-slate-900">{formatRange(range.minAmount, range.maxAmount)}</TD>
                  <TD>
                    <StatusBadge status={range.isActive ? "ACTIVE" : "DISABLED"} label={range.isActive ? "Active" : "Inactive"} />
                  </TD>
                  <TD>
                    {canAdd && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={togglingId === range.id}
                          onClick={() => setActive(range, !range.isActive)}
                        >
                          {range.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={open}
        onClose={close}
        title="Add amount range"
        description="Minimum and maximum are inclusive. Leave the maximum open when there is no upper limit."
        footer={
          <>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button form="range-form" type="submit" loading={saving}>Add range</Button>
          </>
        }
      >
        <form id="range-form" onSubmit={add} className="flex flex-col gap-4">
          <Field label="Minimum" type="number" min={0} step="0.01" required value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          <Field
            label="Maximum"
            type="number"
            min={0}
            step="0.01"
            value={maxAmount}
            disabled={openEnded}
            placeholder={openEnded ? "No upper limit" : ""}
            onChange={(e) => setMaxAmount(e.target.value)}
          />
          <Checkbox label="No upper limit" checked={openEnded} onChange={(e) => setOpenEnded(e.target.checked)} />
        </form>
      </Modal>
    </div>
  );
}
