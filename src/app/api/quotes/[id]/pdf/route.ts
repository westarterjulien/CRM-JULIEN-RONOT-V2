import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Devis non trouvé" },
        { status: 404 }
      )
    }

    // Get tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    let settings: Record<string, string> = {}
    try {
      if (tenant?.settings) {
        settings = JSON.parse(tenant.settings)
      }
    } catch {
      settings = {}
    }

    // Generate HTML for PDF
    const html = generateQuoteHTML(quote, tenant, settings)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    )
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

function formatDate(date: Date | null): string {
  if (!date) return "-"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateQuoteHTML(quote: any, tenant: any, settings: any): string {
  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    sent: "Envoyé",
    accepted: "Accepté",
    rejected: "Refusé",
    expired: "Expiré",
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: "#F5F5F7", color: "#666666" },
    sent: { bg: "#E6F0FF", color: "#0064FA" },
    accepted: { bg: "#E8F8EE", color: "#28B95F" },
    rejected: { bg: "#FEE2E8", color: "#F04B69" },
    expired: { bg: "#FFF9E6", color: "#DCB40A" },
  }

  const status = statusColors[quote.status] || statusColors.draft

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${quote.quoteNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      background: white;
      padding: 40px;
    }

    .quote-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0064FA;
    }

    .company-info {
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .company-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
      border-radius: 8px;
    }

    .company-details h1 {
      font-size: 24px;
      color: #0064FA;
      margin-bottom: 10px;
    }

    .company-details p {
      color: #666;
      font-size: 11px;
    }

    .quote-info {
      text-align: right;
    }

    .quote-info h2 {
      font-size: 28px;
      color: #333;
      margin-bottom: 10px;
    }

    .quote-number {
      font-size: 14px;
      color: #0064FA;
      font-weight: bold;
    }

    .quote-meta {
      margin-top: 10px;
      font-size: 11px;
      color: #666;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      margin-top: 10px;
      background: ${status.bg};
      color: ${status.color};
    }

    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .party {
      width: 45%;
    }

    .party-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .party-name {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .party-details {
      font-size: 11px;
      color: #666;
    }

    .validity-notice {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 30px;
      font-size: 11px;
      color: #92400e;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table th {
      background: #f8fafc;
      padding: 12px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
      border-bottom: 2px solid #e2e8f0;
    }

    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    .items-table .description {
      max-width: 350px;
    }

    .items-table .description .title {
      font-weight: bold;
      margin-bottom: 4px;
    }

    .items-table .description .details {
      color: #666;
      font-size: 11px;
    }

    .items-table .number {
      text-align: right;
    }

    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .totals-table {
      width: 300px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .totals-row.total {
      border-bottom: none;
      border-top: 2px solid #0064FA;
      margin-top: 10px;
      padding-top: 15px;
      font-size: 18px;
      font-weight: bold;
      color: #0064FA;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }

    .terms {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .terms h4 {
      font-size: 12px;
      color: #333;
      margin-bottom: 10px;
    }

    .terms p {
      font-size: 11px;
      color: #666;
      white-space: pre-line;
    }

    .notes {
      font-size: 11px;
      color: #666;
      font-style: italic;
      margin-bottom: 20px;
    }

    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
    }

    .signature-box {
      width: 45%;
      border: 1px dashed #ccc;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }

    .signature-box h5 {
      font-size: 11px;
      color: #666;
      margin-bottom: 40px;
    }

    .signature-box .signature-line {
      border-top: 1px solid #333;
      margin-top: 30px;
      padding-top: 8px;
      font-size: 10px;
      color: #999;
    }

    .legal {
      margin-top: 30px;
      font-size: 9px;
      color: #999;
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
      }

      .quote-container {
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="quote-container">
    <div class="header">
      <div class="company-info">
        ${tenant?.logo ? `<img src="${tenant.logo.startsWith('data:') ? tenant.logo : '/uploads/' + tenant.logo}" alt="Logo" class="company-logo" />` : ""}
        <div class="company-details">
          <h1>${tenant?.name || "Mon Entreprise"}</h1>
          <p>${tenant?.address || ""}</p>
          <p>${settings.postalCode || ""} ${settings.city || ""}</p>
          <p>${tenant?.email || ""}</p>
          <p>${tenant?.phone || ""}</p>
          ${settings.siret ? `<p>SIRET: ${settings.siret}</p>` : ""}
        </div>
      </div>
      <div class="quote-info">
        <h2>DEVIS</h2>
        <div class="quote-number">${quote.quoteNumber}</div>
        <div class="quote-meta">
          <p>Date d'émission: ${formatDate(quote.issueDate)}</p>
          <p>Valide jusqu'au: ${formatDate(quote.validityDate)}</p>
        </div>
        <span class="status-badge">
          ${statusLabels[quote.status] || quote.status}
        </span>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-label">Émetteur</div>
        <div class="party-name">${tenant?.name || "Mon Entreprise"}</div>
        <div class="party-details">
          ${tenant?.address || ""}<br>
          ${settings.postalCode || ""} ${settings.city || ""}<br>
          ${tenant?.email || ""}
        </div>
      </div>
      <div class="party">
        <div class="party-label">Client</div>
        <div class="party-name">${quote.client.companyName}</div>
        <div class="party-details">
          ${quote.client.address || ""}<br>
          ${quote.client.postalCode || ""} ${quote.client.city || ""}<br>
          ${quote.client.email || ""}
          ${quote.client.siret ? `<br>SIRET: ${quote.client.siret}` : ""}
        </div>
      </div>
    </div>

    <div class="validity-notice">
      <strong>Validité du devis:</strong> Ce devis est valable jusqu'au ${formatDate(quote.validityDate)}.
      Passé ce délai, les prix et conditions peuvent être révisés.
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 45%">Description</th>
          <th class="number">Qté</th>
          <th class="number">Prix unitaire HT</th>
          <th class="number">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${quote.items
          .map(
            (item: {
              title: string
              description: string
              quantity: number | { toNumber?: () => number }
              unitPriceHt: number | { toNumber?: () => number }
              totalHt: number | { toNumber?: () => number }
            }) => `
          <tr>
            <td class="description">
              <div class="title">${item.title || ""}</div>
              <div class="details">${item.description || ""}</div>
            </td>
            <td class="number">${typeof item.quantity === "object" && item.quantity?.toNumber ? item.quantity.toNumber() : item.quantity}</td>
            <td class="number">${formatCurrency(typeof item.unitPriceHt === "object" && item.unitPriceHt?.toNumber ? item.unitPriceHt.toNumber() : Number(item.unitPriceHt))}</td>
            <td class="number">${formatCurrency(typeof item.totalHt === "object" && item.totalHt?.toNumber ? item.totalHt.toNumber() : Number(item.totalHt))}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row">
          <span>Sous-total HT</span>
          <span>${formatCurrency(Number(quote.subtotalHt))}</span>
        </div>
        <div class="totals-row">
          <span>TVA (20%)</span>
          <span>${formatCurrency(Number(quote.taxAmount))}</span>
        </div>
        <div class="totals-row total">
          <span>Total TTC</span>
          <span>${formatCurrency(Number(quote.totalTtc))}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      ${
        quote.termsConditions
          ? `
      <div class="terms">
        <h4>Conditions générales</h4>
        <p>${quote.termsConditions}</p>
      </div>
      `
          : ""
      }

      ${quote.notes ? `<div class="notes"><strong>Notes:</strong> ${quote.notes}</div>` : ""}

      <div class="signature-area">
        <div class="signature-box">
          <h5>Bon pour accord - Le client</h5>
          <div class="signature-line">Date et signature</div>
        </div>
        <div class="signature-box">
          <h5>L'émetteur</h5>
          <div class="signature-line">${tenant?.name || ""}</div>
        </div>
      </div>

      <div class="legal">
        ${settings.quoteFooter || ""}
      </div>
    </div>
  </div>
</body>
</html>
  `
}
