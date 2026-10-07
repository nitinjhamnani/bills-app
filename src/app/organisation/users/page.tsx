"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, UserPlus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, PasswordField } from "@/components/ui/Field";
import { StatusBadge } from "@/components/StatusBadge";
import { RolePicker } from "@/components/RolePicker";
import { userInitials } from "@/components/UserMenu";
import { Table, THead, TBody, TR, TD, TablePagination } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { ORGANISATION_ROLES } from "@/lib/roles";
import type { OrganisationUser } from "@/lib/types";

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "SUSPENDED", label: "Suspended" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

function roleLabel(role: string) {
  return ORGANISATION_ROLES.find((item) => item.value === role)?.label ?? role;
}

export default function OrganisationUsersPage() {
  const toast = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<OrganisationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "MAKER",
  });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    try {
      setUsers(await apiFetch<OrganisationUser[]>("/api/v1/organisation/users"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/organisation/users", { method: "POST", body: form });
      toast.success(`${form.fullName} added as ${roleLabel(form.role)}`);
      setForm({
        fullName: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "MAKER",
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add user");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(user: OrganisationUser) {
    setBusyId(user.id);
    try {
      const action = user.status === "ACTIVE" ? "suspend" : "reactivate";
      await apiFetch(`/api/v1/organisation/users/${user.id}/${action}`, {
        method: "PATCH",
      });
      toast.success(
        `${user.fullName} ${user.status === "ACTIVE" ? "suspended" : "reactivated"}`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const searched = users.filter((user) => {
    if (!query) return true;
    return (
      user.fullName.toLowerCase().includes(query) ||
      user.phoneNumber.includes(query) ||
      (user.email ?? "").toLowerCase().includes(query) ||
      roleLabel(user.role).toLowerCase().includes(query)
    );
  });
  const counts = {
    ALL: searched.length,
    ACTIVE: searched.filter((user) => user.status === "ACTIVE").length,
    SUSPENDED: searched.filter((user) => user.status === "SUSPENDED").length,
  };
  const filtered =
    statusFilter === "ALL" ? searched : searched.filter((user) => user.status === statusFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Users"
        description="People who can sign in and work on behalf of this organisation."
        actions={
          <Button icon={<UserPlus size={16} />} onClick={() => setModalOpen(true)}>
            Add user
          </Button>
        }
      />

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

      <ListCard>
        <div className="shrink-0 border-b border-slate-100 px-4 py-3">
          <div className="relative sm:max-w-sm">
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
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={users.length === 0 ? "No users yet" : "No users match"}
            description={
              users.length === 0
                ? "Add a maker, checker, viewer, or another admin."
                : "Try another status or clear the search."
            }
            action={
              users.length === 0 ? (
                <Button icon={<UserPlus size={16} />} onClick={() => setModalOpen(true)}>
                  Add user
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <THead columns={["User", "Phone", "Status", ""]} />
              <TBody>
                {paged.map((user) => (
                  <TR
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/organisation/users/${user.id}`)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {userInitials(user.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{user.fullName}</p>
                          <p className="truncate text-[11px] font-medium text-slate-400">
                            {roleLabel(user.role)}
                            {user.email ? ` · ${user.email}` : ""}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs text-slate-600">{user.phoneNumber}</TD>
                    <TD>
                      <StatusBadge status={user.status} />
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={busyId === user.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleStatus(user);
                          }}
                        >
                          {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                        </Button>
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add a user"
        description="They can sign in with this phone and password."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="add-user-form" type="submit" loading={submitting}>
              Add user
            </Button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={handleCreate} className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Person
            </h3>
            <Field
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Jane Doe"
            />
            <Field
              label="Mobile number"
              required
              inputMode="numeric"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })
              }
              placeholder="10-digit mobile number"
            />
            <Field
              label="Email"
              type="email"
              hint="Optional. Can be used with the password."
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@organisation.com"
            />
            <PasswordField
              label="Password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                value={form.role}
                onChange={(role) => setForm({ ...form, role })}
              />
            </div>
          </section>
        </form>
      </Modal>
    </div>
  );
}
