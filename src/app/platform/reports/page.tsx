"use client";

import { Building2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportCatalog } from "@/components/reports/ReportCatalog";

export default function PlatformReportsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Reports"
        description="Generate and export reports across every organisation on the platform."
      />
      <ReportCatalog
        sections={[
          {
            title: "Organisations",
            items: [
              {
                href: "/platform/reports/organisations",
                label: "Organisation Portfolio",
                description: "Every organisation, status, headcount, and lifetime GMV.",
                icon: Building2,
              },
              {
                href: "/platform/reports/gmv",
                label: "Platform GMV",
                description: "Bill value settled in a date range, broken down by organisation.",
                icon: TrendingUp,
              },
            ],
          },
        ]}
      />
    </div>
  );
}
