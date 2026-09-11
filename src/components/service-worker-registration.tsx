"use client";

import { useEffect } from "react";

/** Installability is a progressive enhancement — a failed or skipped
 * registration must never affect the app itself. Skipped in development so
 * the service worker never shadows Fast Refresh with a stale asset cache. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
