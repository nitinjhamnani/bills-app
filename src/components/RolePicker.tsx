"use client";

import { cn } from "@/lib/cn";

export function RolePicker({
  roles,
  value,
  onChange,
}: {
  roles: readonly { value: string; label: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {roles.map((role) => {
        const selected = value === role.value;
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              selected
                ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500/20"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <span
              className={cn(
                "block text-sm font-semibold",
                selected ? "text-indigo-800" : "text-slate-800",
              )}
            >
              {role.label}
            </span>
            {role.description && (
              <span className="mt-1 block text-xs font-medium text-slate-500">
                {role.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
