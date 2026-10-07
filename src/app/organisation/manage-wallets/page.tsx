"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, PlusCircle, Search, Wallet as WalletIcon } from "lucide-react";
import { apiFetch, ApiError, trackedFetch } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { userInitials } from "@/components/UserMenu";
import { cn } from "@/lib/cn";
import type { ClientWallet, LedgerEntryDto, PendingWalletTopup } from "@/lib/types";
import { API_BASE_URL } from "@/lib/workspace";

const TABS = [
  { key: "topups", label: "Top-up requests", icon: Inbox },
  { key: "wallets", label: "Wallets", icon: WalletIcon },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type LedgerFilter = "ALL" | "CREDIT" | "DEBIT";

const LEDGER_FILTERS: { key: LedgerFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CREDIT", label: "Credits" },
  { key: "DEBIT", label: "Debits" },
];

const CATEGORY_LABELS: Record<string, string> = {
  TOPUP: "Top-up",
  BILL_PAYMENT: "Bill payment",
  REFUND: "Refund",
  FEE: "Fee",
  ADJUSTMENT: "Adjustment",
};

const MODE_LABELS: Record<string, string> = {
  RTGS: "RTGS",
  NEFT: "NEFT",
  UPI: "UPI",
  CASH: "Cash",
  OTHER: "Other",
};

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

export default function ManageWalletsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("topups");

  const [pending, setPending] = useState<PendingWalletTopup[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [topupSearch, setTopupSearch] = useState("");

  const [wallets, setWallets] = useState<ClientWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [walletSearch, setWalletSearch] = useState("");

  const [selected, setSelected] = useState<ClientWallet | null>(null);
  const [ledger, setLedger] = useState<LedgerEntryDto[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("ALL");
  const [ledgerSearch, setLedgerSearch] = useState("");

  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addingFunds, setAddingFunds] = useState(false);

  async function loadPending() {
    setPendingLoading(true);
    try {
      setPending(await apiFetch<PendingWalletTopup[]>("/api/v1/organisation/wallet-topups/pending"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load top-up requests");
    } finally {
      setPendingLoading(false);
    }
  }

  async function loadWallets() {
    setWalletsLoading(true);
    try {
      setWallets(await apiFetch<ClientWallet[]>("/api/v1/organisation/wallets"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load wallets");
    } finally {
      setWalletsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPending();
    loadWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLedger(clientId: string) {
    setLedgerLoading(true);
    try {
      setLedger(await apiFetch<LedgerEntryDto[]>(`/api/v1/clients/${clientId}/wallet/ledger`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load transactions");
    } finally {
      setLedgerLoading(false);
    }
  }

  function selectClient(wallet: ClientWallet) {
    setSelected(wallet);
    setLedgerFilter("ALL");
    setLedgerSearch("");
    loadLedger(wallet.clientId);
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

  async function reviewTopup(id: string, approve: boolean) {
    setReviewingId(id);
    try {
      await apiFetch(`/api/v1/organisation/wallet-topups/${id}/review`, {
        method: "POST",
        body: { approve },
      });
      toast.success(approve ? "Top-up accepted and wallet credited" : "Top-up rejected");
      await loadPending();
      await loadWallets();
      if (selected) await loadLedger(selected.clientId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setReviewingId(null);
    }
  }

  function openAddFunds() {
    setAddAmount("");
    setAddNote("");
    setAddFundsOpen(true);
  }

  async function submitAddFunds(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setAddingFunds(true);
    try {
      const updated = await apiFetch<ClientWallet>(
        `/api/v1/organisation/wallets/${selected.clientId}/credit`,
        { method: "POST", body: { amount: Number(addAmount), note: addNote } },
      );
      toast.success(`${inr(Number(addAmount))} added to ${selected.clientName}'s wallet`);
      setAddFundsOpen(false);
      setSelected(updated);
      await loadWallets();
      await loadLedger(updated.clientId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add funds");
    } finally {
      setAddingFunds(false);
    }
  }

  const visibleTopups = useMemo(() => {
    const query = topupSearch.trim().toLowerCase();
    if (!query) return pending;
    return pending.filter((item) => {
      const mode = MODE_LABELS[item.paymentMode] ?? item.paymentMode;
      return (
        item.clientName.toLowerCase().includes(query) ||
        (item.clientCode ?? "").toLowerCase().includes(query) ||
        (item.paymentReference ?? "").toLowerCase().includes(query) ||
        mode.toLowerCase().includes(query)
      );
    });
  }, [pending, topupSearch]);

  const visibleWallets = useMemo(() => {
    const query = walletSearch.trim().toLowerCase();
    if (!query) return wallets;
    return wallets.filter(
      (wallet) =>
        wallet.clientName.toLowerCase().includes(query) ||
        (wallet.clientCode ?? "").toLowerCase().includes(query),
    );
  }, [wallets, walletSearch]);

  const ledgerCounts = useMemo(
    () => ({
      ALL: ledger.length,
      CREDIT: ledger.filter((entry) => entry.entryType === "CREDIT").length,
      DEBIT: ledger.filter((entry) => entry.entryType === "DEBIT").length,
    }),
    [ledger],
  );

  const visibleLedger = useMemo(() => {
    const query = ledgerSearch.trim().toLowerCase();
    return ledger.filter((entry) => {
      if (ledgerFilter !== "ALL" && entry.entryType !== ledgerFilter) return false;
      if (!query) return true;
      const category = CATEGORY_LABELS[entry.referenceType] ?? entry.referenceType;
      return (
        category.toLowerCase().includes(query) ||
        (entry.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [ledger, ledgerFilter, ledgerSearch]);

  const creditAmount = Number(addAmount);
  const nextBalance =
    selected && Number.isFinite(creditAmount) && creditAmount > 0
      ? selected.balance + creditAmount
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Manage wallets"
        description="Review money clients have sent in, or credit a wallet and read its ledger."
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          const count = item.key === "topups" ? pending.length : wallets.length;
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

      {tab === "topups" && (
        <ListCard>
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <div className="relative sm:max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={topupSearch}
                onChange={(e) => setTopupSearch(e.target.value)}
                placeholder="Search by client, reference, or mode"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          {pendingLoading ? (
            <div className="flex flex-col gap-3 p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : visibleTopups.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={pending.length === 0 ? "Nothing waiting" : "No requests match"}
              description={
                pending.length === 0
                  ? "Top-ups appear here after a client sends money and asks you to credit their wallet."
                  : "Try another client, reference, or payment mode."
              }
            />
          ) : (
            <Table>
              <THead columns={["Client", "Amount", "Mode", "Reference", "Requested", ""]} />
              <TBody>
                {visibleTopups.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {userInitials(item.clientName)}
                        </span>
                        <p className="truncate font-semibold text-slate-900">
                          {item.clientName}
                          {item.clientCode && (
                            <span className="ml-1.5 font-mono text-[11px] font-medium text-slate-400">
                              {item.clientCode}
                            </span>
                          )}
                        </p>
                      </div>
                    </TD>
                    <TD className="font-mono text-sm font-semibold text-slate-900">{inr(item.amount)}</TD>
                    <TD>{MODE_LABELS[item.paymentMode] ?? item.paymentMode}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-600">
                          {item.paymentReference ?? "—"}
                        </span>
                        {item.documentId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewProof(item.documentId as string)}
                          >
                            View proof
                          </Button>
                        )}
                      </div>
                    </TD>
                    <TD className="text-slate-500">{formatWhen(item.createdAt)}</TD>
                    <TD>
                      {item.canReview ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            loading={reviewingId === item.id}
                            onClick={() => reviewTopup(item.id, true)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reviewingId === item.id}
                            onClick={() => reviewTopup(item.id, false)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <p className="text-right text-xs font-medium text-amber-700">Waiting for a checker</p>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </ListCard>
      )}

      {tab === "wallets" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <ListCard>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                  placeholder="Search clients"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            {walletsLoading ? (
              <TableSkeleton cols={1} rows={6} />
            ) : visibleWallets.length === 0 ? (
              <EmptyState
                icon={WalletIcon}
                title={wallets.length === 0 ? "No wallets yet" : "No clients match"}
                description={
                  wallets.length === 0
                    ? "A wallet is created when you onboard a client."
                    : "Try another name."
                }
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {visibleWallets.map((wallet) => {
                  const active = selected?.clientId === wallet.clientId;
                  return (
                    <button
                      key={wallet.clientId}
                      type="button"
                      onClick={() => selectClient(wallet)}
                      className={cn(
                        "flex min-h-16 w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors",
                        active ? "bg-indigo-50" : "hover:bg-slate-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                          active ? "bg-indigo-600" : "bg-blue-600",
                        )}
                      >
                        {userInitials(wallet.clientName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {wallet.clientName}
                          {wallet.clientCode && (
                            <span className="ml-1.5 font-mono text-[11px] font-medium text-slate-400">
                              {wallet.clientCode}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs font-medium text-slate-500">
                          {inr(wallet.balance)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </ListCard>

          <Card className="flex min-h-0 flex-col overflow-hidden">
            {!selected ? (
              <EmptyState
                icon={WalletIcon}
                title="Select a wallet"
                description="Choose a client to see the balance, add money, or read the ledger."
              />
            ) : (
              <>
                <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {userInitials(selected.clientName)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-900">
                        {selected.clientName}
                        {selected.clientCode && (
                          <span className="ml-1.5 font-mono text-xs font-semibold text-slate-400">
                            {selected.clientCode}
                          </span>
                        )}
                      </h2>
                      <p className="mt-0.5 font-mono text-2xl font-semibold tracking-tight text-slate-900">
                        {inr(selected.balance)}
                      </p>
                    </div>
                  </div>
                  <Button icon={<PlusCircle size={16} />} onClick={openAddFunds}>
                    Add money
                  </Button>
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                    {LEDGER_FILTERS.map((item) => {
                      const active = ledgerFilter === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setLedgerFilter(item.key)}
                          className={cn(
                            "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                            active
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800",
                          )}
                        >
                          {item.label}
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                              active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                            )}
                          >
                            {ledgerCounts[item.key]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative sm:w-64">
                    <Search
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder="Search the ledger"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {ledgerLoading ? (
                  <TableSkeleton cols={5} />
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
                    <THead columns={["When", "Movement", "Category", "Amount", "Balance after", "Note"]} />
                    <TBody>
                      {visibleLedger.map((entry, index) => {
                        const credit = entry.entryType === "CREDIT";
                        return (
                          <TR key={`${entry.createdAt}-${index}`}>
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
                            <TD className="max-w-xs whitespace-normal! text-slate-500">
                              {entry.description || "—"}
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={addFundsOpen}
        onClose={() => setAddFundsOpen(false)}
        title="Add money"
        description={
          selected
            ? `Credits ${selected.clientName} immediately. This is recorded as an adjustment.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setAddFundsOpen(false)}>
              Cancel
            </Button>
            <Button
              form="add-funds-form"
              type="submit"
              loading={addingFunds}
              disabled={!(creditAmount > 0) || !addNote.trim()}
            >
              Add money
            </Button>
          </>
        }
      >
        {selected && (
          <form id="add-funds-form" onSubmit={submitAddFunds} className="flex flex-col gap-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-400">Current balance</p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                {inr(selected.balance)}
              </p>
            </div>
            <Field
              label="Amount"
              type="number"
              min={1}
              step="0.01"
              required
              inputMode="decimal"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              placeholder="0.00"
            />
            <Field
              label="Note"
              required
              hint="Shown on the ledger, so say why this credit was added."
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              placeholder="Cash collected at the branch"
            />
            {nextBalance != null && (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
                Balance after this credit: {inr(nextBalance)}
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
