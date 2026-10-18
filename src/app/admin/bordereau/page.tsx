"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { useToast } from "@/components/Feedback";
import {
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  buttonClass,
} from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { formatTnd, type Parcel } from "@/lib/domain";
import { CopyableCode } from "@/components/CopyableCode";
import { ParcelBarcode } from "@/components/ParcelBarcode";
import { openBordereauPdf } from "@/lib/parcel-report";
import { PORTAL_BY_ROLE } from "@/lib/roles";
import { useApiQuery } from "@/lib/use-api";
import { useT } from "@/i18n/locale-context";

function BordereauInner() {
  const t = useT();
  const { session } = useAuth();
  const toast = useToast();
  const id = useSearchParams().get("id");
  const base = session ? PORTAL_BY_ROLE[session.user.role] : "/admin";
  const { data: parcel, loading } = useApiQuery<Parcel>(id ? `/parcels/${id}` : null);

  if (loading && !parcel) return <LoadingBlock label="Préparation du bordereau…" />;
  if (!parcel) {
    return (
      <EmptyState
        icon={Printer}
        title="Bordereau indisponible"
        description="Ouvrez un colis puis cliquez sur « Bordereau » pour l'imprimer."
        action={
          <Link href={`${base}/parcels`} className={buttonClass("secondary")}>
            Voir les colis
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("misc.bordereau.title")}
        description={
          <CopyableCode
            code={parcel.code}
            fallback={`#${parcel.id}`}
            size="sm"
            className="justify-center md:justify-start"
            textClassName="text-ops-ink/50"
          />
        }
        actions={
          <Button
            icon={Printer}
            className="print:hidden"
            onClick={() => {
              try {
                openBordereauPdf(parcel);
              } catch (err) {
                toast.error("Impression impossible", err instanceof Error ? err.message : undefined);
              }
            }}
          >
            Imprimer / PDF
          </Button>
        }
      />

      <Panel className="mx-auto max-w-lg print:border-0 print:shadow-none">
        <div className="border-b border-ops-card pb-4 text-center">
          <p className="font-display text-2xl font-extrabold text-ops-accent">Umbrella Express</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ops-ink/50">Bordereau de livraison</p>
        </div>
        <div className="mt-6 space-y-4 text-sm">
          <div className="flex justify-center print:block">
            <CopyableCode
              code={parcel.code}
              fallback={`#${parcel.id}`}
              size="lg"
              className="justify-center"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase text-ops-ink/50">Destinataire</p>
              <p className="font-semibold text-ops-ink">{parcel.recipientName}</p>
              <p className="text-ops-ink">{parcel.phone}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-ops-ink/50">COD</p>
              <p className="font-display text-xl font-bold text-ops-accent">{formatTnd(parcel.price)}</p>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase text-ops-ink/50">Adresse</p>
            <p className="font-medium text-ops-ink">
              {parcel.address}
              <br />
              {parcel.city}, {parcel.governorate}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-ops-ink/50">Contenu</p>
            <p className="text-ops-ink">{parcel.designation ?? parcel.notes ?? "—"}</p>
          </div>
          {parcel.code ? (
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="w-full max-w-sm [&_svg]:max-w-full">
                <ParcelBarcode
                  code={parcel.code}
                  height={80}
                  className="w-full"
                />
              </div>
              <p className="text-center text-[11px] text-ops-ink/45 print:hidden">
                Scannez avec la douchette ou Scanner (caméra) — ou Imprimer /
                PDF pour un bordereau papier.
              </p>
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-ops-ink/50">
              Code colis manquant — non scannable
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

export default function BordereauPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <BordereauInner />
    </Suspense>
  );
}
