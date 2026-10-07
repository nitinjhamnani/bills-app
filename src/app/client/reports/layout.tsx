"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function ClientReportsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (getUser()?.role === "CLIENT_OPERATOR") {
      router.replace("/client");
    }
  }, [router]);

  if (getUser()?.role === "CLIENT_OPERATOR") return null;
  return <>{children}</>;
}
