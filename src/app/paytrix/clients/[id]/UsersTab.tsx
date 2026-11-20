"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  ChevronRight,
  Copy,
  GitBranch,
  KeyRound,
  Mail,
  Phone,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField, SearchableSelect } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { ClientUser } from "@/lib/types";

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

export function UsersTab({
  clientId,
  usersPath,
}: {
  clientId: string;
  usersPath?: string;
}) {
  const path = usersPath ?? `/api/v1/paytrix/clients/${clientId}/users`;
  const isPaytrix = path.startsWith("/api/v1/paytrix/");
  const isVendor = clientId.startsWith("VD");
  const router = useRouter();
  const toast = useToast();
  const defaultAdminRole = isVendor ? "VENDOR_ADMIN" : "CORP_ADMIN";
  const currentRole = getUser()?.role;
  const canManage =
    currentRole === "SUPER_ADMIN" ||
    currentRole === "ORGANISATION_ADMIN" ||
    currentRole === "CORP_ADMIN" ||
    currentRole === "VENDOR_ADMIN";
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; code?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: "",
    email: "",
    fullName: "",
    role: defaultAdminRole,
    branchId: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const [assignBranchUser, setAssignBranchUser] = useState<ClientUser | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [savingBranches, setSavingBranches] = useState(false);

  const [passwordTarget, setPasswordTarget] = useState<ClientUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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

  function roleLabel(role: string) {
    if (role === "VENDOR_ADMIN") return "Vendor Admin";
    if (role === "VENDOR_OPERATOR") return "Vendor Operator";
    if (role === "CORP_ADMIN") return "Corporate Admin";
    if (role === "CORP_OPERATOR") return "Branch User";
    return isVendor ? "Vendor Operator" : "Branch User";
  }

  async function load() {
    setLoading(true);
    try {
      const branchesEndpoint = path.startsWith("/api/v1/paytrix/")
        ? `/api/v1/paytrix/clients/${clientId}/branches`
        : `/api/v1/clients/${clientId}/branches`;
      const [userRows, branchRows] = await Promise.all([
        apiFetch<ClientUser[]>(path),
        !isVendor && clientId
          ? apiFetch<{ id: string; name: string; code?: string | null }[]>(
              branchesEndpoint,
            ).catch(() => [] as { id: string; name: string; code?: string | null }[])
          : Promise.resolve([] as { id: string; name: string; code?: string | null }[]),
      ]);
      setUsers(userRows);
      setBranches(branchRows);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(path, {
        method: "POST",
        body: {
          phoneNumber: form.phoneNumber,
          fullName: form.fullName.trim(),
          role: form.role,
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
          ...(!isVendor && form.role === "BRANCH_USER" && form.branchId
            ? { branchId: form.branchId }
            : {}),
          password: form.password,
        },
      });
      toast.success(`${form.fullName.trim()} added as ${roleLabel(form.role)}`);
      setForm({
        phoneNumber: "",
        email: "",
        fullName: "",
        role: defaultAdminRole,
        branchId: "",
        password: "",
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add user");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(user: ClientUser) {
    setOpenMenuUserId(null);
    setBusyId(user.id);
    try {
      const action = user.status === "ACTIVE" ? "suspend" : "reactivate";
      await apiFetch(
        `${path}/${user.id}/${action}`,
        { method: "PATCH" },
      );
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

  function openAssignBranchModal(user: ClientUser) {
    setOpenMenuUserId(null);
    setAssignBranchUser(user);
    setSelectedBranchIds((user.branches ?? []).map((b) => b.id));
  }

  function toggleBranchSelection(branchId: string) {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId],
    );
  }

  async function saveBranchAssignment(event: React.FormEvent) {
    event.preventDefault();
    if (!assignBranchUser) return;
    setSavingBranches(true);
    try {
      const updated = await apiFetch<ClientUser>(
        `${path}/${assignBranchUser.id}/branches`,
        {
          method: "PUT",
          body: { branchIds: selectedBranchIds },
        },
      );
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setAssignBranchUser(null);
      toast.success("Branch assignment updated");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not update branch assignment",
      );
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
      roleLabel(user.role).toLowerCase().includes(query) ||
      (user.branches ?? []).some((b) => b.name.toLowerCase().includes(query))
    );
  });
  const counts = {
    ALL: searched.length,
    ACTIVE: searched.filter((user) => user.status === "ACTIVE").length,
    SUSPENDED: searched.filter((user) => user.status === "SUSPENDED").length,
  };
  const visible =
    statusFilter === "ALL"
      ? searched
      : searched.filter((user) => user.status === statusFilter);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function openUserDetail(userId: string) {
    if (isPaytrix) {
      router.push(`/paytrix/users/${userId}`);
    } else if (isVendor) {
      router.push(`/vendor/users/${userId}`);
    } else {
      router.push(`/client/users/${userId}`);
    }
  }

  const roleCards = isVendor
    ? [
        {
          value: "VENDOR_ADMIN",
          title: "Vendor Admin",
          subtitle: "Manages assigned bills, settlements, and users",
          icon: ShieldCheck,
        },
        {
          value: "VENDOR_OPERATOR",
          title: "Vendor Operator",
          subtitle: "Views assigned bills and settlement progress",
          icon: UserCheck,
        },
      ]
    : [
        {
          value: "CORP_ADMIN",
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
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {STATUS_FILTERS.map((item) => {
          const active = statusFilter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setStatusFilter(item.key);
                setCurrentPage(1);
              }}
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
              placeholder="Search by name, phone, or role"
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {canManage && (
            <Button size="sm" icon={<UserPlus size={15} />} onClick={() => setModalOpen(true)}>
              Add user
            </Button>
          )}
        </div>
        {loading ? (
          <TableSkeleton cols={isVendor ? 4 : 5} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={users.length === 0 ? "No staff yet" : "No staff match"}
            description={
              users.length === 0
                ? isVendor
                  ? "Add a Vendor Admin or Operator so staff can sign in."
                  : "Add a Corporate Admin or Branch User so staff can sign in."
                : "Try another status or clear the search."
            }
            action={
              canManage && users.length === 0 ? (
                <Button icon={<UserPlus size={16} />} onClick={() => setModalOpen(true)}>
                  Add user
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead
                columns={[
                  "User",
                  "Contact",
                  ...(!isVendor ? ["Branch"] : []),
                  "Status",
                  "",
                ]}
              />
              <TBody>
                {paged.map((user) => (
                  <TR
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => openUserDetail(user.id)}
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
                              {roleLabel(user.role)}
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
                  {!isVendor && (
                    <TD className="text-xs text-slate-700">
                      {user.role === "CORP_ADMIN" ? (
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
                  )}
                  <TD>
                    <StatusBadge status={user.status} />
                  </TD>
                  <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-end gap-2">
                      {canManage && (
                        <div
                          ref={openMenuUserId === user.id ? menuContainerRef : undefined}
                          className="inline-block text-left"
                        >
                          <button
                            type="button"
                            aria-label={`Actions for ${user.fullName}`}
                            aria-haspopup="menu"
                            aria-expanded={openMenuUserId === user.id}
                            disabled={busyId === user.id}
                            onClick={(event) => {
                              if (openMenuUserId === user.id) {
                                setOpenMenuUserId(null);
                                return;
                              }
                              const rect = event.currentTarget.getBoundingClientRect();
                              setMenuPos({
                                top: rect.bottom + 6,
                                right: window.innerWidth - rect.right,
                              });
                              setOpenMenuUserId(user.id);
                            }}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                          >
                            <Settings size={15} />
                          </button>

                          {openMenuUserId === user.id && menuPos && (
                            <div
                              role="menu"
                              style={{ top: menuPos.top, right: menuPos.right }}
                              className="fixed z-50 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                            >
                              {!isVendor && user.role !== "CORP_ADMIN" && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => openAssignBranchModal(user)}
                                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <GitBranch size={14} className="text-slate-400" />
                                  Assign branch
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuUserId(null);
                                  setNewPassword("");
                                  setPasswordTarget(user);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <KeyRound size={14} className="text-slate-400" />
                                Set password
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => toggleStatus(user)}
                                className={cn(
                                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold",
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
                      <button
                        type="button"
                        aria-label={`Open ${user.fullName}`}
                        onClick={() => openUserDetail(user.id)}
                        className="cursor-pointer text-slate-300 transition-colors hover:text-slate-600"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={visible.length}
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
        title="Add a user"
        description="Choose the user type, then enter their sign-in details."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="add-client-user-form" type="submit" loading={submitting}>
              Add user
            </Button>
          </>
        }
      >
        <form id="add-client-user-form" onSubmit={handleCreate} className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-medium text-slate-700">User type</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {roleCards.map(({ value, title: cardTitle, subtitle, icon: Icon }) => {
                const selected = form.role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, role: value })}
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

          {!isVendor && form.role === "BRANCH_USER" && branches.length > 0 && (
            <SearchableSelect
              label="Branch"
              value={form.branchId}
              onChange={(branchId) => setForm({ ...form, branchId })}
              allowClear
              placeholder="Assign later (optional)"
              searchPlaceholder="Search branches..."
              hint="Optional. You can also assign branches later."
              options={branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
                sublabel: branch.code ?? undefined,
              }))}
            />
          )}

          <Field
            label="Full name"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Ravi Kumar"
          />
          <Field
            label="Mobile number"
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
            placeholder="10-digit mobile number"
          />
          <Field
            label="Email"
            type="email"
            hint="Optional."
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@company.com"
          />
          <PasswordField
            label="Password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 6 characters"
          />
        </form>
      </Modal>

      <Modal
        open={assignBranchUser !== null}
        onClose={() => !savingBranches && setAssignBranchUser(null)}
        title="Assign branch"
        description={
          assignBranchUser
            ? `Select the branch(es) ${assignBranchUser.fullName} can access.`
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
              form="assign-user-branches-form"
              loading={savingBranches}
              disabled={branches.length === 0}
            >
              Save
            </Button>
          </>
        }
      >
        <form id="assign-user-branches-form" onSubmit={saveBranchAssignment} className="flex flex-col gap-3">
          {branches.length === 0 ? (
            <p className="text-sm text-slate-500">
              No branches have been created for this corporate yet. Add a branch under the Branches tab first.
            </p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {branches.map((branch) => {
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

      <Modal
        open={passwordTarget !== null}
        onClose={() => !savingPassword && setPasswordTarget(null)}
        title="Set password"
        description={
          passwordTarget
            ? `Set a new sign-in password for ${passwordTarget.fullName}. Any active session for this user will be signed out immediately.`
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
              form="reset-client-user-password-form"
              loading={savingPassword}
              disabled={newPassword.length < 6}
            >
              Save password
            </Button>
          </>
        }
      >
        <form
          id="reset-client-user-password-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!passwordTarget) return;
            setSavingPassword(true);
            try {
              const endpoint = path.startsWith("/api/v1/paytrix/")
                ? `/api/v1/paytrix/users/${passwordTarget.id}/password`
                : `${path}/${passwordTarget.id}/password`;
              await apiFetch(endpoint, {
                method: "PATCH",
                body: { password: newPassword },
              });
              toast.success(`Password updated for ${passwordTarget.fullName}`);
              setPasswordTarget(null);
              setNewPassword("");
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Could not update password");
            } finally {
              setSavingPassword(false);
            }
          }}
          className="flex flex-col gap-4"
        >
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
