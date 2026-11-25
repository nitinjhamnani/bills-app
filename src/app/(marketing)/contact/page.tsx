import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/marketing/JsonLd";
import {
  ContactSplitSection,
  ThinkWalnutHeroBanner,
} from "@/components/marketing/ThinkWalnutSections";
import { SITE, mapsUrl } from "@/lib/site";

const DESCRIPTION =
  "Contact Paytrix for corporate expense management, multi-branch budgets, and automated vendor & facility disbursements. Call +91 96901 66444 or email treewealthmanagement@gmail.com.";

export const metadata: Metadata = {
  title: "Contact Us — Book a Corporate Expense Demo",
  description: DESCRIPTION,
  keywords: ["contact Paytrix", "corporate expense management India", "enterprise spend platform demo"],
  openGraph: {
    title: "Contact Paytrix | Corporate Expense & Spend Management",
    description: DESCRIPTION,
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

export default function ContactPage() {
  return (
    <div className="bg-white">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: SITE.name,
          description:
            "Corporate expense and multi-location spend management platform for enterprises in India.",
          telephone: SITE.phoneTel,
          email: SITE.email,
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

      <ThinkWalnutHeroBanner
        badge="Contact Us"
        eyebrow={SITE.name}
        title="Talk to Paytrix about modernising your corporate spend."
        subtitle="We help CFOs, finance teams, and multi-location enterprises streamline departmental budgets, approvals, treasury wallets, and recurring disbursements."
        imageSrc="/images/thinkwalnut/tw-contact-hero.webp"
        imageAlt="Contact Paytrix enterprise onboarding desk"
      />

      {/* Registered Office & Direct Contact Cards */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-6 sm:px-6 sm:pt-20">
        <div className="grid gap-6 md:grid-cols-3">
          <article className="tw-card-indigo rounded-2xl border border-indigo-100/80 p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-2xs">
              <Phone size={20} aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-bold text-indigo-950">Enterprise Desk</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Speak directly with our solutions team about onboarding your company and branch cost centres.
            </p>
            <a
              href={`tel:${SITE.phoneTel}`}
              className="mt-4 inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-950"
            >
              {SITE.phoneDisplay}
            </a>
          </article>

          <article className="tw-card-slate rounded-2xl border border-indigo-100/80 p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-2xs">
              <Mail size={20} aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-bold text-indigo-950">Onboarding Email</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Share your entity structure, branch count, and monthly corporate expense workflows for a tailored demo.
            </p>
            <a
              href={`mailto:${SITE.email}?subject=Paytrix%20SpendOS%20Demo%20Enquiry`}
              className="mt-4 inline-flex break-all text-sm font-bold text-indigo-700 hover:text-indigo-950"
            >
              {SITE.email}
            </a>
          </article>

          <article className="tw-card-lavender rounded-2xl border border-indigo-100/80 p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-2xs">
              <MapPin size={20} aria-hidden />
            </span>
            <h2 className="mt-4 text-base font-bold text-indigo-950">Registered Office</h2>
            <address className="mt-2 text-sm leading-relaxed not-italic text-slate-700">
              {SITE.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
              <span className="block">{SITE.country}</span>
            </address>
            <a
              href={mapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex text-sm font-bold text-indigo-700 hover:text-indigo-950"
            >
              Open in Google Maps →
            </a>
          </article>
        </div>
      </section>

      {/* Split Photo + Demo Form */}
      <ContactSplitSection heading="Book a personalised SpendOS demo" />

      {/* Invitation-Only Note */}
      <section className="border-t border-indigo-100 bg-slate-50/80 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-indigo-700" />
            <p className="text-sm text-slate-600">
              <strong className="text-indigo-950">Already onboarded?</strong> Sign in with the phone number or work email issued by your administrator.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-xs font-bold tracking-wider text-white uppercase hover:from-indigo-800 hover:to-indigo-700"
          >
            Go to Workspace Login
          </Link>
        </div>
      </section>
    </div>
  );
}
