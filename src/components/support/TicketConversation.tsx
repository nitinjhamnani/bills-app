"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { notifySupportUnreadChanged } from "@/lib/support-unread";
import type { SupportTicketMessage, SupportTicketStatus } from "@/lib/types";

const POLL_MS = 4000;

export function formatTicketWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TicketConversation({
  ticketId,
  subject,
  status,
  subtitle,
  messagesPath,
  canReply,
  pickupRequired = false,
  headerActions,
  onBack,
  onAfterSend,
  refreshSignal = 0,
}: {
  ticketId: string;
  subject: string;
  status: SupportTicketStatus;
  subtitle?: string;
  messagesPath: string;
  canReply: boolean;
  pickupRequired?: boolean;
  headerActions?: React.ReactNode;
  onBack?: () => void;
  onAfterSend?: () => void;
  refreshSignal?: number;
}) {
  const toast = useToast();
  const userId = getUser()?.userId;
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  async function loadMessages(silent = false) {
    if (!silent) setLoading(true);
    try {
      const next = await apiFetch<SupportTicketMessage[]>(messagesPath);
      setMessages(next);
      if (!silent) notifySupportUnreadChanged();
    } catch (err) {
      if (!silent) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load conversation");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    stickToBottom.current = true;
    void loadMessages(false);
    const timer = window.setInterval(() => {
      void loadMessages(true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, messagesPath]);

  useEffect(() => {
    if (!refreshSignal) return;
    void loadMessages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  function onScroll() {
    const node = scrollerRef.current;
    if (!node) return;
    stickToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = body.trim();
    if (!text || sending || !canReply || pickupRequired || status === "RESOLVED") return;
    setSending(true);
    try {
      const created = await apiFetch<SupportTicketMessage>(messagesPath, {
        method: "POST",
        body: { body: text },
      });
      setMessages((current) =>
        current.some((message) => message.id === created.id) ? current : [...current, created],
      );
      setBody("");
      stickToBottom.current = true;
      notifySupportUnreadChanged();
      onAfterSend?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const resolved = status === "RESOLVED";
  const composerEnabled = canReply && !resolved && !pickupRequired;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Back to tickets"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-bold text-slate-900">{subject}</h2>
            <StatusBadge status={status} />
          </div>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        {headerActions && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{headerActions}</div>
        )}
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50/70 px-4 py-4"
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No messages yet.</p>
        ) : (
          messages.map((message) => {
            if (message.authorSide === "SYSTEM") {
              return (
                <div key={message.id} className="flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-xs ring-1 ring-slate-200">
                    {message.body}
                    <span className="ml-2 text-slate-400">{formatTime(message.createdAt)}</span>
                  </span>
                </div>
              );
            }
            const client = message.authorSide === "CLIENT";
            const mine = Boolean(userId && message.authorUserId === userId);
            return (
              <div
                key={message.id}
                className={cn("flex", client ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs sm:max-w-[70%]",
                    client
                      ? "rounded-br-md bg-indigo-600 text-white"
                      : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-semibold",
                      client ? "text-indigo-100" : "text-slate-500",
                    )}
                  >
                    {mine ? "You" : message.authorName}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      client ? "text-indigo-200" : "text-slate-400",
                    )}
                  >
                    {formatTicketWhen(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="shrink-0 border-t border-slate-100 bg-white px-3 py-3">
        {resolved ? (
          <p className="px-1 py-2 text-center text-xs font-medium text-slate-500">
            This ticket is resolved. The conversation is read-only.
          </p>
        ) : !canReply && !pickupRequired ? (
          <p className="px-1 py-2 text-center text-xs font-medium text-slate-500">
            You can read this conversation but cannot reply.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pickupRequired && (
              <p className="px-1 text-xs font-medium text-slate-500">
                Pick up this ticket to send a message.
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={onComposerKeyDown}
                disabled={!composerEnabled}
                placeholder={pickupRequired ? "Pick up the ticket to reply" : "Write a message"}
                className="min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              />
              <Button
                type="submit"
                disabled={!composerEnabled || !body.trim()}
                loading={sending}
                icon={<Send size={16} />}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
