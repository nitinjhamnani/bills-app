"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
  isOrgAdmin,
  type BillFetchRecord,
  type BillPayment,
  type ClientType,
  type ManagedBill,
} from "@/lib/types";
import { vendorStageBadge, vendorStageOf } from "@/lib/vendor-stage";
import { CreateBillModal } from "@/app/client/managed-bills/CreateBillModal";

type VendorStage = "ASSIGNED" | "IN_PROGRESS" | "VENDOR_PAID" | "VERIFIED" | "REIMBURSED";

const VENDOR_FILTERS: { key: VendorStage | "ALL" | "VERIFIED_GROUP"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "VENDOR_PAID", label: "Waiting for Paytrix" },
  { key: "VERIFIED_GROUP", label: "Verified" },
];

const CORP_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DUE", label: "Due" },
  { key: "PAID", label: "Paid" },
  { key: "FAILED", label: "Failed" },
] as const;

type CorpFilterKey = (typeof CORP_FILTERS)[number]["key"];

function corpBucket(bill: ManagedBill): Exclude<CorpFilterKey, "ALL"> | "OTHER" {
  if (bill.billStatus === "FAILED" || bill.lastFetchFailed) return "FAILED";
  if (bill.billStatus === "DUE") return "DUE";
  if (bill.billStatus === "PAID") return "PAID";
  return "OTHER";
}

function vendorStage(bill: BillPayment): string {
  return vendorStageOf(bill);
}

