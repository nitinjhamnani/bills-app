"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ClientAccount } from "@/lib/types";

export default function EsignPage() {
  const toast = useToast();
  const admin = getUser()?.role === "CLIENT_ADMIN";
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    apiFetch<ClientAccount>("/api/v1/client/account")
      .then(setAccount)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Could not open e-sign"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = account?.kycStatus === "COMPLETE" && account.contractStatus !== "SIGNED";

  async function sign() {
    setSigning(true);
    try {
      await apiFetch("/api/v1/client/onboarding/contract-signed", { method: "POST" });
      window.location.assign("/client/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not sign the contract");
      setSigning(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">eSign</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Sign the contract</h1>
        <p className="mt-2 text-sm text-slate-500">
          You were sent here from onboarding. This page stands in for the signature provider.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Paytrix client agreement</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {account?.legalName || account?.clientName || "This company"} agrees to use Paytrix for utility bill payments.
          Signing activates the account.
        </p>
        <p className="mt-4 text-xs text-slate-500">No signature is collected in this preview. Continue when you are ready.</p>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Opening the agreement…</p>
      ) : account?.contractStatus === "SIGNED" ? (
        <Link href="/client/dashboard" className="text-sm font-semibold text-indigo-700">
          Back to the dashboard
        </Link>
      ) : !admin ? (
        <p className="text-sm text-slate-500">A client admin signs the contract.</p>
      ) : !ready ? (
        <Link href="/client/dashboard" className="text-sm font-semibold text-indigo-700">
          Finish the earlier steps first
        </Link>
      ) : (
        <Button className="self-start" loading={signing} onClick={() => void sign()}>
          Sign contract
        </Button>
      )}
    </div>
  );
}
