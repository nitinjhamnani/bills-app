import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { ToastProvider } from "@/components/ui/Toast";
import { SITE_DESCRIPTION } from "@/lib/site";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Paytrix | Corporate Expense & Spend Management Platform",
    template: "%s | Paytrix",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Paytrix",
  keywords: [
    "Paytrix",
    "corporate expense management",
    "enterprise spend management India",
    "multi-branch budget control",
    "corporate treasury wallet",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Paytrix",
    title: "Paytrix | Corporate Expense & Spend Management Platform",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Paytrix | Corporate Expense & Spend Management Platform",
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Paytrix",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ToastProvider>
          <GlobalLoader />
          {children}
          <ServiceWorkerRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
