"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote } from "lucide-react";
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
import type { BillPayment, Client } from "@/lib/types";

const MODES = ["NEFT", "RTGS", "IMPS", "UPI", "CHEQUE", "CASH", "OTHER"];

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function VendorPaymentsPage() {
  const toast = useToast();
  const canPay = getUser()?.role === "ORGANISATION_ADMIN" || getUser()?.role === "CHECKER";
  const [rows, setRows] = useState<BillPayment[]>([]);
  const [vendors, setVendors] = useState<Client[]>([]);
  const [vendorId, setVendorId] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [mode, setMode] = useState("NEFT");
  const [saving, setSaving] = useState(false);

  async function load(nextVendor = vendorId) {
    setLoading(true);
    try {
      const query = nextVendor !== "ALL" ? `?vendorClientId=${encodeURIComponent(nextVendor)}` : "";
      setRows(await apiFetch<BillPayment[]>(`/api/v1/paytrix/vendor-payments${query}`));
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load vendor payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiFetch<Client[]>("/api/v1/paytrix/clients")
      .then((clients) => setVendors(clients.filter((client) => client.clientType === "VENDOR")))
      .catch(() => setVendors([]));
    load("ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected]);
  const total = chosen.reduce((sum, row) => sum + row.amount, 0);
  const vendorCount = new Set(chosen.map((row) => row.assignedVendorClientId).filter(Boolean)).size;
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function record(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/v1/paytrix/vendor-payments", {
        method: "POST",
        body: { billPaymentIds: chosen.map((row) => row.id), reference, mode },
      });
      toast.success(chosen.length === 1 ? "Payment recorded" : `Recorded payment for ${chosen.length} bills`);
      setOpen(false);
      setReference("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record the payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Vendor Payments"
        description="Verified bills the vendor has paid. Paytrix pays the full bill amount back. Commission is collected separately."
        actions={canPay ? (
          <Button icon={<Banknote size={16} />} disabled={chosen.length === 0} onClick={() => setOpen(true)}>
            Record payment{chosen.length > 0 ? ` · ${chosen.length}` : ""}
          </Button>
        ) : undefined}
      />
      <div className="max-w-sm">
        <SelectField
          label="Vendor"
          value={vendorId}
          onChange={(event) => {
            setVendorId(event.target.value);
            load(event.target.value);
          }}
        >
          <option value="ALL">All vendors</option>
          {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.clientName}</option>)}
        </SelectField>
      </div>
      <ListCard fitContent={false}>
        {loading ? <TableSkeleton cols={6} /> : rows.length === 0 ? (
          <EmptyState icon={Banknote} title="Nothing to pay" description="Bills appear here after a vendor payment is verified." />
        ) : (
          <Table>
            <THead columns={[
              <input
                key="all"
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
                className="h-4 w-4 rounded border-slate-300"
              />,
              "Vendor",
              "Corporate",
              "Biller",
              "Consumer no.",
              "Amount",
            ]} />
            <TBody>
              {rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.customerBillAccountNumber}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </TD>
                  <TD className="font-semibold text-slate-900">{row.assignedVendorName ?? "—"}</TD>
                  <TD>{row.corporateName ?? "—"}</TD>
                  <TD>{row.billerName}</TD>
                  <TD>{row.customerBillAccountNumber}</TD>
                  <TD className="font-mono font-semibold text-slate-900">{inr(row.amount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>
      <Modal
        open={open}
        onClose={saving ? () => undefined : () => setOpen(false)}
        title="Record payment"
        description="The same reference is stored on every selected bill. Bills for different vendors are paid separately."
        footer={
          <>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="vendor-payment-form" type="submit" loading={saving}>Record payment</Button>
          </>
        }
      >
        <form id="vendor-payment-form" onSubmit={record} className="flex flex-col gap-4">
          <p className="text-sm text-slate-700">
            {chosen.length} {chosen.length === 1 ? "bill" : "bills"} · {inr(total)}
            {vendorCount > 1 ? ` · ${vendorCount} vendors` : ""}
          </p>
          <SelectField label="Mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            {MODES.map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <Field label="Payment reference" required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} />
        </form>
      </Modal>
    </div>
  );
}
