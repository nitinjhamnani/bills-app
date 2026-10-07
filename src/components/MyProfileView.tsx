"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { formatStatusLabel } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { userInitials } from "@/components/UserMenu";
import type { UserProfile } from "@/lib/types";

export function MyProfileView() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getUser());
  }, []);

  if (!user) return null;

  const name = user.displayName || user.phoneNumber;

  return (
    <div>
      <PageHeader
        title="My profile"
        description="The account you are signed in with."
      />
      <Card className="max-w-xl p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white">
            {userInitials(name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{formatStatusLabel(user.role)}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium text-slate-400">Phone</dt>
            <dd className="mt-1 font-mono text-sm font-medium text-slate-900">{user.phoneNumber}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-slate-400">Role</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatStatusLabel(user.role)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
