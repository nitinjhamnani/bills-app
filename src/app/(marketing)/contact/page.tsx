import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SITE, mapsUrl } from "@/lib/site";

const DESCRIPTION =
  "Contact Paytrix in Aligarh for B2B utility bill payments. Call +91 96901 66444 or email treewealthmanagement@gmail.com. Ground floor, Nayi Duniya Complex, Agra Road, Aligarh, Uttar Pradesh 202001.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  keywords: ["contact Paytrix", "utility bill payments Aligarh", "B2B bill payments India"],
  openGraph: {
    title: "Contact Paytrix | B2B Utility Bill Payments",
    description: DESCRIPTION,
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

const ENQUIRY = [
  "Your organisation name and the cities you operate in",
  "Whether you pay your own utilities or pay on behalf of client companies",
  "The bill types on the book — electricity, water, gas, broadband, mobile, DTH, or others",
  "A phone number or email where we can reply",
];

export default function ContactPage() {
  return (
    <div className="bg-white">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: SITE.name,
          description:
            "B2B utility bill payments platform for organisations and companies in India.",
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

      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Contact</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Talk to Paytrix about your utility bill book.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            We work with organisations and companies in India that pay electricity, water, gas, broadband, and other utility bills. Call, email, or visit the Aligarh office.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="sr-only">Contact details</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Phone size={20} aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-900">Phone</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Call the Paytrix team about onboarding an organisation.
            </p>
            <a href={`tel:${SITE.phoneTel}`} className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800">
              {SITE.phoneDisplay}
            </a>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Mail size={20} aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-900">Email</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Write with your company name and the utilities you pay.
            </p>
            <a
              href={`mailto:${SITE.email}?subject=Paytrix%20workspace%20enquiry`}
              className="mt-4 inline-flex break-all text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              {SITE.email}
            </a>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <MapPin size={20} aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-900">Office</h3>
            <address className="mt-2 text-sm not-italic leading-relaxed text-slate-600">
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
              className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Open in Maps
            </a>
          </article>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">What to include in your note</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              A short email is enough to start. These details help us tell you whether Paytrix fits the way you pay bills today.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {ENQUIRY.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={`mailto:${SITE.email}?subject=Paytrix%20workspace%20enquiry`}
              className="mt-8 inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700"
            >
              Email {SITE.email}
            </a>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">Workspace access is by invitation</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              This page is for enquiries. There is no public self-signup. After an organisation is onboarded, administrators receive workspace logins and issue access to their client companies.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              If your organisation is already on Paytrix, sign in with the phone number or email on your account.
            </p>
            <Link href="/login" className="mt-6 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-800">
              Go to login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
