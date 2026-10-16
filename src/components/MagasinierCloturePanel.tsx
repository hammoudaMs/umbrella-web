"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Scale, XCircle } from "lucide-react";
import { errorText, useConfirm, useToast } from "@/components/Feedback";
import {
  Badge,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  tableClass,
  tdClass,
  thClass,
  theadClass,
  trClass,
} from "@/components/ui";
import { useT } from "@/i18n/locale-context";
import { formatTnd } from "@/lib/domain";
import { mediaUrl } from "@/lib/media";
import { useApi, useApiQuery } from "@/lib/use-api";

type Deposit = {
  id: number;
  amount: number;
  expectedAmount: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  receiptUrl: string;
  parcelCount: number;
  runsheetParcelIds: number[];
  balanceCleared: boolean;
  livreur?: { id: number; name: string; email: string } | null;
  agency?: { id: number; name: string } | null;
  createdAt: string;
  rejectReason: string | null;
};

type OpenCod = {
  items: Array<{
    id: number;
    code: string | null;
    price: number;
    driverId: number | null;
  }>;
  expectedAmount: number;
  openCount: number;
};

export function MagasinierCloturePanel() {
  const request = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const t = useT();
  const depositsQuery = useApiQuery<Deposit[]>("/cash/deposits?status=PENDING");
  const openQuery = useApiQuery<OpenCod>("/cash/deposits/open-cod");
  const [busyId, setBusyId] = useState<number | null>(null);

  const pending = depositsQuery.data ?? [];
  const openByDriver = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of openQuery.data?.items ?? []) {
      if (!p.driverId) continue;
      map.set(p.driverId, (map.get(p.driverId) ?? 0) + 1);
    }
    return map;
  }, [openQuery.data]);

  async function accept(d: Deposit) {
    if (!d.balanceCleared) {
      toast.error("Manque non", "Le montant ne couvre pas le float COD");
      return;
    }
    const ok = await confirm({
      title: `Valider versement #${d.id} ?`,
      description: `${d.livreur?.name ?? "Livreur"} · ${formatTnd(d.amount)} TND · ${d.parcelCount} colis — solde doit passer à zéro.`,
      confirmLabel: "Accepter (solde 0)",
    });
    if (!ok) return;
    setBusyId(d.id);
    try {
      await request(`/cash/deposits/${d.id}/accept`, "POST", {});
      toast.success("Versement accepté", "Caisse COD créditée");
      await depositsQuery.reload();
      await openQuery.reload();
    } catch (err) {
      toast.error("Acceptation refusée", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(d: Deposit) {
    const ok = await confirm({
      title: `Rejeter versement #${d.id} ?`,
      description: "Le livreur devra soumettre un nouveau reçu.",
      confirmLabel: "Rejeter",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(d.id);
    try {
      await request(`/cash/deposits/${d.id}/reject`, "POST", {
        reason: "Runsheet / montant non conforme",
      });
      toast.success("Versement rejeté");
      await depositsQuery.reload();
    } catch (err) {
      toast.error("Rejet impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("cash.clotureTitle")}
        description={t("cash.clotureDescription")}
      />

      <Panel>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-brand" aria-hidden />
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {t("cash.openFloatTitle")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-ops-ink/50">
          {t("cash.openFloatSummary", {
            count: openQuery.data?.openCount ?? 0,
            amount: formatTnd(openQuery.data?.expectedAmount ?? 0),
            drivers: openByDriver.size,
          })}
        </p>
      </Panel>

      {depositsQuery.loading ? <LoadingBlock rows={2} /> : null}

      {!depositsQuery.loading && pending.length === 0 ? (
        <EmptyState
          title={t("cash.noPendingDepositTitle")}
          description={t("cash.noPendingDepositDescription")}
        />
      ) : (
        <div className="rounded-2xl border border-ops-card">
          <ul className="space-y-3 p-3 md:hidden">
            {pending.map((d) => {
              const busy = busyId === d.id;
              return (
                <li
                  key={d.id}
                  className="space-y-3 rounded-2xl border border-ops-card bg-ops-page/40 px-3.5 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ops-ink">
                        {d.livreur?.name ?? `Livreur #${d.id}`}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ops-ink/45">
                        {d.agency?.name ?? t("common.agency")} · #{d.id} ·{" "}
                        {d.parcelCount} colis
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-[15px] font-bold tabular-nums text-ops-ink">
                      {formatTnd(d.amount)}
                    </p>
                  </div>
                  <p className="text-[12px] text-ops-ink/45">
                    {t("cash.expected", { amount: formatTnd(d.expectedAmount) })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {d.balanceCleared ? (
                      <Badge tone="success">{t("cash.balanceZero")}</Badge>
                    ) : (
                      <Badge tone="danger">{t("cash.shortage")}</Badge>
                    )}
                    <a
                      href={mediaUrl(d.receiptUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-brand underline"
                    >
                      {t("cash.viewReceipt")}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-ops-card pt-3">
                    <Button
                      size="sm"
                      variant="success"
                      icon={CheckCircle2}
                      loading={busy}
                      onClick={() => void accept(d)}
                    >
                      {t("common.accept")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={XCircle}
                      disabled={busy}
                      onClick={() => void reject(d)}
                    >
                      {t("common.reject")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>{t("cash.driver")}</th>
                  <th className={thClass}>{t("common.amount")}</th>
                  <th className={thClass}>{t("parcels.title")}</th>
                  <th className={thClass}>{t("cash.receipt")}</th>
                  <th className={thClass}>{t("cash.balance")}</th>
                  <th className={`${thClass} text-right`}>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((d) => {
                  const busy = busyId === d.id;
                  return (
                    <tr key={d.id} className={trClass}>
                      <td className={tdClass}>
                        <p className="font-semibold text-ops-ink">
                          {d.livreur?.name ?? `Livreur #${d.id}`}
                        </p>
                        <p className="text-xs text-ops-ink/45">
                          {d.agency?.name ?? t("common.agency")} · #{d.id}
                        </p>
                      </td>
                      <td className={`${tdClass} font-bold`}>
                        {formatTnd(d.amount)}
                        <span className="block text-xs font-normal text-ops-ink/45">
                          {t("cash.expected", {
                            amount: formatTnd(d.expectedAmount),
                          })}
                        </span>
                      </td>
                      <td className={tdClass}>{d.parcelCount}</td>
                      <td className={tdClass}>
                        <a
                          href={mediaUrl(d.receiptUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-brand underline"
                        >
                          {t("cash.viewReceipt")}
                        </a>
                      </td>
                      <td className={tdClass}>
                        {d.balanceCleared ? (
                          <Badge tone="success">{t("cash.balanceZero")}</Badge>
                        ) : (
                          <Badge tone="danger">{t("cash.shortage")}</Badge>
                        )}
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            icon={CheckCircle2}
                            loading={busy}
                            onClick={() => void accept(d)}
                          >
                            {t("common.accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            icon={XCircle}
                            disabled={busy}
                            onClick={() => void reject(d)}
                          >
                            {t("common.reject")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
