"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SearchableSelect } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const DEFAULT_CATEGORY_ID = "Electricity";

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
  const categoryId = DEFAULT_CATEGORY_ID;

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
    setBillers([]);
    setSearchRequired(false);
    setBillerId("");
    setBillerQuery("");
    setParameters([]);
    setParameterError(null);
    setValues({});
    setMobileNumber("");
    setBranchId(fixedBranchId ?? "");

    const seq = ++requestSeq.current;
    let cancelled = false;
    setBillersLoading(true);
    apiFetch<BillerList>(
      `/api/v1/client/bbps/billers?categoryId=${encodeURIComponent(categoryId)}&clientId=${encodeURIComponent(clientId)}`,
    )
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
  }, [open, categoryId, clientId, fixedBranchId, toast]);

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
        `/api/v1/client/bbps/billers?categoryId=${encodeURIComponent(categoryId)}&q=${encodeURIComponent(query)}&clientId=${encodeURIComponent(clientId)}`,
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
  }, [open, categoryId, searchRequired, billerQuery, clientId, toast]);

  const parametersReady =
    billerId !== "" &&
    !parametersLoading &&
    parameterError == null &&
    parameters.length > 0 &&
    parameters.every((parameter) => (values[parameter.name] ?? "").trim().length > 0) &&
    /^[6-9][0-9]{9}$/.test(mobileNumber);

  async function chooseBiller(nextId: string) {
    setBillerId(nextId);
    setParameters([]);
    setValues({});
    setParameterError(null);
    if (!nextId) return;
    setParametersLoading(true);
    try {
      const rows = await apiFetch<Parameter[]>(
        `/api/v1/client/bbps/billers/${encodeURIComponent(nextId)}/parameters?categoryId=${encodeURIComponent(categoryId)}&clientId=${encodeURIComponent(clientId)}`,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a managed bill"
      description={
        needsBranch
          ? "Select the branch and electricity operator, then fill in the fields it asks for and the mobile number sent with the fetch."
          : "Select the electricity operator, then fill in the fields it asks for and the mobile number sent with the fetch."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            form="create-managed-bill-form"
            type="submit"
            loading={creating}
            disabled={!parametersReady || (needsBranch && !branchId)}
          >
            Create bill
          </Button>
        </>
      }
    >
      <form id="create-managed-bill-form" onSubmit={create} className="flex flex-col gap-4">
        {needsBranch && (branches ?? []).length === 0 && (
          <p className="text-sm text-slate-500">Create a branch before registering a bill.</p>
        )}
        {needsBranch && (
          <SearchableSelect
            label="Branch"
            value={branchId}
            onChange={setBranchId}
            placeholder="Choose a branch..."
            searchPlaceholder="Search branches..."
            emptyMessage={
              (branches ?? []).length === 0
                ? "No branches available. Create a branch first."
                : "No branches match your search."
            }
            options={(branches ?? []).map((branch) => ({
              value: branch.id,
              label: branch.name,
            }))}
          />
        )}

        <SearchableSelect
          label="Operator"
          value={billerId}
          onChange={chooseBiller}
          loading={billersLoading}
          placeholder={
            billersLoading && billers.length === 0
              ? "Loading electricity operators..."
              : "Select an electricity operator..."
          }
          searchPlaceholder={
            searchRequired
              ? "Type at least 2 characters to search operators..."
              : "Search electricity operators..."
          }
          emptyMessage={
            searchRequired && billerQuery.trim().length < 2
              ? "Type at least 2 characters to search operators."
              : "No electricity operators match your search."
          }
          options={billers.map((biller) => ({
            value: biller.billerId,
            label: biller.name?.trim() || `Operator ${biller.billerId}`,
          }))}
          onSearchChange={searchRequired ? setBillerQuery : undefined}
          disableClientFilter={searchRequired}
        />

        {parametersLoading && (
          <p className="text-sm text-slate-500">Loading the fields this operator needs...</p>
        )}
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
                onChange={(e) =>
                  setValues((current) => ({ ...current, [parameter.name]: e.target.value }))
                }
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
      </form>
    </Modal>
  );
}
