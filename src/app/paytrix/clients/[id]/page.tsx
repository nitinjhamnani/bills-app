"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  FileText,
  Info,
  LayoutDashboard,
  Receipt,
  RotateCcw,
  SlidersHorizontal,
  GitBranch,
  Trash2,
  Users,
  BadgePercent,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { OnboardingTracker } from "@/components/OnboardingTracker";
import { StatusBadge } from "@/components/StatusBadge";
import { onboardingStatus } from "@/lib/onboarding-status";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { Client, OrganisationUser } from "@/lib/types";
import { OverviewTab } from "./OverviewTab";
import { TransactionsTab } from "./TransactionsTab";
import { BillsTab } from "./BillsTab";
import { ServicesTab } from "./ServicesTab";
import { UsersTab } from "./UsersTab";
import { BranchesTab } from "./BranchesTab";
import { RulesTab } from "../../commissions/RulesTab";

const BASE_TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "bills", label: "Bills", icon: FileText },
  { key: "services", label: "Services", icon: SlidersHorizontal },
  { key: "users", label: "Users", icon: Users },
] as const;

const RULES_TAB = { key: "rules", label: "Commissions", icon: BadgePercent } as const;
const BRANCHES_TAB = { key: "branches", label: "Branches", icon: GitBranch } as const;

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

const ABOUT_TAB = { key: "about", label: "About", icon: Info } as const;

type TabKey = (typeof BASE_TABS)[number]["key"] | "rules" | "about" | "branches";

const TAB_KEYS: readonly string[] = [...BASE_TABS.map((t) => t.key), RULES_TAB.key, BRANCHES_TAB.key];

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [salesPeople, setSalesPeople] = useState<OrganisationUser[]>([]);
  const [salesUserId, setSalesUserId] = useState("");
  const [salesOpen, setSalesOpen] = useState(false);
  const [savingSales, setSavingSales] = useState(false);

  useEffect(() => {
    setIsAdmin(getUser()?.role === "ORGANISATION_ADMIN");
  }, []);

  async function loadClient() {
    setLoading(true);
    try {
      setClient(await apiFetch<Client>(`/api/v1/paytrix/clients/${clientId}`));
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

  useEffect(() => {
    if (!client || client.clientType !== "CORPORATE" || !isAdmin) return;
    setSalesUserId(client.salesUserId ?? "");
    apiFetch<OrganisationUser[]>("/api/v1/paytrix/users")
      .then((users) =>
        setSalesPeople(users.filter((user) => user.role === "SALES" && user.status === "ACTIVE")),
      )
      .catch(() => setSalesPeople([]));
  }, [client, isAdmin]);

  async function saveSalesPerson(event: React.FormEvent) {
    event.preventDefault();
    setSavingSales(true);
    try {
      const updated = await apiFetch<Client>(`/api/v1/paytrix/clients/${clientId}/sales-person`, {
        method: "PATCH",
        body: { salesUserId: salesUserId || null },
      });
      setClient(updated);
      setSalesOpen(false);
      toast.success(updated.salesPersonName ? `Assigned to ${updated.salesPersonName}` : "Sales person cleared");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save the sales person");
    } finally {
      setSavingSales(false);
    }
  }

  async function setStatus(status: "ACTIVE" | "SUSPENDED" | "TERMINATED") {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/paytrix/clients/${clientId}/status`, {
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
  const awaitingActivation = client?.status === "PENDING";
  const vendor = client?.clientType === "VENDOR";
  const tabs = awaitingActivation
    ? [ABOUT_TAB]
    : vendor
      ? [BASE_TABS[0], BASE_TABS[2], BASE_TABS[3], RULES_TAB, BASE_TABS[4]]
      : [...BASE_TABS, BRANCHES_TAB];
  const shownTab = awaitingActivation ? "about" : vendor && tab === "transactions" ? "overview" : tab;
  const listedStatus = client ? onboardingStatus(client) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Link
          href={client?.clientType === "VENDOR" ? "/paytrix/vendors" : "/paytrix/corporates"}
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> {client?.clientType === "VENDOR" ? "Vendors" : "Corporates"}
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
                    <StatusBadge status={listedStatus?.code ?? client.status} label={listedStatus?.label} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {client.clientType === "CORPORATE"
                        ? client.corporateKind === "INDIVIDUAL"
                          ? "Individual"
                          : "Company"
                        : "Vendor"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    <span className="font-mono text-slate-700">
                      {client.contactPhone ?? "No phone"}
                    </span>
                    <span> · Onboarded {formatOnboarded(client.createdAt)}</span>
                  </p>
                  {client.clientType === "CORPORATE" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">
                        {client.salesPersonName ?? "No sales person"}
                      </span>
                      {isAdmin && client.status !== "TERMINATED" && (
                        <Button size="sm" variant="outline" onClick={() => setSalesOpen(true)}>
                          Update sales person
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {client && client.status !== "TERMINATED" && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {client.status !== "PENDING" && (
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
              )}
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

      <Modal
        open={salesOpen}
        onClose={() => setSalesOpen(false)}
        title="Update sales person"
        description={client ? `Choose who brought in ${client.clientName}, or leave it as none.` : undefined}
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setSalesOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="client-sales-person" loading={savingSales}>
              Save
            </Button>
          </>
        }
      >
        <form id="client-sales-person" onSubmit={saveSalesPerson}>
          <SelectField label="Sales person" value={salesUserId} onChange={(event) => setSalesUserId(event.target.value)}>
            <option value="">None</option>
            {client?.salesUserId &&
              client.salesPersonName &&
              !salesPeople.some((person) => person.id === client.salesUserId) && (
                <option value={client.salesUserId}>{client.salesPersonName}</option>
              )}
            {salesPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName}
              </option>
            ))}
          </SelectField>
        </form>
      </Modal>

      {!loading && <div className="mb-4 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = shownTab === t.key;
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
      </div>}

      {!loading && <div className="flex min-h-0 flex-1 flex-col">
        {shownTab === "about" && client && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Onboarding</h2>
            <p className="mt-1 mb-5 text-xs text-slate-500">
              {client.corporateKind === "INDIVIDUAL"
                ? "The client adds personal information, completes eKYC, then signs the contract. The account activates when the contract is signed."
                : "The client adds company information, completes eKYC, then signs the contract. The account activates when the contract is signed."}
            </p>
            <OnboardingTracker
              kind={client.corporateKind}
              companyDone={client.detailsSubmittedAt != null}
              kycDone={client.kycStatus === "COMPLETE"}
              contractDone={client.contractStatus === "SIGNED"}
            />
          </div>
        )}
        {shownTab === "overview" && <OverviewTab clientId={clientId} clientType={client?.clientType} />}
        {shownTab === "transactions" && !vendor && <TransactionsTab clientId={clientId} />}
        {shownTab === "bills" && <BillsTab clientId={clientId} />}
        {shownTab === "services" && <ServicesTab clientId={clientId} />}
        {shownTab === "rules" && <RulesTab vendorId={clientId} />}
        {shownTab === "users" && <UsersTab clientId={clientId} />}
        {shownTab === "branches" && client?.clientType === "CORPORATE" && <BranchesTab clientId={clientId} />}
      </div>}

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
