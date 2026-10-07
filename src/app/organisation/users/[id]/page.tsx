"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, KeyRound, Pencil, RotateCcw } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RolePicker } from "@/components/RolePicker";
import { userInitials } from "@/components/UserMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ORGANISATION_ROLES, roleDescription } from "@/lib/roles";
import type { OrganisationUser } from "@/lib/types";

export default function OrganisationUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const toast = useToast();

  const [user, setUser] = useState<OrganisationUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    role: "MAKER",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<OrganisationUser>(`/api/v1/organisation/users/${userId}`);
      setUser(data);
      setProfileForm({
        fullName: data.fullName,
        email: data.email ?? "",
        role: data.role,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load user",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function toggleStatus() {
    if (!user) return;
    setBusy(true);
    try {
      const action = user.status === "ACTIVE" ? "suspend" : "reactivate";
      await apiFetch(`/api/v1/organisation/users/${userId}/${action}`, {
        method: "PATCH",
      });
      toast.success(
        `${user.fullName} ${user.status === "ACTIVE" ? "suspended" : "reactivated"}`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch(`/api/v1/organisation/users/${userId}`, {
        method: "PUT",
        body: profileForm,
      });
      toast.success("Profile updated");
      setProfileOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await apiFetch(`/api/v1/organisation/users/${userId}/password`, {
        method: "PATCH",
        body: { password: newPassword },
      });
      toast.success("Password updated");
      setNewPassword("");
      setPasswordOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to set password",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const roleName =
    ORGANISATION_ROLES.find((item) => item.value === user?.role)?.label ?? user?.role;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Link
          href="/organisation/users"
          className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Users
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {user ? userInitials(user.fullName) : "…"}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                {loading ? "Loading…" : (user?.fullName ?? "User")}
              </h1>
              {user && (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={user.status} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {roleName}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    <span className="font-mono text-slate-700">{user.phoneNumber}</span>
                    {user.email && <span> · {user.email}</span>}
                  </p>
                </>
              )}
            </div>
          </div>
          {user && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                icon={<Pencil size={16} />}
                onClick={() => setProfileOpen(true)}
              >
                Edit profile
              </Button>
              <Button
                variant="outline"
                icon={<KeyRound size={16} />}
                onClick={() => setPasswordOpen(true)}
              >
                Set password
              </Button>
              <Button
                variant="outline"
                icon={user.status === "ACTIVE" ? <Ban size={16} /> : <RotateCcw size={16} />}
                loading={busy}
                onClick={toggleStatus}
              >
                {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : user ? (
        <Card className="max-w-3xl p-5">
          <h2 className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Profile
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="Full name" value={user.fullName} />
            <Detail label="Phone" value={user.phoneNumber} mono />
            <Detail label="Email" value={user.email || "Not set"} />
            <Detail label="Role" value={roleName ?? "—"} />
          </dl>
          {roleDescription(user.role) && (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              {roleDescription(user.role)}
            </p>
          )}
        </Card>
      ) : null}

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Edit profile"
        description="Phone number is the login identifier and stays as it is."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setProfileOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-profile-form" loading={savingProfile}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="user-profile-form" onSubmit={saveProfile} className="flex flex-col gap-4">
          <Field
            label="Full name"
            required
            value={profileForm.fullName}
            onChange={(e) =>
              setProfileForm({ ...profileForm, fullName: e.target.value })
            }
          />
          <Field
            label="Email (optional)"
            type="email"
            value={profileForm.email}
            onChange={(e) =>
              setProfileForm({ ...profileForm, email: e.target.value })
            }
            placeholder="name@organisation.com"
          />
          <div>
            <p className="text-sm font-medium text-slate-700">Access</p>
            <div className="mt-1.5">
              <RolePicker
                roles={ORGANISATION_ROLES}
                value={profileForm.role}
                onChange={(role) => setProfileForm({ ...profileForm, role })}
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Set password"
        description="They sign in with this phone or email and the new password."
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-password-form" loading={savingPassword}>
              Set password
            </Button>
          </>
        }
      >
        <form id="user-password-form" onSubmit={savePassword} className="flex flex-col gap-4">
          <PasswordField
            label="New password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </form>
      </Modal>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className={mono ? "mt-1 font-mono text-sm font-medium text-slate-900" : "mt-1 text-sm font-medium text-slate-900"}>
        {value}
      </p>
    </div>
  );
}
