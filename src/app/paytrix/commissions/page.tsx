"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { CommissionsTab } from "./CommissionsTab";

export default function CommissionsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Commissions"
        description="Each commission is one vendor's rate for an operator and amount range. A paid bill goes to the vendor with the highest approved, active commission that covers it."
      />
      <CommissionsTab />
    </div>
  );
}
