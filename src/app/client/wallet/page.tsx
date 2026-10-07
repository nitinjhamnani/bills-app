"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Inbox, Plus, Search, Wallet as WalletIcon } from "lucide-react";
import { apiFetch, ApiError, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { LedgerEntryDto, PaymentMode, WalletBalance, WalletTopup } from "@/lib/types";
import { API_BASE_URL } from "@/lib/workspace";

const PAYMENT_MODES: PaymentMode[] = ["RTGS", "NEFT", "UPI", "CASH", "OTHER"];

const MODE_LABELS: Record<PaymentMode, string> = {
  RTGS: "RTGS",
  NEFT: "NEFT",
  UPI: "UPI",
  CASH: "Cash",
  OTHER: "Other",
};

const CATEGORY_LABELS: Record<string, string> = {
  TOPUP: "Top-up",
  BILL_PAYMENT: "Bill payment",
  REFUND: "Refund",
  FEE: "Fee",
  ADJUSTMENT: "Adjustment",
};

const TABS = [
  { key: "ledger", label: "Ledger", icon: WalletIcon },
  { key: "requests", label: "Top-up requests", icon: Inbox },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type LedgerFilter = "ALL" | "CREDIT" | "DEBIT";
type RequestFilter = "ALL" | "PENDING" | "COMPLETED" | "REJECTED";

const LEDGER_FILTERS: { key: LedgerFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CREDIT", label: "Credits" },
  { key: "DEBIT", label: "Debits" },
];

const REQUEST_FILTERS: { key: RequestFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
];

const EMPTY_FORM = {
  amount: "",
  paymentMode: "RTGS" as PaymentMode,
  paymentReference: "",
};

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function FilterChips<T extends string>({
  items,
  value,
  counts,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  counts: Record<T, number>;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {items.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
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
  );
}

export default function ClientWalletPage() {
  const toast = useToast();
  const router = useRouter();
  const user = getUser();
  const clientId = user?.clientId ?? "";
  const clientName = user?.displayName ?? "Wallet";
  const canTopUp = user?.role === "CLIENT_ADMIN";

  useEffect(() => {
    if (user?.role === "CLIENT_OPERATOR") {
      router.replace("/client");
    }
  }, [router, user?.role]);

  const [tab, setTab] = useState<TabKey>("ledger");
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [ledger, setLedger] = useState<LedgerEntryDto[]>([]);
  const [requests, setRequests] = useState<WalletTopup[]>([]);
  const [loading, setLoading] = useState(true);

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("ALL");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntryDto | null>(null);

  const [requestFilter, setRequestFilter] = useState<RequestFilter>("ALL");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<WalletTopup | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [b, l, t] = await Promise.all([
        apiFetch<WalletBalance>(`/api/v1/clients/${clientId}/wallet`),
        apiFetch<LedgerEntryDto[]>(`/api/v1/clients/${clientId}/wallet/ledger`),
        apiFetch<WalletTopup[]>(`/api/v1/clients/${clientId}/wallet/topups`),
      ]);
      setBalance(b);
      setLedger(l);
      setRequests(t);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function closeModal() {
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setProof(null);
  }

  async function viewProof(documentId: string) {
    try {
      const res = await trackedFetch(`${API_BASE_URL}/api/v1/documents/${documentId}/file`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      toast.error("Could not open the payment proof");
    }
  }

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let documentId: string | undefined;
      if (proof) {
        const formData = new FormData();
        formData.append("ownerType", "WALLET_TOPUP_PROOF");
        formData.append("file", proof);
        const res = await trackedFetch(`${API_BASE_URL}/api/v1/documents`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        if (!res.ok) throw new ApiError("Could not upload the payment proof", res.status);
        const doc = await res.json();
        documentId = doc.id;
      }
      await apiFetch(`/api/v1/clients/${clientId}/wallet/topup`, {
        method: "POST",
        body: {
          amount: Number(form.amount),
          paymentMode: form.paymentMode,
          paymentReference: form.paymentReference,
          documentId,
          idempotencyKey: crypto.randomUUID(),
        },
      });
      toast.success("Top-up submitted — waiting for the organisation to accept it");
      closeModal();
      setTab("requests");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Top-up failed");
    } finally {
      setSubmitting(false);
    }
  }

  const searchedLedger = useMemo(() => {
    const query = ledgerSearch.trim().toLowerCase();
    if (!query) return ledger;
    return ledger.filter((entry) => {
      const category = CATEGORY_LABELS[entry.referenceType] ?? entry.referenceType;
      return (
        category.toLowerCase().includes(query) ||
        (entry.description ?? "").toLowerCase().includes(query) ||
        entry.entryType.toLowerCase().includes(query)
      );
    });
  }, [ledger, ledgerSearch]);

  const ledgerCounts: Record<LedgerFilter, number> = {
    ALL: searchedLedger.length,
    CREDIT: searchedLedger.filter((entry) => entry.entryType === "CREDIT").length,
    DEBIT: searchedLedger.filter((entry) => entry.entryType === "DEBIT").length,
  };
  const visibleLedger = searchedLedger.filter(
    (entry) => ledgerFilter === "ALL" || entry.entryType === ledgerFilter,
  );

  const searchedRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((request) => {
      const mode = MODE_LABELS[request.paymentMode] ?? request.paymentMode;
      return (
        mode.toLowerCase().includes(query) ||
        (request.paymentReference ?? "").toLowerCase().includes(query) ||
        String(request.amount).includes(query)
      );
    });
  }, [requests, requestSearch]);

  const requestCounts: Record<RequestFilter, number> = {
    ALL: searchedRequests.length,
    PENDING: searchedRequests.filter((request) => request.status === "PENDING").length,
    COMPLETED: searchedRequests.filter((request) => request.status === "COMPLETED").length,
    REJECTED: searchedRequests.filter((request) => request.status === "REJECTED").length,
  };
  const visibleRequests = searchedRequests.filter(
    (request) => requestFilter === "ALL" || request.status === requestFilter,
  );

  const canSubmit = Number(form.amount) > 0 && form.paymentReference.trim().length > 0;
  const requestedAmount = Number(form.amount);

  if (user?.role === "CLIENT_OPERATOR") return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Wallet"
        description={
          canTopUp
            ? "Funds every bill you submit. A top-up is credited only after the organisation accepts it."
            : "Funds every bill you submit. A Client Admin requests a top-up when more funds are needed."
        }
        actions={
          canTopUp ? (
            <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Top up wallet
            </Button>
          ) : undefined
        }
      />

      <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xs sm:px-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {userInitials(clientName)}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-400">Available balance</p>
          {loading || !balance ? (
            <Skeleton className="mt-1 h-8 w-36" />
          ) : (
            <p className="font-mono text-2xl font-semibold tracking-tight text-slate-900">
              {inr(balance.walletBalance)}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {(canTopUp ? TABS : TABS.filter((item) => item.key === "ledger")).map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          const count = item.key === "ledger" ? ledger.length : requests.length;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
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

      {tab === "ledger" && (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <FilterChips
            items={LEDGER_FILTERS}
            value={ledgerFilter}
            counts={ledgerCounts}
            onChange={setLedgerFilter}
          />
          <ListCard>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <div className="relative sm:max-w-sm">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search category or note"
                  className={searchClass}
                />
              </div>
            </div>
            {loading ? (
              <div className="flex flex-col gap-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : visibleLedger.length === 0 ? (
              <EmptyState
                icon={WalletIcon}
                title={ledger.length === 0 ? "No movement yet" : "No entries match"}
                description={
                  ledger.length === 0
                    ? "Credits and bill payments will show up here."
                    : "Try another filter or clear the search."
                }
              />
            ) : (
              <Table>
                <THead columns={["When", "Movement", "Category", "Amount", "Balance after", ""]} />
                <TBody>
                  {visibleLedger.map((entry, index) => {
                    const credit = entry.entryType === "CREDIT";
                    return (
                      <TR
                        key={`${entry.createdAt}-${index}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <TD className="text-slate-500">{formatWhen(entry.createdAt)}</TD>
                        <TD>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                              credit
                                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                : "bg-rose-50 text-rose-800 ring-rose-200",
                            )}
                          >
                            {credit ? "Credit" : "Debit"}
                          </span>
                        </TD>
                        <TD>{CATEGORY_LABELS[entry.referenceType] ?? entry.referenceType}</TD>
                        <TD
                          className={cn(
                            "font-mono text-sm font-semibold",
                            credit ? "text-emerald-700" : "text-rose-700",
                          )}
                        >
                          {credit ? "+" : "−"}
                          {inr(entry.amount)}
                        </TD>
                        <TD className="font-mono text-slate-700">{inr(entry.balanceAfter)}</TD>
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
        </div>
      )}

      {canTopUp && tab === "requests" && (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <FilterChips
            items={REQUEST_FILTERS}
            value={requestFilter}
            counts={requestCounts}
            onChange={setRequestFilter}
          />
          <ListCard>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <div className="relative sm:max-w-sm">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Search reference, mode, or amount"
                  className={searchClass}
                />
              </div>
            </div>
            {loading ? (
              <div className="flex flex-col gap-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : visibleRequests.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={requests.length === 0 ? "No top-up requests" : "No requests match"}
                description={
                  requests.length === 0
                    ? "Submit a top-up after you send money. It stays here until the organisation accepts it."
                    : "Try another status or clear the search."
                }
                action={
                  requests.length === 0 ? (
                    <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                      Top up wallet
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <THead columns={["Amount", "Mode", "Reference", "Status", "Requested", ""]} />
                <TBody>
                  {visibleRequests.map((request) => (
                    <TR
                      key={request.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <TD className="font-mono text-sm font-semibold text-slate-900">
                        {inr(request.amount)}
                      </TD>
                      <TD>{MODE_LABELS[request.paymentMode] ?? request.paymentMode}</TD>
                      <TD className="font-mono text-slate-600">{request.paymentReference ?? "—"}</TD>
                      <TD>
                        <StatusBadge status={request.status} />
                      </TD>
                      <TD className="text-slate-500">{formatWhen(request.createdAt)}</TD>
                      <TD>
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </ListCard>
        </div>
      )}

      <Modal
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        title="Ledger entry"
        description={selectedEntry ? formatWhen(selectedEntry.createdAt) : undefined}
      >
        {selectedEntry && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                  selectedEntry.entryType === "CREDIT"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-rose-50 text-rose-800 ring-rose-200",
                )}
              >
                {selectedEntry.entryType === "CREDIT" ? "Credit" : "Debit"}
              </span>
              <p
                className={cn(
                  "font-mono text-lg font-semibold",
                  selectedEntry.entryType === "CREDIT" ? "text-emerald-700" : "text-rose-700",
                )}
              >
                {selectedEntry.entryType === "CREDIT" ? "+" : "−"}
                {inr(selectedEntry.amount)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <InfoField
                  label="Category"
                  value={CATEGORY_LABELS[selectedEntry.referenceType] ?? selectedEntry.referenceType}
                />
                <InfoField label="Balance after" value={inr(selectedEntry.balanceAfter)} />
                <InfoField label="Note" value={selectedEntry.description || "—"} />
              </dl>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        title="Top-up request"
        description="The wallet is credited only after the organisation accepts this request."
        footer={
          selectedRequest?.documentId ? (
            <Button onClick={() => viewProof(selectedRequest.documentId as string)}>
              View proof
            </Button>
          ) : undefined
        }
      >
        {selectedRequest && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={selectedRequest.status} />
              <p className="text-xs font-medium text-slate-500">
                {formatWhen(selectedRequest.createdAt)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <InfoField label="Amount" value={inr(selectedRequest.amount)} />
                <InfoField
                  label="Mode"
                  value={MODE_LABELS[selectedRequest.paymentMode] ?? selectedRequest.paymentMode}
                />
                <InfoField label="Reference" value={selectedRequest.paymentReference ?? "—"} />
                <InfoField label="Proof" value={selectedRequest.documentId ? "Attached" : "None"} />
              </dl>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Top up wallet"
        description="Sent to the organisation for review. The wallet is credited once accepted."
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button form="topup-form" type="submit" loading={submitting} disabled={!canSubmit}>
              Submit request
            </Button>
          </>
        }
      >
        <form id="topup-form" onSubmit={handleTopUp} className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-medium text-slate-400">Current balance</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
              {balance ? inr(balance.walletBalance) : "—"}
            </p>
          </div>
          <Field
            label="Amount (INR)"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <SelectField
            label="Payment mode"
            required
            value={form.paymentMode}
            onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}
          >
            {PAYMENT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </option>
            ))}
          </SelectField>
          <Field
            label="Payment reference"
            required
            value={form.paymentReference}
            onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
            placeholder="UTR / transaction ID / receipt number"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Payment proof</span>
            <input
              type="file"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              className="min-h-11 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
            />
            <span className="text-xs text-slate-400">Optional. A receipt or transfer screenshot.</span>
          </label>
          {Number.isFinite(requestedAmount) && requestedAmount > 0 && (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
              Requested credit: {inr(requestedAmount)}. It is added after the organisation accepts it.
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
