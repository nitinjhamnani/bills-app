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
  Banknote,
  Percent,
  ArrowLeftRight,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, type NavLink } from "@/components/AppShell";
import { apiFetch } from "@/lib/api-client";
import { useSupportUnreadCount } from "@/lib/support-unread";
import { isOrgAdmin, type OrganisationMe, type UserProfile } from "@/lib/types";

const NAV: NavLink[] = [
  { href: "/paytrix/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/paytrix/bill-payments", label: "Bill Payments", icon: Send },
  { href: "/paytrix/corporates", label: "Corporates", icon: Building2, group: "Management" },
  { href: "/paytrix/vendors", label: "Vendors", icon: Store, group: "Management" },
  { href: "/paytrix/manage-wallets", label: "Wallets", icon: Wallet, group: "Management" },
  { href: "/paytrix/users", label: "Users", icon: Users, group: "Management" },
  { href: "/paytrix/bill-dues", label: "Bill Dues", icon: FileText, group: "Corporate" },
  { href: "/paytrix/disputes", label: "Bill Disputes", icon: AlertTriangle, group: "Corporate" },
  { href: "/paytrix/commissions", label: "Commissions", icon: BadgePercent, group: "Vendors" },
  { href: "/paytrix/vendor-payments", label: "Vendor Payments", icon: Banknote, group: "Vendors" },
  { href: "/paytrix/vendor-commissions", label: "Vendor Commissions", icon: Percent, group: "Vendors" },
  { href: "/paytrix/transactions", label: "Transactions", icon: ArrowLeftRight, group: "Platform & Settings" },
  { href: "/paytrix/support-tickets", label: "Support Tickets", icon: LifeBuoy, group: "Platform & Settings" },
  { href: "/paytrix/reports", label: "Reports", icon: BarChart3, group: "Platform & Settings" },
  { href: "/paytrix/settings", label: "Settings", icon: Settings, group: "Platform & Settings" },
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
  const isAdmin = isOrgAdmin(user.role);
  const onSalesPage =
    pathname === "/paytrix/sales" ||
    pathname.startsWith("/paytrix/sales/") ||
    pathname === "/paytrix/profile";
  const adminOnlyBlocked =
    !isAdmin &&
    ["/paytrix/users", "/paytrix/transactions"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  const unread = useSupportUnreadCount(
    sales ? null : "/api/v1/paytrix/support-tickets/unread-summary",
  );
  const [organisationName, setOrganisationName] = useState<string | null>(null);
  const nav = sales
    ? [
        { href: "/paytrix/sales", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/paytrix/sales/reports", label: "Reports", icon: BarChart3 },
      ]
    : NAV.filter(
        (item) =>
          (item.href !== "/paytrix/transactions" && item.href !== "/paytrix/users") || isAdmin,
      ).map(
        (item) => (item.href === "/paytrix/support-tickets" ? { ...item, badge: unread } : item),
      );

  useEffect(() => {
    if (sales && !onSalesPage) router.replace("/paytrix/sales");
    else if (!sales && adminOnlyBlocked) router.replace("/paytrix/dashboard");
  }, [sales, onSalesPage, adminOnlyBlocked, router]);

  useEffect(() => {
    apiFetch<OrganisationMe>("/api/v1/paytrix/me")
      .then((me) => setOrganisationName(me.organisationName))
      .catch(() => setOrganisationName(null));
  }, []);

  if ((sales && !onSalesPage) || (!sales && adminOnlyBlocked)) return null;

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
    <AuthGuard
      portal="PLATFORM"
      allowedRoles={["SUPER_ADMIN", "ORGANISATION_ADMIN", "MAKER", "CHECKER", "VIEWER", "SALES"]}
    >
      {(user) => <OrganisationShell user={user}>{children}</OrganisationShell>}
    </AuthGuard>
  );
}
