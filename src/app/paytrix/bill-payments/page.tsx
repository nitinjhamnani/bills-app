"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
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

type QueueTab = "ALL" | "ASSIGNED" | "NOT_ASSIGNED" | "PAID";

const QUEUE: { key: QueueTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "NOT_ASSIGNED", label: "Not Assigned" },
  { key: "PAID", label: "Paid" },
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

type VerifyOutcomeItem = {
  billPaymentId: string;
  verified: boolean;
  note: string;
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

  const [settleTargets, setSettleTargets] = useState<BillPaymentRow[] | null>(null);
  const [settleMode, setSettleMode] = useState<"paid" | "failed">("paid");
  const [busyAction, setBusyAction] = useState(false);
  const [bbpsTxns, setBbpsTxns] = useState<Record<string, string>>({});
  const [externalTxns, setExternalTxns] = useState<Record<string, string>>({});
  const [billType, setBillType] = useState("");
  const [failReason, setFailReason] = useState("");

  const [bbpsVerifyModalOpen, setBbpsVerifyModalOpen] = useState(false);
  const [bbpsModalTargets, setBbpsModalTargets] = useState<BillPaymentRow[]>([]);
  const [bbpsOutcomes, setBbpsOutcomes] = useState<Record<string, VerifyOutcomeItem> | null>(null);
  const [verifyingBbps, setVerifyingBbps] = useState(false);

  const [manualVerifyModalOpen, setManualVerifyModalOpen] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [verifyingManual, setVerifyingManual] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"manual" | "rules">("manual");
  const [activeVendors, setActiveVendors] = useState<Client[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [chosenVendorId, setChosenVendorId] = useState("");
  const [previewingAssign, setPreviewingAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignLines, setAssignLines] = useState<AssignmentPlan[] | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const next = await apiFetch<BillPaymentRow[]>("/api/v1/paytrix/my-payments");
      setPayments(next);
      const selectable = new Set(
        next
          .filter((row) => isSelectableUnpaidRow(row) || isPaidUnverifiedRow(row))
          .map((row) => row.id),
      );
      setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => selectable.has(id))));
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

  const activePayments = useMemo(
    () => payments.filter((p) => !p.verified),
    [payments],
  );

  const corpOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of activePayments) map.set(p.corpId, p.corpName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [activePayments]);

  const operatorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of activePayments) {
      if (p.operatorName) set.add(p.operatorName);
    }
    return Array.from(set).sort();
  }, [activePayments]);

  const vendorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of activePayments) {
      if (p.billAssignedTo === "VENDOR") {
        map.set(p.billAssignedToId, p.billAssignedToName);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [activePayments]);

  const narrowed = useMemo(() => {
    let result = activePayments;
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
    activePayments,
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
      ALL: narrowed.filter(isUnpaidQueueRow).length,
      ASSIGNED: narrowed.filter((p) => isUnpaidQueueRow(p) && p.billAssignedTo === "VENDOR").length,
      NOT_ASSIGNED: narrowed.filter((p) => isUnpaidQueueRow(p) && p.billAssignedTo !== "VENDOR")
        .length,
      PAID: narrowed.filter(isPaidUnverifiedRow).length,
    }),
    [narrowed],
  );

  const visible = useMemo(() => {
    if (queue === "PAID") return narrowed.filter(isPaidUnverifiedRow);
    if (queue === "ASSIGNED") {
      return narrowed.filter((p) => isUnpaidQueueRow(p) && p.billAssignedTo === "VENDOR");
    }
    if (queue === "NOT_ASSIGNED") {
      return narrowed.filter((p) => isUnpaidQueueRow(p) && p.billAssignedTo !== "VENDOR");
    }
    return narrowed.filter(isUnpaidQueueRow);
  }, [narrowed, queue]);

  const visibleTotalAmount = useMemo(
    () => visible.reduce((sum, p) => sum + (p.billAmount ?? 0), 0),
    [visible],
  );

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

  const selectedRows = useMemo(
    () => payments.filter((p) => selectedIds.has(p.id) && isUnpickedRow(p)),
    [payments, selectedIds],
  );

  const selectedInProgressRows = useMemo(
    () => payments.filter((p) => selectedIds.has(p.id) && isInProgressOrgRow(p)),
    [payments, selectedIds],
  );

  const selectedUnpaidRows = useMemo(
    () => payments.filter((p) => selectedIds.has(p.id) && isSelectableUnpaidRow(p)),
    [payments, selectedIds],
  );

  const selectedPaidRows = useMemo(
    () => payments.filter((p) => selectedIds.has(p.id) && isPaidUnverifiedRow(p)),
    [payments, selectedIds],
  );

  const unpaidSelectionLock: "PENDING" | "IN_PROCESS" | null =
    selectedRows.length > 0 && selectedInProgressRows.length === 0
      ? "PENDING"
      : selectedInProgressRows.length > 0 && selectedRows.length === 0
        ? "IN_PROCESS"
        : null;

  function canSelectPaymentRow(p: BillPaymentRow): boolean {
    if (queue === "PAID") return isPaidUnverifiedRow(p);
    if (!isSelectableUnpaidRow(p)) return false;
    if (unpaidSelectionLock === "PENDING") return isUnpickedRow(p);
    if (unpaidSelectionLock === "IN_PROCESS") return isInProgressOrgRow(p);
    return true;
  }

  const selectableVisible = useMemo(() => {
    if (queue === "PAID") return visible.filter(isPaidUnverifiedRow);
    const eligible = visible.filter(isSelectableUnpaidRow);
    if (unpaidSelectionLock === "PENDING") return eligible.filter(isUnpickedRow);
    if (unpaidSelectionLock === "IN_PROCESS") return eligible.filter(isInProgressOrgRow);
    const pendingInView = eligible.filter(isUnpickedRow);
    return pendingInView.length > 0 ? pendingInView : eligible;
  }, [visible, queue, unpaidSelectionLock]);

  const allSelectableSelected =
    selectableVisible.length > 0 && selectableVisible.every((p) => selectedIds.has(p.id));

  const currentRole = getUser()?.role;
  const canMarkInProgress =
    currentRole === "SUPER_ADMIN" ||
    currentRole === "ORGANISATION_ADMIN" ||
    currentRole === "MAKER";
  const canAssignVendors =
    currentRole === "SUPER_ADMIN" || currentRole === "ORGANISATION_ADMIN";
  const canVerify =
    currentRole === "SUPER_ADMIN" ||
    currentRole === "ORGANISATION_ADMIN" ||
    currentRole === "CHECKER";

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
    if (!row || !canSelectPaymentRow(row)) return;
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

  function openSettleModal() {
    if (selectedInProgressRows.length === 0) return;
    setBbpsTxns({});
    setExternalTxns({});
    setBillType("");
    setFailReason("");
    setSettleMode("paid");
    setSettleTargets(selectedInProgressRows);
  }

  async function submitSettle(e: React.FormEvent) {
    e.preventDefault();
    if (!settleTargets || settleTargets.length === 0) return;
    if (settleMode === "failed" && !failReason.trim()) {
      toast.error("Please enter a failure reason");
      return;
    }
    setBusyAction(true);
    let ok = 0;
    let failed = 0;
    let lastError: string | null = null;
    try {
      for (const target of settleTargets) {
        try {
          if (settleMode === "paid") {
            await apiFetch(`/api/v1/paytrix/my-payments/${target.id}/mark-paid`, {
              method: "POST",
              body: {
                bbpsTransactionId: (bbpsTxns[target.id] ?? "").trim() || null,
                externalTransactionId: (externalTxns[target.id] ?? "").trim() || null,
                billType: billType.trim() || null,
              },
            });
          } else {
            await apiFetch(`/api/v1/paytrix/my-payments/${target.id}/mark-failed`, {
              method: "POST",
              body: { reason: failReason.trim() },
            });
          }
          ok++;
        } catch (err) {
          failed++;
          lastError = err instanceof ApiError ? err.message : "Action failed";
        }
      }
      if (failed === 0) {
        toast.success(
          settleMode === "paid"
            ? ok === 1
              ? "Bill payment marked as paid"
              : `Marked ${ok} bill payments as paid`
            : ok === 1
              ? "Marked failed — sent back to queue"
              : `Marked ${ok} bills failed — sent back to queue`,
        );
        setSettleTargets(null);
        setSelectedIds(new Set());
      } else {
        toast.error(
          ok > 0
            ? `Processed ${ok} of ${settleTargets.length}. ${lastError ?? ""}`
            : lastError ?? "Action failed",
        );
      }
      await load(true);
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

  function openBbpsVerifyModal() {
    if (selectedPaidRows.length === 0) return;
    setBbpsModalTargets(selectedPaidRows);
    setBbpsOutcomes(null);
    setBbpsVerifyModalOpen(true);
  }

  function closeBbpsVerifyModal() {
    if (verifyingBbps) return;
    setBbpsVerifyModalOpen(false);
    setBbpsOutcomes(null);
    setBbpsModalTargets([]);
  }

  async function confirmBbpsVerify() {
    const ids = bbpsModalTargets.map((r) => r.id);
    if (ids.length === 0) return;
    setVerifyingBbps(true);
    try {
      const results = await apiFetch<VerifyOutcomeItem[]>(
        "/api/v1/paytrix/settlements/verify-bbps",
        {
          method: "POST",
          body: { billPaymentIds: ids },
        },
      );
      const ok = results.filter((r) => r.verified).length;
      const verifiedSet = new Set(results.filter((r) => r.verified).map((r) => r.billPaymentId));

      if (ok === results.length) {
        toast.success(
          ok === 1 ? "Bill verified via BBPS" : `Verified ${ok} bills via BBPS`,
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
        setBbpsVerifyModalOpen(false);
        setBbpsOutcomes(null);
        setBbpsModalTargets([]);
        await load(true);
      } else {
        const byId: Record<string, VerifyOutcomeItem> = {};
        for (const r of results) byId[r.billPaymentId] = r;
        setBbpsOutcomes(byId);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of verifiedSet) next.delete(id);
          return next;
        });
        if (ok > 0) {
          toast.error(`Verified ${ok} of ${results.length} bills via BBPS. Review remaining bills.`);
        } else {
          toast.error(results[0]?.note ?? "BBPS could not confirm payment for the selected bills");
        }
        await load(true);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "BBPS verification failed");
    } finally {
      setVerifyingBbps(false);
    }
  }

  function openManualVerifyModal() {
    if (selectedPaidRows.length === 0) return;
    setManualReason("");
    setManualVerifyModalOpen(true);
  }

  function closeManualVerifyModal() {
    if (verifyingManual) return;
    setManualVerifyModalOpen(false);
    setManualReason("");
  }

  async function confirmManualVerify() {
    const ids = selectedPaidRows.map((r) => r.id);
    const trimmedReason = manualReason.trim();
    if (ids.length === 0) return;
    if (!trimmedReason) {
      toast.error("Please enter a reason for manual verification");
      return;
    }
    setVerifyingManual(true);
    try {
      const results = await apiFetch<VerifyOutcomeItem[]>("/api/v1/paytrix/settlements/verify", {
        method: "POST",
        body: { billPaymentIds: ids, reason: trimmedReason },
      });
      const ok = results.filter((r) => r.verified).length;
      if (ok === results.length) {
        toast.success(
          ok === 1 ? "Bill manually verified" : `Manually verified ${ok} bills`,
        );
      } else {
        toast.error(
          `Verified ${ok} of ${results.length}. ${results.find((r) => !r.verified)?.note ?? ""}`,
        );
      }
      setManualVerifyModalOpen(false);
      setManualReason("");
      setSelectedIds(new Set());
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Manual verification failed");
    } finally {
      setVerifyingManual(false);
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
                if ((queue === "PAID") !== (item.key === "PAID")) {
                  setSelectedIds(new Set());
                }
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

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
          <span>
            {queue === "PAID"
              ? "Paid bills"
              : queue === "ASSIGNED"
                ? "Assigned bills"
                : queue === "NOT_ASSIGNED"
                  ? "Unassigned bills"
                  : "Bill payments"}
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              {visible.length}
            </span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-slate-700">
            Total amount: <span className="text-slate-900">{inr(visibleTotalAmount)}</span>
          </span>
          {queue !== "PAID" && selectedUnpaidRows.length > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono font-bold text-indigo-700">
                Selected ({selectedUnpaidRows.length}):{" "}
                {inr(selectedUnpaidRows.reduce((sum, r) => sum + r.billAmount, 0))}
              </span>
            </>
          )}
          {queue === "PAID" && selectedPaidRows.length > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono font-bold text-indigo-700">
                Selected ({selectedPaidRows.length}):{" "}
                {inr(selectedPaidRows.reduce((sum, r) => sum + r.billAmount, 0))}
              </span>
            </>
          )}
        </div>

        {queue !== "PAID" && selectedUnpaidRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedRows.length > 0 && (
              <Button
                size="sm"
                icon={<PackageCheck size={14} />}
                loading={bulkPickingUp}
                disabled={!canMarkInProgress || selectedInProgressRows.length > 0}
                title={
                  selectedInProgressRows.length > 0
                    ? "Select only pending bills to mark in progress"
                    : undefined
                }
                onClick={markSelectedInProgress}
              >
                Mark In Progress ({selectedRows.length})
              </Button>
            )}
            {selectedInProgressRows.length > 0 && (
              <Button
                size="sm"
                icon={<CheckCircle2 size={14} />}
                disabled={
                  selectedRows.length > 0 ||
                  !selectedInProgressRows.every((r) => r.canSettle)
                }
                title={
                  selectedRows.length > 0
                    ? "Select only in-progress bills to mark as paid"
                    : !selectedInProgressRows.every((r) => r.canSettle)
                      ? "Selected bill requires checker/admin approval"
                      : undefined
                }
                onClick={openSettleModal}
              >
                Mark as Paid ({selectedInProgressRows.length})
              </Button>
            )}
            {selectedRows.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                icon={<UserPlus size={14} />}
                disabled={
                  !canAssignVendors || bulkPickingUp || selectedInProgressRows.length > 0
                }
                onClick={openAssignModal}
              >
                Assign To Vendors ({selectedRows.length})
              </Button>
            )}
            {selectedRows.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                icon={<Zap size={14} />}
                disabled
                title="Direct payment via BBPS API coming soon"
              >
                Direct Pay
              </Button>
            )}
          </div>
        )}

        {queue === "PAID" && selectedPaidRows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              icon={<ShieldCheck size={14} />}
              disabled={!canVerify}
              onClick={openBbpsVerifyModal}
            >
              BBPS Verify ({selectedPaidRows.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<CheckCircle2 size={14} />}
              disabled={!canVerify}
              onClick={openManualVerifyModal}
            >
              Manual Verify ({selectedPaidRows.length})
            </Button>
          </div>
        )}
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
        <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-sm sm:flex-1">
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
          {selectableVisible.length > 0 && (
            <p className="text-xs font-bold text-blue-600">
              {queue === "PAID"
                ? "Select the bills you want to verify using the checkboxes."
                : "Select the bills you want to act on using the checkboxes."}
            </p>
          )}
        </div>

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
                      aria-label={
                        queue === "PAID"
                          ? "Select all paid payments"
                          : "Select all unpicked payments"
                      }
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
                  queue === "PAID" ? "Paid On" : "Corp Paid On",
                  "",
                ]}
              />
              <TBody>
                {paged.map((p) => {
                  const expanded = expandedIds.has(p.id);
                  const vendorBadge = vendorStatusBadge(p);
                  const selectable = canSelectPaymentRow(p);
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
                          {formatDateTime(queue === "PAID" ? p.billPaidOn : p.corpPaymentOn)}
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
        open={bbpsVerifyModalOpen}
        onClose={closeBbpsVerifyModal}
        dismissable={!verifyingBbps}
        size="xl"
        title={
          bbpsModalTargets.length === 1
            ? "Confirm BBPS Verification"
            : `Confirm BBPS Verification (${bbpsModalTargets.length} bills)`
        }
        description="Paytrix will query the live BBPS API for each selected bill and automatically mark bills as verified where the biller reports ₹0 pending."
        footer={
          bbpsOutcomes ? (
            <Button onClick={closeBbpsVerifyModal}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={verifyingBbps}
                onClick={closeBbpsVerifyModal}
              >
                Cancel
              </Button>
              <Button
                icon={<ShieldCheck size={15} />}
                loading={verifyingBbps}
                disabled={bbpsModalTargets.length === 0}
                onClick={confirmBbpsVerify}
              >
                {bbpsModalTargets.length === 1
                  ? "Verify via BBPS"
                  : `Verify ${bbpsModalTargets.length} via BBPS`}
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-xs">
            <span className="font-semibold text-slate-700">
              Selected {bbpsModalTargets.length === 1 ? "bill" : "bills"}:{" "}
              <span className="font-bold text-slate-900">{bbpsModalTargets.length}</span>
            </span>
            <span className="font-mono font-bold text-indigo-700">
              {inr(bbpsModalTargets.reduce((sum, r) => sum + r.billAmount, 0))}
            </span>
          </div>

          <ul className="flex max-h-72 flex-col gap-2 overflow-auto">
            {bbpsModalTargets.map((row) => {
              const outcome = bbpsOutcomes?.[row.id];
              return (
                <li key={row.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {row.operatorName || "Bill"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{row.consumerId ?? row.billId ?? "—"}</span>
                        {row.corpName ? ` · ${row.corpName}` : ""}
                        {row.billAssignedTo === "VENDOR" && row.billAssignedToName
                          ? ` · ${row.billAssignedToName}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {inr(row.billAmount)}
                      </p>
                      {outcome && (
                        <StatusBadge
                          status={outcome.verified ? "APPROVED" : "PENDING"}
                          label={outcome.verified ? "Verified" : "Not verified"}
                        />
                      )}
                    </div>
                  </div>
                  {outcome && (
                    <p
                      className={cn(
                        "mt-2 text-xs",
                        outcome.verified ? "font-medium text-emerald-700" : "text-amber-800",
                      )}
                    >
                      {outcome.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>

      <Modal
        open={manualVerifyModalOpen}
        onClose={closeManualVerifyModal}
        dismissable={!verifyingManual}
        size="xl"
        title={
          selectedPaidRows.length === 1
            ? "Confirm Manual Verification"
            : `Confirm Manual Verification (${selectedPaidRows.length} bills)`
        }
        description="Manually mark the selected paid bills as verified. Provide a reason to record in the verification activity log."
        footer={
          <>
            <Button
              variant="outline"
              disabled={verifyingManual}
              onClick={closeManualVerifyModal}
            >
              Cancel
            </Button>
            <Button
              icon={<CheckCircle2 size={15} />}
              loading={verifyingManual}
              disabled={selectedPaidRows.length === 0 || !manualReason.trim()}
              onClick={confirmManualVerify}
            >
              {selectedPaidRows.length === 1
                ? "Manual Verify"
                : `Manual Verify (${selectedPaidRows.length})`}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-xs">
            <span className="font-semibold text-slate-700">
              Selected {selectedPaidRows.length === 1 ? "bill" : "bills"}:{" "}
              <span className="font-bold text-slate-900">{selectedPaidRows.length}</span>
            </span>
            <span className="font-mono font-bold text-indigo-700">
              {inr(selectedPaidRows.reduce((sum, r) => sum + r.billAmount, 0))}
            </span>
          </div>

          <ul className="flex max-h-56 flex-col gap-2 overflow-auto">
            {selectedPaidRows.map((row) => (
              <li key={row.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {row.operatorName || "Bill"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">{row.consumerId ?? row.billId ?? "—"}</span>
                      {row.corpName ? ` · ${row.corpName}` : ""}
                      {row.billAssignedTo === "VENDOR" && row.billAssignedToName
                        ? ` · ${row.billAssignedToName}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {row.hasPaymentProof && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => openProof(row.id)}
                      >
                        View proof
                      </Button>
                    )}
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {inr(row.billAmount)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="manual-verify-reason"
                className="text-xs font-semibold text-slate-700"
              >
                Reason <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">{manualReason.length}/500</span>
            </div>
            <textarea
              id="manual-verify-reason"
              rows={3}
              maxLength={500}
              required
              disabled={verifyingManual}
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="Enter reason for manual verification (e.g. verified against bank UTR or biller receipt)..."
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
            />
          </div>
        </div>
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
        open={settleTargets !== null}
        onClose={() => !busyAction && setSettleTargets(null)}
        dismissable={false}
        size={settleTargets && settleTargets.length > 1 ? "xl" : "md"}
        title={
          settleTargets && settleTargets.length > 1
            ? `Mark ${settleTargets.length} bills as paid`
            : "Mark bill as paid"
        }
        description={
          settleTargets && settleTargets.length === 1
            ? `${settleTargets[0].operatorName || settleTargets[0].corpName} · ${inr(settleTargets[0].billAmount)}${settleTargets[0].consumerId ? ` · ${settleTargets[0].consumerId}` : ""}`
            : settleTargets
              ? `Enter the transaction reference and BBPS reference for each of the ${settleTargets.length} selected bills (${inr(settleTargets.reduce((sum, r) => sum + r.billAmount, 0))}).`
              : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              disabled={busyAction}
              onClick={() => setSettleTargets(null)}
            >
              Cancel
            </Button>
            <Button
              form="settle-form"
              type="submit"
              variant={settleMode === "failed" ? "danger" : "primary"}
              loading={busyAction}
            >
              {settleMode === "paid"
                ? settleTargets && settleTargets.length > 1
                  ? `Mark ${settleTargets.length} as Paid`
                  : "Mark as Paid"
                : "Mark Failed"}
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
            settleTargets && settleTargets.length === 1 ? (
              <>
                <Field
                  label="Transaction reference ID"
                  value={externalTxns[settleTargets[0].id] ?? ""}
                  onChange={(e) =>
                    setExternalTxns((prev) => ({
                      ...prev,
                      [settleTargets[0].id]: e.target.value,
                    }))
                  }
                />
                <Field
                  label="BBPS reference ID"
                  value={bbpsTxns[settleTargets[0].id] ?? ""}
                  onChange={(e) =>
                    setBbpsTxns((prev) => ({ ...prev, [settleTargets[0].id]: e.target.value }))
                  }
                />
                <Field
                  label="How it was settled"
                  hint="For example BBPS, NEFT, or MANUAL."
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                />
              </>
            ) : (
              <div className="flex flex-col">
                <div className="hidden border-b border-slate-200 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase md:grid md:grid-cols-2 md:gap-4">
                  <span>Bill Details</span>
                  <div className="grid grid-cols-2 gap-2">
                    <span>Transaction Ref.</span>
                    <span>BBPS Ref.</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {settleTargets?.map((target, index) => (
                    <div
                      key={target.id}
                      className="grid grid-cols-1 items-center gap-2.5 py-2.5 md:grid-cols-2 md:gap-4"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            <span className="mr-1.5 font-mono text-[11px] text-slate-400">
                              #{index + 1}
                            </span>
                            {target.operatorName || target.corpName}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            <span className="font-mono font-medium text-slate-700">
                              {target.consumerId ?? target.billId ?? "—"}
                            </span>
                            {target.corpName ? ` · ${target.corpName}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-semibold text-slate-900">
                          {inr(target.billAmount)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          maxLength={120}
                          disabled={busyAction}
                          placeholder="Transaction ref."
                          aria-label={`Transaction reference for ${target.consumerId ?? target.id}`}
                          value={externalTxns[target.id] ?? ""}
                          onChange={(e) =>
                            setExternalTxns((prev) => ({
                              ...prev,
                              [target.id]: e.target.value,
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                        />
                        <input
                          type="text"
                          maxLength={120}
                          disabled={busyAction}
                          placeholder="BBPS ref."
                          aria-label={`BBPS reference for ${target.consumerId ?? target.id}`}
                          value={bbpsTxns[target.id] ?? ""}
                          onChange={(e) =>
                            setBbpsTxns((prev) => ({ ...prev, [target.id]: e.target.value }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-slate-700">Failure reason</span>
              <textarea
                rows={3}
                required
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

function isUnpaidQueueRow(payment: BillPaymentRow): boolean {
  return payment.billPaidOn == null && !payment.verified;
}

function isPaidUnverifiedRow(payment: BillPaymentRow): boolean {
  return payment.billPaidOn != null && !payment.verified;
}

function isUnpickedRow(payment: BillPaymentRow): boolean {
  return (
    isUnpaidQueueRow(payment) &&
    payment.billAssignedTo !== "VENDOR" &&
    payment.orgStatus === "PENDING"
  );
}

function isInProgressOrgRow(payment: BillPaymentRow): boolean {
  return (
    isUnpaidQueueRow(payment) &&
    payment.billAssignedTo !== "VENDOR" &&
    payment.orgStatus === "IN_PROCESS"
  );
}

function isSelectableUnpaidRow(payment: BillPaymentRow): boolean {
  return isUnpickedRow(payment) || isInProgressOrgRow(payment);
}

function billStatusOf(payment: BillPaymentRow): string {
  if (payment.billPaidOn != null || payment.verified) {
    return "PAID";
  }
  if (payment.billAssignedTo === "VENDOR") {
    return "PENDING";
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
