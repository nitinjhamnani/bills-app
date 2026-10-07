import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

const DESCRIPTION =
  "Terms and conditions for using Paytrix, the B2B utility bill payments workspace for organisations and companies in India.";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: DESCRIPTION,
  openGraph: {
    title: "Terms and Conditions | Paytrix",
    description: DESCRIPTION,
    locale: "en_IN",
    type: "website",
    siteName: "Paytrix",
  },
};

const SECTIONS = [
  {
    title: "1. Agreement",
    body: [
      "These terms govern use of the Paytrix website and the Paytrix workspace. By using the site, or by signing in after your organisation is onboarded, you agree to these terms.",
      "Paytrix is a B2B bill payments platform for organisations and companies in India. It is a workspace for fetching utility bills, holding client funds in a prepaid wallet, paying due amounts, and recording settlement with billers. It is not a consumer payments app, and access is not open to the public.",
    ],
  },
  {
    title: "2. Who may use Paytrix",
    body: [
      "Workspace access is issued by invitation. Paytrix provisions an organisation. That organisation issues logins to its own staff and to the client companies on its book.",
      "You may use Paytrix only if you are authorised by the organisation or client company your account belongs to, and only for that entity’s utility bill work. You must keep your password confidential and tell your administrator if you believe the account has been misused.",
    ],
  },
  {
    title: "3. The workspace",
    body: [
      "Organisation users can onboard client companies, enable utility services, review wallet top-ups, pick up client-paid bills, settle with billers, and read reports and the audit log. Client company users can register consumer accounts, fetch bills, fund a wallet, pay amounts that are due, and raise support tickets or disputes on their own payments.",
      "Each role sees only the records it is allowed to see. Platform, organisation, and client users do not share a workspace.",
    ],
  },
  {
    title: "4. Bills, wallets, and settlement",
    body: [
      "A managed bill is the consumer account. A fetch shows the latest amount due, or that the biller reports the account as already paid. A payment cycle is created only when there is an amount to pay. An already-paid fetch does not create a payment.",
      "Client companies pay from a prepaid wallet. The organisation credits that wallet after it accepts a top-up. Paying a bill debits the wallet. Settlement with the utility or other biller is a separate organisation action and may require a second approver where the organisation’s rules say so.",
      "Paytrix records these steps. It does not replace the organisation’s own arrangement with a biller, or the client company’s duty to pay amounts that are genuinely due.",
    ],
  },
  {
    title: "5. Your responsibilities",
    body: [
      "You are responsible for the consumer numbers, amounts, and instructions entered under your account. Check a fetched bill before paying it. The organisation is responsible for the users it creates, the services it enables, the wallet credits it approves, and the settlements it marks complete.",
      "Do not use Paytrix for unlawful payments, for accounts you are not authorised to operate, or to hide the true payer or purpose of a payment. Do not attempt to access another tenant’s data, interfere with the service, or submit false disputes.",
    ],
  },
  {
    title: "6. Fees",
    body: [
      "Any fee Paytrix or the organisation charges for bill payments, wallet funding, or related services is the fee agreed when the organisation is onboarded, or shown in the workspace before the action is confirmed. These terms do not set a public price list.",
    ],
  },
  {
    title: "7. Support and disputes",
    body: [
      "Client companies should raise a ticket or a payment dispute inside the workspace so the conversation stays on the bill it belongs to. Paytrix and the organisation will look at the fetch, the wallet entry, and the settlement record. Raising a dispute does not by itself reverse a wallet debit or a settlement already made.",
    ],
  },
  {
    title: "8. Availability and records",
    body: [
      "Paytrix aims to keep the workspace available for bill operations. Fetches depend on billers and on information they return, so a bill may fail to fetch, show a delay, or show an already-paid result. Reports and the audit log are the record of what the workspace did. Export what your finance team needs for its own retention.",
    ],
  },
  {
    title: "9. Intellectual property",
    body: [
      "The Paytrix name, the site, and the workspace software belong to their owner. These terms give you a limited right to use them for your organisation’s or client company’s bill work. They do not transfer any other right.",
    ],
  },
  {
    title: "10. Suspension",
    body: [
      "Paytrix or the organisation administrator may suspend or close an account that breaches these terms, that is no longer authorised, or that creates a risk to other users or to funds. Wallet balances and open bills at that point are handled with the organisation, using the ledger in the workspace.",
    ],
  },
  {
    title: "11. Liability",
    body: [
      "To the extent permitted by Indian law, Paytrix is not liable for indirect or consequential loss, for a biller’s own outage or incorrect bill data, or for payments an authorised user chose to make. Nothing in these terms excludes liability that cannot legally be excluded.",
    ],
  },
  {
    title: "12. Changes",
    body: [
      "Paytrix may update these terms by publishing a new version on this page. Continued use of the website or the workspace after the update is posted is acceptance of the revised terms. The date below is the date of this version.",
    ],
  },
  {
    title: "13. Law and contact",
    body: [
      "These terms are governed by the laws of India. Courts at Aligarh, Uttar Pradesh have jurisdiction, subject to any right you have that cannot be limited by contract.",
      `Questions about these terms: ${SITE.email} or ${SITE.phoneDisplay}. Office: ${SITE.addressLines.join(", ")}, ${SITE.country}.`,
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Legal</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Terms and conditions
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            These terms cover the Paytrix website and the invitation-only workspace used by organisations and their client companies to pay utility bills in India.
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
          How personal information is handled is described in the{" "}
          <Link href="/privacy" className="font-semibold text-indigo-700 hover:text-indigo-800">
            privacy policy
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
