"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  Check,
  Clock,
  Copy,
  FileText,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CommissionForm } from "@/app/paytrix/commissions/CommissionForm";
import {
  formatPercent,
  formatRange,
  type Commission,
} from "@/app/paytrix/commissions/format";
import {
  isOrgAdmin,
  type BillPayment,
  type Client,
  type ClientUser,
} from "@/lib/types";

type VendorTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT";
  category: "BILL_PAID" | "COMMISSION" | string;
  amount: number;
};

export function VendorOverviewTab({
  vendorId,
  vendor,
}: {
  vendorId: string;
  vendor?: Client | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const role = getUser()?.role;
  const isAdmin = isOrgAdmin(role);

  const [assigned, setAssigned] = useState<BillPayment[]>([]);
  const [transactions, setTransactions] = useState<VendorTransaction[]>([]);
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

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [commissionFormOpen, setCommissionFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [bills, txns] = await Promise.all([
          apiFetch<BillPayment[]>(`/api/v1/paytrix/clients/${vendorId}/assigned-bills`),
          apiFetch<VendorTransaction[]>(`/api/v1/paytrix/clients/${vendorId}/transactions`).catch(
            () => [] as VendorTransaction[],
          ),
        ]);
        if (!cancelled) {
          setAssigned(bills);
          setTransactions(txns);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof ApiError ? err.message : "Failed to load vendor analytics",
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
  }, [vendorId]);

  async function loadAdminUsers() {
    setUsersLoading(true);
    try {
      const rows = await apiFetch<ClientUser[]>(`/api/v1/paytrix/clients/${vendorId}/users`);
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
  }, [vendorId]);

  async function loadCommissions() {
    setCommissionsLoading(true);
    try {
      const rows = await apiFetch<Commission[]>(
        `/api/v1/paytrix/commissions?vendorId=${encodeURIComponent(vendorId)}`,
      );
      setCommissions(rows);
    } catch {
      setCommissions([]);
    } finally {
      setCommissionsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  async function handleCreateAdmin(event: React.FormEvent) {
    event.preventDefault();
    setCreatingAdmin(true);
    try {
      await apiFetch(`/api/v1/paytrix/clients/${vendorId}/users`, {
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
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create admin user");
    } finally {
      setCreatingAdmin(false);
    }
  }

  function stageOf(bill: BillPayment) {
    if (bill.reimbursedAt) return "REIMBURSED";
    return bill.vendorStage ?? "ASSIGNED";
  }

  const assignedCount = assigned.filter((bill) => stageOf(bill) === "ASSIGNED").length;
  const inProgressCount = assigned.filter((bill) => stageOf(bill) === "IN_PROGRESS").length;
  const paidLifetimeCount = assigned.filter((bill) => {
    const stage = stageOf(bill);
    return stage === "VENDOR_PAID" || stage === "VERIFIED" || stage === "REIMBURSED";
  }).length;
  const commissionReceivedLifetime = transactions
    .filter((t) => t.category === "COMMISSION")
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Bills currently Assigned"
              value={assignedCount}
              icon={FileText}
            />
            <StatCard
              label="Total Bills currently in Progress"
              value={inProgressCount}
              icon={Clock}
              tone="warning"
            />
            <StatCard
              label="Total Bills paid throughout lifetime"
              value={paidLifetimeCount}
              icon={PackageCheck}
              tone="success"
            />
            <StatCard
              label="Total Commission received throughout lifetime"
              value={`₹${commissionReceivedLifetime.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              icon={BadgePercent}
              tone="accent"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Admin users"
            description="Vendor administrators who manage this account."
            actions={
              isAdmin && vendor?.status === "ACTIVE" ? (
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
                    Create an admin user to manage this vendor&apos;s account.
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
            title="Assigned commissions"
            description="Commission rules configured for this vendor."
            actions={
              isAdmin && vendor?.status !== "TERMINATED" ? (
                <Button
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => setCommissionFormOpen(true)}
                >
                  Add
                </Button>
              ) : undefined
            }
          />
          {commissionsLoading ? (
            <div className="px-5 py-4">
              <Skeleton className="h-14 w-full" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <BadgePercent size={16} />
                </span>
                <div>
                  <p className="font-medium text-slate-700">No commission assigned</p>
                  <p className="text-xs text-slate-400">
                    Add a commission rule for this vendor to start assigning bills.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_auto] items-center border-b border-slate-100 bg-slate-50/40 px-5 py-2.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <span>Operator</span>
                <span>Commission</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {commissions.map((row) => (
                  <li
                    key={row.id}
                    onClick={() => router.push(`/paytrix/commissions/${row.id}`)}
                    className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {row.operatorName}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {row.categoryName}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {formatRange(row.minRange, row.maxRange)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-sm font-bold text-indigo-700">
                      {formatPercent(row.commission)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="Create admin user"
        description={
          vendor
            ? `Create a vendor admin for ${vendor.clientName}. They will sign in with this mobile number and password.`
            : "They will sign in with this mobile number and password."
        }
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setAdminModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="vendor-overview-create-admin" loading={creatingAdmin}>
              Create admin
            </Button>
          </>
        }
      >
        <form id="vendor-overview-create-admin" onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
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

      {commissionFormOpen && (
        <CommissionForm
          defaultVendorId={vendorId}
          onClose={(saved) => {
            setCommissionFormOpen(false);
            if (saved) loadCommissions();
          }}
        />
      )}
    </div>
  );
}
