"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Set to false for dialogs the user must act on explicitly - hides the X, and ignores backdrop clicks and Escape. */
  dismissable?: boolean;
}) {
  useEffect(() => {
    if (!open || !dismissable) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
      <button
        aria-label="Close"
        onClick={dismissable ? onClose : undefined}
        className={cn(
          "absolute inset-0 bg-slate-950/40 backdrop-blur-xs",
          !dismissable && "cursor-default",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:max-h-[85dvh] md:max-w-lg md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-base font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            )}
          </div>
          {dismissable && (
            <button
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-5 md:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end md:px-6 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
