"use client";

import { LayoutDashboard, History, BarChart3 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, type NavLink } from "@/components/AppShell";

const NAV: NavLink[] = [
  { href: "/platform", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/reports", label: "Reports", icon: BarChart3 },
  { href: "/platform/audit-log", label: "Audit log", icon: History },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["PLATFORM_ADMIN"]}>
      {(user) => (
        <AppShell user={user} moduleLabel="Platform" nav={NAV}>
          {children}
        </AppShell>
      )}
    </AuthGuard>
  );
}
