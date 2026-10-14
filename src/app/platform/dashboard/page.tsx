"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, IndianRupee } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { PlatformAnalytics } from "@/lib/types";

export default function PlatformDashboard() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PlatformAnalytics>("/api/v1/platform/analytics")
      .then(setAnalytics)
      .catch((err) =>
        toast.error(err instanceof ApiError ? err.message : "Failed to load platform data"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Activity across every organisation on the platform."
        actions={<StatusBadge status="PLATFORM_ADMIN" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading || !analytics ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Organisations" value={analytics.organisationCount} icon={Building2} />
            <StatCard
              label="Bills paid (all tenants)"
              value={analytics.totalBillsPaid}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="Total GMV"
              value={`₹${analytics.totalGmv.toLocaleString("en-IN")}`}
              icon={IndianRupee}
            />
          </>
        )}
      </div>
    </>
  );
}
