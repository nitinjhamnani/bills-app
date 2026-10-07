import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Sign in to the Paytrix workspace. Access is issued to authorised organisations and their client companies in India.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
