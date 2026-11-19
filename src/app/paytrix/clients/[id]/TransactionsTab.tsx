"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, PlusCircle, Receipt, SlidersHorizontal, Wallet } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { ProofModal } from "@/components/ProofModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { buildXlsxBlob } from "@/lib/xlsx";
import { isOrgAdmin, type ClientWallet, type LedgerEntryDto, type WalletTopup } from "@/lib/types";

type EntryTypeFilter = "ALL" | "DEBIT" | "CREDIT";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const CATEGORY_LABELS: Record<string, string> = {
  RECHARGE: "Recharge",
  ADJUSTMENT: "Manual credit",
  FEE: "Convenience fee",
  ELECTRICITY: "Electricity",
};

function categoryLabel(category: string) {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  return category
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const SORT_LABELS: Record<SortKey, string> = {
  date_desc: "Date (newest first)",
  date_asc: "Date (oldest first)",
  amount_desc: "Amount (high to low)",
  amount_asc: "Amount (low to high)",
};

const EXPORT_COLUMNS = ["When", "Type", "Category", "Amount", "Balance after", "Description"];

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function TransactionsTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const role = getUser()?.role;
  const canCreditWallet = isOrgAdmin(role);

  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [entries, setEntries] = useState<LedgerEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [topupsLoading, setTopupsLoading] = useState(true);
  const [busyTopupId, setBusyTopupId] = useState<string | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addingFunds, setAddingFunds] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<EntryTypeFilter>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");

  async function loadWalletAndLedger() {
    setLoading(true);
    setBalanceLoading(true);
    try {
      const [walletData, ledgerData] = await Promise.all([
        apiFetch<{ walletBalance?: number; balance?: number }>(`/api/v1/clients/${clientId}/wallet`),
        apiFetch<LedgerEntryDto[]>(`/api/v1/clients/${clientId}/wallet/ledger`),
      ]);
      setBalance(walletData.walletBalance ?? walletData.balance ?? 0);
      setEntries(ledgerData);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load wallet transactions",
      );
    } finally {
      setLoading(false);
      setBalanceLoading(false);
    }
  }

  async function loadTopups() {
    setTopupsLoading(true);
    try {
      setTopups(await apiFetch<WalletTopup[]>(`/api/v1/clients/${clientId}/wallet/topups`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load top-up requests");
    } finally {
      setTopupsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWalletAndLedger();
    void loadTopups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleAddFunds(e: React.FormEvent) {
    e.preventDefault();
    setAddingFunds(true);
    try {
      const updated = await apiFetch<ClientWallet>(
        `/api/v1/paytrix/wallets/${clientId}/credit`,
        {
          method: "POST",
          body: {
            amount: Number(addAmount),
            note: addNote.trim() || "Manual wallet credit",
          },
        },
      );
      toast.success(`${inr(Number(addAmount))} credited to wallet`);
      setAddFundsOpen(false);
      setAddAmount("");
      setAddNote("");
      setBalance(updated.balance);
      await loadWalletAndLedger();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to credit wallet");
    } finally {
      setAddingFunds(false);
    }
  }

  async function reviewTopup(id: string, approve: boolean) {
    setBusyTopupId(id);
    try {
      await apiFetch(`/api/v1/paytrix/wallet-topups/${id}/review`, {
        method: "POST",
        body: { approve },
      });
      toast.success(approve ? "Top-up accepted and wallet credited" : "Top-up rejected");
      await Promise.all([loadTopups(), loadWalletAndLedger()]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyTopupId(null);
    }
  }

  const visible = useMemo(() => {
    let result = entries;
    if (entryType !== "ALL")
      result = result.filter((e) => e.entryType === entryType);
    if (category !== "ALL")
      result = result.filter((e) => e.category === category);
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((e) => new Date(e.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`).getTime();
      result = result.filter((e) => new Date(e.createdAt).getTime() <= to);
    }
    if (amountMin) {
      const min = Number(amountMin);
      result = result.filter((e) => e.amount >= min);
    }
    if (amountMax) {
      const max = Number(amountMax);
      result = result.filter((e) => e.amount <= max);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e) =>
        (e.description ?? "").toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        case "date_desc":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
  }, [entries, entryType, category, dateFrom, dateTo, amountMin, amountMax, search, sort]);

  const activeFilterCount = [
    entryType !== "ALL",
    category !== "ALL",
    Boolean(dateFrom),
    Boolean(dateTo),
    Boolean(amountMin),
    Boolean(amountMax),
    Boolean(search.trim()),
    sort !== "date_desc",
  ].filter(Boolean).length;

  function resetFilters() {
    setEntryType("ALL");
    setCategory("ALL");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSearch("");
  }

  const categories = useMemo(() => {
    const set = new Set<string>(["RECHARGE", "ADJUSTMENT", "FEE", "ELECTRICITY"]);
    for (const entry of entries) {
      if (entry.category) set.add(entry.category);
    }
    return Array.from(set).sort();
  }, [entries]);

  function exportRows() {
    return visible.map((e) => [
      new Date(e.createdAt).toLocaleString(),
      e.entryType,
      categoryLabel(e.category),
      e.amount,
      e.balanceAfter,
      e.description ?? "",
    ]);
  }

  function exportXlsx() {
    if (visible.length === 0) {
      toast.error("Nothing to export with the current filters");
      return;
    }
    const blob = buildXlsxBlob({
      sheetName: "Transactions",
      title: `Client Wallet Transactions (${clientId})`,
      meta: [
        { label: "Client", value: clientId },
        { label: "Rows", value: String(visible.length) },
      ],
      headers: EXPORT_COLUMNS,
      rows: exportRows(),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${clientId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${visible.length} transactions as Excel`);
  }

  async function exportPdf() {
    if (visible.length === 0) {
      toast.error("Nothing to export with the current filters");
      return;
    }
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Client transactions", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [EXPORT_COLUMNS],
        body: exportRows().map((row) => [
          row[0],
          row[1],
          row[2],
          `Rs. ${Number(row[3]).toLocaleString("en-IN")}`,
          `Rs. ${Number(row[4]).toLocaleString("en-IN")}`,
          row[5],
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      });
      doc.save(`transactions-${clientId}.pdf`);
      toast.success(`Exported ${visible.length} transactions as PDF`);
    } catch {
      toast.error("Could not generate the PDF");
    } finally {
      setExportingPdf(false);
    }
  }

  const creditAmount = Number(addAmount);
  const nextBalance =
    balance != null && Number.isFinite(creditAmount) && creditAmount > 0
      ? balance + creditAmount
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Wallet size={20} />
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Wallet balance
            </p>
            {balanceLoading || balance == null ? (
              <Skeleton className="mt-1 h-8 w-36" />
            ) : (
              <p className="mt-0.5 font-mono text-2xl font-bold tracking-tight text-slate-900">
                {inr(balance)}
              </p>
            )}
          </div>
        </div>
        {canCreditWallet && (
          <Button
            icon={<PlusCircle size={16} />}
            onClick={() => {
              setAddAmount("");
              setAddNote("");
              setAddFundsOpen(true);
            }}
          >
            Add money
          </Button>
        )}
      </div>

      {!topupsLoading && topups.length > 0 && (
        <Card>
          <CardHeader
            title="Wallet top-up requests"
            description="Review offline top-up requests submitted by this corporate."
          />
          <Table>
            <THead columns={["Amount", "Payment mode", "Reference", "Status", "Requested", ""]} />
            <TBody>
              {topups.map((t) => (
                <TR key={t.id}>
                  <TD className="font-mono text-sm font-semibold text-slate-900">
                    {inr(t.amount)}
                  </TD>
                  <TD>{t.paymentMode}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span>{t.paymentReference ?? "—"}</span>
                      {t.hasProof && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setProofId(`/api/v1/clients/${clientId}/wallet/topups/${t.id}/proof`)}
                        >
                          View proof
                        </Button>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge status={t.status} />
                  </TD>
                  <TD className="text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TD>
                  <TD>
                    {t.status === "PENDING" &&
                      (t.canReview ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={busyTopupId === t.id}
                            onClick={() => reviewTopup(t.id, true)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyTopupId === t.id}
                            onClick={() => reviewTopup(t.id, false)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : role === "MAKER" ? (
                        <span className="text-xs font-medium text-amber-700">Waiting for a checker</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      ))}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <ListCard fitContent={false}>
        <CardHeader
          title="Wallet transactions"
          description={
            loading
              ? "Loading..."
              : `${visible.length} of ${entries.length} transactions`
          }
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<SlidersHorizontal size={14} />}
                onClick={() => setFilterModalOpen(true)}
              >
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={14} />}
                onClick={exportXlsx}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<FileText size={14} />}
                loading={exportingPdf}
                onClick={exportPdf}
              >
                Export PDF
              </Button>
            </div>
          }
        />
        {loading ? (
          <TableSkeleton cols={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No matching transactions"
            description="Wallet credits and bill payment debits will appear here."
          />
        ) : (
          <Table>
            <THead
              columns={[
                "When",
                "Type",
                "Category",
                "Amount",
                "Balance after",
                "Description",
              ]}
            />
            <TBody>
              {visible.map((e, i) => (
                <TR key={i}>
                  <TD className="text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </TD>
                  <TD
                    className={cn(
                      "font-medium",
                      e.entryType === "CREDIT"
                        ? "text-emerald-600"
                        : "text-red-600",
                    )}
                  >
                    {e.entryType}
                  </TD>
                  <TD>
                    <StatusBadge status={e.category} />
                  </TD>
                  <TD>₹{e.amount.toLocaleString("en-IN")}</TD>
                  <TD>₹{e.balanceAfter.toLocaleString("en-IN")}</TD>
                  <TD className="text-slate-500">{e.description ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={addFundsOpen}
        onClose={() => setAddFundsOpen(false)}
        title="Add money to wallet"
        description="Credits the corporate wallet immediately and records a manual credit entry."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddFundsOpen(false)}>
              Cancel
            </Button>
            <Button
              form="wallet-add-funds-form"
              type="submit"
              loading={addingFunds}
              disabled={!Number.isFinite(creditAmount) || creditAmount <= 0}
            >
              Add money
            </Button>
          </>
        }
      >
        <form id="wallet-add-funds-form" onSubmit={handleAddFunds} className="flex flex-col gap-4">
          <Field
            label="Amount (₹)"
            type="number"
            required
            min={1}
            step="0.01"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="5000"
          />
          <Field
            label="Note"
            value={addNote}
            onChange={(e) => setAddNote(e.target.value)}
            placeholder="Reason or payment reference"
          />
          {nextBalance != null && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              New wallet balance will be <strong className="font-mono text-slate-900">{inr(nextBalance)}</strong>.
            </p>
          )}
        </form>
      </Modal>

      <Modal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filter transactions"
        description="Applies immediately - close this once you're happy with the results."
        footer={
          <>
            <Button variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
            <Button onClick={() => setFilterModalOpen(false)}>Done</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as EntryTypeFilter)}
          >
            <option value="ALL">All</option>
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </SelectField>
          <SelectField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </SelectField>
          <Field
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Field
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Field
            label="Min amount"
            type="number"
            min={0}
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
          />
          <Field
            label="Max amount"
            type="number"
            min={0}
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
          />
          <Field
            label="Search description"
            className="sm:col-span-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. bill, top-up..."
          />
          <SelectField
            label="Sort by"
            className="sm:col-span-2"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </SelectField>
        </div>
      </Modal>

      <ProofModal src={proofId} onClose={() => setProofId(null)} />
    </div>
  );
}
