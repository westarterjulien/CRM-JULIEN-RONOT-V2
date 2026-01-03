import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendPasswordResetEmail,
  sendClientInvitationEmail,
  sendSignatureRequestEmail,
  sendInvoiceEmail,
  sendQuoteEmail,
} from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testEmail, emailType } = body

    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: "Email de test requis",
      })
    }

    // Get tenant info for company name
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    const companyName = tenant?.name || "Votre Entreprise"
    const results: { type: string; success: boolean; error?: string }[] = []

    // Test data
    const testUrl = "https://crm.example.com/test"
    const testDate = new Date().toLocaleDateString("fr-FR")
    const testExpirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")

    // Send requested email type(s)
    const typesToSend = emailType === "all"
      ? ["password_reset", "client_invitation", "signature_request", "invoice", "quote"]
      : [emailType]

    for (const type of typesToSend) {
      try {
        switch (type) {
          case "password_reset":
            await sendPasswordResetEmail(
              testEmail,
              "test-token-123",
              "Julien"
            )
            results.push({ type: "Réinitialisation mot de passe", success: true })
            break

          case "client_invitation":
            await sendClientInvitationEmail(
              testEmail,
              "test-invitation-token",
              "Julien Lemoine",
              companyName
            )
            results.push({ type: "Invitation client", success: true })
            break

          case "signature_request":
            await sendSignatureRequestEmail(
              testEmail,
              "Julien Westarter",
              testUrl,
              "Contrat de prestation de services - Projet XYZ",
              "Julien Lemoine",
              companyName,
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
              "Merci de bien vouloir signer ce contrat pour que nous puissions démarrer le projet.",
              undefined
            )
            results.push({ type: "Demande de signature", success: true })
            break

          case "invoice":
            await sendInvoiceEmail(
              testEmail,
              "Julien Westarter",
              "FAC-2025-0001",
              testDate,
              testExpirationDate,
              "1 250,00 €",
              testUrl,
              companyName,
              undefined,
              "Merci pour votre confiance. N'hésitez pas à nous contacter pour toute question.",
              "Prélèvement automatique", // paymentMethod
              new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR") // directDebitDate
            )
            results.push({ type: "Facture", success: true })
            break

          case "quote":
            await sendQuoteEmail(
              testEmail,
              "Julien Westarter",
              "DEV-2025-0001",
              testDate,
              testExpirationDate,
              "3 500,00 €",
              testUrl,
              companyName,
              undefined,
              "Ce devis est valable 30 jours. Nous sommes à votre disposition pour toute question."
            )
            results.push({ type: "Devis", success: true })
            break

          default:
            results.push({ type, success: false, error: "Type non reconnu" })
        }
      } catch (error) {
        results.push({
          type,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const allSuccess = results.every((r) => r.success)
    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? `${successCount} email(s) envoyé(s) avec succès à ${testEmail}`
        : `${successCount}/${results.length} email(s) envoyé(s)`,
      results,
    })
  } catch (error) {
    console.error("Test email error:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de l'envoi",
    })
  }
}
