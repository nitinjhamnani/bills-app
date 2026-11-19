"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, BadgeCheck, Building2, Store, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportCatalog } from "@/components/reports/ReportCatalog";
import { getUser } from "@/lib/auth";
import { isOrgAdmin } from "@/lib/types";

export default function OrganisationReportsPage() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    setAdmin(isOrgAdmin(getUser()?.role));
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title="Reports" description="Reports for the companies Paytrix serves." />
      <ReportCatalog
        sections={[
          {
            title: "Business",
            items: [
              {
                href: "/paytrix/reports/corporate-business",
                label: "Corporate business",
                description: "Bills each company raised and bills paid to the biller, with amounts.",
                icon: Building2,
              },
              {
                href: "/paytrix/reports/vendor-business",
                label: "Vendor business",
                description: "Bills assigned to each vendor and bills that vendor paid, with amounts.",
                icon: Store,
              },
              {
                href: "/paytrix/reports/sales-business",
                label: "Sales business",
                description: "Bills paid by the companies assigned to each sales person, with a total per person.",
                icon: Users,
              },
            ],
          },
          ...(admin
            ? [
                {
                  title: "Money",
                  items: [
                    {
                      href: "/paytrix/reports/transactions",
                      label: "Transactions",
                      description: "Money in and money out for each What on the Transactions list.",
                      icon: ArrowLeftRight,
                    },
                  ],
                },
              ]
            : []),
          {
            title: "Bills",
            items: [
              {
                href: "/paytrix/reports/verified-vendor-payments",
                label: "Bills Paid",
                description: "Bills a company raised that a vendor paid and Paytrix verified.",
                icon: BadgeCheck,
              },
            ],
          },
        ]}
      />
    </div>
  );
}
