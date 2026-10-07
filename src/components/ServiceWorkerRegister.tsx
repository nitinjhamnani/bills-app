"use client";

import { useEffect } from "react";

/**
 * Minimal hand-rolled PWA registration (no next-pwa dependency, to avoid its Turbopack/Next 16
 * compatibility risk in Phase 0). Registers public/sw.js, which caches the app shell for
 * offline/installable behaviour - see implementation plan section 8.8.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    }
  }, []);

  return null;
}
