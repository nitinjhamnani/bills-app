"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  GitBranch,
  Hash,
  KeyRound,
  LayoutDashboard,
  Mail,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Settings,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { Card, CardHeader, ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { StatCard } from "@/components/ui/StatCard";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { Skeleton, StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { CreateBillModal } from "../../managed-bills/CreateBillModal";
import type { ClientUser, ManagedBill } from "@/lib/types";

interface BranchUser {
  id: string;
  userCode?: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role?: string;
  status?: "ACTIVE" | "SUSPENDED" | string;
  passwordSet: boolean;
}

interface BranchDetail {
  id: string;
  name: string;
  address: string | null;
  state: string | null;
  location: string | null;
  code: string | null;
  managedBillCount?: number;
  userCount?: number;
  status?: "ACTIVE" | "SUSPENDED" | string;
  users: BranchUser[];
}

const BRANCH_TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "bills", label: "Bills", icon: FileText },
  { key: "users", label: "Users", icon: Users },
] as const;

type TabKey = (typeof BRANCH_TABS)[number]["key"];
const TAB_KEYS: readonly string[] = BRANCH_TABS.map((t) => t.key);

const BILL_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DUE", label: "Due" },
  { key: "PAID", label: "Paid" },
  { key: "PROCESSING", label: "Processing" },
  { key: "FAILED", label: "Failed" },
] as const;

type BillFilter = (typeof BILL_FILTERS)[number]["key"];

const USER_STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
] as const;

type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]["key"];

