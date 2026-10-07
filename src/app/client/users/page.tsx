"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { UsersTab } from "@/app/organisation/clients/[id]/UsersTab";

export default function ClientUsersPage() {
  const router = useRouter();
  const user = getUser();
  const clientId = user?.clientId ?? "";

  useEffect(() => {
    if (user?.role !== "CLIENT_ADMIN") {
      router.replace("/client");
    }
  }, [router, user?.role]);

  if (!clientId || user?.role !== "CLIENT_ADMIN") return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageHeader
        title="Users"
        description="Add operators for the bill desk. Admins can top up, set auto-pay, and manage staff."
      />
      <UsersTab clientId={clientId} usersPath={`/api/v1/clients/${clientId}/users`} />
    </div>
  );
}
