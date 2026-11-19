"use client";

import { useEffect, useMemo, useState } from "react";
import { Receipt, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";

const SUB_TABS = [{ key: "Electricity", label: "Electricity" }] as const;

type SubTabKey = (typeof SUB_TABS)[number]["key"];

type OperatorRow = {
  id: string;
  name: string;
  detail: string;
  enabled: boolean;
};

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function initials(name: string) {
  const parts = name
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "—";
}

export function EnablementTab({ onCount }: { onCount?: (count: number) => void }) {
  const toast = useToast();
  const currentRole = getUser()?.role;
  const canEdit = currentRole === "SUPER_ADMIN" || currentRole === "ORGANISATION_ADMIN";
  const [subTab, setSubTab] = useState<SubTabKey>("Electricity");
  const [rows, setRows] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load(categoryKey: SubTabKey) {
    setLoading(true);
    try {
      const data = await apiFetch<Array<Record<string, unknown>>>(
        `/api/v1/paytrix/categories/${encodeURIComponent(categoryKey)}/operators`,
      );
      const next = data.map((item) => ({
        id: String(item.operatorId ?? ""),
        name: String(item.name ?? ""),
        detail: String(item.operatorId ?? ""),
        enabled: Boolean(item.enabled),
      }));
      setRows(next);
      onCount?.(next.length);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load operators");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(subTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  async function toggle(row: OperatorRow, enabled: boolean) {
    setPendingId(row.id);
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, enabled } : item)));
    try {
      await apiFetch(
        `/api/v1/paytrix/categories/${encodeURIComponent(subTab)}/operators/${encodeURIComponent(row.id)}`,
        {
          method: "PUT",
          body: { enabled },
        },
      );
      toast.success(`${row.name} ${enabled ? "enabled" : "disabled"}`);
    } catch (err) {
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, enabled: row.enabled } : item)));
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setPendingId(null);
    }
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.detail.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query),
    );
  }, [rows, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {SUB_TABS.map((item) => {
          const active = subTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSubTab(item.key)}
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
                {visible.length}
              </span>
            </button>
          );
        })}
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
              placeholder="Search operator"
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
            title={rows.length === 0 ? "No operators" : "No operators match"}
            description={
              rows.length === 0
                ? "The operators list has not synced yet."
                : "Try another search."
            }
          />
        ) : (
          <Table>
            <THead columns={["Operator", "Status", "Enabled"]} />
            <TBody>
              {visible.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {initials(row.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{row.detail}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge status={row.enabled ? "ENABLED" : "DISABLED"} />
                  </TD>
                  <TD>
                    <Switch
                      checked={row.enabled}
                      disabled={!canEdit || pendingId === row.id}
                      onChange={(checked) => toggle(row, checked)}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>
    </div>
  );
}
