"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  FileText,
  LayoutDashboard,
  Receipt,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { Client } from "@/lib/types";
import { OverviewTab } from "./OverviewTab";
import { TransactionsTab } from "./TransactionsTab";
import { BillsTab } from "./BillsTab";
import { ServicesTab } from "./ServicesTab";
import { UsersTab } from "./UsersTab";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "bills", label: "Bills", icon: FileText },
  { key: "services", label: "Services", icon: SlidersHorizontal },
  { key: "users", label: "Users", icon: Users },
] as const;

function clientInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "C";
}

function formatOnboarded(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type TabKey = (typeof TABS)[number]["key"];

const TAB_KEYS = TABS.map((t) => t.key) as readonly string[];

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const searchParams = useSearchParams();
  const toast = useToast();

  const requestedTab = searchParams.get("tab");
  const initialTab = TAB_KEYS.includes(requestedTab ?? "")
    ? (requestedTab as TabKey)
    : "overview";

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadClient() {
    setLoading(true);
    try {
      setClient(await apiFetch<Client>(`/api/v1/organisation/clients/${clientId}`));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load client",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function setStatus(status: "ACTIVE" | "SUSPENDED" | "TERMINATED") {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/organisation/clients/${clientId}/status`, {
        method: "PATCH",
        body: { status },
      });
      toast.success(`Client ${status.toLowerCase()}`);
      setTerminateOpen(false);
      await loadClient();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const name = loading ? "Loading…" : (client?.clientName ?? "Client");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Link
          href="/organisation/clients"
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Clients
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {client ? clientInitials(client.clientName) : "…"}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                {name}
                {client?.clientCode && (
                  <span className="ml-2 align-middle font-mono text-sm font-semibold text-slate-400">
                    {client.clientCode}
                  </span>
                )}
              </h1>
              {client && (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={client.status} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {client.clientType === "CORPORATE" ? "Corporate" : "Partner"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    <span className="font-mono text-slate-700">
                      {client.contactPhone ?? "No phone"}
                    </span>
                    <span> · Onboarded {formatOnboarded(client.createdAt)}</span>
                  </p>
                </>
              )}
            </div>
          </div>
          {client && client.status !== "TERMINATED" && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                icon={
                  client.status === "ACTIVE" ? <Ban size={16} /> : <RotateCcw size={16} />
                }
                loading={busy}
                onClick={() =>
                  setStatus(client.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")
                }
              >
                {client.status === "ACTIVE" ? "Suspend" : "Reactivate"}
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 size={16} />}
                onClick={() => setTerminateOpen(true)}
              >
                Terminate
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "overview" && <OverviewTab clientId={clientId} />}
        {tab === "transactions" && <TransactionsTab clientId={clientId} />}
        {tab === "bills" && <BillsTab clientId={clientId} />}
        {tab === "services" && <ServicesTab clientId={clientId} />}
        {tab === "users" && <UsersTab clientId={clientId} />}
      </div>

      <Modal
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title="Terminate this client?"
        description="This is permanent - the client can no longer log in, submit bills, or top up its wallet. Its history is kept for records."
        footer={
          <>
            <Button variant="outline" onClick={() => setTerminateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => setStatus("TERMINATED")}
            >
              Terminate client
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {client?.clientName} will be marked terminated. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
