import { JsonLd } from "@/components/marketing/JsonLd";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SITE, SITE_DESCRIPTION } from "@/lib/site";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          description: SITE_DESCRIPTION,
          email: SITE.email,
          telephone: SITE.phoneTel,
          address: {
            "@type": "PostalAddress",
            streetAddress: "Ground floor, Nayi Duniya Complex, Agra Road",
            addressLocality: SITE.locality,
            addressRegion: SITE.region,
            postalCode: SITE.postalCode,
            addressCountry: "IN",
          },
          areaServed: { "@type": "Country", name: "India" },
        }}
      />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
