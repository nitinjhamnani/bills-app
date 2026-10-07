"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  Plus,
  Receipt,
  Search,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { userInitials } from "@/components/UserMenu";
import { StatusBadge, formatStatusLabel } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type {
  BillerService,
  OrganisationSummary,
  PlatformAnalytics,
} from "@/lib/types";

export default function PlatformDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [billerServices, setBillerServices] = useState<BillerService[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [form, setForm] = useState({
    organisationCode: "",
    organisationName: "",
    adminPhoneNumber: "",
    adminName: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [organisationList, catalog, stats] = await Promise.all([
        apiFetch<OrganisationSummary[]>("/api/v1/platform/organisations"),
        apiFetch<BillerService[]>("/api/v1/platform/biller-services"),
        apiFetch<PlatformAnalytics>("/api/v1/platform/analytics"),
      ]);
      setOrganisations(organisationList);
      setBillerServices(catalog);
      setAnalytics(stats);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load platform data",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateOrganisation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/v1/platform/organisations", {
        method: "POST",
        body: form,
      });
      toast.success(`${form.organisationName} onboarded`);
      setForm({
        organisationCode: "",
        organisationName: "",
        adminPhoneNumber: "",
        adminName: "",
      });
      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create organisation",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const query = search.trim().toLowerCase();
  const searchedOrganisations = organisations.filter((org) => {
    if (!query) return true;
    return (
      org.organisationName.toLowerCase().includes(query) ||
      org.organisationCode.toLowerCase().includes(query)
    );
  });
  const statusKeys = [
    "ALL",
    ...Array.from(new Set(organisations.map((org) => org.status))),
  ];
  const visibleOrganisations =
    statusFilter === "ALL"
      ? searchedOrganisations
      : searchedOrganisations.filter((org) => org.status === statusFilter);

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Every organisation on the platform, at a glance."
        actions={
          <>
            <StatusBadge status="PLATFORM_ADMIN" />
            <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              Onboard organisation
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading || !analytics ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Organisations"
              value={analytics.organisationCount}
              icon={Building2}
            />
            <StatCard
              label="Bills paid (all tenants)"
              value={analytics.totalBillsPaid}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="Total GMV"
              value={`₹${analytics.totalGmv.toLocaleString("en-IN")}`}
              icon={IndianRupee}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader
            title="Organisations"
            description="Each organisation is its own tenant, with a first admin who can sign in."
          />
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 px-4 py-3">
            {statusKeys.map((key) => {
              const active = statusFilter === key;
              const count =
                key === "ALL"
                  ? searchedOrganisations.length
                  : searchedOrganisations.filter((org) => org.status === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                    active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {key === "ALL" ? "All" : formatStatusLabel(key)}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      active ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
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
                placeholder="Search by name or code"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          {loading ? (
            <TableSkeleton cols={3} />
          ) : visibleOrganisations.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={organisations.length === 0 ? "No organisations yet" : "No organisations match"}
              description={
                organisations.length === 0
                  ? "Onboard your first organisation to get started."
                  : "Try another status or clear the search."
              }
              action={
                organisations.length === 0 ? (
                  <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
                    Onboard organisation
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <THead columns={["Organisation", "Status", "Created", ""]} />
              <TBody>
                {visibleOrganisations.map((org) => (
                  <TR
                    key={org.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/platform/organisations/${org.id}`)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                          {userInitials(org.organisationName)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/platform/organisations/${org.id}`}
                            className="truncate font-semibold text-slate-900 hover:text-blue-700"
                          >
                            {org.organisationName}
                          </Link>
                          <p className="truncate font-mono text-[11px] font-medium text-slate-500">
                            {org.organisationCode}
                          </p>
                          <p className="truncate font-mono text-[11px] text-slate-400">
                            {org.tenantSchema}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <StatusBadge status={org.status} />
                    </TD>
                    <TD className="text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TD>
                    <TD>
                      <ChevronRight size={16} className="ml-auto text-slate-300" />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Bill-service catalog"
            description="Shared across every organisation; each picks which of these to enable."
          />
          <div className="flex flex-wrap gap-2 p-5 pt-0">
            {billerServices.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-muted px-3 py-1 text-xs text-slate-600"
              >
                <Receipt size={12} />
                {b.serviceName}{" "}
                <span className="text-slate-400">({b.category})</span>
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Onboard an organisation"
        description="Creates the organisation and the first admin who can sign in for it."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              form="create-organisation-form"
              type="submit"
              loading={submitting}
            >
              Create organisation
            </Button>
          </>
        }
      >
        <form
          id="create-organisation-form"
          onSubmit={handleCreateOrganisation}
          className="flex flex-col gap-6"
        >
          <section className="flex flex-col gap-4">
            <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Organisation
            </h3>
            <Field
              label="Organisation name"
              required
              value={form.organisationName}
              onChange={(e) => setForm({ ...form, organisationName: e.target.value })}
              placeholder="Acme Corp Pvt Ltd"
            />
            <Field
              label="Organisation code"
              required
              hint="A short code used to identify this organisation."
              value={form.organisationCode}
              onChange={(e) => setForm({ ...form, organisationCode: e.target.value })}
              placeholder="acmecorp"
            />
          </section>
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                First admin
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                They sign in with this phone and password.
              </p>
            </div>
            <Field
              label="Admin name"
              required
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              placeholder="Jane Doe"
            />
            <Field
              label="Admin phone"
              required
              inputMode="numeric"
              value={form.adminPhoneNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  adminPhoneNumber: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="9876543210"
            />
          </section>
        </form>
      </Modal>
    </>
  );
}
