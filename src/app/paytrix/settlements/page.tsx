"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Receipt } from "lucide-react";
import { ConfirmAction, type ActionDetail } from "@/app/paytrix/commissions/ConfirmAction";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import type { BillPayment, Client } from "@/lib/types";
import { API_BASE_URL } from "@/lib/workspace";

function inr(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthStart() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return `${local.slice(0, 8)}01`;
}

function todayInput() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function paidOn(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

type Tab = "verify" | "pay" | "commission" | "paid";

type PaidBill = {
  billPaymentId: string;
  consumerNumber: string;
  billerName: string;
  amount: number;
  commissionReceived: boolean;
};

type PaidPayment = {
  id: string;
  vendorClientId: string;
  vendorName: string;
  reference: string;
  paidAt: string;
  totalAmount: number;
  billCount: number;
  bills: PaidBill[];
};

type VerifyOutcome = { billPaymentId: string; verified: boolean; note: string };

type CommissionLine = {
  billPaymentId: string;
  consumerNumber: string;
  billerName: string;
  amount: number;
  commissionPercent: number | null;
  commissionAmount: number;
};

type CommissionGroup = {
  clientId: string;
  clientName: string;
  bills: CommissionLine[];
  totalAmount: number;
  totalCommission: number;
};

type CommissionPreview = {
  vendorClientId: string;
  vendorName: string;
  periodStart: string;
  periodEnd: string;
  clients: CommissionGroup[];
  totalAmount: number;
  totalCommission: number;
  billCount: number;
};

export default function SettlementsPage() {
  const toast = useToast();
  const role = getUser()?.role;
  const canAct = role === "ORGANISATION_ADMIN" || role === "CHECKER";
  const [tab, setTab] = useState<Tab>("verify");
  const [verifyQueue, setVerifyQueue] = useState<BillPayment[]>([]);
  const [payQueue, setPayQueue] = useState<BillPayment[]>([]);
  const [vendors, setVendors] = useState<Client[]>([]);
  const [historyVendors, setHistoryVendors] = useState<Client[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaidPayment[] | null>(null);
  const [paidVendor, setPaidVendor] = useState("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [openPaid, setOpenPaid] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paySelected, setPaySelected] = useState<Set<string>>(new Set());
  const [references, setReferences] = useState<Record<string, string>>({});
  const [vendorId, setVendorId] = useState("");
  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(todayInput);
  const [receipt, setReceipt] = useState("");
  const [preview, setPreview] = useState<CommissionPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    | { kind: "verify" }
    | { kind: "pay"; vendorId: string; vendorName: string; bills: BillPayment[] }
    | { kind: "commission" }
    | null
  >(null);

  const payGroups = useMemo(() => {
    const groups = new Map<string, BillPayment[]>();
    for (const bill of payQueue) {
      const id = bill.assignedVendorClientId ?? "";
      groups.set(id, [...(groups.get(id) ?? []), bill]);
    }
    return [...groups.entries()];
  }, [payQueue]);

  async function loadQueues() {
    const [waiting, verified, clients] = await Promise.all([
      apiFetch<BillPayment[]>("/api/v1/paytrix/settlements/verify"),
      apiFetch<BillPayment[]>("/api/v1/paytrix/settlements/reimburse"),
      apiFetch<Client[]>("/api/v1/paytrix/clients"),
    ]);
    setVerifyQueue(waiting);
    setPayQueue(verified);
    setVendors(clients.filter((client) => client.clientType === "VENDOR" && client.status === "ACTIVE"));
    setHistoryVendors(clients.filter((client) => client.clientType === "VENDOR"));
    setSelected((current) => new Set([...current].filter((id) => waiting.some((bill) => bill.id === id))));
    setPaySelected((current) => new Set([...current].filter((id) => verified.some((bill) => bill.id === id))));
  }

  function togglePayBill(id: string) {
    setPaySelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePayVendor(bills: BillPayment[], on: boolean) {
    setPaySelected((current) => {
      const next = new Set(current);
      for (const bill of bills) {
        if (on) next.add(bill.id);
        else next.delete(bill.id);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!canAct) return;
    loadQueues().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load settlements"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAct]);

  async function loadPaid() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (paidVendor) params.set("vendorClientId", paidVendor);
      if (paidFrom) params.set("periodStart", paidFrom);
      if (paidTo) params.set("periodEnd", paidTo);
      const query = params.toString();
      setPaidPayments(await apiFetch<PaidPayment[]>(`/api/v1/paytrix/settlements/paid${query ? `?${query}` : ""}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load recorded payments");
    } finally {
      setBusy(false);
    }
  }

  async function verifySelected() {
    setBusy(true);
    try {
      const results = await apiFetch<VerifyOutcome[]>("/api/v1/paytrix/settlements/verify", {
        method: "POST",
        body: { billPaymentIds: [...selected] },
      });
      const ok = results.filter((result) => result.verified).length;
      if (ok === results.length) {
        toast.success(`Verified ${ok} bill${ok === 1 ? "" : "s"}`);
      } else {
        toast.error(`Verified ${ok}. ${results.length - ok} stayed in the queue.`);
      }
      setConfirm(null);
      setSelected(new Set());
      await loadQueues();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function payVendor(vendor: string, bills: BillPayment[]) {
    setBusy(true);
    try {
      await apiFetch("/api/v1/paytrix/settlements/reimburse", {
        method: "POST",
        body: {
          vendorClientId: vendor,
          billPaymentIds: bills.map((bill) => bill.id),
          reference: references[vendor] ?? "",
        },
      });
      toast.success("Reimbursement recorded");
      setConfirm(null);
      setReferences((current) => ({ ...current, [vendor]: "" }));
      await loadQueues();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record the reimbursement");
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview() {
    setBusy(true);
    setPreview(null);
    try {
      const params = new URLSearchParams({ vendorClientId: vendorId, periodStart, periodEnd });
      setPreview(await apiFetch<CommissionPreview>(`/api/v1/paytrix/settlements/commission?${params}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not build the commission report");
    } finally {
      setBusy(false);
    }
  }

  async function downloadReport() {
    setBusy(true);
    try {
      const params = new URLSearchParams({ vendorClientId: vendorId, periodStart, periodEnd });
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/paytrix/settlements/commission/export?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error(await extractErrorMessage(response, "Download failed"));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vendor-commission.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  async function closeCycle() {
    setBusy(true);
    try {
      await apiFetch("/api/v1/paytrix/settlements/commission", {
        method: "POST",
        body: { vendorClientId: vendorId, periodStart, periodEnd, reference: receipt },
      });
      toast.success("Commission received. The cycle is closed.");
      setConfirm(null);
      setReceipt("");
      setPreview(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not close the cycle");
    } finally {
      setBusy(false);
    }
  }

  if (!canAct) {
    return (
      <PageHeader
        title="Settlements"
        description="A checker verifies vendor payments, reimburses the full bill amount, and closes the commission cycle."
      />
    );
  }

  const selectedBills = verifyQueue.filter((bill) => selected.has(bill.id));
  const selectedAmount = selectedBills.reduce((sum, bill) => sum + bill.amount, 0);
  const payTarget = confirm?.kind === "pay" ? confirm : null;
  const payAmount = payTarget ? payTarget.bills.reduce((sum, bill) => sum + bill.amount, 0) : 0;

  const confirmDetails: ActionDetail[] =
    confirm?.kind === "verify"
      ? [
          { label: "Bills", value: String(selectedBills.length) },
          { label: "Amount", value: inr(selectedAmount) },
        ]
      : confirm?.kind === "pay"
        ? [
            { label: "Vendor", value: confirm.vendorName },
            { label: "Bills", value: String(confirm.bills.length) },
            { label: "Accounts", value: confirm.bills.map((bill) => bill.customerBillAccountNumber).join(", ") },
            { label: "Pay", value: inr(payAmount) },
            { label: "Reference", value: references[confirm.vendorId] || "—" },
          ]
        : confirm?.kind === "commission" && preview
          ? [
              { label: "Vendor", value: preview.vendorName },
              { label: "Period", value: `${preview.periodStart} to ${preview.periodEnd}` },
              { label: "Bills", value: String(preview.billCount) },
              { label: "Bill amount", value: inr(preview.totalAmount) },
              { label: "Commission", value: inr(preview.totalCommission) },
              { label: "Receipt", value: receipt || "—" },
            ]
          : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settlements"
        description="Verify the bills a vendor marked paid, reimburse the full amount, then collect commission for a period."
      />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["verify", "Verify"],
            ["pay", "Pay the vendor"],
            ["commission", "Commission"],
            ["paid", "Paid"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "primary" : "outline"}
            onClick={() => {
              setTab(id);
              if (id === "paid") loadPaid();
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "verify" && (
        verifyQueue.length === 0 ? (
          <EmptyState icon={Receipt} title="Nothing to verify" description="Bills appear here after a vendor marks them paid." />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-semibold text-indigo-700"
                onClick={() => setSelected(selected.size === verifyQueue.length ? new Set() : new Set(verifyQueue.map((bill) => bill.id)))}
              >
                {selected.size === verifyQueue.length ? "Clear selection" : "Select all"}
              </button>
              <Button disabled={selected.size === 0} onClick={() => setConfirm({ kind: "verify" })}>
                Verify {selected.size > 0 ? selected.size : ""}
              </Button>
            </div>
            <ul className="flex flex-col gap-3">
              {verifyQueue.map((bill) => (
                <li key={bill.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${bill.customerBillAccountNumber}`}
                      checked={selected.has(bill.id)}
                      onChange={() => {
                        setSelected((current) => {
                          const next = new Set(current);
                          if (next.has(bill.id)) next.delete(bill.id);
                          else next.add(bill.id);
                          return next;
                        });
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{bill.billerName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {bill.assignedVendorName} · {bill.customerBillAccountNumber}
                          </p>
                          <p className="mt-2 font-mono text-sm font-semibold text-slate-900">{inr(bill.amount)}</p>
                          <p className="mt-1 text-xs text-slate-500">Vendor reference {bill.vendorPaymentReference}</p>
                        </div>
                        <StatusBadge status="AWAITING" label="Vendor paid" />
                      </div>
                      {bill.bbpsCheckNote && (
                        <p className="mt-2 text-sm text-amber-800">Last check: {bill.bbpsCheckNote}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {tab === "pay" && (
        payGroups.length === 0 ? (
          <EmptyState icon={Receipt} title="Nothing to pay" description="Verified bills are grouped here by vendor." />
        ) : (
          <div className="flex flex-col gap-4">
            {payGroups.map(([id, bills]) => {
              const name = bills[0]?.assignedVendorName ?? "Vendor";
              const chosen = bills.filter((bill) => paySelected.has(bill.id));
              const chosenTotal = chosen.reduce((sum, bill) => sum + bill.amount, 0);
              const allSelected = chosen.length === bills.length;
              return (
                <section key={id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">{name}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {bills.length} verified {bills.length === 1 ? "bill" : "bills"}
                      </p>
                      <p className="mt-2 font-mono text-sm font-semibold text-slate-900">
                        {chosen.length === 0 ? "None selected" : `${chosen.length} selected · ${inr(chosenTotal)}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Full bill amount. Commission is not deducted.</p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-indigo-700"
                      onClick={() => togglePayVendor(bills, !allSelected)}
                    >
                      {allSelected ? "Clear selection" : "Select all"}
                    </button>
                  </div>
                  <ul className="mt-3 divide-y divide-slate-100 text-sm">
                    {bills.map((bill) => (
                      <li key={bill.id} className="flex items-center gap-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${bill.customerBillAccountNumber}`}
                          checked={paySelected.has(bill.id)}
                          onChange={() => togglePayBill(bill.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="min-w-0 flex-1 text-slate-600">
                          {bill.billerName} · {bill.customerBillAccountNumber}
                        </span>
                        <span className="font-mono">{inr(bill.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (chosen.length === 0) return;
                      setConfirm({ kind: "pay", vendorId: id, vendorName: name, bills: chosen });
                    }}
                  >
                    <Field
                      className="flex-1"
                      label="Payment reference"
                      required
                      maxLength={120}
                      value={references[id] ?? ""}
                      onChange={(event) => setReferences((current) => ({ ...current, [id]: event.target.value }))}
                    />
                    <Button type="submit" disabled={chosen.length === 0}>Record payment</Button>
                  </form>
                </section>
              );
            })}
          </div>
        )
      )}

      {tab === "commission" && (
        <div className="flex flex-col gap-4">
          <form
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              loadPreview();
            }}
          >
            <SelectField label="Vendor" value={vendorId} onChange={(event) => { setVendorId(event.target.value); setPreview(null); }}>
              <option value="">Choose a vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.clientName}</option>
              ))}
            </SelectField>
            <Field label="From" type="date" required value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setPreview(null); }} />
            <Field label="To" type="date" required value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setPreview(null); }} />
            <div className="flex items-end">
              <Button type="submit" loading={busy} disabled={!vendorId}>Preview</Button>
            </div>
          </form>
          {preview && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{preview.vendorName}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Reimbursed {preview.periodStart} to {preview.periodEnd}. {preview.billCount} bills.
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Bills {inr(preview.totalAmount)} · Commission {inr(preview.totalCommission)}
                  </p>
                </div>
                <Button variant="outline" icon={<Download size={16} />} loading={busy} onClick={downloadReport}>
                  Download Excel
                </Button>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {preview.clients.map((group) => (
                  <div key={group.clientId}>
                    <div className="flex justify-between text-sm font-semibold text-slate-900">
                      <span>{group.clientName}</span>
                      <span>{inr(group.totalAmount)} · {inr(group.totalCommission)}</span>
                    </div>
                    <ul className="mt-1 divide-y divide-slate-100 text-sm">
                      {group.bills.map((line) => (
                        <li key={line.billPaymentId} className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-4">
                          <span className="text-slate-600">{line.billerName}</span>
                          <span className="text-slate-500">{line.consumerNumber}</span>
                          <span className="font-mono">{inr(line.amount)}</span>
                          <span className="font-mono">
                            {line.commissionPercent ?? 0}% · {inr(line.commissionAmount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <form
                className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  setConfirm({ kind: "commission" });
                }}
              >
                <Field
                  className="flex-1"
                  label="Receipt reference"
                  required
                  maxLength={120}
                  value={receipt}
                  onChange={(event) => setReceipt(event.target.value)}
                />
                <Button type="submit">Commission received</Button>
              </form>
            </section>
          )}
        </div>
      )}

      {tab === "paid" && (
        <div className="flex flex-col gap-4">
          <form
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              loadPaid();
            }}
          >
            <SelectField label="Vendor" value={paidVendor} onChange={(event) => setPaidVendor(event.target.value)}>
              <option value="">All vendors</option>
              {historyVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.clientName}</option>
              ))}
            </SelectField>
            <Field label="From" type="date" value={paidFrom} onChange={(event) => setPaidFrom(event.target.value)} />
            <Field label="To" type="date" value={paidTo} onChange={(event) => setPaidTo(event.target.value)} />
            <div className="flex items-end">
              <Button type="submit" loading={busy}>Show</Button>
            </div>
          </form>
          {paidPayments == null ? null : paidPayments.length === 0 ? (
            <EmptyState icon={Receipt} title="No recorded payments" description="Payments appear here after you record a payment to a vendor." />
          ) : (
            <div className="flex flex-col gap-3">
              {paidPayments.map((payment) => {
                const open = openPaid.has(payment.id);
                return (
                  <section key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">{payment.vendorName}</h2>
                        <p className="mt-1 text-xs text-slate-500">
                          {paidOn(payment.paidAt)} · {payment.reference}
                        </p>
                        <p className="mt-2 font-mono text-sm font-semibold text-slate-900">{inr(payment.totalAmount)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.billCount} {payment.billCount === 1 ? "bill" : "bills"} · full amount
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenPaid((current) => {
                          const next = new Set(current);
                          if (next.has(payment.id)) next.delete(payment.id);
                          else next.add(payment.id);
                          return next;
                        })}
                      >
                        {open ? "Hide bills" : "Show bills"}
                      </Button>
                    </div>
                    {open && (
                      <ul className="mt-3 divide-y divide-slate-100 text-sm">
                        {payment.bills.map((bill) => (
                          <li key={bill.billPaymentId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                            <span className="text-slate-600">{bill.billerName} · {bill.consumerNumber}</span>
                            <span className="flex items-center gap-3">
                              <span className="font-mono">{inr(bill.amount)}</span>
                              <StatusBadge
                                status={bill.commissionReceived ? "PAID" : "AWAITING"}
                                label={bill.commissionReceived ? "Commission received" : "Commission open"}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmAction
        open={confirm != null}
        title={
          confirm?.kind === "verify"
            ? "Check these bills with BBPS?"
            : confirm?.kind === "pay"
              ? "Record this payment to the vendor?"
              : "Close this commission cycle?"
        }
        summary={
          confirm?.kind === "verify"
            ? "A bill stays here when the same amount is still due or the fetch fails. Nothing is sent back."
            : confirm?.kind === "pay"
              ? "This records the full amount of the selected bills paid to the vendor. Commission is collected later."
              : "The vendor has paid this commission. These bills will not appear in another cycle."
        }
        details={confirmDetails}
        confirmLabel={
          confirm?.kind === "verify" ? "Verify" : confirm?.kind === "pay" ? "Record payment" : "Close cycle"
        }
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "verify") verifySelected();
          else if (confirm?.kind === "pay") payVendor(confirm.vendorId, confirm.bills);
          else if (confirm?.kind === "commission") closeCycle();
        }}
      />
    </div>
  );
}
