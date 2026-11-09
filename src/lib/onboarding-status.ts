/** While a client is still PENDING, the list shows the step they are on, not a generic pending state. */
export function onboardingStatus(client: {
  status: string;
  detailsSubmittedAt?: string | null;
  kycStatus?: string;
  contractStatus?: string;
}) {
  if (client.status !== "PENDING") {
    return { code: client.status, label: undefined as string | undefined };
  }
  if (!client.detailsSubmittedAt) {
    return { code: "COMPANY_PENDING", label: "Company pending" };
  }
  if (client.kycStatus !== "COMPLETE") {
    return { code: "KYC_PENDING", label: "KYC pending" };
  }
  if (client.contractStatus !== "SIGNED") {
    return { code: "CONTRACT_PENDING", label: "Contract pending" };
  }
  return { code: "PENDING", label: "Pending" };
}
