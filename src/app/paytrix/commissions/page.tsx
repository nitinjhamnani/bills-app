"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { RulesTab } from "./RulesTab";

export default function CommissionsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Commissions"
        description="A rule covers one category, provider, and amount range. Vendors on it bid a rate, and the highest live rate is assigned."
      />
      <RulesTab />
    </div>
  );
}
