"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ReasonModal } from "@/components/ui/ReasonModal";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { Dispute } from "@/lib/types";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED_VALID", label: "Upheld" },
  { key: "RESOLVED_INVALID", label: "Dismissed" },
] as const;

type DisputeFilter = (typeof FILTERS)[number]["key"];

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
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

function isOpen(dispute: Dispute) {
  return dispute.status === "RAISED" || dispute.status === "UNDER_REVIEW";
}

function matchesFilter(dispute: Dispute, filter: DisputeFilter) {
  if (filter === "ALL") return true;
  if (filter === "OPEN") return isOpen(dispute);
  return dispute.status === filter;
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function DisputesPage() {
  const toast = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [target, setTarget] = useState<{ id: string; valid: boolean } | null>(null);
  const [filter, setFilter] = useState<DisputeFilter>("ALL");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      setDisputes(await apiFetch<Dispute[]>("/api/v1/organisation/disputes"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function resolve(notes: string) {
    if (!target) return;
    try {
      await apiFetch(`/api/v1/organisation/disputes/${target.id}/resolve`, {
        method: "POST",
        body: { valid: target.valid, notes },
      });
      toast.success(target.valid ? "Dispute upheld — bill refunded" : "Dispute dismissed");
      setTarget(null);
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return disputes;
    return disputes.filter((dispute) => {
      const bill = dispute.billPayment;
      return (
        (dispute.clientName ?? "").toLowerCase().includes(query) ||
        (dispute.clientCode ?? "").toLowerCase().includes(query) ||
        dispute.reason.toLowerCase().includes(query) ||
        (bill?.billerName ?? "").toLowerCase().includes(query) ||
        (bill?.customerBillAccountNumber ?? "").toLowerCase().includes(query) ||
        (dispute.raisedBy ?? "").toLowerCase().includes(query)
      );
    });
  }, [disputes, search]);

  const counts = {
    ALL: searched.length,
    OPEN: searched.filter((dispute) => isOpen(dispute)).length,
    RESOLVED_VALID: searched.filter((dispute) => dispute.status === "RESOLVED_VALID").length,
    RESOLVED_INVALID: searched.filter((dispute) => dispute.status === "RESOLVED_INVALID").length,
  };
  const visible = searched.filter((dispute) => matchesFilter(dispute, filter));

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Disputes"
        description="A valid dispute refunds the bill amount to the client's wallet."
      />

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
              placeholder="Search client, biller, or reason"
              className={searchClass}
            />
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title={disputes.length === 0 ? "No disputes" : "No disputes match"}
            description={
              disputes.length === 0
                ? "Disputed bills show up here after a client raises one."
                : "Try another status or clear the search."
            }
          />
        ) : (
          <Table>
            <THead columns={["Bill", "Client", "Amount", "Status", "Raised", ""]} />
            <TBody>
              {visible.map((dispute) => (
                <TR
                  key={dispute.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(dispute)}
                >
                  <TD>
                    <p className="font-semibold text-slate-900">
                      {dispute.billPayment?.billerName ?? "Bill payment"}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {dispute.billPayment?.customerBillAccountNumber ?? "—"}
                    </p>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {userInitials(dispute.clientName ?? "Client")}
                      </span>
                      <span className="truncate">
                        {dispute.clientName ?? "Unknown client"}
                        {dispute.clientCode && (
                          <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                            {dispute.clientCode}
                          </span>
                        )}
                      </span>
                    </div>
                  </TD>
                  <TD className="font-mono text-sm font-semibold text-slate-900">
                    {dispute.billPayment ? inr(dispute.billPayment.amount) : "—"}
                  </TD>
                  <TD>
                    <StatusBadge status={dispute.status} />
                  </TD>
                  <TD className="text-slate-500">{formatWhen(dispute.createdAt)}</TD>
                  <TD>
                    <ChevronRight size={16} className="ml-auto text-slate-300" />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Dispute"
        description={
          selected?.clientName
            ? `Raised by ${selected.clientName}${selected.clientCode ? ` (${selected.clientCode})` : ""}`
            : undefined
        }
        footer={
          selected && isOpen(selected) ? (
            <>
              <Button variant="outline" onClick={() => setTarget({ id: selected.id, valid: false })}>
                Dismiss
              </Button>
              <Button onClick={() => setTarget({ id: selected.id, valid: true })}>
                Uphold and refund
              </Button>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={selected.status} />
              <p className="text-xs font-medium text-slate-500">{formatWhen(selected.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Reason</p>
              <p className="mt-1 text-sm text-slate-800">{selected.reason}</p>
              {selected.raisedBy && (
                <p className="mt-1 text-xs text-slate-500">Raised by {selected.raisedBy}</p>
              )}
            </div>
            {selected.billPayment ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Bill
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                  <InfoField label="Biller" value={selected.billPayment.billerName} />
                  <InfoField label="Category" value={selected.billPayment.billServiceName} />
                  <InfoField
                    label="Consumer no."
                    value={<span className="font-mono">{selected.billPayment.customerBillAccountNumber}</span>}
                  />
                  <InfoField label="Customer" value={selected.billPayment.customerName ?? "—"} />
                  <InfoField label="Amount" value={inr(selected.billPayment.amount)} />
                  <InfoField label="Bill no." value={selected.billPayment.billNumber ?? "—"} />
                  <InfoField label="Due" value={selected.billPayment.dueDate ?? "—"} />
                  <InfoField
                    label="Bill status"
                    value={<StatusBadge status={selected.billPayment.billStatus} />}
                  />
                </dl>
              </div>
            ) : (
              <p className="text-sm text-slate-500">The bill for this dispute could not be loaded.</p>
            )}
            {selected.resolutionNotes && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-medium text-slate-400">Resolution</p>
                <p className="mt-1 text-sm text-slate-800">{selected.resolutionNotes}</p>
                {selected.resolvedBy && (
                  <p className="mt-1 text-xs text-slate-500">By {selected.resolvedBy}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ReasonModal
        open={target !== null}
        title={target?.valid ? "Uphold this dispute" : "Dismiss this dispute"}
        label="Resolution notes"
        confirmLabel={target?.valid ? "Uphold and refund" : "Dismiss"}
        danger={target ? !target.valid : false}
        onCancel={() => setTarget(null)}
        onConfirm={resolve}
      />
    </div>
  );
}
