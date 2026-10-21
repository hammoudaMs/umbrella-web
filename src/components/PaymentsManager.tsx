"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileUp,
  HandCoins,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { CopyableCode } from "@/components/CopyableCode";
import { errorText, useConfirm, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import {
  SenderMoneyHero,
  SenderSection,
} from "@/components/SenderMoneyHero";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Panel,
  SegmentedTabs,
  StatCard,
  TableCard,
  TextField,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
  type BadgeTone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/locale-context";
import { useAuth } from "@/lib/auth-context";
import {
  formatTnd,
  toAmount,
  type Parcel,
  type Payment,
  type PaymentHistoryEntry,
  type PaymentStatus,
} from "@/lib/domain";
import {
  canModeratePayments,
  canRequestPayment,
} from "@/lib/role-capabilities";
import {
  DEFAULT_VERSEMENT_HOLD_HOURS,
  isHoldElapsed,
  netPayoutOf,
  summarizeSenderFinance,
} from "@/lib/sender-finance";
import { mediaUrl } from "@/lib/media";
import { SortableTh, useTableSort } from "@/lib/table-sort";
import { useApi, useApiQuery } from "@/lib/use-api";

function parcelNet(p: Parcel): number {
  return netPayoutOf({
    price: toAmount(p.price),
    deliveryFee: toAmount(p.deliveryFee ?? 0),
    status: p.status,
  });
}

type PaymentSortKey = "id" | "sender" | "items" | "amount" | "status";

const PAYMENT_SORT = {
  id: (p: Payment) => p.id,
  sender: (p: Payment) => p.sender?.name ?? "",
  items: (p: Payment) => p.items.length,
  amount: (p: Payment) => toAmount(p.amount),
  status: (p: Payment) => p.status,
} as const;

const STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  EN_DEMANDE: "warning",
  VALIDE_FINANCE: "info",
  VALIDE_CHEF: "gold",
  VALIDE_EXPERT: "brand",
  APPROUVE: "info",
  AWAITING_DECHARGE: "gold",
  PAYE: "success",
  REJETE: "danger",
};

const ACTIVE: PaymentStatus[] = [
  "EN_DEMANDE",
  "VALIDE_FINANCE",
  "VALIDE_CHEF",
  "VALIDE_EXPERT",
  "APPROUVE",
  "AWAITING_DECHARGE",
  "PAYE",
];

const PIPELINE: PaymentStatus[] = [
  "EN_DEMANDE",
  "VALIDE_FINANCE",
  "VALIDE_CHEF",
  "VALIDE_EXPERT",
  "AWAITING_DECHARGE",
  "PAYE",
  "REJETE",
];

type Filter = "ALL" | PaymentStatus;
type PlatformSettings = { versementHoldHours: number };

function normalizeStatus(status: PaymentStatus): PaymentStatus {
  return status === "APPROUVE" ? "VALIDE_FINANCE" : status;
}

function paymentStatusKey(status: PaymentStatus): string {
  const normalized = normalizeStatus(status);
  const map: Partial<Record<PaymentStatus, string>> = {
    EN_DEMANDE: "payments.statusEnDemande",
    VALIDE_FINANCE: "payments.statusValideFinance",
    VALIDE_CHEF: "payments.statusValideChef",
    VALIDE_EXPERT: "payments.statusValideExpert",
    AWAITING_DECHARGE: "payments.statusAwaitingDecharge",
    PAYE: "payments.statusPaye",
    REJETE: "payments.statusRejete",
  };
  return map[normalized] ?? "payments.statusEnDemande";
}

