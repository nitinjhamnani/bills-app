"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, Settings, SlidersHorizontal, X } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { Client, ManagedBill } from "@/lib/types";

interface BillFetchDetail {
  billFetchId: string;
  billId: string;
  billAmount: number | null;
  billCycle: string | null;
  billDueDate: string | null;
  billGeneratedDate: string | null;
  billConsumerName: string | null;
  billStatus: string;
  billPaymentStatus: string;
  fetchedOn: string | null;
  fetchStatus: string;
  fetchRemarks: string | null;
  fetchProvider: string | null;
  fetchSnapshotJson: string | null;
}

export default function OrganisationBillDuesPage() {
  const toast = useToast();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [bills, setBills] = useState<ManagedBill[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("ALL");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [billerCategory, setBillerCategory] = useState("ALL");
  const [billerName, setBillerName] = useState("ALL");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [openMenuBillId, setOpenMenuBillId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const [activeFetchBill, setActiveFetchBill] = useState<ManagedBill | null>(null);
  const [fetchDetail, setFetchDetail] = useState<BillFetchDetail | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  async function openFetchDetails(bill: ManagedBill) {
    setOpenMenuBillId(null);
    setActiveFetchBill(bill);
    setFetchDetail(null);
    setFetchError(null);
    if (!bill.latestBillFetchId) {
      setFetchError("No bill fetch record is linked to this bill yet.");
      return;
    }
    setFetchLoading(true);
    try {
      const detail = await apiFetch<BillFetchDetail>(
        `/api/v1/paytrix/managed-bills/fetches/${encodeURIComponent(bill.latestBillFetchId)}`,
      );
      setFetchDetail(detail);
    } catch (err) {
      setFetchError(err instanceof ApiError ? err.message : "Failed to load fetch details");
    } finally {
      setFetchLoading(false);
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
    result = result.filter((bill) => matchesAmount(bill.amount, amountMin, amountMax));
    return result;
  }, [bills, selectedClientId, billerCategory, billerName, consumerNumber, amountMin, amountMax]);

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
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
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
              onClear={() => setSelectedClientId("ALL")}
            />
          )}
          {consumerNumber.trim() && (
            <FilterChip label={consumerNumber.trim()} onClear={() => setConsumerNumber("")} />
          )}
          {billerCategory !== "ALL" && (
            <FilterChip
              label={categoryLabel ?? billerCategory}
              onClear={() => setBillerCategory("ALL")}
            />
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

      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={9} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? "No bill dues" : "No bill dues match"}
            description={
              bills.length === 0
                ? "Bills appear here once a corporate bill is fetched and has a pending due."
                : "Try another filter or clear the ones that are on."
            }
            action={
              bills.length > 0 ? (
                <Button variant="outline" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <Table>
              <THead
                columns={[
                  "Corporate",
                  "Branch",
                  "Biller",
                  "Consumer / Customer",
                  "Amount",
                  "Payment status",
                  "Bill status",
                  "Due date",
                  "Last fetch",
                  "",
                ]}
              />
              <TBody>
                {visible.map((b) => (
                  <TR
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/paytrix/managed-bills/${b.id}`)}
                  >
                    <TD className="font-medium text-slate-900">
                      {b.clientName ?? "—"}
                      {b.clientCode && (
                        <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400">
                          {b.clientCode}
                        </span>
                      )}
                    </TD>
                    <TD className="text-slate-700">{b.branchName ?? "—"}</TD>
                    <TD>
                      {b.billerName}
                      <p className="text-[11px] font-normal text-slate-400">
                        {b.billServiceName}
                      </p>
                    </TD>
                    <TD>
                      <p className="text-slate-700">{b.customerName ?? "—"}</p>
                      <p className="font-mono text-[11px] text-slate-400">
                        {b.customerBillAccountNumber}
                      </p>
                    </TD>
                    <TD className="font-semibold text-slate-900">
                      {b.amount != null ? `₹${b.amount.toLocaleString("en-IN")}` : "—"}
                    </TD>
                    <TD>
                      <StatusBadge status={b.paymentStatus} />
                    </TD>
                    <TD>
                      <StatusBadge status={b.billStatus} />
                    </TD>
                    <TD className="text-slate-600">{b.dueDate ?? "—"}</TD>
                    <TD>
                      {b.lastFetchAt ? (
                        <span className="text-xs text-slate-500">
                          {new Date(b.lastFetchAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </TD>
                    <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div
                        ref={openMenuBillId === b.id ? menuContainerRef : undefined}
                        className="inline-block text-left"
                      >
                        <button
                          type="button"
                          aria-label={`Actions for bill ${b.customerBillAccountNumber}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuBillId === b.id}
                          onClick={(event) => {
                            if (openMenuBillId === b.id) {
                              setOpenMenuBillId(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            setMenuPos({
                              top: rect.bottom + 6,
                              right: window.innerWidth - rect.right,
                            });
                            setOpenMenuBillId(b.id);
                          }}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Settings size={15} />
                        </button>

                        {openMenuBillId === b.id && menuPos && (
                          <div
                            role="menu"
                            style={{ top: menuPos.top, right: menuPos.right }}
                            className="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openFetchDetails(b)}
                              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Eye size={14} className="text-slate-400" />
                              View fetch details
                            </button>
                          </div>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
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
            onChange={(e) => setSelectedClientId(e.target.value)}
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
              placeholder="No limit"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={activeFetchBill !== null}
        onClose={() => setActiveFetchBill(null)}
        title="Bill fetch details"
        description={
          activeFetchBill
            ? `${activeFetchBill.billerName} · ${activeFetchBill.customerBillAccountNumber}`
            : undefined
        }
      >
        {fetchLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading fetch details...</p>
        ) : fetchError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {fetchError}
          </div>
        ) : fetchDetail ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Fetch status
                </p>
                <div className="mt-1">
                  <StatusBadge status={fetchDetail.fetchStatus} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Bill status
                </p>
                <div className="mt-1">
                  <StatusBadge status={fetchDetail.billStatus} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Payment status
                </p>
                <div className="mt-1">
                  <StatusBadge status={fetchDetail.billPaymentStatus} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Bill amount
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {fetchDetail.billAmount != null
                    ? `₹${Number(fetchDetail.billAmount).toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Consumer name
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {fetchDetail.billConsumerName || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Bill cycle
                </p>
                <p className="mt-1 text-slate-700">{fetchDetail.billCycle || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Generated date
                </p>
                <p className="mt-1 text-slate-700">{fetchDetail.billGeneratedDate || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Due date
                </p>
                <p className="mt-1 text-slate-700">{fetchDetail.billDueDate || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Provider
                </p>
                <p className="mt-1 font-mono text-xs text-slate-700">
                  {fetchDetail.fetchProvider || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Fetched on
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  {fetchDetail.fetchedOn ? new Date(fetchDetail.fetchedOn).toLocaleString() : "—"}
                </p>
              </div>
            </div>
            {fetchDetail.fetchRemarks && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                <span className="font-semibold">Remarks:</span> {fetchDetail.fetchRemarks}
              </div>
            )}
          </div>
        ) : null}
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
