import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="text-sm font-bold text-slate-900">PayOps Suite</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            A B2B bill payment workspace for organisations and their clients — fetch bills, fund wallets, and settle with billers from one place.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-900">Company</p>
            <ul className="mt-3 flex flex-col gap-2 text-slate-500">
              <li>
                <Link href="/about" className="hover:text-indigo-700">
                  About
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-indigo-700">
                  Services
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Workspace</p>
            <ul className="mt-3 flex flex-col gap-2 text-slate-500">
              <li>
                <Link href="/login" className="hover:text-indigo-700">
                  Login
                </Link>
              </li>
              <li>
                <span>Platform, organisation, and client access</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400 sm:px-6">
          © {new Date().getFullYear()} PayOps Suite. For authorised organisations and their clients.
        </p>
      </div>
    </footer>
  );
}
