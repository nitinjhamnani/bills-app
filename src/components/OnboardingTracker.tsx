"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export interface CompanyDetails {
  legalName: string;
  registrationNumber: string;
  registeredAddress: string;
  signingAuthority: string;
}

export function OnboardingTracker({
  kind,
  companyDone,
  kycDone,
  contractDone,
  canAct,
  busy,
  onSubmitCompany,
  onCompleteKyc,
  onOpenEsign,
}: {
  kind?: "INDIVIDUAL" | "COMPANY" | null;
  companyDone: boolean;
  kycDone: boolean;
  contractDone: boolean;
  canAct?: boolean;
  busy?: "company" | "kyc" | "contract" | null;
  onSubmitCompany?: (details: CompanyDetails) => void;
  onCompleteKyc?: () => void;
  onOpenEsign?: () => void;
}) {
  const individual = kind === "INDIVIDUAL";
  const [company, setCompany] = useState<CompanyDetails>({
    legalName: "",
    registrationNumber: "",
    registeredAddress: "",
    signingAuthority: "",
  });
  const [panName, setPanName] = useState("");
  const current = !companyDone ? "company" : !kycDone ? "kyc" : !contractDone ? "contract" : null;
  const steps = [
    {
      key: "company" as const,
      title: individual ? "Personal information" : "Company information",
      done: companyDone,
      detail: companyDone
        ? individual
          ? "Personal information is saved."
          : "Company information is saved."
        : individual
          ? "Full name and address."
          : "Company name, registration number, registered address, and signing authority.",
    },
    {
      key: "kyc" as const,
      title: "eKYC",
      done: kycDone,
      detail: kycDone
        ? "PAN is on file."
        : companyDone
          ? individual
            ? "Upload the personal PAN."
            : "Upload the company PAN."
          : individual
            ? "PAN upload opens after personal information."
            : "PAN upload opens after company information.",
    },
    {
      key: "contract" as const,
      title: "Contract",
      done: contractDone,
      detail: contractDone
        ? "The contract is signed."
        : kycDone
          ? "Open e-sign to sign the contract."
          : "The contract opens after eKYC.",
    },
  ];

  const active = steps.find((step) => step.key === current);

  return (
    <div>
      <ol className="relative grid grid-cols-3 gap-2">
        <span className="pointer-events-none absolute top-4 right-[16.666%] left-[16.666%] flex" aria-hidden>
          <span className={`h-px flex-1 ${steps[0].done ? "bg-emerald-300" : "bg-slate-200"}`} />
          <span className={`h-px flex-1 ${steps[1].done ? "bg-emerald-300" : "bg-slate-200"}`} />
        </span>
        {steps.map((step, index) => {
          const isCurrent = step.key === current;
          return (
            <li key={step.key} className="relative flex flex-col items-center px-1 text-center">
              <span
                className={
                  step.done
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white"
                    : isCurrent
                      ? "flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 ring-1 ring-amber-200"
                      : "flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-400 ring-1 ring-slate-200"
                }
              >
                {step.done ? <Check size={16} /> : index + 1}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
              <p className={`mt-1 text-xs ${step.done ? "text-emerald-700" : "text-slate-500"}`}>{step.detail}</p>
            </li>
          );
        })}
      </ol>
      {active && (canAct || onSubmitCompany || onCompleteKyc || onOpenEsign) && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          {canAct && active.key === "company" && onSubmitCompany && (
            <form
              className="flex max-w-xl flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitCompany(company);
              }}
            >
              <Field
                label={individual ? "Full name" : "Company name"}
                value={company.legalName}
                onChange={(event) => setCompany({ ...company, legalName: event.target.value })}
              />
              {!individual && (
                <Field
                  label="Registration number"
                  value={company.registrationNumber}
                  onChange={(event) => setCompany({ ...company, registrationNumber: event.target.value })}
                />
              )}
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-700">{individual ? "Address" : "Registered address"}</span>
                <textarea
                  value={company.registeredAddress}
                  onChange={(event) => setCompany({ ...company, registeredAddress: event.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
              {!individual && (
                <Field
                  label="Signing authority"
                  value={company.signingAuthority}
                  onChange={(event) => setCompany({ ...company, signingAuthority: event.target.value })}
                />
              )}
              <p className="text-xs text-slate-500">You can continue without filling these in.</p>
              <Button type="submit" size="sm" className="self-start" loading={busy === "company"}>
                Continue
              </Button>
            </form>
          )}
          {canAct && active.key === "kyc" && onCompleteKyc && (
            <div className="flex max-w-xl flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-700">{individual ? "Personal PAN" : "Company PAN"}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setPanName(event.target.files?.[0]?.name ?? "")}
                  className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700"
                />
              </label>
              {panName && <p className="text-xs text-slate-600">{panName}</p>}
              <p className="text-xs text-slate-500">You can continue without a file.</p>
              <Button type="button" size="sm" className="self-start" loading={busy === "kyc"} onClick={onCompleteKyc}>
                Continue
              </Button>
            </div>
          )}
          {canAct && active.key === "contract" && onOpenEsign && (
            <div className="flex max-w-xl flex-col items-start gap-2">
              <p className="text-xs text-slate-500">This opens the e-sign page. No signature provider is connected yet.</p>
              <Button type="button" size="sm" onClick={onOpenEsign}>
                Continue to e-sign
              </Button>
            </div>
          )}
          {!canAct && (onSubmitCompany || onCompleteKyc || onOpenEsign) && (
            <p className="text-xs text-slate-500">A client admin completes this step.</p>
          )}
        </div>
      )}
    </div>
  );
}
