"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileText, Search, Upload } from "lucide-react";
import { ConfirmAction, type ActionDetail } from "@/app/paytrix/commissions/ConfirmAction";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
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
  const canMark = getUser()?.role === "CLIENT_ADMIN";
  const fileRef = useRef<HTMLInputElement>(null);
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [references, setReferences] = useState<Record<string, string>>({});
  const [bbpsReferences, setBbpsReferences] = useState<Record<string, string>>({});
  const [proofs, setProofs] = useState<Record<string, File | undefined>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmBill, setConfirmBill] = useState<{ kind: "progress" | "paid"; bill: BillPayment } | null>(null);
  const [progressQueue, setProgressQueue] = useState<BillPayment[] | null>(null);
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [payBill, setPayBill] = useState<BillPayment | null>(null);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetPreview, setSheetPreview] = useState<SheetPreview | null>(null);
  const [importResults, setImportResults] = useState<BulkRowResult[] | null>(null);

  const canAct = canMark && account?.status === "ACTIVE";
  const pending = bills.filter(holding);
  const allPendingSelected = pending.length > 0 && pending.every((bill) => selectedIds.has(bill.id));
  const showSelect = canAct && pending.length > 0;
  const assignedBills = bills.filter((bill) => stageOf(bill) === "ASSIGNED");
  const inProgressBills = bills.filter((bill) => stageOf(bill) === "IN_PROGRESS");
  const canBulkProgress = assignedBills.length > 0 && assignedBills.every((bill) => selectedIds.has(bill.id));
  const canBulkPay = inProgressBills.length > 0 && inProgressBills.every((bill) => selectedIds.has(bill.id));
  const bulkPayReady = inProgressBills.every(
    (bill) => (references[bill.id] ?? "").trim() && (bbpsReferences[bill.id] ?? "").trim() && proofs[bill.id],
  );
  const columns = showSelect
    ? ["", "Biller", "Consumer no.", "Amount", "Status"]
    : ["Biller", "Consumer no.", "Amount", "Status"];

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

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bills;
    return bills.filter(
      (bill) =>
        bill.billerName.toLowerCase().includes(needle) ||
        bill.customerBillAccountNumber.toLowerCase().includes(needle),
    );
  }, [bills, query]);

  const total = useMemo(() => visible.reduce((sum, bill) => sum + bill.amount, 0), [visible]);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    setProgressQueue(assignedBills);
  }

  async function markInProgress(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/client/assigned-bills/${id}/in-progress`, { method: "POST" });
      toast.success("Marked in progress");
      setConfirmBill(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not mark this bill in progress");
    } finally {
      setBusy(false);
    }
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

  async function markPaid(id: string) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("transactionReference", references[id] ?? "");
      formData.append("bbpsReference", bbpsReferences[id] ?? "");
      const proof = proofs[id];
      if (proof) formData.append("proof", proof);
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/client/assigned-bills/${id}/mark-paid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, "Could not mark this bill paid"));
      }
      toast.success("Sent to Paytrix for verification");
      setConfirmBill(null);
      setPayBill(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark this bill paid");
    } finally {
      setBusy(false);
    }
  }

  async function paySelected() {
    if (!canBulkPay || !bulkPayReady) return;
    setBusy(true);
    let done = 0;
    let failed = 0;
    for (const bill of inProgressBills) {
      try {
        const formData = new FormData();
        formData.append("transactionReference", references[bill.id] ?? "");
        formData.append("bbpsReference", bbpsReferences[bill.id] ?? "");
        const proof = proofs[bill.id];
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
    return <PageHeader title="My Payments" description="This page is for vendor accounts." />;
  }

  const confirmDetails: ActionDetail[] = confirmBill
    ? [
        { label: "Biller", value: confirmBill.bill.billerName },
        { label: "Consumer", value: confirmBill.bill.customerBillAccountNumber },
        { label: "Amount", value: inr(confirmBill.bill.amount) },
        ...(confirmBill.kind === "paid"
          ? [
              { label: "Transaction ref.", value: references[confirmBill.bill.id] || "—" },
              { label: "BBPS ref.", value: bbpsReferences[confirmBill.bill.id] || "—" },
              { label: "Proof", value: proofs[confirmBill.bill.id]?.name ?? "—" },
            ]
          : []),
      ]
    : [];

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
        title="My Payments"
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

      <div className="flex shrink-0 flex-col gap-3 rounded-xl bg-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-semibold text-slate-700">
          Assigned
          <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
            {visible.length}
          </span>
          <span className="ml-2 font-medium text-slate-500">{inr(total)}</span>
        </span>
        <label className="relative flex items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Biller or consumer number"
            aria-label="Search payments"
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-sm sm:w-64"
          />
        </label>
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

      {showSelect && selectedIds.size > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" disabled={busy || !canBulkProgress} title="Select every assigned bill" onClick={askMarkSelected}>
            Mark in progress
          </Button>
          <Button type="button" disabled={busy || !canBulkPay} title="Select every in-progress bill" onClick={() => setBulkPayOpen(true)}>
            Pay
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setReason("");
              setSendBackOpen(true);
            }}
          >
            Send back
          </Button>
        </div>
      )}

      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={columns.length} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? "No assigned bills" : "No payments match"}
            description={
              bills.length === 0
                ? "Bills appear here after a corporate pays and a rule matches this account."
                : "Try another biller or consumer number."
            }
          />
        ) : (
          <>
            <div className="hidden min-h-0 flex-1 flex-col md:flex">
              <Table>
                <THead
                  columns={
                    showSelect
                      ? [
                          <input
                            key="all"
                            type="checkbox"
                            aria-label={allPendingSelected ? "Clear selection" : "Select all still with you"}
                            checked={allPendingSelected}
                            onChange={() =>
                              setSelectedIds(allPendingSelected ? new Set() : new Set(pending.map((bill) => bill.id)))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />,
                          "Biller",
                          "Consumer no.",
                          "Amount",
                          "Status",
                        ]
                      : ["Biller", "Consumer no.", "Amount", "Status"]
                  }
                />
                <TBody>
                  {visible.map((bill) => {
                    const stage = stageOf(bill);
                    const badge = vendorStageBadge(stage);
                    const expanded = expandedIds.has(bill.id);
                    const selectable = showSelect && holding(bill);
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
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-slate-400">
                                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{bill.billerName}</p>
                                <p className="text-[11px] font-medium text-slate-400">{bill.billServiceName}</p>
                                {bill.branchName && (
                                  <p className="text-[11px] font-medium text-slate-500">{bill.branchName}</p>
                                )}
                              </div>
                            </div>
                          </TD>
                          <TD onClick={(event) => event.stopPropagation()}>
                            <CopyableChip text={bill.customerBillAccountNumber} label="consumer number" />
                          </TD>
                          <TD className="font-mono text-sm font-semibold text-slate-900">{inr(bill.amount)}</TD>
                          <TD onClick={(event) => event.stopPropagation()}>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={badge.status} label={badge.label} />
                              <RowAction
                                stage={stage}
                                canAct={canAct}
                                busy={busy}
                                onProgress={() => setConfirmBill({ kind: "progress", bill })}
                                onPay={() => setPayBill(bill)}
                              />
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
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 md:hidden">
              <ul className="flex flex-col gap-3">
                {visible.map((bill) => {
                  const stage = stageOf(bill);
                  const badge = vendorStageBadge(stage);
                  const expanded = expandedIds.has(bill.id);
                  const selectable = showSelect && holding(bill);
                  return (
                    <li
                      key={bill.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-card)]"
                    >
                      <div className="flex items-start gap-3 p-4">
                        {selectable && (
                          <input
                            type="checkbox"
                            aria-label={`Select ${bill.customerBillAccountNumber}`}
                            checked={selectedIds.has(bill.id)}
                            onChange={() => toggle(bill.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => toggleExpand(bill.id)} className="w-full text-left">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{bill.billerName}</p>
                                <p className="text-xs text-slate-500">{bill.customerBillAccountNumber}</p>
                              </div>
                              <p className="shrink-0 font-mono text-sm font-semibold text-slate-900">{inr(bill.amount)}</p>
                            </div>
                          </button>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <StatusBadge status={badge.status} label={badge.label} />
                            <RowAction
                              stage={stage}
                              canAct={canAct}
                              busy={busy}
                              onProgress={() => setConfirmBill({ kind: "progress", bill })}
                              onPay={() => setPayBill(bill)}
                            />
                          </div>
                        </div>
                      </div>
                      {expanded && (
                        <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
                          <BillDetail bill={bill} stage={stage} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
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
        open={confirmBill != null}
        title={confirmBill?.kind === "paid" ? "Mark this bill paid?" : "Mark this bill in progress?"}
        summary={
          confirmBill?.kind === "paid"
            ? "The bill goes to Paytrix to verify."
            : "You can still send the bill back."
        }
        details={confirmDetails}
        confirmLabel={confirmBill?.kind === "paid" ? "Pay" : "Mark in progress"}
        raised={confirmBill?.kind === "paid"}
        loading={busy}
        onCancel={() => setConfirmBill(null)}
        onConfirm={() => {
          if (!confirmBill) return;
          if (confirmBill.kind === "progress") markInProgress(confirmBill.bill.id);
          else markPaid(confirmBill.bill.id);
        }}
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
        size="xl"
        title={inProgressBills.length === 1 ? "Pay this bill" : `Pay ${inProgressBills.length} bills`}
        description="Each bill needs its own transaction reference, BBPS reference, and proof."
        footer={
          <>
            <Button variant="outline" disabled={busy} onClick={() => setBulkPayOpen(false)}>
              Cancel
            </Button>
            <Button loading={busy} disabled={!bulkPayReady} onClick={paySelected}>
              Pay
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {inProgressBills.map((bill) => (
            <div key={bill.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{bill.billerName}</p>
                <p className="text-xs text-slate-500">
                  {bill.customerBillAccountNumber} · {inr(bill.amount)}
                </p>
              </div>
              <Field
                label="Transaction reference number"
                required
                maxLength={120}
                value={references[bill.id] ?? ""}
                onChange={(event) => setReferences((current) => ({ ...current, [bill.id]: event.target.value }))}
              />
              <Field
                label="BBPS reference"
                required
                maxLength={120}
                value={bbpsReferences[bill.id] ?? ""}
                onChange={(event) => setBbpsReferences((current) => ({ ...current, [bill.id]: event.target.value }))}
              />
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-700">Proof of payment</span>
                <input
                  type="file"
                  required
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setProofs((current) => ({ ...current, [bill.id]: file }));
                  }}
                  className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                />
              </label>
            </div>
          ))}
        </div>
      </Modal>
      <Modal
        open={payBill != null}
        onClose={() => setPayBill(null)}
        title="Pay this bill"
        description={payBill ? `${payBill.billerName} · ${payBill.customerBillAccountNumber}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setPayBill(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                if (!payBill) return;
                if (!(references[payBill.id] ?? "").trim() || !(bbpsReferences[payBill.id] ?? "").trim()) {
                  toast.error("Enter the transaction reference and the BBPS reference");
                  return;
                }
                if (!proofs[payBill.id]) {
                  toast.error("Attach the proof of payment");
                  return;
                }
                setConfirmBill({ kind: "paid", bill: payBill });
              }}
            >
              Pay
            </Button>
          </>
        }
      >
        {payBill && (
          <div className="flex flex-col gap-3">
            <Field
              label="Transaction reference number"
              required
              maxLength={120}
              value={references[payBill.id] ?? ""}
              onChange={(event) => setReferences((current) => ({ ...current, [payBill.id]: event.target.value }))}
            />
            <Field
              label="BBPS reference"
              required
              maxLength={120}
              value={bbpsReferences[payBill.id] ?? ""}
              onChange={(event) => setBbpsReferences((current) => ({ ...current, [payBill.id]: event.target.value }))}
            />
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-700">Proof of payment</span>
              <input
                type="file"
                required
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setProofs((current) => ({ ...current, [payBill.id]: file }));
                }}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RowAction({
  stage,
  canAct,
  busy,
  onProgress,
  onPay,
}: {
  stage: VendorStage;
  canAct: boolean;
  busy: boolean;
  onProgress: () => void;
  onPay: () => void;
}) {
  if (!canAct || (stage !== "ASSIGNED" && stage !== "IN_PROGRESS")) return null;
  return (
    <Button type="button" size="sm" disabled={busy} onClick={stage === "ASSIGNED" ? onProgress : onPay}>
      {stage === "ASSIGNED" ? "Mark in progress" : "Pay"}
    </Button>
  );
}

function BillDetail({ bill, stage }: { bill: BillPayment; stage: VendorStage }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <DetailField label="Due" value={formatWhen(bill.dueDate)} />
        <DetailField label="Cycle" value={bill.billPeriod ?? "—"} />
        <DetailField label="Customer" value={bill.customerName ?? "—"} />
        <DetailField label="Branch" value={bill.branchName ?? "—"} />
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
