"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, RefreshCw } from "lucide-react";
import { DocumentUploadField } from "@/components/DocumentUploadField";
import { errorText, useToast } from "@/components/Feedback";
import {
  Badge,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  TextField,
  TextAreaField,
  tableClass,
  tdClass,
  thClass,
  theadClass,
  trClass,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatTnd } from "@/lib/domain";
import { mediaUrl } from "@/lib/media";
import { useT } from "@/i18n/locale-context";
import { useApi, useApiQuery } from "@/lib/use-api";

type CashKind = "DEPENSE" | "COD";

type CashRegister = {
  id: number;
  kind: CashKind;
  name: string;
  agencyId: number | null;
  agency?: { id: number; name: string; governorate: string } | null;
  balance: number;
};

type CashMovement = {
  id: number;
  type: "IN" | "OUT";
  amount: number;
  label: string;
  note: string | null;
  receiptUrl?: string | null;
  invoiceRef?: string | null;
  actor?: { id: number; name: string } | null;
  createdAt: string;
};

type CashDetail = CashRegister & { movements: CashMovement[] };

export function CashRegistersManager() {
  const { session } = useAuth();
  const request = useApi();
  const toast = useToast();
  const t = useT();
  const kindLabel = (kind: CashKind) =>
    kind === "DEPENSE" ? t("cash.depenseRegister") : t("cash.codRegisterGlobal");
  const registersQuery = useApiQuery<CashRegister[]>("/cash/registers");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CashDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [factureUrl, setFactureUrl] = useState<string | null>(null);
  const canInvoice =
    session?.user.role === "EXPERT_COMPTABLE" ||
    session?.user.role === "SUPER_ADMIN" ||
    session?.user.role === "ADMIN";

  const registers = registersQuery.data ?? [];
  const byKind = useMemo(() => {
    const depense = registers.filter((r) => r.kind === "DEPENSE");
    const cod = registers.filter((r) => r.kind === "COD");
    return { depense, cod };
  }, [registers]);

  async function openRegister(id: number) {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      if (!session?.accessToken) return;
      const row = await apiFetch<CashDetail>(`/cash/registers/${id}`, {
        token: session.accessToken,
      });
      setDetail(row);
    } catch (err) {
      toast.error("Caisse inaccessible", errorText(err));
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function onMove(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    const form = new FormData(e.currentTarget);
    const type = String(form.get("type") ?? "OUT") as "IN" | "OUT";
    const amount = Number(form.get("amount"));
    const label = String(form.get("label") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    const invoiceRef = String(form.get("invoiceRef") ?? "").trim();
    if (!Number.isFinite(amount) || amount <= 0 || label.length < 2) {
      toast.error("Montant et libellé requis");
      return;
    }
    const isFacture =
      canInvoice &&
      detail?.kind === "DEPENSE" &&
      type === "OUT" &&
      (Boolean(invoiceRef) || Boolean(factureUrl));
    if (isFacture && !factureUrl) {
      toast.error("Uploadez le scan / PDF de la facture");
      return;
    }
    if (isFacture && !invoiceRef) {
      toast.error("Référence facture requise");
      return;
    }
    setBusy(true);
    try {
      await request(`/cash/registers/${selectedId}/movements`, "POST", {
        type,
        amount,
        label,
        note: note || undefined,
        invoiceRef: invoiceRef || undefined,
        receiptUrl: factureUrl || undefined,
      });
      toast.success(
        invoiceRef
          ? "Facture déduite de la caisse"
          : type === "IN"
            ? "Entrée enregistrée"
            : "Dépense enregistrée",
      );
      e.currentTarget.reset();
      setFactureUrl(null);
      await registersQuery.reload();
      await openRegister(selectedId);
    } catch (err) {
      toast.error("Mouvement refusé", errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("cash.title")}
        description={t("cash.description")}
        actions={
          <Button
            type="button"
            variant="secondary"
            icon={RefreshCw}
            onClick={() => void registersQuery.reload()}
          >
            {t("common.refresh")}
          </Button>
        }
      />

      {registersQuery.loading ? <LoadingBlock rows={3} /> : null}
      {!registersQuery.loading && registers.length === 0 ? (
        <EmptyState
          title={t("cash.emptyTitle")}
          description={t("cash.emptyDescription")}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {kindLabel("COD")}
          </h2>
          <ul className="mt-3 space-y-2">
            {byKind.cod.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => void openRegister(r.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    selectedId === r.id
                      ? "border-brand bg-brand/5"
                      : "border-ops-card hover:border-brand/40"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-ops-ink">
                      {r.name}
                    </span>
                    <Badge tone="gold">{t("common.network")}</Badge>
                  </span>
                  <span className="font-display text-lg font-bold text-ops-ink">
                    {formatTnd(r.balance)} TND
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <h2 className="font-display text-lg font-bold text-ops-ink">
            {kindLabel("DEPENSE")}
          </h2>
          <ul className="mt-3 space-y-2">
            {byKind.depense.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => void openRegister(r.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    selectedId === r.id
                      ? "border-brand bg-brand/5"
                      : "border-ops-card hover:border-brand/40"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-ops-ink">
                      {r.agency?.name ?? r.name}
                    </span>
                    <span className="text-xs text-ops-ink/50">
                      {r.agency?.governorate ?? t("common.agency")}
                    </span>
                  </span>
                  <span className="font-display text-lg font-bold text-ops-ink">
                    {formatTnd(r.balance)} TND
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {selectedId ? (
        <Panel className="space-y-5">
          {loadingDetail || !detail ? (
            <LoadingBlock rows={2} label={t("cash.loadingRegister")} />
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ops-ink/45">
                    {kindLabel(detail.kind)}
                  </p>
                  <h3 className="font-display text-xl font-bold text-ops-ink">
                    {detail.name}
                  </h3>
                </div>
                <p className="inline-flex items-center gap-2 font-display text-2xl font-bold text-ops-ink">
                  <Banknote className="h-6 w-6 text-brand" aria-hidden />
                  {formatTnd(detail.balance)} TND
                </p>
              </div>

              <form
                onSubmit={onMove}
                className="grid gap-3 rounded-xl border border-ops-card bg-ops-page/40 p-4 sm:grid-cols-2"
              >
                <label className="text-sm font-medium text-ops-ink">
                  {t("common.type")}
                  <select
                    name="type"
                    defaultValue={detail.kind === "DEPENSE" ? "OUT" : "IN"}
                    className="mt-1.5 w-full rounded-xl border border-ops-card bg-ops-surface px-3 py-2.5 text-sm"
                  >
                    <option value="IN">{t("cash.movementIn")}</option>
                    <option value="OUT">{t("cash.movementOut")}</option>
                  </select>
                </label>
                <TextField
                  name="amount"
                  label={t("cash.amountTnd")}
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                />
                <TextField
                  name="label"
                  label={t("common.label")}
                  required
                  minLength={2}
                  wrapperClassName="sm:col-span-2"
                />
                {canInvoice && detail.kind === "DEPENSE" ? (
                  <>
                    <TextField
                      name="invoiceRef"
                      label={t("cash.invoiceRefExpert")}
                      placeholder="FAC-2026-001"
                      wrapperClassName="sm:col-span-2"
                    />
                    <DocumentUploadField
                      label={t("cash.scanInvoice")}
                      kind="facture"
                      value={factureUrl}
                      onChange={setFactureUrl}
                      hint={t("cash.scanInvoiceHint")}
                      capture={false}
                      className="sm:col-span-2"
                    />
                  </>
                ) : null}
                <TextAreaField
                  name="note"
                  label={t("cash.noteOptional")}
                  rows={2}
                  wrapperClassName="sm:col-span-2"
                />
                <div className="sm:col-span-2">
                  <Button type="submit" loading={busy} icon={ArrowUpRight}>
                    {t("cash.saveMovement")}
                  </Button>
                </div>
              </form>

              <div>
                <ul className="space-y-2.5 md:hidden">
                  {detail.movements.map((m) => (
                    <li
                      key={m.id}
                      className="space-y-2 rounded-2xl border border-ops-card bg-ops-page/40 px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-ops-ink">{m.label}</p>
                          <p className="mt-0.5 text-[12px] text-ops-ink/45">
                            {new Date(m.createdAt).toLocaleString("fr-TN")}
                            {m.actor?.name ? ` · ${m.actor.name}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 font-display text-[14px] font-bold tabular-nums text-ops-ink">
                          {formatTnd(m.amount)}
                        </p>
                      </div>
                      {m.type === "IN" ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700">
                          <ArrowDownLeft className="h-3.5 w-3.5" /> {t("cash.movementIn")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] text-brand">
                          <ArrowUpRight className="h-3.5 w-3.5" />{" "}
                          {t("cash.movementOutShort")}
                        </span>
                      )}
                      {m.invoiceRef ? (
                        <p className="text-xs text-brand">
                          {t("cash.invoiceLine", { ref: m.invoiceRef })}
                        </p>
                      ) : null}
                      {m.receiptUrl ? (
                        <a
                          href={mediaUrl(m.receiptUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs font-semibold text-brand underline"
                        >
                          {m.invoiceRef ? t("cash.viewInvoice") : t("cash.viewDocument")}
                        </a>
                      ) : null}
                      {m.note ? (
                        <p className="text-xs text-ops-ink/45">{m.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className={tableClass}>
                    <thead className={theadClass}>
                      <tr>
                        <th className={thClass}>{t("common.date")}</th>
                        <th className={thClass}>{t("common.type")}</th>
                        <th className={thClass}>{t("common.label")}</th>
                        <th className={`${thClass} text-right`}>
                          {t("common.amount")}
                        </th>
                        <th className={thClass}>{t("cash.by")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.movements.map((m) => (
                        <tr key={m.id} className={trClass}>
                          <td className={tdClass}>
                            {new Date(m.createdAt).toLocaleString("fr-TN")}
                          </td>
                          <td className={tdClass}>
                            {m.type === "IN" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <ArrowDownLeft className="h-3.5 w-3.5" />{" "}
                                {t("cash.movementIn")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-brand">
                                <ArrowUpRight className="h-3.5 w-3.5" />{" "}
                                {t("cash.movementOutShort")}
                              </span>
                            )}
                          </td>
                          <td className={tdClass}>
                            <p className="font-medium text-ops-ink">{m.label}</p>
                            {m.invoiceRef ? (
                              <p className="text-xs text-brand">
                                {t("cash.invoiceLine", { ref: m.invoiceRef })}
                              </p>
                            ) : null}
                            {m.receiptUrl ? (
                              <a
                                href={mediaUrl(m.receiptUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-brand underline"
                              >
                                {m.invoiceRef
                                  ? t("cash.viewInvoice")
                                  : t("cash.viewDocument")}
                              </a>
                            ) : null}
                            {m.note ? (
                              <p className="text-xs text-ops-ink/45">{m.note}</p>
                            ) : null}
                          </td>
                          <td className={`${tdClass} text-right font-semibold`}>
                            {formatTnd(m.amount)}
                          </td>
                          <td className={tdClass}>{m.actor?.name ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {detail.movements.length === 0 ? (
                  <p className="mt-3 text-sm text-ops-ink/50">
                    {t("cash.noMovements")}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
