"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Receipt, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
function serviceInitials(name: string) {
  const parts = name
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "S";
}
import { ListCard } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { BillerService, OrganisationBillServiceConfig } from "@/lib/types";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ON", label: "On" },
  { key: "OFF", label: "Off" },
] as const;

type ServiceFilter = (typeof FILTERS)[number]["key"];

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-slate-400">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function BillServicesTab({ onCount }: { onCount?: (count: number) => void }) {
  const toast = useToast();
  const [catalog, setCatalog] = useState<BillerService[]>([]);
  const [configs, setConfigs] = useState<OrganisationBillServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ServiceFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BillerService | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, cfg] = await Promise.all([
        apiFetch<BillerService[]>("/api/v1/organisation/bill-services/catalog"),
        apiFetch<OrganisationBillServiceConfig[]>("/api/v1/organisation/bill-services"),
      ]);
      setCatalog(c);
      setConfigs(cfg);
      onCount?.(c.length);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load bill services",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function isEnabled(code: string) {
    return configs.find((config) => config.billServiceCode === code)?.enabled ?? false;
  }

  async function toggleEnabled(code: string, enabled: boolean) {
    try {
      await apiFetch(`/api/v1/organisation/bill-services/${code}`, {
        method: "PUT",
        body: { enabled },
      });
      toast.success(`${code} ${enabled ? "enabled" : "disabled"}`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    }
  }

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter(
      (service) =>
        service.serviceName.toLowerCase().includes(query) ||
        service.serviceCode.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query),
    );
  }, [catalog, search]);

  const counts = {
    ALL: searched.length,
    ON: searched.filter((service) => isEnabled(service.serviceCode)).length,
    OFF: searched.filter((service) => !isEnabled(service.serviceCode)).length,
  };
  const visible = searched.filter((service) => {
    if (filter === "ON") return isEnabled(service.serviceCode);
    if (filter === "OFF") return !isEnabled(service.serviceCode);
    return true;
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
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
              placeholder="Search service, code, or category"
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
            icon={Receipt}
            title={catalog.length === 0 ? "No bill services" : "No services match"}
            description={
              catalog.length === 0
                ? "The bill-service catalog is empty."
                : "Try another status or clear the search."
            }
          />
        ) : (
          <Table>
            <THead columns={["Service", "Category", "Status", "Enabled", ""]} />
            <TBody>
              {visible.map((service) => {
                const enabled = isEnabled(service.serviceCode);
                return (
                  <TR
                    key={service.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(service)}
                  >
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {serviceInitials(service.serviceName)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{service.serviceName}</p>
                          <p className="font-mono text-[11px] text-slate-400">{service.serviceCode}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-slate-500">{service.category}</TD>
                    <TD>
                      <StatusBadge status={enabled ? "ENABLED" : "DISABLED"} />
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={enabled}
                        onChange={(checked) => toggleEnabled(service.serviceCode, checked)}
                      />
                    </TD>
                    <TD>
                      <ChevronRight size={16} className="ml-auto text-slate-300" />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </ListCard>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Bill service"
        description="Clients can use this service only after it is on here."
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {serviceInitials(selected.serviceName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{selected.serviceName}</p>
                  <p className="font-mono text-[11px] text-slate-400">{selected.serviceCode}</p>
                </div>
              </div>
              <StatusBadge status={isEnabled(selected.serviceCode) ? "ENABLED" : "DISABLED"} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <InfoField label="Category" value={selected.category} />
                <InfoField label="Catalog" value={selected.active ? "Active" : "Inactive"} />
              </dl>
            </div>
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">Available to clients</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Turn this on before enabling it for an individual client.
                </p>
              </div>
              <Switch
                checked={isEnabled(selected.serviceCode)}
                onChange={(checked) => toggleEnabled(selected.serviceCode, checked)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
