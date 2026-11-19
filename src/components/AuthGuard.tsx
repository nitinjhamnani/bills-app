"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import {
  bindMountedSession,
  clearSession,
  peekBrowserSession,
  subscribeSessionChanges,
  updateSessionUser,
} from "@/lib/auth";
import { isWorkspaceEnabled } from "@/lib/workspace";
import {
  homeForUser,
  type Portal,
  type Role,
  type SessionResponse,
  type UserProfile,
} from "@/lib/types";

/**
 * Portal and role route guard for Platform (/paytrix), Corporate (/client), and Vendor (/vendor).
 * Keeps one active browser session across tabs, confirms live session validity with the backend,
 * and redirects any cross-portal URL navigation back to the signed-in user's own workspace.
 */
export function AuthGuard({
  portal,
  allowedRoles,
  children,
}: {
  portal: Portal;
  allowedRoles: Role[];
  children: (user: UserProfile) => React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!isWorkspaceEnabled) {
        router.replace("/login");
        return;
      }
      const initial = peekBrowserSession();
      if (!initial) {
        bindMountedSession(null);
        router.replace("/login");
        return;
      }

      bindMountedSession(initial.sessionId);

      try {
        const confirmed = await apiFetch<SessionResponse>("/api/v1/auth/session");
        if (cancelled) return;

        if (confirmed.sessionId !== initial.sessionId) {
          bindMountedSession(null);
          router.replace("/login?reason=session_replaced");
          return;
        }

        updateSessionUser(confirmed.sessionId, confirmed.user);

        if (confirmed.user.portal !== portal || !allowedRoles.includes(confirmed.user.role)) {
          router.replace(homeForUser(confirmed.user));
          return;
        }

        setUser(confirmed.user);
      } catch {
        if (cancelled) return;
        clearSession(initial.sessionId);
        router.replace("/login?reason=session_expired");
      }
    }

    void verify();

    const unsubscribe = subscribeSessionChanges((next) => {
      if (cancelled) return;
      if (!next) {
        bindMountedSession(null);
        setUser(null);
        router.replace("/login");
        return;
      }
      if (next.user.portal !== portal || !allowedRoles.includes(next.user.role)) {
        bindMountedSession(next.sessionId);
        setUser(null);
        router.replace(homeForUser(next.user));
        return;
      }
      bindMountedSession(next.sessionId);
      setUser(next.user);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal, router]);

  if (user === undefined) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background py-24 text-sm text-slate-500">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-accent" />
        Loading...
      </div>
    );
  }
  if (user === null) return null;

  return <>{children(user)}</>;
}
