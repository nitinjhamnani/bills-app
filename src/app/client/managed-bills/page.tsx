"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, FileText, Plus, Search, Upload } from "lucide-react";
import { apiFetch, ApiError, extractErrorMessage, trackedFetch } from "@/lib/api-client";
import { getToken, getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { userInitials } from "@/components/UserMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { Biller, BulkRowResult, ClientBillServiceConfig, ManagedBill } from "@/lib/types";
import { API_BASE_URL } from "@/lib/workspace";

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water",
  GAS: "Piped Gas",
  DTH: "DTH / Cable TV",
  BROADBAND: "Broadband / Fibernet",
  MOBILE_POSTPAID: "Mobile Postpaid",
  LANDLINE: "Landline",
  INSURANCE_PREMIUM: "Insurance Premium",
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DUE", label: "Due" },
  { key: "PAID", label: "Paid" },
  { key: "PROCESSING", label: "Processing" },
  { key: "FAILED", label: "Failed" },
] as const;

type BillFilter = (typeof FILTERS)[number]["key"];

const EMPTY_FORM = {
  billServiceCode: "",
  billerId: "",
  customerBillAccountNumber: "",
  customerMobileNumber: "",
};

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function bucket(bill: ManagedBill): Exclude<BillFilter, "ALL"> | "OTHER" {
  if (bill.lastFetchFailed || bill.billStatus === "FAILED") return "FAILED";
  if (bill.billStatus === "DUE" || bill.billStatus === "PAID" || bill.billStatus === "PROCESSING") {
    return bill.billStatus;
  }
  return "OTHER";
}

