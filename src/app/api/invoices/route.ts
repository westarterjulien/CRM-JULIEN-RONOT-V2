import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { convertProspectToClient } from "@/lib/client-utils"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("perPage") || "15")
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  const clientId = searchParams.get("clientId") || ""
  const sortBy = searchParams.get("sortBy") || "issueDate"
  const sortOrder = searchParams.get("sortOrder") || "desc"
  const dateFrom = searchParams.get("dateFrom") || ""
  const dateTo = searchParams.get("dateTo") || ""

  const now = new Date()
  const currentYear = now.getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)

  const where: Prisma.InvoiceWhereInput = {}

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { client: { companyName: { contains: search } } },
      { client: { email: { contains: search } } },
    ]
  }

  if (status && status !== "all") {
    // Handle "pending" as sent + overdue invoices that are not paid
    if (status === "pending") {
      where.status = { in: ["sent", "overdue"] }
    } else {
      where.status = status
    }
  }

  if (clientId) {
    where.clientId = BigInt(clientId)
  }

  if (dateFrom) {
    where.issueDate = { ...(where.issueDate as object || {}), gte: new Date(dateFrom) }
  }

  if (dateTo) {
    where.issueDate = { ...(where.issueDate as object || {}), lte: new Date(dateTo) }
  }

  // Get stats for current year (excluding cancelled)
  const [
    invoices,
    total,
    allStats,
    paidThisYear,
    pendingAmount,
    totalThisYear,
  ] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: true,
      _sum: { totalTtc: true },
    }),
    // CA encaissé cette année
    prisma.invoice.aggregate({
      where: {
        status: "paid",
        paymentDate: { gte: startOfYear },
      },
      _sum: { totalTtc: true },
      _count: true,
    }),
    // CA en attente (sent + overdue)
    prisma.invoice.aggregate({
      where: {
        status: { in: ["sent", "overdue"] },
      },
      _sum: { totalTtc: true },
      _count: true,
    }),
    // CA total cette année (basé sur factures payées)
    prisma.invoice.aggregate({
      where: {
        status: "paid",
        paymentDate: { gte: startOfYear },
      },
      _sum: { totalTtc: true },
    }),
  ])

  const statusCounts = {
    total: 0,
    draft: 0,
    sent: 0,
    pending: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  }

  allStats.forEach((s) => {
    const st = s.status as string
    statusCounts.total += s._count
    if (st in statusCounts) {
      statusCounts[st as keyof typeof statusCounts] = s._count
    }
  })
  // pending = sent + overdue
  statusCounts.pending = statusCounts.sent + statusCounts.overdue

  return NextResponse.json({
    invoices: invoices.map((inv) => ({
      id: inv.id.toString(),
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      totalHt: Number(inv.subtotalHt),
      totalTtc: Number(inv.totalTtc),
      issueDate: inv.issueDate?.toISOString(),
      dueDate: inv.dueDate?.toISOString(),
      paymentDate: inv.paymentDate?.toISOString(),
      paymentMethod: inv.paymentMethod,
      debitDate: inv.debit_date?.toISOString(),
      sentAt: inv.sentAt?.toISOString(),
      viewCount: inv.viewCount,
      lastViewedAt: inv.lastViewedAt?.toISOString(),
      client: {
        id: inv.client.id.toString(),
        companyName: inv.client.companyName,
        email: inv.client.email,
      },
    })),
    stats: {
      counts: statusCounts,
      amounts: {
        paidThisYear: Number(paidThisYear._sum.totalTtc || 0),
        paidCount: paidThisYear._count,
        pending: Number(pendingAmount._sum.totalTtc || 0),
        pendingCount: pendingAmount._count,
        totalThisYear: Number(totalThisYear._sum.totalTtc || 0),
      },
    },
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Generate invoice number
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

    // Calculate totals
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
    // Avoid division by zero when subtotalHt is 0
    const taxAfterDiscount = subtotalHt > 0
      ? taxAmount * (1 - discountAmount / subtotalHt)
      : 0
    const totalTtc = subtotalAfterDiscount + taxAfterDiscount

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        tenant_id: BigInt(1),
        clientId: BigInt(body.clientId),
        invoiceNumber,
        invoice_type: body.invoiceType || "standard",
        status: body.status || "draft",
        issueDate: new Date(body.issueDate || new Date()),
        dueDate: new Date(body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
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

    // Auto-convert prospect to client when invoice is created
    await convertProspectToClient(BigInt(body.clientId))

    return NextResponse.json({
      id: invoice.id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      success: true,
    })
  } catch (error) {
    console.error("Error creating invoice:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error("Invoice creation error details:", errorDetails)
    return NextResponse.json(
      { error: "Failed to create invoice", details: errorMessage },
      { status: 500 }
    )
  }
}
