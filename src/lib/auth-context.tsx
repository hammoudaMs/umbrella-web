"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, setTokenRefresher, type AuthSession } from "@/lib/api";
import type { UserRow } from "@/lib/domain";
import { resetMockDb } from "@/lib/mock-db";
import { USE_MOCK } from "@/lib/mock-mode";
import { PORTAL_BY_ROLE, type AppRole } from "@/lib/roles";

export type SignUpInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "EXPEDITEUR";
  governorate: string;
  city: string;
  address: string;
  productTypes?: string[];
  productNotes?: string;
  shopName?: string;
};

export type SignUpPendingResult = {
  pending: true;
  message: string;
  kycToken?: string;
  kycRequired?: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    role: AppRole;
    phone?: string | null;
    approvalStatus?: string;
    zoneId?: number | null;
  };
};

export const KYC_TOKEN_STORAGE_KEY = "umbrella.kycToken.v1";

export type ProfileInput = {
  name?: string;
  email?: string;
  phone?: string;
  productTypes?: string[];
  parcelInputDefs?: Array<{
    id: string;
    label: string;
    required: boolean;
  }>;
};

type AuthContextValue = {
  session: AuthSession | null;
  /** False until localStorage session is read on the client (SSR-safe). */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signUp: (input: SignUpInput) => Promise<SignUpPendingResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<AuthSession | null>;
  updateProfile: (input: ProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetDemo: () => void;
  isMock: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "umbrella.session.v1";

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.user?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setAuthCookie(active: boolean) {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  if (active) {
    document.cookie = `umbrella_auth=1; path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure}`;
  } else {
    document.cookie = `umbrella_auth=; path=/; Max-Age=0; SameSite=Lax${secure}`;
  }
}

function persist(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setAuthCookie(true);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("umbrella.session");
    setAuthCookie(false);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always start null so SSR HTML matches the first client paint.
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const applySession = useCallback((data: AuthSession) => {
    const normalized: AuthSession = {
      ...data,
      portal: data.portal ?? PORTAL_BY_ROLE[data.user.role],
    };
    persist(normalized);
    setSession(normalized);
    return normalized;
  }, []);

  const clearSession = useCallback(() => {
    persist(null);
    setSession(null);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<AuthSession>("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      return applySession(data);
    },
    [applySession],
  );

  const signUp = useCallback(async (input: SignUpInput) => {
    const data = await apiFetch<SignUpPendingResult>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!data?.pending) {
      throw new Error("Inscription inattendue — réessayez");
    }
    return data;
  }, []);

  const refresh = useCallback(async () => {
    const current = readSession();
    if (!current?.refreshToken) return null;
    try {
      const data = await apiFetch<AuthSession>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      return applySession(data);
    } catch {
      clearSession();
      return null;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    setTokenRefresher(async () => (await refresh())?.accessToken ?? null);
    return () => setTokenRefresher(null);
  }, [refresh]);

  const signOut = useCallback(async () => {
    const current = readSession();
    if (current?.accessToken) {
      try {
        await apiFetch("/auth/logout", { method: "POST", token: current.accessToken });
      } catch {
        // local session is cleared regardless
      }
    }
    clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(
    async (input: ProfileInput) => {
      const current = readSession();
      if (!current) throw new Error("Session expirée");
      const user = await apiFetch<UserRow>("/users/me", {
        method: "PATCH",
        token: current.accessToken,
        body: JSON.stringify(input),
      });
      applySession({
        ...current,
        user: {
          ...current.user,
          name: user.name,
          email: user.email,
          phone: user.phone,
          productTypes: user.productTypes ?? current.user.productTypes,
          parcelInputDefs:
            user.parcelInputDefs ?? current.user.parcelInputDefs ?? null,
        },
      });
    },
    [applySession],
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const current = readSession();
    if (!current) throw new Error("Session expirée");
    await apiFetch("/users/me/password", {
      method: "PATCH",
      token: current.accessToken,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }, []);

  const resetDemo = useCallback(() => {
    if (!USE_MOCK) return;
    resetMockDb();
  }, []);

  useEffect(() => {
    if (session?.refreshToken) setAuthCookie(true);
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      ready,
      signIn,
      signUp,
      signOut,
      refresh,
      updateProfile,
      changePassword,
      resetDemo,
      isMock: USE_MOCK,
    }),
    [
      session,
      ready,
      signIn,
      signUp,
      signOut,
      refresh,
      updateProfile,
      changePassword,
      resetDemo,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
