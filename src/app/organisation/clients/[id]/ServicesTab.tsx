"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type ClientCategory = {
  categoryId: string;
  name: string;
  enabled: boolean;
};

export function ServicesTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await apiFetch<ClientCategory[]>(
        `/api/v1/organisation/clients/${clientId}/categories`,
      );
      setCategories(rows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function toggleEnabled(category: ClientCategory, enabled: boolean) {
    setPendingId(category.categoryId);
    setCategories((current) =>
      current.map((row) => (row.categoryId === category.categoryId ? { ...row, enabled } : row)),
    );
    try {
      await apiFetch(`/api/v1/organisation/clients/${clientId}/categories/${encodeURIComponent(category.categoryId)}`, {
        method: "PUT",
        body: { enabled },
      });
      toast.success(`${category.name} ${enabled ? "enabled" : "disabled"} for this client`);
    } catch (err) {
      setCategories((current) =>
        current.map((row) => (row.categoryId === category.categoryId ? { ...row, enabled: category.enabled } : row)),
      );
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader
        title="Categories"
        description="Categories turned on for the organisation are on for this client until you switch one off."
      />
      {loading ? (
        <TableSkeleton cols={2} />
      ) : categories.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">
          No categories are enabled for the organisation yet. Enable one under Settings, then Categories.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <THead columns={["Category", "Enabled"]} />
            <TBody>
              {categories.map((category) => (
                <TR key={category.categoryId}>
                  <TD className="font-medium text-slate-900">{category.name}</TD>
                  <TD>
                    <Switch
                      checked={category.enabled}
                      disabled={pendingId === category.categoryId}
                      onChange={(checked) => toggleEnabled(category, checked)}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
