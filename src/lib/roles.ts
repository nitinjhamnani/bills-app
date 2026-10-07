/** Organisation-side roles and what each one can actually do, mirrored from the tenant schema's role
 * seed data - this is the real permission boundary (enforced via @PreAuthorize on the backend),
 * not a separate fine-grained permission system. */
export const ORGANISATION_ROLES = [
  {
    value: "ORGANISATION_ADMIN",
    label: "Organisation Admin",
    description: "Full control: organisation settings, clients, users, RBAC and reports.",
  },
  {
    value: "MAKER",
    label: "Maker",
    description: "Can initiate bill payments and other money-moving actions.",
  },
  {
    value: "CHECKER",
    label: "Checker",
    description: "Approves maker-initiated financial actions (maker-checker).",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only access to organisation data.",
  },
] as const;

export const CLIENT_ROLES = [
  {
    value: "CLIENT_ADMIN",
    label: "Client Admin",
    description: "Full access: staff, wallet top-up, auto-pay, bills, payments, disputes, and tickets.",
  },
  {
    value: "CLIENT_OPERATOR",
    label: "Client Operator",
    description: "Register bills, fetch, pay, and open tickets. Cannot manage staff, auto-pay, or top-up.",
  },
] as const;

export function roleDescription(role: string): string | undefined {
  return (
    ORGANISATION_ROLES.find((r) => r.value === role)?.description ??
    CLIENT_ROLES.find((r) => r.value === role)?.description
  );
}
