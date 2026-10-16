"use client";

import { ExternalLink, FileText } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { MOCK_DOC_TEMPLATES } from "@/lib/mock-docs";
import { mediaUrl } from "@/lib/media";

/**
 * Browse mock PDF templates (demo). Files live in `/public/mock-docs`.
 */
export function MockDocsGallery() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modèles PDF (demo)"
        description="Formats mock pour reçu, facture, décharge, CIN et bordereaux — ouvrez-les pour valider le rendu."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MOCK_DOC_TEMPLATES.map((doc) => (
          <Panel key={doc.kind} className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ops-accent/10 text-ops-accent">
                <FileText className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-ops-ink">
                  {doc.title}
                </h2>
                <p className="mt-1 text-sm text-ops-ink/55">{doc.description}</p>
              </div>
            </div>
            <p className="text-xs text-ops-ink/45">
              <span className="font-semibold text-ops-ink/60">Où :</span>{" "}
              {doc.where}
            </p>
            <a
              href={mediaUrl(doc.url)}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-ops-accent px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-ops-accent-soft"
            >
              Ouvrir le PDF
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
            <p className="keep-ltr truncate text-[11px] text-ops-ink/35">
              {doc.url}
            </p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
