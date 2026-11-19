"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Copy,
  FileText,
  GitBranch,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { Client, ManagedBill } from "@/lib/types";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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

export default function OrganisationBillDuesPage() {
  const toast = useToast();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [bills, setBills] = useState<ManagedBill[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("ALL");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [billerCategory, setBillerCategory] = useState("ALL");
  const [billerName, setBillerName] = useState("ALL");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  useEffect(() => {
    apiFetch<Client[]>("/api/v1/paytrix/clients")
      .then((rows) => setClients(rows.filter((c) => c.clientType !== "VENDOR")))
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load corporates"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      setBills(await apiFetch<ManagedBill[]>("/api/v1/paytrix/managed-bills/dues"));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load bill dues",
      );
    } finally {
      setLoading(false);
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

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const bill of bills) map.set(bill.billServiceCode, bill.billServiceName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [bills]);

  const billerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const bill of bills) set.add(bill.billerName);
    return Array.from(set).sort();
  }, [bills]);

  const visible = useMemo(() => {
    let result = bills;
    if (selectedClientId !== "ALL") {
      result = result.filter((bill) => bill.clientId === selectedClientId);
    }
    if (billerCategory !== "ALL") {
      result = result.filter((bill) => bill.billServiceCode === billerCategory);
    }
    if (billerName !== "ALL") {
      result = result.filter((bill) => bill.billerName === billerName);
    }
    if (consumerNumber.trim()) {
      const query = consumerNumber.trim().toLowerCase();
      result = result.filter((bill) =>
        bill.customerBillAccountNumber.toLowerCase().includes(query),
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (bill) =>
          bill.id.toLowerCase().includes(q) ||
          (bill.clientName ?? "").toLowerCase().includes(q) ||
          (bill.clientCode ?? "").toLowerCase().includes(q) ||
          (bill.branchName ?? "").toLowerCase().includes(q) ||
          bill.billerName.toLowerCase().includes(q) ||
          bill.customerBillAccountNumber.toLowerCase().includes(q) ||
          (bill.customerName ?? "").toLowerCase().includes(q),
      );
    }
    result = result.filter((bill) => matchesAmount(bill.amount, amountMin, amountMax));
    return result;
  }, [
    bills,
    selectedClientId,
    billerCategory,
    billerName,
    consumerNumber,
    search,
    amountMin,
    amountMax,
  ]);

  const totalPages = Math.ceil(visible.length / pageSize);
  const paged = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const amountRangeActive = Boolean(amountMin.trim() || amountMax.trim());
  const activeFilterCount = [
    selectedClientId !== "ALL",
    billerCategory !== "ALL",
    billerName !== "ALL",
    Boolean(consumerNumber.trim()),
    amountRangeActive,
  ].filter(Boolean).length;

  const categoryLabel = categoryOptions.find(([code]) => code === billerCategory)?.[1];
  const clientLabel = clients.find((client) => client.id === selectedClientId)?.clientName;

  function resetFilters() {
    setSelectedClientId("ALL");
    setBillerCategory("ALL");
    setBillerName("ALL");
    setConsumerNumber("");
    setAmountMin("");
    setAmountMax("");
    setCurrentPage(1);
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Bill Dues"
        description="All corporate bills that have been fetched and are currently due for payment."
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

      {activeFilterCount > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {selectedClientId !== "ALL" && (
            <FilterChip
              label={clientLabel ?? selectedClientId}
              onClear={() => {
                setSelectedClientId("ALL");
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
              placeholder="Search corporate, bill code, biller, or consumer no."
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={7} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? "No bill dues" : "No bill dues match"}
            description={
              bills.length === 0
                ? "Bills appear here once a corporate bill is fetched and has a pending due."
                : "Try another filter or clear the search."
            }
            action={
              bills.length > 0 ? (
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
                  "Corporate",
                  "Bill Code",
                  "Biller",
                  "Consumer",
                  "Amount",
                  "Due date",
                  "Last fetch",
                  "",
                ]}
              />
              <TBody>
                {paged.map((b) => {
                  const corpCode = b.clientCode || b.clientId;
                  return (
                    <TR
                      key={b.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/paytrix/bills/${b.id}`)}
                    >
                      <TD>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {b.clientName ?? "—"}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {corpCode && (
                              <button
                                type="button"
                                title="Copy corporate code"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyText(`corp:${b.id}`, corpCode, "corporate code");
                                }}
                                className="group inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                <span>{corpCode}</span>
                                {copiedKey === `corp:${b.id}` ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                                )}
                              </button>
                            )}
                            {b.branchName && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                <GitBranch size={11} className="text-indigo-500" />
                                {b.branchName}
                              </span>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Copy bill code"
                          onClick={() => copyText(`bill:${b.id}`, b.id, "bill code")}
                          className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <span>{b.id}</span>
                          {copiedKey === `bill:${b.id}` ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                          )}
                        </button>
                      </TD>
                      <TD>
                        <p className="font-semibold text-slate-900">{b.billerName}</p>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                          {b.billServiceName}
                        </p>
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Copy consumer ID"
                          onClick={() =>
                            copyText(
                              `consumer:${b.id}`,
                              b.customerBillAccountNumber,
                              "consumer ID",
                            )
                          }
                          className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 font-mono text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                        >
                          <span>{b.customerBillAccountNumber}</span>
                          {copiedKey === `consumer:${b.id}` ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                          )}
                        </button>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                          {b.customerName || "—"}
                        </p>
                      </TD>
                      <TD className="font-mono font-semibold text-slate-900">
                        {b.amount != null ? `₹${b.amount.toLocaleString("en-IN")}` : "—"}
                      </TD>
                      <TD className="text-xs text-slate-600">{formatDate(b.dueDate)}</TD>
                      <TD className="text-xs text-slate-500">{formatDateTime(b.lastFetchAt)}</TD>
                      <TD>
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      </TD>
                    </TR>
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
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filter bill dues"
        description="Narrow the list by corporate, consumer number, category, biller, or amount."
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
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.clientName}
                {client.clientCode ? ` (${client.clientCode})` : ""}
              </option>
            ))}
          </SelectField>
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

function matchesAmount(value: number | null | undefined, minRaw: string, maxRaw: string) {
  const min = parseFloat(minRaw);
  const max = parseFloat(maxRaw);
  const hasMin = !Number.isNaN(min);
  const hasMax = !Number.isNaN(max);
  if (!hasMin && !hasMax) return true;
  if (value == null) return false;
  if (hasMin && value < min) return false;
  if (hasMax && value > max) return false;
  return true;
}

function amountRangeLabel(minRaw: string, maxRaw: string) {
  const min = minRaw.trim();
  const max = maxRaw.trim();
  if (min && max) return `₹${min} – ₹${max}`;
  if (min) return `≥ ₹${min}`;
  return `≤ ₹${max}`;
}
