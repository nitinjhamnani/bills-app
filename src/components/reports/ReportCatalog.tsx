"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ReportCatalogItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface ReportCatalogSection {
  title: string;
  items: ReportCatalogItem[];
}

/** The Reports hub: a card grid grouped by category, one card per report - shared by the client,
 * organisation, and platform Reports landing pages so all three look and behave identically. */
export function ReportCatalog({ sections }: { sections: ReportCatalogSection[] }) {
  const router = useRouter();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto pb-2">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {section.title}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="flex min-h-[5.75rem] items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-xs transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
