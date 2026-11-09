/** Organisation-side roles and what each one can actually do, mirrored from the tenant schema's role
 * seed data - this is the real permission boundary (enforced via @PreAuthorize on the backend),
 * not a separate fine-grained permission system. */
export const ORGANISATION_ROLES = [
  {
    value: "ORGANISATION_ADMIN",
    label: "Paytrix Admin",
    description: "Full control: settings, clients, users, RBAC and reports.",
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
    description: "Read-only access to Paytrix data.",
  },
  {
    value: "SALES",
    label: "Sales",
    description: "Read-only progress for the corporates this person brought in.",
  },
] as const;

export const CLIENT_ROLES = [
  { value: "CLIENT_ADMIN", label: "Admin" },
  { value: "CLIENT_OPERATOR", label: "Operator" },
] as const;

export function roleDescription(role: string): string | undefined {
  return ORGANISATION_ROLES.find((r) => r.value === role)?.description;
}
