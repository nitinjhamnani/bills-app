"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { StatusBadge } from "@/components/StatusBadge";
import type { UserProfile } from "@/lib/types";

export function userInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

function profileHref(pathname: string) {
  if (pathname.startsWith("/platform")) return "/platform/profile";
  if (pathname.startsWith("/client")) return "/client/profile";
  return "/organisation/profile";
}

export function UserMenu({
  user,
  pathname,
}: {
  user: UserProfile;
  pathname: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const name = user.displayName || user.phoneNumber;
  const href = profileHref(pathname);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 items-center gap-1.5 rounded-full py-1 pr-1 pl-1 text-left hover:bg-slate-50 sm:pr-2"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {userInitials(name)}
        </span>
        <ChevronDown
          size={14}
          className={cn("hidden text-slate-400 sm:block", open && "rotate-180")}
        />
      </button>

      {open &&
        menuPos &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 90 }}
          className="w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {userInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <p className="truncate font-mono text-[11px] text-slate-500">{user.phoneNumber}</p>
              <div className="mt-1.5">
                <StatusBadge status={user.role} />
              </div>
            </div>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <Link
            role="menuitem"
            href={href}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50",
              pathname === href && "bg-blue-50 text-blue-700",
            )}
          >
            <UserRound size={16} className="text-slate-400" />
            My profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>,
        document.body,
        )}
    </div>
  );
}
