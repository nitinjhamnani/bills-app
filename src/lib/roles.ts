export const ORGANISATION_ROLES = [
  {
    value: "ORGANISATION_ADMIN",
    label: "Paytrix Admin",
    description: "Full control: settings, corporates, vendors, users, RBAC and reports.",
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

export const CORPORATE_ROLES = [
  { value: "CORP_ADMIN", label: "Corporate Admin" },
  { value: "CORP_OPERATOR", label: "Corporate Operator" },
  { value: "BRANCH_USER", label: "Branch User" },
] as const;

export const VENDOR_ROLES = [
  { value: "VENDOR_ADMIN", label: "Vendor Admin" },
  { value: "VENDOR_OPERATOR", label: "Vendor Operator" },
] as const;

export function roleDescription(role: string): string | undefined {
  return ORGANISATION_ROLES.find((r) => r.value === role)?.description;
}
