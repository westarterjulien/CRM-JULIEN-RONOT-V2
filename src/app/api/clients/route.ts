import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { notifyNewClient } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("perPage") || "15")
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || "all"
  const sortBy = searchParams.get("sortBy") || "companyName"
  const sortOrder = searchParams.get("sortOrder") || "asc"

  const where: Prisma.ClientWhereInput = {
    tenant_id: BigInt(1),
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { email: { contains: search } },
      { siret: { contains: search } },
      { contactFirstname: { contains: search } },
      { contactLastname: { contains: search } },
      { city: { contains: search } },
      { phone: { contains: search } },
    ]
  }

  if (status && status !== "all") {
    where.status = status as "active" | "inactive" | "prospect"
  }

  const [clients, total, activeCount, prospectCount, inactiveCount, totalRevenueResult] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        invoices: {
          select: {
            id: true,
            status: true,
            totalTtc: true,
          },
        },
        services: {
          where: { is_active: true },
          select: { id: true },
        },
        _count: {
          select: {
            invoices: true,
            quotes: true,
          },
        },
      },
    }),
    prisma.client.count({ where }),
    prisma.client.count({ where: { tenant_id: BigInt(1), status: "active" } }),
    prisma.client.count({ where: { tenant_id: BigInt(1), status: "prospect" } }),
    prisma.client.count({ where: { tenant_id: BigInt(1), status: "inactive" } }),
    prisma.invoice.aggregate({
      where: { tenant_id: BigInt(1), status: "paid" },
      _sum: { totalTtc: true },
    }),
  ])

  return NextResponse.json({
    clients: clients.map((c) => {
      const paidInvoices = c.invoices.filter((inv) => inv.status === "paid")
      const pendingInvoices = c.invoices.filter((inv) => inv.status === "sent")
      const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalTtc), 0)
      const totalPending = pendingInvoices.reduce((sum, inv) => sum + Number(inv.totalTtc), 0)

      return {
        id: c.id.toString(),
        companyName: c.companyName,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        siret: c.siret,
        city: c.city,
        status: c.status,
        createdAt: c.createdAt?.toISOString(),
        contactFirstname: c.contactFirstname,
        contactLastname: c.contactLastname,
        _count: c._count,
        activeServicesCount: c.services.length,
        totalPaid,
        totalPending,
      }
    }),
    stats: {
      total: activeCount + prospectCount + inactiveCount,
      active: activeCount,
      prospect: prospectCount,
      inactive: inactiveCount,
      totalRevenue: Number(totalRevenueResult._sum.totalTtc || 0),
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

    const client = await prisma.client.create({
      data: {
        tenant_id: BigInt(1),
        companyName: body.companyName,
        client_type: body.client_type || "company",
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        siret: body.siret,
        siren: body.siren,
        vatNumber: body.vatNumber,
        apeCode: body.apeCode,
        legalForm: body.legalForm,
        capital: body.capital ? parseFloat(body.capital) : null,
        address: body.address,
        postalCode: body.postalCode,
        city: body.city,
        country: body.country || "France",
        website: body.website,
        contactFirstname: body.contactFirstname,
        contactLastname: body.contactLastname,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        notes: body.notes,
        status: body.status || "prospect",
      },
    })

    // Create notification for new client
    await notifyNewClient(client.companyName, client.id.toString())

    return NextResponse.json({
      id: client.id.toString(),
      success: true,
    })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    )
  }
}
