"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronRight,
  Copy,
  GitBranch,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Store,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField, SearchableSelect } from "@/components/ui/Field";
import { StatusBadge } from "@/components/StatusBadge";
import { RolePicker } from "@/components/RolePicker";
import { userInitials } from "@/components/UserMenu";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ORGANISATION_ROLES } from "@/lib/roles";
import type { Client, UserBranch } from "@/lib/types";

type UserScope = "PLATFORM" | "CORPORATE" | "VENDOR";

interface DirectoryUser {
  id: string;
  userCode: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  scope: UserScope;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  clientId: string | null;
  clientName: string | null;
  clientCode: string | null;
  branches?: UserBranch[];
}

interface BranchOption {
  id: string;
  name: string;
  code?: string | null;
}

const SCOPE_TABS = [
  { key: "PLATFORM" as const, label: "Platform", icon: ShieldCheck },
  { key: "CORPORATE" as const, label: "Corporate", icon: Building2 },
  { key: "VENDOR" as const, label: "Vendor", icon: Store },
] as const;

function displayRole(user: DirectoryUser) {
  if (user.scope === "PLATFORM") {
    return ORGANISATION_ROLES.find((item) => item.value === user.role)?.label ?? user.role;
  }
  if (user.scope === "CORPORATE") {
    return user.role === "CLIENT_ADMIN" ? "Corporate Admin" : "Branch User";
  }
  return user.role === "CLIENT_ADMIN" ? "Vendor Admin" : "Vendor Operator";
}