export function PaymentsManager({
  canCreate = false,
  canModerate = false,
}: {
  canCreate?: boolean;
  canModerate?: boolean;
}) {
  const { session } = useAuth();
  const role = session?.user.role;
  const request = useApi();
  const toast = useToast();
  const confirm = useConfirm();
  const t = useT();
  const statusLabel = (status: PaymentStatus) => t(paymentStatusKey(status));
  const payments = useApiQuery<Payment[]>("/payments");
  const settings = useApiQuery<PlatformSettings>("/settings/platform");
  const senderMode = role === "EXPEDITEUR";
  const staffCreate =
    canCreate && !senderMode && canRequestPayment(role);
  const parcels = useApiQuery<Parcel[]>(
    staffCreate || senderMode ? "/parcels" : null,
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Payment | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [dechargeUrl, setDechargeUrl] = useState("");
  const [dechargeId, setDechargeId] = useState<number | null>(null);

  const holdHours =
    settings.data?.versementHoldHours ?? DEFAULT_VERSEMENT_HOLD_HOURS;
  const paymentList = useMemo(() => payments.data ?? [], [payments.data]);
  const parcelList = useMemo(() => parcels.data ?? [], [parcels.data]);

  const finance = useMemo(
    () =>
      summarizeSenderFinance(
        parcelList.map((p) => ({
          id: p.id,
          price: toAmount(p.price),
          unitSalePrice:
            p.unitSalePrice == null ? null : toAmount(p.unitSalePrice),
          deliveryFee: toAmount(p.deliveryFee ?? 0),
          returnFee: toAmount(p.returnFee ?? 0),
          status: p.status,
          deliveredAt: p.deliveredAt ?? null,
        })),
        paymentList.map((p) => ({
          amount: toAmount(p.amount),
          status: normalizeStatus(p.status),
          items: p.items.map((i) => ({
            parcelId: i.parcel.id,
            amount: toAmount(i.amount),
          })),
        })),
        { holdHours },
      ),
    [parcelList, paymentList, holdHours],
  );

  const eligible = useMemo(() => {
    const requested = new Set(
      paymentList
        .filter((p) => ACTIVE.includes(normalizeStatus(p.status)))
        .flatMap((p) => p.items.map((i) => i.parcel.id)),
    );
    const now = new Date();
    return parcelList.filter(
      (p) =>
        p.status === "LIVRES" &&
        !requested.has(p.id) &&
        isHoldElapsed(p.deliveredAt ?? p.updatedAt ?? p.createdAt, holdHours, now),
    );
  }, [parcelList, paymentList, holdHours]);

  const totals = useMemo(() => {
    const sum = (statuses: PaymentStatus[]) =>
      paymentList
        .filter((p) => statuses.includes(normalizeStatus(p.status)))
        .reduce((s, p) => s + toAmount(p.amount), 0);
    return {
      enDemande: sum(["EN_DEMANDE"]),
      enCours: sum(["VALIDE_FINANCE", "VALIDE_CHEF", "VALIDE_EXPERT"]),
      awaitingDecharge: sum(["AWAITING_DECHARGE"]),
      paye: sum(["PAYE"]),
      eligible: eligible.reduce((s, p) => s + parcelNet(p), 0),
      stress: paymentList.some((p) => p.budgetStress),
    };
  }, [paymentList, eligible]);

  const eligibleBySender = useMemo(() => {
    const map = new Map<
      number,
      { senderId: number; name: string; parcels: Parcel[] }
    >();
    for (const p of eligible) {
      const id = p.senderId;
      const name = p.sender?.name ?? `Expéditeur #${id}`;
      const row = map.get(id);
      if (row) row.parcels.push(p);
      else map.set(id, { senderId: id, name, parcels: [p] });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    );
  }, [eligible]);

  const selectedTotal = useMemo(
    () =>
      eligible
        .filter((p) => selected.includes(p.id))
        .reduce((s, p) => s + parcelNet(p), 0),
    [eligible, selected],
  );

  const openPayments = useMemo(
    () => paymentList.filter((p) => normalizeStatus(p.status) !== "PAYE"),
    [paymentList],
  );
  const paidPayments = useMemo(
    () => paymentList.filter((p) => normalizeStatus(p.status) === "PAYE"),
    [paymentList],
  );

  const listForFilter = senderMode ? openPayments : paymentList;

  const filtered = useMemo(
    () =>
      listForFilter.filter(
        (p) => filter === "ALL" || normalizeStatus(p.status) === filter,
      ),
    [listForFilter, filter],
  );

  const { sorted: visible, sortKey, sortDir, toggleSort } = useTableSort<
    Payment,
    PaymentSortKey
  >(filtered, PAYMENT_SORT, "id", "desc");

  const allSelected = eligible.length > 0 && selected.length === eligible.length;

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function reloadAll() {
    await Promise.all([
      payments.reload(),
      parcels.reload(),
      settings.reload(),
    ]);
  }

  async function onRequest() {
    if (selected.length === 0) {
      toast.error("Sélectionnez au moins un colis disponible");
      return;
    }
    setSubmitting(true);
    try {
      const created = await request<Payment>("/payments", "POST", {
        parcelIds: selected,
      });
      setSelected([]);
      toast.success(
        "Versement préparé",
        `#${created.id} · ${formatTnd(created.amount)}`,
      );
      await reloadAll();
    } catch (err) {
      toast.error("Préparation impossible", errorText(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(payment: Payment, status: PaymentStatus) {
    if (status === "REJETE") {
      const ok = await confirm({
        title: `Rejeter le versement #${payment.id} ?`,
        description: `${formatTnd(payment.amount)} · ${payment.sender?.name ?? "Expéditeur"}`,
        confirmLabel: "Rejeter",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusyId(payment.id);
    try {
      await request(`/payments/${payment.id}/status`, "PATCH", { status });
      toast.success(
        `Paiement #${payment.id} : ${statusLabel(status).toLowerCase()}`,
      );
      await reloadAll();
    } catch (err) {
      toast.error("Mise à jour impossible", errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function uploadDecharge(payment: Payment) {
    const url = dechargeUrl.trim();
    if (!url) {
      toast.error(t("payments.dechargeUrlLabel"));
      return;
    }
    setBusyId(payment.id);
    try {
      await request(`/payments/${payment.id}/decharge`, "POST", {
        dechargeUrl: url,
      });
      setDechargeUrl("");
      setDechargeId(null);
      toast.success(t("payments.dechargeSuccess"));
      await reloadAll();
    } catch (err) {
      toast.error(t("common.error"), errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function runExpertBatch() {
    setBatchBusy(true);
    try {
      const res = await request<{ paidCount: number }>(
        "/payments/expert-batch",
        "POST",
        {},
      );
      toast.success(
        "Batch expert",
        `${res.paidCount} versement(s) prêts pour décharge`,
      );
      await reloadAll();
    } catch (err) {
      toast.error("Batch impossible", errorText(err));
    } finally {
      setBatchBusy(false);
    }
  }

  function nextAction(
    payment: Payment,
  ): { status: PaymentStatus; label: string } | null {
    if (!canModerate || !canModeratePayments(role)) return null;
    const status = normalizeStatus(payment.status);
    const requiresExpert =
      payment.requiresExpert ?? toAmount(payment.amount) >= 5000;
    const isFinance =
      role === "FINANCE" ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      role === "EXPERT_COMPTABLE";
    const isChef =
      role === "CHEF_AGENCE" ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      role === "EXPERT_COMPTABLE";
    const isExpert =
      role === "EXPERT_COMPTABLE" || role === "SUPER_ADMIN" || role === "ADMIN";

    if (status === "EN_DEMANDE" && isFinance) {
      return { status: "VALIDE_FINANCE", label: "Valider finance" };
    }
    if (status === "VALIDE_FINANCE" && isChef) {
      return { status: "VALIDE_CHEF", label: "Valider chef" };
    }
    if (status === "VALIDE_CHEF" && requiresExpert && isExpert) {
      return { status: "VALIDE_EXPERT", label: "Valider expert" };
    }
    if (
      status === "VALIDE_CHEF" &&
      !requiresExpert &&
      (isChef || isFinance || isExpert)
    ) {
      return {
        status: "AWAITING_DECHARGE",
        label: t("payments.readyForDecharge"),
      };
    }
    if (status === "VALIDE_EXPERT" && isExpert) {
      return {
        status: "AWAITING_DECHARGE",
        label: t("payments.readyForDecharge"),
      };
    }
    return null;
  }

  const loadError = payments.error ?? parcels.error ?? settings.error;
  const canBatch =
    canModerate &&
    canModeratePayments(role) &&
    (role === "EXPERT_COMPTABLE" ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN");

  return (
    <div
      className={cn(
        senderMode
          ? "mx-auto max-w-3xl space-y-12 px-1 pb-10"
          : "space-y-6",
      )}
    >
      {senderMode ? (
        <header className="space-y-2">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ops-ink sm:text-3xl">
            {t("payments.title")}
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-ops-ink/45">
            {t("payments.descCreate")}
          </p>
        </header>
      ) : (
        <PageHeader
          title={t("payments.title")}
          description={t("payments.descModerate")}
          actions={
            canBatch ? (
              <Button
                type="button"
                variant="gold"
                icon={Sparkles}
                loading={batchBusy}
                onClick={() => void runExpertBatch()}
              >
                {t("payments.batchExpert24h")}
              </Button>
            ) : undefined
          }
        />
      )}

      {loadError ? (
        <ErrorBanner message={loadError} onRetry={() => void reloadAll()} />
      ) : null}

      {totals.stress && canModerate ? (
        <Panel className="border-amber-200 bg-amber-50/70 text-sm text-ops-ink">
          Budget caisse dépense ≤ 50k détecté — l’expert doit maximiser les
          versements sous 24h.
        </Panel>
      ) : null}

      {!senderMode ? (
        <p className="text-sm text-ops-ink/45">
          {t("payments.holdHoursBanner", { hours: holdHours })}
        </p>
      ) : null}

      {senderMode ? (
        <SenderMoneyHero
          label={t("payments.available")}
          value={formatTnd(finance.disponible)}
          hint={t("payments.unavailableHint", { hours: holdHours })}
          metrics={[
            {
              label: t("payments.unavailable"),
              value: formatTnd(finance.indisponible),
            },
            {
              label: t("payments.awaitingDecharge"),
              value: formatTnd(totals.awaitingDecharge),
            },
            {
              label: t("payments.disbursed"),
              value: formatTnd(finance.verse),
            },
          ]}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {staffCreate ? (
            <StatCard
              label={t("payments.available")}
              value={formatTnd(totals.eligible)}
              hint={t("payments.eligibleHint", { count: eligible.length })}
              icon={HandCoins}
              tone="success"
            />
          ) : null}
          <StatCard
            label={t("payments.inDemand")}
            value={formatTnd(totals.enDemande)}
            icon={Clock3}
            tone="gold"
          />
          <StatCard
            label={t("payments.inValidation")}
            value={formatTnd(totals.enCours)}
            icon={Wallet}
            tone="brand"
          />
          <StatCard
            label={t("payments.awaitingDecharge")}
            value={formatTnd(totals.awaitingDecharge)}
            icon={FileUp}
            tone="gold"
          />
          <StatCard
            label={t("payments.disbursed")}
            value={formatTnd(totals.paye)}
            icon={Banknote}
          />
        </div>
      )}

      {staffCreate ? (
        <SenderSection
          title={t("payments.newRequest")}
          description={`${t("payments.newRequestHint")} · ${t("payments.oneSenderHint")}`}
          action={
            eligible.length > 0 ? (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ops-ink/70">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-ops-accent"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? [] : eligible.map((p) => p.id))
                  }
                />
                {t("payments.selectAll")}
              </label>
            ) : null
          }
        >
          <div className="overflow-hidden rounded-3xl border border-ops-card bg-ops-surface">
            {eligible.length === 0 ? (
              parcels.loading ? (
                <p className="px-5 py-10 text-center text-sm text-ops-ink/45">
                  {t("common.loading")}
                </p>
              ) : (
                <div className="px-5 py-10">
                  <EmptyState
                    icon={HandCoins}
                    title={t("payments.noEligible")}
                    description={t("payments.noEligibleHint")}
                  />
                </div>
              )
            ) : (
              <div className="max-h-[22rem] overflow-y-auto">
                {eligibleBySender.map((group) => (
                  <div key={group.senderId}>
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-ops-card bg-ops-page/90 px-4 py-2 sm:px-5">
                      <p className="text-sm font-semibold text-ops-ink">
                        {group.name}
                      </p>
                      <button
                        type="button"
                        className="text-xs font-semibold text-ops-accent"
                        onClick={() => {
                          const ids = group.parcels.map((p: Parcel) => p.id);
                          const allOn = ids.every((id: number) =>
                            selected.includes(id),
                          );
                          setSelected((prev) =>
                            allOn
                              ? prev.filter((id) => !ids.includes(id))
                              : Array.from(new Set([...prev, ...ids])),
                          );
                        }}
                      >
                        {t("payments.selectAll")}
                      </button>
                    </div>
                    <ul className="divide-y divide-ops-card">
                      {group.parcels.map((p: Parcel) => {
                        const checked = selected.includes(p.id);
                        return (
                          <li key={p.id}>
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-3 px-4 py-3.5 text-sm transition sm:px-5",
                                checked
                                  ? "bg-ops-accent/[0.06]"
                                  : "hover:bg-ops-page/60",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-ops-accent"
                                checked={checked}
                                onChange={() => toggle(p.id)}
                              />
                              <span className="min-w-0 flex-1">
                                <CopyableCode
                                  code={p.code}
                                  fallback={`#${p.id}`}
                                  size="sm"
                                  className="block"
                                />
                                <span className="mt-0.5 block truncate text-xs text-ops-ink/45">
                                  {p.recipientName} · {p.city}
                                </span>
                              </span>
                              <span className="text-right">
                                <span className="block font-display text-base font-bold tabular-nums text-ops-ink">
                                  {formatTnd(parcelNet(p))}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-ops-card bg-ops-page/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-ops-ink/50">
                {t("payments.selectedSummary", {
                  count: selected.length,
                  amount: formatTnd(selectedTotal),
                })}
              </p>
              <Button
                icon={HandCoins}
                loading={submitting}
                disabled={selected.length === 0}
                onClick={() => void onRequest()}
              >
                {t("payments.requestPayment")}
              </Button>
            </div>
          </div>
        </SenderSection>
      ) : null}

      <SenderSection
        title={
          senderMode ? t("payments.historyTitle") : t("payments.filterRequests")
        }
        description={senderMode ? t("payments.emptyDescription") : undefined}
        action={
          <SegmentedTabs<Filter>
            label={t("payments.filterRequests")}
            value={filter}
            onChange={setFilter}
            options={[
              {
                value: "ALL",
                label: t("payments.allRequests"),
                count: listForFilter.length,
              },
              ...PIPELINE.filter((s) =>
                senderMode ? s !== "PAYE" : true,
              ).map((s) => ({
                value: s,
                label: statusLabel(s),
                count: listForFilter.filter(
                  (p) => normalizeStatus(p.status) === s,
                ).length,
              })),
            ]}
          />
        }
      >
        <TableCard>
          {payments.loading && paymentList.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-ops-ink/[0.06]"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Wallet}
                title={t("payments.emptyTitle")}
                description={t("payments.emptyDescription")}
              />
            </div>
          ) : (
            <>
              <ul className="space-y-3 p-3 md:hidden">
                {visible.map((p) => {
                  const busy = busyId === p.id;
                  const status = normalizeStatus(p.status);
                  const action = canModerate ? nextAction(p) : null;
                  const canReject =
                    canModerate &&
                    status !== "PAYE" &&
                    status !== "REJETE" &&
                    status !== "AWAITING_DECHARGE";
                  const needsDecharge =
                    senderMode && status === "AWAITING_DECHARGE";
                  const staffAwaiting =
                    !senderMode && status === "AWAITING_DECHARGE";
                  return (
                    <li
                      key={p.id}
                      className="space-y-3 rounded-2xl border border-ops-card bg-ops-page/40 px-3.5 py-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-ops-ink">#{p.id}</p>
                          <p className="mt-0.5 text-[12px] text-ops-ink/45">
                            {new Date(p.createdAt).toLocaleDateString("fr-TN")}
                          </p>
                          {canModerate ? (
                            <p className="mt-1 text-[12px] text-ops-ink/55">
                              {p.sender?.name ?? "—"}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 font-display text-[15px] font-bold tabular-nums text-ops-ink">
                          {formatTnd(p.amount)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[status]} dot>
                          {statusLabel(status)}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setDetail(p)}
                          className="ms-auto inline-flex items-center gap-1 text-[12px] font-semibold text-ops-accent"
                        >
                          {t("payments.viewDetail")}
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                      {staffAwaiting ? (
                        <p className="border-t border-ops-card pt-3 text-[12px] text-ops-ink/50">
                          {t("payments.staffWaitDecharge")}
                          {p.dechargeUrl ? (
                            <>
                              {" · "}
                              <a
                                href={mediaUrl(p.dechargeUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-ops-accent"
                              >
                                {t("payments.viewDecharge")}
                              </a>
                            </>
                          ) : null}
                        </p>
                      ) : null}
                      {needsDecharge ? (
                        <div className="space-y-2 border-t border-ops-card pt-3">
                          <p className="text-[12px] text-ops-ink/50">
                            {t("payments.dechargeHint")}
                          </p>
                          <TextField
                            label={t("payments.dechargeUrlLabel")}
                            value={dechargeId === p.id ? dechargeUrl : ""}
                            onChange={(e) => {
                              setDechargeId(p.id);
                              setDechargeUrl(e.target.value);
                            }}
                            placeholder="https://…"
                          />
                          <Button
                            size="sm"
                            icon={FileUp}
                            loading={busy}
                            onClick={() => void uploadDecharge(p)}
                          >
                            {t("payments.uploadDecharge")}
                          </Button>
                        </div>
                      ) : null}
                      {canModerate && (action || canReject) ? (
                        <div className="flex flex-wrap gap-2 border-t border-ops-card pt-3">
                          {action ? (
                            <Button
                              size="sm"
                              variant="success"
                              icon={CheckCircle2}
                              loading={busy}
                              onClick={() => void setStatus(p, action.status)}
                            >
                              {action.label}
                            </Button>
                          ) : null}
                          {canReject ? (
                            <Button
                              size="sm"
                              variant="danger"
                              icon={XCircle}
                              disabled={busy}
                              onClick={() => void setStatus(p, "REJETE")}
                            >
                              {t("common.reject")}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="hidden md:block">
                <table className={tableClass}>
                  <thead className={theadClass}>
                    <tr>
                      <SortableTh
                        label={t("payments.requestCol")}
                        column="id"
                        activeKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                      {canModerate ? (
                        <SortableTh
                          label={t("parcels.sender")}
                          column="sender"
                          activeKey={sortKey}
                          sortDir={sortDir}
                          onSort={toggleSort}
                        />
                      ) : null}
                      <SortableTh
                        label={t("nav.parcels")}
                        column="items"
                        activeKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                      <SortableTh
                        label={t("common.amount")}
                        column="amount"
                        activeKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="text-right"
                        buttonClassName="ml-auto"
                      />
                      <SortableTh
                        label={t("common.status")}
                        column="status"
                        activeKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                      />
                      <th className={`${thClass} text-right`}>
                        {t("common.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((p) => {
                      const busy = busyId === p.id;
                      const status = normalizeStatus(p.status);
                      const action = canModerate ? nextAction(p) : null;
                      const canReject =
                        canModerate &&
                        status !== "PAYE" &&
                        status !== "REJETE" &&
                        status !== "AWAITING_DECHARGE";
                      const needsDecharge =
                        senderMode && status === "AWAITING_DECHARGE";
                      const staffAwaiting =
                        !senderMode && status === "AWAITING_DECHARGE";
                      return (
                        <tr key={p.id} className={trClass}>
                          <td className={tdClass}>
                            <button
                              type="button"
                              onClick={() => setDetail(p)}
                              className="text-left"
                            >
                              <p className="font-semibold text-ops-ink hover:text-ops-accent">
                                #{p.id}
                              </p>
                              <p className="text-xs text-ops-ink/50">
                                {new Date(p.createdAt).toLocaleDateString(
                                  "fr-TN",
                                )}
                              </p>
                            </button>
                          </td>
                          {canModerate ? (
                            <td className={`${tdClass} text-ops-ink`}>
                              {p.sender?.name ?? "—"}
                            </td>
                          ) : null}
                          <td className={tdClass}>
                            <div className="flex flex-wrap gap-1">
                              {p.items.map((i) => (
                                <CopyableCode
                                  key={`${p.id}-${i.parcel.id}`}
                                  code={i.parcel.code}
                                  fallback={`#${i.parcel.id}`}
                                  size="sm"
                                  className="rounded-md bg-ops-ink/[0.06] px-1.5 py-0.5"
                                />
                              ))}
                            </div>
                          </td>
                          <td
                            className={`${tdClass} whitespace-nowrap text-right font-bold text-ops-ink`}
                          >
                            {formatTnd(p.amount)}
                          </td>
                          <td className={tdClass}>
                            <Badge tone={STATUS_TONE[status]} dot>
                              {statusLabel(status)}
                            </Badge>
                            {staffAwaiting ? (
                              <p className="mt-1 max-w-[14rem] text-[10px] leading-snug text-ops-ink/45">
                                {t("payments.staffWaitDecharge")}
                                {p.dechargeUrl ? (
                                  <>
                                    {" · "}
                                    <a
                                      href={mediaUrl(p.dechargeUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-ops-accent"
                                    >
                                      {t("payments.viewDecharge")}
                                    </a>
                                  </>
                                ) : null}
                              </p>
                            ) : null}
                          </td>
                          <td className={tdClass}>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setDetail(p)}
                              >
                                {t("payments.viewDetail")}
                              </Button>
                              {needsDecharge ? (
                                <Button
                                  size="sm"
                                  icon={FileUp}
                                  onClick={() => {
                                    setDechargeId(p.id);
                                    setDetail(p);
                                  }}
                                >
                                  {t("payments.uploadDecharge")}
                                </Button>
                              ) : null}
                              {action ? (
                                <Button
                                  size="sm"
                                  variant="success"
                                  icon={CheckCircle2}
                                  loading={busy}
                                  onClick={() =>
                                    void setStatus(p, action.status)
                                  }
                                >
                                  {action.label}
                                </Button>
                              ) : null}
                              {canReject ? (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  icon={XCircle}
                                  disabled={busy}
                                  onClick={() => void setStatus(p, "REJETE")}
                                >
                                  {t("common.reject")}
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TableCard>
      </SenderSection>

      {senderMode && paidPayments.length > 0 ? (
        <SenderSection title={t("payments.paidSection")}>
          <ul className="divide-y divide-ops-card overflow-hidden rounded-3xl border border-ops-card bg-ops-surface">
            {paidPayments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm sm:px-5"
              >
                <div>
                  <p className="font-semibold text-ops-ink">#{p.id}</p>
                  <p className="text-xs text-ops-ink/45">
                    {new Date(p.updatedAt ?? p.createdAt).toLocaleDateString(
                      "fr-TN",
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold tabular-nums text-ops-ink">
                    {formatTnd(p.amount)}
                  </p>
                  <Badge tone="success" dot>
                    {statusLabel("PAYE")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </SenderSection>
      ) : null}

      <PaymentDetailModal
        payment={detail}
        onClose={() => {
          setDetail(null);
          setDechargeId(null);
        }}
        statusLabel={statusLabel}
        statusTone={STATUS_TONE}
        historyTitle={t("payments.historyTitle")}
        historyEmpty={t("payments.historyEmpty")}
        parcelsTitle={t("payments.detailParcels")}
        title={
          detail
            ? t("payments.detailTitle", { id: detail.id })
            : t("payments.viewDetail")
        }
        showDecharge={
          senderMode &&
          detail != null &&
          normalizeStatus(detail.status) === "AWAITING_DECHARGE"
        }
        dechargeUrl={dechargeId === detail?.id ? dechargeUrl : ""}
        onDechargeUrlChange={(v) => {
          if (detail) setDechargeId(detail.id);
          setDechargeUrl(v);
        }}
        onUploadDecharge={() =>
          detail ? void uploadDecharge(detail) : undefined
        }
        dechargeBusy={busyId === detail?.id}
        dechargeHint={t("payments.dechargeHint")}
        dechargeUrlLabel={t("payments.dechargeUrlLabel")}
        uploadLabel={t("payments.uploadDecharge")}
      />
    </div>
  );
}

function paymentHistory(payment: Payment): PaymentHistoryEntry[] {
  if (payment.history?.length) return payment.history;
  const status = normalizeStatus(payment.status);
  const entries: PaymentHistoryEntry[] = [
    {
      at: payment.createdAt,
      status: "EN_DEMANDE",
      label: "Versement préparé",
      actorName: payment.sender?.name ?? null,
    },
  ];
  if (status !== "EN_DEMANDE") {
    entries.push({
      at: payment.updatedAt ?? payment.createdAt,
      status,
      label: status,
      actorName: null,
    });
  }
  return entries;
}

function PaymentDetailModal({
  payment,
  onClose,
  title,
  historyTitle,
  historyEmpty,
  parcelsTitle,
  statusLabel,
  statusTone,
  showDecharge,
  dechargeUrl,
  onDechargeUrlChange,
  onUploadDecharge,
  dechargeBusy,
  dechargeHint,
  dechargeUrlLabel,
  uploadLabel,
}: {
  payment: Payment | null;
  onClose: () => void;
  title: string;
  historyTitle: string;
  historyEmpty: string;
  parcelsTitle: string;
  statusLabel: (status: PaymentStatus) => string;
  statusTone: Record<PaymentStatus, BadgeTone>;
  showDecharge?: boolean;
  dechargeUrl?: string;
  onDechargeUrlChange?: (v: string) => void;
  onUploadDecharge?: () => void;
  dechargeBusy?: boolean;
  dechargeHint?: string;
  dechargeUrlLabel?: string;
  uploadLabel?: string;
}) {
  const history = payment ? paymentHistory(payment) : [];
  return (
    <Modal
      open={Boolean(payment)}
      onClose={onClose}
      title={title}
      description={
        payment
          ? `${formatTnd(payment.amount)} · ${new Date(payment.createdAt).toLocaleString("fr-TN")}`
          : undefined
      }
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          {showDecharge ? (
            <Button
              icon={FileUp}
              loading={dechargeBusy}
              onClick={onUploadDecharge}
            >
              {uploadLabel}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      }
    >
      {payment ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[normalizeStatus(payment.status)]} dot>
              {statusLabel(normalizeStatus(payment.status))}
            </Badge>
            {payment.note ? (
              <p className="text-sm text-ops-ink/55">{payment.note}</p>
            ) : null}
          </div>

          {showDecharge ? (
            <div className="space-y-2">
              <p className="text-sm text-ops-ink/50">{dechargeHint}</p>
              <TextField
                label={dechargeUrlLabel}
                value={dechargeUrl ?? ""}
                onChange={(e) => onDechargeUrlChange?.(e.target.value)}
                placeholder="https://…"
              />
            </div>
          ) : null}

          <div>
            <h3 className="text-[13px] font-semibold text-ops-ink">
              {parcelsTitle}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {payment.items.map((item) => (
                <li
                  key={item.parcel.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ops-card px-3 py-2 text-sm"
                >
                  <CopyableCode
                    code={item.parcel.code}
                    fallback={`#${item.parcel.id}`}
                    size="sm"
                  />
                  <span className="tabular-nums font-semibold text-ops-ink">
                    {formatTnd(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-ops-ink">
              {historyTitle}
            </h3>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-ops-ink/45">{historyEmpty}</p>
            ) : (
              <ol className="relative mt-3 space-y-0 border-s border-ops-card ms-2 ps-4">
                {[...history]
                  .sort(
                    (a, b) =>
                      new Date(a.at).getTime() - new Date(b.at).getTime(),
                  )
                  .map((ev, index) => (
                    <li
                      key={`${ev.at}-${ev.status}-${index}`}
                      className="pb-4 last:pb-0"
                    >
                      <span
                        className="absolute -start-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-ops-page bg-ops-accent"
                        aria-hidden
                      />
                      <p className="text-[13px] font-semibold text-ops-ink">
                        {ev.label || statusLabel(normalizeStatus(ev.status))}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ops-ink/45">
                        {new Date(ev.at).toLocaleString("fr-TN")}
                        {ev.actorName ? ` · ${ev.actorName}` : ""}
                      </p>
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
