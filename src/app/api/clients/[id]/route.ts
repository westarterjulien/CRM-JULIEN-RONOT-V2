import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const client = await prisma.client.findUnique({
      where: { id: BigInt(id) },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
          },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            items: true,
          },
        },
        tickets: {
          orderBy: { createdAt: "desc" },
        },
        services: {
          include: {
            service: true,
          },
        },
        domains: {
          orderBy: { expirationDate: "asc" },
        },
        projects: {
          where: { isArchived: false },
          orderBy: { updatedAt: "desc" },
          include: {
            columns: {
              include: {
                cards: {
                  select: { id: true, isCompleted: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            invoices: true,
            quotes: true,
            subscriptions: true,
            tickets: true,
            domains: true,
            projects: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Calculate stats
    const paidInvoices = client.invoices.filter((i) => i.status === "paid")
    const pendingInvoices = client.invoices.filter((i) =>
      ["sent", "overdue"].includes(i.status || "")
    )
    const acceptedQuotes = client.quotes.filter((q) => q.status === "accepted")

    const totalRevenue = paidInvoices.reduce(
      (sum, i) => sum + Number(i.totalTtc),
      0
    )
    const pendingAmount = pendingInvoices.reduce(
      (sum, i) => sum + Number(i.totalTtc),
      0
    )
    // MRR from active subscriptions
    const subscriptionMrr = client.subscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + Number(s.amountTtc), 0)

    // MRR from recurring services (add 20% VAT for TTC)
    const servicesMrr = client.services
      .filter((cs) => cs.is_active && cs.service.isRecurring)
      .reduce((sum, cs) => {
        const priceHt = Number(cs.custom_price_ht || cs.service.unitPriceHt)
        const quantity = Number(cs.quantity || 1)
        const priceTtc = priceHt * quantity * 1.2 // Assuming 20% VAT
        return sum + priceTtc
      }, 0)

    const mrr = subscriptionMrr + servicesMrr

    const serializeDecimal = (obj: Record<string, unknown>) => {
      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === "object" && "toNumber" in value) {
          result[key] = (value as { toNumber: () => number }).toNumber()
        } else if (value instanceof Date) {
          result[key] = value.toISOString()
        } else if (typeof value === "bigint") {
          result[key] = value.toString()
        } else if (Array.isArray(value)) {
          result[key] = value.map((v) =>
            typeof v === "object" && v !== null
              ? serializeDecimal(v as Record<string, unknown>)
              : v
          )
        } else if (value && typeof value === "object") {
          result[key] = serializeDecimal(value as Record<string, unknown>)
        } else {
          result[key] = value
        }
      }
      return result
    }

    return NextResponse.json({
      client: serializeDecimal(client as unknown as Record<string, unknown>),
      stats: {
        totalRevenue,
        pendingAmount,
        mrr,
        invoiceCount: client._count.invoices,
        quoteCount: client._count.quotes,
        paidInvoices: paidInvoices.length,
        acceptedQuotes: acceptedQuotes.length,
        conversionRate:
          client._count.quotes > 0
            ? Math.round((acceptedQuotes.length / client._count.quotes) * 100)
            : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const client = await prisma.client.update({
      where: { id: BigInt(id) },
      data: {
        companyName: body.companyName,
        client_type: body.client_type,
        first_name: body.first_name || null,
        last_name: body.last_name || null,
        email: body.email || null,
        phone: body.phone || null,
        siret: body.siret || null,
        siren: body.siren || null,
        vatNumber: body.vatNumber || null,
        apeCode: body.apeCode || null,
        legalForm: body.legalForm || null,
        capital: body.capital ? parseFloat(body.capital) : null,
        address: body.address || null,
        postalCode: body.postalCode || null,
        city: body.city || null,
        country: body.country || "France",
        website: body.website || null,
        contactFirstname: body.contactFirstname || null,
        contactLastname: body.contactLastname || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        notes: body.notes || null,
        status: body.status || "prospect",
        // SEPA Direct Debit
        iban: body.iban || null,
        bic: body.bic || null,
        sepaMandate: body.sepaMandate || null,
        sepaMandateDate: body.sepaMandateDate ? new Date(body.sepaMandateDate) : null,
        sepaSequenceType: body.sepaSequenceType || "RCUR",
      },
    })

    return NextResponse.json({
      id: client.id.toString(),
      success: true,
    })
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.client.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    )
  }
}
