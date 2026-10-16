import { STATUS_META, type StatusKey } from "@/lib/status-meta";
import { code128DataUrl } from "@/lib/code128";

export type ReportParcel = {
  code: string | null;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  governorate: string;
  price: string | number;
  notes: string | null;
  status: string;
  mode: "EXTERNAL" | "INTERNAL";
  createdAt: string;
  allowOpen?: boolean;
  tryProduct?: boolean;
  isFragile?: boolean;
  isExchange?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(n);
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: Date = new Date()) {
  return value.toLocaleString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  return STATUS_META[status as StatusKey]?.label ?? status.replace(/_/g, " ");
}

function reportStyles() {
  return `
    @page { size: A4 landscape; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1a1414;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { width: 100%; }
    .brand-bar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 3px solid #991211;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-mark {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      background: #991211;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.04em;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #991211;
      margin: 0;
    }
    .brand-sub {
      margin: 2px 0 0;
      color: #6b5e56;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }
    .meta {
      text-align: right;
      color: #6b5e56;
      font-size: 10px;
    }
    .meta strong { color: #1a1414; }
    h1 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 800;
      color: #1a1414;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0 14px;
    }
    .pill {
      border: 1px solid #d8d0be;
      background: #f7f3ee;
      border-radius: 6px;
      padding: 6px 10px;
      min-width: 110px;
    }
    .pill span {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b5e56;
    }
    .pill strong {
      display: block;
      margin-top: 2px;
      font-size: 13px;
      color: #1a1414;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    thead th {
      background: #1a1414;
      color: #fff;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: left;
      padding: 8px 7px;
      font-weight: 700;
    }
    tbody td {
      border-bottom: 1px solid #e8e1d6;
      padding: 7px;
      vertical-align: top;
      word-wrap: break-word;
    }
    tbody tr:nth-child(even) td { background: #faf7f3; }
    .code { font-weight: 700; color: #991211; font-family: ui-monospace, Consolas, monospace; }
    .muted { color: #6b5e56; font-size: 10px; }
    .empty {
      border: 1px dashed #d8d0be;
      border-radius: 8px;
      padding: 28px 16px;
      text-align: center;
      color: #6b5e56;
      margin-top: 8px;
    }
    .empty strong { display: block; color: #1a1414; font-size: 14px; margin-bottom: 4px; }
    .foot {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #d8d0be;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: #6b5e56;
      font-size: 9px;
    }
    .print-hint {
      margin-top: 18px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fff8e8;
      border: 1px solid #e8c07a;
      color: #5c4816;
      font-size: 11px;
    }
    @media print {
      .print-hint { display: none !important; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  `;
}

