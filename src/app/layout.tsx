import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { ToastProvider } from "@/components/ui/Toast";
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
    default: "PayOps Suite",
    template: "%s · PayOps Suite",
  },
  description:
    "B2B bill payment workspace for organisations and their clients — fetch bills, fund wallets, and settle with billers.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "B2B Fintech",
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
