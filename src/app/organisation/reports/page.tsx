"use client";

import { Building2, Send, IndianRupee, Wallet, Clock, TrendingUp, History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportCatalog } from "@/components/reports/ReportCatalog";

export default function OrganisationReportsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Reports"
        description="Generate and export reports across every client this organisation serves."
      />
      <ReportCatalog
        sections={[
          {
            title: "Clients",
            items: [
              {
                href: "/organisation/reports/client-portfolio",
                label: "Client Portfolio",
                description: "Every client, wallet balance, outstanding, and lifetime settled volume.",
                icon: Building2,
              },
              {
                href: "/organisation/reports/gmv-by-client",
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
                href: "/organisation/reports/settlement-pipeline",
                label: "Settlement Register",
                description: "Bills in the settlement queue or settled in a date range.",
                icon: Send,
              },
              {
                href: "/organisation/reports/aging",
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
                href: "/organisation/reports/revenue",
                label: "Revenue Report",
                description: "Convenience fee income earned, by client and period.",
                icon: IndianRupee,
              },
              {
                href: "/organisation/reports/funding",
                label: "Wallet Funding",
                description: "Top-up requests and manual wallet credits in a date range.",
                icon: Wallet,
              },
            ],
          },
          {
            title: "Controls",
            items: [
              {
                href: "/organisation/audit-log",
                label: "Audit Extract",
                description: "Money-moving actions with a date range and Excel export.",
                icon: History,
              },
            ],
          },
        ]}
      />
    </div>
  );
}
