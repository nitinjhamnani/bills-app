"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, Phone, Sparkles } from "lucide-react";
import { SITE } from "@/lib/site";

export function ThinkWalnutHeroBanner({
  badge,
  eyebrow,
  title,
  subtitle,
  imageSrc,
  imageAlt,
  ctaLabel,
  ctaHref = "/contact",
}: {
  badge?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  imageSrc: string;
  imageAlt: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#090D24] via-[#171642] to-[#2B256E] py-14 text-white sm:py-20">
      {/* Subtle architectural perspective grid + radial indigo/emerald glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(165,180,252,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(165,180,252,0.18) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 right-1/4 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div>
          {badge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-[0.1em] text-indigo-100 uppercase backdrop-blur-md">
              <Sparkles size={13} className="text-emerald-300" />
              {badge}
            </span>
          )}

          {eyebrow && (
            <p className="mt-5 text-sm font-semibold tracking-wide text-indigo-200 sm:text-base">
              {eyebrow}
            </p>
          )}

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.12]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-indigo-100/90 sm:text-lg">
              {subtitle}
            </p>
          )}

          {ctaLabel && (
            <div className="mt-7">
              <Link
                href={ctaHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-lg shadow-indigo-950/40 ring-1 ring-white/20 transition-all hover:from-indigo-400 hover:to-indigo-500"
              >
                {ctaLabel}
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>

        {/* Framed Glassmorphic Visual Card */}
        <div className="relative">
          <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-2.5 shadow-2xl backdrop-blur-md">
            <div className="overflow-hidden rounded-2xl bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={imageAlt}
                className="h-64 w-full object-cover sm:h-80"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DemoEnquiryForm({
  heading = "Book a personalised SpendOS demo",
  compact = false,
}: {
  heading?: string;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  const mailtoHref = `mailto:${SITE.email}?subject=${encodeURIComponent(
    `Paytrix Corporate Expense Demo — ${name || "Enterprise"}`,
  )}&body=${encodeURIComponent(
    `Name: ${name}\nMobile: ${mobile}\nEmail: ${email}\n\nCorporate Spend Requirements:\n${message}`,
  )}`;

  return (
    <div className={compact ? "mx-auto w-full max-w-xl" : "w-full"}>
      <h2 className="text-center text-2xl font-bold tracking-tight text-indigo-950 sm:text-3xl">
        {heading}
      </h2>

      {submitted ? (
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6 text-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 text-indigo-800">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <p className="text-base font-bold">Demo request ready for {SITE.name}</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Thank you, <strong className="text-slate-900">{name}</strong>. Dispatch your enquiry to our enterprise desk or call us directly for workspace setup.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={mailtoHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-5 text-sm font-semibold text-white hover:from-indigo-800 hover:to-indigo-700"
            >
              <Mail size={15} /> Send via Email
            </a>
            <a
              href={`tel:${SITE.phoneTel}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 text-sm font-semibold text-indigo-800 hover:bg-indigo-50"
            >
              <Phone size={15} /> {SITE.phoneDisplay}
            </a>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="inline-flex min-h-11 items-center px-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Edit details
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-indigo-950">
            <span>Name:</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-indigo-950">
            <span>Mobile:</span>
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-indigo-950">
            <span>Work E-mail:</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="finance@company.com"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-indigo-950">
            <span>How does your team manage expenses today?</span>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your locations, departments, vendor payouts, and monthly corporate expense workflows."
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>

          <div className="pt-1">
            <button
              type="submit"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-indigo-700 to-indigo-600 px-8 py-2.5 text-xs font-bold tracking-wider text-white uppercase shadow-sm transition-all hover:from-indigo-800 hover:to-indigo-700"
            >
              REQUEST DEMO
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ContactSplitSection({ heading = "Book a personalised SpendOS demo" }: { heading?: string }) {
  return (
    <section id="contact" className="bg-white py-16 sm:py-22">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-700 uppercase">
              Talk to Our Enterprise Team
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950 sm:text-4xl">
              Modernise your corporate spend
            </h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 shadow-[var(--shadow-elevated)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/thinkwalnut/tw-contact-desk.webp"
                alt="Finance controller reviewing corporate expense budgets and approvals on laptop"
                className="h-72 w-full object-cover sm:h-96"
              />
            </div>
          </div>

          <div className="lg:pt-2">
            <DemoEnquiryForm heading={heading} />
          </div>
        </div>
      </div>
    </section>
  );
}
