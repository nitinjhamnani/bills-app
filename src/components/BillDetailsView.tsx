import { Receipt } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardHeader, ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BillLedgerEntry, BillPayment } from "@/lib/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export function BillDetailsView({
  payment,
  transactions,
  transactionsLoading,
}: {
  payment: BillPayment;
  transactions: BillLedgerEntry[];
  transactionsLoading: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bill" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total amount
                </p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                  ₹{payment.amount.toLocaleString("en-IN")}
                </p>
              </div>
              {payment.amountBreakdown.length > 0 && (
                <p className="max-w-[55%] text-right text-xs text-slate-500">
                  {payment.amountBreakdown
                    .map((c) => `${c.label} ₹${c.amount.toLocaleString("en-IN")}`)
                    .join(" · ")}
                </p>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Biller" value={payment.billerName} />
              <Field label="Category" value={payment.billServiceName} />
              <Field
                label="Consumer number"
                value={<span className="font-mono">{payment.customerBillAccountNumber}</span>}
              />
              <Field
                label="Mobile"
                value={
                  <span className="font-mono">{payment.customerMobileNumber ?? "—"}</span>
                }
              />
              <Field label="Bill number" value={payment.billNumber ?? "—"} />
              <Field label="Bill period" value={payment.billPeriod ?? "—"} />
              <Field label="Bill date" value={payment.billDate ?? "—"} />
              <Field label="Due date" value={payment.dueDate ?? "—"} />
            </dl>
          </div>
        </Card>

        <Card>
          <CardHeader title="Status & activity" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-5">
            <Field
              label="Payment status"
              value={<StatusBadge status={payment.paymentStatus} />}
            />
            <Field
              label="Org status"
              value={<StatusBadge status={payment.orgStatus} />}
            />
            <Field label="Paid by (client)" value={payment.clientPaidBy ?? "—"} />
            <Field label="Picked up by" value={payment.orgPickedUpBy ?? "—"} />
            <Field label="Paid by (organisation)" value={payment.orgPaidBy ?? "—"} />
            <Field label="BBPS txn." value={payment.bbpsTransactionId ?? "—"} />
            <Field label="External txn." value={payment.externalTransactionId ?? "—"} />
            <Field label="Bill type" value={payment.billType ?? "—"} />
            <Field
              label="Client paid"
              value={payment.clientPaidAt ? new Date(payment.clientPaidAt).toLocaleString() : "—"}
            />
            <Field
              label="Last updated"
              value={new Date(payment.updatedAt).toLocaleString()}
            />
            {payment.billPayFailureReason && (
              <div className="col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Failure reason
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-rose-600">
                  {payment.billPayFailureReason}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <ListCard>
        <CardHeader title="Related transactions" />
        {transactionsLoading ? (
          <TableSkeleton cols={6} rows={2} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Nothing has moved in the wallet for this bill payment yet."
          />
        ) : (
          <Table>
            <THead
              columns={[
                "When",
                "Type",
                "Category",
                "Amount",
                "Balance after",
                "Description",
              ]}
            />
            <TBody>
              {transactions.map((t, i) => (
                <TR key={i}>
                  <TD className="text-slate-500">
                    {new Date(t.createdAt).toLocaleString()}
                  </TD>
                  <TD
                    className={
                      t.entryType === "CREDIT"
                        ? "font-medium text-emerald-600"
                        : "font-medium text-red-600"
                    }
                  >
                    {t.entryType}
                  </TD>
                  <TD>
                    <StatusBadge status={t.referenceType} />
                  </TD>
                  <TD>₹{t.amount.toLocaleString("en-IN")}</TD>
                  <TD>₹{t.balanceAfter.toLocaleString("en-IN")}</TD>
                  <TD className="text-slate-500">{t.description ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>
    </div>
  );
}
