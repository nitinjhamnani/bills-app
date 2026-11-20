"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  GitBranch,
  ListTree,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReasonModal } from "@/components/ui/ReasonModal";
import { useToast } from "@/components/ui/Toast";
import { isOrgAdmin, type BillPayment, type Dispute, type ManagedBill } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water",
  GAS: "Piped Gas",
  DTH: "DTH / Cable TV",
  BROADBAND: "Broadband / Fibernet",
  MOBILE_POSTPAID: "Mobile Postpaid",
  LANDLINE: "Landline",
  INSURANCE_PREMIUM: "Insurance Premium",
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DUE", label: "Due" },
  { key: "PAID", label: "Paid" },
  { key: "FAILED", label: "Failed" },
] as const;

type CycleFilter = (typeof FILTERS)[number]["key"];

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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

function creatorRoleLabel(role: string | null | undefined) {
  if (role === "CORP_ADMIN") return "Corporate Admin";
  if (role === "BRANCH_USER" || role === "CORP_OPERATOR") return "Branch User";
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ORGANISATION_ADMIN") return "Paytrix Admin";
  return role || null;
}

function cycleBucket(payment: BillPayment): Exclude<CycleFilter, "ALL"> | "OTHER" {
  if (payment.billStatus === "FAILED") return "FAILED";
  if (payment.billStatus === "DUE") return "DUE";
  if (payment.billStatus === "PAID") return "PAID";
  return "OTHER";
}

