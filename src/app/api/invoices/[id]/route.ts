import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyInvoicePaid } from "@/lib/notifications"
import { formatCurrency } from "@/lib/utils"

const serializeData = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "bigint") return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (typeof obj === "object" && "toNumber" in obj) {
    return (obj as { toNumber: () => number }).toNumber()
  }
  if (Array.isArray(obj)) return obj.map(serializeData)
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeData(value)
    }
    return result
  }
  return obj
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
        views: {
          orderBy: { viewedAt: "desc" },
          take: 10,
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Transform items for frontend
    const transformedItems = invoice.items.map((item) => ({
      id: item.id.toString(),
      serviceId: item.serviceId?.toString() || null,
      description: item.description,
      quantity: Number(item.quantity),
      unitPriceHt: Number(item.unitPriceHt),
      vatRate: Number(item.vatRate),
      totalHt: Number(item.totalHt),
      totalTtc: Number(item.totalTtc),
    }))

    return NextResponse.json({
      id: invoice.id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      clientId: invoice.clientId.toString(),
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      paymentDate: invoice.paymentDate?.toISOString() || null,
      paymentTerms: Number(invoice.paymentTerms) || 30,
      notes: invoice.notes,
      totalHt: Number(invoice.subtotalHt),
      totalVat: Number(invoice.taxAmount),
      totalTtc: Number(invoice.totalTtc),
      createdAt: invoice.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: invoice.updatedAt?.toISOString() || new Date().toISOString(),
      paymentMethod: invoice.paymentMethod || null,
      debitDate: invoice.debit_date?.toISOString() || null,
      payment_link: invoice.payment_link || null,
      client: {
        id: invoice.client.id.toString(),
        companyName: invoice.client.companyName,
        email: invoice.client.email,
        phone: invoice.client.phone,
        address: invoice.client.address,
        postalCode: invoice.client.postalCode,
        city: invoice.client.city,
        country: invoice.client.country,
        siret: invoice.client.siret,
        vatNumber: invoice.client.vatNumber,
        contactFirstname: invoice.client.contactFirstname,
        contactLastname: invoice.client.contactLastname,
      },
      items: transformedItems,
    })
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    // Handle status updates
    if (body.action) {
      switch (body.action) {
        case "markPaid": {
          const paidInvoice = await prisma.invoice.update({
            where: { id: BigInt(id) },
            data: {
              status: "paid",
              paymentDate: new Date(),
              paymentMethod: body.paymentMethod,
              payment_notes: body.paymentNotes,
            },
            include: {
              client: true,
              items: true,
            },
          })

          // Create notification for payment
          await notifyInvoicePaid(
            paidInvoice.invoiceNumber,
            paidInvoice.client.companyName,
            formatCurrency(Number(paidInvoice.totalTtc)),
            paidInvoice.id.toString()
          )

          return NextResponse.json({
            id: paidInvoice.id.toString(),
            invoiceNumber: paidInvoice.invoiceNumber,
            status: paidInvoice.status,
            clientId: paidInvoice.clientId.toString(),
            issueDate: paidInvoice.issueDate.toISOString(),
            dueDate: paidInvoice.dueDate.toISOString(),
            paymentDate: paidInvoice.paymentDate?.toISOString() || null,
            paymentTerms: Number(paidInvoice.paymentTerms) || 30,
            notes: paidInvoice.notes,
            totalHt: Number(paidInvoice.subtotalHt),
            totalVat: Number(paidInvoice.taxAmount),
            totalTtc: Number(paidInvoice.totalTtc),
            createdAt: paidInvoice.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: paidInvoice.updatedAt?.toISOString() || new Date().toISOString(),
            client: {
              id: paidInvoice.client.id.toString(),
              companyName: paidInvoice.client.companyName,
              email: paidInvoice.client.email,
              phone: paidInvoice.client.phone,
              address: paidInvoice.client.address,
              postalCode: paidInvoice.client.postalCode,
              city: paidInvoice.client.city,
              country: paidInvoice.client.country,
              siret: paidInvoice.client.siret,
              vatNumber: paidInvoice.client.vatNumber,
              contactFirstname: paidInvoice.client.contactFirstname,
              contactLastname: paidInvoice.client.contactLastname,
            },
            items: paidInvoice.items.map((item) => ({
              id: item.id.toString(),
              description: item.description,
              quantity: Number(item.quantity),
              unitPriceHt: Number(item.unitPriceHt),
              vatRate: Number(item.vatRate),
              totalHt: Number(item.totalHt),
              totalTtc: Number(item.totalTtc),
            })),
          })
        }

        case "markSent": {
          const sentInvoice = await prisma.invoice.update({
            where: { id: BigInt(id) },
            data: {
              status: "sent",
              sentAt: new Date(),
            },
            include: {
              client: true,
              items: true,
            },
          })
          return NextResponse.json({
            id: sentInvoice.id.toString(),
            invoiceNumber: sentInvoice.invoiceNumber,
            status: sentInvoice.status,
            clientId: sentInvoice.clientId.toString(),
            issueDate: sentInvoice.issueDate.toISOString(),
            dueDate: sentInvoice.dueDate.toISOString(),
            paymentDate: sentInvoice.paymentDate?.toISOString() || null,
            paymentTerms: Number(sentInvoice.paymentTerms) || 30,
            notes: sentInvoice.notes,
            totalHt: Number(sentInvoice.subtotalHt),
            totalVat: Number(sentInvoice.taxAmount),
            totalTtc: Number(sentInvoice.totalTtc),
            createdAt: sentInvoice.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: sentInvoice.updatedAt?.toISOString() || new Date().toISOString(),
            client: {
              id: sentInvoice.client.id.toString(),
              companyName: sentInvoice.client.companyName,
              email: sentInvoice.client.email,
              phone: sentInvoice.client.phone,
              address: sentInvoice.client.address,
              postalCode: sentInvoice.client.postalCode,
              city: sentInvoice.client.city,
              country: sentInvoice.client.country,
              siret: sentInvoice.client.siret,
              vatNumber: sentInvoice.client.vatNumber,
              contactFirstname: sentInvoice.client.contactFirstname,
              contactLastname: sentInvoice.client.contactLastname,
            },
            items: sentInvoice.items.map((item) => ({
              id: item.id.toString(),
              description: item.description,
              quantity: Number(item.quantity),
              unitPriceHt: Number(item.unitPriceHt),
              vatRate: Number(item.vatRate),
              totalHt: Number(item.totalHt),
              totalTtc: Number(item.totalTtc),
            })),
          })
        }

        case "duplicate":
          const original = await prisma.invoice.findUnique({
            where: { id: BigInt(id) },
            include: { items: true },
          })

          if (!original) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
          }

          // Generate new number
          const lastInvoice = await prisma.invoice.findFirst({
            orderBy: { id: "desc" },
            select: { invoiceNumber: true },
          })

          let nextNumber = 1
          if (lastInvoice?.invoiceNumber) {
            const match = lastInvoice.invoiceNumber.match(/(\d+)$/)
            if (match) nextNumber = parseInt(match[1]) + 1
          }

          const invoiceNumber = `FAC-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`

          const duplicate = await prisma.invoice.create({
            data: {
              tenant_id: original.tenant_id,
              clientId: original.clientId,
              invoiceNumber,
              invoice_type: original.invoice_type,
              status: "draft",
              issueDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              subtotalHt: original.subtotalHt,
              taxAmount: original.taxAmount,
              totalTtc: original.totalTtc,
              discount_type: original.discount_type,
              discount_value: original.discount_value,
              discountAmount: original.discountAmount,
              subtotal_after_discount: original.subtotal_after_discount,
              total_ttc_after_discount: original.total_ttc_after_discount,
              notes: original.notes,
              items: {
                create: original.items.map((item) => ({
                  tenant_id: item.tenant_id,
                  description: item.description,
                  quantity: item.quantity,
                  unit: item.unit,
                  unitPriceHt: item.unitPriceHt,
                  vatRate: item.vatRate,
                  taxAmount: item.taxAmount,
                  totalHt: item.totalHt,
                  totalTtc: item.totalTtc,
                  serviceId: item.serviceId,
                })),
              },
            },
          })

          return NextResponse.json({
            id: duplicate.id.toString(),
            invoiceNumber: duplicate.invoiceNumber,
            success: true,
          })

        default:
          return NextResponse.json({ error: "Unknown action" }, { status: 400 })
      }
    }

    // Regular update
    let subtotalHt = 0
    let taxAmount = 0

    const items = body.items || []
    items.forEach((item: { quantity: number; unitPriceHt: number; vatRate: number }) => {
      const lineTotal = item.quantity * item.unitPriceHt
      subtotalHt += lineTotal
      taxAmount += lineTotal * (item.vatRate / 100)
    })

    const discountAmount = body.discountType === "percentage"
      ? subtotalHt * (body.discountValue || 0) / 100
      : (body.discountValue || 0)

    const subtotalAfterDiscount = subtotalHt - discountAmount
    const taxAfterDiscount = subtotalHt > 0 ? taxAmount * (1 - discountAmount / subtotalHt) : 0
    const totalTtc = subtotalAfterDiscount + taxAfterDiscount

    // Delete existing items and recreate
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: BigInt(id) },
    })

    await prisma.invoice.update({
      where: { id: BigInt(id) },
      data: {
        clientId: BigInt(body.clientId),
        status: body.status,
        issueDate: new Date(body.issueDate),
        dueDate: new Date(body.dueDate),
        subtotalHt,
        taxAmount,
        totalTtc,
        discount_type: body.discountType || null,
        discount_value: body.discountValue || null,
        discountAmount,
        subtotal_after_discount: subtotalAfterDiscount,
        total_ttc_after_discount: totalTtc,
        paymentMethod: body.paymentMethod,
        notes: body.notes,
        items: {
          create: items.map((item: {
            description: string
            quantity: number
            unit: string
            unitPriceHt: number
            vatRate: number
            serviceId?: string
          }) => ({
            tenant_id: BigInt(1),
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || "unite",
            unitPriceHt: item.unitPriceHt,
            vatRate: item.vatRate || 20,
            taxAmount: item.quantity * item.unitPriceHt * (item.vatRate / 100),
            totalHt: item.quantity * item.unitPriceHt,
            totalTtc: item.quantity * item.unitPriceHt * (1 + item.vatRate / 100),
            serviceId: item.serviceId ? BigInt(item.serviceId) : null,
          })),
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.invoice.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 })
  }
}
