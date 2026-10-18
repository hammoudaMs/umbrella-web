"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastApi = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<ConfirmFn | null>(null);

const TOAST_TTL_MS = 4200;

const TOAST_STYLE: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-300/60 text-emerald-700 dark:text-emerald-300",
  },
  error: { icon: AlertTriangle, className: "border-ops-accent/40 text-ops-accent" },
  info: { icon: Info, className: "border-gold/40 text-ops-ink/55" },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), TOAST_TTL_MS);
    },
    [dismiss],
  );

  const toastApi = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push],
  );

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    [],
  );

  const settle = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:end-4 sm:items-end"
        >
          {toasts.map((toast) => {
            const { icon: Icon, className } = TOAST_STYLE[toast.tone];
            return (
              <div
                key={toast.id}
                role={toast.tone === "error" ? "alert" : "status"}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-ops-surface px-4 py-3 shadow-ops",
                  className,
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ops-ink">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-xs text-ops-ink/50">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-md p-1 text-ops-ink/50 hover:text-ops-ink"
                  aria-label={t("common.close")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <Modal
          open={Boolean(confirmState)}
          onClose={() => settle(false)}
          title={confirmState?.title ?? ""}
          description={confirmState?.description}
          size="md"
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => settle(false)}>
                {confirmState?.cancelLabel ?? t("feedback.cancelDefault")}
              </Button>
              <Button
                variant={confirmState?.tone === "danger" ? "danger" : "primary"}
                onClick={() => settle(true)}
              >
                {confirmState?.confirmLabel ?? t("feedback.confirmDefault")}
              </Button>
            </div>
          }
        />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within FeedbackProvider");
  return ctx;
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within FeedbackProvider");
  return ctx;
}

export function errorText(error: unknown, fallback = "Une erreur est survenue"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
