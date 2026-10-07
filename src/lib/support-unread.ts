import { useEffect, useState } from "react";
import { apiFetch } from "./api-client";

export const SUPPORT_UNREAD_EVENT = "support-unread-changed";

export function notifySupportUnreadChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SUPPORT_UNREAD_EVENT));
}

export function useSupportUnreadCount(path: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!path) return;
    const activePath = path;
    let cancelled = false;

    async function load() {
      try {
        const res = await apiFetch<{ unreadTicketCount: number }>(activePath);
        if (!cancelled) setCount(res.unreadTicketCount);
      } catch {
        // Nav badge is best-effort; a failed poll should not take over the page.
      }
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 15000);
    window.addEventListener(SUPPORT_UNREAD_EVENT, load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(SUPPORT_UNREAD_EVENT, load);
    };
  }, [path]);

  return count;
}
