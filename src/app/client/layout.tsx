"use client";

import {
  LayoutDashboard,
  Wallet,
  FileText,
  MessageCircle,
  Send,
  Users,
  BarChart3,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, type NavLink } from "@/components/AppShell";
import { ClientSupportFab } from "@/components/support/ClientSupportFab";
import { useSupportUnreadCount } from "@/lib/support-unread";
import type { Role, UserProfile } from "@/lib/types";

const NAV: Array<NavLink & { roles?: Role[] }> = [
  { href: "/client", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/wallet", label: "Wallet", icon: Wallet, roles: ["CLIENT_ADMIN"] },
  { href: "/client/managed-bills", label: "Managed Bills", icon: FileText },
  { href: "/client/my-payments", label: "My Payments", icon: Send },
  { href: "/client/support", label: "Support", icon: MessageCircle },
  { href: "/client/reports", label: "Reports", icon: BarChart3, roles: ["CLIENT_ADMIN"] },
  { href: "/client/users", label: "Users", icon: Users, roles: ["CLIENT_ADMIN"] },
];

function ClientShell({
  user,
  children,
}: {
  user: UserProfile;
  children: React.ReactNode;
}) {
  const unread = useSupportUnreadCount(
    user.clientId ? `/api/v1/clients/${user.clientId}/support-tickets/unread-summary` : null,
  );
  const nav = NAV.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) =>
    item.href === "/client/support" ? { ...item, badge: unread } : item,
  );
  return (
    <>
      <AppShell user={user} moduleLabel="Client" nav={nav}>
        {children}
      </AppShell>
      <ClientSupportFab unread={unread} />
    </>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["CLIENT_ADMIN", "CLIENT_OPERATOR"]}>
      {(user) => <ClientShell user={user}>{children}</ClientShell>}
    </AuthGuard>
  );
}
