import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search") || ""

  try {
    const role = searchParams.get("role") || ""
    const status = searchParams.get("status") || ""

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenant_id: BigInt(1),
      // Exclude client portal users - only show CRM users
      role: { notIn: ["client"] },
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (role && role !== "all") {
      // Special case: "admin" filter shows all admin roles
      if (role === "admin") {
        where.role = { in: ["super_admin", "tenant_owner", "tenant_admin"] }
      } else {
        where.role = role
      }
    }

    if (status === "active") {
      where.isActive = true
    } else if (status === "inactive") {
      where.isActive = false
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json(
      users.map((user) => ({
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        slackUserId: user.slackUserId || null,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      }))
    )
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe requis" },
        { status: 400 }
      )
    }

    // Check if email exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: body.email,
        tenant_id: BigInt(1),
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10)

    const user = await prisma.user.create({
      data: {
        tenant_id: BigInt(1),
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || "tenant_user",
        isActive: body.isActive !== false,
        slackUserId: body.slackUserId || null,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      slackUserId: user.slackUserId,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    )
  }
}
