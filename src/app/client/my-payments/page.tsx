"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  Send,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { BillPayment, WalletBalance } from "@/lib/types";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMaybeDate(value: string | null) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatWhen(value);
  return value;
}

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function ClientMyPaymentsPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [consumerNumber, setConsumerNumber] = useState("");
  const [billerCategory, setBillerCategory] = useState("ALL");
  const [billerName, setBillerName] = useState("ALL");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  async function load() {
    setLoading(true);
    try {
      setPayments(await apiFetch<BillPayment[]>(`/api/v1/clients/${clientId}/my-payments`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  async function loadWalletBalance() {
    try {
      const { walletBalance: balance } = await apiFetch<WalletBalance>(
        `/api/v1/clients/${clientId}/wallet`,
      );
      setWalletBalance(balance);
    } catch {
      // The confirm dialog still works; it just cannot preview the balance.
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadWalletBalance();
  }, []);

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
    if (billerCategory !== "ALL") result = result.filter((payment) => payment.billServiceCode === billerCategory);
    if (billerName !== "ALL") result = result.filter((payment) => payment.billerName === billerName);
    if (consumerNumber.trim()) {
      const query = consumerNumber.trim().toLowerCase();
      result = result.filter((payment) => payment.customerBillAccountNumber.toLowerCase().includes(query));
    }
    result = result.filter((payment) => matchesAmount(payment.amount, amountMin, amountMax));
    return [...result].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [payments, billerCategory, billerName, consumerNumber, amountMin, amountMax]);

  const amountRangeActive = Boolean(amountMin.trim() || amountMax.trim());
  const activeFilterCount = [
    billerCategory !== "ALL",
    billerName !== "ALL",
    Boolean(consumerNumber.trim()),
    amountRangeActive,
  ].filter(Boolean).length;

  const allVisibleSelected = visible.length > 0 && visible.every((payment) => selectedIds.has(payment.id));
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
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      if (visible.length > 0 && visible.every((payment) => prev.has(payment.id))) return new Set();
      return new Set(visible.map((payment) => payment.id));
    });
  }

  function requestPayOne(id: string) {
    setConfirmIds([id]);
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
      await apiFetch(`/api/v1/clients/${clientId}/my-payments/pay`, {
        method: "POST",
        body: { billPaymentIds: confirmIds },
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
      await loadWalletBalance();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setConfirming(false);
    }
  }

  const categoryLabel = categoryOptions.find(([code]) => code === billerCategory)?.[1];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="My Payments"
        description="Bills that are due. Pay one, or select several and pay them together."
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

      <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl bg-slate-100 px-3 py-2">
        <span className="text-xs font-semibold text-slate-700">
          Due
          <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
            {visible.length}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Wallet size={14} />
          {walletBalance != null ? inr(walletBalance) : "—"}
        </span>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {consumerNumber.trim() && (
            <FilterChip label={consumerNumber.trim()} onClear={() => setConsumerNumber("")} />
          )}
          {billerCategory !== "ALL" && (
            <FilterChip label={categoryLabel ?? billerCategory} onClear={() => setBillerCategory("ALL")} />
          )}
          {billerName !== "ALL" && (
            <FilterChip label={billerName} onClear={() => setBillerName("ALL")} />
          )}
          {amountRangeActive && (
            <FilterChip
              label={amountRangeLabel(amountMin, amountMax)}
              onClear={() => {
                setAmountMin("");
                setAmountMax("");
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

      <ListCard>
        {selectedIds.size > 0 && (
          <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-indigo-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {selectedIds.size} selected
              <span className="font-medium text-slate-500"> · {inr(selectedTotal)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<Send size={14} />} onClick={requestPayBulk}>
                Pay selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <TableSkeleton cols={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={payments.length === 0 ? "Nothing due" : "No payments match"}
            description={
              payments.length === 0
                ? "Bills show up here once a managed bill is fetched and due."
                : "Try another biller or clear the filters."
            }
          />
        ) : (
          <>
            <div className="hidden min-h-0 flex-1 flex-col md:flex">
              <Table>
                <THead
                  columns={[
                    <input
                      key="select-all"
                      type="checkbox"
                      aria-label="Select all visible payments"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />,
                    "Biller",
                    "Consumer no.",
                    "Amount",
                    "Status",
                    "Due",
                    "",
                  ]}
                />
                <TBody>
                  {visible.map((payment) => {
                    const expanded = expandedIds.has(payment.id);
                    return (
                      <Fragment key={payment.id}>
                        <TR className="cursor-pointer" onClick={() => toggleExpand(payment.id)}>
                          <TD onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${payment.billerName}`}
                              checked={selectedIds.has(payment.id)}
                              onChange={() => toggleSelect(payment.id)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </TD>
                          <TD>
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-slate-400">
                                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{payment.billerName}</p>
                                <p className="text-[11px] font-medium text-slate-400">
                                  {payment.billServiceName}
                                </p>
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <CopyableChip text={payment.customerBillAccountNumber} label="consumer number" />
                          </TD>
                          <TD className="font-mono text-sm font-semibold text-slate-900">
                            {inr(payment.amount)}
                          </TD>
                          <TD>
                            <StatusBadge status={payment.paymentStatus} />
                          </TD>
                          <TD className="text-slate-500">{formatMaybeDate(payment.dueDate)}</TD>
                          <TD onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              icon={<Send size={14} />}
                              onClick={() => requestPayOne(payment.id)}
                            >
                              Pay
                            </Button>
                          </TD>
                        </TR>
                        {expanded && (
                          <TR className="hover:bg-transparent">
                            <TD colSpan={7} className="bg-slate-50 px-4 py-3 whitespace-normal!">
                              <PaymentDetail payment={payment} />
                            </TD>
                          </TR>
                        )}
                      </Fragment>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 md:hidden">
              <div className="mb-2 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="min-h-11 text-xs font-semibold text-indigo-700"
                >
                  {allVisibleSelected ? "Clear selection" : "Select all"}
                </button>
                <span className="text-xs text-slate-500">{visible.length} bills</span>
              </div>
              <ul className="flex flex-col gap-3">
                {visible.map((payment) => {
                  const expanded = expandedIds.has(payment.id);
                  return (
                    <li
                      key={payment.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-card)]"
                    >
                      <div className="flex items-start gap-3 p-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${payment.billerName}`}
                          checked={selectedIds.has(payment.id)}
                          onChange={() => toggleSelect(payment.id)}
                          className="mt-1 h-5 w-5 rounded border-slate-300"
                        />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(payment.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {payment.billerName}
                                </p>
                                <p className="text-xs text-slate-500">{payment.billServiceName}</p>
                              </div>
                              <p className="shrink-0 font-mono text-sm font-semibold text-slate-900">
                                {inr(payment.amount)}
                              </p>
                            </div>
                            <div className="mt-3">
                              <StatusBadge status={payment.paymentStatus} />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              Due {formatMaybeDate(payment.dueDate)}
                            </p>
                          </button>
                          <div className="mt-2">
                            <CopyableChip
                              text={payment.customerBillAccountNumber}
                              label="consumer number"
                            />
                          </div>
                        </div>
                      </div>
                      {expanded && (
                        <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                          <PaymentDetail payment={payment} />
                        </div>
                      )}
                      <div className="border-t border-slate-100 px-4 py-3">
                        <Button
                          size="sm"
                          className="w-full"
                          icon={<Send size={14} />}
                          onClick={() => requestPayOne(payment.id)}
                        >
                          Pay
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
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
        title="Filter payments"
        description="These apply to the bills waiting for payment."
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
            onChange={(e) => setConsumerNumber(e.target.value)}
            placeholder="e.g. 100234567"
          />
          <SelectField
            label="Biller category"
            value={billerCategory}
            onChange={(e) => setBillerCategory(e.target.value)}
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
            onChange={(e) => setBillerName(e.target.value)}
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
              onChange={(e) => setAmountMin(e.target.value)}
              placeholder="0"
            />
            <Field
              label="Max amount"
              type="number"
              min={0}
              step="0.01"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              placeholder="Any"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PaymentDetail({ payment }: { payment: BillPayment }) {
  const lines =
    payment.amountBreakdown.length > 0
      ? payment.amountBreakdown
      : [{ label: "Bill amount", amount: payment.amount }];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <section>
          <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Amount</h3>
          <dl className="mt-3 flex flex-col gap-1.5">
            {lines.map((line) => (
              <div key={line.label} className="flex items-baseline justify-between gap-4 text-xs">
                <dt className="text-slate-500">{line.label}</dt>
                <dd className="font-mono font-medium text-slate-800">{inr(line.amount)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-slate-200 pt-3">
            <span className="text-xs font-semibold text-slate-700">Total</span>
            <span className="font-mono text-sm font-semibold text-slate-900">{inr(payment.amount)}</span>
          </div>
        </section>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <DetailField label="Customer" value={payment.customerName ?? "—"} />
          <DetailField label="Mobile" value={payment.customerMobileNumber ?? "—"} mono />
          <DetailField label="Category" value={payment.billServiceName} />
          <DetailField label="Bill no." value={payment.billNumber ?? "—"} mono />
          <DetailField label="Period" value={payment.billPeriod ?? "—"} />
          <DetailField label="Bill date" value={formatMaybeDate(payment.billDate)} />
          <DetailField label="Due" value={formatMaybeDate(payment.dueDate)} />
        </dl>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm text-slate-900", mono ? "font-mono font-medium" : "font-medium")}>
        {value}
      </dd>
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

function amountRangeLabel(min: string, max: string) {
  const minN = min.trim() === "" ? null : Number(min);
  const maxN = max.trim() === "" ? null : Number(max);
  const hasMin = minN != null && Number.isFinite(minN);
  const hasMax = maxN != null && Number.isFinite(maxN);
  if (hasMin && hasMax) return `${inr(minN)} – ${inr(maxN)}`;
  if (hasMin) return `From ${inr(minN)}`;
  if (hasMax) return `Up to ${inr(maxN)}`;
  return "Amount";
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
    >
      {label}
      <X size={12} className="text-slate-400" />
    </button>
  );
}
