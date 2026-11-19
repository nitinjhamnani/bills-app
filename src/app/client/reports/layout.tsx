"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function ClientReportsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (getUser()?.role !== "CORP_ADMIN") {
      router.replace("/client/dashboard");
    }
  }, [router]);

  if (getUser()?.role !== "CORP_ADMIN") return null;
  return <>{children}</>;
}
