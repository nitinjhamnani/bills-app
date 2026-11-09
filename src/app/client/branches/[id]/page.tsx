"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, FileText, GitBranch, Plus, UserPlus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { UserMultiSelect, roleLabel, type PoolUser } from "../UserMultiSelect";
import { Modal } from "@/components/ui/Modal";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { CreateBillModal } from "../../managed-bills/CreateBillModal";
import type { ManagedBill } from "@/lib/types";

interface BranchUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role?: string;
  passwordSet: boolean;
}


interface Branch {
  id: string;
  name: string;
  address: string | null;
  code: string | null;
  comment: string | null;
  users: BranchUser[];
}

const emptyEdit = { name: "", address: "", code: "" };

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function BranchDetailPage() {
  const params = useParams<{ id: string }>();
  const branchId = params.id;
  const router = useRouter();
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const [branch, setBranch] = useState<Branch | null>(null);
  const [bills, setBills] = useState<ManagedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);
  const [pool, setPool] = useState<PoolUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [creatingBill, setCreatingBill] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [nextBranch, nextBills] = await Promise.all([
      apiFetch<Branch>(`/api/v1/clients/${clientId}/branches/${branchId}`),
      apiFetch<ManagedBill[]>(`/api/v1/clients/${clientId}/managed-bills`),
    ]);
    setBranch(nextBranch);
    setBills(nextBills.filter((bill) => bill.branchId === branchId));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "Failed to load this branch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, clientId]);

  async function openAddUser() {
    setPhone("");
    setUserName("");
    setSelectedIds([]);
    setPool([]);
    setPoolLoading(true);
    setAddingUser(true);
    try {
      setPool(await apiFetch<PoolUser[]>(`/api/v1/clients/${clientId}/branch-user-pool?branchId=${branchId}`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load users");
    } finally {
      setPoolLoading(false);
    }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    const addingNew = userName.trim().length > 0 || phone.length > 0;
    if (selectedIds.length === 0 && !addingNew) {
      toast.error("Choose users or enter a name and phone");
      return;
    }
    if (addingNew && (!userName.trim() || phone.length !== 10)) {
      toast.error("Enter the user's name and a 10-digit phone");
      return;
    }
    setBusy(true);
    try {
      if (selectedIds.length > 0) {
        await apiFetch(`/api/v1/clients/${clientId}/branches/${branchId}/users/assign`, {
          method: "POST",
          body: { userIds: selectedIds },
        });
      }
      if (addingNew) {
        await apiFetch(`/api/v1/clients/${clientId}/branches/${branchId}/users`, {
          method: "POST",
          body: { phoneNumber: phone, userName },
        });
      }
      toast.success(addingNew ? "User added. They sign in with Password@123." : "Users added to this branch");
      setPhone("");
      setUserName("");
      setSelectedIds([]);
      setAddingUser(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add the user");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(user: BranchUser) {
    try {
      await apiFetch(`/api/v1/clients/${clientId}/branches/${branchId}/users/${user.id}`, {
        method: "DELETE",
      });
      toast.success("Removed from this branch");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove the user");
    }
  }

  async function saveBranch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/branches/${branchId}`, {
        method: "PATCH",
        body: { ...editForm, comment: branch?.comment ?? "" },
      });
      toast.success("Branch updated");
      setEditing(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the branch");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="shrink-0">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => router.push("/client/branches")}>
          Branches
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !branch ? (
        <EmptyState icon={GitBranch} title="Branch not found" description="This branch is not on the corporate." />
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {userInitials(branch.name)}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">{branch.name}</h1>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {branch.code ?? "No code"} · {branch.address ?? "No address"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditForm({
                    name: branch.name,
                    address: branch.address ?? "",
                    code: branch.code ?? "",
                  });
                  setEditing(true);
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="outline" icon={<UserPlus size={14} />} onClick={() => void openAddUser()}>
                Add user
              </Button>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreatingBill(true)}>
                Add bill
              </Button>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
            <h2 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Branch</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              <InfoField label="Code" value={branch.code ?? "—"} />
              <InfoField label="Address" value={branch.address ?? "—"} />
              <InfoField label="Users" value={branch.users.length} />
              <InfoField label="Managed bills" value={bills.length} />
            </dl>
          </div>

          <Card className="shrink-0 overflow-hidden">
            <CardHeader
              title="Managed bills"
              description={`${bills.length} ${bills.length === 1 ? "bill" : "bills"} on this branch`}
            />
            {bills.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/15">
                  <FileText size={22} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">No managed bills</p>
                  <p className="mt-1 text-xs text-slate-500">Bills registered for this branch show up here.</p>
                </div>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => setCreatingBill(true)}>
                  Add bill
                </Button>
              </div>
            ) : (
              <Table>
                <THead columns={["Biller", "Customer", "Amount", "Status", "Due", ""]} />
                <TBody>
                  {bills.map((bill) => (
                    <TR
                      key={bill.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/client/managed-bills/${bill.id}`)}
                    >
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                            {userInitials(bill.billerName)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{bill.billerName}</p>
                            <p className="text-[11px] text-slate-400">{bill.billServiceName}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <p className="font-medium text-slate-800">{bill.customerName ?? "—"}</p>
                        <p className="font-mono text-[11px] text-slate-400">{bill.customerBillAccountNumber}</p>
                      </TD>
                      <TD className="font-mono text-sm font-semibold text-slate-900">
                        {bill.amount != null ? inr(bill.amount) : "—"}
                      </TD>
                      <TD>
                        <StatusBadge status={bill.billStatus} />
                      </TD>
                      <TD className="text-slate-700">{formatDate(bill.dueDate)}</TD>
                      <TD>
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <Card className="shrink-0 overflow-hidden">
            <CardHeader
              title="Users"
              description={
                branch.users.length === 1
                  ? "1 person can open this branch"
                  : `${branch.users.length} people can open this branch`
              }
            />
            {branch.users.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/15">
                  <UserPlus size={22} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">No users yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add a new user, or assign someone who already belongs to this corporate.
                  </p>
                </div>
                <Button size="sm" icon={<UserPlus size={14} />} onClick={() => void openAddUser()}>
                  Add user
                </Button>
              </div>
            ) : (
              <Table>
                <THead columns={["User", "Phone", "Sign in", ""]} />
                <TBody>
                  {branch.users.map((user) => (
                    <TR key={user.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                            {userInitials(user.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{user.fullName}</p>
                            {user.role && <p className="text-[11px] text-slate-400">{roleLabel(user.role)}</p>}
                          </div>
                        </div>
                      </TD>
                      <TD className="font-mono text-xs text-slate-600">{user.phoneNumber}</TD>
                      <TD>
                        <StatusBadge
                          status={user.passwordSet ? "ACTIVE" : "PENDING"}
                          label={user.passwordSet ? "Can sign in" : "Password not set"}
                        />
                      </TD>
                      <TD>
                        <Button size="sm" variant="outline" onClick={() => void removeUser(user)}>
                          Remove
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </>
      )}

      <CreateBillModal
        open={creatingBill}
        clientId={clientId}
        fixedBranchId={branchId}
        onClose={() => setCreatingBill(false)}
        onCreated={() => {
          setCreatingBill(false);
          void load();
        }}
      />

      <Modal
        open={addingUser}
        onClose={() => !busy && setAddingUser(false)}
        title={branch ? `Add a user to ${branch.name}` : "Add a user"}
        description="Choose people from this corporate, or enter a name and phone for someone new."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddingUser(false)} disabled={busy}>
              Cancel
            </Button>
            <Button form="add-branch-user" type="submit" loading={busy}>
              Add user
            </Button>
          </>
        }
      >
        <form id="add-branch-user" onSubmit={addUser} className="flex flex-col gap-4">
          <UserMultiSelect users={pool} selected={selectedIds} onChange={setSelectedIds} loading={poolLoading} />
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">New user</p>
              <p className="mt-1 text-xs text-slate-500">
                Optional. Leave both blank if you only chose existing users. A new user signs in with Password@123.
              </p>
            </div>
            <Field
              label="User name"
              placeholder="Ravi Shah"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <Field
              label="User phone"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={editing}
        onClose={() => !busy && setEditing(false)}
        title="Edit branch"
        description="Update the name, address, or code. The code must stay unique for this company."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button form="edit-branch" type="submit" loading={busy}>
              Save
            </Button>
          </>
        }
      >
        <form id="edit-branch" onSubmit={saveBranch} className="flex flex-col gap-4">
          <Field label="Branch name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Field label="Branch address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          <Field
            label="Branch code"
            hint="Optional. Must be unique for this company."
            value={editForm.code}
            onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
