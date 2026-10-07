"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  IndianRupee,
  RotateCcw,
  UserPlus,
  Users,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge, formatStatusLabel } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ORGANISATION_ROLES } from "@/lib/roles";
import type { PlatformOrganisationDetail } from "@/lib/types";

const CLIENT_TYPE_LABELS = {
  CORPORATE: "Corporate",
  PARTNER: "Partner",
} as const;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(role: string) {
  return ORGANISATION_ROLES.find((item) => item.value === role)?.label ?? formatStatusLabel(role);
}

export default function PlatformOrganisationDetailPage() {
  const params = useParams<{ id: string }>();
  const organisationId = params.id;
  const toast = useToast();

  const [organisation, setOrganisation] = useState<PlatformOrganisationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
  });
  const [savingAdmin, setSavingAdmin] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setOrganisation(
        await apiFetch<PlatformOrganisationDetail>(`/api/v1/platform/organisations/${organisationId}`),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load organisation");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId]);

  async function setStatus(status: "ACTIVE" | "SUSPENDED") {
    setBusy(true);
    try {
      const next = await apiFetch<PlatformOrganisationDetail>(
        `/api/v1/platform/organisations/${organisationId}/status`,
        { method: "PATCH", body: { status } },
      );
      setOrganisation(next);
      toast.success(
        status === "SUSPENDED"
          ? `${next.organisationName} suspended`
          : `${next.organisationName} reactivated`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdmin(true);
    try {
      await apiFetch(`/api/v1/platform/organisations/${organisationId}/users`, {
        method: "POST",
        body: {
          fullName: adminForm.fullName,
          phoneNumber: adminForm.phoneNumber,
          email: adminForm.email || undefined,
          password: adminForm.password || undefined,
        },
      });
      toast.success(`${adminForm.fullName} added as organisation admin`);
      setAdminForm({ fullName: "", phoneNumber: "", email: "", password: "" });
      setAdminOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add admin");
    } finally {
      setSavingAdmin(false);
    }
  }

  const name = loading ? "Loading…" : (organisation?.organisationName ?? "Organisation");
  const userHref = (userId: string) => `/platform/organisations/${organisationId}/users/${userId}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Link
          href="/platform"
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Organisations
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {organisation ? userInitials(organisation.organisationName) : "…"}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{name}</h1>
              {organisation && (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={organisation.status} />
                    <CopyableChip text={organisation.organisationCode} label="organisation code" />
                    <CopyableChip text={organisation.tenantSchema} label="tenant schema" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Onboarded {formatWhen(organisation.createdAt)}
                  </p>
                </>
              )}
            </div>
          </div>
          {organisation && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                icon={<UserPlus size={16} />}
                onClick={() => setAdminOpen(true)}
                disabled={organisation.status === "SUSPENDED"}
              >
                Add admin
              </Button>
              <Button
                variant="outline"
                icon={organisation.status === "ACTIVE" ? <Ban size={16} /> : <RotateCcw size={16} />}
                loading={busy}
                onClick={() => setStatus(organisation.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
              >
                {organisation.status === "ACTIVE" ? "Suspend" : "Reactivate"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !organisation ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Clients" value={organisation.clientCount} icon={Building2} />
            <StatCard label="Staff" value={organisation.staffCount} icon={Users} />
            <StatCard
              label="Bills paid"
              value={organisation.billsPaid}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="GMV"
              value={`₹${organisation.totalGmv.toLocaleString("en-IN")}`}
              icon={IndianRupee}
            />
          </>
        )}
      </div>

      {organisation && (organisation.billsPendingPickup > 0 || organisation.billsInProcess > 0) && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <Clock size={16} />
          {organisation.billsPendingPickup} awaiting pick-up · {organisation.billsInProcess} in process
        </div>
      )}

      <Card>
        <CardHeader
          title="First admin"
          description="Created when this organisation was onboarded. They sign in with this phone and password."
        />
        {loading ? (
          <div className="p-5">
            <TableSkeleton cols={4} rows={1} />
          </div>
        ) : organisation?.admin ? (
          <Link
            href={userHref(organisation.admin.userId)}
            className="flex items-center gap-3 p-5 hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {userInitials(organisation.admin.displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{organisation.admin.displayName}</p>
              <p className="font-mono text-[11px] font-medium text-slate-500">
                {organisation.admin.phoneNumber}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={organisation.admin.status} />
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {roleLabel(organisation.admin.role)}
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </Link>
        ) : (
          <EmptyState icon={Users} title="No admin on file" description="This organisation has no organisation admin in the directory." />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Organisation staff"
          description="Admins, makers, checkers, and viewers for this tenant."
        />
        {loading ? (
          <TableSkeleton cols={4} />
        ) : !organisation || organisation.staff.length === 0 ? (
          <EmptyState icon={Users} title="No staff yet" description="Staff accounts will appear here after the organisation adds them." />
        ) : (
          <Table>
            <THead columns={["Staff", "Phone", "Role", "Status", ""]} />
            <TBody>
              {organisation.staff.map((user) => (
                <TR key={user.userId}>
                  <TD>
                    <Link href={userHref(user.userId)} className="flex items-center gap-3 hover:text-blue-700">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {userInitials(user.displayName)}
                      </span>
                      <p className="truncate font-semibold">{user.displayName}</p>
                    </Link>
                  </TD>
                  <TD className="font-mono text-xs text-slate-600">{user.phoneNumber}</TD>
                  <TD className="text-slate-600">{roleLabel(user.role)}</TD>
                  <TD>
                    <StatusBadge status={user.status} />
                  </TD>
                  <TD>
                    <Link href={userHref(user.userId)} className="flex justify-end text-slate-300 hover:text-slate-500">
                      <ChevronRight size={16} />
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Clients"
          description="Companies and partners this organisation has onboarded, with their first admin."
        />
        {loading ? (
          <TableSkeleton cols={5} />
        ) : !organisation || organisation.clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clients yet"
            description="Clients appear here after the organisation onboards them."
          />
        ) : (
          <Table>
            <THead columns={["Client", "Admin", "Phone", "Status", "Onboarded"]} />
            <TBody>
              {organisation.clients.map((client) => (
                <TR key={client.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {userInitials(client.clientName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {client.clientName}
                          {client.clientCode && (
                            <span className="ml-1.5 font-mono text-[11px] font-medium text-slate-400">
                              {client.clientCode}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                          {CLIENT_TYPE_LABELS[client.clientType]}
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {client.admin ? (
                      <Link href={userHref(client.admin.userId)} className="min-w-0 hover:text-blue-700">
                        <p className="truncate font-medium">{client.admin.displayName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{client.admin.phoneNumber}</p>
                      </Link>
                    ) : (
                      <span className="text-slate-400">No admin</span>
                    )}
                  </TD>
                  <TD className="font-mono text-xs text-slate-600">{client.contactPhone ?? ""}</TD>
                  <TD>
                    <StatusBadge status={client.status} />
                  </TD>
                  <TD className="text-slate-500">{formatWhen(client.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        title="Add organisation admin"
        description="They sign in with this phone and password. A password is optional — the demo password works until one is set."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdminOpen(false)}>
              Cancel
            </Button>
            <Button form="add-admin-form" type="submit" loading={savingAdmin}>
              Add admin
            </Button>
          </>
        }
      >
        <form id="add-admin-form" onSubmit={addAdmin} className="flex flex-col gap-4">
          <Field
            label="Full name"
            required
            value={adminForm.fullName}
            onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
            placeholder="Priya Shah"
          />
          <Field
            label="Mobile number"
            required
            inputMode="numeric"
            value={adminForm.phoneNumber}
            onChange={(e) =>
              setAdminForm({
                ...adminForm,
                phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
            placeholder="10-digit mobile number"
          />
          <Field
            label="Email"
            type="email"
            hint="Optional. Can be used with a password."
            value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            placeholder="name@organisation.com"
          />
          <PasswordField
            label="Password"
            hint="Optional. The demo password works until one is set."
            minLength={6}
            value={adminForm.password}
            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
            placeholder="At least 6 characters"
          />
        </form>
      </Modal>
    </div>
  );
}
