"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ReportPageHeader({
  backHref,
  title,
  description,
  actions,
}: {
  backHref: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <Link
          href={backHref}
          className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-700"
        >
          <ArrowLeft size={13} /> Reports
        </Link>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
        {description && <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
