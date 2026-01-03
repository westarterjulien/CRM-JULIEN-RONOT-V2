import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST: Disconnect O365 mailbox (removes OAuth tokens)
export async function POST() {
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant?.settings) {
      return NextResponse.json(
        { error: "Paramètres non trouvés" },
        { status: 404 }
      )
    }

    const currentSettings = JSON.parse(tenant.settings)

    // Remove OAuth tokens but keep configuration (client ID, etc.)
    const updatedSettings = {
      ...currentSettings,
      o365AccessToken: null,
      o365RefreshToken: null,
      o365TokenExpiresAt: null,
      o365ConnectedEmail: null,
      o365ConnectedAt: null,
    }

    await prisma.tenants.update({
      where: { id: BigInt(1) },
      data: { settings: JSON.stringify(updatedSettings) },
    })

    console.log("O365 mailbox disconnected")

    return NextResponse.json({
      success: true,
      message: "Boîte mail déconnectée",
    })
  } catch (error) {
    console.error("O365 disconnect error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    )
  }
}