export default function ManagedBillsPage() {
  const toast = useToast();
  const router = useRouter();
  const clientId = getUser()?.clientId ?? "";
  const [bills, setBills] = useState<ManagedBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BillFilter>("ALL");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState<ClientBillServiceConfig[]>([]);
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billersLoading, setBillersLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkRowResult[] | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      setBills(await apiFetch<ManagedBill[]>(`/api/v1/clients/${clientId}/managed-bills`));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load managed bills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!form.billServiceCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillers([]);
      return () => {
        cancelled = true;
      };
    }
    setBillersLoading(true);
    apiFetch<Biller[]>(`/api/v1/billers?category=${form.billServiceCode}`)
      .then((data) => {
        if (!cancelled) setBillers(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Failed to load billers");
        }
      })
      .finally(() => {
        if (!cancelled) setBillersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.billServiceCode]);

  async function openModal() {
    setModalOpen(true);
    setForm(EMPTY_FORM);
    if (categories.length > 0) return;
    try {
      const configs = await apiFetch<ClientBillServiceConfig[]>(
        `/api/v1/organisation/clients/${clientId}/bill-services`,
      );
      setCategories(configs.filter((config) => config.enabled));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load enabled bill services",
      );
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/managed-bills`, {
        method: "POST",
        body: form,
      });
      toast.success("Bill created — fetching the latest details now");
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create bill");
    } finally {
      setCreating(false);
    }
  }

  async function downloadTemplate() {
    setTemplateDownloading(true);
    try {
      const response = await trackedFetch(
        `${API_BASE_URL}/api/v1/clients/${clientId}/managed-bills/bulk/template`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, `Download failed with status ${response.status}`),
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "managed-bills-upload-template.xlsx";
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
      const response = await trackedFetch(
        `${API_BASE_URL}/api/v1/clients/${clientId}/managed-bills/bulk`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        },
      );
      if (!response.ok) {
        throw new Error(
          await extractErrorMessage(response, `Upload failed with status ${response.status}`),
        );
      }
      const results = (await response.json()) as BulkRowResult[];
      setBulkResults(results);
      const ok = results.filter((row) => row.success).length;
      toast.success(`${ok}/${results.length} bills created`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setBulkUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bills;
    return bills.filter((bill) => {
      const category = CATEGORY_LABELS[bill.billServiceCode] ?? bill.billServiceName;
      return (
        bill.billerName.toLowerCase().includes(query) ||
        (bill.customerName ?? "").toLowerCase().includes(query) ||
        bill.customerBillAccountNumber.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        bill.billServiceName.toLowerCase().includes(query)
      );
    });
  }, [bills, search]);

  const counts: Record<BillFilter, number> = {
    ALL: searched.length,
    DUE: searched.filter((bill) => bucket(bill) === "DUE").length,
    PAID: searched.filter((bill) => bucket(bill) === "PAID").length,
    PROCESSING: searched.filter((bill) => bucket(bill) === "PROCESSING").length,
    FAILED: searched.filter((bill) => bucket(bill) === "FAILED").length,
  };
  const visible = searched.filter((bill) => filter === "ALL" || bucket(bill) === filter);

  const canCreate =
    form.billServiceCode &&
    form.billerId &&
    form.customerBillAccountNumber.trim().length > 0 &&
    /^\d{10}$/.test(form.customerMobileNumber);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Managed bills"
        description="Every bill you track, showing the latest cycle. Due bills move to My Payments."
        actions={
          <>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={() => {
                setBulkResults(null);
                setBulkModalOpen(true);
              }}
            >
              Bulk upload
            </Button>
            <Button icon={<Plus size={16} />} onClick={openModal}>
              Create bill
            </Button>
          </>
        }
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search biller, customer, or consumer number"
              className={searchClass}
            />
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? "No managed bills" : "No bills match"}
            description={
              bills.length === 0
                ? "Create a bill to start tracking it."
                : "Try another status or clear the search."
            }
            action={
              bills.length === 0 ? (
                <Button icon={<Plus size={16} />} onClick={openModal}>
                  Create bill
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead columns={["Biller", "Customer", "Amount", "Status", "Due", ""]} />
            <TBody>
              {visible.map((bill) => (
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
                        <p className="text-[11px] text-slate-400">
                          {CATEGORY_LABELS[bill.billServiceCode] ?? bill.billServiceName}
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <p className="font-medium text-slate-800">{bill.customerName ?? "—"}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {bill.customerBillAccountNumber}
                    </p>
                  </TD>
                  <TD className="font-mono text-sm font-semibold text-slate-900">
                    {bill.amount != null ? inr(bill.amount) : "—"}
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={bill.billStatus} />
                      {bill.lastFetchFailed && bill.billStatus !== "FAILED" && (
                        <span className="text-[11px] font-medium text-rose-700">Fetch failed</span>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <p className="text-slate-700">{formatDate(bill.dueDate)}</p>
                    <p className="text-[11px] text-slate-400">
                      {bill.lastFetchFailed
                        ? "Fetch failed"
                        : bill.lastFetchAt
                          ? formatWhen(bill.lastFetchAt)
                          : "Not fetched"}
                    </p>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a managed bill"
        description="Created and fetched from the biller right away. Auto-fetch keeps the next cycle up to date."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="create-managed-bill-form" type="submit" loading={creating} disabled={!canCreate}>
              Create bill
            </Button>
          </>
        }
      >
        <form id="create-managed-bill-form" onSubmit={create} className="flex flex-col gap-4">
          <SelectField
            label="Category"
            required
            value={form.billServiceCode}
            onChange={(e) => setForm({ ...form, billServiceCode: e.target.value, billerId: "" })}
          >
            <option value="">Select a category...</option>
            {categories.map((category) => (
              <option key={category.billServiceCode} value={category.billServiceCode}>
                {CATEGORY_LABELS[category.billServiceCode] ?? category.billServiceCode}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Biller"
            required
            disabled={!form.billServiceCode || billersLoading}
            value={form.billerId}
            onChange={(e) => setForm({ ...form, billerId: e.target.value })}
            hint={billersLoading ? "Loading billers..." : undefined}
          >
            <option value="">
              {form.billServiceCode ? "Select a biller..." : "Choose a category first"}
            </option>
            {billers.map((biller) => (
              <option key={biller.billerId} value={biller.billerId}>
                {biller.billerName}
                {biller.state ? ` (${biller.state})` : ""}
              </option>
            ))}
          </SelectField>
          <Field
            label="Consumer number"
            required
            value={form.customerBillAccountNumber}
            onChange={(e) => setForm({ ...form, customerBillAccountNumber: e.target.value })}
            placeholder="e.g. 100234567"
          />
          <Field
            label="Customer mobile number"
            required
            value={form.customerMobileNumber}
            onChange={(e) =>
              setForm({ ...form, customerMobileNumber: e.target.value.replace(/\D/g, "") })
            }
            placeholder="10-digit mobile number"
            maxLength={10}
          />
        </form>
      </Modal>

      <Modal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk upload"
        description="Download the template, fill in category, biller, consumer number, and mobile, then upload it. Each row is created and fetched."
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
