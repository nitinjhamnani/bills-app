"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  GitBranch,
  Hash,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Store,
  UserCheck,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RolePicker } from "@/components/RolePicker";
import { userInitials } from "@/components/UserMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ORGANISATION_ROLES, roleDescription } from "@/lib/roles";
import type { AssignedCorporate, Client, UserBranch } from "@/lib/types";

type UserScope = "PLATFORM" | "CORPORATE" | "VENDOR";

interface UserDetail {
  id: string;
  phoneNumber: string;
  userCode: string;
  fullName: string;
  email: string | null;
  scope: UserScope;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientCode?: string | null;
  branches?: UserBranch[];
  corporates?: AssignedCorporate[];
}

interface BranchOption {
  id: string;
  name: string;
  code?: string | null;
}

function formatDateTime(iso: string | null | undefined) {
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

function displayRole(user: UserDetail | null) {
  if (!user) return "—";
  if (user.scope === "PLATFORM") {
    return ORGANISATION_ROLES.find((item) => item.value === user.role)?.label ?? user.role;
  }
  if (user.scope === "CORPORATE") {
    return user.role === "CLIENT_ADMIN" ? "Corporate Admin" : "Branch User";
  }
  return user.role === "CLIENT_ADMIN" ? "Vendor Admin" : "Vendor Operator";
}

function scopeLabel(scope: UserScope | undefined) {
  if (scope === "CORPORATE") return "Corporate";
  if (scope === "VENDOR") return "Vendor";
  return "Platform";
}

export default function OrganisationUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const toast = useToast();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedField, setCopiedField] = useState<"phone" | "email" | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    role: "MAKER",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [assignCorporateOpen, setAssignCorporateOpen] = useState(false);
  const [availableCorporates, setAvailableCorporates] = useState<Client[]>([]);
  const [corporatesLoading, setCorporatesLoading] = useState(false);
  const [selectedCorporateIds, setSelectedCorporateIds] = useState<string[]>([]);
  const [savingCorporates, setSavingCorporates] = useState(false);

  const [assignBranchOpen, setAssignBranchOpen] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [savingBranches, setSavingBranches] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<UserDetail>(`/api/v1/paytrix/users/${userId}`);
      setUser(data);
      setProfileForm({
        fullName: data.fullName,
        email: data.email ?? "",
        role: data.role,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function toggleStatus() {
    if (!user) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      const action = user.status === "ACTIVE" ? "suspend" : "reactivate";
      await apiFetch(`/api/v1/paytrix/users/${userId}/${action}`, {
        method: "PATCH",
      });
      toast.success(
        `${user.fullName} ${user.status === "ACTIVE" ? "inactivated" : "activated"}`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await apiFetch<UserDetail>(`/api/v1/paytrix/users/${userId}`, {
        method: "PUT",
        body: {
          fullName: profileForm.fullName.trim(),
          email: profileForm.email.trim() || undefined,
          role: profileForm.role,
        },
      });
      setUser(updated);
      toast.success("User details updated");
      setProfileOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await apiFetch(`/api/v1/paytrix/users/${userId}/password`, {
        method: "PATCH",
        body: { password: newPassword },
      });
      toast.success("Password updated");
      setNewPassword("");
      setPasswordOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to set password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function openAssignCorporateModal() {
    if (!user) return;
    setSelectedCorporateIds((user.corporates ?? []).map((corporate) => corporate.id));
    setAssignCorporateOpen(true);
    setCorporatesLoading(true);
    try {
      const rows = await apiFetch<Client[]>("/api/v1/paytrix/clients");
      setAvailableCorporates(rows.filter((row) => row.clientType === "CORPORATE"));
    } catch (err) {
      setAvailableCorporates([]);
      toast.error(err instanceof ApiError ? err.message : "Failed to load corporates");
    } finally {
      setCorporatesLoading(false);
    }
  }

  function toggleCorporateSelection(clientId: string) {
    setSelectedCorporateIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId],
    );
  }

  async function saveCorporateAssignment(event: React.FormEvent) {
    event.preventDefault();
    setSavingCorporates(true);
    try {
      const updated = await apiFetch<UserDetail>(`/api/v1/paytrix/users/${userId}/corporates`, {
        method: "PUT",
        body: { clientIds: selectedCorporateIds },
      });
      setUser(updated);
      toast.success("Corporate assignment updated");
      setAssignCorporateOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update corporate assignment");
    } finally {
      setSavingCorporates(false);
    }
  }

  async function openAssignBranchModal() {
    setMenuOpen(false);
    if (!user?.clientId) return;
    setSelectedBranchIds((user.branches ?? []).map((b) => b.id));
    setAssignBranchOpen(true);
    setBranchesLoading(true);
    try {
      const rows = await apiFetch<BranchOption[]>(
        `/api/v1/paytrix/clients/${user.clientId}/branches`,
      );
      setAvailableBranches(rows);
    } catch {
      setAvailableBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }

  function toggleBranchSelection(branchId: string) {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  }

  async function saveBranchAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.clientId) return;
    setSavingBranches(true);
    try {
      await apiFetch(
        `/api/v1/paytrix/clients/${user.clientId}/users/${user.id}/branches`,
        {
          method: "PUT",
          body: { branchIds: selectedBranchIds },
        },
      );
      toast.success("Branch assignment updated");
      setAssignBranchOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update branch assignment");
    } finally {
      setSavingBranches(false);
    }
  }

  const roleName = displayRole(user);
  const ScopeIcon =
    user?.scope === "CORPORATE"
      ? Building2
      : user?.scope === "VENDOR"
        ? Store
        : ShieldCheck;

  const clientRoleCards =
    user?.scope === "VENDOR"
      ? [
          {
            value: "CLIENT_ADMIN",
            title: "Vendor Admin",
            subtitle: "Manages assigned bills, settlements, and users",
            icon: ShieldCheck,
          },
          {
            value: "CLIENT_OPERATOR",
            title: "Vendor Operator",
            subtitle: "Works on assigned bills and marks them paid",
            icon: UserCheck,
          },
        ]
      : [
          {
            value: "CLIENT_ADMIN",
            title: "Corporate Admin",
            subtitle: "Full access to bills, branches, wallet, and users",
            icon: ShieldCheck,
          },
          {
            value: "BRANCH_USER",
            title: "Branch User",
            subtitle: "Creates and views bills for assigned branches",
            icon: GitBranch,
          },
        ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href="/paytrix/users"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Users
          </Link>

          {user && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="User actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings size={16} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setProfileOpen(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} className="text-slate-400" />
                    Edit user details
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setPasswordOpen(true);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <KeyRound size={14} className="text-slate-400" />
                    Set password
                  </button>
                  {user.scope === "CORPORATE" && user.role !== "CLIENT_ADMIN" && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={openAssignBranchModal}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <GitBranch size={14} className="text-slate-400" />
                      Assign branch
                    </button>
                  )}
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={toggleStatus}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold disabled:opacity-50",
                      user.status === "ACTIVE"
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-emerald-700 hover:bg-emerald-50",
                    )}
                  >
                    {user.status === "ACTIVE" ? (
                      <>
                        <Ban size={14} className="text-rose-500" />
                        Inactivate user
                      </>
                    ) : (
                      <>
                        <RotateCcw size={14} className="text-emerald-600" />
                        Activate user
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-2xs">
              {user ? userInitials(user.fullName) : "…"}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                  {loading ? "Loading…" : (user?.fullName ?? "User")}
                </h1>
                {user && (
                  <button
                    type="button"
                    onClick={async () => {
                      const code = user.userCode ?? user.id;
                      try {
                        await navigator.clipboard.writeText(code);
                        setCopiedId(true);
                        toast.success(`Copied ${code}`);
                        setTimeout(() => setCopiedId(false), 1500);
                      } catch {
                        toast.error("Could not copy ID");
                      }
                    }}
                    title="Copy user ID"
                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
                  >
                    <Hash size={12} className="text-slate-400 group-hover:text-blue-500" />
                    <span>{user.userCode ?? user.id}</span>
                    {copiedId ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-blue-600" />
                    )}
                  </button>
                )}
              </div>
              {user && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/70">
                    <ScopeIcon size={12} className="text-indigo-500" />
                    {roleName}
                  </span>
                  <StatusBadge status={user.status} />
                </div>
              )}
            </div>
          </div>

          {user && (
            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
                <button
                  type="button"
                  title="Copy phone"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(user.phoneNumber);
                      setCopiedField("phone");
                      toast.success(`Copied ${user.phoneNumber}`);
                      setTimeout(() => setCopiedField(null), 1500);
                    } catch {
                      toast.error("Could not copy phone");
                    }
                  }}
                  className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 font-mono transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <Phone size={13.5} className="text-slate-400 group-hover:text-indigo-500" />
                  <span>{user.phoneNumber}</span>
                  {copiedField === "phone" ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                  )}
                </button>

                {user.email && (
                  <button
                    type="button"
                    title="Copy email"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(user.email!);
                        setCopiedField("email");
                        toast.success(`Copied ${user.email}`);
                        setTimeout(() => setCopiedField(null), 1500);
                      } catch {
                        toast.error("Could not copy email");
                      }
                    }}
                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Mail size={13.5} className="text-slate-400 group-hover:text-indigo-500" />
                    <span>{user.email}</span>
                    {copiedField === "email" ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                    )}
                  </button>
                )}

                {user.clientId && (
                  <Link
                    href={
                      user.scope === "VENDOR"
                        ? `/paytrix/vendors/${user.clientId}`
                        : `/paytrix/clients/${user.clientId}`
                    }
                    className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-semibold text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <ScopeIcon size={13.5} className="text-indigo-500" />
                    <span>{user.clientName ?? user.clientId}</span>
                  </Link>
                )}
              </div>

              {user.createdAt && (
                <div className="flex shrink-0 items-center gap-1.5 self-end text-xs font-medium text-slate-400 sm:self-auto">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{formatDateTime(user.createdAt)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-44 w-full rounded-2xl" />
      ) : user ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Profile & access"
              description="User details, login credentials, and assigned access level."
              actions={
                <Button
                  size="sm"
                  icon={<Pencil size={14} />}
                  onClick={() => setProfileOpen(true)}
                >
                  Edit
                </Button>
              }
            />
            <div className="px-5 py-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Detail label="Full name" value={user.fullName} />
                <Detail label="User code" value={user.userCode} mono />
                <Detail label="Phone" value={user.phoneNumber} mono />
                <Detail label="Email" value={user.email || "Not set"} />
                <Detail label="Scope" value={scopeLabel(user.scope)} />
                <Detail label="Role" value={roleName} />
              </dl>
              {roleDescription(user.role) && (
                <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  {roleDescription(user.role)}
                </p>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {user.scope === "CORPORATE" && (
              <>
                <Card>
                  <CardHeader
                    title="Corporate account"
                    description="The corporate organisation this user belongs to."
                  />
                  <div className="px-5 py-4">
                    {user.clientId ? (
                      <Link
                        href={`/paytrix/clients/${user.clientId}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                            {userInitials(user.clientName ?? "C")}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                              {user.clientName}
                            </p>
                            <p className="font-mono text-xs text-slate-500">
                              {user.clientCode ?? user.clientId}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
                      </Link>
                    ) : (
                      <p className="text-sm text-slate-500">No corporate linked.</p>
                    )}
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    title="Assigned branches"
                    description={
                      user.role === "CLIENT_ADMIN"
                        ? "Corporate admins have full access to all branches."
                        : "Branches this user is authorized to manage bills for."
                    }
                    actions={
                      user.role !== "CLIENT_ADMIN" ? (
                        <Button
                          size="sm"
                          icon={<Plus size={14} />}
                          onClick={openAssignBranchModal}
                        >
                          Assign
                        </Button>
                      ) : undefined
                    }
                  />
                  <div className="px-5 py-4">
                    {user.role === "CLIENT_ADMIN" ? (
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                          <ShieldCheck size={16} />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">All branches</p>
                          <p className="text-xs text-slate-500">
                            Corporate Admin automatically has access to every branch.
                          </p>
                        </div>
                      </div>
                    ) : (user.branches ?? []).length === 0 ? (
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <GitBranch size={16} />
                        </span>
                        <div>
                          <p className="font-medium text-slate-700">No branch assigned</p>
                          <p className="text-xs text-slate-400">
                            Assign a branch so this user can create and view branch bills.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {(user.branches ?? []).map((b) => (
                          <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <GitBranch size={15} />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                                {b.code && (
                                  <p className="font-mono text-[11px] text-slate-500">{b.code}</p>
                                )}
                              </div>
                            </div>
                            <StatusBadge status="ACTIVE" label="Assigned" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              </>
            )}

            {user.scope === "VENDOR" && (
              <Card>
                <CardHeader
                  title="Vendor account"
                  description="The vendor organisation this user belongs to."
                />
                <div className="px-5 py-4">
                  {user.clientId ? (
                    <Link
                      href={`/paytrix/vendors/${user.clientId}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                          {userInitials(user.clientName ?? "V")}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                            {user.clientName}
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            {user.clientCode ?? user.clientId}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
                    </Link>
                  ) : (
                    <p className="text-sm text-slate-500">No vendor linked.</p>
                  )}
                </div>
              </Card>
            )}

            {user.scope === "PLATFORM" && user.role === "SALES" && (
              <Card>
                <CardHeader
                  title="Assigned corporates"
                  description="Companies this sales person looks after."
                  actions={
                    <Button size="sm" icon={<Plus size={14} />} onClick={openAssignCorporateModal}>
                      Assign
                    </Button>
                  }
                />
                <div className="px-5 py-4">
                  {(user.corporates ?? []).length === 0 ? (
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Building2 size={16} />
                      </span>
                      <div>
                        <p className="font-medium text-slate-700">No corporates assigned</p>
                        <p className="text-xs text-slate-400">
                          Assign the companies this sales person looks after.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {user.corporates?.map((corporate) => (
                        <li key={corporate.id}>
                          <Link
                            href={`/paytrix/clients/${corporate.id}`}
                            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-indigo-700"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-900">
                                {corporate.clientName}
                              </span>
                              {corporate.clientCode && (
                                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">
                                  {corporate.clientCode}
                                </span>
                              )}
                            </span>
                            <StatusBadge status={corporate.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : null}

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Edit user details"
        description="Phone number is the login identifier and stays as it is."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setProfileOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-profile-form" loading={savingProfile}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="user-profile-form" onSubmit={saveProfile} className="flex flex-col gap-5">
          {user?.scope !== "PLATFORM" && (
            <div>
              <p className="text-sm font-medium text-slate-700">User type</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {clientRoleCards.map(({ value, title: cardTitle, subtitle, icon: Icon }) => {
                  const selected = profileForm.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, role: value })}
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
          )}

          <Field
            label="Full name"
            required
            value={profileForm.fullName}
            onChange={(e) =>
              setProfileForm({ ...profileForm, fullName: e.target.value })
            }
          />
          <Field
            label="Email (optional)"
            type="email"
            value={profileForm.email}
            onChange={(e) =>
              setProfileForm({ ...profileForm, email: e.target.value })
            }
            placeholder="name@organisation.com"
          />
          {user?.scope === "PLATFORM" && (
            <div>
              <p className="text-sm font-medium text-slate-700">Access</p>
              <div className="mt-1.5">
                <RolePicker
                  roles={ORGANISATION_ROLES}
                  value={profileForm.role}
                  onChange={(role) => setProfileForm({ ...profileForm, role })}
                />
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Set password"
        description="They sign in with this phone or email and the new password."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-password-form" loading={savingPassword}>
              Set password
            </Button>
          </>
        }
      >
        <form id="user-password-form" onSubmit={savePassword} className="flex flex-col gap-4">
          <PasswordField
            label="New password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </form>
      </Modal>

      <Modal
        open={assignCorporateOpen}
        onClose={() => !savingCorporates && setAssignCorporateOpen(false)}
        title="Assign corporates"
        description={
          user ? `Select the companies ${user.fullName} looks after. A company can have one sales person.` : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setAssignCorporateOpen(false)}
              disabled={savingCorporates}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-detail-assign-corporates-form"
              loading={savingCorporates}
              disabled={corporatesLoading || availableCorporates.length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="user-detail-assign-corporates-form"
          onSubmit={saveCorporateAssignment}
          className="flex flex-col gap-3"
        >
          {corporatesLoading ? (
            <p className="text-sm text-slate-500">Loading corporates...</p>
          ) : availableCorporates.length === 0 ? (
            <p className="text-sm text-slate-500">No corporates have been created yet.</p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {availableCorporates.map((corporate) => {
                const selected = selectedCorporateIds.includes(corporate.id);
                const heldBySomeoneElse =
                  corporate.salesUserId && corporate.salesUserId !== userId
                    ? corporate.salesPersonName
                    : null;
                return (
                  <button
                    key={corporate.id}
                    type="button"
                    onClick={() => toggleCorporateSelection(corporate.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                      selected
                        ? "border-indigo-400 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/20"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <Building2 size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{corporate.clientName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{corporate.clientCode ?? corporate.id}</p>
                        {heldBySomeoneElse && (
                          <p className="text-[11px] text-amber-700">Currently with {heldBySomeoneElse}</p>
                        )}
                      </div>
                    </div>
                    {selected && <Check size={16} className="shrink-0 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={assignBranchOpen}
        onClose={() => !savingBranches && setAssignBranchOpen(false)}
        title="Assign branch"
        description={
          user
            ? `Select the branch(es) ${user.fullName} can access under ${user.clientName}.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setAssignBranchOpen(false)}
              disabled={savingBranches}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-detail-assign-branches-form"
              loading={savingBranches}
              disabled={branchesLoading || availableBranches.length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="user-detail-assign-branches-form"
          onSubmit={saveBranchAssignment}
          className="flex flex-col gap-3"
        >
          {branchesLoading ? (
            <p className="text-sm text-slate-500">Loading branches...</p>
          ) : availableBranches.length === 0 ? (
            <p className="text-sm text-slate-500">
              No branches have been created for this corporate yet.
            </p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {availableBranches.map((branch) => {
                const selected = selectedBranchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => toggleBranchSelection(branch.id)}
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
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <GitBranch size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{branch.name}</p>
                        {branch.code && (
                          <p className="font-mono text-[11px] text-slate-500">{branch.code}</p>
                        )}
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

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className={mono ? "mt-1 font-mono text-sm font-medium text-slate-900" : "mt-1 text-sm font-medium text-slate-900"}>
        {value}
      </p>
    </div>
  );
}
