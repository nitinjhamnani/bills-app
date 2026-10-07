"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Search } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketConversation, formatTicketWhen } from "@/components/support/TicketConversation";
import { SupportRefreshButton } from "@/components/support/SupportRefreshButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { notifySupportUnreadChanged } from "@/lib/support-unread";
import type { SupportTicket, SupportTicketStatus } from "@/lib/types";

const FILTERS: { key: SupportTicketStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
];

const searchClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20";

export default function ClientSupportPage() {
  const toast = useToast();
  const clientId = getUser()?.clientId ?? "";
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SupportTicketStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const next = await apiFetch<SupportTicket[]>(`/api/v1/clients/${clientId}/support-tickets`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openModal() {
    setSubject("");
    setDescription("");
    setModalOpen(true);
  }

  async function raise(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await apiFetch<SupportTicket>(`/api/v1/clients/${clientId}/support-tickets`, {
        method: "POST",
        body: { subject, description },
      });
      toast.success("Ticket raised — the organisation has been notified");
      setModalOpen(false);
      await load();
      setSelectedId(created.id);
      notifySupportUnreadChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to raise ticket");
    } finally {
      setSubmitting(false);
    }
  }

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter(
      (ticket) =>
        ticket.subject.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Support"
        description="Chat with the organisation until the issue is resolved."
        actions={
          <Button icon={<Plus size={16} />} onClick={openModal}>
            Raise a ticket
          </Button>
        }
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
                    placeholder="Search subject or message"
                    className={searchClass}
                  />
                </div>
                <SupportRefreshButton refreshing={refreshing} onRefresh={() => void refresh()} />
              </div>
            </div>
            {loading ? (
              <div className="flex flex-col gap-3 p-5">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title={tickets.length === 0 ? "No tickets yet" : "No tickets match"}
                description={
                  tickets.length === 0
                    ? "Raise a ticket if something needs the organisation's help."
                    : "Try another status or clear the search."
                }
                action={
                  tickets.length === 0 ? (
                    <Button icon={<Plus size={16} />} onClick={openModal}>
                      Raise a ticket
                    </Button>
                  ) : undefined
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
                          "flex w-full items-start gap-2 border-b border-slate-100 px-4 py-3 text-left transition-colors",
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
            subtitle={formatTicketWhen(selected.createdAt)}
            messagesPath={`/api/v1/clients/${clientId}/support-tickets/${selected.id}/messages`}
            canReply
            onBack={() => setSelectedId(null)}
            onAfterSend={() => void load(true)}
            refreshSignal={refreshSignal}
            headerActions={
              <SupportRefreshButton
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                className="lg:hidden"
              />
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Raise a ticket"
        description="The first message starts the conversation with the organisation."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              form="raise-ticket-form"
              type="submit"
              loading={submitting}
              disabled={!subject.trim() || !description.trim()}
            >
              Raise ticket
            </Button>
          </>
        }
      >
        <form id="raise-ticket-form" onSubmit={raise} className="flex flex-col gap-4">
          <Field
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Bill fetch failing for a consumer number"
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">
              Message <span className="text-rose-500">*</span>
            </span>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened, when, and any bill or consumer number involved"
              className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