function openPrintDocument(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${reportStyles()}</style>
</head>
<body>
  ${bodyHtml}
  <div class="print-hint no-print">
    Astuce : dans la boîte d’impression, désactivez « En-têtes et pieds de page » pour un PDF propre.
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 180);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("Autorisez les pop-ups pour exporter le PDF.");
  }
  win.opener = null;
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadParcelsExcel(
  rows: ReportParcel[],
  filename = "umbrella-colis",
  options?: { includeMode?: boolean },
) {
  const includeMode = options?.includeMode ?? false;
  const header = [
    "Code",
    "Destinataire",
    "Téléphone",
    "Adresse",
    "Ville",
    "Gouvernorat",
    "Prix (TND)",
    "Date",
    "Désignation",
    "Statut",
    ...(includeMode ? ["Mode"] : []),
  ];
  const lines = rows.map((r) =>
    [
      r.code ?? "",
      r.recipientName,
      r.phone,
      r.address,
      r.city,
      r.governorate,
      r.price,
      formatDate(r.createdAt),
      r.notes ?? "",
      statusLabel(r.status),
      ...(includeMode ? [r.mode] : []),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  const csv = `\uFEFF${[header.join(";"), ...lines].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function openParcelListPdf(options: {
  title: string;
  rows: ReportParcel[];
  accountName?: string;
  includeMode?: boolean;
}) {
  const { title, rows, accountName, includeMode = false } = options;
  const totalCod = rows.reduce((sum, r) => {
    const n = typeof r.price === "number" ? r.price : Number(r.price);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
  const external = rows.filter((r) => r.mode === "EXTERNAL").length;
  const internal = rows.length - external;

  const rowsHtml =
    rows.length === 0
      ? `<div class="empty">
          <strong>Aucun colis pour ce filtre</strong>
          Rapport généré sans ligne — filtre « ${escapeHtml(title)} ».
        </div>`
      : `<table>
          <thead>
            <tr>
              <th style="width:12%">Code</th>
              <th style="width:20%">Destinataire</th>
              <th style="width:24%">Adresse</th>
              <th style="width:9%">Prix</th>
              <th style="width:10%">Date</th>
              <th style="width:15%">Désignation</th>
              <th style="width:10%">Statut</th>
              ${includeMode ? '<th style="width:8%">Mode</th>' : ""}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
                <td><span class="code">${escapeHtml(r.code ?? "—")}</span></td>
                <td>
                  <strong>${escapeHtml(r.recipientName)}</strong>
                  <div class="muted">${escapeHtml(r.phone)}</div>
                </td>
                <td>
                  ${escapeHtml(r.address)}
                  <div class="muted">${escapeHtml(`${r.city}, ${r.governorate}`)}</div>
                </td>
                <td><strong>${escapeHtml(formatMoney(r.price))}</strong> <span class="muted">TND</span></td>
                <td>${escapeHtml(formatDate(r.createdAt))}</td>
                <td>${escapeHtml(r.notes ?? "—")}</td>
                <td>${escapeHtml(statusLabel(r.status))}</td>
                ${includeMode ? `<td>${escapeHtml(r.mode)}</td>` : ""}
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`;

  const modePills = includeMode
    ? `<div class="pill"><span>EXTERNAL</span><strong>${external}</strong></div>
        <div class="pill"><span>INTERNAL</span><strong>${internal}</strong></div>`
    : "";

  const body = `
    <div class="sheet">
      <div class="brand-bar">
        <div class="brand-mark">
          <div class="logo">UE</div>
          <div>
            <p class="brand-name">Umbrella Express</p>
            <p class="brand-sub">Rapport opérationnel</p>
          </div>
        </div>
        <div class="meta">
          <div>Émis le <strong>${escapeHtml(formatDateTime())}</strong></div>
          ${accountName ? `<div>Compte <strong>${escapeHtml(accountName)}</strong></div>` : ""}
          <div>Document confidentiel</div>
        </div>
      </div>

      <h1>${escapeHtml(title)}</h1>
      <p class="muted">Liste des colis · export PDF Umbrella</p>

      <div class="summary">
        <div class="pill"><span>Colis</span><strong>${rows.length}</strong></div>
        <div class="pill"><span>COD total</span><strong>${escapeHtml(formatMoney(totalCod))} TND</strong></div>
        ${modePills}
      </div>

      ${rowsHtml}

      <div class="foot">
        <span>Umbrella Express · Livraison Tunisie</span>
        <span>Ne pas diffuser hors du compte autorisé</span>
      </div>
    </div>
  `;

  openPrintDocument(`Umbrella — ${title}`, body);
}

export function openBordereauPdf(
  parcel: ReportParcel & { designation?: string | null },
  options?: { includeMode?: boolean },
) {
  const includeMode = options?.includeMode ?? false;
  const body = `
    <style>
      @page { size: A4 portrait; margin: 16mm; }
      .bl {
        max-width: 520px;
        margin: 0 auto;
        border: 1px solid #d8d0be;
        border-radius: 10px;
        padding: 22px;
      }
      .bl-title {
        text-align: center;
        border-bottom: 2px solid #991211;
        padding-bottom: 12px;
        margin-bottom: 18px;
      }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b5e56; margin: 0 0 3px; }
      .value { font-size: 13px; font-weight: 700; margin: 0; }
      .barcode {
        margin: 18px auto 4px;
        display: block;
        max-width: 100%;
        height: auto;
      }
    </style>
    <div class="bl">
      <div class="bl-title">
        <div class="brand-mark" style="justify-content:center">
          <div class="logo">UE</div>
          <div>
            <p class="brand-name">Umbrella Express</p>
            <p class="brand-sub">Bordereau de livraison</p>
          </div>
        </div>
      </div>
      <p class="code" style="font-size:18px;text-align:center;margin:0 0 16px">${escapeHtml(parcel.code ?? "—")}</p>
      <div class="grid">
        <div>
          <p class="label">Destinataire</p>
          <p class="value">${escapeHtml(parcel.recipientName)}</p>
          <p class="muted">${escapeHtml(parcel.phone)}</p>
        </div>
        <div>
          <p class="label">Contre-remboursement</p>
          <p class="value" style="color:#991211;font-size:20px">${escapeHtml(formatMoney(parcel.price))} TND</p>
        </div>
        <div style="grid-column:1 / -1">
          <p class="label">Adresse</p>
          <p class="value">${escapeHtml(parcel.address)}</p>
          <p class="muted">${escapeHtml(`${parcel.city}, ${parcel.governorate}`)}</p>
        </div>
        <div>
          <p class="label">Contenu</p>
          <p class="value">${escapeHtml(parcel.notes ?? parcel.designation ?? "—")}</p>
        </div>
        <div>
          <p class="label">${includeMode ? "Statut / Mode" : "Statut"}</p>
          <p class="value">${escapeHtml(statusLabel(parcel.status))}${
            includeMode ? ` · ${escapeHtml(parcel.mode)}` : ""
          }</p>
        </div>
        <div style="grid-column:1 / -1">
          <p class="label">Options colis</p>
          <p class="value">
            Ouvrir le colis : ${parcel.allowOpen || parcel.tryProduct ? "Oui" : "Non"}
            · Fragile : ${parcel.isFragile ? "Oui" : "Non"}
            ${parcel.isExchange ? " · Échange : Oui" : ""}
          </p>
        </div>
      </div>
      ${
        parcel.code
          ? `<img class="barcode" src="${code128DataUrl(parcel.code)}" alt="Code-barres ${escapeHtml(parcel.code)}" />`
          : `<p class="muted" style="text-align:center">Code manquant — non scannable</p>`
      }
      <p class="muted" style="text-align:center">Émis le ${escapeHtml(formatDateTime())}</p>
    </div>
  `;
  openPrintDocument(`Bordereau ${parcel.code ?? ""}`, body);
}

export function openReturnLotBordereauPdf(lot: {
  code: string;
  createdAt?: string;
  parcels: Array<{
    code: string | null;
    recipientName: string;
    phone: string;
    city: string;
    governorate: string;
    price: string | number;
    status: string;
  }>;
}) {
  const rows = lot.parcels
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="mono">${escapeHtml(p.code ?? "—")}</td>
        <td>${escapeHtml(p.recipientName)}<br/><span class="muted">${escapeHtml(p.phone)}</span></td>
        <td>${escapeHtml(`${p.city}, ${p.governorate}`)}</td>
        <td>${escapeHtml(formatMoney(p.price))} TND</td>
        <td>${escapeHtml(statusLabel(p.status))}</td>
      </tr>`,
    )
    .join("");

  const body = `
    <style>
      @page { size: A4 portrait; margin: 14mm; }
      body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1414; font-size: 11px; }
      .head { text-align: center; border-bottom: 3px solid #991211; padding-bottom: 12px; margin-bottom: 16px; }
      .brand { font-size: 20px; font-weight: 800; color: #991211; margin: 0; }
      .sub { margin: 4px 0 0; letter-spacing: 0.12em; text-transform: uppercase; color: #6b5e56; font-size: 10px; }
      .code { font-size: 22px; font-weight: 800; font-family: ui-monospace, monospace; margin: 12px 0 4px; }
      .barcode { display: block; margin: 10px auto 16px; max-width: 100%; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d8d0be; padding: 7px 8px; text-align: left; vertical-align: top; }
      th { background: #f4efe8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b5e56; }
      .mono { font-family: ui-monospace, monospace; font-weight: 700; }
      .muted { color: #6b5e56; font-size: 10px; }
      .foot { margin-top: 14px; color: #6b5e56; font-size: 10px; text-align: center; }
    </style>
    <div class="head">
      <p class="brand">Umbrella Express</p>
      <p class="sub">Bordereau lot retour</p>
      <p class="code">${escapeHtml(lot.code)}</p>
      <p class="muted">${lot.parcels.length} colis · max 20</p>
      <img class="barcode" src="${code128DataUrl(lot.code)}" alt="Code-barres ${escapeHtml(lot.code)}" />
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Code</th>
          <th>Destinataire</th>
          <th>Ville</th>
          <th>Montant</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="foot">Scannez le code du lot pour afficher tous les colis · Émis le ${escapeHtml(formatDateTime(lot.createdAt ? new Date(lot.createdAt) : undefined))}</p>
  `;
  openPrintDocument(`Lot retour ${lot.code}`, body);
}

