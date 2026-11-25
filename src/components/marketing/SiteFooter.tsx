import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="tw-footer-wash border-t border-indigo-200/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.05fr_1fr_1.35fr]">
          {/* Column 1: PLATFORM & SUITE */}
          <div>
            <p className="text-xs font-extrabold tracking-[0.12em] text-indigo-950 uppercase">
              EXPENSE PLATFORM
            </p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-slate-700">
              <li>
                <Link href="/payments" className="hover:text-indigo-700">
                  Expense Suite (FlowPay)
                </Link>
              </li>
              <li>
                <Link href="/payments#spendiq" className="hover:text-indigo-700">
                  SpendIQ Analytics &amp; Audit
                </Link>
              </li>
              <li>
                <Link href="/payments#branchgrid" className="hover:text-indigo-700">
                  BranchGrid Cost Centres
                </Link>
              </li>
              <li>
                <Link href="/corporate-wallets" className="hover:text-indigo-700">
                  Corporate Treasury Wallets
                </Link>
              </li>
              <li>
                <Link href="/gift-cards" className="hover:text-indigo-700">
                  Digital Gift Cards
                </Link>
              </li>
              <li>
                <Link href="/engagement-platform" className="hover:text-indigo-700">
                  Enterprise Spend Cloud
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-indigo-700">
                  Expense Categories &amp; Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: COMPANY & ACCESS */}
          <div>
            <p className="text-xs font-extrabold tracking-[0.12em] text-indigo-950 uppercase">
              COMPANY &amp; LEGAL
            </p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-slate-700">
              <li>
                <Link href="/about" className="hover:text-indigo-700">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-indigo-700">
                  Contact &amp; Book Demo
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-indigo-700">
                  Workspace Login
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-indigo-700">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-indigo-700">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: REGISTERED OFFICE & CONTACT */}
          <div>
            <p className="text-xs font-extrabold tracking-[0.12em] text-indigo-950 uppercase">
              CORPORATE DESK
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-700">
              <a href={`tel:${SITE.phoneTel}`} className="inline-flex items-center gap-2 hover:text-indigo-700">
                <Phone size={15} className="shrink-0 text-indigo-700" />
                {SITE.phoneDisplay}
              </a>
              <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 break-all hover:text-indigo-700">
                <Mail size={15} className="shrink-0 text-indigo-700" />
                {SITE.email}
              </a>
              <div className="inline-flex items-start gap-2 leading-relaxed">
                <MapPin size={15} className="mt-1 shrink-0 text-indigo-700" />
                <span>
                  {SITE.addressLines[0]}, {SITE.addressLines[1]}, {SITE.addressLines[2]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Trust Strip */}
        <div className="mt-10 flex flex-col justify-between gap-6 border-t border-indigo-200/60 pt-6 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-indigo-950">
              © {new Date().getFullYear()} {SITE.name}. Corporate expense &amp; spend management platform.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Disclaimer: At {SITE.name}, we safeguard enterprise financial and operational records with stateful server-side session security, maker–checker dual controls, and strict role isolation across finance, branch, and vendor teams.
            </p>
          </div>

          <div className="shrink-0 md:text-right">
            <div className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-800 to-indigo-600 text-xs font-black text-white shadow-xs">
                Px
              </span>
              <div className="text-left">
                <p className="text-sm font-extrabold leading-tight text-indigo-950">{SITE.name}</p>
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                  <ShieldCheck size={12} /> Audit-Ready Spend Ledger
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
