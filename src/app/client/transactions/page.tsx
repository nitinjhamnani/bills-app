"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { ClientAccount } from "@/lib/types";
import { cn } from "@/lib/cn";

type VendorTransaction = {
  id: string;
  billPaymentId: string;
  corporateName: string | null;
  billerName: string | null;
  consumerNumber: string | null;
  billAmount: number;
  billPaidOn: string | null;
  commissionPercent: number | null;
  commissionAmount: number;
  commissionStatus: "PENDING" | "RECEIVED";
  commissionReference: string | null;
  commissionMode: string | null;
  paymentStatus: "PENDING" | "PAID";
  paymentMode: string | null;
  paymentMadeOn: string | null;
  paymentReference: string | null;
};

type Filter = "ALL" | "AWAITING" | "PAID" | "COMMISSION_DUE" | "COMMISSION_RECEIVED";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "AWAITING", label: "Paytrix owes you" },
  { key: "PAID", label: "Paytrix paid you" },
  { key: "COMMISSION_DUE", label: "You owe Paytrix" },
  { key: "COMMISSION_RECEIVED", label: "You paid Paytrix" },
];

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function hasCommission(row: VendorTransaction) {
  return row.commissionPercent != null;
}

function matches(row: VendorTransaction, filter: Filter) {
  if (filter === "AWAITING") return row.paymentStatus === "PENDING";
  if (filter === "PAID") return row.paymentStatus === "PAID";
  if (filter === "COMMISSION_DUE") return hasCommission(row) && row.commissionStatus === "PENDING";
  if (filter === "COMMISSION_RECEIVED") return row.commissionStatus === "RECEIVED";
  return true;
}

export default function VendorTransactionsPage() {
  const toast = useToast();
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [rows, setRows] = useState<VendorTransaction[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ClientAccount>("/api/v1/client/account")
      .then(async (next) => {
        setAccount(next);
        if (next.clientType !== "VENDOR") return;
        setRows(await apiFetch<VendorTransaction[]>("/api/v1/client/transactions"));
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load transactions"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => rows.filter((row) => matches(row, filter)), [rows, filter]);
  const awaiting = rows.filter((row) => row.paymentStatus === "PENDING");
  const paid = rows.filter((row) => row.paymentStatus === "PAID");
  const commissionDue = rows.filter((row) => hasCommission(row) && row.commissionStatus === "PENDING");
  const commissionReceived = rows.filter((row) => row.commissionStatus === "RECEIVED");
  const sum = (items: VendorTransaction[], pick: (row: VendorTransaction) => number) =>
    items.reduce((total, row) => total + pick(row), 0);

  if (account && account.clientType !== "VENDOR") {
    return <PageHeader title="Transactions" description="This page is for vendor accounts." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Transactions"
        description="You pay the biller. Paytrix pays that bill amount back to you. You pay Paytrix the commission on the bill."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paytrix owes you" value={inr(sum(awaiting, (row) => row.billAmount))} icon={ArrowLeftRight} tone="warning" trend={`${awaiting.length} bills to pay back`} />
        <StatCard label="Paytrix paid you" value={inr(sum(paid, (row) => row.billAmount))} icon={ArrowLeftRight} tone="success" trend={`${paid.length} bills paid back`} />
        <StatCard label="You owe Paytrix" value={inr(sum(commissionDue, (row) => row.commissionAmount))} icon={ArrowLeftRight} tone="warning" trend={`${commissionDue.length} commissions to pay`} />
        <StatCard label="You paid Paytrix" value={inr(sum(commissionReceived, (row) => row.commissionAmount))} icon={ArrowLeftRight} tone="success" trend={`${commissionReceived.length} commissions paid`} />
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "min-h-9 rounded-full px-3 text-xs font-semibold",
              filter === item.key ? "bg-indigo-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading ? null : visible.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={rows.length === 0 ? "No settlements yet" : "Nothing in this view"}
          description={
            rows.length === 0
              ? "Bills appear here after Paytrix verifies a payment you marked paid."
              : "Try another status."
          }
        />
      ) : (
        <ListCard>
          <Table>
            <THead columns={["Bill", "Company", "You paid the biller", "Paytrix pays you back", "You pay Paytrix"]} />
            <TBody>
              {visible.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <p className="font-semibold text-slate-900">{row.billerName ?? "Bill"}</p>
                    <p className="mt-1 text-slate-500">{row.consumerNumber ?? "—"}</p>
                    <p className="mt-1 text-slate-500">You paid the biller {when(row.billPaidOn)}</p>
                  </TD>
                  <TD>{row.corporateName ?? "—"}</TD>
                  <TD className="font-mono font-semibold text-slate-900">{inr(row.billAmount)}</TD>
                  <TD>
                    <StatusBadge
                      status={row.paymentStatus === "PAID" ? "PAID" : "AWAITING"}
                      label={row.paymentStatus === "PAID" ? "Paid back to you" : "Owes you this amount"}
                    />
                    {row.paymentStatus === "PAID" && (
                      <p className="mt-2 text-slate-500">
                        {when(row.paymentMadeOn)}
                        {row.paymentMode ? ` · ${row.paymentMode}` : ""}
                        {row.paymentReference ? ` · ${row.paymentReference}` : ""}
                      </p>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge
                      status={!hasCommission(row) ? "NONE" : row.commissionStatus === "RECEIVED" ? "PAID" : "PENDING"}
                      label={
                        !hasCommission(row)
                          ? "No commission"
                          : row.commissionStatus === "RECEIVED"
                            ? "You paid Paytrix"
                            : "You owe Paytrix"
                      }
                    />
                    {hasCommission(row) && (
                      <p className="mt-2 font-mono text-slate-700">
                        {inr(row.commissionAmount)} · {row.commissionPercent}%
                      </p>
                    )}
                    {row.commissionStatus === "RECEIVED" && (
                      <p className="mt-1 text-slate-500">
                        {row.commissionMode ?? "—"}
                        {row.commissionReference ? ` · ${row.commissionReference}` : ""}
                      </p>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ListCard>
      )}
    </div>
  );
}
