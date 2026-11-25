/**
 * Studio-rendered 3D PBR illustrations for Paytrix SpendOS (Royal Indigo, Periwinkle & Emerald).
 */

function Studio3DShowcase({
  src,
  alt,
  badgeLeft,
  badgeRight,
  maxWidth = "max-w-md",
}: {
  src: string;
  alt: string;
  badgeLeft?: string;
  badgeRight?: string;
  maxWidth?: string;
}) {
  return (
    <div className={`relative mx-auto w-full ${maxWidth}`}>
      {/* Soft radial 3D studio aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-300/35 via-violet-200/25 to-emerald-200/30 blur-2xl"
      />
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100/90 bg-gradient-to-b from-white/95 via-indigo-50/45 to-slate-50/90 p-3 shadow-[0_20px_50px_-18px_rgba(30,27,75,0.18)] backdrop-blur-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="mx-auto aspect-4/3 w-full object-contain drop-shadow-[0_16px_24px_rgba(30,27,75,0.14)]"
        />
        {(badgeLeft || badgeRight) && (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
            {badgeLeft && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1 text-[11px] font-bold text-indigo-950 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                {badgeLeft}
              </span>
            )}
            {badgeRight && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {badgeRight}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BalancedControlIllustration() {
  return (
    <Studio3DShowcase
      src="/images/thinkwalnut/3d-spend-orbit.webp"
      alt="3D corporate treasury vault surrounded by real-time spend control orbits"
      badgeLeft="360° Spend Control"
      badgeRight="Policy Guardrails Active"
    />
  );
}

export function ZeroLateFeesPuzzleIllustration() {
  return (
    <Studio3DShowcase
      src="/images/thinkwalnut/3d-zero-penalties.webp"
      alt="3D automated schedule vault and verification badge guaranteeing on-time corporate disbursements"
      badgeLeft="Automated Cycle Alerts"
      badgeRight="Zero Late Penalties"
      maxWidth="max-w-lg"
    />
  );
}

export function PowerPayUtilitiesIllustration() {
  return (
    <Studio3DShowcase
      src="/images/thinkwalnut/3d-autopay-dock.webp"
      alt="3D FlowPay corporate disbursement terminal with approved expense cards"
      badgeLeft="FlowPay Engine"
      badgeRight="Maker–Checker Verified"
    />
  );
}

export function PowerBillIsometricIllustration() {
  return (
    <Studio3DShowcase
      src="/images/thinkwalnut/3d-audit-prism.webp"
      alt="3D SpendIQ analytics columns and frosted-glass audit lens"
      badgeLeft="SpendIQ Telemetry"
      badgeRight="Audit-Ready Ledger"
    />
  );
}

export function PlatformSatisfactionIllustration() {
  return (
    <Studio3DShowcase
      src="/images/thinkwalnut/3d-enterprise-hub.webp"
      alt="3D connected HQ monolith and multi-branch corporate spend nodes"
      badgeLeft="HQ Treasury Core"
      badgeRight="Connected Cost Centres"
    />
  );
}
