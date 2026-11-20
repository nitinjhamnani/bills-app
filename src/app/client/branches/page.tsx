"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Download,
  GitBranch,
  Plus,
  Search,
  Upload,
  UserRound,
} from "lucide-react";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/workspace";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { BulkRowResult } from "@/lib/types";

interface BranchUserItem {
  id: string;
  userCode?: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role?: string;
  status?: string;
  passwordSet?: boolean;
}

interface BranchRow {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  state: string | null;
  location: string | null;
  managedBillCount: number;
  userCount: number;
  status: "ACTIVE" | "SUSPENDED" | string;
  users: BranchUserItem[];
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

export default function BranchesPage() {
  const router = useRouter();
  const toast = useToast();
  const user = getUser();
  const clientId = user?.clientId ?? "";
  const isAdmin = user?.role === "CORP_ADMIN";

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkRowResult[] | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await apiFetch<BranchRow[]>(`/api/v1/clients/${clientId}/branches`);
      setBranches(rows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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
      const created = await apiFetch<BranchRow>(`/api/v1/clients/${clientId}/branches`, {
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
      router.push(`/client/branches/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create branch");
    } finally {
      setCreating(false);
    }
  }

  async function downloadTemplate() {
    setTemplateDownloading(true);
    try {
      const response = await trackedFetch(
        `${API_BASE_URL}/api/v1/clients/${clientId}/branches/bulk/template`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, `Download failed with status ${response.status}`));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "branches-upload-template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download template");
    } finally {
      setTemplateDownloading(false);
    }
  }

  async function uploadBulk(file: File) {
    setBulkUploading(true);
    setBulkResults(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await trackedFetch(`${API_BASE_URL}/api/v1/clients/${clientId}/branches/bulk`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, `Upload failed with status ${response.status}`));
      }
      const results = (await response.json()) as BulkRowResult[];
      setBulkResults(results);
      const ok = results.filter((row) => row.success).length;
      toast.success(`${ok}/${results.length} branches created`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    ACTIVE: searched.filter((b) => (b.status ?? "ACTIVE") === "ACTIVE").length,
    SUSPENDED: searched.filter((b) => b.status === "SUSPENDED").length,
  };
  const visible =
    statusFilter === "ALL"
      ? searched
      : searched.filter((b) => (b.status ?? "ACTIVE") === statusFilter);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Branches"
        description="Manage corporate branches, assigned branch users, and branch bills."
        actions={
          isAdmin ? (
            <>
              <Button
                variant="outline"
                icon={<Upload size={16} />}
                onClick={() => {
                  setBulkResults(null);
                  setBulkOpen(true);
                }}
              >
                Bulk upload
              </Button>
              <Button
                icon={<Plus size={16} />}
                onClick={() => {
                  setForm(emptyForm);
                  setModalOpen(true);
                }}
              >
                Add branch
              </Button>
            </>
          ) : undefined
        }
      />

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
                "",
              ]}
            />
            <TBody>
              {visible.map((branch) => (
                <TR
                  key={branch.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/client/branches/${branch.id}`)}
                >
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
                  <TD className="font-semibold text-slate-800">{branch.managedBillCount ?? 0}</TD>
                  <TD>
                    <StatusBadge status={branch.status ?? "ACTIVE"} />
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

      {/* Create Branch Modal */}
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
            <Button type="submit" form="create-client-branch-form" loading={creating}>
              Create branch
            </Button>
          </>
        }
      >
        <form id="create-client-branch-form" onSubmit={handleCreate} className="flex flex-col gap-4">
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

      {/* Bulk Upload Modal */}
      <Modal
        open={bulkOpen}
        onClose={() => !bulkUploading && setBulkOpen(false)}
        title="Bulk upload"
        description="One row per branch. Name, address, and code come first. User name, phone, and password are optional: leave all three blank, or fill all three. Delete the sample row before you upload."
      >
        <div className="flex flex-col gap-4">
          <Button
            variant="outline"
            icon={<Download size={16} />}
            loading={templateDownloading}
            onClick={downloadTemplate}
          >
            Download Excel template
          </Button>
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40">
            <Upload size={16} />
            {bulkUploading ? "Uploading..." : "Choose a filled-in .xlsx file"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              disabled={bulkUploading}
              onChange={(e) => e.target.files?.[0] && uploadBulk(e.target.files[0])}
              className="hidden"
            />
          </label>
          {bulkResults && (
            <ul className="flex max-h-72 flex-col gap-2 overflow-auto">
              {bulkResults.map((row) => (
                <li
                  key={row.row}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">Row {row.row}</p>
                    <p className="mt-0.5 text-xs break-words text-slate-500">
                      {row.success ? row.billId : row.error}
                    </p>
                  </div>
                  <StatusBadge status={row.success ? "SUCCESS" : "FAILED"} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
