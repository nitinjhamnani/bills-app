"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

type Category = { categoryId: string; name: string; enabled: boolean };
type Location = { locationId: string; name: string; abbreviation: string };
type Biller = { billerId: string; name: string; categoryId: string; locationId: string | null };
type Parameter = {
  name: string;
  label: string;
  dataType: string | null;
  validationRegex: string | null;
  errorMessage: string | null;
};

function inputType(parameter: Parameter) {
  const kind = `${parameter.dataType ?? ""} ${parameter.name}`.toLowerCase();
  if (kind.includes("date") || kind.startsWith("dob")) return "date";
  if (kind.includes("email")) return "email";
  return "text";
}

export function CreateBillModal({
  open,
  clientId,
  onClose,
  onCreated,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");

  const [billers, setBillers] = useState<Biller[]>([]);
  const [billersLoading, setBillersLoading] = useState(false);
  const [billerQuery, setBillerQuery] = useState("");
  const [billerId, setBillerId] = useState("");

  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [parametersLoading, setParametersLoading] = useState(false);
  const [parameterError, setParameterError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCategoryId("");
    setLocationId("");
    setBillers([]);
    setBillerId("");
    setBillerQuery("");
    setParameters([]);
    setParameterError(null);
    setValues({});
    setCustomerName("");
    setMobile("");
    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      apiFetch<Category[]>("/api/v1/client/bbps/categories"),
      apiFetch<Location[]>("/api/v1/client/bbps/locations"),
    ])
      .then(([nextCategories, nextLocations]) => {
        if (cancelled) return;
        setCategories(nextCategories);
        setLocations(nextLocations);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Failed to load categories and locations");
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const visibleBillers = useMemo(() => {
    const query = billerQuery.trim().toLowerCase();
    if (!query) return billers;
    return billers.filter((biller) => biller.name.toLowerCase().includes(query));
  }, [billers, billerQuery]);

  const parametersReady =
    billerId !== "" &&
    !parametersLoading &&
    parameterError == null &&
    parameters.length > 0 &&
    parameters.every((parameter) => (values[parameter.name] ?? "").trim().length > 0) &&
    /^[A-Za-z]+$/.test(customerName) &&
    /^\d{10}$/.test(mobile);

  async function continueToBillers() {
    setStep(2);
    setBillerId("");
    setParameters([]);
    setParameterError(null);
    setValues({});
    setBillerQuery("");
    setBillersLoading(true);
    try {
      const rows = await apiFetch<Biller[]>(
        `/api/v1/client/bbps/billers?categoryId=${encodeURIComponent(categoryId)}&locationId=${encodeURIComponent(locationId)}`,
      );
      setBillers(rows);
    } catch (err) {
      setBillers([]);
      toast.error(err instanceof ApiError ? err.message : "Failed to load billers");
    } finally {
      setBillersLoading(false);
    }
  }

  async function chooseBiller(nextId: string) {
    setBillerId(nextId);
    setParameters([]);
    setValues({});
    setParameterError(null);
    setParametersLoading(true);
    try {
      const rows = await apiFetch<Parameter[]>(
        `/api/v1/client/bbps/billers/${encodeURIComponent(nextId)}/parameters?categoryId=${encodeURIComponent(categoryId)}`,
      );
      setParameters(rows);
    } catch (err) {
      setParameterError(err instanceof ApiError ? err.message : "This biller cannot be used");
    } finally {
      setParametersLoading(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!parametersReady) return;
    setCreating(true);
    try {
      await apiFetch(`/api/v1/clients/${clientId}/managed-bills`, {
        method: "POST",
        body: {
          categoryId,
          locationId,
          billerId,
          parameters: values,
          customerName,
          customerMobileNumber: mobile,
        },
      });
      toast.success("Bill created. The latest details are being fetched.");
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create bill");
    } finally {
      setCreating(false);
    }
  }

  const categoryName = categories.find((category) => category.categoryId === categoryId)?.name ?? "";
  const locationName = locations.find((location) => location.locationId === locationId)?.name ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a managed bill"
      description={
        step === 1
          ? "Choose the category enabled for you, and the location."
          : `${categoryName} · ${locationName}. Pick a biller, then fill in the fields it asks for.`
      }
      footer={
        step === 1 ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!categoryId || !locationId || optionsLoading} onClick={continueToBillers}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep(1)} disabled={creating}>
              Back
            </Button>
            <Button form="create-managed-bill-form" type="submit" loading={creating} disabled={!parametersReady}>
              Create bill
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          {optionsLoading ? (
            <p className="text-sm text-slate-500">Loading categories and locations...</p>
          ) : (
            <>
              <SelectField
                label="Category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                hint={categories.length === 0 ? "No categories are enabled for this client yet." : undefined}
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Location"
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                hint={locations.length === 0 ? "No locations are enabled for the organisation yet." : undefined}
              >
                <option value="">Select a location...</option>
                {locations.map((location) => (
                  <option key={location.locationId} value={location.locationId}>
                    {location.name}
                    {location.abbreviation ? ` (${location.abbreviation})` : ""}
                  </option>
                ))}
              </SelectField>
            </>
          )}
        </div>
      ) : (
        <form id="create-managed-bill-form" onSubmit={create} className="flex flex-col gap-4">
          <Field
            label="Search billers"
            value={billerQuery}
            onChange={(e) => setBillerQuery(e.target.value)}
            placeholder="Type a biller name"
          />
          <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
            {billersLoading ? (
              <p className="px-3 py-4 text-sm text-slate-500">Loading billers...</p>
            ) : visibleBillers.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">
                {billers.length === 0 ? "No billers for this category and location." : "No billers match."}
              </p>
            ) : (
              <ul>
                {visibleBillers.map((biller) => {
                  const selected = biller.billerId === billerId;
                  return (
                    <li key={biller.billerId}>
                      <button
                        type="button"
                        onClick={() => chooseBiller(biller.billerId)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm",
                          selected ? "bg-indigo-50 font-semibold text-indigo-900" : "text-slate-800 hover:bg-slate-50",
                        )}
                      >
                        <span className="min-w-0 truncate">{biller.name?.trim() || `Biller ${biller.billerId}`}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {parametersLoading && <p className="text-sm text-slate-500">Loading the fields this biller needs...</p>}
          {parameterError && <p className="text-sm text-rose-700">{parameterError}</p>}
          {billerId && !parametersLoading && !parameterError && parameters.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
              {parameters.map((parameter) => (
                <Field
                  key={parameter.name}
                  label={parameter.label || parameter.name}
                  required
                  type={inputType(parameter)}
                  value={values[parameter.name] ?? ""}
                  hint={parameter.errorMessage ?? undefined}
                  onChange={(e) => setValues((current) => ({ ...current, [parameter.name]: e.target.value }))}
                />
              ))}
              <Field
                label="Customer name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value.replace(/[^A-Za-z]/g, ""))}
                placeholder="Letters only"
                hint="Sent to the biller as the sender name. Letters only, no spaces."
              />
              <Field
                label="Customer mobile number"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
