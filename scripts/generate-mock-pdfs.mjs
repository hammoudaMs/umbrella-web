import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "mock-docs");

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(title, lines) {
  const contentLines = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 11 Tf",
    "0 -28 Td",
  ];
  lines.forEach((line, index) => {
    if (index > 0) contentLines.push("0 -16 Td");
    contentLines.push(`(${escapePdfText(line)}) Tj`);
  });
  contentLines.push("ET");
  const content = contentLines.join("\n");

  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${Buffer.byteLength(content, "utf8")} >>stream\n${content}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += object;
  }
  const xrefStart = Buffer.byteLength(body, "utf8");
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${xrefStart}\n%%EOF\n`;
  return body;
}

const docs = [
  [
    "receipt-versement.pdf",
    "UMBRELLA — Recu de versement livreur",
    [
      "Modele mock — format A4",
      "Livreur: Ahmed Livreur",
      "Agence: Tunis Centre",
      "Montant COD: 245.500 TND",
      "Date: 15/10/2026",
      "Signature magasinier / finance _______________",
      "Tampon agence",
    ],
  ],
  [
    "facture-expert.pdf",
    "UMBRELLA — Facture expert (sortie caisse depense)",
    [
      "Modele mock — format A4",
      "Reference: FAC-EXP-2026-0042",
      "Fournisseur / libelle: Carburant flotte",
      "Montant TTC: 320.000 TND",
      "Caisse: Depense agence Tunis",
      "Scan / PDF obligatoire avant deduction",
    ],
  ],
  [
    "decharge-pickup.pdf",
    "UMBRELLA — Decharge pickup (cachetee)",
    [
      "Modele mock — format A4",
      "Manifeste: UMB-MAT-DEMO1",
      "Expediteur: Boutique Demo",
      "Nb colis: 2",
      "Tampon expediteur + signature pickupeur",
      "A joindre avant cloture manifeste",
    ],
  ],
  [
    "cin-pickup.pdf",
    "UMBRELLA — CIN pickupeur / chauffeur",
    [
      "Modele mock — recto/verso scan",
      "Nom: Karim Pickup",
      "CIN: 08******",
      "Document d identite obligatoire avec la decharge",
    ],
  ],
  [
    "bordereau-colis.pdf",
    "UMBRELLA — Bordereau colis",
    [
      "Modele mock — etiquette / bordereau",
      "Code: UMB-ATT-001",
      "Destinataire: Demo Client",
      "Adresse: Cite Ennasr 2, Ariana",
      "COD: 49.900 TND",
      "Barcode zone (placeholder)",
    ],
  ],
  [
    "bordereau-externe.pdf",
    "UMBRELLA — Bordereau partenaire externe",
    [
      "Modele mock — Navex / partenaire",
      "Code externe: EXT-8821",
      "Lien: app.navex.tn",
      "Format PDF partenaire",
    ],
  ],
];

fs.mkdirSync(dir, { recursive: true });
for (const [file, title, lines] of docs) {
  fs.writeFileSync(path.join(dir, file), buildPdf(title, lines), "utf8");
  console.log("wrote", file);
}
