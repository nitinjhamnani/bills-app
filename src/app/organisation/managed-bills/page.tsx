"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, SlidersHorizontal, X } from "lucide-react";
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

export default function OrganisationManagedBillsPage() {
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

  useEffect(() => {
    apiFetch<Client[]>("/api/v1/organisation/clients")
      .then(setClients)
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load clients"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      setBills(await apiFetch<ManagedBill[]>("/api/v1/organisation/managed-bills"));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load managed bills",
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
        title="Managed Bills"
        description="Every client's tracked bills across the organisation, always showing the latest fetched cycle."
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

      <ListCard>
        {loading ? (
          <TableSkeleton cols={8} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? "No managed bills" : "No bills match"}
            description={
              bills.length === 0
                ? "Bills appear here once a client registers them."
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
                  "Client",
                  "Biller",
                  "Consumer / Customer",
                  "Amount",
                  "Payment status",
                  "Bill status",
                  "Due date",
                  "Last fetch",
                ]}
              />
              <TBody>
                {visible.map((b) => (
                  <TR
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/organisation/managed-bills/${b.id}`)}
                  >
                    <TD className="font-medium text-slate-900">
                      {b.clientName ?? "—"}
                      {b.clientCode && (
                        <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400">
                          {b.clientCode}
                        </span>
                      )}
                    </TD>
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
                      {b.lastFetchFailed ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"
                          title={b.lastFetchFailureReason ?? undefined}
                        >
                          <AlertTriangle size={13} /> Fetch failed
                        </span>
                      ) : b.lastFetchAt ? (
                        <span className="text-xs text-slate-500">
                          {new Date(b.lastFetchAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
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
        title="Filter bills"
        description="Narrow the list by client, consumer number, category, biller, or amount."
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
            label="Client"
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
              placeholder="Any"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
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
