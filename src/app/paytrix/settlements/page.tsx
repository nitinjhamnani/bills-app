"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettlementsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/paytrix/vendor-payments");
  }, [router]);
  return null;
}
