"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { subscribeInflight } from "@/lib/api-client";

/** Slim top bar and corner spinner shown whenever any API call is in flight. */
export function GlobalLoader() {
  const [count, setCount] = useState(0);

  useEffect(() => subscribeInflight(setCount), []);

  if (count === 0) return null;

  return (
    <>
      <div
        role="progressbar"
        aria-label="Loading"
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 overflow-hidden bg-indigo-100"
      >
        <div className="h-full w-1/3 animate-[api-loader_1s_ease-in-out_infinite] bg-indigo-600" />
      </div>
      <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-2 text-xs font-medium text-white shadow-lg">
        <Loader2 size={14} className="animate-spin" />
        Working
      </div>
    </>
  );
}
