"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
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
  Settings,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getSession, getUser, updateSessionUser } from "@/lib/auth";
import { StatusBadge, formatStatusLabel } from "@/components/StatusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { userInitials } from "@/components/UserMenu";
import { cn } from "@/lib/cn";
import { ORGANISATION_ROLES, roleDescription } from "@/lib/roles";
import {
  homeForUser,
  type ClientAccount,
  type SessionResponse,
  type UserBranch,
  type UserProfile,
} from "@/lib/types";

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

function displayRole(user: UserProfile | null) {
  if (!user) return "—";
  if (user.portal === "PLATFORM") {
    if (user.role === "SUPER_ADMIN") return "Super Admin";
    return ORGANISATION_ROLES.find((item) => item.value === user.role)?.label ?? formatStatusLabel(user.role);
  }
  if (user.portal === "CORPORATE") {
    if (user.role === "CORP_ADMIN") return "Corporate Admin";
    if (user.role === "CORP_OPERATOR") return "Corporate Operator";
    return "Branch User";
  }
  return user.role === "VENDOR_ADMIN" ? "Vendor Admin" : "Vendor Operator";
}

function fullRoleDescription(user: UserProfile | null): string {
  if (!user) return "";
  if (user.portal === "PLATFORM") {
    if (user.role === "SUPER_ADMIN") {
      return "Super Admin with full platform governance, user administration, and permanent corporate lifecycle controls.";
    }
    return roleDescription(user.role) ?? "Authorised Paytrix platform member.";
  }
  if (user.portal === "CORPORATE") {
    if (user.role === "CORP_ADMIN") {
      return "Full access to manage bills, pay dues from the corporate wallet, configure branches and users, and update corporate details.";
    }
    if (user.role === "CORP_OPERATOR") {
      return "Access to view and pay bills across corporate branches and raise support tickets.";
    }
    return "Authorised to register and monitor bills for your assigned corporate branches.";
  }
  if (user.role === "VENDOR_ADMIN") {
    return "Full access to settle assigned bills, view vendor commissions and reports, and manage vendor users.";
  }
  return "Access to process assigned bills and upload payment references.";
}

function portalLabel(portal: UserProfile["portal"] | undefined) {
  if (portal === "CORPORATE") return "Corporate";
  if (portal === "VENDOR") return "Vendor";
  return "Platform";
}

