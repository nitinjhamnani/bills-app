"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export type DirectPayBill = {
  id: string;
  title: string;
  detail: string;
  amount: number;
};

type BbpsBalance = {
  readable: boolean;
  balance: number | null;
  message: string | null;
};

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function DirectPayModal({
  open,
  bills,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  bills: DirectPayBill[];
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<BbpsBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const readableBalance = balance?.readable && balance.balance != null ? balance.balance : null;
  const enough = readableBalance != null && readableBalance >= total;
  const short = readableBalance != null && readableBalance < total;
  const notice = error || (balance && !balance.readable ? balance.message || "The wallet balance could not be read" : null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setBalance(null);
    setError(null);
    apiFetch<BbpsBalance>("/api/v1/paytrix/my-payments/bbps-balance")
      .then((body) => {
        if (!cancelled) setBalance(body);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "The wallet balance could not be read");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={bills.length > 1 ? "xl" : "md"}
      dismissable={!busy}
      title={bills.length > 1 ? `Pay through BBPS (${bills.length} bills)` : "Pay through BBPS"}
      description="The BranchX wallet is checked before these bills are paid to the biller."
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={<Zap size={15} />}
            loading={busy}
            disabled={!enough || loading || busy}
            onClick={onConfirm}
          >
            {bills.length > 1 ? `Pay ${bills.length} through BBPS` : "Pay through BBPS"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-slate-700">BranchX wallet</span>
          <span className="font-mono font-bold text-indigo-700">
            {loading ? "Reading…" : readableBalance != null ? inr(readableBalance) : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-xs">
          <span className="font-semibold text-slate-700">
            Selected {bills.length === 1 ? "bill" : "bills"}:{" "}
            <span className="font-bold text-slate-900">{bills.length}</span>
          </span>
          <span className="font-mono font-bold text-indigo-700">{inr(total)}</span>
        </div>

        {bills.length > 0 && (
          <ul className="flex max-h-72 flex-col gap-2 overflow-auto">
            {bills.map((bill) => (
              <li key={bill.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{bill.title}</p>
                    {bill.detail && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        <span className="font-mono">{bill.detail}</span>
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold text-slate-900">{inr(bill.amount)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && notice && <p className="text-xs font-medium text-rose-700">{notice}</p>}
        {short && readableBalance != null && (
          <p className="text-xs font-medium text-rose-700">
            The BranchX wallet has {inr(readableBalance)}.{" "}
            {bills.length > 1 ? "These bills need" : "This payment needs"} {inr(total)}.
          </p>
        )}
      </div>
    </Modal>
  );
}
