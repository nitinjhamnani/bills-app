"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hash, Receipt, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { ApprovalRulesTab } from "./ApprovalRulesTab";
import { EnablementTab } from "./EnablementTab";
import { RangesTab } from "./RangesTab";

const TABS = [
  { key: "categories", label: "Categories", icon: Receipt },
  { key: "ranges", label: "Amount ranges", icon: Hash },
  { key: "approval-rules", label: "Approval rules", icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_KEYS = TABS.map((t) => t.key) as readonly string[];

export default function OrganisationSettingsPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = TAB_KEYS.includes(requestedTab ?? "")
    ? (requestedTab as TabKey)
    : "categories";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [counts, setCounts] = useState({ categories: 0, ranges: 0, rules: 0 });

  const setCategoryCount = useCallback((categories: number) => {
    setCounts((current) => (current.categories === categories ? current : { ...current, categories }));
  }, []);
  const setRangeCount = useCallback((ranges: number) => {
    setCounts((current) => (current.ranges === ranges ? current : { ...current, ranges }));
  }, []);
  const setRuleCount = useCallback((rules: number) => {
    setCounts((current) => (current.rules === rules ? current : { ...current, rules }));
  }, []);

  const countFor = (key: TabKey) => counts[key === "approval-rules" ? "rules" : key];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Paytrix settings"
        description="Which categories Paytrix can use, the amount ranges commission rules choose from, and when a top-up needs a checker."
      />

      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />
              {item.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-indigo-50 text-indigo-700" : "bg-white/70 text-slate-500",
                )}
              >
                {countFor(item.key)}
              </span>
            </button>
          );
        })}
      </div>

      <div className={tab === "categories" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <EnablementTab onCount={setCategoryCount} />
      </div>
      <div className={tab === "ranges" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <RangesTab onCount={setRangeCount} />
      </div>
      <div className={tab === "approval-rules" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <ApprovalRulesTab onCount={setRuleCount} />
      </div>
    </div>
  );
}
