"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

const EXPENSE_MENU = [
  {
    href: "/payments#flowpay",
    title: "FlowPay",
    sub: "Automated corporate payables, vendor payouts & recurring expenses",
  },
  {
    href: "/payments#spendiq",
    title: "SpendIQ",
    sub: "Real-time expense analytics, policy guardrails & audit ledger",
  },
  {
    href: "/payments#branchgrid",
    title: "BranchGrid",
    sub: "Multi-location cost centres, budgets & maker–checker approvals",
  },
  {
    href: "/corporate-wallets",
    title: "Corporate Treasury Wallets",
    sub: "Ring-fenced prepaid wallets & zero-overdraft spend limits",
  },
  {
    href: "/gift-cards",
    title: "Digital Gift Cards",
    sub: "500+ brand vouchers for employee rewards, gifting & incentives",
  },
];

const DRAWER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/payments", label: "Expense Suite (SpendOS)" },
  { href: "/gift-cards", label: "Digital Gift Cards" },
  { href: "/engagement-platform", label: "Enterprise Spend Cloud" },
  { href: "/corporate-wallets", label: "Corporate Treasury Wallets" },
  { href: "/services", label: "Expense Categories & Services" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suiteOpen, setSuiteOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
    setSuiteOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!suiteOpen) return;
    function handleOutside(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setSuiteOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [suiteOpen]);

  return (
    <>
      <header className="tw-header-wash sticky top-0 z-50 border-b border-indigo-200/60 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          {/* Paytrix Brand Identity — Clean Logo Mark Without Subtext */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-800 via-indigo-700 to-indigo-500 text-xs font-black tracking-wider text-white shadow-sm">
              Px
            </span>
            <span className="text-lg font-extrabold tracking-tight text-indigo-950 sm:text-xl">
              Paytrix
            </span>
          </Link>

          {/* Primary Navigation + Login + Slide-Out Drawer */}
          <div className="flex items-center gap-2 sm:gap-6">
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
              {/* EXPENSE SUITE Dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSuiteOpen((prev) => !prev)}
                  className={cn(
                    "inline-flex min-h-10 cursor-pointer items-center gap-1.5 text-xs font-bold tracking-[0.08em] uppercase transition-colors",
                    pathname.startsWith("/payments") || pathname.startsWith("/corporate-wallets")
                      ? "text-indigo-700"
                      : "text-indigo-950 hover:text-indigo-700",
                  )}
                >
                  EXPENSE SUITE
                  <ChevronDown
                    size={15}
                    className={cn("transition-transform", suiteOpen && "rotate-180")}
                  />
                </button>

                {suiteOpen && (
                  <div className="absolute top-full left-0 mt-3 w-84 rounded-2xl border border-indigo-100 bg-white p-2.5 shadow-xl">
                    {EXPENSE_MENU.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSuiteOpen(false)}
                        className="block rounded-xl px-3.5 py-2.5 transition-colors hover:bg-indigo-50/80"
                      >
                        <p className="text-xs font-bold text-indigo-950">{item.title}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.sub}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/gift-cards"
                className={cn(
                  "text-xs font-bold tracking-[0.08em] uppercase transition-colors",
                  isActive(pathname, "/gift-cards")
                    ? "text-indigo-700"
                    : "text-indigo-950 hover:text-indigo-700",
                )}
              >
                GIFT CARDS
              </Link>

              <Link
                href="/services"
                className={cn(
                  "text-xs font-bold tracking-[0.08em] uppercase transition-colors",
                  isActive(pathname, "/services")
                    ? "text-indigo-700"
                    : "text-indigo-950 hover:text-indigo-700",
                )}
              >
                SERVICES
              </Link>

              <Link
                href="/about"
                className={cn(
                  "text-xs font-bold tracking-[0.08em] uppercase transition-colors",
                  isActive(pathname, "/about")
                    ? "text-indigo-700"
                    : "text-indigo-950 hover:text-indigo-700",
                )}
              >
                ABOUT US
              </Link>
            </nav>

            <Link
              href="/login"
              className="inline-flex min-h-10 items-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 text-xs font-bold tracking-wider text-white uppercase shadow-xs transition-all hover:from-indigo-800 hover:to-indigo-700 sm:px-5"
            >
              Login
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-indigo-950 transition-colors hover:bg-indigo-100/70"
              aria-label="Open navigation menu"
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>

      {/* Right Slide-Out Navigation Drawer (Desktop & Mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs"
          />
          <aside className="relative z-10 flex h-full w-80 max-w-[86vw] flex-col justify-between bg-white p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-xs font-black text-white">
                    Px
                  </span>
                  <span className="text-base font-extrabold text-indigo-950">Paytrix</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={19} />
                </button>
              </div>

              <nav className="mt-5 flex flex-col gap-1" aria-label="All pages">
                {DRAWER_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                      isActive(pathname, item.href)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-indigo-950",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Link
                href="/login"
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 text-sm font-bold text-white shadow-xs hover:from-indigo-800 hover:to-indigo-700"
              >
                Sign in to Workspace
              </Link>
              <p className="mt-2.5 text-center text-[11px] text-slate-400">
                Invitation-only access for Enterprises, Finance Teams &amp; Partners
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
