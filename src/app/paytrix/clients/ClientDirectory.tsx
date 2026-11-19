"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronRight, Copy, Mail, Phone, Plus, Search, UserRound } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { onboardingStatus } from "@/lib/onboarding-status";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { Client, ClientType, CorporateKind } from "@/lib/types";

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

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  CORPORATE: "Corporate",
  VENDOR: "Vendor",
};

function clientInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "C";
}

function formatOnboardedDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ClientDirectory({ clientType }: { clientType: ClientType }) {
  const toast = useToast();
  const router = useRouter();
  const role = getUser()?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "ORGANISATION_ADMIN";
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [createdClient, setCreatedClient] =
    useState<CreatedClientCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientName: "",
    contactPersonName: "",
    phoneNumber: "",
    email: "",
    password: "",
    openingBalance: "",
    corporateKind: "COMPANY" as CorporateKind,
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<Client[]>("/api/v1/paytrix/clients");
      setClients(rows.filter((client) => client.clientType === clientType));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientType]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiFetch<Client>("/api/v1/paytrix/clients", {
        method: "POST",
        body: {
          clientName: form.clientName.trim(),
          contactPersonName: form.contactPersonName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber,
          clientType,
          corporateKind: form.corporateKind,
        },
      });
      toast.success(
        `${created.clientName} created — complete verification and agreement signing to activate`,
      );
      setForm({
        clientName: "",
        contactPersonName: "",
        phoneNumber: "",
        email: "",
        password: "",
        openingBalance: "",
        corporateKind: "COMPANY",
      });
      setModalOpen(false);
      await load();
      router.push(
        clientType === "VENDOR"
          ? `/paytrix/vendors/${created.id}`
          : `/paytrix/clients/${created.id}`,
      );
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
      `Your ${a.clientName} account is ready.`,
      "",
      `Name: ${a.clientName}`,
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

  function openCreatedClient() {
    if (!createdClient) return;
    router.push(
      createdClient.clientType === "VENDOR"
        ? `/paytrix/vendors/${createdClient.id}`
        : `/paytrix/clients/${createdClient.id}`,
    );
    setCreatedClient(null);
  }

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredClients = clients.filter((c) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      c.clientName.toLowerCase().includes(query) ||
      (c.clientCode ?? "").toLowerCase().includes(query) ||
      (c.contactPersonName ?? "").toLowerCase().includes(query) ||
      (c.contactEmail ?? "").toLowerCase().includes(query) ||
      (c.contactPhone ?? "").includes(query)
    );
  });

  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const pagedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const corporate = clientType === "CORPORATE";
  const title = corporate ? "Corporates" : "Vendors";
  const onboardLabel = corporate ? "Onboard corporate" : "Onboard vendor";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title={title}
        description={
          corporate
            ? "Companies that pay utility bills through Paytrix."
            : "Companies that settle bills for Paytrix."
        }
        actions={
          isAdmin ? (
            <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              {onboardLabel}
            </Button>
          ) : undefined
        }
      />

      <ListCard fitContent={false}>
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
            title={clients.length === 0 ? `No ${title.toLowerCase()} yet` : `No ${title.toLowerCase()} match`}
            description={
              clients.length === 0
                ? corporate
                  ? "Onboard a corporate with basic contact details to begin verification and agreement signing."
                  : "Onboard a vendor with basic contact details to begin verification and agreement signing."
                : "Try another status or clear the search."
            }
            action={
              isAdmin && clients.length === 0 ? (
                <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                  {onboardLabel}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={
                  corporate
                    ? ["Corporate", "Code", "Contact person", "Status", "Onboarded", ""]
                    : ["Vendor", "Code", "Contact person", "Status", "Onboarded", ""]
                }
              />
              <TBody>
                {pagedClients.map((client) => {
                  const code = client.clientCode ?? client.id;
                  return (
                    <TR
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          corporate
                            ? `/paytrix/clients/${client.id}`
                            : `/paytrix/vendors/${client.id}`,
                        )
                      }
                    >
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                            {clientInitials(client.clientName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {client.clientName}
                            </p>
                            <p className="text-[11px] font-medium text-slate-400">
                              {client.corporateKind === "INDIVIDUAL" ? "Individual" : "Company"}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          title="Copy code"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(code);
                              setCopiedCodeId(client.id);
                              toast.success(`Copied ${code}`);
                              setTimeout(() => setCopiedCodeId(null), 1500);
                            } catch {
                              toast.error("Could not copy code");
                            }
                          }}
                          className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 font-mono text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-indigo-700"
                        >
                          <span>{code}</span>
                          {copiedCodeId === client.id ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                          )}
                        </button>
                      </TD>
                      <TD>
                        <p className="font-semibold text-slate-900">
                          {client.contactPersonName || "—"}
                        </p>
                        {(client.contactPhone || client.contactEmail) && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
                            {client.contactPhone && (
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Phone size={11} className="text-slate-400" />
                                {client.contactPhone}
                              </span>
                            )}
                            {client.contactEmail && (
                              <span className="inline-flex items-center gap-1">
                                <Mail size={11} className="text-slate-400" />
                                {client.contactEmail}
                              </span>
                            )}
                          </div>
                        )}
                      </TD>
                      <TD>
                        <StatusBadge
                          status={onboardingStatus(client).code}
                          label={onboardingStatus(client).label}
                        />
                      </TD>
                      <TD className="text-xs text-slate-500">
                        {formatOnboardedDateTime(client.createdAt)}
                      </TD>
                      <TD>
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      </TD>
                    </TR>
                  );
                })}
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
        title={onboardLabel}
        description={
          corporate
            ? "Add basic details to create the corporate for business verification and agreement signing."
            : "Add basic details to create the vendor for business verification and agreement signing."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="create-client-form" type="submit" loading={submitting}>
              {corporate ? "Create corporate" : "Create vendor"}
            </Button>
          </>
        }
      >
        <form id="create-client-form" onSubmit={handleCreate} className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-medium text-slate-700">Type</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(
                [
                  {
                    kind: "COMPANY" as const,
                    title: "Company",
                    subtitle: "Registered business or enterprise",
                    icon: Building2,
                  },
                  {
                    kind: "INDIVIDUAL" as const,
                    title: "Individual",
                    subtitle: "Sole proprietor or individual",
                    icon: UserRound,
                  },
                ]
              ).map(({ kind, title: cardTitle, subtitle, icon: Icon }) => {
                const selected = form.corporateKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setForm({ ...form, corporateKind: kind })}
                    className={cn(
                      "group flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-all",
                      selected
                        ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        selected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/70",
                      )}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          selected ? "text-indigo-950" : "text-slate-900",
                        )}
                      >
                        {cardTitle}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-xs leading-snug",
                          selected ? "text-indigo-700" : "text-slate-500",
                        )}
                      >
                        {subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field
            label={corporate ? "Corporate name" : "Vendor name"}
            required
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            placeholder={corporate ? "Meridian Facilities" : "Harbor Utilities"}
          />

          <Field
            label="Contact person name"
            required
            value={form.contactPersonName}
            onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })}
            placeholder="Rahul Sharma"
            hint="Person you are in contact with for business verification and agreement signing."
          />

          <Field
            label="Contact person email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={corporate ? "rahul@meridian.com" : "rahul@harborutilities.com"}
          />

          <Field
            label="Contact person phone"
            required
            inputMode="numeric"
            maxLength={10}
            value={form.phoneNumber}
            onChange={(e) =>
              setForm({
                ...form,
                phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
            placeholder="9111111111"
          />
        </form>
      </Modal>

      <Modal
        open={createdClient !== null}
        onClose={() => setCreatedClient(null)}
        dismissable={false}
        title={`${corporate ? "Corporate" : "Vendor"} onboarded`}
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
            <Button onClick={openCreatedClient}>Open client</Button>
          </>
        }
      >
        {createdClient && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Copy the password now. It will not be shown again.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
              <Credential label={corporate ? "Corporate" : "Vendor"} value={createdClient.clientName} />
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
