"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
  /** Match this link only on its own path, not on pages nested under it. */
  exact?: boolean;
  /** Optional sidebar section heading used to group related navigation items. */
  group?: string;
}

const SIDEBAR_COLLAPSED_KEY = "b2bfintech.sidebarCollapsed";

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href.endsWith("/dashboard")) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function portalEyebrow(pathname: string) {
  if (pathname.startsWith("/client")) return "CORPORATE";
  if (pathname.startsWith("/vendor")) return "VENDOR";
  return "ADMIN";
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
            "fixed inset-y-0 left-0 z-40 flex h-dvh flex-col border-r border-slate-200/80 bg-white transition-all duration-200 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            "md:static md:h-full md:translate-x-0",
            collapsed ? "md:w-[76px]" : "w-64 md:w-64",
          )}
        >
          {/* Sidebar Brand Header */}
          <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
            {!collapsed ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-800 to-indigo-600 text-xs font-black tracking-wider text-white shadow-sm">
                  Px
                </span>
                <div className="flex flex-col">
                  <span className="truncate text-sm font-bold leading-tight tracking-tight text-indigo-950">
                    Paytrix
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    {portalEyebrow(pathname)}
                  </span>
                </div>
              </div>
            ) : (
              <span className="mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-800 to-indigo-600 text-xs font-black tracking-wider text-white shadow-xs">
                Px
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

          {/* Navigation Links with Deep Indigo Pill Active State */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-1">
              {nav.map((link, index) => {
                const Icon = link.icon;
                const active = isNavActive(pathname, link.href, link.exact);
                const badge = link.badge ?? 0;
                const prevGroup = index > 0 ? nav[index - 1]?.group : undefined;
                const showGroupHeader = Boolean(link.group && link.group !== prevGroup);
                const showGroupDivider = index > 0 && link.group !== prevGroup;
                return (
                  <li key={link.href}>
                    {showGroupHeader && !collapsed && (
                      <div
                        className={cn(
                          "px-3 pb-1.5 text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase",
                          index > 0 ? "mt-3 border-t border-slate-100 pt-3" : "pt-0.5",
                        )}
                      >
                        {link.group}
                      </div>
                    )}
                    {showGroupDivider && collapsed && (
                      <div className="my-2 h-px bg-slate-100" aria-hidden />
                    )}
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      title={
                        collapsed
                          ? badge > 0
                            ? `${link.label} (${badge})`
                            : link.label
                          : undefined
                      }
                      className={cn(
                        "relative flex min-h-10.5 items-center gap-3 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150",
                        active
                          ? "bg-[#1E1B4B] text-white shadow-sm"
                          : "text-slate-600 hover:bg-indigo-50/60 hover:text-indigo-950",
                        collapsed && "justify-center rounded-xl px-2",
                      )}
                    >
                      <span className="relative shrink-0">
                        <Icon
                          size={17}
                          className={cn(active ? "text-emerald-300" : "text-slate-400")}
                        />
                        {collapsed && badge > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                        )}
                      </span>
                      {!collapsed && (
                        <span className="min-w-0 flex-1 truncate">{link.label}</span>
                      )}
                      {!collapsed && badge > 0 && (
                        <span
                          className={cn(
                            "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                            active ? "bg-indigo-500 text-white" : "bg-rose-500 text-white",
                          )}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      )}

      {/* Main Workspace Header & Content */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {nav && nav.length > 0 && (
              <>
                <button
                  onClick={() => setMobileOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
                  aria-label="Open menu"
                >
                  <Menu size={18} />
                </button>
                <button
                  onClick={toggleCollapsed}
                  className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 md:inline-flex"
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
              </>
            )}

            {moduleLabel ? (
              <span className="max-w-[16rem] truncate rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-700/10 sm:max-w-xs">
                {moduleLabel}
              </span>
            ) : null}
          </div>

          <UserMenu user={user} pathname={pathname} />
        </header>

        <main className="min-h-0 flex-1 overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
