"use client";

import { Clock, Percent, PieChart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportCatalog } from "@/components/reports/ReportCatalog";

export default function VendorReportsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Reports"
        description="Bills you paid, amounts still due from Paytrix, and commission you paid to Paytrix."
      />
      <ReportCatalog
        sections={[
          {
            title: "Bills",
            items: [
              {
                href: "/vendor/reports/bills-by-category",
                label: "Bills by category",
                description: "Bills you paid, grouped by category, with the total amount.",
                icon: PieChart,
              },
              {
                href: "/vendor/reports/awaiting-platform",
                label: "Awaiting Paytrix",
                description: "Bills you paid that Paytrix has not paid back yet.",
                icon: Clock,
              },
            ],
          },
          {
            title: "Money",
            items: [
              {
                href: "/vendor/reports/commission-paid",
                label: "Commission paid",
                description: "Commission you paid to Paytrix on bills in the period.",
                icon: Percent,
              },
            ],
          },
        ]}
      />
    </div>
  );
}
