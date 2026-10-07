"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ListTree } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { ManagedBill, BillPayment } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water",
  GAS: "Piped Gas",
  DTH: "DTH / Cable TV",
  BROADBAND: "Broadband / Fibernet",
  MOBILE_POSTPAID: "Mobile Postpaid",
  LANDLINE: "Landline",
  INSURANCE_PREMIUM: "Insurance Premium",
};

function InfoField({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate",
          emphasize ? "text-base font-bold text-slate-900" : "text-sm font-medium text-slate-800",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default function OrganisationManagedBillDetailsPage() {
  const params = useParams<{ id: string }>();
  const billId = params.id;
  const router = useRouter();
  const toast = useToast();

  const [bill, setBill] = useState<ManagedBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setBill(await apiFetch<ManagedBill>(`/api/v1/organisation/managed-bills/${billId}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill");
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    try {
      setPayments(
        await apiFetch<BillPayment[]>(`/api/v1/organisation/managed-bills/${billId}/payments`),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load bill history",
      );
    } finally {
      setPaymentsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href="/organisation/managed-bills"
        className="mb-2 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 hover:text-accent"
      >
        <ArrowLeft size={14} /> Back to managed bills
      </Link>

      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {loading ? "Loading..." : (bill?.billerName ?? "Bill")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {bill ? (
              <>
                {bill.clientName ? (
                  <Link
                    href={`/organisation/clients/${bill.clientId}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {bill.clientName}
                    {bill.clientCode ? ` (${bill.clientCode})` : ""}
                  </Link>
                ) : (
                  "—"
                )}{" "}
                · {bill.customerName ?? "—"} · {bill.customerBillAccountNumber}
              </>
            ) : (
              " "
            )}
          </p>
        </div>

        {bill && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
            <span className={bill.autoFetchEnabled ? "text-emerald-600" : "text-slate-400"}>
              Auto-fetch {bill.autoFetchEnabled ? "on" : "off"}
            </span>
            <span className={bill.autoPayEnabled ? "text-emerald-600" : "text-slate-400"}>
              Auto-pay {bill.autoPayEnabled ? "on" : "off"}
            </span>
          </div>
        )}
      </div>

      {loading || !bill ? (
        <TableSkeleton cols={6} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <Card className="shrink-0">
            <CardHeader title="Bill" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
              <InfoField
                label="Category"
                value={CATEGORY_LABELS[bill.billServiceCode] ?? bill.billServiceCode}
              />
              <InfoField label="Biller" value={bill.billerName} />
              <InfoField
                label="Consumer number"
                value={<span className="font-mono">{bill.customerBillAccountNumber}</span>}
              />
              <InfoField
                label="Mobile"
                value={<span className="font-mono">{bill.customerMobileNumber ?? "—"}</span>}
              />
              <InfoField
                label="Last fetched"
                value={bill.lastFetchAt ? new Date(bill.lastFetchAt).toLocaleString() : "—"}
              />
              <InfoField
                label="Fetch status"
                value={
                  bill.lastFetchFailed ? (
                    <span className="text-rose-600">{bill.lastFetchFailureReason ?? "Failed"}</span>
                  ) : (
                    "OK"
                  )
                }
              />
              <InfoField
                label="Amount"
                emphasize
                value={bill.amount != null ? `₹${bill.amount.toLocaleString("en-IN")}` : "—"}
              />
              <InfoField label="Payment status" value={<StatusBadge status={bill.paymentStatus} />} />
              <InfoField label="Bill status" value={<StatusBadge status={bill.billStatus} />} />
              <InfoField label="Due date" value={bill.dueDate ?? "—"} />
            </dl>
          </Card>

          <Card className="shrink-0 overflow-hidden">
            <CardHeader
              title="Bills against this account"
              description="Every fetch/payment cycle for this consumer number, most recent first. Click one for its details and activity log."
            />
            {paymentsLoading ? (
              <TableSkeleton cols={5} rows={2} />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={ListTree}
                title="No cycles yet"
                description="Payable cycles for this bill will show up here once fetched."
              />
            ) : (
              <Table>
                <THead
                  columns={["Due date", "Amount", "Payment status", "Org status", "Bill status"]}
                />
                <TBody>
                  {payments.map((p) => (
                    <TR
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/organisation/managed-bills/${billId}/payments/${p.id}`)}
                    >
                      <TD className="text-slate-600">{p.dueDate ?? "—"}</TD>
                      <TD className="font-semibold text-slate-900">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </TD>
                      <TD>
                        <StatusBadge status={p.paymentStatus} />
                      </TD>
                      <TD>
                        <StatusBadge status={p.orgStatus} />
                      </TD>
                      <TD>
                        <StatusBadge status={p.billStatus} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
