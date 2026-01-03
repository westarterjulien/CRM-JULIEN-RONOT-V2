import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET: Récupérer les infos du compte connecté
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        slackUserId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      slackUserId: user.slackUserId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du compte" },
      { status: 500 }
    )
  }
}

// PUT: Mettre à jour le profil
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const userId = BigInt(session.user.id)

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    if (body.name) {
      updateData.name = body.name
    }

    if (body.slackUserId !== undefined) {
      updateData.slackUserId = body.slackUserId || null
    }

    // Handle password change
    if (body.newPassword) {
      // Verify current password
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "Mot de passe actuel requis" },
          { status: 400 }
        )
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      })

      if (!user) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        )
      }

      const passwordMatch = await bcrypt.compare(body.currentPassword, user.password)
      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Mot de passe actuel incorrect" },
          { status: 400 }
        )
      }

      // Hash new password
      updateData.password = await bcrypt.hash(body.newPassword, 10)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        slackUserId: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        slackUserId: updatedUser.slackUserId,
      },
    })
  } catch (error) {
    console.error("Error updating account:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du compte" },
      { status: 500 }
    )
  }
}
