import { NextRequest, NextResponse } from "next/server"
import {
  sendEmail,
  sendPasswordResetEmail,
  sendClientInvitationEmail,
  sendSignatureRequestEmail,
  sendInvoiceEmail,
  sendQuoteEmail,
  sendInvoiceReminderEmail,
  sendInvoiceDueSoonEmail,
} from "@/lib/email"
import { prisma } from "@/lib/prisma"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email address required" },
        { status: 400 }
      )
    }

    // Get tenant info
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { name: true, settings: true },
    })
    const companyName = tenant?.name || "Luelis"

    // Get logo URL
    let logoUrl: string | undefined
    if (tenant?.settings) {
      try {
        const settings = JSON.parse(tenant.settings as string)
        logoUrl = settings.logoUrl || settings.logo_url
      } catch {
        // Ignore
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.julienronot.fr"
    const results: { type: string; success: boolean; error?: string }[] = []

    // 1. Email Facture - Virement bancaire
    try {
      await sendInvoiceEmail(
        email,
        "Julien (Test)",
        "FAC-2026-0001",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(1500.00),
        `${baseUrl}/client/invoices/test-token-virement`,
        companyName,
        logoUrl,
        undefined,
        "Virement bancaire",
        undefined
      )
      results.push({ type: "Facture - Virement bancaire", success: true })
    } catch (e) {
      results.push({ type: "Facture - Virement bancaire", success: false, error: (e as Error).message })
    }

    // 2. Email Facture - Prélèvement automatique
    try {
      await sendInvoiceEmail(
        email,
        "Julien (Test)",
        "FAC-2026-0002",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(250.00),
        `${baseUrl}/client/invoices/test-token-prelevement`,
        companyName,
        logoUrl,
        undefined,
        "Prélèvement automatique",
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")
      )
      results.push({ type: "Facture - Prélèvement automatique", success: true })
    } catch (e) {
      results.push({ type: "Facture - Prélèvement automatique", success: false, error: (e as Error).message })
    }

    // 3. Email Facture - Carte bancaire
    try {
      await sendInvoiceEmail(
        email,
        "Julien (Test)",
        "FAC-2026-0003",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(899.00),
        `${baseUrl}/client/invoices/test-token-cb`,
        companyName,
        logoUrl,
        undefined,
        "Carte bancaire",
        undefined
      )
      results.push({ type: "Facture - Carte bancaire", success: true })
    } catch (e) {
      results.push({ type: "Facture - Carte bancaire", success: false, error: (e as Error).message })
    }

    // 4. Email Devis
    try {
      await sendQuoteEmail(
        email,
        "Julien (Test)",
        "DEV-2026-0001",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(5000.00),
        `${baseUrl}/client/quotes/test-token-devis`,
        companyName,
        logoUrl,
        undefined
      )
      results.push({ type: "Devis", success: true })
    } catch (e) {
      results.push({ type: "Devis", success: false, error: (e as Error).message })
    }

    // 5. Email Invitation client
    try {
      await sendClientInvitationEmail(
        email,
        "test-invitation-token",
        "Julien Ronot",
        companyName
      )
      results.push({ type: "Invitation client", success: true })
    } catch (e) {
      results.push({ type: "Invitation client", success: false, error: (e as Error).message })
    }

    // 6. Email Demande de signature
    try {
      await sendSignatureRequestEmail(
        email,
        "Julien (Test)",
        `${baseUrl}/client/sign/test-token-signature`,
        "Contrat de maintenance annuel",
        "Julien Ronot",
        companyName,
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        "Merci de bien vouloir signer ce contrat pour activer votre abonnement.",
        logoUrl
      )
      results.push({ type: "Demande de signature", success: true })
    } catch (e) {
      results.push({ type: "Demande de signature", success: false, error: (e as Error).message })
    }

    // 7. Email Réinitialisation mot de passe
    try {
      await sendPasswordResetEmail(
        email,
        "test-reset-token",
        "Julien"
      )
      results.push({ type: "Réinitialisation mot de passe", success: true })
    } catch (e) {
      results.push({ type: "Réinitialisation mot de passe", success: false, error: (e as Error).message })
    }

    // 8. Email Relance facture impayée
    try {
      await sendInvoiceReminderEmail(
        email,
        "Julien (Test)",
        "FAC-TEST-001",
        formatCurrency(750),
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        7,
        `${baseUrl}/client/invoices/test-token-relance`,
        companyName,
        logoUrl
      )
      results.push({ type: "Relance facture impayée", success: true })
    } catch (e) {
      results.push({ type: "Relance facture impayée", success: false, error: (e as Error).message })
    }

    // 9. Email Relance facture proche échéance
    try {
      await sendInvoiceDueSoonEmail(
        email,
        "Julien (Test)",
        "FAC-TEST-002",
        formatCurrency(1200),
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        3,
        `${baseUrl}/client/invoices/test-token-due-soon`,
        companyName,
        logoUrl
      )
      results.push({ type: "Relance facture proche échéance", success: true })
    } catch (e) {
      results.push({ type: "Relance facture proche échéance", success: false, error: (e as Error).message })
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `${successCount}/${results.length} emails envoyés avec succès à ${email}`,
      results,
    })
  } catch (error) {
    console.error("Error sending test emails:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'envoi des emails" },
      { status: 500 }
    )
  }
}
