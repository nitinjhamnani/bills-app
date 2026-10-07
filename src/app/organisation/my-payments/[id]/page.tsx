"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { BillDetailsView } from "@/components/BillDetailsView";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { ReasonModal } from "@/components/ui/ReasonModal";
import { useToast } from "@/components/ui/Toast";
import type { BillLedgerEntry, BillPayment } from "@/lib/types";

export default function OrganisationMyPaymentDetailsPage() {
  const params = useParams<{ id: string }>();
  const billPaymentId = params.id;
  const toast = useToast();

  const [payment, setPayment] = useState<BillPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<BillLedgerEntry[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markFailedOpen, setMarkFailedOpen] = useState(false);
  const [bbpsTxn, setBbpsTxn] = useState("");
  const [externalTxn, setExternalTxn] = useState("");
  const [billType, setBillType] = useState("");

  async function load() {
    setLoading(true);
    try {
      setPayment(await apiFetch<BillPayment>(`/api/v1/organisation/my-payments/${billPaymentId}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load bill payment");
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    setTransactionsLoading(true);
    try {
      setTransactions(
        await apiFetch<BillLedgerEntry[]>(
          `/api/v1/organisation/my-payments/${billPaymentId}/transactions`,
        ),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load transactions");
    } finally {
      setTransactionsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billPaymentId]);

  async function pickUp() {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/organisation/my-payments/${billPaymentId}/pick-up`, { method: "POST" });
      toast.success("Picked up");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/api/v1/organisation/my-payments/${billPaymentId}/mark-paid`, {
        method: "POST",
        body: { bbpsTransactionId: bbpsTxn || null, externalTransactionId: externalTxn || null, billType: billType || null },
      });
      toast.success("Bill payment marked as paid");
      setMarkPaidOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function markFailed(reason: string) {
    try {
      await apiFetch(`/api/v1/organisation/my-payments/${billPaymentId}/mark-failed`, {
        method: "POST",
        body: { reason },
      });
      toast.success("Marked failed - sent back to the queue");
      setMarkFailedOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href="/organisation/my-payments"
        className="mb-2 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 hover:text-accent"
      >
        <ArrowLeft size={14} /> Back to My Payments
      </Link>

      <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {loading ? "Loading..." : (payment?.billerName ?? "Bill payment")}
            </h1>
            {payment && (
              <StatusBadge status={payment.awaitingChecker ? "AWAITING_CHECKER" : payment.orgStatus} />
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {payment
              ? `${payment.customerName ?? "—"} · ${payment.customerBillAccountNumber}`
              : " "}
          </p>
        </div>
        {payment && (
          <div className="flex shrink-0 items-center gap-2">
            {payment.orgStatus === "PENDING" &&
              (getUser()?.role === "ORGANISATION_ADMIN" || getUser()?.role === "MAKER") && (
                <Button loading={busy} onClick={pickUp}>
                  Pick up
                </Button>
              )}
            {payment.orgStatus === "IN_PROCESS" && payment.canSettle && (
              <>
                <Button onClick={() => setMarkPaidOpen(true)}>Mark paid</Button>
                <Button variant="danger" onClick={() => setMarkFailedOpen(true)}>
                  Mark failed
                </Button>
              </>
            )}
            {payment.orgStatus === "IN_PROCESS" && payment.awaitingChecker && !payment.canSettle && (
              <p className="text-sm font-medium text-amber-700">Waiting for a checker</p>
            )}
          </div>
        )}
      </div>

      {payment && (
        <BillDetailsView
          payment={payment}
          transactions={transactions}
          transactionsLoading={transactionsLoading}
        />
      )}

      <Modal
        open={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        title="Mark bill payment as paid"
        description="Record how this was actually settled with the biller."
        footer={
          <>
            <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>
              Cancel
            </Button>
            <Button form="mark-paid-form" type="submit" loading={busy}>
              Mark paid
            </Button>
          </>
        }
      >
        <form id="mark-paid-form" onSubmit={markPaid} className="flex flex-col gap-4">
          <Field
            label="BBPS transaction ID"
            value={bbpsTxn}
            onChange={(e) => setBbpsTxn(e.target.value)}
          />
          <Field
            label="External transaction ID"
            value={externalTxn}
            onChange={(e) => setExternalTxn(e.target.value)}
          />
          <Field
            label="Bill type"
            hint="How it was settled with the biller, e.g. BBPS, NEFT, MANUAL."
            value={billType}
            onChange={(e) => setBillType(e.target.value)}
          />
        </form>
      </Modal>

      <ReasonModal
        open={markFailedOpen}
        title="Mark bill payment as failed"
        label="Failure reason"
        confirmLabel="Mark failed"
        danger
        onCancel={() => setMarkFailedOpen(false)}
        onConfirm={markFailed}
      />
    </div>
  );
}
