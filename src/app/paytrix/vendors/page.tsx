"use client";

import { ClientDirectory } from "@/app/paytrix/clients/ClientDirectory";

export default function VendorsPage() {
  return <ClientDirectory clientType="VENDOR" />;
}
