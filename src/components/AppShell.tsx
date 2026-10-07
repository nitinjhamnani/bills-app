"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { UserProfile } from "@/lib/types";
import { UserMenu } from "./UserMenu";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const SIDEBAR_COLLAPSED_KEY = "b2bfintech.sidebarCollapsed";

function isNavActive(pathname: string, href: string) {
  if (href === "/organisation" || href === "/client" || href === "/platform") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  moduleLabel,
  nav,
  children,
}: {
  user: UserProfile;
  moduleLabel: string;
  nav?: NavLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // localStorage unavailable (private mode, etc.) - default to expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // per-viewer convenience only - fine to silently drop.
      }
      return next;
    });
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 font-sans">
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-xs md:hidden"
        />
      )}

      {nav && nav.length > 0 && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex h-dvh flex-col border-r border-slate-200/80 bg-white shadow-xs transition-all duration-200 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            "md:static md:h-full md:translate-x-0",
            collapsed ? "md:w-[76px]" : "w-64 md:w-64",
          )}
        >
          {/* Sidebar Brand Header */}
          <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100">
            {!collapsed && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-xs font-black tracking-wider text-white shadow-sm">
                  B2B
                </span>
                <div className="flex flex-col">
                  <span className="truncate text-sm font-bold tracking-tight text-slate-900 leading-tight">
                    PayOps Suite
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Enterprise
                  </span>
                </div>
              </div>
            )}
            {collapsed && (
              <span className="mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-xs font-black tracking-wider text-white shadow-sm">
                B2B
              </span>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="text-slate-400 hover:text-slate-700 md:hidden"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-1">
              {nav.map((link) => {
                const Icon = link.icon;
                const active = isNavActive(pathname, link.href);
                const badge = link.badge ?? 0;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? link.label : undefined}
                      className={cn(
                        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                        active
                          ? "bg-blue-50/80 text-blue-600 font-bold shadow-2xs"
                          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600" />
                      )}
                      <span className="relative shrink-0">
                        <Icon size={18} className={cn(active ? "text-blue-600" : "text-slate-400")} />
                        {collapsed && badge > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                        )}
                      </span>
                      {!collapsed && (
                        <span className="min-w-0 flex-1 truncate tracking-wide">{link.label}</span>
                      )}
                      {!collapsed && badge > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            className="hidden items-center justify-between border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-700 md:flex transition-colors"
          >
            {collapsed ? (
              <ChevronsRight size={18} className="mx-auto text-slate-400" />
            ) : (
              <>
                <span className="text-[11px] font-medium tracking-wide">Minimize view</span>
                <ChevronsLeft size={16} />
              </>
            )}
          </button>

        </aside>
      )}

      {/* Main Workspace Header & Content */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xs sm:px-6">
          <div className="flex items-center gap-3">
            {nav && nav.length > 0 && (
              <button
                onClick={() => setMobileOpen(true)}
                className="flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-800 md:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-700/10">
                {moduleLabel}
              </span>
            </div>
          </div>

          <UserMenu user={user} pathname={pathname} />
        </header>

        <main className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}