const emptyEdit = { name: "", address: "", state: "", location: "", code: "" };

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function billBucket(bill: ManagedBill): Exclude<BillFilter, "ALL"> | "OTHER" {
  if (bill.lastFetchFailed || bill.billStatus === "FAILED") return "FAILED";
  if (bill.billStatus === "DUE") return "DUE";
  if (bill.billStatus === "PAID") return "PAID";
  if (bill.billStatus === "PROCESSING") return "PROCESSING";
  return "OTHER";
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm text-slate-900",
          mono ? "font-mono font-medium" : "font-medium",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export default function BranchDetailPage() {
  const params = useParams<{ id: string }>();
  const branchId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const currentUser = getUser();
  const clientId = currentUser?.clientId ?? "";
  const isAdmin = currentUser?.role === "CORP_ADMIN";

  const requestedTab = searchParams.get("tab");
  const initialTab = TAB_KEYS.includes(requestedTab ?? "")
    ? (requestedTab as TabKey)
    : "overview";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [bills, setBills] = useState<ManagedBill[]>([]);
  const [branchUsersPool, setBranchUsersPool] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyEdit);

  const [creatingBill, setCreatingBill] = useState(false);
  const [billSearch, setBillSearch] = useState("");
  const [billFilter, setBillFilter] = useState<BillFilter>("ALL");

  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>("ALL");
  const [assignUsersOpen, setAssignUsersOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [savingUsers, setSavingUsers] = useState(false);

  const [addNewUserOpen, setAddNewUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [userMenuPos, setUserMenuPos] = useState<{ top: number; right: number } | null>(null);
  const userMenuContainerRef = useRef<HTMLDivElement>(null);

  const [passwordTarget, setPasswordTarget] = useState<BranchUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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

  useEffect(() => {
    if (!openMenuUserId) return;
    function handleOutside(event: MouseEvent) {
      if (userMenuContainerRef.current && !userMenuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuUserId(null);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuUserId(null);
    }
    function handleScroll() {
      setOpenMenuUserId(null);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.addEventListener("scroll", handleScroll, true);
    };
  }, [openMenuUserId]);

  async function load(silent = false) {
    if (!clientId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const [nextBranch, nextBills, allUsers] = await Promise.all([
        apiFetch<BranchDetail>(`/api/v1/clients/${clientId}/branches/${branchId}`),
        apiFetch<ManagedBill[]>(`/api/v1/clients/${clientId}/managed-bills`),
        apiFetch<ClientUser[]>(`/api/v1/clients/${clientId}/users`).catch(
          () => [] as ClientUser[],
        ),
      ]);
      setBranch(nextBranch);
      setBills(nextBills.filter((bill) => bill.branchId === branchId));
      setBranchUsersPool(allUsers.filter((u) => u.role !== "CORP_ADMIN"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load branch");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, clientId]);

  function openEditModal() {
    if (!branch) return;
    setMenuOpen(false);
    setEditForm({
      name: branch.name,
      address: branch.address ?? "",
      state: branch.state ?? "",
      location: branch.location ?? "",
      code: branch.code ?? "",
    });
    setEditing(true);
  }

  async function saveBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error("Enter a branch name");
      return;
    }
    setBusy(true);
    try {
      const updated = await apiFetch<BranchDetail>(
        `/api/v1/clients/${clientId}/branches/${branchId}`,
        {
          method: "PATCH",
          body: {
            name: editForm.name.trim(),
            address: editForm.address.trim(),
            state: editForm.state.trim(),
            location: editForm.location.trim(),
            code: editForm.code.trim(),
          },
        },
      );
      setBranch(updated);
      toast.success("Branch details updated");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the branch");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBranchStatus() {
    if (!branch) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      const currentStatus = branch.status ?? "ACTIVE";
      const action = currentStatus === "ACTIVE" ? "suspend" : "reactivate";
      const updated = await apiFetch<BranchDetail>(
        `/api/v1/clients/${clientId}/branches/${branchId}/${action}`,
        { method: "PATCH" },
      );
      setBranch(updated);
      toast.success(
        `${branch.name} ${currentStatus === "ACTIVE" ? "inactivated" : "activated"}`,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function openAssignUsersModal() {
    if (!branch) return;
    setMenuOpen(false);
    setSelectedUserIds((branch.users ?? []).map((u) => u.id));
    setAssignUsersOpen(true);
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function saveUsersAssignment(event: React.FormEvent) {
    event.preventDefault();
    setSavingUsers(true);
    try {
      const updated = await apiFetch<BranchDetail>(
        `/api/v1/clients/${clientId}/branches/${branchId}/users`,
        {
          method: "PUT",
          body: { userIds: selectedUserIds },
        },
      );
      setBranch(updated);
      setAssignUsersOpen(false);
      toast.success("Branch users updated");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not update branch users",
      );
    } finally {
      setSavingUsers(false);
    }
  }

  async function handleCreateNewUser(event: React.FormEvent) {
    event.preventDefault();
    setCreatingUser(true);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/users`, {
        method: "POST",
        body: {
          fullName: newUserForm.fullName.trim(),
          phoneNumber: newUserForm.phoneNumber,
          role: "BRANCH_USER",
          ...(newUserForm.email.trim() ? { email: newUserForm.email.trim() } : {}),
          branchId,
          password: newUserForm.password,
        },
      });
      toast.success(`${newUserForm.fullName.trim()} added to ${branch?.name ?? "branch"}`);
      setNewUserForm({ fullName: "", phoneNumber: "", email: "", password: "" });
      setAddNewUserOpen(false);
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create user");
    } finally {
      setCreatingUser(false);
    }
  }

  async function removeUserFromBranch(user: BranchUser) {
    setOpenMenuUserId(null);
    setBusy(true);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/branches/${branchId}/users/${user.id}`, {
        method: "DELETE",
      });
      toast.success(`${user.fullName} unassigned from ${branch?.name ?? "this branch"}`);
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove user");
    } finally {
      setBusy(false);
    }
  }

  async function toggleUserStatus(user: BranchUser) {
    setOpenMenuUserId(null);
    setBusy(true);
    try {
      const currentStatus = user.status ?? "ACTIVE";
      const action = currentStatus === "ACTIVE" ? "suspend" : "reactivate";
      await apiFetch(`/api/v1/clients/${clientId}/users/${user.id}/${action}`, {
        method: "PATCH",
      });
      toast.success(
        `${user.fullName} ${currentStatus === "ACTIVE" ? "inactivated" : "activated"}`,
      );
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveUserPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!passwordTarget) return;
    setSavingPassword(true);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/users/${passwordTarget.id}/password`, {
        method: "PATCH",
        body: { password: newPassword },
      });
      toast.success(`Password updated for ${passwordTarget.fullName}`);
      setPasswordTarget(null);
      setNewPassword("");
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to set password");
    } finally {
      setSavingPassword(false);
    }
  }

  // Bill filtering & analytics for this branch
  const dueBills = useMemo(() => bills.filter((b) => billBucket(b) === "DUE"), [bills]);
  const paidBills = useMemo(() => bills.filter((b) => billBucket(b) === "PAID"), [bills]);
  const dueAmount = useMemo(
    () => dueBills.reduce((sum, b) => sum + (b.amount ?? 0), 0),
    [dueBills],
  );

  const searchedBills = useMemo(() => {
    const query = billSearch.trim().toLowerCase();
    if (!query) return bills;
    return bills.filter(
      (bill) =>
        bill.billerName.toLowerCase().includes(query) ||
        bill.billServiceName.toLowerCase().includes(query) ||
        bill.customerBillAccountNumber.toLowerCase().includes(query) ||
        (bill.customerName ?? "").toLowerCase().includes(query) ||
        bill.id.toLowerCase().includes(query),
    );
  }, [bills, billSearch]);

  const billCounts: Record<BillFilter, number> = {
    ALL: searchedBills.length,
    DUE: searchedBills.filter((b) => billBucket(b) === "DUE").length,
    PAID: searchedBills.filter((b) => billBucket(b) === "PAID").length,
    PROCESSING: searchedBills.filter((b) => billBucket(b) === "PROCESSING").length,
    FAILED: searchedBills.filter((b) => billBucket(b) === "FAILED").length,
  };

  const visibleBills =
    billFilter === "ALL"
      ? searchedBills
      : searchedBills.filter((b) => billBucket(b) === billFilter);

  // User filtering for this branch
  const branchUsers = branch?.users ?? [];
  const searchedUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return branchUsers;
    return branchUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(query) ||
        u.phoneNumber.includes(query) ||
        (u.userCode ?? u.id).toLowerCase().includes(query) ||
        (u.email ?? "").toLowerCase().includes(query),
    );
  }, [branchUsers, userSearch]);

  const userCounts: Record<UserStatusFilter, number> = {
    ALL: searchedUsers.length,
    ACTIVE: searchedUsers.filter((u) => (u.status ?? "ACTIVE") === "ACTIVE").length,
    SUSPENDED: searchedUsers.filter((u) => u.status === "SUSPENDED").length,
  };

  const visibleUsers =
    userStatusFilter === "ALL"
      ? searchedUsers
      : searchedUsers.filter((u) => (u.status ?? "ACTIVE") === userStatusFilter);

  const fullAddress = branch
    ? [branch.address, branch.location, branch.state].filter(Boolean).join(", ")
    : "";

  if (!loading && !branch) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href="/client/branches"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Branches
          </Link>
        </div>
        <EmptyState
          icon={GitBranch}
          title="Branch not found"
          description="This branch does not exist on your corporate account."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top Hero Header Card — matching Paytrix Client Details Page */}
      <div className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href="/client/branches"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Branches
          </Link>

          {isAdmin && branch && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Branch actions"
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
                    onClick={openEditModal}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} className="text-slate-400" />
                    Edit branch details
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openAssignUsersModal}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <UserPlus size={14} className="text-slate-400" />
                    Assign branch users
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={toggleBranchStatus}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold disabled:opacity-50",
                      (branch.status ?? "ACTIVE") === "ACTIVE"
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-emerald-700 hover:bg-emerald-50",
                    )}
                  >
                    {(branch.status ?? "ACTIVE") === "ACTIVE" ? (
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
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-2xs">
              {branch ? userInitials(branch.name) : "…"}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                  {loading ? "Loading…" : (branch?.name ?? "Branch")}
                </h1>
                {branch && (
                  <button
                    type="button"
                    onClick={async () => {
                      const code = branch.code || branch.id;
                      try {
                        await navigator.clipboard.writeText(code);
                        setCopiedId(true);
                        toast.success(`Copied ${code}`);
                        setTimeout(() => setCopiedId(false), 1500);
                      } catch {
                        toast.error("Could not copy code");
                      }
                    }}
                    title="Copy branch code"
                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
                  >
                    <Hash size={12} className="text-slate-400 group-hover:text-blue-500" />
                    <span>{branch.code || branch.id}</span>
                    {copiedId ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-blue-600" />
                    )}
                  </button>
                )}
              </div>
              {branch && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/70">
                    <GitBranch size={12} className="text-indigo-500" />
                    Branch
                  </span>
                  <StatusBadge status={branch.status ?? "ACTIVE"} />
                </div>
              )}
            </div>
          </div>

          {branch && (
            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13.5} className="text-slate-400" />
                  <span>{fullAddress || "No address specified"}</span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 self-end font-mono text-xs font-medium text-slate-400 sm:self-auto">
                <span>ID: {branch.id}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Bar — matching Paytrix Client Details Page */}
      {!loading && branch && (
        <div className="mb-4 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {BRANCH_TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            const count =
              t.key === "bills"
                ? bills.length
                : t.key === "users"
                  ? branchUsers.length
                  : null;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
                {t.label}
                {count !== null && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <div className="flex flex-col gap-4 overflow-y-auto pb-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {loading || !branch ? (
                Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
              ) : (
                <>
                  <StatCard label="Managed Bills" value={bills.length} icon={FileText} />
                  <StatCard
                    label="Due Now"
                    value={`${dueBills.length} · ${inr(dueAmount)}`}
                    icon={Clock}
                  />
                  <StatCard label="Paid Bills" value={paidBills.length} icon={PackageCheck} />
                  <StatCard label="Assigned Users" value={branchUsers.length} icon={Users} />
                </>
              )}
            </div>

            {loading || !branch ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Skeleton className="h-52 w-full rounded-2xl" />
                <Skeleton className="h-52 w-full rounded-2xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {/* Left Card: Branch Details */}
                <Card>
                  <CardHeader
                    title="Branch details"
                    description="Location, code, and configuration for this branch."
                    actions={
                      isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Pencil size={14} />}
                          onClick={openEditModal}
                        >
                          Edit
                        </Button>
                      ) : undefined
                    }
                  />
                  <div className="px-5 py-4">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DetailField label="Branch name" value={branch.name} />
                      <DetailField label="Branch code" value={branch.code || "—"} mono />
                      <DetailField label="Branch ID" value={branch.id} mono />
                      <DetailField
                        label="Status"
                        value={<StatusBadge status={branch.status ?? "ACTIVE"} />}
                      />
                      <DetailField label="City / Location" value={branch.location || "—"} />
                      <DetailField label="State" value={branch.state || "—"} />
                      <div className="sm:col-span-2">
                        <DetailField label="Address" value={branch.address || "—"} />
                      </div>
                    </dl>
                  </div>
                </Card>

                {/* Right Card: Assigned Branch Users */}
                <Card>
                  <CardHeader
                    title="Assigned branch users"
                    description="Branch users authorised to register and monitor bills for this branch."
                    actions={
                      isAdmin ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<UserPlus size={14} />}
                            onClick={openAssignUsersModal}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            icon={<Plus size={14} />}
                            onClick={() => setAddNewUserOpen(true)}
                          >
                            Add user
                          </Button>
                        </div>
                      ) : undefined
                    }
                  />
                  {branchUsers.length === 0 ? (
                    <div className="px-5 py-6">
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Users size={16} />
                        </span>
                        <div>
                          <p className="font-medium text-slate-700">No branch users assigned</p>
                          <p className="text-xs text-slate-400">
                            Assign an existing branch user or create a new user for this branch.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {branchUsers.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center justify-between gap-3 px-5 py-3.5"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                              {userInitials(u.fullName)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {u.fullName}
                                </p>
                                <span className="font-mono text-[11px] font-semibold text-slate-400">
                                  {u.userCode ?? u.id}
                                </span>
                              </div>
                              <button
                                type="button"
                                title="Copy phone number"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(u.phoneNumber);
                                    setCopiedKey(`overview-phone:${u.id}`);
                                    toast.success(`Copied ${u.phoneNumber}`);
                                    setTimeout(() => setCopiedKey(null), 1500);
                                  } catch {
                                    toast.error("Could not copy phone number");
                                  }
                                }}
                                className="group -ml-1 mt-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Phone size={11} className="text-slate-400 group-hover:text-indigo-500" />
                                <span>{u.phoneNumber}</span>
                                {copiedKey === `overview-phone:${u.id}` ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                                )}
                              </button>
                            </div>
                          </div>
                          <StatusBadge status={u.status ?? "ACTIVE"} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BILLS */}
        {tab === "bills" && (
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                {BILL_FILTERS.map((item) => {
                  const active = billFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBillFilter(item.key)}
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
                        {billCounts[item.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button icon={<Plus size={16} />} onClick={() => setCreatingBill(true)}>
                Create bill
              </Button>
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
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    placeholder="Search by biller, consumer no., or category"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              {loading ? (
                <TableSkeleton cols={7} />
              ) : visibleBills.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={bills.length === 0 ? "No bills on this branch yet" : "No bills match"}
                  description={
                    bills.length === 0
                      ? "Register a bill for this branch to fetch and track its billing cycles."
                      : "Try another status filter or clear the search."
                  }
                  action={
                    bills.length === 0 ? (
                      <Button icon={<Plus size={16} />} onClick={() => setCreatingBill(true)}>
                        Create bill
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Table>
                  <THead
                    columns={[
                      "Bill ID",
                      "Biller",
                      "Category",
                      "Consumer no.",
                      "Amount",
                      "Due",
                      "Status",
                      "",
                    ]}
                  />
                  <TBody>
                    {visibleBills.map((bill) => (
                      <TR
                        key={bill.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/client/managed-bills/${bill.id}`)}
                      >
                        <TD className="font-mono text-xs font-semibold text-slate-700">{bill.id}</TD>
                        <TD>
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                              {userInitials(bill.billerName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{bill.billerName}</p>
                              {bill.customerName && (
                                <p className="truncate text-[11px] text-slate-400">
                                  {bill.customerName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TD>
                        <TD className="text-xs text-slate-600">{bill.billServiceName}</TD>
                        <TD onClick={(e) => e.stopPropagation()}>
                          <CopyableChip text={bill.customerBillAccountNumber} label="consumer number" />
                        </TD>
                        <TD className="font-mono text-sm font-semibold text-slate-900">
                          {bill.amount != null ? inr(bill.amount) : "—"}
                        </TD>
                        <TD className="text-xs text-slate-600">{formatDate(bill.dueDate)}</TD>
                        <TD>
                          <StatusBadge status={bill.billStatus} />
                        </TD>
                        <TD>
                          <ChevronRight size={16} className="ml-auto text-slate-300" />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </ListCard>
          </div>
        )}

        {/* TAB 3: USERS */}
        {tab === "users" && (
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                {USER_STATUS_FILTERS.map((item) => {
                  const active = userStatusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setUserStatusFilter(item.key)}
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
                        {userCounts[item.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    icon={<UserPlus size={16} />}
                    onClick={openAssignUsersModal}
                  >
                    Assign existing
                  </Button>
                  <Button icon={<Plus size={16} />} onClick={() => setAddNewUserOpen(true)}>
                    Add user
                  </Button>
                </div>
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
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, phone, or user code"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              {loading ? (
                <TableSkeleton cols={4} />
              ) : visibleUsers.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title={branchUsers.length === 0 ? "No users on this branch yet" : "No users match"}
                  description={
                    branchUsers.length === 0
                      ? "Assign an existing branch user or add a new branch user for this branch."
                      : "Try another status filter or clear the search."
                  }
                  action={
                    isAdmin && branchUsers.length === 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          icon={<UserPlus size={16} />}
                          onClick={openAssignUsersModal}
                        >
                          Assign existing
                        </Button>
                        <Button icon={<Plus size={16} />} onClick={() => setAddNewUserOpen(true)}>
                          Add user
                        </Button>
                      </div>
                    ) : undefined
                  }
                />
              ) : (
                <Table>
                  <THead
                    columns={[
                      "User",
                      "Contact",
                      "Status",
                      ...(isAdmin ? [""] : []),
                    ]}
                  />
                  <TBody>
                    {visibleUsers.map((u) => {
                      const code = u.userCode ?? u.id;
                      return (
                        <TR key={u.id}>
                          <TD>
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                {userInitials(u.fullName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{u.fullName}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                    Branch User
                                  </span>
                                  <button
                                    type="button"
                                    title="Copy user code"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await navigator.clipboard.writeText(code);
                                        setCopiedKey(`code:${u.id}`);
                                        toast.success(`Copied ${code}`);
                                        setTimeout(() => setCopiedKey(null), 1500);
                                      } catch {
                                        toast.error("Could not copy code");
                                      }
                                    }}
                                    className="group inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                                  >
                                    <span>{code}</span>
                                    {copiedKey === `code:${u.id}` ? (
                                      <Check size={11} className="text-emerald-600" />
                                    ) : (
                                      <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <div className="flex flex-col items-start gap-1">
                              <button
                                type="button"
                                title="Copy phone number"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(u.phoneNumber);
                                    setCopiedKey(`phone:${u.id}`);
                                    toast.success(`Copied ${u.phoneNumber}`);
                                    setTimeout(() => setCopiedKey(null), 1500);
                                  } catch {
                                    toast.error("Could not copy phone number");
                                  }
                                }}
                                className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Phone size={12} className="shrink-0 text-slate-400 group-hover:text-indigo-500" />
                                <span>{u.phoneNumber}</span>
                                {copiedKey === `phone:${u.id}` ? (
                                  <Check size={11} className="shrink-0 text-emerald-600" />
                                ) : (
                                  <Copy size={11} className="shrink-0 text-slate-400 transition-colors group-hover:text-indigo-600" />
                                )}
                              </button>
                              {u.email ? (
                                <button
                                  type="button"
                                  title="Copy email"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(u.email!);
                                      setCopiedKey(`email:${u.id}`);
                                      toast.success(`Copied ${u.email}`);
                                      setTimeout(() => setCopiedKey(null), 1500);
                                    } catch {
                                      toast.error("Could not copy email");
                                    }
                                  }}
                                  className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <Mail size={12} className="shrink-0 text-slate-400 group-hover:text-indigo-500" />
                                  <span className="truncate">{u.email}</span>
                                  {copiedKey === `email:${u.id}` ? (
                                    <Check size={11} className="shrink-0 text-emerald-600" />
                                  ) : (
                                    <Copy size={11} className="shrink-0 text-slate-400 transition-colors group-hover:text-indigo-600" />
                                  )}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                  <Mail size={12} className="shrink-0 text-slate-300" />
                                  <span>—</span>
                                </span>
                              )}
                            </div>
                          </TD>
                          <TD>
                            <StatusBadge status={u.status ?? "ACTIVE"} />
                          </TD>
                          {isAdmin && (
                            <TD className="text-right">
                              <div
                                ref={openMenuUserId === u.id ? userMenuContainerRef : undefined}
                                className="inline-block text-left"
                              >
                                <button
                                  type="button"
                                  aria-label={`Actions for ${u.fullName}`}
                                  aria-haspopup="menu"
                                  aria-expanded={openMenuUserId === u.id}
                                  disabled={busy}
                                  onClick={(event) => {
                                    if (openMenuUserId === u.id) {
                                      setOpenMenuUserId(null);
                                      return;
                                    }
                                    const rect = event.currentTarget.getBoundingClientRect();
                                    setUserMenuPos({
                                      top: rect.bottom + 6,
                                      right: window.innerWidth - rect.right,
                                    });
                                    setOpenMenuUserId(u.id);
                                  }}
                                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                                >
                                  <Settings size={15} />
                                </button>

                                {openMenuUserId === u.id && userMenuPos && (
                                  <div
                                    role="menu"
                                    style={{ top: userMenuPos.top, right: userMenuPos.right }}
                                    className="fixed z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenMenuUserId(null);
                                        setNewPassword("");
                                        setPasswordTarget(u);
                                      }}
                                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      <KeyRound size={14} className="text-slate-400" />
                                      Set password
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => removeUserFromBranch(u)}
                                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      <UserMinus size={14} className="text-slate-400" />
                                      Unassign from branch
                                    </button>
                                    <div className="my-1 h-px bg-slate-100" />
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => toggleUserStatus(u)}
                                      className={cn(
                                        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold",
                                        (u.status ?? "ACTIVE") === "ACTIVE"
                                          ? "text-rose-600 hover:bg-rose-50"
                                          : "text-emerald-700 hover:bg-emerald-50",
                                      )}
                                    >
                                      {(u.status ?? "ACTIVE") === "ACTIVE" ? (
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
                            </TD>
                          )}
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </ListCard>
          </div>
        )}
      </div>

      {/* Create Bill Modal */}
      <CreateBillModal
        open={creatingBill}
        clientId={clientId}
        fixedBranchId={branchId}
        onClose={() => setCreatingBill(false)}
        onCreated={() => {
          setCreatingBill(false);
          void load(true);
        }}
      />

      {/* Edit Branch Modal */}
      <Modal
        open={editing}
        onClose={() => !busy && setEditing(false)}
        title="Edit branch details"
        description="Update the name, code, address, state, or location for this branch."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button form="edit-branch-detail-form" type="submit" loading={busy}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-branch-detail-form" onSubmit={saveBranch} className="flex flex-col gap-4">
          <Field
            label="Branch name"
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Field
            label="Branch code"
            hint="Optional. Must be unique for this corporate."
            value={editForm.code}
            onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
          />
          <Field
            label="Branch address"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="State"
              value={editForm.state}
              onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
            />
            <Field
              label="Location"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Assign Existing Branch Users Modal */}
      <Modal
        open={assignUsersOpen}
        onClose={() => !savingUsers && setAssignUsersOpen(false)}
        title="Assign branch users"
        description={`Select the branch user(s) to assign to ${branch?.name ?? "this branch"}. Corporate admins already have access to all branches.`}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setAssignUsersOpen(false)}
              disabled={savingUsers}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="assign-branch-detail-users-form"
              loading={savingUsers}
              disabled={branchUsersPool.length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <form id="assign-branch-detail-users-form" onSubmit={saveUsersAssignment} className="flex flex-col gap-3">
          {branchUsersPool.length === 0 ? (
            <p className="text-sm text-slate-500">
              No branch users exist on this corporate yet. Click &ldquo;Add user&rdquo; to create a new branch user.
            </p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {branchUsersPool.map((poolUser) => {
                const selected = selectedUserIds.includes(poolUser.id);
                return (
                  <button
                    key={poolUser.id}
                    type="button"
                    onClick={() => toggleUserSelection(poolUser.id)}
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
                        {userInitials(poolUser.fullName)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{poolUser.fullName}</p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {poolUser.userCode} · {poolUser.phoneNumber}
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

      {/* Add New Branch User Modal */}
      <Modal
        open={addNewUserOpen}
        onClose={() => !creatingUser && setAddNewUserOpen(false)}
        title={`Add user to ${branch?.name ?? "branch"}`}
        description="Creates a new Branch User on your corporate account and assigns them to this branch."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddNewUserOpen(false)} disabled={creatingUser}>
              Cancel
            </Button>
            <Button form="create-branch-detail-user-form" type="submit" loading={creatingUser}>
              Add user
            </Button>
          </>
        }
      >
        <form id="create-branch-detail-user-form" onSubmit={handleCreateNewUser} className="flex flex-col gap-4">
          <Field
            label="Full name"
            required
            placeholder="Ravi Kumar"
            value={newUserForm.fullName}
            onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
          />
          <Field
            label="Mobile number"
            required
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={newUserForm.phoneNumber}
            onChange={(e) =>
              setNewUserForm({
                ...newUserForm,
                phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
              })
            }
          />
          <Field
            label="Email"
            type="email"
            hint="Optional."
            placeholder="name@company.com"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
          />
          <PasswordField
            label="Password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            value={newUserForm.password}
            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
          />
        </form>
      </Modal>

      {/* Set Branch User Password Modal */}
      <Modal
        open={passwordTarget !== null}
        onClose={() => !savingPassword && setPasswordTarget(null)}
        title="Set password"
        description={
          passwordTarget
            ? `Set a new sign-in password for ${passwordTarget.fullName} (${passwordTarget.phoneNumber}).`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setPasswordTarget(null)}
              disabled={savingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="set-branch-user-password-form"
              loading={savingPassword}
              disabled={newPassword.length < 6}
            >
              Save password
            </Button>
          </>
        }
      >
        <form id="set-branch-user-password-form" onSubmit={handleSaveUserPassword} className="flex flex-col gap-4">
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
    </div>
  );
}
