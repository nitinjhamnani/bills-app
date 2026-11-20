"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  PackageCheck,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SearchableSelect, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { BulkRowResult, Client, OrgStatus, VendorStage } from "@/lib/types";
import { API_BASE_URL } from "@/lib/workspace";

/** Direct representation of the `bill_payment` table without joining bills, corporates, branches, or commissions. */
interface BillPaymentRow {
  id: string;
  billFetchId: string;
  billId: string | null;
  operatorName: string | null;
  consumerId: string | null;
  billFetchedOn: string | null;
  billAmount: number;
  corpPaymentOn: string;
  corpId: string;
  corpName: string;
  corpPaidUserId: string | null;
  corpPaymentStatus: string;
  billAssignedTo: "ORG" | "VENDOR";
  billAssignedToId: string;
  billAssignedToName: string;
  billAssignedToStatus: "PENDING" | "IN_PROGRESS";
  billAssignedOn: string;
  billPaidOn: string | null;
  transactionReferenceNumber: string | null;
  bbpsExternalReference: string | null;
  hasPaymentProof: boolean;
  verifiedBy: string | null;
  verifiedById: string | null;
  verifiedOn: string | null;
  verified: boolean;
  orgStatus: OrgStatus;
  vendorStage: VendorStage | null;
  awaitingChecker: boolean;
  canSettle: boolean;
}

type QueueTab = "ALL" | "ASSIGNED" | "NOT_ASSIGNED";

const QUEUE: { key: QueueTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "NOT_ASSIGNED", label: "Not Assigned" },
];

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

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

type AssignmentPlan = {
  billPaymentId: string;
  billerName: string;
  consumerNumber: string;
  amount: number;
  corporateName: string;
  willAssign: boolean;
  vendorName: string | null;
  commissionPercent: number | null;
  reason: string | null;
};

