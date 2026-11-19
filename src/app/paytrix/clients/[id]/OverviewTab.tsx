"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Copy, FileText, GitBranch, PackageCheck, Pencil, Phone, Plus, ShieldCheck, UserCheck, UserPlus, Users, Wallet } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { ProofModal } from "@/components/ProofModal";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField, SearchableSelect } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { BillStatCard } from "@/components/ui/BillStatCard";
import { Skeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  isOrgAdmin,
  type BillPayment,
  type Client,
  type ClientAnalytics,
  type ClientType,
  type ClientUser,
  type OrganisationUser,
  type WalletTopup,
} from "@/lib/types";

export function OverviewTab({
  clientId,
  clientType,
  client,
  onClientUpdated,
}: {
  clientId: string;
  clientType?: ClientType;
  client?: Client | null;
  onClientUpdated?: (updated: Client) => void;
}) {
  const toast = useToast();
  const role = getUser()?.role;
  const isAdmin = isOrgAdmin(role);
  const vendor = clientType === "VENDOR";
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [assigned, setAssigned] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [adminUsers, setAdminUsers] = useState<ClientUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    fullName: "",
    phoneNumber: "",
    password: "",
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [salesPeople, setSalesPeople] = useState<OrganisationUser[]>([]);
  const [salesUserId, setSalesUserId] = useState(client?.salesUserId ?? "");
  const [salesOpen, setSalesOpen] = useState(false);
  const [savingSales, setSavingSales] = useState(false);

  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [topupsLoading, setTopupsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);

  useEffect(() => {
    setSalesUserId(client?.salesUserId ?? "");
  }, [client?.salesUserId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (vendor) {
          const bills = await apiFetch<BillPayment[]>(
            `/api/v1/paytrix/clients/${clientId}/assigned-bills`,
          );
          if (!cancelled) setAssigned(bills);
        } else {
          const data = await apiFetch<ClientAnalytics>(
            `/api/v1/clients/${clientId}/analytics`,
          );
          if (!cancelled) setAnalytics(data);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof ApiError ? err.message : "Failed to load analytics",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, vendor]);

  async function loadAdminUsers() {
    if (vendor) {
      setAdminUsers([]);
      setUsersLoading(false);
      return;
    }
    setUsersLoading(true);
    try {
      const rows = await apiFetch<ClientUser[]>(`/api/v1/paytrix/clients/${clientId}/users`);
      setAdminUsers(rows.filter((u) => u.role === "CLIENT_ADMIN"));
    } catch {
      setAdminUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAdminUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, vendor]);

  async function handleCreateAdmin(event: React.FormEvent) {
    event.preventDefault();
    setCreatingAdmin(true);
    try {
      await apiFetch(`/api/v1/paytrix/clients/${clientId}/users`, {
        method: "POST",
        body: {
          fullName: adminForm.fullName.trim(),
          phoneNumber: adminForm.phoneNumber,
          role: "CLIENT_ADMIN",
          ...(adminForm.password.trim() ? { password: adminForm.password } : {}),
        },
      });
      toast.success(`${adminForm.fullName.trim()} added as Admin`);
      setAdminForm({ fullName: "", phoneNumber: "", password: "" });
      setAdminModalOpen(false);
      await loadAdminUsers();
      const updatedAnalytics = await apiFetch<ClientAnalytics>(
        `/api/v1/clients/${clientId}/analytics`,
      );
      setAnalytics(updatedAnalytics);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create admin user");
    } finally {
      setCreatingAdmin(false);
    }
  }

  useEffect(() => {
    if (vendor || !isAdmin) return;
    apiFetch<OrganisationUser[]>("/api/v1/paytrix/users")
      .then((users) =>
        setSalesPeople(users.filter((u) => u.role === "SALES" && u.status === "ACTIVE")),
      )
      .catch(() => setSalesPeople([]));
  }, [vendor, isAdmin]);

  async function saveSalesPerson(event: React.FormEvent) {
    event.preventDefault();
    setSavingSales(true);
    try {
      const updated = await apiFetch<Client>(`/api/v1/paytrix/clients/${clientId}/sales-person`, {
        method: "PATCH",
        body: { salesUserId: salesUserId || null },
      });
      onClientUpdated?.(updated);
      setSalesOpen(false);
      toast.success(
        updated.salesPersonName ? `Assigned to ${updated.salesPersonName}` : "Sales user cleared",
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save the sales user");
    } finally {
      setSavingSales(false);
    }
  }

  async function loadTopups() {
    setTopupsLoading(true);
    try {
      setTopups(
        await apiFetch<WalletTopup[]>(
          `/api/v1/clients/${clientId}/wallet/topups`,
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load top-ups",
      );
    } finally {
      setTopupsLoading(false);
    }
  }

  useEffect(() => {
    if (vendor) {
      setTopups([]);
      setTopupsLoading(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTopups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, vendor]);

  async function reviewTopup(id: string, approve: boolean) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/paytrix/wallet-topups/${id}/review`, {
        method: "POST",
        body: { approve },
      });
      toast.success(
        approve ? "Top-up accepted and wallet credited" : "Top-up rejected",
      );
      await loadTopups();
      const updatedAnalytics = await apiFetch<ClientAnalytics>(
        `/api/v1/clients/${clientId}/analytics`,
      );
      setAnalytics(updatedAnalytics);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function stageOf(bill: BillPayment) {
    if (bill.reimbursedAt) return "REIMBURSED";
    return bill.vendorStage ?? "ASSIGNED";
  }

  function countStage(stage: "ASSIGNED" | "IN_PROGRESS" | "VENDOR_PAID" | "VERIFIED") {
    return assigned.filter((bill) => {
      const current = stageOf(bill);
      return stage === "VERIFIED" ? current === "VERIFIED" || current === "REIMBURSED" : current === stage;
    }).length;
  }

  function amountStage(stage: "ASSIGNED" | "IN_PROGRESS" | "VENDOR_PAID" | "VERIFIED") {
    return assigned
      .filter((bill) => {
        const current = stageOf(bill);
        return stage === "VERIFIED" ? current === "VERIFIED" || current === "REIMBURSED" : current === stage;
      })
      .reduce((total, bill) => total + bill.amount, 0);
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {vendor ? (
          loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <BillStatCard label="Assigned" count={countStage("ASSIGNED")} amount={amountStage("ASSIGNED")} icon={FileText} />
              <BillStatCard label="In progress" count={countStage("IN_PROGRESS")} amount={amountStage("IN_PROGRESS")} icon={Clock} tone="warning" />
              <BillStatCard label="Waiting for Paytrix" count={countStage("VENDOR_PAID")} amount={amountStage("VENDOR_PAID")} icon={Clock} />
              <BillStatCard label="Verified" count={countStage("VERIFIED")} amount={amountStage("VERIFIED")} icon={PackageCheck} tone="success" />
            </>
          )
        ) : loading || !analytics ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Bills"
              value={analytics.totalBills}
              icon={FileText}
            />
            <StatCard
              label="Total Branches"
              value={analytics.branchCount ?? 0}
              icon={GitBranch}
            />
            <StatCard
              label="Wallet Balance"
              value={`₹${analytics.walletBalance.toLocaleString("en-IN")}`}
              icon={Wallet}
            />
            <StatCard
              label="Total Users"
              value={analytics.userCount ?? 0}
              icon={Users}
            />
          </>
        )}
      </div>

      {vendor && (
        <p className="text-sm text-slate-500">
          These are bills assigned from corporates. The Bills tab lists every one. A bill appears in the vendor&apos;s Transactions only after Paytrix verifies it, and it stays on My Payments with the latest status.
        </p>
      )}

      {!vendor && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader
                title="Admin users"
                description="Corporate administrators who manage this account."
                actions={
                  isAdmin && client?.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      icon={<Plus size={14} />}
                      onClick={() => setAdminModalOpen(true)}
                    >
                      Add
                    </Button>
                  ) : undefined
                }
              />
              {usersLoading ? (
                <div className="px-5 py-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <ShieldCheck size={16} />
                    </span>
                    <div>
                      <p className="font-medium text-slate-700">No admin user created</p>
                      <p className="text-xs text-slate-400">
                        Create an admin user to manage this corporate&apos;s account.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {adminUsers.map((admin) => (
                    <li key={admin.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                          {userInitials(admin.fullName)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {admin.fullName}
                            </p>
                            <span className="font-mono text-[11px] font-semibold text-slate-400">
                              {admin.userCode}
                            </span>
                          </div>
                          <button
                            type="button"
                            title="Copy phone number"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(admin.phoneNumber);
                                setCopiedPhoneId(admin.id);
                                toast.success(`Copied ${admin.phoneNumber}`);
                                setTimeout(() => setCopiedPhoneId(null), 1500);
                              } catch {
                                toast.error("Could not copy phone number");
                              }
                            }}
                            className="group mt-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 -ml-1 font-mono text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Phone size={11} className="text-slate-400 group-hover:text-indigo-500" />
                            <span>{admin.phoneNumber}</span>
                            {copiedPhoneId === admin.id ? (
                              <Check size={11} className="text-emerald-600" />
                            ) : (
                              <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      <StatusBadge status={admin.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Assigned sales user"
                description="Paytrix sales representative linked to this corporate."
                actions={
                  isAdmin && client?.status !== "TERMINATED" ? (
                    <Button
                      size="sm"
                      icon={client?.salesPersonName ? <Pencil size={14} /> : <UserPlus size={14} />}
                      onClick={() => setSalesOpen(true)}
                    >
                      {client?.salesPersonName ? "Change" : "Assign"}
                    </Button>
                  ) : undefined
                }
              />
              <div className="px-5 py-4">
                {client?.salesPersonName ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        {userInitials(client.salesPersonName)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {client.salesPersonName}
                        </p>
                        {client.salesUserId && (
                          <p className="font-mono text-xs text-slate-500">
                            {client.salesUserId}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status="ACTIVE" label="Assigned" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <UserCheck size={16} />
                    </span>
                    <div>
                      <p className="font-medium text-slate-700">No sales user assigned</p>
                      <p className="text-xs text-slate-400">
                        Assign a sales representative to track this corporate&apos;s volume.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Wallet top-up requests"
              description="Every top-up needs Paytrix review before the wallet is credited."
            />
            {topupsLoading ? (
              <TableSkeleton cols={5} rows={3} />
            ) : topups.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No top-up requests yet"
                description="This client hasn't submitted a top-up."
              />
            ) : (
              <Table>
                <THead columns={["Amount", "Mode", "Reference", "Status", "Requested", ""]} />
                <TBody>
                  {topups.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-mono text-sm font-semibold text-slate-900">
                        ₹{t.amount.toLocaleString("en-IN")}
                      </TD>
                      <TD>{t.paymentMode}</TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span>{t.paymentReference ?? "—"}</span>
                          {t.hasProof && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setProofId(`/api/v1/clients/${clientId}/wallet/topups/${t.id}/proof`)}
                            >
                              View proof
                            </Button>
                          )}
                        </div>
                      </TD>
                      <TD>
                        <StatusBadge status={t.status} />
                      </TD>
                      <TD className="text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TD>
                      <TD>
                        {t.status === "PENDING" && (
                          t.canReview ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={busyId === t.id}
                                onClick={() => reviewTopup(t.id, true)}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === t.id}
                                onClick={() => reviewTopup(t.id, false)}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : role === "MAKER" ? (
                            <span className="text-xs font-medium text-amber-700">Waiting for a checker</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="Create admin user"
        description={
          client
            ? `Create a corporate admin for ${client.clientName}. They will sign in with this mobile number and password.`
            : "They will sign in with this mobile number and password."
        }
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setAdminModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="overview-create-admin" loading={creatingAdmin}>
              Create admin
            </Button>
          </>
        }
      >
        <form id="overview-create-admin" onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
          <Field
            label="Full name"
            required
            value={adminForm.fullName}
            onChange={(event) => setAdminForm({ ...adminForm, fullName: event.target.value })}
            placeholder="Ravi Kumar"
          />
          <Field
            label="Mobile number"
            required
            inputMode="numeric"
            maxLength={10}
            value={adminForm.phoneNumber}
            onChange={(event) =>
              setAdminForm({
                ...adminForm,
                phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
            placeholder="10-digit mobile number"
          />
          <PasswordField
            label="Password"
            minLength={6}
            hint="Optional. Leave blank if they will set their own password on first sign-in."
            value={adminForm.password}
            onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })}
            placeholder="At least 6 characters"
          />
        </form>
      </Modal>

      <Modal
        open={salesOpen}
        onClose={() => setSalesOpen(false)}
        title="Assign sales user"
        description={client ? `Choose who brought in ${client.clientName}, or leave it as none.` : undefined}
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setSalesOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="overview-sales-person" loading={savingSales}>
              Save
            </Button>
          </>
        }
      >
        <form id="overview-sales-person" onSubmit={saveSalesPerson}>
          <SearchableSelect
            label="Sales user"
            value={salesUserId}
            onChange={setSalesUserId}
            allowClear
            placeholder="None"
            searchPlaceholder="Search sales users..."
            options={[
              ...(client?.salesUserId &&
              client.salesPersonName &&
              !salesPeople.some((person) => person.id === client.salesUserId)
                ? [{ value: client.salesUserId, label: client.salesPersonName }]
                : []),
              ...salesPeople.map((person) => ({
                value: person.id,
                label: person.fullName,
                sublabel: person.userCode ?? undefined,
              })),
            ]}
          />
        </form>
      </Modal>

      <ProofModal src={proofId} onClose={() => setProofId(null)} />
    </div>
  );
}
