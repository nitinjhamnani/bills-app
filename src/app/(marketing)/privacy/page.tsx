import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

const DESCRIPTION =
  "Privacy policy for Paytrix, the B2B utility bill payments workspace for organisations and companies in India.";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: DESCRIPTION,
  openGraph: {
    title: "Privacy Policy | Paytrix",
    description: DESCRIPTION,
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

const SECTIONS = [
  {
    title: "1. Who this policy covers",
    body: [
      "This policy explains how Paytrix handles personal information on the public website and in the invitation-only workspace. Paytrix is a B2B bill payments platform for organisations and companies in India.",
      "The public site does not ask you to create an account. The workspace is used by people whose organisation or client company has been given access.",
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "If you call or email us, we receive the details you choose to send: your name, phone number, email address, organisation, and what you tell us about the utilities you pay.",
      "When an organisation is onboarded, the workspace holds account information for its users and client companies: name, phone number, email address where one is provided, role, and the organisation or client company the person belongs to.",
      "Bill work creates operational records: consumer numbers, fetched bills and due amounts, wallet top-ups and balances, payments, settlements with billers, support tickets, disputes, and an audit log of who did what and when.",
      "Sign-in uses a phone number or email and a password. The password is sent to the Paytrix service to check it. The browser then stores an access token and a copy of the user profile so later requests can be authorised. A sidebar preference may also be stored on the device. Paytrix does not use a separate advertising or analytics tracker on this site.",
    ],
  },
  {
    title: "3. How we use it",
    body: [
      "We use this information to provide the workspace: to identify who is signed in, to fetch and pay utility bills, to keep the wallet ledger, to settle with billers, to answer support tickets and disputes, and to produce reports for the people allowed to see them.",
      "We also use it to respond to enquiries, to secure accounts, to investigate misuse, and to meet legal duties that apply to the service.",
    ],
  },
  {
    title: "4. Who can see it",
    body: [
      "A user sees the records their role allows. Client company users see their own accounts, wallet, and payments. Organisation users see the clients, bills, wallets, and settlements of that organisation. Platform operators see what is required to provision organisations and oversee the network. One tenant does not see another tenant’s book.",
      "Bill and payment details are shared with the biller or bill-fetch service as needed to retrieve a bill or record a settlement. We do not sell personal information.",
      "People who host or support the service may process this information only so Paytrix can run. We may also disclose information if the law requires it.",
    ],
  },
  {
    title: "5. What stays on your device",
    body: [
      "The access token and user profile are stored in the browser’s local storage, not in a cookie. Clearing site data, or signing out, removes them from that browser.",
      "The site may install a service worker that caches the public shell — the home page, the login page, and the app manifest — so a later visit can still open if the network fails. That cache does not hold wallet balances, bills, or payment records.",
    ],
  },
  {
    title: "6. How long we keep it",
    body: [
      "Account and bill records are kept while the organisation uses Paytrix, and afterwards for as long as needed to complete open settlements, answer disputes, support the audit log, and meet legal record-keeping duties. Enquiry emails and call notes are kept while the conversation is active and for a reasonable period after it closes.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "Access to the workspace is limited to issued accounts, and each request is authorised with the signed-in user’s token. You should keep the password private and use a device you trust. No method of storage or transmission is perfectly secure.",
    ],
  },
  {
    title: "8. Your requests",
    body: [
      "You may ask what account information Paytrix holds about you, ask for a correction, or ask us to close an account that is no longer authorised. If you are a client-company user, start with your organisation administrator, because that organisation issued the login and operates the book your data sits on.",
      "Where the Digital Personal Data Protection Act, 2023 applies, you may also raise a request with us using the contact details below. We may need to confirm that the request comes from you, or from the organisation responsible for the account, before we act on it.",
    ],
  },
  {
    title: "9. Changes",
    body: [
      "Paytrix may update this policy by publishing a new version on this page. The date below is the date of this version. Use of the site or the workspace after an update is posted is subject to the revised policy.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      `Privacy questions: ${SITE.email} or ${SITE.phoneDisplay}. Office: ${SITE.addressLines.join(", ")}, ${SITE.country}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Legal</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Privacy policy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            How Paytrix handles personal information on the public website and in the workspace used to pay utility bills for companies in India.
          </p>
          <p className="mt-4 text-sm text-slate-500">Last updated 7 October 2026</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{section.title}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-slate-600 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm text-slate-500">
          Use of the service is also covered by the{" "}
          <Link href="/terms" className="font-semibold text-indigo-700 hover:text-indigo-800">
            terms and conditions
          </Link>
          . For onboarding questions, use the{" "}
          <Link href="/contact" className="font-semibold text-indigo-700 hover:text-indigo-800">
            contact page
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
