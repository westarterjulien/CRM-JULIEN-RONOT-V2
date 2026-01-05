import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyInvoicePaid } from "@/lib/notifications"
import { formatCurrency } from "@/lib/utils"

const DEFAULT_TENANT_ID = BigInt(1)

// Revolut webhook payload types
interface RevolutWebhookPayload {
  event: string
  order_id: string
  merchant_order_ext_ref?: string
  timestamp: string
  data?: {
    id: string
    type: string
    state: string
    created_at: string
    updated_at: string
    completed_at?: string
    amount: number
    currency: string
    metadata?: {
      invoice_id?: string
      invoice_number?: string
      customer_name?: string
    }
  }
}

// POST: Handle Revolut webhook notifications
export async function POST(request: NextRequest) {
  try {
    const payload: RevolutWebhookPayload = await request.json()

    console.log("[Revolut Webhook] Received:", JSON.stringify(payload, null, 2))

    // Handle order completed events
    if (payload.event === "ORDER_COMPLETED" ||
        (payload.data?.state === "COMPLETED")) {

      // Try to find invoice from metadata
      let invoiceId: string | null = null

      // First try metadata.invoice_id
      if (payload.data?.metadata?.invoice_id) {
        invoiceId = payload.data.metadata.invoice_id
      }

      // If not found, try merchant_order_ext_ref (invoice number)
      if (!invoiceId && payload.merchant_order_ext_ref) {
        const invoice = await prisma.invoice.findFirst({
          where: { invoiceNumber: payload.merchant_order_ext_ref },
        })
        if (invoice) {
          invoiceId = invoice.id.toString()
        }
      }

      // Also try data.metadata.invoice_number
      if (!invoiceId && payload.data?.metadata?.invoice_number) {
        const invoice = await prisma.invoice.findFirst({
          where: { invoiceNumber: payload.data.metadata.invoice_number },
        })
        if (invoice) {
          invoiceId = invoice.id.toString()
        }
      }

      if (!invoiceId) {
        console.log("[Revolut Webhook] No invoice found for order:", payload.order_id)
        return NextResponse.json({ status: "ok", message: "No invoice found" })
      }

      // Get the invoice
      const invoice = await prisma.invoice.findUnique({
        where: { id: BigInt(invoiceId) },
        include: { client: true },
      })

      if (!invoice) {
        console.log("[Revolut Webhook] Invoice not found:", invoiceId)
        return NextResponse.json({ status: "ok", message: "Invoice not found" })
      }

      // Check if already paid
      if (invoice.status === "paid") {
        console.log("[Revolut Webhook] Invoice already paid:", invoice.invoiceNumber)
        return NextResponse.json({ status: "ok", message: "Already paid" })
      }

      // Mark invoice as paid
      const paymentDate = payload.data?.completed_at
        ? new Date(payload.data.completed_at)
        : new Date()

      await prisma.invoice.update({
        where: { id: BigInt(invoiceId) },
        data: {
          status: "paid",
          paymentDate: paymentDate,
          paymentMethod: "card",
          payment_notes: `Paiement Revolut - Order ID: ${payload.order_id}`,
          updatedAt: new Date(),
        },
      })

      console.log("[Revolut Webhook] Invoice marked as paid:", invoice.invoiceNumber)

      // Send notification
      try {
        await notifyInvoicePaid(
          invoice.invoiceNumber,
          invoice.client.companyName,
          formatCurrency(Number(invoice.totalTtc)),
          invoice.id.toString()
        )
      } catch (notifError) {
        console.error("[Revolut Webhook] Notification error:", notifError)
      }

      return NextResponse.json({
        status: "ok",
        message: "Invoice marked as paid",
        invoiceNumber: invoice.invoiceNumber,
      })
    }

    // Handle other events (order failed, cancelled, etc.)
    if (payload.event === "ORDER_PAYMENT_FAILED" ||
        payload.data?.state === "FAILED") {
      console.log("[Revolut Webhook] Payment failed for order:", payload.order_id)
      // Could add notification or update invoice status here
    }

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("[Revolut Webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 }
    )
  }
}

// GET: Endpoint for Revolut webhook verification
export async function GET() {
  return NextResponse.json({ status: "ok", message: "Revolut webhook endpoint active" })
}