export default function OrganisationUsersPage() {
  const toast = useToast();
  const router = useRouter();

  const [scopeTab, setScopeTab] = useState<UserScope>("PLATFORM");
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Add user modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [platformForm, setPlatformForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "MAKER",
  });
  const [clientUserForm, setClientUserForm] = useState({
    clientId: "",
    role: "CLIENT_ADMIN",
    branchId: "",
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "",
  });
  const [createBranches, setCreateBranches] = useState<BranchOption[]>([]);

  // Assign branch modal state (for Corporate Branch Users)
  const [assignBranchUser, setAssignBranchUser] = useState<DirectoryUser | null>(null);
  const [assignModalBranches, setAssignModalBranches] = useState<BranchOption[]>([]);
  const [assignBranchesLoading, setAssignBranchesLoading] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [savingBranches, setSavingBranches] = useState(false);

  useEffect(() => {
    if (!openMenuUserId) return;
    function handleOutside(event: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
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
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenuUserId]);

  async function load() {
    setLoading(true);
    try {
      const [directoryRows, clientRows] = await Promise.all([
        apiFetch<DirectoryUser[]>("/api/v1/paytrix/users/directory"),
        apiFetch<Client[]>("/api/v1/paytrix/clients").catch(() => [] as Client[]),
      ]);
      setUsers(directoryRows);
      setClients(clientRows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!addModalOpen || scopeTab !== "CORPORATE" || !clientUserForm.clientId) {
      setCreateBranches([]);
      return;
    }
    apiFetch<BranchOption[]>(`/api/v1/paytrix/clients/${clientUserForm.clientId}/branches`)
      .then(setCreateBranches)
      .catch(() => setCreateBranches([]));
  }, [addModalOpen, scopeTab, clientUserForm.clientId]);

  function openAddModal() {
    if (scopeTab === "PLATFORM") {
      setPlatformForm({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "MAKER",
      });
    } else {
      setClientUserForm({
        clientId: "",
        role: "CLIENT_ADMIN",
        branchId: "",
        fullName: "",
        phoneNumber: "",
        email: "",
        password: "",
      });
      setCreateBranches([]);
    }
    setAddModalOpen(true);
  }

  async function handleCreatePlatformUser(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/paytrix/users", {
        method: "POST",
        body: {
          fullName: platformForm.fullName.trim(),
          phoneNumber: platformForm.phoneNumber,
          email: platformForm.email.trim() || undefined,
          password: platformForm.password,
          role: platformForm.role,
        },
      });
      const label =
        ORGANISATION_ROLES.find((r) => r.value === platformForm.role)?.label ?? platformForm.role;
      toast.success(`${platformForm.fullName.trim()} added as ${label}`);
      setAddModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add platform user");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateClientUser(event: React.FormEvent) {
    event.preventDefault();
    if (!clientUserForm.clientId) {
      toast.error(scopeTab === "CORPORATE" ? "Select a corporate" : "Select a vendor");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/paytrix/clients/${clientUserForm.clientId}/users`, {
        method: "POST",
        body: {
          fullName: clientUserForm.fullName.trim(),
          phoneNumber: clientUserForm.phoneNumber,
          role: clientUserForm.role,
          ...(clientUserForm.email.trim() ? { email: clientUserForm.email.trim() } : {}),
          ...(scopeTab === "CORPORATE" &&
          clientUserForm.role === "BRANCH_USER" &&
          clientUserForm.branchId
            ? { branchId: clientUserForm.branchId }
            : {}),
          ...(clientUserForm.password.trim() ? { password: clientUserForm.password } : {}),
        },
      });
      toast.success(`${clientUserForm.fullName.trim()} added`);
      setAddModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add user");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(user: DirectoryUser) {
    setOpenMenuUserId(null);
    setBusyId(user.id);
    try {
      const action = user.status === "ACTIVE" ? "suspend" : "reactivate";
      const endpoint =
        user.scope === "PLATFORM"
          ? `/api/v1/paytrix/users/${user.id}/${action}`
          : `/api/v1/paytrix/clients/${user.clientId}/users/${user.id}/${action}`;
      await apiFetch(endpoint, { method: "PATCH" });
      toast.success(
        `${user.fullName} ${user.status === "ACTIVE" ? "inactivated" : "activated"}`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function openAssignBranchModal(user: DirectoryUser) {
    setOpenMenuUserId(null);
    if (!user.clientId) return;
    setAssignBranchUser(user);
    setSelectedBranchIds((user.branches ?? []).map((b) => b.id));
    setAssignBranchesLoading(true);
    try {
      const rows = await apiFetch<BranchOption[]>(
        `/api/v1/paytrix/clients/${user.clientId}/branches`,
      );
      setAssignModalBranches(rows);
    } catch {
      setAssignModalBranches([]);
    } finally {
      setAssignBranchesLoading(false);
    }
  }

  function toggleBranchSelection(branchId: string) {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  }

  async function saveBranchAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!assignBranchUser?.clientId) return;
    setSavingBranches(true);
    try {
      await apiFetch(
        `/api/v1/paytrix/clients/${assignBranchUser.clientId}/users/${assignBranchUser.id}/branches`,
        {
          method: "PUT",
          body: { branchIds: selectedBranchIds },
        },
      );
      toast.success("Branch assignment updated");
      setAssignBranchUser(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update branch assignment");
    } finally {
      setSavingBranches(false);
    }
  }

  const query = search.trim().toLowerCase();
  const searched = users.filter((user) => {
    if (!query) return true;
    return (
      user.fullName.toLowerCase().includes(query) ||
      user.phoneNumber.includes(query) ||
      user.userCode.toLowerCase().includes(query) ||
      (user.email ?? "").toLowerCase().includes(query) ||
      (user.clientName ?? "").toLowerCase().includes(query) ||
      (user.clientCode ?? "").toLowerCase().includes(query) ||
      displayRole(user).toLowerCase().includes(query)
    );
  });

  const counts = {
    PLATFORM: searched.filter((u) => u.scope === "PLATFORM").length,
    CORPORATE: searched.filter((u) => u.scope === "CORPORATE").length,
    VENDOR: searched.filter((u) => u.scope === "VENDOR").length,
  };

  const filtered = searched.filter((u) => u.scope === scopeTab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCorporates = clients.filter(
    (c) => c.clientType === "CORPORATE" && c.status === "ACTIVE",
  );
  const activeVendors = clients.filter(
    (c) => c.clientType === "VENDOR" && c.status === "ACTIVE",
  );

  const addLabel = "Add User";

  const roleCards =
    scopeTab === "VENDOR"
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
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Users"
        description="Manage platform staff, corporate users, and vendor users across Paytrix."
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {SCOPE_TABS.map((item) => {
          const Icon = item.icon;
          const active = scopeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setScopeTab(item.key);
                setCurrentPage(1);
              }}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-colors",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
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

      <ListCard fitContent={false}>
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
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
              placeholder={
                scopeTab === "PLATFORM"
                  ? "Search platform users by name, code, phone, or role"
                  : scopeTab === "CORPORATE"
                    ? "Search corporate users by name, corporate, or phone"
                    : "Search vendor users by name, vendor, or phone"
              }
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <Button size="sm" icon={<UserPlus size={15} />} onClick={openAddModal}>
            {addLabel}
          </Button>
        </div>

        {loading ? (
          <TableSkeleton cols={scopeTab === "CORPORATE" ? 6 : 5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={
              search.trim()
                ? "No users match"
                : scopeTab === "PLATFORM"
                  ? "No platform users yet"
                  : scopeTab === "CORPORATE"
                    ? "No corporate users yet"
                    : "No vendor users yet"
            }
            description={
              search.trim()
                ? "Try clearing the search query."
                : scopeTab === "PLATFORM"
                  ? "Add a maker, checker, viewer, sales user, or admin for Paytrix."
                  : scopeTab === "CORPORATE"
                    ? "Add a Corporate Admin or Branch User for an active corporate."
                    : "Add a Vendor Admin or Operator for an active vendor."
            }
            action={
              !search.trim() ? (
                <Button icon={<UserPlus size={16} />} onClick={openAddModal}>
                  {addLabel}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={
                  scopeTab === "PLATFORM"
                    ? ["User", "Contact", "Status", ""]
                    : scopeTab === "CORPORATE"
                      ? ["User", "Corporate", "Branch", "Contact", "Status", ""]
                      : ["User", "Vendor", "Contact", "Status", ""]
                }
              />
              <TBody>
                {paged.map((user) => (
                  <TR
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/paytrix/users/${user.id}`)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {userInitials(user.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{user.fullName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                              {displayRole(user)}
                            </span>
                            <button
                              type="button"
                              title="Copy user code"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(user.userCode);
                                  setCopiedKey(`code:${user.id}`);
                                  toast.success(`Copied ${user.userCode}`);
                                  setTimeout(() => setCopiedKey(null), 1500);
                                } catch {
                                  toast.error("Could not copy code");
                                }
                              }}
                              className="group inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <span>{user.userCode}</span>
                              {copiedKey === `code:${user.id}` ? (
                                <Check size={11} className="text-emerald-600" />
                              ) : (
                                <Copy size={11} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </TD>
                    {scopeTab === "CORPORATE" && (
                      <>
                        <TD onClick={(e) => e.stopPropagation()}>
                          {user.clientId ? (
                            <Link
                              href={`/paytrix/clients/${user.clientId}`}
                              className="group inline-flex flex-col"
                            >
                              <span className="font-semibold text-slate-900 group-hover:text-indigo-600">
                                {user.clientName}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {user.clientCode ?? user.clientId}
                              </span>
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TD>
                        <TD className="text-xs text-slate-700">
                          {user.role === "CLIENT_ADMIN" ? (
                            <span className="text-slate-400">All branches</span>
                          ) : (user.branches ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(user.branches ?? []).map((b) => (
                                <span
                                  key={b.id}
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  <GitBranch size={11} className="text-slate-400" />
                                  {b.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </TD>
                      </>
                    )}
                    {scopeTab === "VENDOR" && (
                      <TD onClick={(e) => e.stopPropagation()}>
                        {user.clientId ? (
                          <Link
                            href={`/paytrix/vendors/${user.clientId}`}
                            className="group inline-flex flex-col"
                          >
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-600">
                              {user.clientName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {user.clientCode ?? user.clientId}
                            </span>
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TD>
                    )}
                    <TD onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-start gap-1">
                        <button
                          type="button"
                          title="Copy phone number"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(user.phoneNumber);
                              setCopiedKey(`phone:${user.id}`);
                              toast.success(`Copied ${user.phoneNumber}`);
                              setTimeout(() => setCopiedKey(null), 1500);
                            } catch {
                              toast.error("Could not copy phone number");
                            }
                          }}
                          className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 font-mono text-xs text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Phone size={12} className="shrink-0 text-slate-400 group-hover:text-indigo-500" />
                          <span>{user.phoneNumber}</span>
                          {copiedKey === `phone:${user.id}` ? (
                            <Check size={11} className="shrink-0 text-emerald-600" />
                          ) : (
                            <Copy size={11} className="shrink-0 text-slate-400 transition-colors group-hover:text-indigo-600" />
                          )}
                        </button>
                        {user.email ? (
                          <button
                            type="button"
                            title="Copy email"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(user.email!);
                                setCopiedKey(`email:${user.id}`);
                                toast.success(`Copied ${user.email}`);
                                setTimeout(() => setCopiedKey(null), 1500);
                              } catch {
                                toast.error("Could not copy email");
                              }
                            }}
                            className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 -ml-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Mail size={12} className="shrink-0 text-slate-400 group-hover:text-indigo-500" />
                            <span className="truncate">{user.email}</span>
                            {copiedKey === `email:${user.id}` ? (
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
                      <StatusBadge status={user.status} />
                    </TD>
                    <TD>
                      <ChevronRight size={16} className="ml-auto text-slate-300" />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
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

      {/* Add User Modal (Platform / Corporate / Vendor based on active tab) */}
      <Modal
        open={addModalOpen}
        onClose={() => !submitting && setAddModalOpen(false)}
        title={addLabel}
        description={
          scopeTab === "PLATFORM"
            ? "Create a Paytrix platform user who can sign in with this mobile number and password."
            : scopeTab === "CORPORATE"
              ? "Choose the user type and corporate, then enter their sign-in details."
              : "Choose the user type and vendor, then enter their sign-in details."
        }
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setAddModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              form={scopeTab === "PLATFORM" ? "add-platform-user-form" : "add-scoped-client-user-form"}
              type="submit"
              loading={submitting}
              disabled={
                scopeTab !== "PLATFORM" &&
                (scopeTab === "CORPORATE"
                  ? activeCorporates.length === 0
                  : activeVendors.length === 0)
              }
            >
              {addLabel}
            </Button>
          </>
        }
      >
        {scopeTab === "PLATFORM" ? (
          <form
            id="add-platform-user-form"
            onSubmit={handleCreatePlatformUser}
            className="flex flex-col gap-6"
          >
            <section className="flex flex-col gap-4">
              <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Person
              </h3>
              <Field
                label="Full name"
                required
                value={platformForm.fullName}
                onChange={(e) => setPlatformForm({ ...platformForm, fullName: e.target.value })}
                placeholder="Jane Doe"
              />
              <Field
                label="Mobile number"
                required
                inputMode="numeric"
                maxLength={10}
                value={platformForm.phoneNumber}
                onChange={(e) =>
                  setPlatformForm({
                    ...platformForm,
                    phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                placeholder="10-digit mobile number"
              />
              <Field
                label="Email"
                type="email"
                hint="Optional. Can be used with the password."
                value={platformForm.email}
                onChange={(e) => setPlatformForm({ ...platformForm, email: e.target.value })}
                placeholder="name@paytrix.com"
              />
              <PasswordField
                label="Password"
                required
                minLength={6}
                value={platformForm.password}
                onChange={(e) => setPlatformForm({ ...platformForm, password: e.target.value })}
                placeholder="At least 6 characters"
              />
            </section>
            <section>
              <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Access
              </h3>
              <div className="mt-3">
                <RolePicker
                  roles={ORGANISATION_ROLES}
                  value={platformForm.role}
                  onChange={(role) => setPlatformForm({ ...platformForm, role })}
                />
              </div>
            </section>
          </form>
        ) : (
          <form
            id="add-scoped-client-user-form"
            onSubmit={handleCreateClientUser}
            className="flex flex-col gap-5"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">User type</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {roleCards.map(({ value, title: cardTitle, subtitle, icon: Icon }) => {
                  const selected = clientUserForm.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setClientUserForm({ ...clientUserForm, role: value })}
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

            <SearchableSelect
              label={scopeTab === "CORPORATE" ? "Corporate" : "Vendor"}
              value={clientUserForm.clientId}
              onChange={(clientId) =>
                setClientUserForm({
                  ...clientUserForm,
                  clientId,
                  branchId: "",
                })
              }
              placeholder={
                scopeTab === "CORPORATE" ? "Select a corporate..." : "Select a vendor..."
              }
              searchPlaceholder={
                scopeTab === "CORPORATE" ? "Search corporates..." : "Search vendors..."
              }
              hint={
                scopeTab === "CORPORATE" && activeCorporates.length === 0
                  ? "No active corporates yet. Activate a corporate first to add users."
                  : scopeTab === "VENDOR" && activeVendors.length === 0
                    ? "No active vendors yet. Activate a vendor first to add users."
                    : undefined
              }
              options={(scopeTab === "CORPORATE" ? activeCorporates : activeVendors).map((c) => ({
                value: c.id,
                label: c.clientName,
                sublabel: c.clientCode ?? c.id,
              }))}
            />

            {scopeTab === "CORPORATE" &&
              clientUserForm.role === "BRANCH_USER" &&
              createBranches.length > 0 && (
                <SearchableSelect
                  label="Branch"
                  value={clientUserForm.branchId}
                  onChange={(branchId) =>
                    setClientUserForm({ ...clientUserForm, branchId })
                  }
                  allowClear
                  placeholder="Assign later (optional)"
                  searchPlaceholder="Search branches..."
                  hint="Optional. You can also assign branches later."
                  options={createBranches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                    sublabel: branch.code ?? undefined,
                  }))}
                />
              )}

            <Field
              label="Full name"
              required
              value={clientUserForm.fullName}
              onChange={(e) =>
                setClientUserForm({ ...clientUserForm, fullName: e.target.value })
              }
              placeholder="Ravi Kumar"
            />
            <Field
              label="Mobile number"
              required
              inputMode="numeric"
              maxLength={10}
              value={clientUserForm.phoneNumber}
              onChange={(e) =>
                setClientUserForm({
                  ...clientUserForm,
                  phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              placeholder="10-digit mobile number"
            />
            <Field
              label="Email"
              type="email"
              hint="Optional."
              value={clientUserForm.email}
              onChange={(e) =>
                setClientUserForm({ ...clientUserForm, email: e.target.value })
              }
              placeholder="name@company.com"
            />
            <PasswordField
              label="Password"
              minLength={6}
              hint="Optional. Leave blank if they will set their own password on first sign-in."
              value={clientUserForm.password}
              onChange={(e) =>
                setClientUserForm({ ...clientUserForm, password: e.target.value })
              }
              placeholder="At least 6 characters"
            />
          </form>
        )}
      </Modal>

      {/* Assign Branch Modal for Corporate Branch Users */}
      <Modal
        open={assignBranchUser !== null}
        onClose={() => !savingBranches && setAssignBranchUser(null)}
        title="Assign branch"
        description={
          assignBranchUser
            ? `Select the branch(es) ${assignBranchUser.fullName} can access under ${assignBranchUser.clientName}.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => setAssignBranchUser(null)}
              disabled={savingBranches}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="directory-assign-user-branches-form"
              loading={savingBranches}
              disabled={assignBranchesLoading || assignModalBranches.length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <form
          id="directory-assign-user-branches-form"
          onSubmit={saveBranchAssignment}
          className="flex flex-col gap-3"
        >
          {assignBranchesLoading ? (
            <p className="text-sm text-slate-500">Loading branches...</p>
          ) : assignModalBranches.length === 0 ? (
            <p className="text-sm text-slate-500">
              No branches have been created for this corporate yet.
            </p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {assignModalBranches.map((branch) => {
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
