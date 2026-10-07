"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function ClientSupportFab({ unread }: { unread: number }) {
  const pathname = usePathname();
  if (pathname === "/client/support" || pathname.startsWith("/client/support/")) {
    return null;
  }

  const label = unread > 0 ? `Support, ${unread} unread` : "Support";

  return (
    <Link
      href="/client/support"
      aria-label={label}
      title={label}
      className={cn(
        "fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow-lg shadow-indigo-700/25 ring-4 ring-white transition-transform hover:from-indigo-800 hover:to-indigo-700 hover:scale-[1.03] active:scale-[0.98]",
        "bottom-[max(1.25rem,env(safe-area-inset-bottom))]",
      )}
    >
      {unread > 0 && (
        <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/40" aria-hidden />
      )}
      <MessageCircle size={22} strokeWidth={2} className="relative" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
