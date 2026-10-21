/**
 * Simple A4 “Word-like” mock PDFs with Umbrella logo.
 * Run: node scripts/generate-mock-pdfs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "mock-docs");
const logoPath = path.join(root, "public", "logo-umbrella.png");

const ink = rgb(0.12, 0.1, 0.1);
const muted = rgb(0.4, 0.38, 0.36);
const rule = rgb(0.78, 0.74, 0.7);
const brand = rgb(0.6, 0.07, 0.07);

/** @type {Array<{ file: string, title: string, subtitle: string, fields: Array<[string, string]>, footerNote?: string, withLogo?: boolean }>} */
const docs = [
  {
    file: "receipt-versement.pdf",
    title: "Reçu de versement livreur",
    subtitle: "Remise COD magasinier / finance",
    fields: [
      ["Livreur", "Ahmed Livreur"],
      ["Agence", "Tunis Centre"],
      ["Montant COD", "245,500 TND"],
      ["Date", "15/10/2026"],
      ["Référence tournée", "RUN-DEMO-12"],
    ],
    footerNote: "Signature magasinier / finance + tampon agence",
    withLogo: true,
  },
  {
    file: "facture-expert.pdf",
    title: "Facture — caisse dépense",
    subtitle: "Justificatif de sortie de caisse",
    fields: [
      ["Référence", "FAC-EXP-2026-0042"],
      ["Libellé", "Carburant flotte"],
      ["Montant TTC", "320,000 TND"],
      ["Caisse", "Dépense agence Tunis"],
      ["Date", "15/10/2026"],
    ],
    footerNote: "Scan PDF obligatoire avant déduction",
    withLogo: true,
  },
  {
    file: "decharge-pickup.pdf",
    title: "Décharge d’enlèvement",
    subtitle: "Manifeste pickup — cachet expéditeur",
    fields: [
      ["Manifeste", "UMB-MAT-DEMO1"],
      ["Expéditeur", "Boutique Demo"],
      ["Nb colis", "2"],
      ["Date enlèvement", "15/10/2026"],
      ["Pickupeur", "Karim Pickup"],
    ],
    footerNote: "Tampon expéditeur + signature pickupeur",
    withLogo: true,
  },
  {
    file: "decharge-versement.pdf",
    title: "Décharge de versement",
    subtitle: "Je confirme avoir reçu mon versement",
    fields: [
      ["Expéditeur", "Boutique Demo"],
      ["N° versement", "#1042"],
      ["Montant reçu", "312,400 TND"],
      ["Date", "19/10/2026"],
      ["Mode", "Virement / Espèces"],
    ],
    footerNote: "Signature manuscrite de l’expéditeur (papier signé puis scanné)",
    withLogo: true,
  },
  {
    file: "cin-pickup.pdf",
    title: "Pièce d’identité",
    subtitle: "CIN pickupeur / chauffeur (recto-verso)",
    fields: [
      ["Nom", "Karim Pickup"],
      ["CIN", "08******"],
      ["Rôle", "Pickup"],
      ["Joint à", "Décharge manifeste"],
    ],
    footerNote: "Document d’identité obligatoire avec la décharge pickup",
    withLogo: false,
  },
  {
    file: "bordereau-colis.pdf",
    title: "Bordereau colis",
    subtitle: "Umbrella Express — livraison",
    fields: [
      ["Code", "UMB-ATT-001"],
      ["Destinataire", "Demo Client"],
      ["Téléphone", "57120677"],
      ["Adresse", "Cité Ennasr 2, Ariana"],
      ["COD", "49,900 TND"],
    ],
    footerNote: "À coller sur le colis · zone code-barres",
    withLogo: true,
  },
  {
    file: "bordereau-externe.pdf",
    title: "Bordereau partenaire externe",
    subtitle: "Navex / EXTERNAL",
    fields: [
      ["Code externe", "EXT-8821"],
      ["Partenaire", "app.navex.tn"],
      ["Mode", "EXTERNAL"],
      ["Suivi", "Via plateforme partenaire"],
    ],
    footerNote: "PDF partenaire — format de référence demo",
    withLogo: true,
  },
];

async function buildDoc(spec, logoBytes) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 56;
  let y = height - margin;

  page.drawRectangle({
    x: 0,
    y: height - 72,
    width,
    height: 72,
    color: rgb(0.96, 0.94, 0.91),
  });

  if (spec.withLogo !== false && logoBytes) {
    try {
      const logo = await pdf.embedPng(logoBytes);
      const logoH = 36;
      const logoW = (logo.width / logo.height) * logoH;
      page.drawImage(logo, {
        x: margin,
        y: height - 54,
        width: logoW,
        height: logoH,
      });
      page.drawText("Umbrella Express", {
        x: margin + logoW + 12,
        y: height - 38,
        size: 14,
        font: fontBold,
        color: brand,
      });
      page.drawText("Modèle demo A4", {
        x: margin + logoW + 12,
        y: height - 52,
        size: 9,
        font,
        color: muted,
      });
    } catch {
      page.drawText("Umbrella Express", {
        x: margin,
        y: height - 40,
        size: 16,
        font: fontBold,
        color: brand,
      });
    }
  } else {
    page.drawText("Umbrella Express", {
      x: margin,
      y: height - 40,
      size: 16,
      font: fontBold,
      color: brand,
    });
  }

  y = height - 110;
  page.drawText(spec.title, {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: ink,
  });
  y -= 18;
  page.drawText(spec.subtitle, {
    x: margin,
    y,
    size: 11,
    font,
    color: muted,
  });
  y -= 16;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rule,
  });
  y -= 28;

  const colLabel = margin;
  const colValue = margin + 150;
  const rowH = 28;

  for (const [label, value] of spec.fields) {
    page.drawText(label, {
      x: colLabel,
      y,
      size: 10,
      font: fontBold,
      color: muted,
    });
    page.drawText(value, {
      x: colValue,
      y,
      size: 11,
      font,
      color: ink,
    });
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rule,
    });
    y -= rowH;
  }

  y -= 24;
  page.drawText("Signatures", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: ink,
  });
  y -= 20;
  page.drawText(spec.footerNote ?? "Signature ________________", {
    x: margin,
    y,
    size: 10,
    font,
    color: muted,
    maxWidth: width - margin * 2,
  });
  y -= 40;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 200, y },
    thickness: 0.8,
    color: ink,
  });
  page.drawLine({
    start: { x: width - margin - 200, y },
    end: { x: width - margin, y },
    thickness: 0.8,
    color: ink,
  });
  page.drawText("Signature", {
    x: margin,
    y: y - 14,
    size: 9,
    font,
    color: muted,
  });
  page.drawText("Tampon / cachet", {
    x: width - margin - 200,
    y: y - 14,
    size: 9,
    font,
    color: muted,
  });

  page.drawText("Modèle demo — Umbrella · document simple type Word", {
    x: margin,
    y: 36,
    size: 8,
    font,
    color: muted,
  });

  return pdf.save();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const logoBytes = fs.existsSync(logoPath)
    ? fs.readFileSync(logoPath)
    : null;

  for (const spec of docs) {
    const bytes = await buildDoc(spec, logoBytes);
    fs.writeFileSync(path.join(outDir, spec.file), bytes);
    console.log("wrote", spec.file);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
