"use client";

import { FileText, Clock, Wallet, History, PieChart, ArrowUpCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportCatalog } from "@/components/reports/ReportCatalog";

export default function ClientReportsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Reports"
        description="Generate and export reports on your bills and wallet activity."
      />
      <ReportCatalog
        sections={[
          {
            title: "Bills",
            items: [
              {
                href: "/client/reports/bill-statement",
                label: "Bill Payment Statement",
                description: "Every bill fetched in a date range, for a chosen status.",
                icon: FileText,
              },
              {
                href: "/client/reports/payment-history",
                label: "Payment History",
                description: "Bills you paid from the wallet, by paid date.",
                icon: History,
              },
              {
                href: "/client/reports/spend-by-service",
                label: "Spend by Service",
                description: "Paid amount grouped by electricity, water, and other services.",
                icon: PieChart,
              },
              {
                href: "/client/reports/outstanding-bills",
                label: "Outstanding Bills",
                description: "Bills fetched but not yet paid, right now.",
                icon: Clock,
              },
            ],
          },
          {
            title: "Wallet",
            items: [
              {
                href: "/client/reports/wallet-statement",
                label: "Wallet Statement",
                description: "Opening/closing balance and every ledger movement in a date range.",
                icon: Wallet,
              },
              {
                href: "/client/reports/top-ups",
                label: "Top-up Requests",
                description: "Funding requests you submitted, by status.",
                icon: ArrowUpCircle,
              },
            ],
          },
        ]}
      />
    </div>
  );
}
