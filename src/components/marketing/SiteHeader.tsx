"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 justify-self-start">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-[11px] font-black tracking-wider text-white shadow-sm">
            B2B
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold tracking-tight text-slate-900">PayOps Suite</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:block">
              Enterprise bill payments
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                isActive(pathname, item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2 justify-self-end">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 text-sm font-semibold text-white shadow-xs hover:from-indigo-800 hover:to-indigo-700"
          >
            Login
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-semibold",
                  isActive(pathname, item.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-700",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-3 text-sm font-semibold text-white"
            >
              Login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
