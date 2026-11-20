"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  PackageCheck,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import { ConfirmAction, type ActionDetail } from "@/app/paytrix/vendor-rules/ConfirmAction";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { BillPayment, BulkRowResult, ClientAccount } from "@/lib/types";
import { vendorStageBadge, vendorStageOf } from "@/lib/vendor-stage";
import { API_BASE_URL } from "@/lib/workspace";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type VendorStage = "ASSIGNED" | "IN_PROGRESS" | "VENDOR_PAID" | "VERIFIED" | "REIMBURSED";
type StageFilter = VendorStage | "ALL" | "VERIFIED_GROUP";

const STAGE_FILTERS: { key: StageFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "VENDOR_PAID", label: "Waiting for Paytrix" },
  { key: "VERIFIED_GROUP", label: "Verified" },
];

type SheetPreview = {
  inProgress: number;
  paid: number;
  unchanged: number;
  errors: { row: number; message: string }[];
};

function stageOf(bill: BillPayment): VendorStage {
  return vendorStageOf(bill) as VendorStage;
}

function holding(bill: BillPayment) {
  const stage = stageOf(bill);
  return stage === "ASSIGNED" || stage === "IN_PROGRESS";
}

export default function AssignedBillsPage() {
  const toast = useToast();
  const canMark = getUser()?.role === "VENDOR_ADMIN";
  const fileRef = useRef<HTMLInputElement>(null);
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [references, setReferences] = useState<Record<string, string>>({});
  const [bbpsReferences, setBbpsReferences] = useState<Record<string, string>>({});
  const [proofs, setProofs] = useState<Record<string, File | undefined>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [progressQueue, setProgressQueue] = useState<BillPayment[] | null>(null);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetPreview, setSheetPreview] = useState<SheetPreview | null>(null);
  const [importResults, setImportResults] = useState<BulkRowResult[] | null>(null);

  const canAct = canMark && account?.status === "ACTIVE";
  const pending = bills.filter(holding);
  const showSelect = canAct && pending.length > 0;
  const assignedBills = bills.filter((bill) => stageOf(bill) === "ASSIGNED");
  const inProgressBills = bills.filter((bill) => stageOf(bill) === "IN_PROGRESS");
  const selectedAssigned = assignedBills.filter((bill) => selectedIds.has(bill.id));
  const selectedInProgress = inProgressBills.filter((bill) => selectedIds.has(bill.id));
  const selectedTotal = useMemo(
    () =>
      bills
        .filter((bill) => selectedIds.has(bill.id))
        .reduce((sum, bill) => sum + bill.amount, 0),
    [bills, selectedIds],
  );
  const isMultiPay = selectedInProgress.length > 1;
  const canBulkProgress =
    selectedIds.size > 0 &&
    selectedAssigned.length === selectedIds.size;
  const canBulkPay =
    selectedIds.size > 0 &&
    selectedInProgress.length === selectedIds.size;
  const bulkPayReady = selectedInProgress.every((bill) => {
    const hasRefs =
      Boolean((references[bill.id] ?? "").trim()) &&
      Boolean((bbpsReferences[bill.id] ?? "").trim());
    return isMultiPay ? hasRefs : hasRefs && Boolean(proofs[bill.id]);
  });
  const columns = showSelect
    ? ["", "Biller", "Consumer", "Due date", "Amount", "Status", ""]
    : ["Biller", "Consumer", "Due date", "Amount", "Status", ""];

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
    const next = await apiFetch<ClientAccount>("/api/v1/client/account");
    setAccount(next);
    if (next.clientType !== "VENDOR") return;
    const nextBills = await apiFetch<BillPayment[]>("/api/v1/client/assigned-bills");
    setBills(nextBills);
    const stillHolding = new Set(nextBills.filter(holding).map((bill) => bill.id));
    setSelectedIds((current) => new Set([...current].filter((id) => stillHolding.has(id))));
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load assigned bills");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bills;
    return bills.filter(
      (bill) =>
        bill.billerName.toLowerCase().includes(needle) ||
        bill.billServiceName.toLowerCase().includes(needle) ||
        bill.customerBillAccountNumber.toLowerCase().includes(needle) ||
        (bill.customerName ?? "").toLowerCase().includes(needle),
    );
  }, [bills, query]);

  const counts = useMemo<Record<StageFilter, number>>(() => {
    const next: Record<StageFilter, number> = {
      ALL: searched.length,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      VENDOR_PAID: 0,
      VERIFIED: 0,
      REIMBURSED: 0,
      VERIFIED_GROUP: 0,
    };
    for (const bill of searched) {
      const st = stageOf(bill);
      next[st] = (next[st] ?? 0) + 1;
      if (st === "VERIFIED" || st === "REIMBURSED") next.VERIFIED_GROUP += 1;
    }
    return next;
  }, [searched]);

  const visible = useMemo(() => {
    if (stageFilter === "ALL") return searched;
    if (stageFilter === "VERIFIED_GROUP") {
      return searched.filter((bill) => {
        const st = stageOf(bill);
        return st === "VERIFIED" || st === "REIMBURSED";
      });
    }
    return searched.filter((bill) => stageOf(bill) === stageFilter);
  }, [searched, stageFilter]);

  const activeSelectionStage: "ASSIGNED" | "IN_PROGRESS" | null =
    selectedAssigned.length > 0 && selectedInProgress.length === 0
      ? "ASSIGNED"
      : selectedInProgress.length > 0 && selectedAssigned.length === 0
        ? "IN_PROGRESS"
        : null;

  function canSelectRow(bill: BillPayment): boolean {
    if (!showSelect || !holding(bill)) return false;
    const st = stageOf(bill);
    if (activeSelectionStage && st !== activeSelectionStage) return false;
    return true;
  }

  const total = useMemo(() => visible.reduce((sum, bill) => sum + bill.amount, 0), [visible]);
  const selectableVisible = useMemo(() => {
    if (!showSelect) return [];
    const holdingVisible = visible.filter(holding);
    if (activeSelectionStage) {
      return holdingVisible.filter((bill) => stageOf(bill) === activeSelectionStage);
    }
    const assignedInView = holdingVisible.filter((bill) => stageOf(bill) === "ASSIGNED");
    return assignedInView.length > 0 ? assignedInView : holdingVisible;
  }, [showSelect, visible, activeSelectionStage]);
  const allVisibleSelected =
    selectableVisible.length > 0 && selectableVisible.every((bill) => selectedIds.has(bill.id));
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (selectableVisible.length > 0 && selectableVisible.every((bill) => prev.has(bill.id))) {
        const next = new Set(prev);
        for (const bill of selectableVisible) next.delete(bill.id);
        return next;
      }
      const next = new Set(prev);
      for (const bill of selectableVisible) next.add(bill.id);
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function askMarkSelected() {
    if (!canBulkProgress) return;
    setProgressQueue(selectedAssigned);
  }

  async function markSelectedInProgress() {
    if (!progressQueue || progressQueue.length === 0) return;
    setBusy(true);
    let done = 0;
    let failed = 0;
    for (const bill of progressQueue) {
      try {
        await apiFetch(`/api/v1/client/assigned-bills/${bill.id}/in-progress`, { method: "POST" });
        done++;
      } catch {
        failed++;
      }
    }
    setProgressQueue(null);
    if (failed === 0) {
      toast.success(done === 1 ? "Marked in progress" : `Marked ${done} bills in progress`);
    } else {
      toast.error(`Marked ${done}. ${failed} could not be updated.`);
    }
    try {
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function paySelected() {
    if (!canBulkPay || !bulkPayReady) return;
    setBusy(true);
    let done = 0;
    let failed = 0;
    for (const bill of selectedInProgress) {
      try {
        const formData = new FormData();
        formData.append("transactionReference", (references[bill.id] ?? "").trim());
        formData.append("bbpsReference", (bbpsReferences[bill.id] ?? "").trim());
        const proof = !isMultiPay ? proofs[bill.id] : undefined;
        if (proof) formData.append("proof", proof);
        const response = await trackedFetch(`${API_BASE_URL}/api/v1/client/assigned-bills/${bill.id}/mark-paid`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, "Could not pay this bill"));
        }
        done++;
      } catch {
        failed++;
      }
    }
    if (failed === 0) {
      toast.success(done === 1 ? "Sent to Paytrix for verification" : `Sent ${done} bills to Paytrix for verification`);
      setBulkPayOpen(false);
    } else {
      toast.error(`Paid ${done}. ${failed} could not be sent.`);
    }
    try {
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function rejectSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await apiFetch("/api/v1/client/assigned-bills/reject", {
        method: "POST",
        body: { billPaymentIds: ids, reason },
      });
      toast.success(ids.length === 1 ? "Sent back to Paytrix" : `Sent ${ids.length} bills back to Paytrix`);
      setReason("");
      setSendBackOpen(false);
      setSelectedIds(new Set());
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send these bills back");
    } finally {
      setBusy(false);
    }
  }

  function appendSelection(formData: FormData) {
    for (const id of selectedIds) formData.append("ids", id);
  }

  async function downloadSheet() {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      const params = [...selectedIds].map((id) => `ids=${encodeURIComponent(id)}`).join("&");
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/client/assigned-bills/export?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Download failed"));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assigned-bills.xlsx";
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

  async function previewSheet(file: File) {
    if (selectedIds.size === 0) return;
    setBusy(true);
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      appendSelection(formData);
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/client/assigned-bills/import/preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Could not read the spreadsheet"));
      }
      const preview = (await response.json()) as SheetPreview;
      if (preview.inProgress + preview.paid === 0) {
        toast.error(preview.errors[0]?.message ?? "No rows will change. Set New status to In progress.");
        setSheetFile(null);
        return;
      }
      setSheetFile(file);
      setSheetPreview(preview);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the spreadsheet");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function applySheet() {
    if (!sheetFile) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", sheetFile);
      appendSelection(formData);
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/client/assigned-bills/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Upload failed"));
      }
      const results = (await response.json()) as BulkRowResult[];
      setImportResults(results);
      setSheetFile(null);
      setSheetPreview(null);
      const ok = results.filter((row) => row.success).length;
      if (ok === results.length) {
        toast.success(`Updated ${ok} bill${ok === 1 ? "" : "s"}`);
      } else {
        toast.error(`Updated ${ok} of ${results.length} rows.`);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (account && account.clientType !== "VENDOR") {
    return <PageHeader title="Bill Payments" description="This page is for vendor accounts." />;
  }

  const sheetDetails: ActionDetail[] = sheetPreview
    ? [
        { label: "In progress", value: String(sheetPreview.inProgress) },
        { label: "Paid", value: String(sheetPreview.paid) },
        { label: "Unchanged", value: String(sheetPreview.unchanged) },
        ...sheetPreview.errors.slice(0, 6).map((error) => ({
          label: `Row ${error.row}`,
          value: error.message,
        })),
      ]
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Bill Payments"
        description="Bills assigned to you. Mark a bill in progress, then pay it."
        actions={
          canAct && bills.length > 0 ? (
            <div className="flex gap-2">
              <Button variant="outline" icon={<Download size={16} />} loading={busy} disabled={selectedIds.size === 0} onClick={downloadSheet}>
                Download
              </Button>
              <Button variant="outline" icon={<Upload size={16} />} loading={busy} disabled={selectedIds.size === 0} onClick={() => fileRef.current?.click()}>
                Upload
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) previewSheet(file);
                }}
              />
            </div>
          ) : undefined
        }
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {STAGE_FILTERS.map((item) => {
          const active = stageFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setSelectedIds(new Set());
                setStageFilter(item.key);
                setCurrentPage(1);
              }}
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
                {counts[item.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
          <span>
            Assigned bills
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              {visible.length}
            </span>
            {visible.length !== bills.length && (
              <span className="ml-1 text-slate-400">of {bills.length}</span>
            )}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-slate-700">
            Total amount: <span className="text-slate-900">{inr(total)}</span>
          </span>
          {showSelect && selectedIds.size > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono font-bold text-indigo-700">
                Selected ({selectedIds.size}): {inr(selectedTotal)}
              </span>
            </>
          )}
        </div>

        {showSelect && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {stageFilter !== "IN_PROGRESS" && canBulkProgress && (
              <Button
                size="sm"
                type="button"
                icon={<PackageCheck size={14} />}
                disabled={busy}
                onClick={askMarkSelected}
              >
                Mark In Progress ({selectedAssigned.length})
              </Button>
            )}
            {stageFilter !== "ASSIGNED" && canBulkPay && (
              <Button
                size="sm"
                type="button"
                icon={<CheckCircle2 size={14} />}
                disabled={busy}
                onClick={() => setBulkPayOpen(true)}
              >
                Mark as Paid ({selectedInProgress.length})
              </Button>
            )}
            <Button
              size="sm"
              type="button"
              variant="outline"
              icon={<RotateCcw size={14} />}
              disabled={busy}
              onClick={() => {
                setReason("");
                setSendBackOpen(true);
              }}
            >
              Send Back ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>

      {importResults && importResults.some((row) => !row.success) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {importResults
            .filter((row) => !row.success)
            .map((row) => (
              <p key={row.row}>Row {row.row}: {row.error}</p>
            ))}
        </div>
      )}

      <ListCard fitContent={false}>
        <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by biller or consumer no."
              aria-label="Search payments"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {selectableVisible.length > 0 && (
            <p className="text-xs font-bold text-blue-600">
              Select the bills you want to act on using the checkboxes.
            </p>
          )}
        </div>

        {loading ? (
          <TableSkeleton cols={columns.length} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? "No assigned bills" : "No payments match"}
            description={
              bills.length === 0
                ? "Bills appear here once Paytrix assigns them to your account."
                : "Try another status filter or search query."
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={
                  showSelect
                    ? [
                        selectableVisible.length > 0 ? (
                          <input
                            key="all"
                            type="checkbox"
                            aria-label={allVisibleSelected ? "Clear selection" : "Select all visible bills"}
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        ) : (
                          ""
                        ),
                        "Biller",
                        "Consumer",
                        "Due date",
                        "Amount",
                        "Status",
                        "",
                      ]
                    : ["Biller", "Consumer", "Due date", "Amount", "Status", ""]
                }
              />
              <TBody>
                {paged.map((bill) => {
                  const stage = stageOf(bill);
                  const badge = vendorStageBadge(stage);
                  const expanded = expandedIds.has(bill.id);
                  const selectable = canSelectRow(bill);
                  return (
                    <Fragment key={bill.id}>
                      <TR className="cursor-pointer" onClick={() => toggleExpand(bill.id)}>
                        {showSelect && (
                          <TD className="w-10" onClick={(event) => event.stopPropagation()}>
                            {selectable && (
                              <input
                                type="checkbox"
                                aria-label={`Select ${bill.customerBillAccountNumber}`}
                                checked={selectedIds.has(bill.id)}
                                onChange={() => toggle(bill.id)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            )}
                          </TD>
                        )}
                        <TD>
                          <p className="font-semibold text-slate-900">{bill.billerName}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{bill.billServiceName}</p>
                        </TD>
                        <TD onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            title="Copy consumer number"
                            onClick={() => copyText(`consumer:${bill.id}`, bill.customerBillAccountNumber)}
                            className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                          >
                            <span>{bill.customerBillAccountNumber}</span>
                            {copiedKey === `consumer:${bill.id}` ? (
                              <Check size={11} className="text-emerald-600" />
                            ) : (
                              <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                            )}
                          </button>
                          {bill.customerName && (
                            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                              {bill.customerName}
                            </p>
                          )}
                        </TD>
                        <TD className="text-xs text-slate-600">{formatWhen(bill.dueDate)}</TD>
                        <TD className="font-mono text-sm font-semibold text-slate-900">{inr(bill.amount)}</TD>
                        <TD>
                          <StatusBadge status={badge.status} label={badge.label} />
                        </TD>
                        <TD>
                          <div className="flex items-center justify-end">
                            <span className="text-slate-300">
                              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                          </div>
                        </TD>
                      </TR>
                      {expanded && (
                        <TR className="hover:bg-transparent">
                          <TD colSpan={columns.length} className="bg-slate-50 px-4 py-3 whitespace-normal!">
                            <BillDetail bill={bill} stage={stage} />
                          </TD>
                        </TR>
                      )}
                    </Fragment>
                  );
                })}
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

      <ConfirmAction
        open={progressQueue != null}
        title={progressQueue?.length === 1 ? "Mark this bill in progress?" : "Mark these bills in progress?"}
        summary="You can still send them back."
        details={(progressQueue ?? []).map((bill) => ({
          label: bill.customerBillAccountNumber,
          value: `${bill.billerName} · ${inr(bill.amount)}`,
        }))}
        confirmLabel="Mark in progress"
        loading={busy}
        onCancel={() => setProgressQueue(null)}
        onConfirm={markSelectedInProgress}
      />
      <ConfirmAction
        open={sheetPreview != null}
        title="Update these bills?"
        summary={
          sheetPreview
            ? `${sheetPreview.inProgress + sheetPreview.paid} rows will change. Rows with a problem are skipped and the rest still apply.`
            : ""
        }
        details={sheetDetails}
        confirmLabel="Apply"
        loading={busy}
        onCancel={() => {
          setSheetPreview(null);
          setSheetFile(null);
        }}
        onConfirm={applySheet}
      />
      <Modal
        open={sendBackOpen}
        onClose={() => {
          if (busy) return;
          setSendBackOpen(false);
          setReason("");
        }}
        title={selectedIds.size === 1 ? "Send this bill back?" : `Send ${selectedIds.size} bills back?`}
        description="Paytrix will take the selected bills back. Tell them why."
        footer={
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setSendBackOpen(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button loading={busy} disabled={reason.trim().length === 0} onClick={rejectSelected}>
              Send back
            </Button>
          </>
        }
      >
        <Field
          label="Reason"
          required
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
      <Modal
        open={bulkPayOpen}
        onClose={() => {
          if (!busy) setBulkPayOpen(false);
        }}
        dismissable={false}
        size={isMultiPay ? "xl" : "md"}
        title={
          isMultiPay
            ? `Mark ${selectedInProgress.length} bills as paid`
            : "Mark bill as paid"
        }
        description={
          isMultiPay
            ? `Enter the transaction reference and BBPS reference for each of the ${selectedInProgress.length} selected bills (${inr(selectedInProgress.reduce((sum, b) => sum + b.amount, 0))}).`
            : "Enter the transaction reference, BBPS reference, and attach proof of payment."
        }
        footer={
          <>
            <Button variant="outline" disabled={busy} onClick={() => setBulkPayOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={!bulkPayReady} onClick={paySelected}>
              {isMultiPay ? `Mark ${selectedInProgress.length} as Paid` : "Mark as Paid"}
            </Button>
          </>
        }
      >
        {isMultiPay ? (
          <div className="flex flex-col">
            <div className="hidden border-b border-slate-200 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase md:grid md:grid-cols-2 md:gap-4">
              <span>Bill Details</span>
              <div className="grid grid-cols-2 gap-2">
                <span>Transaction Ref. *</span>
                <span>BBPS Ref. *</span>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {selectedInProgress.map((bill, index) => (
                <div
                  key={bill.id}
                  className="grid grid-cols-1 items-center gap-2.5 py-2.5 md:grid-cols-2 md:gap-4"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        <span className="mr-1.5 font-mono text-[11px] text-slate-400">
                          #{index + 1}
                        </span>
                        {bill.billerName}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        <span className="font-mono font-medium text-slate-700">
                          {bill.customerBillAccountNumber}
                        </span>
                        {bill.billServiceName ? ` · ${bill.billServiceName}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-slate-900">
                      {inr(bill.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      maxLength={120}
                      disabled={busy}
                      placeholder="Transaction ref. *"
                      aria-label={`Transaction reference for ${bill.customerBillAccountNumber}`}
                      value={references[bill.id] ?? ""}
                      onChange={(event) =>
                        setReferences((current) => ({
                          ...current,
                          [bill.id]: event.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                    />
                    <input
                      type="text"
                      required
                      maxLength={120}
                      disabled={busy}
                      placeholder="BBPS ref. *"
                      aria-label={`BBPS reference for ${bill.customerBillAccountNumber}`}
                      value={bbpsReferences[bill.id] ?? ""}
                      onChange={(event) =>
                        setBbpsReferences((current) => ({
                          ...current,
                          [bill.id]: event.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          selectedInProgress[0] && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {selectedInProgress[0].billerName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="font-mono">{selectedInProgress[0].customerBillAccountNumber}</span>
                    {selectedInProgress[0].billServiceName
                      ? ` · ${selectedInProgress[0].billServiceName}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-slate-900">
                  {inr(selectedInProgress[0].amount)}
                </span>
              </div>
              <Field
                label="Transaction reference number"
                required
                maxLength={120}
                value={references[selectedInProgress[0].id] ?? ""}
                onChange={(event) =>
                  setReferences((current) => ({
                    ...current,
                    [selectedInProgress[0].id]: event.target.value,
                  }))
                }
              />
              <Field
                label="BBPS reference"
                required
                maxLength={120}
                value={bbpsReferences[selectedInProgress[0].id] ?? ""}
                onChange={(event) =>
                  setBbpsReferences((current) => ({
                    ...current,
                    [selectedInProgress[0].id]: event.target.value,
                  }))
                }
              />
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">
                  Proof of payment <span className="text-rose-500">*</span>
                </span>
                <input
                  type="file"
                  required
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setProofs((current) => ({ ...current, [selectedInProgress[0].id]: file }));
                  }}
                  className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                />
              </label>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}

function BillDetail({ bill, stage }: { bill: BillPayment; stage: VendorStage }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <DetailField label="Due" value={formatWhen(bill.dueDate)} />
        <DetailField label="Cycle" value={bill.billPeriod ?? "—"} />
        <DetailField label="Customer" value={bill.customerName ?? "—"} />
        <DetailField label="Transaction ref." value={bill.vendorPaymentReference ?? "—"} mono />
        <DetailField label="BBPS ref." value={bill.bbpsTransactionId ?? "—"} mono />
        <DetailField label="Paid to biller" value={formatWhen(bill.vendorMarkedPaidAt)} />
        <DetailField label="Payment id" value={bill.id.slice(0, 8)} mono />
      </dl>

      {stage === "VENDOR_PAID" && (
        <p className="mt-4 text-sm text-amber-800">Waiting for Paytrix to verify this payment.</p>
      )}
      {stage === "VERIFIED" && (
        <p className="mt-4 text-sm text-indigo-800">Verified. Waiting for Paytrix to pay you.</p>
      )}
      {stage === "REIMBURSED" && (
        <p className="mt-4 text-sm text-emerald-800">
          Paytrix paid you for this bill on {formatWhen(bill.reimbursedAt)}.
        </p>
      )}
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className={cn("mt-1 truncate text-sm text-slate-900", mono ? "font-mono font-medium" : "font-medium")}>
        {value}
      </dd>
    </div>
  );
}
