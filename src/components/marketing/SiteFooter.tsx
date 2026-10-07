import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <p className="text-sm font-bold text-slate-900">{SITE.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            B2B utility bill payments for organisations and companies in India. Fetch electricity, water, gas, broadband, and other bills, fund a wallet, and settle with billers from one workspace.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-slate-900">Company</p>
          <ul className="mt-3 flex flex-col gap-2 text-slate-500">
            <li>
              <Link href="/services" className="hover:text-indigo-700">
                Services
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-indigo-700">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-indigo-700">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-indigo-700">
                Terms and conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-indigo-700">
                Privacy policy
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-slate-900">Contact</p>
          <ul className="mt-3 flex flex-col gap-2 text-slate-500">
            <li>
              <a href={`tel:${SITE.phoneTel}`} className="hover:text-indigo-700">
                {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="break-all hover:text-indigo-700">
                {SITE.email}
              </a>
            </li>
            <li className="leading-relaxed">
              {SITE.addressLines[0]}
              <br />
              {SITE.addressLines[1]}
              <br />
              {SITE.addressLines[2]}
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-slate-900">Workspace</p>
          <ul className="mt-3 flex flex-col gap-2 text-slate-500">
            <li>
              <Link href="/login" className="hover:text-indigo-700">
                Login
              </Link>
            </li>
            <li>Access is issued to authorised organisations and their client companies.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400 sm:px-6">
          © {new Date().getFullYear()} {SITE.name}. B2B utility bill payments for organisations and companies in India.
        </p>
      </div>
    </footer>
  );
}
