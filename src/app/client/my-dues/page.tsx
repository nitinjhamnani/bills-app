"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  Search,
  Send,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { BillPayment, WalletBalance } from "@/lib/types";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMaybeDate(value: string | null | undefined) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatWhen(value);
  return value;
}

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function ClientMyDuesPage() {
  const toast = useToast();
  const router = useRouter();
  const user = getUser();
  const clientId = user?.clientId ?? "";
  const role = user?.role;
  const canPay = role === "CORP_ADMIN" || role === "CORP_OPERATOR";
  const showBranch = role === "CORP_ADMIN" || role === "CORP_OPERATOR";

  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [consumerNumber, setConsumerNumber] = useState("");
  const [billerCategory, setBillerCategory] = useState("ALL");
  const [billerName, setBillerName] = useState("ALL");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  async function copyText(key: string, text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`Copied ${text}`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error(`Could not copy ${label}`);
    }
  }

  async function load() {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPayments(await apiFetch<BillPayment[]>(`/api/v1/clients/${clientId}/my-dues`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load dues");
    } finally {
      setLoading(false);
    }
  }

  async function loadWalletBalance() {
    if (!clientId || !canPay) return;
    try {
      const { walletBalance: balance } = await apiFetch<WalletBalance>(
        `/api/v1/clients/${clientId}/wallet`,
      );
      setWalletBalance(balance);
    } catch {
      // Confirm dialog still works even if balance preview cannot be loaded.
    }
  }

  useEffect(() => {
    if (!clientId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    if (canPay) loadWalletBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, canPay]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const payment of payments) map.set(payment.billServiceCode, payment.billServiceName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [payments]);

  const billerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const payment of payments) set.add(payment.billerName);
    return Array.from(set).sort();
  }, [payments]);

  const visible = useMemo(() => {
    let result = payments;
    if (billerCategory !== "ALL") {
      result = result.filter((payment) => payment.billServiceCode === billerCategory);
    }
    if (billerName !== "ALL") {
      result = result.filter((payment) => payment.billerName === billerName);
    }
    if (consumerNumber.trim()) {
      const query = consumerNumber.trim().toLowerCase();
      result = result.filter((payment) =>
        payment.customerBillAccountNumber.toLowerCase().includes(query),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (payment) =>
          payment.billId.toLowerCase().includes(q) ||
          (payment.branchName ?? "").toLowerCase().includes(q) ||
          payment.billerName.toLowerCase().includes(q) ||
          payment.billServiceName.toLowerCase().includes(q) ||
          payment.customerBillAccountNumber.toLowerCase().includes(q) ||
          (payment.customerName ?? "").toLowerCase().includes(q),
      );
    }
    result = result.filter((payment) => matchesAmount(payment.amount, amountMin, amountMax));
    return [...result].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [payments, billerCategory, billerName, consumerNumber, search, amountMin, amountMax]);

  const totalDueAmount = useMemo(
    () => visible.reduce((sum, payment) => sum + (payment.amount ?? 0), 0),
    [visible],
  );

  const totalPages = Math.ceil(visible.length / pageSize);
  const paged = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const amountRangeActive = Boolean(amountMin.trim() || amountMax.trim());
  const activeFilterCount = [
    billerCategory !== "ALL",
    billerName !== "ALL",
    Boolean(consumerNumber.trim()),
    amountRangeActive,
  ].filter(Boolean).length;

  const allVisibleSelected =
    visible.length > 0 && visible.every((payment) => selectedIds.has(payment.id));
  const selectedTotal = useMemo(
    () =>
      payments
        .filter((payment) => selectedIds.has(payment.id))
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments, selectedIds],
  );

  function resetFilters() {
    setBillerCategory("ALL");
    setBillerName("ALL");
    setConsumerNumber("");
    setAmountMin("");
    setAmountMax("");
    setCurrentPage(1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (visible.length > 0 && visible.every((payment) => prev.has(payment.id))) {
        return new Set();
      }
      return new Set(visible.map((payment) => payment.id));
    });
  }

  function requestPayBulk() {
    if (selectedIds.size === 0) return;
    setConfirmIds(Array.from(selectedIds));
  }

  const confirmBills = useMemo(
    () => (confirmIds ? payments.filter((payment) => confirmIds.includes(payment.id)) : []),
    [confirmIds, payments],
  );
  const confirmTotal = useMemo(
    () => confirmBills.reduce((sum, payment) => sum + payment.amount, 0),
    [confirmBills],
  );
  const balanceAfter = walletBalance != null ? walletBalance - confirmTotal : null;
  const insufficientFunds = balanceAfter != null && balanceAfter < 0;

  async function confirmPay() {
    if (!confirmIds || confirmIds.length === 0) return;
    setConfirming(true);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/my-dues/pay`, {
        method: "POST",
        body: { billFetchIds: confirmIds },
      });
      toast.success(
        confirmIds.length === 1
          ? "Bill paid — wallet debited"
          : `Paid ${confirmIds.length} bills — wallet debited`,
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of confirmIds) next.delete(id);
        return next;
      });
      setConfirmIds(null);
      await load();
      if (canPay) await loadWalletBalance();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setConfirming(false);
    }
  }

  const categoryLabel = categoryOptions.find(([code]) => code === billerCategory)?.[1];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Bill Dues"
        description={
          canPay
            ? "Bills that are due. Select one or more bills to pay them from the corporate wallet."
            : "Bills due for your branches. Payment is made from the corporate wallet."
        }
        actions={
          <Button
            variant="outline"
            icon={<SlidersHorizontal size={16} />}
            onClick={() => setFilterModalOpen(true)}
          >
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        }
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-slate-700">
          <span>
            Due bills
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              {visible.length}
            </span>
            {visible.length !== payments.length && (
              <span className="ml-1 text-slate-400">of {payments.length}</span>
            )}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-slate-700">
            Total due: <span className="text-slate-900">{inr(totalDueAmount)}</span>
          </span>
          {canPay && (
            <>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Wallet size={14} className="text-slate-400" />
                Wallet:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {walletBalance != null ? inr(walletBalance) : "—"}
                </span>
              </span>
            </>
          )}
          {canPay && selectedIds.size > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono font-bold text-indigo-700">
                Selected ({selectedIds.size}): {inr(selectedTotal)}
              </span>
            </>
          )}
        </div>

        {canPay && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" icon={<Send size={14} />} onClick={requestPayBulk}>
              Pay selected ({selectedIds.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {consumerNumber.trim() && (
            <FilterChip
              label={consumerNumber.trim()}
              onClear={() => {
                setConsumerNumber("");
                setCurrentPage(1);
              }}
            />
          )}
          {billerCategory !== "ALL" && (
            <FilterChip
              label={categoryLabel ?? billerCategory}
              onClear={() => {
                setBillerCategory("ALL");
                setCurrentPage(1);
              }}
            />
          )}
          {billerName !== "ALL" && (
            <FilterChip
              label={billerName}
              onClear={() => {
                setBillerName("ALL");
                setCurrentPage(1);
              }}
            />
          )}
          {amountRangeActive && (
            <FilterChip
              label={amountRangeLabel(amountMin, amountMax)}
              onClear={() => {
                setAmountMin("");
                setAmountMax("");
                setCurrentPage(1);
              }}
            />
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-11 px-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Clear filters
          </button>
        </div>
      )}

      <ListCard fitContent={false}>
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-80">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search branch, biller, or consumer no."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {canPay && (
            <p className="text-xs font-bold text-blue-600">
              Select the bills you want to pay using the checkboxes.
            </p>
          )}
        </div>

        {loading ? (
          <TableSkeleton cols={showBranch ? 6 : 5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={payments.length === 0 ? "No bill dues" : "No bill dues match"}
            description={
              payments.length === 0
                ? "Bills show up here once a managed bill is fetched and due."
                : "Try another filter or clear the search."
            }
            action={
              payments.length > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetFilters();
                    setSearch("");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={[
                  ...(canPay
                    ? [
                        <input
                          key="select-all"
                          type="checkbox"
                          aria-label="Select all visible dues"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300"
                        />,
                      ]
                    : []),
                  ...(showBranch ? ["Branch"] : []),
                  "Biller",
                  "Consumer",
                  "Amount",
                  "Due date",
                  "Last fetch",
                ]}
              />
              <TBody>
                {paged.map((payment) => (
                  <TR
                    key={payment.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/client/managed-bills/${payment.billId}`)}
                  >
                    {canPay && (
                      <TD onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${payment.billerName}`}
                          checked={selectedIds.has(payment.id)}
                          onChange={() => toggleSelect(payment.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </TD>
                    )}
                    {showBranch && (
                      <TD className="font-medium text-slate-800">
                        {payment.branchName ?? "—"}
                      </TD>
                    )}
                    <TD>
                      <p className="font-semibold text-slate-900">{payment.billerName}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {payment.billServiceName}
                      </p>
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="Copy consumer ID"
                        onClick={() =>
                          void copyText(
                            `consumer:${payment.id}`,
                            payment.customerBillAccountNumber,
                            "consumer ID",
                          )
                        }
                        className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                      >
                        <span>{payment.customerBillAccountNumber}</span>
                        {copiedKey === `consumer:${payment.id}` ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                        )}
                      </button>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {payment.customerName || "—"}
                      </p>
                    </TD>
                    <TD className="font-mono text-sm font-semibold text-slate-900">
                      {inr(payment.amount)}
                    </TD>
                    <TD className="text-xs font-medium text-slate-700">
                      {formatMaybeDate(payment.dueDate)}
                    </TD>
                    <TD className="text-xs text-slate-500">
                      {formatDateTime(payment.createdAt)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={visible.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </ListCard>

      <Modal
        open={confirmIds !== null}
        onClose={() => (!confirming ? setConfirmIds(null) : undefined)}
        title={confirmIds && confirmIds.length === 1 ? "Confirm payment" : "Confirm bulk payment"}
        description="Review before your wallet is debited."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmIds(null)} disabled={confirming}>
              Cancel
            </Button>
            <Button
              icon={<Send size={16} />}
              loading={confirming}
              disabled={insufficientFunds}
              onClick={confirmPay}
            >
              Confirm and pay
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-400">
                {confirmBills.length === 1 ? "Bill" : "Bills"}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{confirmBills.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium text-slate-400">Total</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{inr(confirmTotal)}</p>
            </div>
          </div>

          {confirmBills.length > 1 && (
            <ul className="max-h-40 overflow-y-auto rounded-xl border border-slate-200">
              {confirmBills.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">{payment.billerName}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {payment.customerBillAccountNumber}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-xs font-semibold text-slate-900">
                    {inr(payment.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Wallet size={16} />
              Balance before
            </span>
            <span className="font-mono text-sm font-semibold text-slate-900">
              {walletBalance != null ? inr(walletBalance) : "—"}
            </span>
          </div>

          {balanceAfter != null && (
            <div
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl border px-4 py-3",
                insufficientFunds ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  insufficientFunds ? "text-rose-700" : "text-emerald-700",
                )}
              >
                Balance after
              </span>
              <span
                className={cn(
                  "font-mono text-sm font-semibold",
                  insufficientFunds ? "text-rose-700" : "text-emerald-700",
                )}
              >
                {inr(balanceAfter)}
              </span>
            </div>
          )}

          {insufficientFunds && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
              <AlertTriangle size={14} /> The wallet does not cover this payment.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filter bill dues"
        description="Narrow the list by consumer number, category, biller, or amount."
        footer={
          <>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
            <Button onClick={() => setFilterModalOpen(false)}>Done</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Field
            label="Consumer number"
            value={consumerNumber}
            onChange={(e) => {
              setConsumerNumber(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="e.g. 100234567"
          />
          <SelectField
            label="Biller category"
            value={billerCategory}
            onChange={(e) => {
              setBillerCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            {categoryOptions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Biller name"
            value={billerName}
            onChange={(e) => {
              setBillerName(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            {billerOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Min amount"
              type="number"
              min={0}
              step="0.01"
              value={amountMin}
              onChange={(e) => {
                setAmountMin(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="0"
            />
            <Field
              label="Max amount"
              type="number"
              min={0}
              step="0.01"
              value={amountMax}
              onChange={(e) => {
                setAmountMax(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="No limit"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function matchesAmount(amount: number | null | undefined, min: string, max: string) {
  const minN = min.trim() === "" ? null : Number(min);
  const maxN = max.trim() === "" ? null : Number(max);
  const hasMin = minN != null && Number.isFinite(minN);
  const hasMax = maxN != null && Number.isFinite(maxN);
  if (!hasMin && !hasMax) return true;
  if (amount == null) return false;
  if (hasMin && amount < minN) return false;
  if (hasMax && amount > maxN) return false;
  return true;
}

function amountRangeLabel(minRaw: string, maxRaw: string) {
  const min = minRaw.trim();
  const max = maxRaw.trim();
  if (min && max) return `₹${min} – ₹${max}`;
  if (min) return `≥ ₹${min}`;
  return `≤ ₹${max}`;
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-1 rounded-full border border-slate-200 bg-white pr-1 pl-3 text-xs font-medium text-slate-700">
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={13} />
      </button>
    </span>
  );
}
