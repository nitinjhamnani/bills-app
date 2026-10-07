"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow-xs hover:from-indigo-800 hover:to-indigo-700 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-indigo-500/30",
  secondary: "bg-slate-900 text-white shadow-xs hover:bg-slate-800 active:scale-[0.98]",
  outline:
    "border border-slate-300 bg-white text-slate-800 shadow-2xs hover:bg-slate-50/90 hover:border-indigo-300 active:scale-[0.98]",
  ghost: "text-slate-700 hover:bg-slate-100/80 active:scale-[0.98]",
  danger:
    "bg-gradient-to-r from-rose-700 to-rose-600 text-white shadow-xs hover:from-rose-800 hover:to-rose-700 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-500/30",
};


const SIZE_CLASSES: Record<Size, string> = {
  sm: "min-h-11 px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-lg sm:min-h-0",
  md: "min-h-11 px-4 py-2 text-sm font-semibold gap-2 rounded-xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading,
      icon,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-hidden",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === "sm" ? 14 : 16} className="animate-spin" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);

