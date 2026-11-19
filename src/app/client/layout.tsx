"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  GitBranch,
  MessageCircle,
  Receipt,
  Send,
  Users,
  BarChart3,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, type NavLink } from "@/components/AppShell";
import { ClientSupportFab } from "@/components/support/ClientSupportFab";
import { useSupportUnreadCount } from "@/lib/support-unread";
import { apiFetch } from "@/lib/api-client";
import { isVendorUser, type ClientAccount, type Role, type UserProfile } from "@/lib/types";

const CORPORATE_NAV: Array<NavLink & { roles?: Role[] }> = [
  { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/wallet", label: "Wallet", icon: Wallet, roles: ["CLIENT_ADMIN"] },
  { href: "/client/branches", label: "Branches", icon: GitBranch, roles: ["CLIENT_ADMIN"] },
  { href: "/client/managed-bills", label: "Managed Bills", icon: FileText },
  { href: "/client/my-dues", label: "My Dues", icon: Receipt },
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
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const vendorRedirect = isVendorUser(user) || account?.clientType === "VENDOR";
  const branchBlocked =
    user.role === "BRANCH_USER" &&
    ["/client/wallet", "/client/reports", "/client/users", "/client/branches", "/client/rules"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  useEffect(() => {
    if (isVendorUser(user)) {
      router.replace("/vendor/dashboard");
      return;
    }
    apiFetch<ClientAccount>("/api/v1/client/account")
      .then((next) => {
        setAccount(next);
        if (next.clientType === "VENDOR") {
          router.replace("/vendor/dashboard");
        }
      })
      .catch(() => setAccount(null));
  }, [router, user]);

  const pending = account?.status === "PENDING";
  useEffect(() => {
    const allowedWhilePending = pathname === "/client/dashboard" || pathname === "/client/onboarding/esign";
    if (pending && user.role !== "BRANCH_USER" && !allowedWhilePending) {
      router.replace("/client/dashboard");
    }
  }, [pending, pathname, router, user.role]);

  useEffect(() => {
    if (branchBlocked) router.replace("/client/dashboard");
  }, [branchBlocked, router]);

  if (vendorRedirect) return null;

  const links =
    account == null || pending
      ? [{ href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : CORPORATE_NAV;
  const nav = links
    .filter((item) => !item.roles || item.roles.includes(user.role))
    .map((item) => (item.href === "/client/support" ? { ...item, badge: unread } : item));

  return (
    <>
      <AppShell user={user} moduleLabel="Client" nav={nav}>
        {account?.status === "SUSPENDED" && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This account is suspended. Paytrix has to reactivate it before you can transact.
          </div>
        )}
        {branchBlocked ? null : children}
      </AppShell>
      {!pending && <ClientSupportFab unread={unread} />}
    </>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["CLIENT_ADMIN", "CLIENT_OPERATOR", "BRANCH_USER"]}>
      {(user) => <ClientShell user={user}>{children}</ClientShell>}
    </AuthGuard>
  );
}
