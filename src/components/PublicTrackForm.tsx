"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useStatusLabel } from "@/i18n/hooks";
import { useT } from "@/i18n/locale-context";
import { trackingStepsFor } from "@/lib/tracking-lifecycle";
import { EmptyState, LoadingBlock } from "@/components/ui";
import { cn } from "@/lib/cn";

type TrackResult = {
  code: string | null;
  status: string;
  recipientName: string;
  city: string;
  governorate: string;
  updatedAt: string;
  timeline?: Array<{ at: string; label: string; status?: string | null }>;
};

export function PublicTrackForm({ initialCode = "" }: { initialCode?: string }) {
  const t = useT();
  const statusLabelFn = useStatusLabel();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<TrackResult>(
        `/parcels/track/${encodeURIComponent(trimmed)}`,
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("track.notFound"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialCode.trim()) {
      lookup(initialCode).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial only
  }, [initialCode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await lookup(code);
  }

  const trackSteps = useMemo(
    () => (result ? trackingStepsFor(result.status) : []),
    [result],
  );

  const delivered =
    result?.status === "LIVRES" || result?.status === "LIVRES_PAYES";

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-cream bg-surface p-4 shadow-soft sm:p-5"
      >
        <label className="block text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t("track.codeLabel")}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("track.codePlaceholder")}
            className="keep-ltr flex-1 rounded-xl border border-cream-soft bg-cream-soft/30 px-4 py-3 text-sm outline-none ring-brand focus:ring-2"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-soft disabled:opacity-50"
          >
            {loading ? "…" : t("track.submit")}
          </button>
        </div>
        <p className="mt-2 text-left text-[11px] text-ink-muted">
          {t("track.demoHint")}{" "}
          <button
            type="button"
            className="font-semibold text-brand hover:underline"
            onClick={() => {
              setCode("UMB-ATT-001");
              void lookup("UMB-ATT-001");
            }}
          >
            UMB-ATT-001
          </button>
        </p>
      </form>

      {loading ? <LoadingBlock label={t("track.searching")} /> : null}

      {error ? (
        <EmptyState
          title={t("track.notFoundTitle")}
          description={error}
          action={
            <Link href="/contact" className="text-sm font-semibold text-brand">
              {t("auth.contactSupport")}
            </Link>
          }
        />
      ) : null}

      {result ? (
        <div className="overflow-hidden rounded-2xl border border-cream bg-surface shadow-soft">
          <div className="border-b border-cream-soft bg-cream-soft/40 px-6 py-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <PackageSearch className="h-5 w-5" />
              </span>
              <div>
                <p className="keep-ltr text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {result.code}
                </p>
                <h2 className="font-display text-2xl font-bold text-ink">
                  {statusLabelFn(result.status)}
                </h2>
                {delivered ? (
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {t("track.deliveredBanner")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <ol className="space-y-2.5">
              {trackSteps.map((s) => (
                <li key={s.key} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                      s.current
                        ? "bg-brand ring-4 ring-brand/20"
                        : s.done
                          ? "bg-brand"
                          : "bg-cream-soft",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm",
                      s.current
                        ? "font-semibold text-ink"
                        : s.done
                          ? "text-ink"
                          : "text-ink-muted",
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">{t("track.recipient")}</dt>
                <dd className="font-medium text-ink">{result.recipientName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">{t("track.city")}</dt>
                <dd className="font-medium text-ink">
                  {result.city}, {result.governorate}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">{t("track.updated")}</dt>
                <dd className="font-medium text-ink">
                  {new Date(result.updatedAt).toLocaleString("fr-TN")}
                </dd>
              </div>
            </dl>

            {result.timeline?.length ? (
              <ul className="mt-6 space-y-3 border-t border-cream-soft pt-5">
                {result.timeline.map((ev) => (
                  <li key={`${ev.at}-${ev.label}`} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                    <div>
                      <p className="font-medium text-ink">{ev.label}</p>
                      <p className="text-xs text-ink-muted">
                        {new Date(ev.at).toLocaleString("fr-TN")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