export function openPickupManifestBordereauPdf(manifest: {
  code: string;
  manifestKind: "EN_ATTENTE" | "PRE_ENLEVEMENT";
  createdAt?: string;
  parcels: Array<{
    code: string | null;
    recipientName: string;
    phone: string;
    city: string;
    governorate: string;
    price: string | number;
    status: string;
  }>;
}) {
  const title =
    manifest.manifestKind === "EN_ATTENTE"
      ? "Manifeste colis en attente"
      : "Manifeste pré-enlèvement";
  const rows = manifest.parcels
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="mono">${escapeHtml(p.code ?? "—")}</td>
        <td>${escapeHtml(p.recipientName)}<br/><span class="muted">${escapeHtml(p.phone)}</span></td>
        <td>${escapeHtml(`${p.city}, ${p.governorate}`)}</td>
        <td>${escapeHtml(formatMoney(p.price))} TND</td>
        <td>${escapeHtml(statusLabel(p.status))}</td>
      </tr>`,
    )
    .join("");

  const body = `
    <style>
      @page { size: A4 portrait; margin: 14mm; }
      body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1414; font-size: 11px; }
      .head { text-align: center; border-bottom: 3px solid #991211; padding-bottom: 12px; margin-bottom: 16px; }
      .brand { font-size: 20px; font-weight: 800; color: #991211; margin: 0; }
      .sub { margin: 4px 0 0; letter-spacing: 0.12em; text-transform: uppercase; color: #6b5e56; font-size: 10px; }
      .code { font-size: 22px; font-weight: 800; font-family: ui-monospace, monospace; margin: 12px 0 4px; }
      .barcode { display: block; margin: 10px auto 16px; max-width: 100%; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d8d0be; padding: 7px 8px; text-align: left; vertical-align: top; }
      th { background: #f4efe8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b5e56; }
      .mono { font-family: ui-monospace, monospace; font-weight: 700; }
      .muted { color: #6b5e56; font-size: 10px; }
      .foot { margin-top: 14px; color: #6b5e56; font-size: 10px; text-align: center; }
    </style>
    <div class="head">
      <p class="brand">Umbrella Express</p>
      <p class="sub">${escapeHtml(title)}</p>
      <p class="code">${escapeHtml(manifest.code)}</p>
      <p class="muted">${manifest.parcels.length} colis · max 20</p>
      <img class="barcode" src="${code128DataUrl(manifest.code)}" alt="Code-barres ${escapeHtml(manifest.code)}" />
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Code</th>
          <th>Destinataire</th>
          <th>Ville</th>
          <th>Montant</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="foot">Scannez le code du manifeste pour afficher tous les colis · Émis le ${escapeHtml(formatDateTime(manifest.createdAt ? new Date(manifest.createdAt) : undefined))}</p>
  `;
  openPrintDocument(`${title} ${manifest.code}`, body);
}
