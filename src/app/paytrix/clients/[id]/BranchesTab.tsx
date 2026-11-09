"use client";

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { ListCard } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface BranchRow {
  id: string;
  name: string;
  code: string | null;
  managedBillCount: number;
  userCount: number;
  status: string;
}

export function BranchesTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<BranchRow[]>(`/api/v1/paytrix/clients/${clientId}/branches`)
      .then((rows) => {
        if (!cancelled) setBranches(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Failed to load branches");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ListCard fitContent={false}>
        {loading ? (
          <TableSkeleton cols={5} />
        ) : branches.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No branches yet"
            description="Branches added by this corporate show up here, with their bills and users."
          />
        ) : (
          <Table>
            <THead columns={["Branch name", "Code", "Managed bills", "Users", "Status"]} />
            <TBody>
              {branches.map((branch) => (
                <TR key={branch.id}>
                  <TD className="font-semibold text-slate-900">{branch.name}</TD>
                  <TD className="font-mono text-xs text-slate-600">{branch.code ?? "—"}</TD>
                  <TD className="font-semibold text-slate-800">{branch.managedBillCount}</TD>
                  <TD className="font-semibold text-slate-800">{branch.userCount}</TD>
                  <TD>
                    <StatusBadge status={branch.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </ListCard>
    </div>
  );
}
