"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  Ban,
  Building2,
  Calendar,
  Check,
  Copy,
  Hash,
  Info,
  LayoutDashboard,
  Mail,
  Pencil,
  Phone,
  Receipt,
  RotateCcw,
  Settings,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { OnboardingTracker } from "@/components/OnboardingTracker";
import { StatusBadge } from "@/components/StatusBadge";
import { onboardingStatus } from "@/lib/onboarding-status";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { Client, CorporateKind } from "@/lib/types";
import { VendorOverviewTab } from "./VendorOverviewTab";
import { VendorTransactionsTab } from "@/app/paytrix/clients/[id]/VendorTransactionsTab";
import { UsersTab } from "@/app/paytrix/clients/[id]/UsersTab";
import { CommissionsTab } from "@/app/paytrix/commissions/CommissionsTab";

const VENDOR_TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "rules", label: "Commissions", icon: BadgePercent },
  { key: "users", label: "Users", icon: Users },
] as const;

const ABOUT_TAB = { key: "about", label: "About", icon: Info } as const;

type TabKey = (typeof VENDOR_TABS)[number]["key"] | "about";

const TAB_KEYS: readonly string[] = [
  ...VENDOR_TABS.map((t) => t.key),
  ABOUT_TAB.key,
];

function vendorInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "V";
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

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const requestedTab = searchParams.get("tab");
  const initialTab = TAB_KEYS.includes(requestedTab ?? "")
    ? (requestedTab as TabKey)
    : "overview";

  const [vendor, setVendor] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedContactField, setCopiedContactField] = useState<"email" | "phone" | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<CorporateKind>("COMPANY");
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const currentRole = getUser()?.role;
    setIsAdmin(currentRole === "SUPER_ADMIN" || currentRole === "ORGANISATION_ADMIN");
  }, []);

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

  async function loadVendor() {
    setLoading(true);
    try {
      const data = await apiFetch<Client>(`/api/v1/paytrix/clients/${vendorId}`);
      if (data.clientType === "CORPORATE") {
        router.replace(`/paytrix/clients/${vendorId}`);
        return;
      }
      setVendor(data);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load vendor",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  function openEditModal() {
    if (!vendor) return;
    setEditName(vendor.clientName);
    setEditKind(vendor.corporateKind ?? "COMPANY");
    setEditContactName(vendor.contactPersonName ?? "");
    setEditContactEmail(vendor.contactEmail ?? "");
    setEditContactPhone(vendor.contactPhone ?? "");
    setMenuOpen(false);
    setEditOpen(true);
  }

  async function saveEditDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!vendor) return;
    setSavingEdit(true);
    try {
      const updated = await apiFetch<Client>(`/api/v1/paytrix/clients/${vendorId}`, {
        method: "PATCH",
        body: {
          clientName: editName.trim(),
          corporateKind: editKind,
          contactPersonName: editContactName.trim(),
          contactEmail: editContactEmail.trim(),
          contactPhone: editContactPhone.trim(),
        },
      });
      setVendor(updated);
      setEditOpen(false);
      toast.success("Vendor details updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update vendor details");
    } finally {
      setSavingEdit(false);
    }
  }

  async function setStatus(status: "ACTIVE" | "SUSPENDED" | "TERMINATED") {
    setBusy(true);
    setMenuOpen(false);
    try {
      await apiFetch(`/api/v1/paytrix/clients/${vendorId}/status`, {
        method: "PATCH",
        body: { status },
      });
      toast.success(`Vendor ${status.toLowerCase()}`);
      setTerminateOpen(false);
      await loadVendor();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function advanceOnboarding(step: "kyc-complete" | "contract-signed" | "activate") {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/paytrix/onboarding/${vendorId}/${step}`, {
        method: "POST",
      });
      toast.success(
        step === "kyc-complete"
          ? "Business verification marked complete"
          : step === "contract-signed"
            ? "Agreement marked signed — ready to mark as active"
            : "Vendor marked as active — you can now create the admin user",
      );
      await loadVendor();
      if (step === "activate") {
        setTab("overview");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Onboarding update failed");
    } finally {
      setBusy(false);
    }
  }

  const name = loading ? "Loading…" : (vendor?.clientName ?? "Vendor");
  const awaitingActivation = vendor?.status === "PENDING";
  const tabs = awaitingActivation ? [ABOUT_TAB] : VENDOR_TABS;
  const shownTab: TabKey = awaitingActivation
    ? "about"
    : tabs.some((item) => item.key === tab)
      ? tab
      : tabs[0].key;
  const listedStatus = vendor ? onboardingStatus(vendor) : null;
  const typeLabel = vendor?.corporateKind === "INDIVIDUAL" ? "Individual" : "Company";
  const TypeIcon = vendor?.corporateKind === "INDIVIDUAL" ? UserRound : Building2;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href="/paytrix/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Vendors
          </Link>

          {isAdmin && vendor && vendor.status !== "TERMINATED" && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Vendor actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
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
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} className="text-slate-400" />
                    Edit vendor details
                  </button>
                  {vendor.status !== "PENDING" && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={() =>
                        setStatus(vendor.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")
                      }
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {vendor.status === "ACTIVE" ? (
                        <>
                          <Ban size={14} className="text-amber-500" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <RotateCcw size={14} className="text-emerald-600" />
                          Reactivate
                        </>
                      )}
                    </button>
                  )}
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setTerminateOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                    Terminate
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-2xs">
              {vendor ? vendorInitials(vendor.clientName) : "…"}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                  {name}
                </h1>
                {vendor && (
                  <button
                    type="button"
                    onClick={async () => {
                      const code = vendor.clientCode ?? vendor.id;
                      try {
                        await navigator.clipboard.writeText(code);
                        setCopiedId(true);
                        toast.success(`Copied ${code}`);
                        setTimeout(() => setCopiedId(false), 1500);
                      } catch {
                        toast.error("Could not copy ID");
                      }
                    }}
                    title="Copy ID"
                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
                  >
                    <Hash size={12} className="text-slate-400 group-hover:text-blue-500" />
                    <span>{vendor.clientCode ?? vendor.id}</span>
                    {copiedId ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-blue-600" />
                    )}
                  </button>
                )}
              </div>
              {vendor && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/70">
                    <TypeIcon size={12} className="text-indigo-500" />
                    {typeLabel}
                  </span>
                  <StatusBadge status={listedStatus?.code ?? vendor.status} label={listedStatus?.label} />
                </div>
              )}
            </div>
          </div>

          {vendor && (
            <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
                {vendor.contactPersonName && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={13.5} className="text-slate-400" />
                    <span className="font-semibold text-slate-700">{vendor.contactPersonName}</span>
                  </span>
                )}
                {vendor.contactEmail && (
                  <button
                    type="button"
                    title="Copy email"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(vendor.contactEmail!);
                        setCopiedContactField("email");
                        toast.success(`Copied ${vendor.contactEmail}`);
                        setTimeout(() => setCopiedContactField(null), 1500);
                      } catch {
                        toast.error("Could not copy email");
                      }
                    }}
                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Mail size={13.5} className="text-slate-400 group-hover:text-indigo-500" />
                    <span>{vendor.contactEmail}</span>
                    {copiedContactField === "email" ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                    )}
                  </button>
                )}
                {vendor.contactPhone && (
                  <button
                    type="button"
                    title="Copy phone"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(vendor.contactPhone!);
                        setCopiedContactField("phone");
                        toast.success(`Copied ${vendor.contactPhone}`);
                        setTimeout(() => setCopiedContactField(null), 1500);
                      } catch {
                        toast.error("Could not copy phone");
                      }
                    }}
                    className="group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Phone size={13.5} className="text-slate-400 group-hover:text-indigo-500" />
                    <span>{vendor.contactPhone}</span>
                    {copiedContactField === "phone" ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-slate-400 transition-colors group-hover:text-indigo-600" />
                    )}
                  </button>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5 self-end text-xs font-medium text-slate-400 sm:self-auto">
                <Calendar size={13} className="text-slate-400" />
                <span>{formatDateTime(vendor.createdAt)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!loading && (
        <div className="mb-4 flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = shownTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {!loading && (
        <div className="flex min-h-0 flex-1 flex-col">
          {shownTab === "about" && vendor && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Onboarding &amp; activation</h2>
                  <p className="mt-1 mb-5 text-xs text-slate-500">
                    Complete business verification and agreement signing, then mark the vendor as active to create the admin user.
                  </p>
                </div>
                {isAdmin && vendor.status === "PENDING" && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {vendor.kycStatus !== "COMPLETE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy}
                        onClick={() => advanceOnboarding("kyc-complete")}
                      >
                        Mark verification complete
                      </Button>
                    )}
                    {vendor.kycStatus === "COMPLETE" && vendor.contractStatus !== "SIGNED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy}
                        onClick={() => advanceOnboarding("contract-signed")}
                      >
                        Mark agreement signed
                      </Button>
                    )}
                    {vendor.kycStatus === "COMPLETE" && vendor.contractStatus === "SIGNED" && (
                      <Button
                        size="sm"
                        loading={busy}
                        onClick={() => advanceOnboarding("activate")}
                      >
                        Mark as active
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <OnboardingTracker
                kind={vendor.corporateKind}
                companyDone={vendor.detailsSubmitted ?? false}
                kycDone={vendor.kycStatus === "COMPLETE"}
                contractDone={vendor.contractStatus === "SIGNED"}
              />
            </div>
          )}
          {shownTab === "overview" && (
            <VendorOverviewTab vendorId={vendorId} vendor={vendor} />
          )}
          {shownTab === "transactions" && <VendorTransactionsTab clientId={vendorId} />}
          {shownTab === "rules" && <CommissionsTab vendorId={vendorId} />}
          {shownTab === "users" && <UsersTab clientId={vendorId} />}
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit vendor details"
        description="Update the display name, vendor type, or contact details."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-vendor-details-form"
              loading={savingEdit}
              disabled={!editName.trim()}
            >
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-vendor-details-form" onSubmit={saveEditDetails} className="flex flex-col gap-4">
          <Field
            label="Vendor name"
            required
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
          <SelectField
            label="Vendor type"
            value={editKind}
            onChange={(event) => setEditKind(event.target.value as CorporateKind)}
          >
            <option value="COMPANY">Company</option>
            <option value="INDIVIDUAL">Individual</option>
          </SelectField>
          <Field
            label="Contact person name"
            value={editContactName}
            onChange={(event) => setEditContactName(event.target.value)}
            placeholder="Rahul Sharma"
          />
          <Field
            label="Contact person email"
            type="email"
            value={editContactEmail}
            onChange={(event) => setEditContactEmail(event.target.value)}
            placeholder="rahul@harborutilities.com"
          />
          <Field
            label="Contact person phone"
            inputMode="numeric"
            maxLength={10}
            value={editContactPhone}
            onChange={(event) =>
              setEditContactPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="9111111111"
          />
        </form>
      </Modal>

      <Modal
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title="Terminate this vendor?"
        description="This is permanent - the vendor can no longer log in or settle assigned bills. Its history is kept for records."
        footer={
          <>
            <Button variant="outline" onClick={() => setTerminateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => setStatus("TERMINATED")}
            >
              Terminate vendor
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {vendor?.clientName} will be marked terminated. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
