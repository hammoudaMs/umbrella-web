"use client";

import { useEffect, useRef } from "react";

/** Broadcast after any successful mutation so open screens refetch. */
export const DATA_CHANGED_EVENT = "umbrella:data-changed";

const DEBOUNCE_MS = 350;
const VISIBLE_POLL_MS = 45_000;

let notifyTimer: ReturnType<typeof setTimeout> | null = null;

export function notifyDataChanged(): void {
  if (typeof window === "undefined") return;
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    notifyTimer = null;
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }, DEBOUNCE_MS);
}

type LiveReloadOptions = {
  /** Refetch while the tab stays visible (default 45s). Pass `0` to disable. */
  pollMs?: number;
  enabled?: boolean;
};

/**
 * Keeps imperative loaders (dashboards, tours) fresh on focus, reconnect,
 * mutation broadcasts, and optional visible-tab polling.
 */
export function useLiveReload(
  reload: () => void,
  options: LiveReloadOptions = {},
): void {
  const { pollMs = VISIBLE_POLL_MS, enabled = true } = options;
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        reloadRef.current();
      }, DEBOUNCE_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule();
    };

    window.addEventListener("focus", schedule);
    window.addEventListener("online", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(DATA_CHANGED_EVENT, schedule);

    const poll =
      pollMs > 0
        ? window.setInterval(() => {
            if (document.visibilityState === "visible") schedule();
          }, pollMs)
        : null;

    return () => {
      if (debounce) clearTimeout(debounce);
      if (poll) window.clearInterval(poll);
      window.removeEventListener("focus", schedule);
      window.removeEventListener("online", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(DATA_CHANGED_EVENT, schedule);
    };
  }, [enabled, pollMs]);
}