function commissionLabel(percent: number) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(percent)}%`;
}

type BillCheck = {
  summary: string;
  paid: boolean;
  verified: boolean;
};

export default function OrganisationBillPaymentsPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<BillPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueTab>("ALL");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedCorpId, setSelectedCorpId] = useState("ALL");
  const [selectedOperator, setSelectedOperator] = useState("ALL");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("ALL");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [bulkPickingUp, setBulkPickingUp] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<BulkRowResult[] | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settleTarget, setSettleTarget] = useState<BillPaymentRow | null>(null);
  const [settleMode, setSettleMode] = useState<"paid" | "failed">("paid");
  const [busyAction, setBusyAction] = useState(false);
  const [bbpsTxn, setBbpsTxn] = useState("");
  const [externalTxn, setExternalTxn] = useState("");
  const [billType, setBillType] = useState("");
  const [failReason, setFailReason] = useState("");

  const [verifyIds, setVerifyIds] = useState<string[] | null>(null);
  const [manualIds, setManualIds] = useState<Set<string>>(new Set());
  const [bbpsById, setBbpsById] = useState<Record<string, BillCheck>>({});
  const [checkingBbps, setCheckingBbps] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"manual" | "rules">("manual");
  const [activeVendors, setActiveVendors] = useState<Client[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [chosenVendorId, setChosenVendorId] = useState("");
  const [previewingAssign, setPreviewingAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignLines, setAssignLines] = useState<AssignmentPlan[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const next = await apiFetch<BillPaymentRow[]>("/api/v1/paytrix/my-payments");
      setPayments(next);
      const unpicked = new Set(next.filter(isUnpickedRow).map((row) => row.id));
      setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => unpicked.has(id))));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill payments");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const unpaidPayments = useMemo(
    () => payments.filter((p) => p.orgStatus !== "PAID"),
    [payments],
  );

  const corpOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of unpaidPayments) map.set(p.corpId, p.corpName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [unpaidPayments]);

  const operatorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of unpaidPayments) {
      if (p.operatorName) set.add(p.operatorName);
    }
    return Array.from(set).sort();
  }, [unpaidPayments]);

  const vendorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of unpaidPayments) {
      if (p.billAssignedTo === "VENDOR") {
        map.set(p.billAssignedToId, p.billAssignedToName);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [unpaidPayments]);

  const narrowed = useMemo(() => {
    let result = unpaidPayments;
    if (selectedCorpId !== "ALL") {
      result = result.filter((p) => p.corpId === selectedCorpId);
    }
    if (selectedOperator !== "ALL") {
      result = result.filter((p) => p.operatorName === selectedOperator);
    }
    if (consumerNumber.trim()) {
      const q = consumerNumber.trim().toLowerCase();
      result = result.filter((p) => (p.consumerId ?? "").toLowerCase().includes(q));
    }
    if (selectedAssigneeId !== "ALL") {
      result = result.filter((p) => p.billAssignedToId === selectedAssigneeId);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.billFetchId.toLowerCase().includes(q) ||
          (p.billId ?? "").toLowerCase().includes(q) ||
          (p.operatorName ?? "").toLowerCase().includes(q) ||
          (p.consumerId ?? "").toLowerCase().includes(q) ||
          p.corpName.toLowerCase().includes(q) ||
          p.corpId.toLowerCase().includes(q) ||
          p.billAssignedToName.toLowerCase().includes(q) ||
          p.billAssignedToId.toLowerCase().includes(q) ||
          (p.transactionReferenceNumber ?? "").toLowerCase().includes(q) ||
          (p.bbpsExternalReference ?? "").toLowerCase().includes(q),
      );
    }
    result = result.filter((p) => matchesAmount(p.billAmount, amountMin, amountMax));
    return result;
  }, [
    unpaidPayments,
    selectedCorpId,
    selectedOperator,
    consumerNumber,
    selectedAssigneeId,
    search,
    amountMin,
    amountMax,
  ]);

  const counts = useMemo<Record<QueueTab, number>>(
    () => ({
      ALL: narrowed.length,
      ASSIGNED: narrowed.filter((p) => p.billAssignedTo === "VENDOR").length,
      NOT_ASSIGNED: narrowed.filter((p) => p.billAssignedTo !== "VENDOR").length,
    }),
    [narrowed],
  );

  const visible = useMemo(() => {
    if (queue === "ASSIGNED") return narrowed.filter((p) => p.billAssignedTo === "VENDOR");
    if (queue === "NOT_ASSIGNED") return narrowed.filter((p) => p.billAssignedTo !== "VENDOR");
    return narrowed;
  }, [narrowed, queue]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  const amountRangeActive = Boolean(amountMin.trim() || amountMax.trim());
  const activeFilterCount = [
    selectedCorpId !== "ALL",
    selectedOperator !== "ALL",
    Boolean(consumerNumber.trim()),
    selectedAssigneeId !== "ALL",
    amountRangeActive,
  ].filter(Boolean).length;

  const selectableVisible = useMemo(
    () => visible.filter(isUnpickedRow),
    [visible],
  );

  const allSelectableSelected =
    selectableVisible.length > 0 && selectableVisible.every((p) => selectedIds.has(p.id));

  const selectedRows = useMemo(
    () => payments.filter((p) => selectedIds.has(p.id) && isUnpickedRow(p)),
    [payments, selectedIds],
  );

  const currentRole = getUser()?.role;
  const canMarkInProgress =
    currentRole === "SUPER_ADMIN" ||
    currentRole === "ORGANISATION_ADMIN" ||
    currentRole === "MAKER";
  const canAssignVendors =
    currentRole === "SUPER_ADMIN" || currentRole === "ORGANISATION_ADMIN";

  function resetFilters() {
    setSelectedCorpId("ALL");
    setSelectedOperator("ALL");
    setConsumerNumber("");
    setSelectedAssigneeId("ALL");
    setAmountMin("");
    setAmountMax("");
    setCurrentPage(1);
  }

  function toggleSelect(id: string) {
    const row = payments.find((p) => p.id === id);
    if (!row || !isUnpickedRow(row)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (selectableVisible.length > 0 && selectableVisible.every((p) => prev.has(p.id))) {
        const next = new Set(prev);
        for (const p of selectableVisible) next.delete(p.id);
        return next;
      }
      const next = new Set(prev);
      for (const p of selectableVisible) next.add(p.id);
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

  function openSettle(payment: BillPaymentRow) {
    setBbpsTxn("");
    setExternalTxn("");
    setBillType("");
    setFailReason("");
    setSettleMode("paid");
    setSettleTarget(payment);
  }

  async function submitSettle(e: React.FormEvent) {
    e.preventDefault();
    if (!settleTarget) return;
    setBusyAction(true);
    try {
      if (settleMode === "paid") {
        await apiFetch(`/api/v1/paytrix/my-payments/${settleTarget.id}/mark-paid`, {
          method: "POST",
          body: {
            bbpsTransactionId: bbpsTxn || null,
            externalTransactionId: externalTxn || null,
            billType: billType || null,
          },
        });
        toast.success("Bill payment marked as paid");
      } else {
        await apiFetch(`/api/v1/paytrix/my-payments/${settleTarget.id}/mark-failed`, {
          method: "POST",
          body: { reason: failReason },
        });
        toast.success("Marked failed - sent back to the queue");
      }
      setSettleTarget(null);
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyAction(false);
    }
  }

  async function markSelectedInProgress() {
    const ids = selectedRows.map((p) => p.id);
    if (ids.length === 0) {
      toast.error("Select at least one unpicked bill");
      return;
    }
    setBulkPickingUp(true);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await apiFetch(`/api/v1/paytrix/my-payments/${id}/pick-up`, { method: "POST" });
        ok++;
      } catch {
        failed++;
      }
    }
    setBulkPickingUp(false);
    setSelectedIds(new Set());
    if (failed === 0) {
      toast.success(
        ok === 1 ? "1 bill marked in progress" : `Marked ${ok} bills in progress`,
      );
    } else {
      toast.error(`Marked ${ok} in progress, failed ${failed}`);
    }
    await load(true);
  }

  async function openAssignModal() {
    const ids = selectedRows.map((p) => p.id);
    if (ids.length === 0) return;
    setAssignMode("manual");
    setChosenVendorId("");
    setAssignLines(null);
    setAssignModalOpen(true);
    setVendorsLoading(true);
    try {
      const clients = await apiFetch<Client[]>("/api/v1/paytrix/clients");
      setActiveVendors(
        clients
          .filter((c) => c.clientType === "VENDOR" && c.status === "ACTIVE")
          .sort((a, b) => a.clientName.localeCompare(b.clientName)),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load active vendors");
      setActiveVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }

  async function loadRulesPreview() {
    const ids = selectedRows.map((p) => p.id);
    if (ids.length === 0) return;
    setPreviewingAssign(true);
    try {
      setAssignLines(
        await apiFetch<AssignmentPlan[]>("/api/v1/paytrix/my-payments/assign-preview", {
          method: "POST",
          body: { billPaymentIds: ids },
        }),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not check the commission rules");
    } finally {
      setPreviewingAssign(false);
    }
  }

  function closeAssignModal() {
    if (assigning) return;
    setAssignModalOpen(false);
    setAssignLines(null);
    setChosenVendorId("");
  }

  async function confirmAssign() {
    const ids = selectedRows.map((p) => p.id);
    if (ids.length === 0) return;
    if (assignMode === "manual" && !chosenVendorId) {
      toast.error("Select a vendor");
      return;
    }
    setAssigning(true);
    try {
      if (assignMode === "manual") {
        const result = await apiFetch<AssignmentPlan[]>("/api/v1/paytrix/my-payments/assign", {
          method: "POST",
          body: { billPaymentIds: ids, vendorId: chosenVendorId },
        });
        const assigned = result.filter((line) => line.willAssign).length;
        if (assigned === ids.length) {
          toast.success(
            assigned === 1
              ? `Bill assigned to ${result[0]?.vendorName ?? "vendor"}`
              : `Assigned ${assigned} bills to ${result[0]?.vendorName ?? "vendor"}`,
          );
          setAssignModalOpen(false);
          setChosenVendorId("");
          setSelectedIds(new Set());
        } else if (assigned > 0) {
          toast.error(`Assigned ${assigned} of ${ids.length} bills.`);
          setAssignModalOpen(false);
          setSelectedIds(new Set());
        } else {
          toast.error(result[0]?.reason ?? "Could not assign selected bills");
        }
      } else {
        if (!assignLines) return;
        const result = await apiFetch<AssignmentPlan[]>("/api/v1/paytrix/my-payments/assign", {
          method: "POST",
          body: { billPaymentIds: assignLines.map((line) => line.billPaymentId) },
        });
        const planned = assignLines.filter((line) => line.willAssign).length;
        const assigned = result.filter((line) => line.willAssign).length;
        if (assigned > 0 && assigned === planned) {
          toast.success(assigned === 1 ? "Bill assigned" : `Assigned ${assigned} bills`);
          setAssignModalOpen(false);
          setAssignLines(null);
          setSelectedIds(new Set());
        } else if (assigned > 0) {
          toast.error(`Assigned ${assigned} of ${planned}. The rest no longer match a commission rule.`);
          setAssignLines(result);
          setSelectedIds(new Set());
        } else {
          toast.error("No selected bill matches a commission rule");
          setAssignLines(result);
        }
      }
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  function openVerify(ids: string[]) {
    setBbpsById({});
    setManualIds(new Set(ids));
    setVerifyIds(ids);
  }

  function closeVerify() {
    if (verifying || checkingBbps || checkingId) return;
    setVerifyIds(null);
    setManualIds(new Set());
    setBbpsById({});
  }

  function toggleManual(id: string) {
    setManualIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function checkSelectedWithBbps() {
    if (!verifyIds || verifyIds.length === 0) return;
    setCheckingBbps(true);
    let verifiedCount = 0;
    try {
      for (const id of verifyIds) {
        if (bbpsById[id]?.verified) continue;
        try {
          const result = await apiFetch<{ zeroPending: boolean; summary: string }>(
            `/api/v1/paytrix/settlements/${id}/bbps-check`,
            { method: "POST" },
          );
          if (result.zeroPending) {
            const verified = await apiFetch<Array<{ verified: boolean; note: string }>>(
              "/api/v1/paytrix/settlements/verify",
              { method: "POST", body: { billPaymentIds: [id] } },
            );
            const ok = verified[0]?.verified === true;
            setBbpsById((prev) => ({
              ...prev,
              [id]: {
                paid: true,
                verified: ok,
                summary: ok
                  ? "Verified. The provider shows this bill as paid."
                  : verified[0]?.note || result.summary,
              },
            }));
            if (ok) {
              verifiedCount++;
              setManualIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }
          } else {
            setBbpsById((prev) => ({
              ...prev,
              [id]: { paid: false, verified: false, summary: result.summary },
            }));
            setManualIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        } catch (err) {
          setBbpsById((prev) => ({
            ...prev,
            [id]: {
              paid: false,
              verified: false,
              summary: err instanceof ApiError ? err.message : "The BBPS check failed",
            },
          }));
          setManualIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
      if (verifiedCount > 0) {
        toast.success(
          verifiedCount === 1
            ? "1 bill verified from BBPS"
            : `${verifiedCount} bills verified from BBPS`,
        );
        await load(true);
      }
    } finally {
      setCheckingBbps(false);
    }
  }

  async function verifyBills(ids: string[]) {
    setVerifying(true);
    try {
      const results = await apiFetch<
        Array<{ billPaymentId: string; verified: boolean; note: string }>
      >("/api/v1/paytrix/settlements/verify", {
        method: "POST",
        body: { billPaymentIds: ids },
      });
      const ok = results.filter((result) => result.verified).length;
      if (ok === results.length) toast.success(ok === 1 ? "Bill verified" : `Verified ${ok} bills`);
      else
        toast.error(
          `Verified ${ok} of ${results.length}. ${results.find((result) => !result.verified)?.note ?? ""}`,
        );
      setVerifyIds(null);
      setManualIds(new Set());
      setBbpsById({});
      setSelectedIds(new Set());
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function runBbpsCheck(id: string) {
    setCheckingId(id);
    try {
      const result = await apiFetch<{ zeroPending: boolean; summary: string }>(
        `/api/v1/paytrix/settlements/${id}/bbps-check`,
        { method: "POST" },
      );
      if (result.zeroPending) {
        const verified = await apiFetch<Array<{ verified: boolean; note: string }>>(
          "/api/v1/paytrix/settlements/verify",
          { method: "POST", body: { billPaymentIds: [id] } },
        );
        if (verified[0]?.verified) {
          toast.success("Bill verified");
          setVerifyIds(null);
          setManualIds(new Set());
          setBbpsById({});
          setSelectedIds(new Set());
          await load(true);
          return;
        }
        setBbpsById((prev) => ({
          ...prev,
          [id]: { paid: true, verified: false, summary: verified[0]?.note || result.summary },
        }));
        return;
      }
      setBbpsById((prev) => ({
        ...prev,
        [id]: { paid: false, verified: false, summary: result.summary },
      }));
    } catch (err) {
      setBbpsById((prev) => ({
        ...prev,
        [id]: {
          paid: false,
          verified: false,
          summary: err instanceof ApiError ? err.message : "The BBPS check failed",
        },
      }));
    } finally {
      setCheckingId(null);
    }
  }

  async function openProof(id: string) {
    try {
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/paytrix/settlements/${id}/proof`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error(await extractErrorMessage(response, "Could not open the proof"));
      const url = URL.createObjectURL(await response.blob());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open the proof");
    }
  }

  async function uploadImport(file: File) {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/paytrix/my-payments/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, `Upload failed with status ${response.status}`),
        );
      }
      const results = (await response.json()) as BulkRowResult[];
      setImportResults(results);
      setResultsModalOpen(true);
      const ok = results.filter((r) => r.success).length;
      if (results.length === 0) {
        toast.error("No rows were settled. Set Status to Paid (or Failed) and upload again.");
      } else if (ok === results.length) {
        toast.success(`Settled ${ok} bill${ok === 1 ? "" : "s"}`);
      } else {
        toast.error(`Settled ${ok} of ${results.length} rows. Check the results for the rest.`);
      }
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const corpLabel = corpOptions.find(([id]) => id === selectedCorpId)?.[1];
  const vendorLabel = vendorOptions.find(([id]) => id === selectedAssigneeId)?.[1];
  const assignableCount = assignLines?.filter((line) => line.willAssign).length ?? 0;
  const manualVerifyIds = (verifyIds ?? []).filter(
    (id) => manualIds.has(id) && !bbpsById[id]?.verified,
  );
  const multipleVerify = (verifyIds?.length ?? 0) > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Bill Payments"
        description="Bills paid by corporates that are awaiting vendor or Paytrix settlement."
        actions={
          <>
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
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              loading={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImport(e.target.files[0])}
            />
          </>
        }
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {QUEUE.map((item) => {
          const active = queue === item.key;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setQueue(item.key);
                setCurrentPage(1);
              }}
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
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {selectedCorpId !== "ALL" && (
            <FilterChip
              label={corpLabel ?? selectedCorpId}
              onClear={() => {
                setSelectedCorpId("ALL");
                setCurrentPage(1);
              }}
            />
          )}
          {selectedOperator !== "ALL" && (
            <FilterChip
              label={selectedOperator}
              onClear={() => {
                setSelectedOperator("ALL");
                setCurrentPage(1);
              }}
            />
          )}
          {consumerNumber.trim() && (
            <FilterChip
              label={consumerNumber.trim()}
              onClear={() => {
                setConsumerNumber("");
                setCurrentPage(1);
              }}
            />
          )}
          {selectedAssigneeId !== "ALL" && (
            <FilterChip
              label={vendorLabel ?? selectedAssigneeId}
              onClear={() => {
                setSelectedAssigneeId("ALL");
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
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="relative sm:max-w-sm">
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
              placeholder="Search corporate, bill code, operator, consumer ID, or vendor"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-indigo-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {selectedRows.length} {selectedRows.length === 1 ? "bill" : "bills"} selected
              <span className="ml-2 font-mono text-xs font-semibold text-indigo-700">
                ({inr(selectedRows.reduce((sum, r) => sum + r.billAmount, 0))})
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={<PackageCheck size={14} />}
                loading={bulkPickingUp}
                disabled={!canMarkInProgress}
                onClick={markSelectedInProgress}
              >
                Mark In Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<UserPlus size={14} />}
                disabled={!canAssignVendors || bulkPickingUp}
                onClick={openAssignModal}
              >
                Assign To Vendors
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<Zap size={14} />}
                disabled
                title="Direct payment via BBPS API coming soon"
              >
                Direct Pay
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <TableSkeleton cols={9} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={payments.length === 0 ? "Queue is clear" : "No payments match"}
            description={
              payments.length === 0
                ? "Bills show up here after a corporate pays them from their wallet."
                : "Try another queue or clear the filters."
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={[
                  selectableVisible.length > 0 ? (
                    <input
                      key="select-all"
                      type="checkbox"
                      aria-label="Select all unpicked payments"
                      checked={allSelectableSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  ) : (
                    ""
                  ),
                  "Bill Code",
                  "Operator",
                  "Consumer",
                  "Amount",
                  "Bill Status",
                  "Vendor Status",
                  "Corp Paid On",
                  "",
                ]}
              />
              <TBody>
                {paged.map((p) => {
                  const expanded = expandedIds.has(p.id);
                  const vendorBadge = vendorStatusBadge(p);
                  const selectable = isUnpickedRow(p);
                  return (
                    <Fragment key={p.id}>
                      <TR className="cursor-pointer" onClick={() => toggleExpand(p.id)}>
                        <TD className="w-10" onClick={(e) => e.stopPropagation()}>
                          {selectable && (
                            <input
                              type="checkbox"
                              aria-label={`Select payment ${p.id}`}
                              checked={selectedIds.has(p.id)}
                              onChange={() => toggleSelect(p.id)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          )}
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          {p.billId ? (
                            <button
                              type="button"
                              title="Copy bill code"
                              onClick={() => copyText(`bill:${p.id}`, p.billId!, "bill code")}
                              className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <span>{p.billId}</span>
                              {copiedKey === `bill:${p.id}` ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TD>
                        <TD>
                          <p className="font-semibold text-slate-900">{p.operatorName || "—"}</p>
                        </TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          {p.consumerId ? (
                            <button
                              type="button"
                              title="Copy consumer ID"
                              onClick={() =>
                                copyText(`consumer:${p.id}`, p.consumerId!, "consumer ID")
                              }
                              className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 font-mono text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                            >
                              <span>{p.consumerId}</span>
                              {copiedKey === `consumer:${p.id}` ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </TD>
                        <TD className="font-mono font-semibold text-slate-900">
                          {inr(p.billAmount)}
                        </TD>
                        <TD>
                          <StatusBadge status={billStatusOf(p)} />
                        </TD>
                        <TD>
                          <StatusBadge status={vendorBadge.status} label={vendorBadge.label} />
                        </TD>
                        <TD className="text-xs text-slate-500">
                          {formatDateTime(p.corpPaymentOn)}
                        </TD>
                        <TD>
                          <div className="flex items-center justify-end gap-2.5">
                            <div onClick={(e) => e.stopPropagation()}>
                              <RowAction
                                payment={p}
                                onSettle={() => openSettle(p)}
                                onVerify={() => openVerify([p.id])}
                              />
                            </div>
                            <span className="text-slate-300">
                              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                          </div>
                        </TD>
                      </TR>
                      {expanded && (
                        <TR className="hover:bg-transparent">
                          <TD colSpan={9} className="bg-slate-50 px-4 py-3 whitespace-normal!">
                            <PaymentDetail
                              payment={p}
                              copiedKey={copiedKey}
                              onCopy={copyText}
                              onOpenProof={() => openProof(p.id)}
                            />
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

      <Modal
        open={assignModalOpen}
        onClose={closeAssignModal}
        dismissable={!assigning}
        size="xl"
        title={
          selectedRows.length === 1
            ? "Assign bill to vendor"
            : `Assign ${selectedRows.length} bills to vendor`
        }
        description="Choose a vendor manually or match bills automatically using approved Vendor Rules."
        footer={
          <>
            <Button variant="outline" disabled={assigning} onClick={closeAssignModal}>
              Cancel
            </Button>
            <Button
              loading={assigning}
              disabled={
                assignMode === "manual"
                  ? !chosenVendorId || selectedRows.length === 0
                  : assignableCount === 0 || previewingAssign
              }
              onClick={confirmAssign}
            >
              {assignMode === "manual"
                ? selectedRows.length === 1
                  ? "Assign bill"
                  : `Assign ${selectedRows.length} bills`
                : assignableCount === 0
                  ? "Assign"
                  : assignableCount === 1
                    ? "Assign bill"
                    : `Assign ${assignableCount} bills`}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAssignMode("manual")}
              className={cn(
                "min-h-10 rounded-lg text-xs font-semibold transition-colors",
                assignMode === "manual"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              Select vendor manually
            </button>
            <button
              type="button"
              onClick={() => {
                setAssignMode("rules");
                if (assignLines == null && !previewingAssign) {
                  void loadRulesPreview();
                }
              }}
              className={cn(
                "min-h-10 rounded-lg text-xs font-semibold transition-colors",
                assignMode === "rules"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              Auto-match by Vendor Rules
            </button>
          </div>

          {assignMode === "manual" ? (
            <>
              <SearchableSelect
                label="Vendor"
                required
                disabled={vendorsLoading || assigning}
                value={chosenVendorId}
                onChange={setChosenVendorId}
                placeholder={
                  vendorsLoading
                    ? "Loading active vendors..."
                    : activeVendors.length === 0
                      ? "No active vendors available"
                      : "Select an active vendor..."
                }
                searchPlaceholder="Search vendors by name or code..."
                options={activeVendors.map((v) => ({
                  value: v.id,
                  label: v.clientName,
                  sublabel: v.clientCode ?? v.id,
                }))}
              />

              <ul className="flex max-h-72 flex-col gap-2 overflow-auto">
                {selectedRows.map((row) => (
                  <li key={row.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {row.operatorName || "Bill"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <span className="font-mono">{row.consumerId ?? "—"}</span>
                          {row.corpName ? ` · ${row.corpName}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-semibold text-slate-900">
                        {inr(row.billAmount)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : previewingAssign ? (
            <p className="py-6 text-center text-sm text-slate-500">Checking commission rules…</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
              {assignLines?.map((line) => (
                <li key={line.billPaymentId} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{line.billerName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{line.consumerNumber}</span>
                        {line.corporateName ? ` · ${line.corporateName}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold text-slate-900">
                      {inr(line.amount)}
                    </p>
                  </div>
                  {line.willAssign ? (
                    <p className="mt-2 text-sm font-medium text-indigo-700">
                      {line.vendorName} at{" "}
                      {line.commissionPercent == null ? "—" : commissionLabel(line.commissionPercent)}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">{line.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        open={verifyIds != null}
        onClose={closeVerify}
        dismissable={!verifying && !checkingBbps && !checkingId}
        size={multipleVerify ? "xl" : "md"}
        title={
          verifyIds?.length === 1
            ? "Verify this payment"
            : `Verify ${verifyIds?.length ?? 0} payments`
        }
        description={
          multipleVerify
            ? "Bills the provider shows as paid are verified immediately. Select any that are still due and verify them yourself."
            : "If the provider shows this bill as paid, it is verified immediately. Otherwise you can still verify it yourself."
        }
        footer={
          <>
            <Button
              variant="outline"
              disabled={verifying || checkingBbps || !!checkingId}
              onClick={closeVerify}
            >
              Cancel
            </Button>
            {multipleVerify && (
              <Button
                variant="outline"
                loading={checkingBbps}
                disabled={verifying}
                onClick={checkSelectedWithBbps}
              >
                Check with BBPS
              </Button>
            )}
            <Button
              loading={verifying}
              disabled={
                checkingBbps || !!checkingId || (multipleVerify && manualVerifyIds.length === 0)
              }
              onClick={() => verifyIds && verifyBills(multipleVerify ? manualVerifyIds : verifyIds)}
            >
              {multipleVerify ? `Verify ${manualVerifyIds.length}` : "Verify"}
            </Button>
          </>
        }
      >
        {verifyIds?.length === 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!payments.find((p) => p.id === verifyIds[0])?.hasPaymentProof}
              onClick={() => openProof(verifyIds[0])}
            >
              {payments.find((p) => p.id === verifyIds[0])?.hasPaymentProof
                ? "View proof"
                : "No proof attached"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={checkingId === verifyIds[0]}
              onClick={() => runBbpsCheck(verifyIds[0])}
            >
              Check with BBPS
            </Button>
          </div>
        )}
        {verifyIds?.length === 1 && bbpsById[verifyIds[0]] && (
          <p
            className={cn(
              "mb-3 text-sm",
              bbpsById[verifyIds[0]].verified ? "font-medium text-emerald-700" : "text-amber-800",
            )}
          >
            {bbpsById[verifyIds[0]].summary}
          </p>
        )}
        {multipleVerify ? (
          <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
            {verifyIds?.map((id) => {
              const payment = payments.find((item) => item.id === id);
              const check = bbpsById[id];
              return (
                <li key={id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="flex items-start gap-3">
                    {check?.verified ? (
                      <span className="mt-0.5 text-xs font-semibold text-emerald-700">Verified</span>
                    ) : (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        aria-label={`Verify payment ${id}`}
                        checked={manualIds.has(id)}
                        disabled={checkingBbps || verifying}
                        onChange={() => toggleManual(id)}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {payment?.operatorName || payment?.corpName || "Payment"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono">
                              {payment?.consumerId || payment?.transactionReferenceNumber || id}
                            </span>
                            {payment?.billAssignedTo === "VENDOR"
                              ? ` · ${payment.billAssignedToName}`
                              : ""}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-sm font-semibold text-slate-900">
                          {payment ? inr(payment.billAmount) : ""}
                        </p>
                      </div>
                      {check && (
                        <p
                          className={cn(
                            "mt-2 text-sm",
                            check.verified ? "font-medium text-emerald-700" : "text-amber-800",
                          )}
                        >
                          {check.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Confirm this vendor payment.</p>
        )}
      </Modal>

      <Modal
        open={resultsModalOpen}
        onClose={() => setResultsModalOpen(false)}
        title={
          importResults && importResults.length === 0
            ? "Nothing settled"
            : importResults && importResults.every((r) => r.success)
              ? "Bills settled"
              : "Upload processed with some issues"
        }
        description={
          importResults && importResults.length === 0
            ? "Set the Status column to Paid for each bill you want to settle, then upload the file again."
            : importResults
              ? `${importResults.filter((r) => r.success).length} of ${importResults.length} rows were settled.`
              : undefined
        }
        footer={<Button onClick={() => setResultsModalOpen(false)}>Done</Button>}
      >
        {importResults && (
          <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
            {importResults.map((r) => (
              <li
                key={r.row}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700">Row {r.row}</p>
                  <p className="mt-0.5 text-xs break-words text-slate-500">
                    {r.success ? r.billId : r.error}
                  </p>
                </div>
                <StatusBadge status={r.success ? "SUCCESS" : "FAILED"} />
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={settleTarget !== null}
        onClose={() => setSettleTarget(null)}
        title="Record settlement"
        description={
          settleTarget
            ? `${settleTarget.operatorName || settleTarget.corpName} · ${inr(settleTarget.billAmount)}${settleTarget.consumerId ? ` · ${settleTarget.consumerId}` : ""}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setSettleTarget(null)}>
              Cancel
            </Button>
            <Button
              form="settle-form"
              type="submit"
              variant={settleMode === "failed" ? "danger" : "primary"}
              loading={busyAction}
            >
              {settleMode === "paid" ? "Mark paid" : "Mark failed"}
            </Button>
          </>
        }
      >
        <form id="settle-form" onSubmit={submitSettle} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setSettleMode("paid")}
              className={cn(
                "min-h-11 rounded-lg text-xs font-semibold",
                settleMode === "paid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
              )}
            >
              Settled with biller
            </button>
            <button
              type="button"
              onClick={() => setSettleMode("failed")}
              className={cn(
                "min-h-11 rounded-lg text-xs font-semibold",
                settleMode === "failed" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500",
              )}
            >
              Could not settle
            </button>
          </div>
          {settleMode === "paid" ? (
            <>
              <Field
                label="BBPS transaction ID"
                value={bbpsTxn}
                onChange={(e) => setBbpsTxn(e.target.value)}
              />
              <Field
                label="External transaction ID"
                value={externalTxn}
                onChange={(e) => setExternalTxn(e.target.value)}
              />
              <Field
                label="How it was settled"
                hint="For example BBPS, NEFT, or MANUAL."
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
              />
            </>
          ) : (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Failure reason</span>
              <textarea
                rows={3}
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="What stopped this settlement"
              />
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filter bill payments"
        description="Narrow the list by corporate, operator, consumer ID, assignee, or amount."
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
          <SelectField
            label="Corporate"
            value={selectedCorpId}
            onChange={(e) => {
              setSelectedCorpId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            {corpOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name} ({id})
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Operator"
            value={selectedOperator}
            onChange={(e) => {
              setSelectedOperator(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            {operatorOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </SelectField>
          <Field
            label="Consumer ID"
            value={consumerNumber}
            onChange={(e) => {
              setConsumerNumber(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="e.g. 100234567"
          />
          {vendorOptions.length > 0 && (
            <SelectField
              label="Vendor"
              value={selectedAssigneeId}
              onChange={(e) => {
                setSelectedAssigneeId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All vendors</option>
              {vendorOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name} ({id})
                </option>
              ))}
            </SelectField>
          )}
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

function isUnpickedRow(payment: BillPaymentRow): boolean {
  return payment.billAssignedTo !== "VENDOR" && payment.orgStatus === "PENDING";
}

function billStatusOf(payment: BillPaymentRow): string {
  if (payment.billAssignedTo === "VENDOR") {
    return payment.verified ? "PAID" : "PENDING";
  }
  return payment.awaitingChecker ? "AWAITING_CHECKER" : payment.orgStatus;
}

function vendorStatusBadge(payment: BillPaymentRow): { status: string; label: string } {
  if (payment.billAssignedTo !== "VENDOR") {
    return { status: "NOT_ASSIGNED", label: "Not assigned" };
  }
  if (
    payment.billPaidOn != null ||
    payment.verified ||
    payment.vendorStage === "VENDOR_PAID" ||
    payment.vendorStage === "VERIFIED" ||
    payment.vendorStage === "REIMBURSED"
  ) {
    return { status: "PAID", label: "Assigned & Paid" };
  }
  if (
    payment.billAssignedToStatus === "IN_PROGRESS" ||
    payment.vendorStage === "IN_PROGRESS"
  ) {
    return { status: "IN_PROGRESS", label: "Assigned & In Progress" };
  }
  return { status: "PENDING", label: "Assigned & Pending" };
}

function RowAction({
  payment,
  onSettle,
  onVerify,
}: {
  payment: BillPaymentRow;
  onSettle: () => void;
  onVerify: () => void;
}) {
  const role = getUser()?.role;
  const canVerify = role === "SUPER_ADMIN" || role === "ORGANISATION_ADMIN" || role === "CHECKER";

  if (payment.vendorStage === "VENDOR_PAID" && canVerify) {
    return (
      <Button size="sm" icon={<ShieldCheck size={14} />} onClick={onVerify}>
        Verify
      </Button>
    );
  }
  if (payment.billAssignedTo === "VENDOR") {
    return null;
  }
  if (payment.orgStatus === "IN_PROCESS" && payment.canSettle) {
    return (
      <Button size="sm" onClick={onSettle}>
        Pay
      </Button>
    );
  }
  return null;
}

function PaymentDetail({
  payment,
  copiedKey,
  onCopy,
  onOpenProof,
}: {
  payment: BillPaymentRow;
  copiedKey: string | null;
  onCopy: (key: string, text: string, label: string) => void;
  onOpenProof: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        <DetailField label="Corporate" value={payment.corpName} />
        <DetailField
          label="Corporate ID"
          value={payment.corpId}
          mono
          copied={copiedKey === `corp:${payment.id}`}
          onCopy={() => onCopy(`corp:${payment.id}`, payment.corpId, "corporate ID")}
        />
        <DetailField
          label={payment.billAssignedTo === "VENDOR" ? "Vendor" : "Assigned To"}
          value={`${payment.billAssignedToName} (${payment.billAssignedTo === "VENDOR" ? "Vendor" : "Platform"})`}
        />
        <DetailField
          label={payment.billAssignedTo === "VENDOR" ? "Vendor ID" : "Assignee ID"}
          value={payment.billAssignedToId}
          mono
          copied={copiedKey === `vendor:${payment.id}`}
          onCopy={() => onCopy(`vendor:${payment.id}`, payment.billAssignedToId, "assignee ID")}
        />
        <DetailField label="Bill Fetched On" value={formatDateTime(payment.billFetchedOn)} />
        <DetailField label="Corp Paid User ID" value={payment.corpPaidUserId ?? "—"} mono />
        <DetailField label="Corp Payment Status" value={payment.corpPaymentStatus} />
        <DetailField label="Assigned Status" value={payment.billAssignedToStatus} />
        <DetailField label="Assigned On" value={formatDateTime(payment.billAssignedOn)} />
        <DetailField label="Bill Paid On" value={formatDateTime(payment.billPaidOn)} />
        <DetailField
          label="Transaction Ref."
          value={payment.transactionReferenceNumber ?? "—"}
          mono
        />
        <DetailField
          label="BBPS External Ref."
          value={payment.bbpsExternalReference ?? "—"}
          mono
        />
        <DetailField label="Verified" value={payment.verified ? "Yes" : "No"} />
        <DetailField
          label="Verified By"
          value={
            payment.verifiedBy
              ? `${payment.verifiedBy}${payment.verifiedById ? ` (${payment.verifiedById})` : ""}`
              : "—"
          }
        />
        <DetailField label="Verified On" value={formatDateTime(payment.verifiedOn)} />
        <div className="min-w-0">
          <dt className="text-[11px] font-medium text-slate-400">Payment Proof</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {payment.hasPaymentProof ? (
              <Button size="sm" variant="outline" onClick={onOpenProof}>
                View proof
              </Button>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copied?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm text-slate-900",
          mono ? "font-mono font-medium" : "font-medium",
        )}
      >
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 -ml-1 transition-colors hover:bg-slate-100 hover:text-indigo-700"
          >
            <span className="truncate">{value}</span>
            {copied ? (
              <Check size={11} className="shrink-0 text-emerald-600" />
            ) : (
              <Copy size={11} className="shrink-0 text-slate-400 group-hover:text-indigo-600" />
            )}
          </button>
        ) : (
          value
        )}
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
  if (hasMin) return `≥ ${inr(minN)}`;
  if (hasMax) return `≤ ${inr(maxN)}`;
  return "Amount";
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
