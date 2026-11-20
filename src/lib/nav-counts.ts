import { useEffect, useState } from "react";
import { apiFetch, NAV_COUNTS_CHANGED_EVENT } from "./api-client";

export interface PaytrixNavCounts {
  billPayments: number;
  walletTopups: number;
  billDues: number;
  disputes: number;
  vendorPayments: number;
}

export interface CorporateNavCounts {
  billPayments: number;
  billDues: number;
  walletTopups: number;
}

export interface VendorNavCounts {
  billPayments: number;
  vendorTransactions: number;
}

export function useNavCounts<T>(path: string | null): T | null {
  const [counts, setCounts] = useState<T | null>(null);

  useEffect(() => {
    if (!path) {
      setCounts(null);
      return;
    }
    const activePath = path;
    let cancelled = false;
    let debounceTimer: number | undefined;

    async function load() {
      try {
        const res = await apiFetch<T>(activePath);
        if (!cancelled) setCounts(res);
      } catch {
        // Nav badges are best-effort; transient errors must not disrupt navigation.
      }
    }

    function scheduleLoad() {
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        void load();
      }, 120);
    }

    void load();
    const pollTimer = window.setInterval(() => {
      void load();
    }, 15_000);
    window.addEventListener(NAV_COUNTS_CHANGED_EVENT, scheduleLoad);
    window.addEventListener("focus", scheduleLoad);

    return () => {
      cancelled = true;
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
      }
      window.clearInterval(pollTimer);
      window.removeEventListener(NAV_COUNTS_CHANGED_EVENT, scheduleLoad);
      window.removeEventListener("focus", scheduleLoad);
    };
  }, [path]);

  return counts;
}