export default function PaytrixBillDetailsPage() {
  const params = useParams<{ id: string }>();
  const billId = params.id;
  const router = useRouter();
  const toast = useToast();
  const user = getUser();
  const role = user?.role;
  const canEdit = isOrgAdmin(role) || role === "MAKER" || role === "CHECKER";
  const canManageAutoPay = isOrgAdmin(role);

  const [bill, setBill] = useState<ManagedBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [filter, setFilter] = useState<CycleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [autoFetchEnabled, setAutoFetchEnabled] = useState(false);
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [disputesByPayment, setDisputesByPayment] = useState<Record<string, Dispute[]>>({});
  const [disputeTarget, setDisputeTarget] = useState<string | null>(null);

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`Copied ${text}`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function load() {
    setLoading(true);
    try {
      const next = await apiFetch<ManagedBill>(`/api/v1/paytrix/managed-bills/${billId}`);
      setBill(next);
      setAutoFetchEnabled(next.autoFetchEnabled);
      setAutoPayEnabled(next.autoPayEnabled);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill");
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    try {
      const list = await apiFetch<BillPayment[]>(
        `/api/v1/paytrix/managed-bills/${billId}/payments`,
      );
      setPayments(list);
      await loadDisputes(list);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill history");
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function loadDisputes(list: BillPayment[]) {
    const fullyPaid = list.filter((payment) => payment.billStatus === "PAID");
    if (fullyPaid.length === 0) return;
    const entries = await Promise.all(
      fullyPaid.map(async (payment) => {
        try {
          const disputes = await apiFetch<Dispute[]>(`/api/v1/bill-payments/${payment.id}/disputes`);
          return [payment.id, disputes] as const;
        } catch {
          return [payment.id, []] as const;
        }
      }),
    );
    setDisputesByPayment(Object.fromEntries(entries));
  }

  async function submitDispute(reason: string) {
    if (!disputeTarget) return;
    try {
      await apiFetch(`/api/v1/bill-payments/${disputeTarget}/disputes`, {
        method: "POST",
        body: { reason },
      });
      toast.success("Dispute raised");
      setDisputeTarget(null);
      await loadDisputes(payments);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to raise dispute");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId]);

  async function retryFetch() {
    if (!bill) return;
    setRetrying(true);
    try {
      await apiFetch(`/api/v1/clients/${bill.clientId}/managed-bills/${billId}/retry-fetch`, {
        method: "POST",
      });
      toast.success("Fetch retried");
      await load();
      await loadPayments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  async function saveAutomation(next: { autoFetchEnabled: boolean; autoPayEnabled: boolean }) {
    if (!bill) return;
    setSavingAutomation(true);
    try {
      await apiFetch<ManagedBill>(
        `/api/v1/clients/${bill.clientId}/managed-bills/${billId}/automation`,
        { method: "PATCH", body: next },
      );
      await load();
      if (savedFlashTimeout.current) clearTimeout(savedFlashTimeout.current);
      setSavedFlash(true);
      savedFlashTimeout.current = setTimeout(() => setSavedFlash(false), 1800);
    } catch (err) {
      setAutoFetchEnabled(bill?.autoFetchEnabled ?? false);
      setAutoPayEnabled(bill?.autoPayEnabled ?? false);
      toast.error(err instanceof ApiError ? err.message : "Failed to save automation");
    } finally {
      setSavingAutomation(false);
    }
  }

  function toggleAutoFetch(checked: boolean) {
    setAutoFetchEnabled(checked);
    saveAutomation({ autoFetchEnabled: checked, autoPayEnabled });
  }

  function toggleAutoPay(checked: boolean) {
    setAutoPayEnabled(checked);
    saveAutomation({ autoFetchEnabled, autoPayEnabled: checked });
  }

  useEffect(() => {
    return () => {
      if (savedFlashTimeout.current) clearTimeout(savedFlashTimeout.current);
    };
  }, []);

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payments;
    return payments.filter(
      (payment) =>
        (payment.billNumber ?? "").toLowerCase().includes(query) ||
        (payment.dueDate ?? "").toLowerCase().includes(query) ||
        String(payment.amount).includes(query),
    );
  }, [payments, search]);

  const counts: Record<CycleFilter, number> = {
    ALL: searched.length,
    DUE: searched.filter((payment) => cycleBucket(payment) === "DUE").length,
    PAID: searched.filter((payment) => cycleBucket(payment) === "PAID").length,
    FAILED: searched.filter((payment) => cycleBucket(payment) === "FAILED").length,
  };
  const visible = searched.filter((payment) => filter === "ALL" || cycleBucket(payment) === filter);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={14} />}
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      {loading || !bill ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xs sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {userInitials(bill.billerName)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                      {bill.billerName}
                    </h1>
                    <button
                      type="button"
                      title="Copy bill ID"
                      onClick={() => copyText("bill-code", bill.id)}
                      className="group inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <span>{bill.id}</span>
                      {copiedKey === "bill-code" ? (
                        <Check size={11} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                      )}
                    </button>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                    {CATEGORY_LABELS[bill.billServiceCode] ?? bill.billServiceName}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {bill.amount != null && !bill.lastFetchFailed && bill.billStatus !== "FAILED" && (
                  <p className="font-mono text-2xl font-semibold tracking-tight text-slate-900">
                    {inr(bill.amount)}
                  </p>
                )}
                <StatusBadge status={bill.lastFetchFailed ? "FAILED" : bill.billStatus} />
                {!bill.lastFetchFailed &&
                  bill.billStatus !== "FAILED" &&
                  bill.paymentStatus !== bill.billStatus && (
                    <StatusBadge status={bill.paymentStatus} />
                  )}
                {canEdit && (bill.billStatus === "FAILED" || bill.lastFetchFailed) && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RotateCcw size={14} />}
                    loading={retrying}
                    onClick={retryFetch}
                  >
                    Retry fetch
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-600">
                {bill.clientName && (
                  <Link
                    href={`/paytrix/clients/${bill.clientId}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline"
                  >
                    <Building2 size={13} className="text-indigo-500" />
                    <span>{bill.clientName}</span>
                  </Link>
                )}
                {(bill.createdByName || bill.createdByUserId) && (
                  <div className="inline-flex flex-wrap items-center gap-1.5">
                    <UserRound size={13.5} className="text-slate-400" />
                    <span className="text-slate-500">Created by</span>
                    {bill.createdByName && (
                      <span className="font-semibold text-slate-800">{bill.createdByName}</span>
                    )}
                    {creatorRoleLabel(bill.createdByRole) && (
                      <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {creatorRoleLabel(bill.createdByRole)}
                      </span>
                    )}
                    {bill.createdByUserId && (
                      <button
                        type="button"
                        title="Copy creator user ID"
                        onClick={() => copyText("creator-id", bill.createdByUserId!)}
                        className="group inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <span>{bill.createdByUserId}</span>
                        {copiedKey === "creator-id" ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                        )}
                      </button>
                    )}
                  </div>
                )}
                {bill.branchName && (
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <GitBranch size={13} className="text-indigo-500" />
                    <span className="font-semibold text-slate-700">{bill.branchName}</span>
                  </span>
                )}
              </div>

              {bill.createdAt && (
                <div className="flex shrink-0 items-center gap-1.5 self-end text-xs font-medium text-slate-400 sm:self-auto">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Created on {formatWhen(bill.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid shrink-0 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Auto-fetch</p>
                <p className="mt-0.5 text-xs text-slate-500">Pull the next cycle from the biller.</p>
              </div>
              <Switch
                checked={autoFetchEnabled}
                disabled={savingAutomation || !canEdit}
                onChange={toggleAutoFetch}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Auto-pay</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {canManageAutoPay
                    ? "Pay a due cycle from the corporate's wallet."
                    : "Only an Admin can turn auto-pay on or off."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManageAutoPay && (
                  <span
                    aria-live="polite"
                    className={cn(
                      "flex items-center gap-1 text-xs font-semibold text-emerald-600 transition-opacity",
                      savedFlash ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <CheckCircle2 size={14} /> Saved
                  </span>
                )}
                <Switch
                  checked={autoPayEnabled}
                  disabled={savingAutomation || !canManageAutoPay}
                  onChange={toggleAutoPay}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
            <h2 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Bill</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <InfoField
                label="Consumer number"
                value={
                  <button
                    type="button"
                    title="Copy consumer number"
                    onClick={() => copyText("consumer-no", bill.customerBillAccountNumber)}
                    className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                  >
                    <span>{bill.customerBillAccountNumber}</span>
                    {copiedKey === "consumer-no" ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                    )}
                  </button>
                }
              />
              <InfoField label="Customer" value={bill.customerName ?? "—"} />
              <InfoField
                label="Mobile"
                value={<span className="font-mono">{bill.customerMobileNumber ?? "—"}</span>}
              />
              <InfoField label="Period" value={bill.billPeriod ?? "—"} />
              <InfoField label="Bill date" value={formatDate(bill.billDate)} />
              <InfoField label="Due date" value={formatDate(bill.dueDate)} />
              <InfoField
                label="Last fetched"
                value={bill.lastFetchAt ? formatWhen(bill.lastFetchAt) : "—"}
              />
              <InfoField
                label="Fetch"
                value={bill.lastFetchFailed ? (bill.lastFetchFailureReason ?? "Failed") : "OK"}
              />
            </dl>
            {bill.amountBreakdown.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                {bill.amountBreakdown.map((part) => (
                  <InfoField key={part.label} label={part.label} value={inr(part.amount)} />
                ))}
              </dl>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-4">
            <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
              {FILTERS.map((item) => {
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
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

            <ListCard>
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <div className="relative sm:max-w-sm">
                  <Search
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search bill number, due date, or amount"
                    className={searchClass}
                  />
                </div>
              </div>
              {paymentsLoading ? (
                <div className="flex flex-col gap-3 p-5">
                  {[0, 1].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <EmptyState
                  icon={ListTree}
                  title={payments.length === 0 ? "No cycles yet" : "No cycles match"}
                  description={
                    payments.length === 0
                      ? "Payable cycles for this bill show up here once paid."
                      : "Try another status or clear the search."
                  }
                />
              ) : (
                <Table>
                  <THead columns={["Due", "Amount", "Status", "", ""]} />
                  <TBody>
                    {visible.map((payment) => {
                      const fullyPaid = payment.billStatus === "PAID";
                      const disputes = disputesByPayment[payment.id] ?? [];
                      const openDispute = disputes.find(
                        (dispute) => dispute.status === "RAISED" || dispute.status === "UNDER_REVIEW",
                      );
                      const latestDispute = disputes[0];
                      return (
                        <TR
                          key={payment.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`/paytrix/bills/${billId}/payments/${payment.id}`)
                          }
                        >
                          <TD className="text-slate-600">{formatDate(payment.dueDate)}</TD>
                          <TD className="font-mono text-sm font-semibold text-slate-900">
                            {inr(payment.amount)}
                          </TD>
                          <TD>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge status={payment.billStatus} />
                              {payment.paymentStatus !== payment.billStatus && (
                                <StatusBadge status={payment.paymentStatus} />
                              )}
                            </div>
                          </TD>
                          <TD onClick={(e) => e.stopPropagation()}>
                            {!fullyPaid ? (
                              <span className="text-xs text-slate-300">—</span>
                            ) : openDispute ? (
                              <span className="text-xs font-medium text-amber-700">Under review</span>
                            ) : latestDispute ? (
                              <StatusBadge status={latestDispute.status} />
                            ) : isOrgAdmin(role) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                icon={<AlertTriangle size={14} />}
                                onClick={() => setDisputeTarget(payment.id)}
                              >
                                Raise dispute
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </TD>
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
        </>
      )}

      <ReasonModal
        open={disputeTarget !== null}
        title="Raise a dispute"
        label="Reason"
        confirmLabel="Raise dispute"
        onCancel={() => setDisputeTarget(null)}
        onConfirm={submitDispute}
      />
    </div>
  );
}
