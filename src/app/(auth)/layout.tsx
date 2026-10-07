import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";

export const metadata: Metadata = {
  title: "Login",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-slate-50">
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
