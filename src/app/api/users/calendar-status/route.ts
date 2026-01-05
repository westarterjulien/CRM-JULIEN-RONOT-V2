import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Get user's calendar connection status
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        o365RefreshToken: true,
        o365ConnectedEmail: true,
        o365ConnectedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: !!user.o365RefreshToken,
      connectedEmail: user.o365ConnectedEmail || null,
      connectedAt: user.o365ConnectedAt?.toISOString() || null,
    })
  } catch (error) {
    console.error("Calendar status error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
