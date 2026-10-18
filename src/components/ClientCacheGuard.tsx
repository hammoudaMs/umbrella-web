"use client";

import { useEffect } from "react";

/**
 * Clears leftover service workers / Cache Storage from older installs so
 * portal HTML and API responses are never served from a stale SW.
 */
export function ClientCacheGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          void reg.unregister();
        }
      });
    }

    if ("caches" in window) {
      void caches.keys().then((keys) => {
        for (const key of keys) {
          void caches.delete(key);
        }
      });
    }
  }, []);

  return null;
}
