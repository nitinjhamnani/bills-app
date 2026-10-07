"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronRight, Copy, Plus, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { Client, ClientType } from "@/lib/types";

interface CreatedClientCredentials {
  id: string;
  clientName: string;
  clientCode: string | null;
  clientType: ClientType;
  phoneNumber: string;
  email: string;
  password: string;
  openingBalance?: number;
}

function parseOpeningBalance(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value * 100) / 100;
}

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  CORPORATE: "Corporate",
  PARTNER: "Partner",
};

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
  { key: "TERMINATED", label: "Terminated" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

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

export default function ClientsPage() {
  const toast = useToast();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [createdClient, setCreatedClient] =
    useState<CreatedClientCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    clientName: "",
    phoneNumber: "",
    email: "",
    password: "",
    clientType: "CORPORATE" as ClientType,
    openingBalance: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setClients(await apiFetch<Client[]>("/api/v1/organisation/clients"));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load clients",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const openingBalance = parseOpeningBalance(form.openingBalance);
      const created = await apiFetch<Client>("/api/v1/organisation/clients", {
        method: "POST",
        body: {
          clientName: form.clientName,
          phoneNumber: form.phoneNumber,
          email: form.email || undefined,
          password: form.password,
          clientType: form.clientType,
          openingBalance,
        },
      });
      toast.success(`${form.clientName} onboarded`);
      setCreatedClient({
        id: created.id,
        clientName: form.clientName,
        clientCode: created.clientCode,
        clientType: form.clientType,
        phoneNumber: form.phoneNumber,
        email: form.email,
        password: form.password,
        openingBalance,
      });
      setForm({
        clientName: "",
        phoneNumber: "",
        email: "",
        password: "",
        clientType: "CORPORATE",
        openingBalance: "",
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create client",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function buildShareText(a: CreatedClientCredentials) {
    const lines = [
      `Your ${a.clientName} client account is ready.`,
      "",
      `Client Name: ${a.clientName}`,
    ];
    if (a.clientCode) lines.push(`Client Code: ${a.clientCode}`);
    lines.push(`Login Phone: ${a.phoneNumber}`);
    if (a.email) lines.push(`Login Email: ${a.email}`);
    lines.push(`Password: ${a.password}`);
    if (a.openingBalance != null && a.openingBalance > 0) {
      lines.push(`Opening wallet balance: ${inr(a.openingBalance)}`);
    }
    lines.push("");
    lines.push(
      `Sign in at ${window.location.origin}/login using the phone/email and password above.`,
    );
    return lines.join("\n");
  }

  async function copyShareText() {
    if (!createdClient) return;
    try {
      await navigator.clipboard.writeText(buildShareText(createdClient));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Could not copy automatically — copy the details manually");
    }
  }

  function goToServicesTab() {
    if (!createdClient) return;
    router.push(`/organisation/clients/${createdClient.id}?tab=services`);
    setCreatedClient(null);
  }

  async function toggleStatus(client: Client) {
    const next = client.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await apiFetch(`/api/v1/organisation/clients/${client.id}/status`, {
        method: "PATCH",
        body: { status: next },
      });
      toast.success(
        `${client.clientName} ${next === "ACTIVE" ? "reactivated" : "suspended"}`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const searchedClients = clients.filter((c) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      c.clientName.toLowerCase().includes(query) ||
      (c.clientCode ?? "").toLowerCase().includes(query) ||
      (c.contactPhone ?? "").includes(query)
    );
  });
  const counts = {
    ALL: searchedClients.length,
    ACTIVE: searchedClients.filter((c) => c.status === "ACTIVE").length,
    SUSPENDED: searchedClients.filter((c) => c.status === "SUSPENDED").length,
    TERMINATED: searchedClients.filter((c) => c.status === "TERMINATED").length,
  };
  const filteredClients =
    statusFilter === "ALL"
      ? searchedClients
      : searchedClients.filter((c) => c.status === statusFilter);

  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const pagedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Clients"
        description="Companies and partners that pay bills through your organisation."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Onboard client
          </Button>
        }
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {STATUS_FILTERS.map((item) => {
          const active = statusFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setStatusFilter(item.key);
                setCurrentPage(1);
              }}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
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
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or phone"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={6} />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={clients.length === 0 ? "No clients yet" : "No clients match"}
            description={
              clients.length === 0
                ? "Onboard a client to give them a wallet and a first admin."
                : "Try another status or clear the search."
            }
            action={
              clients.length === 0 ? (
                <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                  Onboard client
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead columns={["Client", "Code", "Phone", "Status", "Onboarded", ""]} />
              <TBody>
                {pagedClients.map((client) => (
                  <TR
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/organisation/clients/${client.id}`)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {clientInitials(client.clientName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{client.clientName}</p>
                          <p className="text-[11px] font-medium text-slate-400">
                            {CLIENT_TYPE_LABELS[client.clientType]}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs font-medium text-slate-600">
                      {client.clientCode ?? "—"}
                    </TD>
                    <TD className="font-mono text-xs text-slate-600">
                      {client.contactPhone ?? "—"}
                    </TD>
                    <TD>
                      <StatusBadge status={client.status} />
                    </TD>
                    <TD className="text-slate-500">{formatOnboarded(client.createdAt)}</TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        {client.status !== "TERMINATED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleStatus(client);
                            }}
                          >
                            {client.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                          </Button>
                        )}
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClients.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </ListCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Onboard a client"
        description="Creates the client, their first admin, and an optional opening wallet balance."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="create-client-form" type="submit" loading={submitting}>
              Create client
            </Button>
          </>
        }
      >
        <form id="create-client-form" onSubmit={handleCreate} className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Client
            </h3>
            <Field
              label="Client name"
              required
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="FastPay Services"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">Client type</p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map((type) => {
                  const selected = form.clientType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, clientType: type })}
                      className={cn(
                        "min-h-11 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                        selected
                          ? "border-indigo-300 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      )}
                    >
                      {CLIENT_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field
              label="Opening wallet balance"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              hint="Optional. Credited to the client wallet as soon as they are created."
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              placeholder="0.00"
            />
          </section>

          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                First admin
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                They can sign in with this phone and password.
              </p>
            </div>
            <Field
              label="Phone number"
              required
              inputMode="numeric"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  phoneNumber: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="9111111111"
            />
            <Field
              label="Email"
              type="email"
              hint="Optional. Can be used with the password."
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@fastpay.com"
            />
            <PasswordField
              label="Password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </section>
        </form>
      </Modal>

      <Modal
        open={createdClient !== null}
        onClose={() => setCreatedClient(null)}
        dismissable={false}
        title="Client onboarded"
        description="Share these sign-in details. The password is shown only this once."
        footer={
          <>
            <Button
              variant="outline"
              icon={copied ? <Check size={16} /> : <Copy size={16} />}
              onClick={copyShareText}
            >
              {copied ? "Copied" : "Copy details"}
            </Button>
            <Button onClick={goToServicesTab}>Set up services</Button>
          </>
        }
      >
        {createdClient && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Copy the password now. It will not be shown again.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              <Credential label="Client" value={createdClient.clientName} />
              {createdClient.clientCode && (
                <Credential label="Client code" value={createdClient.clientCode} mono />
              )}
              <Credential
                label="Type"
                value={CLIENT_TYPE_LABELS[createdClient.clientType]}
              />
              <Credential label="Phone" value={createdClient.phoneNumber} mono />
              {createdClient.email && (
                <Credential label="Email" value={createdClient.email} />
              )}
              <Credential label="Password" value={createdClient.password} mono />
              {createdClient.openingBalance != null && createdClient.openingBalance > 0 && (
                <Credential
                  label="Wallet"
                  value={inr(createdClient.openingBalance)}
                />
              )}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Credential({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm font-medium text-slate-900",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
