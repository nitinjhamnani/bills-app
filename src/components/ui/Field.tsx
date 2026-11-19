"use client";

import { Children, forwardRef, isValidElement, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SearchableSelect,
  type SearchableOption,
  type SearchableSelectProps,
} from "./SearchableSelect";

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

function extractNodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractNodeText(node.props.children);
  }
  return "";
}

function collectOptions(
  node: React.ReactNode,
  out: Array<{ value: string; label: string }>,
) {
  Children.forEach(node, (child) => {
    if (!isValidElement<{ value?: string | number; children?: React.ReactNode }>(child)) {
      return;
    }
    if (child.type === "option") {
      const rawValue = child.props.value;
      const label = extractNodeText(child.props.children).trim();
      const value = rawValue !== undefined ? String(rawValue) : label;
      out.push({ value, label });
    } else if (child.props?.children) {
      collectOptions(child.props.children, out);
    }
  });
}

export function SelectField({
  label,
  hint,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
}: WrapperProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { placeholder, selectableOptions } = useMemo(() => {
    const raw: Array<{ value: string; label: string }> = [];
    collectOptions(children, raw);
    const emptyOption = raw.find((opt) => opt.value === "");
    const nonEmpty: SearchableOption[] = raw
      .filter((opt) => opt.value !== "")
      .map((opt) => ({ value: opt.value, label: opt.label }));
    return {
      placeholder: emptyOption?.label || "Select an option...",
      selectableOptions: nonEmpty,
    };
  }, [children]);

  const currentValue =
    value !== undefined
      ? String(value)
      : defaultValue !== undefined
        ? String(defaultValue)
        : "";

  return (
    <SearchableSelect
      label={label}
      value={currentValue}
      onChange={(nextValue) => {
        if (!onChange) return;
        const syntheticEvent = {
          target: { value: nextValue },
          currentTarget: { value: nextValue },
          preventDefault: () => undefined,
          stopPropagation: () => undefined,
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }}
      options={selectableOptions}
      placeholder={placeholder}
      emptyMessage={selectableOptions.length === 0 ? placeholder : "No matching options found."}
      searchable={selectableOptions.length > 8}
      hint={hint}
      disabled={disabled}
      required={required}
      className={className}
    />
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

export {
  SearchableSelect,
  type SearchableOption,
  type SearchableSelectProps,
};
