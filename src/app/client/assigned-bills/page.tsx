"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Send, Upload } from "lucide-react";
import { ConfirmAction, type ActionDetail } from "@/app/paytrix/commissions/ConfirmAction";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import type { BillPayment, BulkRowResult, ClientAccount } from "@/lib/types";
import { API_BASE_URL } from "@/lib/workspace";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

type VendorStage = NonNullable<BillPayment["vendorStage"]>;

const STAGE_BADGE: Record<VendorStage, { status: string; label: string }> = {
  ASSIGNED: { status: "PENDING", label: "Assigned" },
  IN_PROGRESS: { status: "IN_PROGRESS", label: "In progress" },
  VENDOR_PAID: { status: "AWAITING", label: "Waiting for Paytrix" },
  VERIFIED: { status: "APPROVED", label: "Verified" },
  REIMBURSED: { status: "PAID", label: "Reimbursed" },
};

type SheetPreview = {
  inProgress: number;
  paid: number;
  unchanged: number;
  errors: { row: number; message: string }[];
};

function stageOf(bill: BillPayment): VendorStage {
  return bill.vendorStage ?? "ASSIGNED";
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
  const [references, setReferences] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmBill, setConfirmBill] = useState<{ kind: "progress" | "paid"; bill: BillPayment } | null>(null);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetPreview, setSheetPreview] = useState<SheetPreview | null>(null);
  const [importResults, setImportResults] = useState<BulkRowResult[] | null>(null);

  const canAct = canMark && account?.status === "ACTIVE";
  const pending = bills.filter(holding);
  const allPendingSelected = pending.length > 0 && pending.every((bill) => selectedIds.has(bill.id));

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
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load assigned bills"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  async function markPaid(id: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/client/assigned-bills/${id}/mark-paid`, {
        method: "POST",
        body: { reference: references[id] ?? "" },
      });
      toast.success("Sent to Paytrix for verification");
      setConfirmBill(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not mark this bill paid");
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
      setSelectedIds(new Set());
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send these bills back");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSheet() {
    setBusy(true);
    try {
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/client/assigned-bills/export`, {
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
    setBusy(true);
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
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
        toast.error(preview.errors[0]?.message ?? "No rows will change. Set New status to In progress or Paid.");
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
    return <PageHeader title="Assigned bills" description="Assigned bills are for vendor accounts." />;
  }

  const confirmDetails: ActionDetail[] = confirmBill
    ? [
        { label: "Biller", value: confirmBill.bill.billerName },
        { label: "Consumer", value: confirmBill.bill.customerBillAccountNumber },
        { label: "Amount", value: inr(confirmBill.bill.amount) },
        ...(confirmBill.kind === "paid"
          ? [
              { label: "Reference", value: references[confirmBill.bill.id] || "—" },
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
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Assigned bills"
        description="Mark a bill in progress while you pay it, then mark it paid with the transaction reference. A spreadsheet can do the same. Paytrix checks the payment before reimbursing you."
        actions={
          canAct ? (
            <div className="flex gap-2">
              <Button variant="outline" icon={<Download size={16} />} loading={busy} onClick={downloadSheet}>
                Download
              </Button>
              <Button variant="outline" icon={<Upload size={16} />} loading={busy} onClick={() => fileRef.current?.click()}>
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
      {importResults && importResults.some((row) => !row.success) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {importResults
            .filter((row) => !row.success)
            .map((row) => (
              <p key={row.row}>Row {row.row}: {row.error}</p>
            ))}
        </div>
      )}
      {bills.length === 0 ? (
        <EmptyState icon={Send} title="No assigned bills" description="Bills appear here after a corporate pays and a rule matches this account." />
      ) : (
        <>
          {canAct && pending.length > 0 && (
            <form
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault();
                rejectSelected();
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setSelectedIds(allPendingSelected ? new Set() : new Set(pending.map((bill) => bill.id)))} className="text-sm font-semibold text-indigo-700">
                  {allPendingSelected ? "Clear selection" : "Select all still with you"}
                </button>
                <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field
                  className="flex-1"
                  label="Reason for sending back"
                  required
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <Button type="submit" variant="outline" loading={busy} disabled={selectedIds.size === 0}>
                  {selectedIds.size > 1 ? `Send back ${selectedIds.size}` : "Send back"}
                </Button>
              </div>
            </form>
          )}
          <ul className="flex flex-col gap-3">
            {bills.map((bill) => {
              const stage = stageOf(bill);
              const badge = STAGE_BADGE[stage];
              const selectable = canAct && holding(bill);
              return (
                <li key={bill.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {selectable && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${bill.customerBillAccountNumber}`}
                          checked={selectedIds.has(bill.id)}
                          onChange={() => toggle(bill.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{bill.billerName}</p>
                        <p className="mt-1 text-xs text-slate-500">{bill.customerBillAccountNumber}</p>
                        <p className="mt-2 font-mono text-sm font-semibold text-slate-900">{inr(bill.amount)}</p>
                      </div>
                    </div>
                    <StatusBadge status={badge.status} label={badge.label} />
                  </div>
                  {canAct && stage === "ASSIGNED" && (
                    <div className="mt-3">
                      <Button type="button" onClick={() => setConfirmBill({ kind: "progress", bill })}>
                        Mark in progress
                      </Button>
                    </div>
                  )}
                  {canAct && stage === "IN_PROGRESS" && (
                    <form
                      className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setConfirmBill({ kind: "paid", bill });
                      }}
                    >
                      <Field
                        label="Transaction reference"
                        required
                        value={references[bill.id] ?? ""}
                        onChange={(e) => setReferences((current) => ({ ...current, [bill.id]: e.target.value }))}
                      />
                      <Button type="submit">Mark paid</Button>
                    </form>
                  )}
                  {stage === "VENDOR_PAID" && (
                    <p className="mt-3 text-sm text-amber-800">
                      Waiting for Paytrix to verify {bill.vendorPaymentReference}.
                      {bill.bbpsCheckNote ? ` Last check: ${bill.bbpsCheckNote}` : ""}
                    </p>
                  )}
                  {stage === "VERIFIED" && (
                    <p className="mt-3 text-sm text-indigo-800">Verified. Waiting for Paytrix to pay you the full amount.</p>
                  )}
                  {stage === "REIMBURSED" && (
                    <p className="mt-3 text-sm text-emerald-800">Paytrix reimbursed this bill.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <ConfirmAction
        open={confirmBill != null}
        title={confirmBill?.kind === "paid" ? "Mark this bill paid?" : "Mark this bill in progress?"}
        summary={
          confirmBill?.kind === "paid"
            ? "The bill goes to Paytrix for a BBPS check."
            : "You can still send the bill back."
        }
        details={confirmDetails}
        confirmLabel={confirmBill?.kind === "paid" ? "Mark paid" : "Mark in progress"}
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
    </div>
  );
}
