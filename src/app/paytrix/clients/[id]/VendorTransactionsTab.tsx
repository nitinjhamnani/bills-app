"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";

export type VendorTransactionRecord = {
  id: string;
  vendorId: string;
  type: "CREDIT" | "DEBIT";
  category: "BILL_PAID" | "COMMISSION" | string;
  amount: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function categoryLabel(category: string) {
  if (category === "BILL_PAID") return "Bill paid";
  if (category === "COMMISSION") return "Commission";
  return category;
}

export function VendorTransactionsTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<VendorTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<VendorTransactionRecord[]>(`/api/v1/paytrix/clients/${clientId}/transactions`)
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load transactions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return (
    <ListCard fitContent={false}>
      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No vendor transactions yet"
          description="Transactions recorded for this vendor appear here."
        />
      ) : (
        <Table>
          <THead columns={["Date & Time", "Type", "Category", "Amount", "Recorded by"]} />
          <TBody>
            {rows.map((row) => (
              <TR key={row.id}>
                <TD className="text-xs text-slate-500">{when(row.createdAt)}</TD>
                <TD>
                  <StatusBadge
                    status={row.type === "CREDIT" ? "COMPLETED" : "PENDING"}
                    label={row.type}
                  />
                </TD>
                <TD className="font-medium text-slate-900">{categoryLabel(row.category)}</TD>
                <TD className="font-mono font-semibold text-slate-900">{inr(row.amount)}</TD>
                <TD className="text-slate-600">
                  {row.createdByName
                    ? `${row.createdByName}${row.createdBy ? ` (${row.createdBy})` : ""}`
                    : row.createdBy ?? "—"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </ListCard>
  );
}
