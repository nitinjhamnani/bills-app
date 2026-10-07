"use client";

import {
  LayoutDashboard,
  Building2,
  FileText,
  Send,
  Wallet,
  AlertTriangle,
  History,
  LifeBuoy,
  Users,
  Settings,
  BarChart3,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, type NavLink } from "@/components/AppShell";
import { useSupportUnreadCount } from "@/lib/support-unread";
import type { UserProfile } from "@/lib/types";

const NAV: NavLink[] = [
  { href: "/organisation", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organisation/clients", label: "Clients", icon: Building2 },
  { href: "/organisation/users", label: "Users", icon: Users },
  { href: "/organisation/managed-bills", label: "Managed Bills", icon: FileText },
  { href: "/organisation/my-payments", label: "My Payments", icon: Send },
  { href: "/organisation/manage-wallets", label: "Manage Wallets", icon: Wallet },
  { href: "/organisation/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/organisation/support-tickets", label: "Support Tickets", icon: LifeBuoy },
  { href: "/organisation/audit-log", label: "Audit log", icon: History },
  { href: "/organisation/reports", label: "Reports", icon: BarChart3 },
  { href: "/organisation/settings", label: "Settings", icon: Settings },
];

function OrganisationShell({
  user,
  children,
}: {
  user: UserProfile;
  children: React.ReactNode;
}) {
  const unread = useSupportUnreadCount("/api/v1/organisation/support-tickets/unread-summary");
  const nav = NAV.map((item) =>
    item.href === "/organisation/support-tickets" ? { ...item, badge: unread } : item,
  );
  return (
    <AppShell user={user} moduleLabel="Organisation" nav={nav}>
      {children}
    </AppShell>
  );
}

export default function OrganisationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["ORGANISATION_ADMIN", "MAKER", "CHECKER", "VIEWER"]}>
      {(user) => <OrganisationShell user={user}>{children}</OrganisationShell>}
    </AuthGuard>
  );
}
