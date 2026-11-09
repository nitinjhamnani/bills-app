"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Store,
  FileText,
  Send,
  Wallet,
  AlertTriangle,
  LifeBuoy,
  Users,
  Settings,
  BarChart3,
  BadgePercent,
  Receipt,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, type NavLink } from "@/components/AppShell";
import { apiFetch } from "@/lib/api-client";
import { useSupportUnreadCount } from "@/lib/support-unread";
import type { OrganisationMe, UserProfile } from "@/lib/types";

const NAV: NavLink[] = [
  { href: "/paytrix/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/paytrix/corporates", label: "Corporates", icon: Building2 },
  { href: "/paytrix/vendors", label: "Vendors", icon: Store },
  { href: "/paytrix/commissions", label: "Commissions", icon: BadgePercent },
  { href: "/paytrix/users", label: "Users", icon: Users },
  { href: "/paytrix/managed-bills", label: "Managed Bills", icon: FileText },
  { href: "/paytrix/my-payments", label: "My Payments", icon: Send },
  { href: "/paytrix/settlements", label: "Settlements", icon: Receipt },
  { href: "/paytrix/manage-wallets", label: "Manage Wallets", icon: Wallet },
  { href: "/paytrix/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/paytrix/support-tickets", label: "Support Tickets", icon: LifeBuoy },
  { href: "/paytrix/reports", label: "Reports", icon: BarChart3 },
  { href: "/paytrix/settings", label: "Settings", icon: Settings },
];

function OrganisationShell({
  user,
  children,
}: {
  user: UserProfile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sales = user.role === "SALES";
  const onSalesPage = pathname === "/paytrix/sales" || pathname.startsWith("/paytrix/sales/");
  const unread = useSupportUnreadCount(
    sales ? null : "/api/v1/paytrix/support-tickets/unread-summary",
  );
  const [organisationName, setOrganisationName] = useState<string | null>(null);
  const nav = sales
    ? [
        { href: "/paytrix/sales", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/paytrix/sales/reports", label: "Reports", icon: BarChart3 },
      ]
    : NAV.map((item) =>
        item.href === "/paytrix/support-tickets" ? { ...item, badge: unread } : item,
      );

  useEffect(() => {
    if (sales && !onSalesPage) router.replace("/paytrix/sales");
  }, [sales, onSalesPage, router]);

  useEffect(() => {
    apiFetch<OrganisationMe>("/api/v1/paytrix/me")
      .then((me) => setOrganisationName(me.organisationName))
      .catch(() => setOrganisationName(null));
  }, []);

  if (sales && !onSalesPage) return null;

  return (
    <AppShell user={user} moduleLabel={organisationName ?? ""} nav={nav}>
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
    <AuthGuard allowedRoles={["ORGANISATION_ADMIN", "MAKER", "CHECKER", "VIEWER", "SALES"]}>
      {(user) => <OrganisationShell user={user}>{children}</OrganisationShell>}
    </AuthGuard>
  );
}
