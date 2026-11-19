"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function VendorReportsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (getUser()?.role !== "CLIENT_ADMIN") {
      router.replace("/vendor/dashboard");
    }
  }, [router]);

  if (getUser()?.role !== "CLIENT_ADMIN") return null;
  return <>{children}</>;
}
