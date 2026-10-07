"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Percent, Receipt, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { BillServicesTab } from "./BillServicesTab";
import { ApprovalRulesTab } from "./ApprovalRulesTab";
import { FeeConfigTab } from "./FeeConfigTab";

const TABS = [
  { key: "bill-services", label: "Bill services", icon: Receipt },
  { key: "approval-rules", label: "Approval rules", icon: ShieldCheck },
  { key: "fees", label: "Fees", icon: Percent },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAB_KEYS = TABS.map((t) => t.key) as readonly string[];

export default function OrganisationSettingsPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = TAB_KEYS.includes(requestedTab ?? "")
    ? (requestedTab as TabKey)
    : "bill-services";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [counts, setCounts] = useState({ services: 0, rules: 0, fees: 0 });

  const setServiceCount = useCallback((services: number) => {
    setCounts((current) => (current.services === services ? current : { ...current, services }));
  }, []);
  const setRuleCount = useCallback((rules: number) => {
    setCounts((current) => (current.rules === rules ? current : { ...current, rules }));
  }, []);
  const setFeeCount = useCallback((fees: number) => {
    setCounts((current) => (current.fees === fees ? current : { ...current, fees }));
  }, []);

  const countFor = (key: TabKey) =>
    key === "bill-services" ? counts.services : key === "approval-rules" ? counts.rules : counts.fees;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Organisation settings"
        description="Which bill services clients can use, when a top-up needs a checker, and the convenience fee on a bill."
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

      <div className={tab === "bill-services" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <BillServicesTab onCount={setServiceCount} />
      </div>
      <div className={tab === "approval-rules" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <ApprovalRulesTab onCount={setRuleCount} />
      </div>
      <div className={tab === "fees" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <FeeConfigTab onCount={setFeeCount} />
      </div>
    </div>
  );
}
