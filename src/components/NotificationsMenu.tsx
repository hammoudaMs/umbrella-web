"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, Check, MessageSquareWarning, Package, Wallet } from "lucide-react";
import type { AppNotification, NotificationKind } from "@/lib/domain";
import {
  listLocalActivity,
  LOCAL_ACTIVITY_EVENT,
} from "@/lib/local-activity";
import {
  isNotificationUnread,
  loadNotificationReads,
  persistNotificationReads,
} from "@/lib/notification-reads";
import { cn } from "@/lib/cn";
import type { AppRole } from "@/lib/roles";
import { useApiQuery } from "@/lib/use-api";

const POLL_MS = 60_000;

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  parcel: Package,
  ticket: MessageSquareWarning,
  payment: Wallet,
};

const PARCEL_DETAIL_PORTALS: AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "EXPEDITEUR",
  "LIVREUR",
  "MAGASINIER",
  "CHEF_AGENCE",
  "PICKUP",
  "SUPPORT",
];

function targetHref(item: AppNotification, role: AppRole, prefix: string): string {
  if (item.kind === "ticket") {
    if (
      item.targetId &&
      (role === "LIVREUR" || role === "MAGASINIER") &&
      item.id.startsWith("relance-")
    ) {
      return `${prefix}/parcels/${item.targetId}`;
    }
    if (role === "LIVREUR") return prefix;
    if (role === "MAGASINIER") return `${prefix}/parcels`;
    return `${prefix}/tickets`;
  }
  if (item.kind === "payment") return `${prefix}/payments`;
  if (item.targetId && PARCEL_DETAIL_PORTALS.includes(role)) {
    return `${prefix}/parcels/${item.targetId}`;
  }
  return role === "LIVREUR" ? prefix : `${prefix}/parcels`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

export function NotificationsMenu({
  role,
  userId,
  portalPrefix,
  tone = "default",
}: {
  role: AppRole;
  userId: number;
  portalPrefix: string;
  tone?: "default" | "on-dark";
}) {
  const router = useRouter();
  const { data, loading, reload } = useApiQuery<AppNotification[]>("/notifications");
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [localTick, setLocalTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const stored = loadNotificationReads(userId);
    setSeenAt(stored.seenAt);
    setReadIds(stored.readIds);
  }, [userId]);

  const persist = useCallback(
    (nextSeen: number, nextIds: string[]) => {
      persistNotificationReads(userId, nextSeen, nextIds);
      setSeenAt(nextSeen);
      setReadIds(nextIds);
    },
    [userId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => void reload(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    const bump = () => setLocalTick((n) => n + 1);
    window.addEventListener(LOCAL_ACTIVITY_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(LOCAL_ACTIVITY_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = useMemo(() => {
    const remote = data ?? [];
    const local = listLocalActivity(userId);
    void localTick;
    const byId = new Map<string, AppNotification>();
    for (const n of [...local, ...remote]) byId.set(n.id, n);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [data, userId, localTick]);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const unreadItems = useMemo(
    () => items.filter((n) => isNotificationUnread(n.at, n.id, seenAt, readSet)),
    [items, seenAt, readSet],
  );
  const unread = unreadItems.length;

  const markRead = useCallback(
    (id: string) => {
      if (readSet.has(id)) return;
      persist(seenAt, [id, ...readIds]);
    },
    [persist, readIds, readSet, seenAt],
  );

  const markAllRead = useCallback(() => {
    const nextIds = Array.from(
      new Set([...unreadItems.map((n) => n.id), ...readIds]),
    );
    persist(Date.now(), nextIds);
  }, [persist, readIds, unreadItems]);

  function openItem(item: AppNotification) {
    markRead(item.id);
    setOpen(false);
    router.push(targetHref(item, role, portalPrefix));
  }

  function toggle() {
    setOpen((value) => {
      if (!value) void reload();
      return !value;
    });
  }

  function renderPanel(className: string) {
    return (
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        className={cn(
          "overflow-hidden rounded-2xl border shadow-ops",
          className,
          tone === "on-dark"
            ? "border-ops-ink/10 bg-ops-surface"
            : "border-ops-card bg-ops-surface",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b px-4 py-3",
            tone === "on-dark" ? "border-ops-ink/10" : "border-ops-card",
          )}
        >
          <p className="font-display text-sm font-bold text-ops-ink">
            Notifications
          </p>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className={cn(
              "shrink-0 text-xs font-semibold transition disabled:opacity-40",
              tone === "on-dark"
                ? "text-ops-accent-muted hover:text-ops-accent"
                : "text-ops-accent hover:text-ops-accent/80 disabled:text-ops-ink/50/60",
            )}
          >
            Tout marquer comme lu
          </button>
        </div>
        <ul className="max-h-[min(60vh,28rem)] overflow-y-auto">
          {loading && items.length === 0 ? (
            <li
              className={cn(
                "px-4 py-6 text-center text-sm",
                tone === "on-dark" ? "text-ops-ink/45" : "text-ops-ink/50",
              )}
            >
              Chargement…
            </li>
          ) : null}
          {!loading && items.length === 0 ? (
            <li
              className={cn(
                "px-4 py-8 text-center text-sm",
                tone === "on-dark" ? "text-ops-ink/45" : "text-ops-ink/50",
              )}
            >
              Aucune notification pour le moment
            </li>
          ) : null}
          {items.map((item) => {
            const kind: NotificationKind = item.kind;
            const Icon = KIND_ICON[kind];
            const isUnread = isNotificationUnread(item.at, item.id, seenAt, readSet);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-stretch border-b",
                  tone === "on-dark" ? "border-ops-ink/[0.08]" : "border-ops-card/60",
                  isUnread &&
                    (tone === "on-dark" ? "bg-ops-accent/10" : "bg-ops-accent/[0.08]"),
                )}
              >
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    "flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left transition",
                    tone === "on-dark"
                      ? "hover:bg-ops-ink/[0.04]"
                      : "hover:bg-ops-ink/[0.05]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      tone === "on-dark"
                        ? "bg-ops-ink/[0.08] text-ops-accent-muted"
                        : "bg-ops-surface-2 text-ops-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ops-ink">
                        {item.title}
                      </span>
                      {isUnread ? (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-ops-accent"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-xs",
                        tone === "on-dark" ? "text-ops-ink/50" : "text-ops-ink/50",
                      )}
                    >
                      {item.body}
                    </span>
                    <span
                      className={cn(
                        "mt-1 block text-[11px]",
                        tone === "on-dark" ? "text-ops-ink/35" : "text-ops-ink/50/80",
                      )}
                    >
                      {relativeTime(item.at)}
                    </span>
                  </span>
                </button>
                {isUnread ? (
                  <button
                    type="button"
                    onClick={() => markRead(item.id)}
                    className={cn(
                      "m-2 inline-flex shrink-0 items-center gap-1 self-center rounded-lg px-2 py-1.5 text-[11px] font-semibold transition",
                      tone === "on-dark"
                        ? "text-ops-accent-muted hover:bg-ops-accent/15"
                        : "text-ops-accent hover:bg-ops-accent/15",
                    )}
                    aria-label={`Marquer « ${item.title} » comme lu`}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Lu
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition",
          tone === "on-dark"
            ? "border-0 bg-transparent text-ops-ink/70 hover:bg-ops-ink/[0.06] hover:text-ops-ink"
            : "border-ops-card text-ops-ink/50 hover:border-ops-accent/50 hover:text-ops-accent",
        )}
        aria-label={unread ? `Notifications, ${unread} non lues` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-ops-accent px-1 text-[10px] font-bold leading-[18px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open && isDesktop
        ? renderPanel("absolute right-0 z-50 mt-2 w-[min(92vw,380px)]")
        : null}

      {open && mounted && !isDesktop
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[70] bg-black/40"
                aria-label="Fermer les notifications"
                onClick={() => setOpen(false)}
              />
              {renderPanel(
                "fixed inset-x-3 top-[4.25rem] z-[80] max-h-[min(70vh,32rem)] w-auto",
              )}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
