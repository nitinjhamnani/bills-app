"use client";

import { useEffect, useMemo, useState } from "react";
import { Percent } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { ListCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, SelectField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, TD, THead, TR } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { Client } from "@/lib/types";

const MODES = ["NEFT", "RTGS", "IMPS", "UPI", "CHEQUE", "CASH", "OTHER"];

interface CommissionBill {
  billPaymentId: string;
  vendorClientId: string;
  vendorName: string;
  corporateName: string;
  consumerNumber: string;
  billerName: string;
  amount: number;
  commissionPercent: number;
  commissionAmount: number;
  paidAt: string;
}

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function iso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatWhen(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function VendorCommissionsPage() {
  const toast = useToast();
  const canReceive = getUser()?.role === "ORGANISATION_ADMIN" || getUser()?.role === "CHECKER";
  const today = useMemo(() => new Date(), []);
  const [vendors, setVendors] = useState<Client[]>([]);
  const [vendorId, setVendorId] = useState("ALL");
  const [periodStart, setPeriodStart] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(iso(today));
  const [rows, setRows] = useState<CommissionBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [mode, setMode] = useState("NEFT");
  const [saving, setSaving] = useState(false);

  async function load(next?: { vendorId?: string; periodStart?: string; periodEnd?: string }) {
    const vendor = next?.vendorId ?? vendorId;
    const start = next?.periodStart ?? periodStart;
    const end = next?.periodEnd ?? periodEnd;
    setLoading(true);
    try {
      const params = new URLSearchParams({ periodStart: start, periodEnd: end });
      if (vendor !== "ALL") params.set("vendorClientId", vendor);
      setRows(await apiFetch<CommissionBill[]>(`/api/v1/paytrix/vendor-commissions?${params}`));
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiFetch<Client[]>("/api/v1/paytrix/clients")
      .then((clients) => setVendors(clients.filter((client) => client.clientType === "VENDOR")))
      .catch(() => setVendors([]));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = useMemo(() => rows.filter((row) => selected.has(row.billPaymentId)), [rows, selected]);
  const commissionTotal = chosen.reduce((sum, row) => sum + row.commissionAmount, 0);
  const vendorCount = new Set(chosen.map((row) => row.vendorClientId)).size;
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.billPaymentId));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function receive(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/v1/paytrix/vendor-commissions", {
        method: "POST",
        body: { billPaymentIds: chosen.map((row) => row.billPaymentId), reference, mode },
      });
      toast.success(chosen.length === 1 ? "Commission marked received" : `Marked ${chosen.length} commissions received`);
      setOpen(false);
      setReference("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not mark the commission received");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Vendor Commissions"
        description="Bills Paytrix has paid a vendor for, where the commission is still to be collected."
        actions={canReceive ? (
          <Button icon={<Percent size={16} />} disabled={chosen.length === 0} onClick={() => setOpen(true)}>
            Mark received{chosen.length > 0 ? ` · ${chosen.length}` : ""}
          </Button>
        ) : undefined}
      />
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <SelectField label="Vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
          <option value="ALL">All vendors</option>
          {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.clientName}</option>)}
        </SelectField>
        <Field label="From" type="date" required value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
        <Field label="To" type="date" required value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
        <Button type="submit" variant="outline">Show bills</Button>
      </form>
      <ListCard fitContent={false}>
        {loading ? <TableSkeleton cols={7} /> : rows.length === 0 ? (
          <EmptyState icon={Percent} title="No commission due" description="Try another vendor or a wider date range." />
        ) : (
          <Table>
            <THead columns={[
              <input
                key="all"
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.billPaymentId)))}
                className="h-4 w-4 rounded border-slate-300"
              />,
              "Vendor",
              "Corporate",
              "Biller",
              "Paid",
              "Bill",
              "Commission",
            ]} />
            <TBody>
              {rows.map((row) => (
                <TR key={row.billPaymentId}>
                  <TD>
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.consumerNumber}`}
                      checked={selected.has(row.billPaymentId)}
                      onChange={() => toggle(row.billPaymentId)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </TD>
                  <TD className="font-semibold text-slate-900">{row.vendorName}</TD>
                  <TD>{row.corporateName}</TD>
                  <TD>
                    <p>{row.billerName}</p>
                    <p className="text-[11px] text-slate-500">{row.consumerNumber}</p>
                  </TD>
                  <TD>{formatWhen(row.paidAt)}</TD>
                  <TD className="font-mono">{inr(row.amount)}</TD>
                  <TD className="font-mono font-semibold text-slate-900">{row.commissionPercent}% · {inr(row.commissionAmount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>
      <Modal
        open={open}
        onClose={saving ? () => undefined : () => setOpen(false)}
        title="Mark commission received"
        description="The selected bills drop out of this list. Each vendor gets one commission entry for their bills."
        footer={
          <>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="vendor-commission-form" type="submit" loading={saving}>Mark received</Button>
          </>
        }
      >
        <form id="vendor-commission-form" onSubmit={receive} className="flex flex-col gap-4">
          <p className="text-sm text-slate-700">
            {chosen.length} {chosen.length === 1 ? "bill" : "bills"} · {inr(commissionTotal)}
            {vendorCount > 1 ? ` · ${vendorCount} vendors` : ""}
          </p>
          <SelectField label="Mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            {MODES.map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <Field label="Receipt reference" required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} />
        </form>
      </Modal>
    </div>
  );
}
