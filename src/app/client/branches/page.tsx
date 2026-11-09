"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, GitBranch, Plus, Upload } from "lucide-react";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/workspace";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { UserMultiSelect, type PoolUser } from "./UserMultiSelect";
import { Modal } from "@/components/ui/Modal";
import { ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { BulkRowResult, ManagedBill } from "@/lib/types";

interface BranchUser {
  id: string;
  fullName: string;
  phoneNumber: string;
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

const emptyForm = {
  name: "",
  address: "",
  code: "",
  userName: "",
  phoneNumber: "",
};

export default function BranchesPage() {
  const router = useRouter();
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [billCounts, setBillCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pool, setPool] = useState<PoolUser[]>([]);
  const [poolReady, setPoolReady] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkRowResult[] | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [nextBranches, bills] = await Promise.all([
        apiFetch<Branch[]>(`/api/v1/clients/${clientId}/branches`),
        apiFetch<ManagedBill[]>(`/api/v1/clients/${clientId}/managed-bills`),
      ]);
      const counts: Record<string, number> = {};
      for (const bill of bills) {
        if (!bill.branchId) continue;
        counts[bill.branchId] = (counts[bill.branchId] ?? 0) + 1;
      }
      setBranches(nextBranches);
      setBillCounts(counts);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function setField(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm);
    setStep(1);
    setSelectedIds([]);
    setPool([]);
    setPoolReady(false);
    setCreating(true);
  }

  function goToUsers(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.name.trim()) {
      toast.error("Enter a branch name");
      return;
    }
    setPoolReady(false);
    setStep(2);
    apiFetch<PoolUser[]>(`/api/v1/clients/${clientId}/branch-user-pool`)
      .then(setPool)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Could not load users"))
      .finally(() => setPoolReady(true));
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

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!form.name.trim()) {
        toast.error("Enter a branch name");
        setBusy(false);
        return;
      }
      const addingNew = form.userName.trim().length > 0 || form.phoneNumber.length > 0;
      if (addingNew && (!form.userName.trim() || form.phoneNumber.length !== 10)) {
        toast.error("Enter the user's name and a 10-digit phone");
        setBusy(false);
        return;
      }
      const created = await apiFetch<Branch>(`/api/v1/clients/${clientId}/branches`, {
        method: "POST",
        body: {
          name: form.name,
          address: form.address,
          code: form.code,
          ...(selectedIds.length > 0 ? { userIds: selectedIds } : {}),
          ...(addingNew ? { userName: form.userName, phoneNumber: form.phoneNumber } : {}),
        },
      });
      toast.success(addingNew ? "Branch created. The new user signs in with Password@123." : "Branch created");
      setForm(emptyForm);
      setCreating(false);
      router.push(`/client/branches/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the branch");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Branches"
        description="Open a branch to see its managed bills and users. You pay fetched cycles from the wallet."
        actions={
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
            <Button icon={<Plus size={16} />} onClick={openCreate}>
              New branch
            </Button>
          </>
        }
      />

      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={5} />
        ) : branches.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No branches yet"
            description="Create a branch, then add a new user or assign someone who already belongs to this corporate."
            action={
              <Button icon={<Plus size={16} />} onClick={openCreate}>
                New branch
              </Button>
            }
          />
        ) : (
          <Table>
            <THead columns={["Branch", "Code", "Address", "Users", "Bills", ""]} />
            <TBody>
              {branches.map((branch) => (
                <TR
                  key={branch.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/client/branches/${branch.id}`)}
                >
                  <TD>
                    <p className="font-semibold text-slate-900">{branch.name}</p>
                  </TD>
                  <TD className="font-mono text-xs text-slate-600">{branch.code ?? "—"}</TD>
                  <TD className="text-slate-700">{branch.address ?? "—"}</TD>
                  <TD className="font-semibold text-slate-800">{branch.users.length}</TD>
                  <TD className="font-semibold text-slate-800">{billCounts[branch.id] ?? 0}</TD>
                  <TD>
                    <ChevronRight size={16} className="ml-auto text-slate-300" />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={creating}
        onClose={() => !busy && setCreating(false)}
        title={step === 1 ? "New branch" : "Add users"}
        description={
          step === 1
            ? "Step 1 of 2. Enter the branch. Next asks who can use it."
            : "Step 2 of 2. Choose people from this corporate, add a new user, or leave both empty."
        }
        footer={
          step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" form="branch-step-1">
                Next
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={busy}>
                Back
              </Button>
              <Button type="submit" form="branch-step-2" loading={busy}>
                Create branch
              </Button>
            </>
          )
        }
      >
        {step === 1 ? (
          <form id="branch-step-1" onSubmit={goToUsers} className="flex flex-col gap-4">
            <Field
              label="Branch name"
              required
              placeholder="Andheri"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <Field
              label="Branch address"
              placeholder="Link Road, Andheri West"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
            <Field
              label="Branch code"
              placeholder="AND"
              hint="Optional. Must be unique for this company."
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
            />
          </form>
        ) : (
          <form id="branch-step-2" onSubmit={createBranch} className="flex flex-col gap-4">
            <UserMultiSelect users={pool} selected={selectedIds} onChange={setSelectedIds} loading={!poolReady} />
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">New user</p>
                <p className="mt-1 text-xs text-slate-500">
                  Optional. Leave both blank to skip. A new user signs in with Password@123.
                </p>
              </div>
              <Field
                label="User name"
                placeholder="Ravi Shah"
                value={form.userName}
                onChange={(e) => setField("userName", e.target.value)}
              />
              <Field
                label="User phone"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={form.phoneNumber}
                onChange={(e) => setField("phoneNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => !bulkUploading && setBulkOpen(false)}
        title="Bulk upload"
        description="One row per branch. Name, address, and code come first. User name and phone are optional: leave both blank, or fill both. A new user signs in with Password@123. Delete the sample row before you upload."
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
