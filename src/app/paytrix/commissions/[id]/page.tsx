import { redirect } from "next/navigation";

export default async function CommissionDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/paytrix/vendor-rules/${id}`);
}
