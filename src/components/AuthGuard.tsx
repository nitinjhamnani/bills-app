"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isWorkspaceEnabled } from "@/lib/workspace";
import type { Role, UserProfile } from "@/lib/types";

/**
 * Client-side route guard for the three role-based sections. Real authorization always happens
 * server-side (`@PreAuthorize` on the API) - this just keeps the UI from flashing a screen the
 * signed-in user's role can't use, and bounces unauthenticated visitors to /login.
 */
export function AuthGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: Role[];
  children: (user: UserProfile) => React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    const current = getUser();
    if (!isWorkspaceEnabled || !current || !allowedRoles.includes(current.role)) {
      router.replace("/login");
      return;
    }
    // Deliberate one-time, client-only mount effect: `getUser()` reads localStorage, which isn't
    // available during SSR, so this can't be a lazy useState initializer without risking a
    // hydration mismatch against the server-rendered"Loading..."markup below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
