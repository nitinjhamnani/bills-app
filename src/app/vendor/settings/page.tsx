"use client";

import { useEffect, useState } from "react";
import { KeyRound, Save, ShieldCheck, Store } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getUser } from "@/lib/auth";
import { StatusBadge, formatStatusLabel } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField, SelectField } from "@/components/ui/Field";
import { CopyableChip } from "@/components/ui/CopyableChip";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { ClientAccount, CorporateKind, UserProfile } from "@/lib/types";

export default function VendorSettingsPage() {
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const [clientName, setClientName] = useState("");
  const [corporateKind, setCorporateKind] = useState<CorporateKind>("COMPANY");
  const [signingAuthority, setSigningAuthority] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [location, setLocation] = useState("");
  const [stateName, setStateName] = useState("");
  const [savingVendor, setSavingVendor] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    apiFetch<ClientAccount>("/api/v1/client/account")
      .then((data) => {
        setAccount(data);
        populateForm(data);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Failed to load vendor details");
      })
      .finally(() => setLoadingAccount(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function populateForm(data: ClientAccount) {
    setClientName(data.clientName ?? "");
    setCorporateKind(data.corporateKind ?? "COMPANY");
    setSigningAuthority(data.signingAuthority ?? "");
    setRegistrationNumber(data.registrationNumber ?? "");
    setContactEmail(data.contactEmail ?? "");
    setContactPhone(data.contactPhone ?? "");
    setRegisteredAddress(data.registeredAddress ?? "");
    setLocation(data.location ?? "");
    setStateName(data.state ?? "");
  }

  const canEditVendor = user?.role === "VENDOR_ADMIN";

  async function handleSaveVendor(event: React.FormEvent) {
    event.preventDefault();
    if (!canEditVendor) return;
    if (!clientName.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    const trimmedPhone = contactPhone.trim();
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      toast.error("Contact phone must be a 10-digit number");
      return;
    }

    setSavingVendor(true);
    try {
      const updated = await apiFetch<ClientAccount>("/api/v1/client/account", {
        method: "PATCH",
        body: {
          clientName: clientName.trim(),
          corporateKind,
          signingAuthority: signingAuthority.trim(),
          registrationNumber: registrationNumber.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: trimmedPhone,
          registeredAddress: registeredAddress.trim(),
          location: location.trim(),
          state: stateName.trim(),
        },
      });
      setAccount(updated);
      populateForm(updated);
      toast.success("Vendor details updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update vendor details");
    } finally {
      setSavingVendor(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      toast.error("New password must be 6 to 72 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch("/api/v1/auth/password/change", {
        method: "POST",
        body: {
          currentPassword,
          newPassword,
        },
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <PageHeader
        title="Settings"
        description="Update vendor details and manage your account password."
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Vendor Details Card */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Store size={18} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Vendor details</h2>
                <p className="text-xs text-slate-500">
                  {canEditVendor
                    ? "Vendor profile, registration, and primary contact information."
                    : "Vendor profile and contact information (editable by a Vendor Admin)."}
                </p>
              </div>
            </div>
            {account && (
              <div className="flex flex-wrap items-center gap-2">
                <CopyableChip text={account.clientCode ?? account.clientId} label="vendor code" />
                <StatusBadge status={account.status} />
              </div>
            )}
          </div>

          {loadingAccount ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSaveVendor} className="mt-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label={corporateKind === "INDIVIDUAL" ? "Full legal name" : "Vendor name"}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  disabled={!canEditVendor || savingVendor}
                  required
                  placeholder="e.g. Harbor Utilities Pvt Ltd"
                />
                <SelectField
                  label="Vendor type"
                  value={corporateKind}
                  onChange={(e) => setCorporateKind(e.target.value as CorporateKind)}
                  disabled={!canEditVendor || savingVendor}
                >
                  <option value="COMPANY">Company</option>
                  <option value="INDIVIDUAL">Individual</option>
                </SelectField>
                <Field
                  label={corporateKind === "INDIVIDUAL" ? "Primary contact" : "Contact person / Signing authority"}
                  value={signingAuthority}
                  onChange={(e) => setSigningAuthority(e.target.value)}
                  disabled={!canEditVendor || savingVendor}
                  placeholder="e.g. Rahul Sharma"
                />
                <Field
                  label={corporateKind === "INDIVIDUAL" ? "PAN / Identification number" : "Registration number (GSTIN / CIN)"}
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  disabled={!canEditVendor || savingVendor}
                  placeholder={corporateKind === "INDIVIDUAL" ? "e.g. ABCDE1234F" : "e.g. 27AABCU9603R1ZM"}
                />
                <Field
                  label="Contact email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={!canEditVendor || savingVendor}
                  placeholder="settlements@vendor.com"
                />
                <Field
                  label="Contact phone"
                  inputMode="numeric"
                  maxLength={10}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  disabled={!canEditVendor || savingVendor}
                  placeholder="10-digit mobile number"
                />
              </div>

              <Field
                label="Registered address"
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                disabled={!canEditVendor || savingVendor}
                placeholder="Building, street, locality, and PIN code"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="City / Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={!canEditVendor || savingVendor}
                  placeholder="e.g. Mumbai"
                />
                <Field
                  label="State"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  disabled={!canEditVendor || savingVendor}
                  placeholder="e.g. Maharashtra"
                />
              </div>

              {canEditVendor && (
                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button
                    type="submit"
                    icon={<Save size={16} />}
                    loading={savingVendor}
                    disabled={!clientName.trim()}
                  >
                    Save vendor details
                  </Button>
                </div>
              )}
            </form>
          )}
        </Card>

        {/* Change Password & User Account Card */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <KeyRound size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Change password</h2>
              <p className="text-xs text-slate-500">
                Update the sign-in password for your user account.
              </p>
            </div>
          </div>

          {user && (
            <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user.displayName || user.phoneNumber}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    {user.userCode ? `${user.userCode} · ` : ""}
                    {user.phoneNumber}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                  {formatStatusLabel(user.role)}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-4">
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
              disabled={savingPassword}
            />
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6 to 72 characters"
              autoComplete="new-password"
              required
              disabled={savingPassword}
            />
            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              required
              disabled={savingPassword}
            />

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button
                type="submit"
                icon={<ShieldCheck size={16} />}
                loading={savingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
