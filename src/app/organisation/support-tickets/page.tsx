"use client";

import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketConversation, formatTicketWhen } from "@/components/support/TicketConversation";
import { SupportRefreshButton } from "@/components/support/SupportRefreshButton";
import { userInitials } from "@/components/UserMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReasonModal } from "@/components/ui/ReasonModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { notifySupportUnreadChanged } from "@/lib/support-unread";
import type { OrganisationSupportTicket, SupportTicketStatus } from "@/lib/types";

const FILTERS: { key: SupportTicketStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
];

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

export default function OrganisationSupportTicketsPage() {
  const toast = useToast();
  const canAct = getUser()?.role !== "VIEWER";
  const [tickets, setTickets] = useState<OrganisationSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SupportTicketStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const next = await apiFetch<OrganisationSupportTicket[]>("/api/v1/organisation/support-tickets");
      setTickets(next);
      setSelectedId((current) => {
        if (current && next.some((ticket) => ticket.id === current)) return current;
        return current;
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load tickets");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter(
      (ticket) =>
        ticket.subject.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.clientName.toLowerCase().includes(query) ||
        (ticket.clientCode ?? "").toLowerCase().includes(query) ||
        (ticket.raisedBy ?? "").toLowerCase().includes(query) ||
        (ticket.lastMessagePreview ?? "").toLowerCase().includes(query),
    );
  }, [tickets, search]);

  const counts = useMemo(() => {
    const next: Record<string, number> = { ALL: searched.length };
    for (const ticket of searched) next[ticket.status] = (next[ticket.status] ?? 0) + 1;
    return next;
  }, [searched]);

  const visible = filter === "ALL" ? searched : searched.filter((ticket) => ticket.status === filter);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load(true);
      setRefreshSignal((value) => value + 1);
      notifySupportUnreadChanged();
    } finally {
      setRefreshing(false);
    }
  }

  async function pickUp(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/organisation/support-tickets/${id}/pick-up`, { method: "POST" });
      toast.success("Ticket picked up");
      notifySupportUnreadChanged();
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function resolve(notes: string) {
    if (!resolveTarget) return;
    try {
      await apiFetch(`/api/v1/organisation/support-tickets/${resolveTarget}/resolve`, {
        method: "POST",
        body: { resolutionNotes: notes },
      });
      toast.success("Ticket resolved");
      setResolveTarget(null);
      await load(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Support tickets"
        description="Chat with clients, pick a ticket up, then resolve it when it is done."
      />

      <div className={cn("flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1", selected && "hidden lg:flex")}>
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
                {counts[item.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className={cn("flex min-h-0 flex-col", selected ? "hidden w-[420px] shrink-0 lg:flex" : "flex-1")}>
          <ListCard fitContent={false}>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search subject, client, or message"
                    className={searchClass}
                  />
                </div>
                <SupportRefreshButton refreshing={refreshing} onRefresh={() => void refresh()} />
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
                icon={LifeBuoy}
                title={tickets.length === 0 ? "No tickets" : "No tickets match"}
                description={
                  tickets.length === 0
                    ? "Tickets appear here when a client raises an issue."
                    : "Try another status or clear the search."
                }
              />
            ) : (
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {visible.map((ticket) => {
                  const active = ticket.id === selectedId;
                  return (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(ticket.id);
                          if (ticket.unread) {
                            setTickets((current) =>
                              current.map((item) =>
                                item.id === ticket.id ? { ...item, unread: false } : item,
                              ),
                            );
                            notifySupportUnreadChanged();
                          }
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors",
                          active ? "bg-indigo-50" : "hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-2 h-2 w-2 shrink-0 rounded-full",
                            ticket.unread ? "bg-rose-500" : "bg-transparent",
                          )}
                          aria-hidden
                        />
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {userInitials(ticket.clientName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className={cn(
                                "truncate text-sm",
                                ticket.unread ? "font-bold text-slate-900" : "font-semibold text-slate-900",
                              )}
                            >
                              {ticket.subject}
                            </p>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {ticket.clientName}
                            {ticket.clientCode && (
                              <span className="ml-1 font-mono text-slate-400">{ticket.clientCode}</span>
                            )}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-400">
                            {ticket.lastMessagePreview || ticket.description}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatTicketWhen(ticket.lastMessageAt ?? ticket.createdAt)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ListCard>
        </div>

        {selected ? (
          <TicketConversation
            key={`${selected.id}-${selected.status}-${selected.updatedAt}`}
            ticketId={selected.id}
            subject={selected.subject}
            status={selected.status}
            subtitle={`${selected.clientName}${selected.clientCode ? ` (${selected.clientCode})` : ""} · ${formatTicketWhen(selected.createdAt)}`}
            messagesPath={`/api/v1/organisation/support-tickets/${selected.id}/messages`}
            canReply={canAct}
            pickupRequired={canAct && selected.status === "OPEN"}
            onBack={() => setSelectedId(null)}
            onAfterSend={() => void load(true)}
            refreshSignal={refreshSignal}
            headerActions={
              <>
                <SupportRefreshButton
                  refreshing={refreshing}
                  onRefresh={() => void refresh()}
                  className="lg:hidden"
                />
                {canAct && selected.status !== "RESOLVED" ? (
                  selected.status === "OPEN" ? (
                    <Button size="sm" loading={busyId === selected.id} onClick={() => pickUp(selected.id)}>
                      Pick up
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setResolveTarget(selected.id)}>
                      Resolve
                    </Button>
                  )
                ) : null}
              </>
            }
          />
        ) : (
          !loading &&
          visible.length > 0 && (
            <div className="hidden min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400 lg:flex">
              Select a ticket to open the conversation
            </div>
          )
        )}
      </div>

      <ReasonModal
        open={resolveTarget !== null}
        title="Resolve ticket"
        label="Resolution notes"
        confirmLabel="Resolve"
        onCancel={() => setResolveTarget(null)}
        onConfirm={resolve}
      />
    </div>
  );
}
