"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PoolUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}

export function roleLabel(role: string | undefined) {
  if (role === "CLIENT_ADMIN") return "Admin";
  if (role === "CLIENT_OPERATOR") return "Operator";
  if (role === "BRANCH_USER") return "Branch user";
  return role ?? "";
}

export function UserMultiSelect({
  users,
  selected,
  onChange,
  loading = false,
}: {
  users: PoolUser[];
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const summary = loading
    ? "Loading users…"
    : users.length === 0
      ? "No users left to assign"
      : selected.length === 0
        ? "Choose users"
        : selected.length === 1
          ? (users.find((person) => person.id === selected[0])?.fullName ?? "1 user selected")
          : `${selected.length} users selected`;

  return (
    <div ref={rootRef} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-slate-700">Users from this corporate</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={loading || users.length === 0}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && users.length > 0 && (
        <div
          id={listId}
          role="listbox"
          aria-label="Users from this corporate"
          aria-multiselectable="true"
          className="max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {users.map((person) => {
            const checked = selected.includes(person.id);
            return (
              <label
                key={person.id}
                role="option"
                aria-selected={checked}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selected.filter((id) => id !== person.id) : [...selected, person.id])
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{person.fullName}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {roleLabel(person.role)} · {person.phoneNumber}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
      <span className="text-xs text-slate-400">Optional. A person can stay on their other branches.</span>
    </div>
  );
}
