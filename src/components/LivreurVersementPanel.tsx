"use client";

import { FormEvent, useMemo, useState } from "react";
import { HandCoins } from "lucide-react";
import { DocumentUploadField } from "@/components/DocumentUploadField";
import { errorText, useToast } from "@/components/Feedback";
import {
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  TextField,
  tableClass,
  tdClass,
  thClass,
  theadClass,
  trClass,
} from "@/components/ui";
import { useT } from "@/i18n/locale-context";
import { useAuth } from "@/lib/auth-context";
import { formatTnd } from "@/lib/domain";
import { mediaUrl } from "@/lib/media";
import { useApi, useApiQuery } from "@/lib/use-api";

type OpenCod = {
  items: Array<{
    id: number;
    code: string | null;
    recipientName: string;
    city: string;
    price: number;
  }>;
  expectedAmount: number;
  openCount: number;
};

type Deposit = {
  id: number;
  amount: number;
  expectedAmount: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  receiptUrl: string;
  parcelCount: number;
  rejectReason: string | null;
  createdAt: string;
};

export function LivreurVersementPanel() {
  const { session } = useAuth();
  const request = useApi();
  const toast = useToast();
  const t = useT();
  const openQuery = useApiQuery<OpenCod>("/cash/deposits/open-cod");
  const depositsQuery = useApiQuery<Deposit[]>("/cash/deposits");
  const [busy, setBusy] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const open = openQuery.data;
  const pending = useMemo(
    () => (depositsQuery.data ?? []).filter((d) => d.status === "PENDING"),
    [depositsQuery.data],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session?.accessToken || !open || open.openCount === 0) return;
    if (!receiptUrl) {
      toast.error("Photo du reçu obligatoire");
      return;
    }
    setBusy(true);
    try {
      await request("/cash/deposits", "POST", {
        parcelIds: open.items.map((i) => i.id),
        amount: open.expectedAmount,
        receiptUrl,
      });
      toast.success("Versement envoyé", "En attente magasinier (solde zéro)");
      setReceiptUrl(null);
      e.currentTarget.reset();
      await Promise.all([openQuery.reload(), depositsQuery.reload()]);
    } catch (err) {
      toast.error("Versement refusé", errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("cash.depositTitle")}
        description={t("cash.depositDescription")}
      />

      {openQuery.loading ? <LoadingBlock rows={2} /> : null}

      {pending.length > 0 ? (
        <Panel className="border-amber-200 bg-amber-50/60">
          <p className="text-sm font-semibold text-ops-ink">
            {t("cash.pendingDeposit", { id: pending[0].id })}
          </p>
          <p className="mt-1 text-sm text-ops-ink/60">
            {t("cash.pendingDepositMeta", {
              amount: formatTnd(pending[0].amount),
              count: pending[0].parcelCount,
            })}
          </p>
          <a
            href={mediaUrl(pending[0].receiptUrl)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-brand underline"
          >
            {t("cash.viewSentReceipt")}
          </a>
        </Panel>
      ) : null}

      {!openQuery.loading && open && open.openCount === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={t("cash.floatZeroTitle")}
          description={t("cash.floatZeroDescription")}
        />
      ) : null}

      {open && open.openCount > 0 && pending.length === 0 ? (
        <Panel className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ops-ink">
                {t("cash.runsheetTitle")}
              </h2>
              <p className="text-sm text-ops-ink/50">
                {t("cash.runsheetSummary", {
                  count: open.openCount,
                  amount: formatTnd(open.expectedAmount),
                })}
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 md:hidden">
            {open.items.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-ops-card bg-ops-page/40 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[12px] font-semibold text-ops-ink">
                    {p.code ?? `#${p.id}`}
                  </p>
                  <p className="mt-1 truncate text-[14px] font-semibold text-ops-ink">
                    {p.recipientName}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ops-ink/45">{p.city}</p>
                </div>
                <p className="shrink-0 font-display text-[14px] font-bold tabular-nums text-ops-ink">
                  {formatTnd(p.price)}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>{t("parcels.title")}</th>
                  <th className={thClass}>{t("parcels.recipient")}</th>
                  <th className={`${thClass} text-right`}>{t("parcels.cod")}</th>
                </tr>
              </thead>
              <tbody>
                {open.items.map((p) => (
                  <tr key={p.id} className={trClass}>
                    <td className={`${tdClass} font-mono text-xs`}>
                      {p.code ?? `#${p.id}`}
                    </td>
                    <td className={tdClass}>
                      {p.recipientName}
                      <span className="block text-xs text-ops-ink/45">{p.city}</span>
                    </td>
                    <td className={`${tdClass} text-right font-semibold`}>
                      {formatTnd(p.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4 border-t border-ops-card pt-4">
            <TextField
              name="amount"
              label={t("cash.amountDeposited")}
              type="number"
              step="0.001"
              defaultValue={String(open.expectedAmount)}
              readOnly
            />
            <DocumentUploadField
              label={t("cash.receiptPhoto")}
              kind="receipt"
              value={receiptUrl}
              onChange={setReceiptUrl}
              required
              hint={t("cash.receiptPhotoHint")}
              capture
            />
            <Button type="submit" loading={busy} disabled={!receiptUrl}>
              {t("cash.submitDeposit")}
            </Button>
          </form>
        </Panel>
      ) : null}

      {(depositsQuery.data ?? []).length > 0 ? (
        <Panel>
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {t("common.history")}
          </h2>
          <ul className="mt-3 space-y-2">
            {(depositsQuery.data ?? []).slice(0, 8).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-ops-card px-3 py-2 text-sm"
              >
                <span>
                  #{d.id} · {d.status}
                  {d.rejectReason ? (
                    <span className="block text-xs text-brand">{d.rejectReason}</span>
                  ) : null}
                  <a
                    href={mediaUrl(d.receiptUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block text-xs font-semibold text-brand underline"
                  >
                    {t("cash.receipt")}
                  </a>
                </span>
                <span className="font-semibold">{formatTnd(d.amount)} TND</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
