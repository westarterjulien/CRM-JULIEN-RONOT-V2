import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
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
    const html = generateInvoiceHTML(invoice, tenant, settings)

    // Return HTML that can be printed to PDF
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
function generateInvoiceHTML(invoice: any, tenant: any, settings: any): string {
  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    sent: "Envoyée",
    paid: "Payée",
    overdue: "En retard",
    cancelled: "Annulée",
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${invoice.invoiceNumber}</title>
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

    .invoice-container {
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

    .invoice-info {
      text-align: right;
    }

    .invoice-info h2 {
      font-size: 28px;
      color: #333;
      margin-bottom: 10px;
    }

    .invoice-number {
      font-size: 14px;
      color: #0064FA;
      font-weight: bold;
    }

    .invoice-meta {
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
    }

    .status-draft { background: #F5F5F7; color: #666666; }
    .status-sent { background: #E6F0FF; color: #0064FA; }
    .status-paid { background: #E8F8EE; color: #28B95F; }
    .status-overdue { background: #FEE2E8; color: #F04B69; }

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
      max-width: 300px;
    }

    .items-table .description small {
      display: block;
      color: #999;
      font-size: 10px;
      margin-top: 4px;
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

    .payment-info {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .payment-info h4 {
      font-size: 12px;
      color: #333;
      margin-bottom: 10px;
    }

    .payment-info p {
      font-size: 11px;
      color: #666;
    }

    .notes {
      font-size: 11px;
      color: #666;
      font-style: italic;
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

      .invoice-container {
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
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
      <div class="invoice-info">
        <h2>FACTURE</h2>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <div class="invoice-meta">
          <p>Date d'émission: ${formatDate(invoice.issueDate)}</p>
          <p>Date d'échéance: ${formatDate(invoice.dueDate)}</p>
        </div>
        <span class="status-badge status-${invoice.status}">
          ${statusLabels[invoice.status] || invoice.status}
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
        <div class="party-label">Facturé à</div>
        <div class="party-name">${invoice.client.companyName}</div>
        <div class="party-details">
          ${invoice.client.address || ""}<br>
          ${invoice.client.postalCode || ""} ${invoice.client.city || ""}<br>
          ${invoice.client.email || ""}
          ${invoice.client.siret ? `<br>SIRET: ${invoice.client.siret}` : ""}
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40%">Description</th>
          <th class="number">Qté</th>
          <th>Unité</th>
          <th class="number">Prix HT</th>
          <th class="number">TVA</th>
          <th class="number">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item: {
              description: string
              quantity: number | { toNumber?: () => number }
              unit: string
              unitPriceHt: number | { toNumber?: () => number }
              vatRate: number | { toNumber?: () => number }
              totalHt: number | { toNumber?: () => number }
              service?: { name: string }
            }) => `
          <tr>
            <td class="description">
              ${item.description}
              ${item.service ? `<small>Service: ${item.service.name}</small>` : ""}
            </td>
            <td class="number">${typeof item.quantity === "object" && item.quantity?.toNumber ? item.quantity.toNumber() : item.quantity}</td>
            <td>${item.unit || "unité"}</td>
            <td class="number">${formatCurrency(typeof item.unitPriceHt === "object" && item.unitPriceHt?.toNumber ? item.unitPriceHt.toNumber() : Number(item.unitPriceHt))}</td>
            <td class="number">${typeof item.vatRate === "object" && item.vatRate?.toNumber ? item.vatRate.toNumber() : item.vatRate}%</td>
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
          <span>${formatCurrency(Number(invoice.subtotalHt))}</span>
        </div>
        <div class="totals-row">
          <span>TVA</span>
          <span>${formatCurrency(Number(invoice.taxAmount))}</span>
        </div>
        ${
          invoice.discountAmount && Number(invoice.discountAmount) > 0
            ? `
        <div class="totals-row">
          <span>Remise</span>
          <span>-${formatCurrency(Number(invoice.discountAmount))}</span>
        </div>
        `
            : ""
        }
        <div class="totals-row total">
          <span>Total TTC</span>
          <span>${formatCurrency(Number(invoice.totalTtc))}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="payment-info">
        <h4>Informations de paiement</h4>
        <p>
          ${settings.iban ? `IBAN: ${settings.iban}` : ""}
          ${settings.bic ? `<br>BIC: ${settings.bic}` : ""}
          ${settings.paymentTerms ? `<br>Conditions: Paiement à ${settings.paymentTerms} jours` : ""}
        </p>
      </div>

      ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}

      <div class="legal">
        ${settings.invoiceFooter || ""}
        ${settings.lateFee ? `<br>En cas de retard de paiement, une pénalité de ${settings.lateFee}% sera appliquée.` : ""}
      </div>
    </div>
  </div>

  <script>
    // Auto-print when opened
    // window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `
}
