import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

// POST: Create a payment link for an invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, amount, currency = "EUR", description } = body

    if (!invoiceId || !amount) {
      return NextResponse.json(
        { error: "invoiceId et amount sont requis" },
        { status: 400 }
      )
    }

    // Get Revolut settings
    const settings = await getRevolutSettings()
    if (!settings) {
      return NextResponse.json(
        { error: "Revolut n'est pas configuré. Allez dans Settings > Intégrations > Revolut." },
        { status: 400 }
      )
    }

    // Get invoice details
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

    // Create order via Revolut Merchant API (returns checkout_url)
    // Note: Merchant API uses /api/1.0/orders
    const baseUrl = settings.environment === "production"
      ? "https://merchant.revolut.com/api/1.0"
      : "https://sandbox-merchant.revolut.com/api/1.0"

    // Build customer name
    const customerName = invoice.client.companyName ||
      `${invoice.client.contactFirstname || ""} ${invoice.client.contactLastname || ""}`.trim() ||
      "Client"

    // Revolut Merchant API order format
    const orderData = {
      amount: Math.round(amount * 100), // Revolut uses minor units (cents)
      currency: currency,
      description: description || `Facture ${invoice.invoiceNumber}`,
      merchant_order_ext_ref: invoice.invoiceNumber, // Reference for merchant
      customer_email: invoice.client.email || undefined,
      metadata: {
        invoice_id: invoiceId.toString(),
        invoice_number: invoice.invoiceNumber,
        customer_name: customerName,
      },
    }

    console.log("[Revolut] Creating order:", {
      invoiceNumber: invoice.invoiceNumber,
      amount: orderData.amount,
      currency: orderData.currency,
      environment: settings.environment,
      baseUrl,
    })

    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        "Revolut-Api-Version": "2024-09-01",
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Revolut] API error:", response.status, errorData)

      // Provide helpful error messages
      let errorMessage = errorData.message || errorData.error_description || `Erreur Revolut: ${response.status}`
      if (response.status === 401) {
        errorMessage = "Clé API Revolut invalide. Vérifiez la clé SECRÈTE dans Settings > Intégrations > Revolut"
      } else if (response.status === 403) {
        errorMessage = "Accès refusé. Vérifiez les permissions de l'API Revolut"
      }

      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: response.status }
      )
    }

    const order = await response.json()
    console.log("[Revolut] Order created:", order.id, "checkout_url:", order.checkout_url)

    // The checkout_url is the payment link to share with customer
    const checkoutUrl = order.checkout_url

    if (!checkoutUrl) {
      console.error("[Revolut] No checkout_url in response:", order)
      return NextResponse.json(
        { error: "Revolut n'a pas retourné de lien de paiement" },
        { status: 500 }
      )
    }

    // Update invoice with payment link info
    await prisma.invoice.update({
      where: { id: BigInt(invoiceId) },
      data: {
        payment_link: checkoutUrl,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      paymentLink: checkoutUrl,
      orderId: order.id,
      orderState: order.state,
    })
  } catch (error) {
    console.error("[Revolut] Error creating payment link:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du lien de paiement" },
      { status: 500 }
    )
  }
}
