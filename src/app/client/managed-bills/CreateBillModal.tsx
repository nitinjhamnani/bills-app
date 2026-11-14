"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

type Category = { categoryId: string; name: string; enabled: boolean };
type Biller = { billerId: string; name: string; categoryId: string };
type BillerList = { billers: Biller[]; searchRequired: boolean };
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
  branches,
  fixedBranchId,
}: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
  branches?: { id: string; name: string }[];
  /** When set, the bill is created for this branch and the picker is hidden. */
  fixedBranchId?: string;
}) {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categoryId, setCategoryId] = useState("");

  const [billers, setBillers] = useState<Biller[]>([]);
  const [billersLoading, setBillersLoading] = useState(false);
  const [searchRequired, setSearchRequired] = useState(false);
  const [billerQuery, setBillerQuery] = useState("");
  const [billerId, setBillerId] = useState("");

  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [parametersLoading, setParametersLoading] = useState(false);
  const [parameterError, setParameterError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mobileNumber, setMobileNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [branchId, setBranchId] = useState("");
  const needsBranch = branches != null && !fixedBranchId;
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setCategoryId("");
    setBillers([]);
    setSearchRequired(false);
    setBillerId("");
    setBillerQuery("");
    setParameters([]);
    setParameterError(null);
    setValues({});
    setMobileNumber("");
    setBranchId(fixedBranchId ?? "");
    let cancelled = false;
    setOptionsLoading(true);
    apiFetch<Category[]>("/api/v1/client/bbps/categories")
      .then((nextCategories) => {
        if (!cancelled) setCategories(nextCategories);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Failed to load categories");
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !categoryId) return;
    const seq = ++requestSeq.current;
    let cancelled = false;
    setBillersLoading(true);
    apiFetch<BillerList>(`/api/v1/client/bbps/billers?categoryId=${encodeURIComponent(categoryId)}`)
      .then((result) => {
        if (cancelled || seq !== requestSeq.current) return;
        setBillers(result.billers);
        setSearchRequired(result.searchRequired);
      })
      .catch((err) => {
        if (cancelled || seq !== requestSeq.current) return;
        setBillers([]);
        setSearchRequired(false);
        toast.error(err instanceof ApiError ? err.message : "Failed to load operators");
      })
      .finally(() => {
        if (!cancelled && seq === requestSeq.current) setBillersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, categoryId]);

  useEffect(() => {
    if (!open || !categoryId || !searchRequired) return;
    const query = billerQuery.trim();
    if (query.length < 2) {
      setBillers([]);
      setBillersLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    const handle = window.setTimeout(() => {
      setBillersLoading(true);
      apiFetch<BillerList>(
        `/api/v1/client/bbps/billers?categoryId=${encodeURIComponent(categoryId)}&q=${encodeURIComponent(query)}`,
      )
        .then((result) => {
          if (seq !== requestSeq.current) return;
          setBillers(result.billers);
          setSearchRequired(result.searchRequired);
        })
        .catch((err) => {
          if (seq !== requestSeq.current) return;
          setBillers([]);
          toast.error(err instanceof ApiError ? err.message : "Failed to search operators");
        })
        .finally(() => {
          if (seq === requestSeq.current) setBillersLoading(false);
        });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [open, categoryId, searchRequired, billerQuery]);

  const visibleBillers = useMemo(() => {
    if (searchRequired) return billers;
    const query = billerQuery.trim().toLowerCase();
    if (!query) return billers;
    return billers.filter((biller) => biller.name.toLowerCase().includes(query));
  }, [billers, billerQuery, searchRequired]);

  const parametersReady =
    categoryId !== "" &&
    billerId !== "" &&
    !parametersLoading &&
    parameterError == null &&
    parameters.length > 0 &&
    parameters.every((parameter) => (values[parameter.name] ?? "").trim().length > 0) &&
    /^[6-9][0-9]{9}$/.test(mobileNumber);

  function selectCategory(nextId: string) {
    setCategoryId(nextId);
    setBillerQuery("");
    setSearchRequired(false);
    setBillers([]);
    setBillersLoading(nextId !== "");
    setBillerId("");
    setParameters([]);
    setParameterError(null);
    setValues({});
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
      setParameterError(err instanceof ApiError ? err.message : "This operator cannot be used");
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
          ...((fixedBranchId || needsBranch) ? { branchId: fixedBranchId || branchId } : {}),
          categoryId,
          billerId,
          mobileNumber,
          parameters: values,
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

  const queryReady = billerQuery.trim().length >= 2;
  const operatorMessage = !categoryId
    ? null
    : billersLoading
      ? "Loading operators..."
      : searchRequired && !queryReady
        ? "Type at least 2 characters to search operators."
        : visibleBillers.length === 0
          ? billers.length === 0
            ? "No operators for this category."
            : "No operators match."
          : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a managed bill"
      description="Choose a category, then the operator. Fill in the fields it asks for, and the mobile number sent with the fetch."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button form="create-managed-bill-form" type="submit" loading={creating} disabled={!parametersReady || (needsBranch && !branchId)}>
            Create bill
          </Button>
        </>
      }
    >
      <form id="create-managed-bill-form" onSubmit={create} className="flex flex-col gap-4">
        {optionsLoading ? (
          <p className="text-sm text-slate-500">Loading categories...</p>
        ) : (
          <>
            {needsBranch && (branches ?? []).length === 0 && (
              <p className="text-sm text-slate-500">Create a branch before registering a bill.</p>
            )}
            {needsBranch && (
              <SelectField
                label="Branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">Choose a branch</option>
                {(branches ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </SelectField>
            )}
            <SelectField
              label="Category"
              required
              value={categoryId}
              onChange={(e) => selectCategory(e.target.value)}
              hint={categories.length === 0 ? "No categories are enabled for this client yet." : undefined}
            >
              <option value="">Select a category...</option>
              {categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.name}
                </option>
              ))}
            </SelectField>
          </>
        )}

        {categoryId && (
          <>
            <Field
              label="Search operators"
              value={billerQuery}
              onChange={(e) => setBillerQuery(e.target.value)}
              placeholder={searchRequired ? "Type at least 2 characters" : "Type an operator name"}
            />
            <div className="max-h-48 overflow-auto rounded-xl border border-slate-200">
              {operatorMessage ? (
                <p className="px-3 py-4 text-sm text-slate-500">{operatorMessage}</p>
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
                          <span className="min-w-0 truncate">{biller.name?.trim() || `Operator ${biller.billerId}`}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {parametersLoading && <p className="text-sm text-slate-500">Loading the fields this operator needs...</p>}
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
                  label="Mobile number"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={mobileNumber}
                  hint="Sent with every bill fetch. Use a 10-digit mobile starting with 6, 7, 8, or 9."
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
