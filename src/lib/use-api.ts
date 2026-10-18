"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useLiveReload } from "@/lib/data-refresh";
import { useAuth } from "@/lib/auth-context";
import { MOCK_RESET_EVENT } from "@/lib/mock-db";

type Method = "POST" | "PATCH" | "DELETE" | "PUT";

type ReloadOptions = {
  /** Skip the full-page loading flash when data is already on screen. */
  silent?: boolean;
};

/** Authenticated mutation helper bound to the current session token. */
export function useApi() {
  const { session } = useAuth();
  const token = session?.accessToken;

  return useCallback(
    <T = unknown>(path: string, method: Method, body?: unknown) =>
      apiFetch<T>(path, {
        method,
        token,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    [token],
  );
}

export type QueryState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: (opts?: ReloadOptions) => Promise<void>;
};

/** Authenticated GET with loading/error state; pass `null` to skip. */
export function useApiQuery<T>(path: string | null): QueryState<T> {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const requestId = useRef(0);
  const hasDataRef = useRef(false);

  const reload = useCallback(
    async (opts?: ReloadOptions) => {
      if (!path || !token) {
        setLoading(false);
        return;
      }
      const id = ++requestId.current;
      const silent = Boolean(opts?.silent && hasDataRef.current);
      if (!silent) setLoading(true);
      try {
        const result = await apiFetch<T>(path, { token });
        if (id === requestId.current) {
          setData(result);
          hasDataRef.current = true;
          setError(null);
        }
      } catch (err) {
        if (id === requestId.current) {
          setError(err instanceof Error ? err.message : "Chargement impossible");
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [path, token],
  );

  useEffect(() => {
    hasDataRef.current = false;
    void reload();
  }, [reload]);

  useEffect(() => {
    const onReset = () => void reload({ silent: true });
    window.addEventListener(MOCK_RESET_EVENT, onReset);
    return () => window.removeEventListener(MOCK_RESET_EVENT, onReset);
  }, [reload]);

  useLiveReload(() => {
    void reload({ silent: true });
  }, { enabled: Boolean(path && token) });

  return { data, error, loading, reload };
}