function Detail({
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

export function MyProfileView() {
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [branches, setBranches] = useState<UserBranch[]>([]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedField, setCopiedField] = useState<"phone" | "email" | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    const cached = getUser();
    if (cached) {
      setUser(cached);
    }

    async function load() {
      setLoading(true);
      try {
        const sessionResp = await apiFetch<SessionResponse>("/api/v1/auth/session");
        const freshUser = sessionResp.user;
        setUser(freshUser);
        const stored = getSession();
        if (stored) {
          updateSessionUser(stored.sessionId, freshUser);
        }

        if (freshUser.portal === "CORPORATE" || freshUser.portal === "VENDOR") {
          const acc = await apiFetch<ClientAccount>("/api/v1/client/account").catch(() => null);
          setAccount(acc);
        }
        if (freshUser.portal === "CORPORATE" && freshUser.clientId) {
          const branchPath =
            freshUser.role === "BRANCH_USER"
              ? `/api/v1/clients/${freshUser.clientId}/branches/mine`
              : `/api/v1/clients/${freshUser.clientId}/branches`;
          const branchRows = await apiFetch<UserBranch[]>(branchPath).catch(() => []);
          setBranches(branchRows);
        }
      } catch {
        // Fallback to cached user if session call fails transiently
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (!user) return null;

  const name = user.displayName || user.phoneNumber;
  const code = user.userCode || user.userId;
  const roleName = displayRole(user);
  const ScopeIcon =
    user.portal === "CORPORATE"
      ? Building2
      : user.portal === "VENDOR"
        ? Store
        : ShieldCheck;

  function openEditModal() {
    if (!user) return;
    setFullName(user.displayName || "");
    setEmail(user.email ?? "");
    setMenuOpen(false);
    setEditOpen(true);
  }

  function openPasswordModal() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMenuOpen(false);
    setPasswordOpen(true);
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await apiFetch<UserProfile>("/api/v1/auth/profile", {
        method: "PUT",
        body: {
          fullName: fullName.trim(),
          email: email.trim() || null,
        },
      });
      setUser(updated);
      const stored = getSession();
      if (stored) {
        updateSessionUser(stored.sessionId, updated);
      }
      setEditOpen(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      toast.error("New password must be 6 to 72 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/v1/auth/password/change", {
        method: "POST",
        body: {
          currentPassword,
          newPassword,
        },
      });
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-6">
      {/* Top Hero Header Card — aligned with Users & Corporate detail pages */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href={homeForUser(user)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Profile actions"
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
                  Edit profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openPasswordModal}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <KeyRound size={14} className="text-slate-400" />
                  Change password
                </button>
                {user.portal === "CORPORATE" && (
                  <>
                    <div className="my-1 h-px bg-slate-100" />
                    <Link
                      role="menuitem"
                      href="/client/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Building2 size={14} className="text-slate-400" />
                      Corporate settings
                    </Link>
                  </>
                )}
                {user.portal === "VENDOR" && (
                  <>
                    <div className="my-1 h-px bg-slate-100" />
                    <Link
                      role="menuitem"
                      href="/vendor/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Store size={14} className="text-slate-400" />
                      Vendor settings
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-2xs">
              {userInitials(name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                  {name}
                </h1>
                {code && (
                  <button
                    type="button"
                    onClick={async () => {
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
                    <span>{code}</span>
                    {copiedId ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-blue-600" />
                    )}
                  </button>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/70">
                  <ScopeIcon size={12} className="text-indigo-500" />
                  {roleName}
                </span>
                <StatusBadge status={user.status ?? "ACTIVE"} />
              </div>
            </div>
          </div>

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
                className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono transition-colors hover:bg-slate-100 hover:text-slate-900"
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

              {account && (
                <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-semibold text-slate-700">
                  <ScopeIcon size={13.5} className="text-indigo-500" />
                  <span>{account.clientName}</span>
                </span>
              )}
            </div>

            {user.createdAt && (
              <div className="flex shrink-0 items-center gap-1.5 self-end text-xs font-medium text-slate-400 sm:self-auto">
                <Calendar size={13} className="text-slate-400" />
                <span>Joined {formatDateTime(user.createdAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      {loading && !account && user.portal !== "PLATFORM" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {/* Left Column: Profile & Access */}
          <Card>
            <CardHeader
              title="Profile & access"
              description="Your personal details, login credentials, and assigned access level."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<KeyRound size={14} />}
                    onClick={openPasswordModal}
                  >
                    Password
                  </Button>
                  <Button size="sm" icon={<Pencil size={14} />} onClick={openEditModal}>
                    Edit
                  </Button>
                </div>
              }
            />
            <div className="px-5 py-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Detail label="Full name" value={name} />
                <Detail label="User code" value={code || "—"} mono />
                <Detail label="Phone" value={user.phoneNumber} mono />
                <Detail label="Email" value={user.email || "Not set"} />
                <Detail label="Scope" value={portalLabel(user.portal)} />
                <Detail label="Role" value={roleName} />
              </dl>
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                {fullRoleDescription(user)}
              </p>
            </div>
          </Card>

          {/* Right Column: Corporate / Vendor / Platform context */}
          <div className="flex flex-col gap-4">
            {user.portal === "CORPORATE" && (
              <>
                <Card>
                  <CardHeader
                    title="Corporate account"
                    description="The corporate organisation your account belongs to."
                    actions={
                      <Link
                        href="/client/settings"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Settings size={13.5} className="text-slate-400" />
                        {user.role === "CORP_ADMIN" ? "Edit in Settings" : "Settings"}
                      </Link>
                    }
                  />
                  <div className="px-5 py-4">
                    {account ? (
                      <div className="flex flex-col gap-4">
                        <Link
                          href="/client/settings"
                          className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                              {userInitials(account.clientName || "C")}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                                {account.clientName}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-slate-500">
                                  {account.clientCode ?? account.clientId}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {account.corporateKind === "INDIVIDUAL" ? (
                                    <UserRound size={10} />
                                  ) : (
                                    <Building2 size={10} />
                                  )}
                                  {account.corporateKind === "INDIVIDUAL" ? "Individual" : "Company"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <StatusBadge status={account.status} />
                            <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
                          </div>
                        </Link>

                        <dl className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                          <Detail
                            label="Contact / Signing authority"
                            value={account.signingAuthority || "—"}
                          />
                          <Detail
                            label={
                              account.corporateKind === "INDIVIDUAL"
                                ? "PAN / Identification"
                                : "Registration no."
                            }
                            value={account.registrationNumber || "—"}
                            mono
                          />
                          <Detail label="Corporate email" value={account.contactEmail || "—"} />
                          <Detail label="Corporate phone" value={account.contactPhone || "—"} mono />
                        </dl>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Corporate account details unavailable.</p>
                    )}
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    title="Assigned branches"
                    description={
                      user.role === "CORP_ADMIN" || user.role === "CORP_OPERATOR"
                        ? "You have access to manage bills across all corporate branches."
                        : "Branches you are authorised to manage bills for."
                    }
                    actions={
                      user.role === "CORP_ADMIN" ? (
                        <Link
                          href="/client/branches"
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          <GitBranch size={13.5} className="text-slate-400" />
                          Manage
                        </Link>
                      ) : undefined
                    }
                  />
                  <div className="px-5 py-4">
                    {user.role === "CORP_ADMIN" || user.role === "CORP_OPERATOR" ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                            <ShieldCheck size={16} />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">All branches</p>
                            <p className="text-xs text-slate-500">
                              {branches.length > 0
                                ? `${branches.length} active ${branches.length === 1 ? "branch" : "branches"} on this corporate.`
                                : "Automatic access to every branch on this corporate."}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status="ACTIVE" label="Full access" />
                      </div>
                    ) : branches.length === 0 ? (
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <GitBranch size={16} />
                        </span>
                        <div>
                          <p className="font-medium text-slate-700">No branch assigned</p>
                          <p className="text-xs text-slate-400">
                            Ask your Corporate Admin to assign you to a branch.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {branches.map((b) => (
                          <li
                            key={b.id}
                            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                          >
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

            {user.portal === "VENDOR" && (
              <Card>
                <CardHeader
                  title="Vendor account"
                  description="The vendor organisation your account belongs to."
                  actions={
                    <Link
                      href="/vendor/settings"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Settings size={13.5} className="text-slate-400" />
                      {user.role === "VENDOR_ADMIN" ? "Edit in Settings" : "Settings"}
                    </Link>
                  }
                />
                <div className="px-5 py-4">
                  {account ? (
                    <div className="flex flex-col gap-4">
                      <Link
                        href="/vendor/settings"
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                            {userInitials(account.clientName || "V")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                              {account.clientName}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-slate-500">
                                {account.clientCode ?? account.clientId}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {account.corporateKind === "INDIVIDUAL" ? (
                                  <UserRound size={10} />
                                ) : (
                                  <Store size={10} />
                                )}
                                {account.corporateKind === "INDIVIDUAL" ? "Individual" : "Company"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={account.status} />
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
                        </div>
                      </Link>
                      <dl className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                        <Detail label="Contact / Signing authority" value={account.signingAuthority || "—"} />
                        <Detail
                          label={
                            account.corporateKind === "INDIVIDUAL"
                              ? "PAN / Identification"
                              : "Registration no."
                          }
                          value={account.registrationNumber || "—"}
                          mono
                        />
                        <Detail label="Vendor email" value={account.contactEmail || "—"} />
                        <Detail label="Vendor phone" value={account.contactPhone || "—"} mono />
                      </dl>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Vendor account details unavailable.</p>
                  )}
                </div>
              </Card>
            )}

            {user.portal === "PLATFORM" && (
              <Card>
                <CardHeader
                  title="Platform organisation"
                  description="You are signed in to the Paytrix internal operations portal."
                />
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                        Px
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Paytrix Enterprise</p>
                        <p className="font-mono text-xs text-slate-500">PAYTRIX</p>
                      </div>
                    </div>
                    <StatusBadge status="ACTIVE" />
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal
        open={editOpen}
        onClose={() => !savingProfile && setEditOpen(false)}
        title="Edit profile"
        description="Update your display name and email address."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingProfile}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-my-profile-form"
              loading={savingProfile}
              disabled={!fullName.trim()}
            >
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-my-profile-form" onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <Field
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Your full name"
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Field
            label="Phone"
            value={user.phoneNumber}
            disabled
            hint="Phone number is your primary login identifier and is managed by an administrator."
          />
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={passwordOpen}
        onClose={() => !savingPassword && setPasswordOpen(false)}
        title="Change password"
        description="Verify your current password to set a new sign-in password."
        footer={
          <>
            <Button variant="outline" onClick={() => setPasswordOpen(false)} disabled={savingPassword}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="change-my-password-form"
              loading={savingPassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Update password
            </Button>
          </>
        }
      >
        <form id="change-my-password-form" onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            autoComplete="current-password"
            required
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="6 to 72 characters"
            autoComplete="new-password"
            required
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            required
          />
        </form>
      </Modal>
    </div>
  );
}
