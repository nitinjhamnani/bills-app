"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Download, Percent, Search } from "lucide-react";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { API_BASE_URL } from "@/lib/workspace";
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

const VIEWS = [
  { key: "outgoing", label: "Payables", icon: Banknote },
  { key: "incoming", label: "Receivables", icon: Percent },
] as const;

type View = (typeof VIEWS)[number]["key"];

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

export default function VendorPaymentsPage() {
  const toast = useToast();
  const currentRole = getUser()?.role;
  const canAct =
    currentRole === "SUPER_ADMIN" ||
    currentRole === "ORGANISATION_ADMIN" ||
    currentRole === "CHECKER";
  const today = useMemo(() => new Date(), []);
  const [vendors, setVendors] = useState<Client[]>([]);
  const [vendorId, setVendorId] = useState("ALL");
  const [periodStart, setPeriodStart] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(iso(today));
  const [view, setView] = useState<View>("outgoing");
  const [incoming, setIncoming] = useState<CommissionBill[]>([]);
  const [outgoing, setOutgoing] = useState<BillPayment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [mode, setMode] = useState("NEFT");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function load(next?: { vendorId?: string; periodStart?: string; periodEnd?: string }) {
    const vendor = next?.vendorId ?? vendorId;
    const start = next?.periodStart ?? periodStart;
    const end = next?.periodEnd ?? periodEnd;
    setLoading(true);
    try {
      const params = new URLSearchParams({ periodStart: start, periodEnd: end });
      if (vendor !== "ALL") params.set("vendorClientId", vendor);
      const query = params.toString();
      const [commissionRows, paymentRows] = await Promise.all([
        apiFetch<CommissionBill[]>(`/api/v1/paytrix/vendor-commissions?${query}`),
        apiFetch<BillPayment[]>(`/api/v1/paytrix/vendor-payments?${query}`),
      ]);
      setIncoming(commissionRows);
      setOutgoing(paymentRows);
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = search.trim().toLowerCase();
  const visibleIncoming = useMemo(
    () => incoming.filter((row) => !query || [
      row.vendorName,
      row.corporateName,
      row.billerName,
      row.consumerNumber,
      String(row.amount),
      String(row.commissionAmount),
    ].some((value) => value.toLowerCase().includes(query))),
    [incoming, query],
  );
  const visibleOutgoing = useMemo(
    () => outgoing.filter((row) => !query || [
      row.assignedVendorName,
      row.corporateName,
      row.billerName,
      row.customerBillAccountNumber,
      String(row.amount),
    ].some((value) => (value ?? "").toLowerCase().includes(query))),
    [outgoing, query],
  );
  const incomingChosen = useMemo(
    () => visibleIncoming.filter((row) => selected.has(row.billPaymentId)),
    [visibleIncoming, selected],
  );
  const outgoingChosen = useMemo(
    () => visibleOutgoing.filter((row) => selected.has(row.id)),
    [visibleOutgoing, selected],
  );
  const chosen = view === "incoming" ? incomingChosen : outgoingChosen;
  const commissionTotal = incomingChosen.reduce((sum, row) => sum + row.commissionAmount, 0);
  const outgoingTotal = outgoingChosen.reduce((sum, row) => sum + row.amount, 0);
  const vendorCount = new Set(
    view === "incoming"
      ? incomingChosen.map((row) => row.vendorClientId)
      : outgoingChosen.map((row) => row.assignedVendorClientId).filter((id): id is string => Boolean(id)),
  ).size;
  const rowIds = view === "incoming"
    ? visibleIncoming.map((row) => row.billPaymentId)
    : visibleOutgoing.map((row) => row.id);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));

  function show(next: View) {
    setView(next);
    setSearch("");
    setSelected(new Set());
    setOpen(false);
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function downloadReport() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ periodStart, periodEnd });
      if (vendorId !== "ALL") params.set("vendorClientId", vendorId);
      const path = view === "incoming" ? "vendor-commissions" : "vendor-payments";
      const response = await trackedFetch(
        `${API_BASE_URL}/api/v1/paytrix/${path}/export?${params}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Could not download the report"));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const named = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "");
      link.href = url;
      link.download = named?.[1] ?? `${view === "incoming" ? "vendor-commission" : "vendor-payment"}-${periodStart}-to-${periodEnd}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the report");
    } finally {
      setDownloading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (view === "incoming") {
        await apiFetch("/api/v1/paytrix/vendor-commissions", {
          method: "POST",
          body: { billPaymentIds: incomingChosen.map((row) => row.billPaymentId), reference, mode },
        });
        toast.success(
          incomingChosen.length === 1
            ? "Commission marked received"
            : `Marked ${incomingChosen.length} commissions received`,
        );
      } else {
        await apiFetch("/api/v1/paytrix/vendor-payments", {
          method: "POST",
          body: { billPaymentIds: outgoingChosen.map((row) => row.id), reference, mode },
        });
        toast.success(
          outgoingChosen.length === 1
            ? "Payment recorded"
            : `Recorded payment for ${outgoingChosen.length} bills`,
        );
      }
      setOpen(false);
      setReference("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const rows = view === "incoming" ? incoming : outgoing;
  const visibleCount = view === "incoming" ? visibleIncoming.length : visibleOutgoing.length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Vendor Payments"
        description="Verified bills Paytrix still has to pay, and commission still to collect from vendors."
      />
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Payment direction">
        {VIEWS.map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          const count = item.key === "outgoing" ? outgoing.length : incoming.length;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => show(item.key)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <ListCard fitContent={false}>
        <form
          className="grid shrink-0 gap-3 border-b border-slate-100 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
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
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, corporate, or biller"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" icon={<Download size={16} />} loading={downloading} onClick={downloadReport}>
              Download report
            </Button>
            {canAct ? (
              <Button
                icon={view === "incoming" ? <Percent size={16} /> : <Banknote size={16} />}
                disabled={chosen.length === 0}
                onClick={() => setOpen(true)}
              >
                {view === "incoming" ? "Mark received" : "Record payment"}
                {chosen.length > 0 ? ` · ${chosen.length}` : ""}
              </Button>
            ) : null}
          </div>
        </div>
        {loading ? <TableSkeleton cols={7} /> : view === "incoming" ? (
          visibleCount === 0 ? (
            <EmptyState
              icon={Percent}
              title={rows.length === 0 ? "No commission due" : "No bills match"}
              description={rows.length === 0 ? "Try another vendor or a wider date range." : "Try another vendor, corporate, or biller."}
            />
          ) : (
            <Table>
              <THead columns={[
                <input
                  key="all"
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rowIds))}
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
                {visibleIncoming.map((row) => (
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
          )
        ) : visibleCount === 0 ? (
          <EmptyState
            icon={Banknote}
            title={rows.length === 0 ? "Nothing waiting to be paid" : "No bills match"}
            description={rows.length === 0 ? "Verified bills Paytrix still owes a vendor show up here." : "Try another vendor, corporate, or biller."}
          />
        ) : (
          <Table>
            <THead columns={[
              <input
                key="all"
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rowIds))}
                className="h-4 w-4 rounded border-slate-300"
              />,
              "Vendor",
              "Corporate",
              "Biller",
              "Consumer no.",
              "Amount",
            ]} />
            <TBody>
              {visibleOutgoing.map((row) => (
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
        open={open && view === "incoming"}
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
        <form id="vendor-commission-form" onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-slate-700">
            {incomingChosen.length} {incomingChosen.length === 1 ? "bill" : "bills"} · {inr(commissionTotal)}
            {vendorCount > 1 ? ` · ${vendorCount} vendors` : ""}
          </p>
          <SelectField label="Mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            {MODES.map((item) => <option key={item} value={item}>{item}</option>)}
          </SelectField>
          <Field label="Receipt reference" required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} />
        </form>
      </Modal>
      <Modal
        open={open && view === "outgoing"}
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
        <form id="vendor-payment-form" onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-slate-700">
            {outgoingChosen.length} {outgoingChosen.length === 1 ? "bill" : "bills"} · {inr(outgoingTotal)}
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
