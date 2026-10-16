/**
 * Static mock PDF templates served from `/public/mock-docs`.
 * Used to preview document formats in demo mode.
 */
export type MockDocKind =
  | "receipt"
  | "facture"
  | "decharge"
  | "cin"
  | "bordereau"
  | "bordereau_externe";

export type MockDocTemplate = {
  kind: MockDocKind;
  file: string;
  /** Public path usable in mock DB / mediaUrl */
  url: string;
  title: string;
  description: string;
  where: string;
};

export const MOCK_DOC_TEMPLATES: readonly MockDocTemplate[] = [
  {
    kind: "receipt",
    file: "receipt-versement.pdf",
    url: "/mock-docs/receipt-versement.pdf",
    title: "Reçu de versement livreur",
    description: "Photo / PDF du reçu COD remis au magasinier ou finance.",
    where: "Livreur → Versement · Magasinier → Clôture · Caisses COD",
  },
  {
    kind: "facture",
    file: "facture-expert.pdf",
    url: "/mock-docs/facture-expert.pdf",
    title: "Facture expert (caisse dépense)",
    description: "Scan PDF obligatoire pour déduire une facture du fond de caisse.",
    where: "Expert comptable → Caisses dépense (sortie)",
  },
  {
    kind: "decharge",
    file: "decharge-pickup.pdf",
    url: "/mock-docs/decharge-pickup.pdf",
    title: "Décharge pickup cachetée",
    description: "Décharge tamponnée avant clôture du manifeste d’enlèvement.",
    where: "Pickup → Manifestes",
  },
  {
    kind: "cin",
    file: "cin-pickup.pdf",
    url: "/mock-docs/cin-pickup.pdf",
    title: "CIN pickupeur / chauffeur",
    description: "Pièce d’identité jointe avec la décharge.",
    where: "Pickup → Manifestes",
  },
  {
    kind: "bordereau",
    file: "bordereau-colis.pdf",
    url: "/mock-docs/bordereau-colis.pdf",
    title: "Bordereau colis Umbrella",
    description: "Étiquette / bordereau PDF lié au colis.",
    where: "Colis · Bordereau admin",
  },
  {
    kind: "bordereau_externe",
    file: "bordereau-externe.pdf",
    url: "/mock-docs/bordereau-externe.pdf",
    title: "Bordereau partenaire externe",
    description: "PDF partenaire (Navex / EXTERNAL).",
    where: "Colis mode EXTERNAL",
  },
] as const;

export function mockDocUrl(kind: MockDocKind): string {
  const hit = MOCK_DOC_TEMPLATES.find((d) => d.kind === kind);
  if (!hit) throw new Error(`Unknown mock doc kind: ${kind}`);
  return hit.url;
}
