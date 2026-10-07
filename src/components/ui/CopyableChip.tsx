"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export function CopyableChip({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `Copy ${label || text}`}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 cursor-pointer",
        className,
      )}
    >
      <span>{text}</span>
      {copied ? (
        <Check size={11} className="text-emerald-600" />
      ) : (
        <Copy size={11} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
      )}
    </button>
  );
}
