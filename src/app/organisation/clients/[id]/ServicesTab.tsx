"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardHeader } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Field";
import { Table, THead, TBody, TR, TD } from "@/components/ui/Table";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { ClientBillServiceConfig, OrganisationBillServiceConfig } from "@/lib/types";

export function ServicesTab({ clientId }: { clientId: string }) {
  const toast = useToast();
  const [organisationServices, setOrganisationServices] = useState<
    OrganisationBillServiceConfig[]
  >([]);
  const [clientServices, setClientServices] = useState<
    ClientBillServiceConfig[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        apiFetch<OrganisationBillServiceConfig[]>("/api/v1/organisation/bill-services"),
        apiFetch<ClientBillServiceConfig[]>(
          `/api/v1/organisation/clients/${clientId}/bill-services`,
        ),
      ]);
      // Only services the organisation itself has switched on can be turned on for a client -
      // matches the backend check in ClientBillServiceConfigService.
      setOrganisationServices(c.filter((service) => service.enabled));
      setClientServices(a);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to load client configuration",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function toggleEnabled(code: string, enabled: boolean) {
    try {
      await apiFetch(
        `/api/v1/organisation/clients/${clientId}/bill-services/${code}/status`,
        { method: "PATCH", body: { enabled } },
      );
      toast.success(`${code} ${enabled ? "enabled" : "disabled"} for this client`);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update status",
      );
    }
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader
        title="Bill services"
        description="Only services enabled organisation-wide (Settings > Bill services) can be turned on here."
      />
      {loading ? (
        <TableSkeleton cols={2} />
      ) : organisationServices.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">
          No bill services are enabled for the organisation yet. Enable one under
          Settings &rarr; Bill services first.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <THead columns={["Service", "Enabled"]} />
            <TBody>
              {organisationServices.map((service) => {
                const existing = clientServices.find(
                  (a) => a.billServiceCode === service.billServiceCode,
                );
                return (
                  <TR key={service.billServiceCode}>
                    <TD className="font-medium text-slate-900">
                      {service.billServiceName}
                    </TD>
                    <TD>
                      <Switch
                        checked={existing?.enabled ?? false}
                        onChange={(checked) =>
                          toggleEnabled(service.billServiceCode, checked)
                        }
                      />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
