"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  MessageCircle,
  Send,
  Users,
  ArrowLeftRight,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, type NavLink } from "@/components/AppShell";
import { ClientSupportFab } from "@/components/support/ClientSupportFab";
import { useSupportUnreadCount } from "@/lib/support-unread";
import { apiFetch } from "@/lib/api-client";
import type { ClientAccount, Role, UserProfile } from "@/lib/types";

const VENDOR_NAV: Array<NavLink & { roles?: Role[] }> = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/assigned-bills", label: "My Payments", icon: Send },
  { href: "/vendor/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/vendor/reports", label: "Reports", icon: BarChart3, roles: ["VENDOR_ADMIN"] },
  { href: "/vendor/support", label: "Support", icon: MessageCircle },
  { href: "/vendor/users", label: "Users", icon: Users, roles: ["VENDOR_ADMIN"] },
];

function VendorShell({
  user,
  children,
}: {
  user: UserProfile;
  children: React.ReactNode;
}) {
  const unread = useSupportUnreadCount(
    user.clientId ? `/api/v1/clients/${user.clientId}/support-tickets/unread-summary` : null,
  );
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<ClientAccount | null>(null);

  useEffect(() => {
    apiFetch<ClientAccount>("/api/v1/client/account")
      .then((next) => setAccount(next))
      .catch(() => setAccount(null));
  }, [user.userId]);

  const pending = account?.status === "PENDING";
  useEffect(() => {
    const allowedWhilePending = pathname === "/vendor/dashboard" || pathname === "/vendor/onboarding/esign";
    if (pending && !allowedWhilePending) {
      router.replace("/vendor/dashboard");
    }
  }, [pending, pathname, router]);

  const links =
    account == null || pending
      ? [{ href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : VENDOR_NAV;
  const nav = links
    .filter((item) => !item.roles || item.roles.includes(user.role))
    .map((item) => (item.href === "/vendor/support" ? { ...item, badge: unread } : item));

  return (
    <>
      <AppShell user={user} moduleLabel="Vendor" nav={nav}>
        {account?.status === "SUSPENDED" && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This account is suspended. Paytrix has to reactivate it before you can transact.
          </div>
        )}
        {children}
      </AppShell>
      {!pending && <ClientSupportFab unread={unread} />}
    </>
  );
}

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard portal="VENDOR" allowedRoles={["VENDOR_ADMIN", "VENDOR_OPERATOR"]}>
      {(user) => <VendorShell user={user}>{children}</VendorShell>}
    </AuthGuard>
  );
}
