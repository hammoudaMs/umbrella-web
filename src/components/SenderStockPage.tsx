"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, EmptyState, ErrorBanner, inputClass } from "@/components/ui";
import { errorText, useToast } from "@/components/Feedback";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTnd, toAmount, type Parcel } from "@/lib/domain";
import {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_RETURN_FEE,
  deliveryFeeOf,
  isDeliveredStatus,
  isReturnStatus,
  parcelProfitOf,
  returnFeeOf,
  roundMoney,
  salePriceOf,
  summarizeSenderFinance,
} from "@/lib/sender-finance";
import {
  stockLabel,
  type StockItem,
  type StockListResponse,
} from "@/lib/stock-types";
import { useApiQuery } from "@/lib/use-api";

type FormState = {
  name: string;
  variant: string;
  size: string;
  sku: string;
  quantity: string;
  unitCost: string;
  defaultSalePrice: string;
  lowStockAt: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  variant: "",
  size: "",
  sku: "",
  quantity: "",
  unitCost: "",
  defaultSalePrice: "",
  lowStockAt: "10",
  notes: "",
};

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm">
      <span className="mb-1.5 block font-medium text-ops-ink">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] text-ops-ink/40">{hint}</span>
      ) : null}
    </label>
  );
}

export function SenderStockPage() {
  const toast = useToast();
  const { session } = useAuth();
  const token = session?.accessToken;
  const stockQ = useApiQuery<StockListResponse>("/stock");
  const parcelsQ = useApiQuery<Parcel[]>("/parcels");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const items = stockQ.data?.items ?? [];
  const summary = stockQ.data?.summary;

  const finance = useMemo(() => {
    const list = (parcelsQ.data ?? []).filter((p) => p.status !== "SUPPRIME");
    const money = list.map((p) => ({
      price: toAmount(p.price),
      unitSalePrice:
        p.unitSalePrice != null ? toAmount(p.unitSalePrice) : null,
      unitCost: p.unitCost != null ? toAmount(p.unitCost) : null,
      deliveryFee: toAmount(p.deliveryFee ?? 0),
      returnFee: toAmount(p.returnFee ?? 0),
      status: p.status,
    }));
    const closed = money.filter(
      (p) => isDeliveredStatus(p.status) || isReturnStatus(p.status),
    );
    const s = summarizeSenderFinance(closed, []);
    return {
      ca: s.ventes,
      profit: s.profit,
      delivered: closed.filter((p) => isDeliveredStatus(p.status)).length,
    };
  }, [parcelsQ.data]);

  const preview = useMemo(() => {
    const qty = Math.max(0, Number(form.quantity) || 0);
    const cost = Math.max(0, Number(form.unitCost) || 0);
    const sale = Math.max(0, Number(form.defaultSalePrice) || 0);
    const stockValue = roundMoney(qty * cost);
    const profitIfSold =
      sale > 0
        ? roundMoney(sale - DEFAULT_DELIVERY_FEE - cost)
        : null;
    const profitIfReturn = roundMoney(
      -(DEFAULT_DELIVERY_FEE + DEFAULT_RETURN_FEE),
    );
    return { qty, cost, sale, stockValue, profitIfSold, profitIfReturn };
  }, [form.quantity, form.unitCost, form.defaultSalePrice]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (item: StockItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      variant: item.variant,
      size: item.size ?? "",
      sku: item.sku ?? "",
      quantity: String(item.quantity),
      unitCost: String(item.unitCost),
      defaultSalePrice:
        item.defaultSalePrice != null ? String(item.defaultSalePrice) : "",
      lowStockAt: item.lowStockAt != null ? String(item.lowStockAt) : "",
      notes: item.notes ?? "",
    });
    setFormOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const unitCost = Number(form.unitCost);
    if (!name) {
      toast.error("Nom produit requis");
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error("Quantité invalide");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      toast.error("Prix unitaire invalide");
      return;
    }
    const saleRaw = form.defaultSalePrice.trim();
    const saleNum = saleRaw ? Number(saleRaw) : undefined;
    if (saleRaw && (!Number.isFinite(saleNum) || (saleNum ?? 0) < 0)) {
      toast.error("Prix de vente invalide");
      return;
    }
    const lowRaw = form.lowStockAt.trim();
    const lowNum = lowRaw ? Number(lowRaw) : undefined;
    if (lowRaw && (!Number.isFinite(lowNum) || (lowNum ?? 0) < 0)) {
      toast.error("Seuil stock bas invalide");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name,
        variant: form.variant.trim(),
        size: form.size.trim() || undefined,
        sku: form.sku.trim() || undefined,
        quantity: Math.floor(quantity),
        unitCost,
        defaultSalePrice: saleNum,
        lowStockAt:
          lowNum !== undefined ? Math.floor(lowNum) : undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editingId != null) {
        await apiFetch<StockItem>(`/stock/${editingId}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(body),
        });
        toast.success("Article mis à jour");
      } else {
        await apiFetch<StockItem>("/stock", {
          method: "POST",
          token,
          body: JSON.stringify(body),
        });
        toast.success("Article ajouté au stock");
      }
      resetForm();
      await stockQ.reload();
    } catch (err) {
      toast.error("Enregistrement impossible", errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: StockItem) => {
    if (!token) return;
    if (!window.confirm(`Supprimer « ${stockLabel(item)} » du stock ?`)) {
      return;
    }
    try {
      await apiFetch(`/stock/${item.id}`, { method: "DELETE", token });
      toast.success("Article retiré");
      if (editingId === item.id) resetForm();
      await stockQ.reload();
    } catch (err) {
      toast.error("Suppression impossible", errorText(err));
    }
  };

  const loading = stockQ.loading || parcelsQ.loading;
  const error = stockQ.error || parcelsQ.error;
  const editing = editingId != null;

  return (
    <div className="w-full space-y-5 pb-8 lg:space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ops-ink lg:text-3xl">
            Gestion de stock
          </h1>
          <p className="mt-1 text-sm text-ops-ink/50">
            Ajoutez vos articles ici — séparé de la création de colis.
          </p>
        </div>
        <Button type="button" icon={Plus} onClick={openCreate}>
          Ajouter
        </Button>
      </header>

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            void stockQ.reload();
            void parcelsQ.reload();
          }}
        />
      ) : null}

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-ops-card bg-ops-surface px-3 py-3 lg:px-4">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
            Valeur stock
          </dt>
          <dd className="mt-1 font-display text-lg font-extrabold tabular-nums text-ops-ink lg:text-2xl">
            {loading ? "…" : formatTnd(summary?.stockValue ?? 0)}
          </dd>
          <p className="mt-0.5 text-[11px] text-ops-ink/40">
            qty × prix unitaire
          </p>
        </div>
        <div className="rounded-xl border border-ops-card bg-ops-surface px-3 py-3 lg:px-4">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
            Articles
          </dt>
          <dd className="mt-1 font-display text-lg font-extrabold tabular-nums text-ops-ink lg:text-2xl">
            {loading ? "…" : (summary?.totalQty ?? 0)}
          </dd>
          <p className="mt-0.5 text-[11px] text-ops-ink/40">
            {summary?.skuCount ?? 0} références
          </p>
        </div>
        <div className="rounded-xl border border-ops-card bg-ops-surface px-3 py-3 lg:px-4">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
            Chiffre d&apos;affaires
          </dt>
          <dd className="mt-1 font-display text-lg font-extrabold tabular-nums text-ops-ink lg:text-2xl">
            {loading ? "…" : formatTnd(finance.ca)}
          </dd>
          <p className="mt-0.5 text-[11px] text-ops-ink/40">
            {finance.delivered} livré(s) · retours exclus
          </p>
        </div>
        <div className="rounded-xl border border-ops-card bg-ops-surface px-3 py-3 lg:px-4">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
            Profit net
          </dt>
          <dd
            className={cn(
              "mt-1 font-display text-lg font-extrabold tabular-nums lg:text-2xl",
              finance.profit >= 0 ? "text-emerald-600" : "text-ops-accent",
            )}
          >
            {loading ? "…" : formatTnd(finance.profit)}
          </dd>
          <p className="mt-0.5 text-[11px] text-ops-ink/40">
            CA − livraison − prix unitaire
          </p>
        </div>
      </dl>

      <p className="text-xs text-ops-ink/45">
        <Link
          href="/expediteur/finances"
          className="font-semibold text-ops-accent underline-offset-2 hover:underline"
        >
          Voir suivi colis
        </Link>
      </p>

      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-ops-ink lg:text-base">
          Mes articles
          <span className="ms-1.5 font-normal text-ops-ink/35">
            ({items.length})
          </span>
        </h2>

        {items.length === 0 && !loading ? (
          <EmptyState
            icon={Package}
            title="Aucun article en stock"
            description="Ajoutez vos produits (ex. 300 Noir + 300 Bleu à 50 DT) pour suivre la valeur et le profit."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ops-card bg-ops-surface p-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ops-ink">
                    {stockLabel(item)}
                    {item.lowStock ? (
                      <span className="ms-2 text-[10px] font-bold uppercase tracking-wide text-ops-accent">
                        Stock bas
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-ops-ink/45">
                    {item.quantity} pcs · achat {formatTnd(item.unitCost)}
                    {item.defaultSalePrice != null
                      ? ` · vente cible ${formatTnd(item.defaultSalePrice)}`
                      : ""}
                    {" · "}
                    valeur{" "}
                    <span className="font-semibold tabular-nums text-ops-ink/70">
                      {formatTnd(item.stockValue)}
                    </span>
                    {item.sku ? ` · ${item.sku}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={Pencil}
                    onClick={() => openEdit(item)}
                    aria-label="Modifier"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => void onDelete(item)}
                    aria-label="Supprimer"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ClosedParcelsHint parcels={parcelsQ.data ?? []} />

      <Modal
        open={formOpen}
        onClose={resetForm}
        title={editing ? "Modifier l’article" : "Nouvel article"}
        description="Détails produit, coûts et estimation de marge."
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetForm}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="stock-item-form"
              loading={saving}
            >
              {editing ? "Enregistrer" : "Ajouter au stock"}
            </Button>
          </div>
        }
      >
        <form id="stock-item-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom produit" htmlFor="stock-name">
              <input
                id="stock-name"
                className={inputClass}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex. T-shirt"
                maxLength={120}
                required
              />
            </Field>
            <Field
              label="Variante (couleur…)"
              htmlFor="stock-variant"
              hint="Ex. Noir, Bleu — une fiche par variante"
            >
              <input
                id="stock-variant"
                className={inputClass}
                value={form.variant}
                onChange={(e) =>
                  setForm((f) => ({ ...f, variant: e.target.value }))
                }
                placeholder="Ex. Noir"
                maxLength={80}
              />
            </Field>
            <Field label="Taille" htmlFor="stock-size">
              <input
                id="stock-size"
                className={inputClass}
                value={form.size}
                onChange={(e) =>
                  setForm((f) => ({ ...f, size: e.target.value }))
                }
                placeholder="Ex. M, 42, unique"
                maxLength={40}
              />
            </Field>
            <Field
              label="Référence (SKU)"
              htmlFor="stock-sku"
              hint="Optionnel — code interne"
            >
              <input
                id="stock-sku"
                className={inputClass}
                value={form.sku}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sku: e.target.value }))
                }
                placeholder="Ex. TS-NOIR-M"
                maxLength={60}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quantité en stock" htmlFor="stock-qty">
              <input
                id="stock-qty"
                className={inputClass}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
                placeholder="300"
                required
              />
            </Field>
            <Field
              label="Alerte stock bas"
              htmlFor="stock-low"
              hint="Alerte si quantité ≤ ce seuil"
            >
              <input
                id="stock-low"
                className={inputClass}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={form.lowStockAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lowStockAt: e.target.value }))
                }
                placeholder="10"
              />
            </Field>
            <Field
              label="Prix unitaire (achat)"
              htmlFor="stock-cost"
              hint="Coût d’achat — base de la valeur stock"
            >
              <div className="relative">
                <input
                  id="stock-cost"
                  className={cn(inputClass, "pr-12")}
                  type="number"
                  min={0}
                  step="0.001"
                  inputMode="decimal"
                  value={form.unitCost}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitCost: e.target.value }))
                  }
                  placeholder="50"
                  required
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-ops-ink/40">
                  DT
                </span>
              </div>
            </Field>
            <Field
              label="Prix de vente cible"
              htmlFor="stock-sale"
              hint="Indicatif — pour estimer le profit net"
            >
              <div className="relative">
                <input
                  id="stock-sale"
                  className={cn(inputClass, "pr-12")}
                  type="number"
                  min={0}
                  step="0.001"
                  inputMode="decimal"
                  value={form.defaultSalePrice}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultSalePrice: e.target.value,
                    }))
                  }
                  placeholder="98"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-ops-ink/40">
                  DT
                </span>
              </div>
            </Field>
          </div>

          <Field label="Notes" htmlFor="stock-notes">
            <textarea
              id="stock-notes"
              className={cn(inputClass, "min-h-[4.5rem] resize-y")}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              maxLength={500}
              placeholder="Fournisseur, emplacement, remarques…"
            />
          </Field>

          <div className="rounded-xl border border-ops-card bg-ops-page/50 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ops-ink/40">
              Aperçu
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[11px] text-ops-ink/40">Valeur stock</dt>
                <dd className="font-display font-bold tabular-nums text-ops-ink">
                  {formatTnd(preview.stockValue)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ops-ink/40">
                  Profit si livré
                </dt>
                <dd
                  className={cn(
                    "font-display font-bold tabular-nums",
                    (preview.profitIfSold ?? 0) >= 0
                      ? "text-ops-ink"
                      : "text-ops-accent",
                  )}
                >
                  {preview.profitIfSold != null
                    ? formatTnd(preview.profitIfSold)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ops-ink/40">Si retour</dt>
                <dd className="font-display font-bold tabular-nums text-ops-accent">
                  {formatTnd(preview.profitIfReturn)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-ops-ink/45">
              Profit net = vente − {DEFAULT_DELIVERY_FEE} DT liv. − prix
              achat. Retour ≈ −{DEFAULT_DELIVERY_FEE + DEFAULT_RETURN_FEE} DT
              (liv. + retour). Ex. vente 98, achat 50 →{" "}
              {formatTnd(roundMoney(98 - DEFAULT_DELIVERY_FEE - 50))}.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ClosedParcelsHint({ parcels }: { parcels: Parcel[] }) {
  const rows = useMemo(() => {
    return parcels
      .filter(
        (p) =>
          p.status !== "SUPPRIME" &&
          (isDeliveredStatus(p.status) || isReturnStatus(p.status)),
      )
      .slice(0, 8)
      .map((p) => {
        const m = {
          price: toAmount(p.price),
          unitSalePrice:
            p.unitSalePrice != null ? toAmount(p.unitSalePrice) : null,
          unitCost: p.unitCost != null ? toAmount(p.unitCost) : null,
          deliveryFee: toAmount(p.deliveryFee ?? 0),
          returnFee: toAmount(p.returnFee ?? 0),
          status: p.status,
        };
        return {
          id: p.id,
          code: p.code ?? `#${p.id}`,
          ca: isDeliveredStatus(p.status) ? salePriceOf(m) : 0,
          fee: isReturnStatus(p.status)
            ? deliveryFeeOf(m) + returnFeeOf(m)
            : deliveryFeeOf(m),
          cost: isDeliveredStatus(p.status) ? (m.unitCost ?? 0) : 0,
          profit: parcelProfitOf(m),
          returned: isReturnStatus(p.status),
        };
      });
  }, [parcels]);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-ops-ink">
        Dernières ventes / retours
      </h2>
      <ul className="divide-y divide-ops-card overflow-hidden rounded-2xl border border-ops-card bg-ops-surface">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold text-ops-accent">
                {r.code}
              </p>
              <p className="text-[11px] text-ops-ink/45">
                {r.returned
                  ? `Retour · frais ${formatTnd(r.fee)}`
                  : `CA ${formatTnd(r.ca)} − liv. ${formatTnd(r.fee)} − achat ${formatTnd(r.cost)}`}
              </p>
            </div>
            <p
              className={cn(
                "shrink-0 font-display text-sm font-bold tabular-nums",
                (r.profit ?? 0) >= 0 ? "text-ops-ink" : "text-ops-accent",
              )}
            >
              {r.profit != null ? formatTnd(r.profit) : "—"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
