import { redirect } from "next/navigation";

export default function AuditLogPage() {
  redirect("/paytrix/manage-wallets?tab=audit");
}
