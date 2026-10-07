"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

const controlClasses =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20";

interface WrapperProps {
  label: string;
  hint?: string;
  className?: string;
}

export function Field({
  label,
  hint,
  className,
  ...props
}: WrapperProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium text-slate-700">{label}</span>
      <input className={controlClasses} {...props} />
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** A `Field` with a show/hide toggle - always renders type="text"/"password" itself, ignoring any `type` passed in. */
export function PasswordField({
  label,
  hint,
  className,
  ...props
}: WrapperProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={cn(controlClasses, "pr-10")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  hint,
  className,
  children,
  ...props
}: WrapperProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="font-medium text-slate-700">{label}</span>
      <select className={controlClasses} {...props}>
        {children}
      </select>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const PlainInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function PlainInput({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(controlClasses, className)} {...props} />
  );
});

export function Checkbox({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/40"
        {...props}
      />
      {label}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/20 focus:ring-offset-2",
        checked ? "bg-accent" : "bg-slate-200",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

