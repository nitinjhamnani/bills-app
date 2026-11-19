"use client";

import { useEffect, useRef, useState } from "react";
import {
  Ban,
  Check,
  GitBranch,
  Plus,
  RotateCcw,
  Search,
  Settings,
  UserPlus,
  UserRound,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { isOrgAdmin, type ClientUser } from "@/lib/types";

interface BranchUserItem {
  id: string;
  fullName: string;
  userCode: string;
  phoneNumber: string;
}

interface BranchRow {
  id: string;
  name: string;
  code: string | null;
  address?: string | null;
  state?: string | null;
  location?: string | null;
  managedBillCount: number;
  userCount: number;
  status: "ACTIVE" | "SUSPENDED" | string;
  users?: BranchUserItem[];
}

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

const emptyForm = {
  name: "",
  code: "",
  address: "",
  state: "",
  location: "",
};

export function BranchesTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const isAdmin = isOrgAdmin(getUser()?.role);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchUsersPool, setBranchUsersPool] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [openMenuBranchId, setOpenMenuBranchId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const [assignUsersBranch, setAssignUsersBranch] = useState<BranchRow | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [savingUsers, setSavingUsers] = useState(false);

  useEffect(() => {
    if (!openMenuBranchId) return;
    function handleOutside(event: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuBranchId(null);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuBranchId(null);
    }
    function handleScroll() {
      setOpenMenuBranchId(null);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenuBranchId]);

  async function load() {
    setLoading(true);
    try {
      const [rows, allUsers] = await Promise.all([
        apiFetch<BranchRow[]>(`/api/v1/paytrix/clients/${clientId}/branches`),
        apiFetch<ClientUser[]>(`/api/v1/paytrix/clients/${clientId}/users`).catch(
          () => [] as ClientUser[],
        ),
      ]);
      setBranches(rows);
      setBranchUsersPool(allUsers.filter((u) => u.role !== "CLIENT_ADMIN"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Enter a branch name");
      return;
    }
    setCreating(true);
    try {
      await apiFetch<BranchRow>(`/api/v1/paytrix/clients/${clientId}/branches`, {
        method: "POST",
        body: {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          address: form.address.trim() || undefined,
          state: form.state.trim() || undefined,
          location: form.location.trim() || undefined,
        },
      });
      toast.success("Branch created");
      setForm(emptyForm);
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create branch");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(branch: BranchRow) {
    setOpenMenuBranchId(null);
    setBusyId(branch.id);
    try {
      const action = branch.status === "ACTIVE" ? "suspend" : "reactivate";
      const updated = await apiFetch<BranchRow>(
        `/api/v1/paytrix/clients/${clientId}/branches/${branch.id}/${action}`,
        { method: "PATCH" },
      );
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      toast.success(
        `${branch.name} ${branch.status === "ACTIVE" ? "inactivated" : "activated"}`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function openAssignUsersModal(branch: BranchRow) {
    setOpenMenuBranchId(null);
    setAssignUsersBranch(branch);
    setSelectedUserIds((branch.users ?? []).map((u) => u.id));
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function saveUsersAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!assignUsersBranch) return;
    setSavingUsers(true);
    try {
      const updated = await apiFetch<BranchRow>(
        `/api/v1/paytrix/clients/${clientId}/branches/${assignUsersBranch.id}/users`,
        {
          method: "PUT",
          body: { userIds: selectedUserIds },
        },
      );
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setAssignUsersBranch(null);
      toast.success("Branch users updated");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not update branch users",
      );
    } finally {
      setSavingUsers(false);
    }
  }

  const query = search.trim().toLowerCase();
  const searched = branches.filter((branch) => {
    if (!query) return true;
    const addressStr = [branch.address, branch.location, branch.state]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      branch.name.toLowerCase().includes(query) ||
      (branch.code ?? "").toLowerCase().includes(query) ||
      addressStr.includes(query) ||
      (branch.users ?? []).some((u) => u.fullName.toLowerCase().includes(query))
    );
  });
  const counts = {
    ALL: searched.length,
    ACTIVE: searched.filter((b) => b.status === "ACTIVE").length,
    SUSPENDED: searched.filter((b) => b.status === "SUSPENDED").length,
  };
  const visible =
    statusFilter === "ALL"
      ? searched
      : searched.filter((b) => b.status === statusFilter);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {STATUS_FILTERS.map((item) => {
            const active = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatusFilter(item.key)}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
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
        {isAdmin && (
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setForm(emptyForm);
              setModalOpen(true);
            }}
          >
            Add branch
          </Button>
        )}
      </div>

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by branch name, code, or user"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title={branches.length === 0 ? "No branches yet" : "No branches match"}
            description={
              branches.length === 0
                ? "Create a branch for this corporate to organize bills and branch users."
                : "Try another status or clear the search."
            }
            action={
              isAdmin && branches.length === 0 ? (
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => {
                    setForm(emptyForm);
                    setModalOpen(true);
                  }}
                >
                  Add branch
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead
              columns={[
                "Branch",
                "Code",
                "Address",
                "Users",
                "Managed bills",
                "Status",
                ...(isAdmin ? [""] : []),
              ]}
            />
            <TBody>
              {visible.map((branch) => (
                <TR key={branch.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <GitBranch size={16} />
                      </span>
                      <p className="truncate font-semibold text-slate-900">{branch.name}</p>
                    </div>
                  </TD>
                  <TD className="font-mono text-xs font-semibold text-slate-800">
                    {branch.code ?? "—"}
                  </TD>
                  <TD className="text-xs text-slate-600">
                    {[branch.address, branch.location, branch.state].filter(Boolean).join(", ") || "—"}
                  </TD>
                  <TD className="text-xs text-slate-700">
                    {(branch.users ?? []).length === 0 ? (
                      <span className="text-slate-400">Unassigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(branch.users ?? []).map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            <UserRound size={11} className="text-slate-400" />
                            {u.fullName}
                          </span>
                        ))}
                      </div>
                    )}
                  </TD>
                  <TD className="font-semibold text-slate-800">{branch.managedBillCount}</TD>
                  <TD>
                    <StatusBadge status={branch.status} />
                  </TD>
                  {isAdmin && (
                    <TD className="text-right">
                      <div
                        ref={openMenuBranchId === branch.id ? menuContainerRef : undefined}
                        className="inline-block text-left"
                      >
                        <button
                          type="button"
                          aria-label={`Actions for ${branch.name}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuBranchId === branch.id}
                          disabled={busyId === branch.id}
                          onClick={(event) => {
                            if (openMenuBranchId === branch.id) {
                              setOpenMenuBranchId(null);
                              return;
                            }
                            const rect = event.currentTarget.getBoundingClientRect();
                            setMenuPos({
                              top: rect.bottom + 6,
                              right: window.innerWidth - rect.right,
                            });
                            setOpenMenuBranchId(branch.id);
                          }}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                        >
                          <Settings size={15} />
                        </button>

                        {openMenuBranchId === branch.id && menuPos && (
                          <div
                            role="menu"
                            style={{ top: menuPos.top, right: menuPos.right }}
                            className="fixed z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openAssignUsersModal(branch)}
                              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <UserPlus size={14} className="text-slate-400" />
                              Assign user
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => toggleStatus(branch)}
                              className={cn(
                                "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold",
                                branch.status === "ACTIVE"
                                  ? "text-rose-600 hover:bg-rose-50"
                                  : "text-emerald-700 hover:bg-emerald-50",
                              )}
                            >
                              {branch.status === "ACTIVE" ? (
                                <>
                                  <Ban size={14} className="text-rose-500" />
                                  Inactivate branch
                                </>
                              ) : (
                                <>
                                  <RotateCcw size={14} className="text-emerald-600" />
                                  Activate branch
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={modalOpen}
        onClose={() => !creating && setModalOpen(false)}
        title="Add branch"
        description="Create a branch under this corporate for bills and branch users."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" form="create-corporate-branch-form" loading={creating}>
              Create branch
            </Button>
          </>
        }
      >
        <form id="create-corporate-branch-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Field
            label="Branch name"
            required
            placeholder="Andheri"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label="Branch code"
            placeholder="AND"
            hint="Optional. Must be unique for this corporate."
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Field
            label="Branch address"
            placeholder="Link Road, Andheri West"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="State"
              placeholder="Maharashtra"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <Field
              label="Location"
              placeholder="Andheri West"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={assignUsersBranch !== null}
        onClose={() => !savingUsers && setAssignUsersBranch(null)}
        title="Assign branch user"
        description={
          assignUsersBranch
            ? `Select the branch user(s) to assign to ${assignUsersBranch.name}. Corporate admins already have access to all branches.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setAssignUsersBranch(null)}
              disabled={savingUsers}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="assign-branch-users-form"
              loading={savingUsers}
              disabled={branchUsersPool.length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <form id="assign-branch-users-form" onSubmit={saveUsersAssignment} className="flex flex-col gap-3">
          {branchUsersPool.length === 0 ? (
            <p className="text-sm text-slate-500">
              No branch users have been created for this corporate yet. Create a Branch User under the Users tab first.
            </p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {branchUsersPool.map((user) => {
                const selected = selectedUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUserSelection(user.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                      selected
                        ? "border-indigo-400 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/20"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                          selected ? "bg-indigo-600" : "bg-blue-600",
                        )}
                      >
                        {userInitials(user.fullName)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{user.fullName}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {user.userCode} · {user.phoneNumber}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border",
                        selected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300 bg-white",
                      )}
                    >
                      {selected && <Check size={12} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
