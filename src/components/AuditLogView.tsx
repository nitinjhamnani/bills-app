"use client";

import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { formatStatusLabel, StatusBadge } from "@/components/StatusBadge";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AuditLogEntry } from "@/lib/types";

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanize(value: string) {
  return formatStatusLabel(value.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

export function AuditLogView({
  title,
  description,
  entries,
  loading,
}: {
  title: string;
  description: string;
  entries: AuditLogEntry[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const action = humanize(entry.action).toLowerCase();
      const role = entry.actorRole ? formatStatusLabel(entry.actorRole).toLowerCase() : "";
      const entity = entry.entityType ? humanize(entry.entityType).toLowerCase() : "";
      return (
        action.includes(query) ||
        role.includes(query) ||
        entity.includes(query) ||
        (entry.actorUserId ?? "").toLowerCase().includes(query) ||
        (entry.details ?? "").toLowerCase().includes(query) ||
        (entry.entityId ?? "").toLowerCase().includes(query)
      );
    });
  }, [entries, search]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader title={title} description={description} />
      <ListCard>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor, or details"
              className={searchClass}
            />
          </div>
          <p className="shrink-0 text-xs font-medium text-slate-400">
            {visible.length} {visible.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        {loading ? (
          <TableSkeleton cols={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={History}
            title={entries.length === 0 ? "Nothing recorded yet" : "No entries match"}
            description={
              entries.length === 0
                ? "Money-moving actions will appear here, newest first."
                : "Try another action, role, or detail."
            }
          />
        ) : (
          <Table>
            <THead columns={["When", "Actor", "Action", "Record", "Details"]} />
            <TBody>
              {visible.map((entry, index) => (
                <TR key={`${entry.createdAt}-${index}`}>
                  <TD className="text-slate-500">{formatWhen(entry.createdAt)}</TD>
                  <TD>
                    <div className="flex flex-col items-start gap-1">
                      {entry.actorRole ? (
                        <StatusBadge status={entry.actorRole} />
                      ) : (
                        <span className="text-xs font-medium text-slate-500">System</span>
                      )}
                      {entry.actorUserId ? (
                        <CopyableChip text={entry.actorUserId} label="actor" />
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </div>
                  </TD>
                  <TD className="font-semibold text-slate-900">{humanize(entry.action)}</TD>
                  <TD>
                    <p className="font-medium text-slate-800">
                      {entry.entityType ? humanize(entry.entityType) : "—"}
                    </p>
                    {entry.entityId ? (
                      <CopyableChip text={entry.entityId} label="record id" className="mt-1" />
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-400">—</p>
                    )}
                  </TD>
                  <TD className="max-w-sm whitespace-normal! text-slate-500">
                    {entry.details || "—"}
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
