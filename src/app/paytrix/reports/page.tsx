"use client";

import { Building2, Send, IndianRupee, Wallet, Clock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportCatalog } from "@/components/reports/ReportCatalog";

export default function OrganisationReportsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Reports"
        description="Generate and export reports across every client Paytrix serves."
      />
      <ReportCatalog
        sections={[
          {
            title: "Clients",
            items: [
              {
                href: "/paytrix/reports/client-portfolio",
                label: "Client Portfolio",
                description: "Every client, wallet balance, outstanding, and lifetime settled volume.",
                icon: Building2,
              },
              {
                href: "/paytrix/reports/gmv-by-client",
                label: "GMV by Client",
                description: "Client-paid and org-settled volume in a date range.",
                icon: TrendingUp,
              },
            ],
          },
          {
            title: "Bills & Settlement",
            items: [
              {
                href: "/paytrix/reports/settlement-pipeline",
                label: "Settlement Register",
                description: "Bills in the settlement queue or settled in a date range.",
                icon: Send,
              },
              {
                href: "/paytrix/reports/aging",
                label: "Aging / Stuck Queue",
                description: "Bills waiting for pick-up or still in process, oldest first.",
                icon: Clock,
              },
            ],
          },
          {
            title: "Wallets & Revenue",
            items: [
              {
                href: "/paytrix/reports/revenue",
                label: "Revenue Report",
                description: "Convenience fee income earned, by client and period.",
                icon: IndianRupee,
              },
              {
                href: "/paytrix/reports/funding",
                label: "Wallet Funding",
                description: "Top-up requests and manual wallet credits in a date range.",
                icon: Wallet,
              },
            ],
          },
        ]}
      />
    </div>
  );
}