function formatDate(iso: string | null | undefined) {
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
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function VendorBills({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof VENDOR_FILTERS)[number]["key"]>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    apiFetch<BillPayment[]>(`/api/v1/paytrix/clients/${clientId}/assigned-bills`)
      .then((rows) => {
        if (!cancelled) setPayments(rows);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load assigned bills");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, toast]);

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

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payments;
    return payments.filter(
      (bill) =>
        (bill.corporateName ?? "").toLowerCase().includes(query) ||
        bill.billerName.toLowerCase().includes(query) ||
        bill.billServiceName.toLowerCase().includes(query) ||
        bill.customerBillAccountNumber.toLowerCase().includes(query) ||
        (bill.customerName ?? "").toLowerCase().includes(query),
    );
  }, [payments, search]);

  const counts = useMemo(() => {
    const next: Record<string, number> = { ALL: searched.length, VERIFIED_GROUP: 0 };
    for (const bill of searched) {
      const stage = vendorStage(bill);
      if (stage === "VERIFIED" || stage === "REIMBURSED") next.VERIFIED_GROUP += 1;
      next[stage] = (next[stage] ?? 0) + 1;
    }
    return next;
  }, [searched]);

  const visible = useMemo(() => {
    if (filter === "ALL") return searched;
    if (filter === "VERIFIED_GROUP") {
      return searched.filter((bill) => {
        const stage = vendorStage(bill);
        return stage === "VERIFIED" || stage === "REIMBURSED";
      });
    }
    return searched.filter((bill) => vendorStage(bill) === filter);
  }, [searched, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {VENDOR_FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setFilter(item.key);
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
              placeholder="Search by corporate, biller, or consumer no."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={7} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={payments.length === 0 ? "No assigned bills" : "No bills match"}
            description={
              payments.length === 0
                ? "Bills appear here after a corporate pays and a rule assigns them to this vendor."
                : "Try another status filter or search query."
            }
          />
        ) : (
          <>
            <Table>
              <THead columns={["", "Corporate", "Biller", "Consumer", "Due date", "Amount", "Status"]} />
              <TBody>
                {paged.map((bill) => {
                  const expanded = expandedIds.has(bill.id);
                  const stage = vendorStageBadge(vendorStage(bill));
                  return (
                    <Fragment key={bill.id}>
                      <TR className="cursor-pointer" onClick={() => toggleExpand(bill.id)}>
                        <TD onClick={(event) => event.stopPropagation()}>
                          <button type="button" className="text-slate-400" onClick={() => toggleExpand(bill.id)}>
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </TD>
                        <TD className="font-semibold text-slate-900">{bill.corporateName ?? "—"}</TD>
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
                        <TD className="text-xs text-slate-600">{formatDate(bill.dueDate)}</TD>
                        <TD className="font-mono text-sm font-semibold text-slate-900">
                          ₹{bill.amount.toLocaleString("en-IN")}
                        </TD>
                        <TD>
                          <StatusBadge status={stage.status} label={stage.label} />
                        </TD>
                      </TR>
                      {expanded && (
                        <TR className="hover:bg-transparent">
                          <TD colSpan={7} className="whitespace-normal bg-slate-50/60 p-4">
                            <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                              <div><dt className="text-slate-400">Due</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(bill.dueDate)}</dd></div>
                              <div><dt className="text-slate-400">Corporate paid</dt><dd className="mt-1 font-medium text-slate-800">{bill.clientPaidAt ? formatDate(bill.clientPaidAt) : "—"}</dd></div>
                              <div><dt className="text-slate-400">Paid to biller</dt><dd className="mt-1 font-medium text-slate-800">{bill.vendorMarkedPaidAt ? formatDate(bill.vendorMarkedPaidAt) : "—"}</dd></div>
                              <div><dt className="text-slate-400">Verified</dt><dd className="mt-1 font-medium text-slate-800">{bill.bbpsVerifiedAt ? formatDate(bill.bbpsVerifiedAt) : "Not yet"}</dd></div>
                              <div><dt className="text-slate-400">Transaction ref.</dt><dd className="mt-1 font-mono font-medium text-slate-800">{bill.vendorPaymentReference ?? "—"}</dd></div>
                              <div><dt className="text-slate-400">BBPS ref.</dt><dd className="mt-1 font-mono font-medium text-slate-800">{bill.bbpsTransactionId ?? "—"}</dd></div>
                            </dl>
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
    </div>
  );
}

function CorporateBills({ clientId }: { clientId: string }) {
  const toast = useToast();
  const router = useRouter();
  const isAdmin = isOrgAdmin(getUser()?.role);
  const [bills, setBills] = useState<ManagedBill[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CorpFilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [openMenuBillId, setOpenMenuBillId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const [selectedBillForFetch, setSelectedBillForFetch] = useState<ManagedBill | null>(null);
  const [fetchDetails, setFetchDetails] = useState<BillFetchRecord | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (!openMenuBillId) return;
    function handleOutside(event: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuBillId(null);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuBillId(null);
    }
    function handleScroll() {
      setOpenMenuBillId(null);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenuBillId]);

  async function loadBills(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [rows, branchRows] = await Promise.all([
        apiFetch<ManagedBill[]>(`/api/v1/paytrix/managed-bills?clientId=${encodeURIComponent(clientId)}`),
        apiFetch<{ id: string; name: string }[]>(`/api/v1/paytrix/clients/${clientId}/branches`).catch(
          () => [] as { id: string; name: string }[],
        ),
      ]);
      setBills(rows);
      setBranches(branchRows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bills");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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

  async function openFetchDetailsModal(bill: ManagedBill) {
    setOpenMenuBillId(null);
    setSelectedBillForFetch(bill);
    setFetchDetails(null);
    if (!bill.latestBillFetchId) {
      return;
    }
    setFetchLoading(true);
    try {
      const record = await apiFetch<BillFetchRecord>(
        `/api/v1/paytrix/managed-bills/fetches/${encodeURIComponent(bill.latestBillFetchId)}`,
      );
      setFetchDetails(record);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load fetch details");
    } finally {
      setFetchLoading(false);
    }
  }

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bills;
    return bills.filter(
      (bill) =>
        bill.billerName.toLowerCase().includes(query) ||
        bill.billServiceName.toLowerCase().includes(query) ||
        bill.customerBillAccountNumber.toLowerCase().includes(query) ||
        (bill.customerName ?? "").toLowerCase().includes(query) ||
        (bill.branchName ?? "").toLowerCase().includes(query) ||
        bill.id.toLowerCase().includes(query),
    );
  }, [bills, search]);

  const counts = useMemo<Record<CorpFilterKey, number>>(
    () => ({
      ALL: searched.length,
      DUE: searched.filter((bill) => corpBucket(bill) === "DUE").length,
      PAID: searched.filter((bill) => corpBucket(bill) === "PAID").length,
      FAILED: searched.filter((bill) => corpBucket(bill) === "FAILED").length,
    }),
    [searched],
  );

  const visible = useMemo(
    () => (filter === "ALL" ? searched : searched.filter((bill) => corpBucket(bill) === filter)),
    [searched, filter],
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {CORP_FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setFilter(item.key);
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
                {counts[item.key]}
              </span>
            </button>
          );
        })}
      </div>

      <ListCard fitContent={false}>
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
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
              placeholder="Search biller, consumer no., or branch"
              aria-label="Search registered bills"
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {isAdmin && (
            <Button size="sm" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
              Create bill
            </Button>
          )}
        </div>

        {loading ? (
          <TableSkeleton cols={7} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? "No bills created yet" : "No bills match"}
            description={
              bills.length === 0
                ? "Registered bills for this corporate will appear here."
                : "Try another status filter or search query."
            }
            action={
              isAdmin && bills.length === 0 ? (
                <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                  Create bill
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={[
                  "Bill ID",
                  "Operator",
                  "Consumer",
                  "Branch",
                  "Status",
                  "Created on",
                  "",
                ]}
              />
              <TBody>
                {paged.map((bill) => (
                  <TR
                    key={bill.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/paytrix/bills/${bill.id}`)}
                  >
                    <TD onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="Copy bill ID"
                        onClick={() => copyText(`bill:${bill.id}`, bill.id)}
                        className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                      >
                        <span>{bill.id}</span>
                        {copiedKey === `bill:${bill.id}` ? (
                          <Check size={11} className="text-emerald-600" />
                        ) : (
                          <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                        )}
                      </button>
                    </TD>
                    <TD>
                      <p className="font-semibold text-slate-900">{bill.billerName}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                        {bill.billServiceName}
                      </p>
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
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
                    <TD className="text-xs font-medium text-slate-700">{bill.branchName ?? "—"}</TD>
                    <TD>
                      <StatusBadge status={bill.lastFetchFailed ? "FAILED" : bill.billStatus} />
                    </TD>
                    <TD className="text-xs text-slate-500">{formatDate(bill.createdAt)}</TD>
                    <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-2">
                        <div
                          ref={openMenuBillId === bill.id ? menuContainerRef : undefined}
                          className="inline-block text-left"
                        >
                          <button
                            type="button"
                            aria-label={`Actions for bill ${bill.id}`}
                            aria-haspopup="menu"
                            aria-expanded={openMenuBillId === bill.id}
                            onClick={(event) => {
                              if (openMenuBillId === bill.id) {
                                setOpenMenuBillId(null);
                                return;
                              }
                              const rect = event.currentTarget.getBoundingClientRect();
                              setMenuPos({
                                top: rect.bottom + 6,
                                right: window.innerWidth - rect.right,
                              });
                              setOpenMenuBillId(bill.id);
                            }}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                          >
                            <Settings size={15} />
                          </button>

                          {openMenuBillId === bill.id && menuPos && (
                            <div
                              role="menu"
                              style={{ top: menuPos.top, right: menuPos.right }}
                              className="fixed z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openFetchDetailsModal(bill)}
                                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <Eye size={14} className="text-slate-400" />
                                View fetch details
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`Open bill ${bill.id}`}
                          onClick={() => router.push(`/paytrix/bills/${bill.id}`)}
                          className="cursor-pointer text-slate-300 transition-colors hover:text-slate-600"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
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

      <CreateBillModal
        open={createOpen}
        clientId={clientId}
        branches={branches}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadBills(true);
          window.setTimeout(() => loadBills(true), 3000);
        }}
      />

      <Modal
        open={selectedBillForFetch !== null}
        onClose={() => setSelectedBillForFetch(null)}
        title="Bill fetch details"
        description={
          selectedBillForFetch
            ? `${selectedBillForFetch.billerName} · ${selectedBillForFetch.customerBillAccountNumber}`
            : undefined
        }
      >
        {fetchLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !selectedBillForFetch?.latestBillFetchId || !fetchDetails ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-center">
            <p className="text-sm font-semibold text-slate-800">No fetch record available</p>
            <p className="mt-1 text-xs text-slate-500">
              This bill does not have a latest fetch record in the bill fetch table yet.
            </p>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3.5 rounded-xl border border-slate-200 bg-white p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Consumer name</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {fetchDetails.billConsumerName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Bill amount</dt>
              <dd className="mt-1 font-mono text-sm font-bold text-slate-900">
                {fetchDetails.billAmount != null
                  ? `₹${fetchDetails.billAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Bill status</dt>
              <dd className="mt-1">
                {fetchDetails.billStatus ? (
                  <StatusBadge status={fetchDetails.billStatus} />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Payment status</dt>
              <dd className="mt-1">
                {fetchDetails.billPaymentStatus ? (
                  <StatusBadge status={fetchDetails.billPaymentStatus} />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Bill cycle</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {fetchDetails.billCycle || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Generated date</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {formatDate(fetchDetails.billGeneratedDate)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Due date</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {formatDate(fetchDetails.billDueDate)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Fetch status</dt>
              <dd className="mt-1">
                {fetchDetails.fetchStatus ? (
                  <StatusBadge status={fetchDetails.fetchStatus} />
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Provider</dt>
              <dd className="mt-1 font-mono font-medium text-slate-700">
                {fetchDetails.fetchProvider || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-slate-400">Fetched on</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {formatDateTime(fetchDetails.fetchedOn)}
              </dd>
            </div>
            {fetchDetails.fetchRemarks && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium text-slate-400">Fetch remarks</dt>
                <dd className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                  {fetchDetails.fetchRemarks}
                </dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}

export function BillsTab({ clientId, clientType }: { clientId: string; clientType?: ClientType }) {
  if (clientType === "VENDOR") return <VendorBills clientId={clientId} />;
  return <CorporateBills clientId={clientId} />;
}
