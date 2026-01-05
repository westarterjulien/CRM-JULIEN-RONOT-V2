import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyInvoicePaid } from "@/lib/notifications"
import { formatCurrency } from "@/lib/utils"

const DEFAULT_TENANT_ID = BigInt(1)

// Get Revolut settings from tenant
async function getRevolutSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    if (!settings.revolutEnabled) return null

    return {
      apiKey: settings.revolutApiKey,
      environment: settings.revolutEnvironment || "sandbox",
    }
  } catch {
    return null
  }
}

// POST: Check payment status for an invoice with a Revolut payment link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: "invoiceId requis" },
        { status: 400 }
      )
    }

    // Get Revolut settings
    const settings = await getRevolutSettings()
    if (!settings) {
      return NextResponse.json(
        { error: "Revolut n'est pas configuré" },
        { status: 400 }
      )
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(invoiceId) },
      include: { client: true },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Check if already paid
    if (invoice.status === "paid") {
      return NextResponse.json({
        status: "paid",
        message: "Facture déjà payée",
      })
    }

    // Check if has payment link
    if (!invoice.payment_link) {
      return NextResponse.json({
        status: "no_link",
        message: "Pas de lien de paiement Revolut pour cette facture",
      })
    }

    // Query Revolut API for order by invoice number reference
    const baseUrl = settings.environment === "production"
      ? "https://merchant.revolut.com/api/1.0"
      : "https://sandbox-merchant.revolut.com/api/1.0"

    // Search for order by merchant_order_ext_ref (invoice number)
    const searchUrl = `${baseUrl}/orders?merchant_order_ext_ref=${encodeURIComponent(invoice.invoiceNumber)}`
    console.log("[Revolut Check] Searching orders with:", invoice.invoiceNumber)

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "Authorization": `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        "Revolut-Api-Version": "2024-09-01",
      },
    })

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}))
      console.error("[Revolut Check] API search error:", searchResponse.status, errorData)
      return NextResponse.json({
        status: "error",
        message: `Erreur API Revolut: ${searchResponse.status}`,
        details: errorData,
      })
    }

    const orders = await searchResponse.json()
    console.log("[Revolut Check] Found orders:", orders.length || 0)

    // Find the most recent completed order or the latest one
    let order = null
    if (Array.isArray(orders) && orders.length > 0) {
      // Look for a completed order first
      order = orders.find((o: { state: string }) => o.state === "COMPLETED") || orders[0]
    } else if (orders && orders.id) {
      // Single order returned
      order = orders
    }

    if (!order) {
      return NextResponse.json({
        status: "pending",
        message: "Aucune commande Revolut trouvée pour cette facture",
      })
    }

    console.log("[Revolut Check] Order status:", order.id, order.state)

    // If order is completed, mark invoice as paid
    if (order.state === "COMPLETED") {
      const paymentDate = order.completed_at
        ? new Date(order.completed_at)
        : new Date()

      await prisma.invoice.update({
        where: { id: BigInt(invoiceId) },
        data: {
          status: "paid",
          paymentDate: paymentDate,
          paymentMethod: "card",
          payment_notes: `Paiement Revolut - Order ID: ${order.id}`,
          updatedAt: new Date(),
        },
      })

      // Send notification
      try {
        await notifyInvoicePaid(
          invoice.invoiceNumber,
          invoice.client.companyName,
          formatCurrency(Number(invoice.totalTtc)),
          invoice.id.toString()
        )
      } catch (notifError) {
        console.error("[Revolut Check] Notification error:", notifError)
      }

      return NextResponse.json({
        status: "paid",
        message: "Paiement détecté ! Facture marquée comme payée.",
        orderId: order.id,
        paidAt: paymentDate.toISOString(),
      })
    }

    // Return current status
    const statusMessages: Record<string, string> = {
      PENDING: "En attente de paiement",
      PROCESSING: "Paiement en cours de traitement",
      AUTHORISED: "Paiement autorisé, en attente de capture",
      COMPLETED: "Paiement effectué",
      CANCELLED: "Paiement annulé",
      FAILED: "Paiement échoué",
    }

    return NextResponse.json({
      status: order.state.toLowerCase(),
      message: statusMessages[order.state] || `Statut: ${order.state}`,
      orderId: order.id,
      orderState: order.state,
    })
  } catch (error) {
    console.error("[Revolut Check] Error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification du paiement" },
      { status: 500 }
    )
  }
}
