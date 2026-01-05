import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Initiate OAuth authorization flow for user's O365 calendar
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Get tenant O365 settings (client_id, tenant_id, etc.)
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant?.settings) {
      return NextResponse.json(
        { error: "O365 non configuré au niveau tenant" },
        { status: 400 }
      )
    }

    const settings = JSON.parse(tenant.settings)

    if (!settings.o365Enabled || !settings.o365ClientId || !settings.o365TenantId) {
      return NextResponse.json(
        { error: "O365 non activé. Configurez-le dans Settings > Intégrations" },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://crm.julienronot.fr"
    const redirectUri = `${baseUrl}/api/users/o365-callback`

    // Generate state with user ID for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
        random: Math.random().toString(36).substring(7),
      })
    ).toString("base64")

    // Build Microsoft OAuth URL - only request Calendar permissions
    const authUrl = new URL(
      `https://login.microsoftonline.com/${settings.o365TenantId}/oauth2/v2.0/authorize`
    )

    // Calendar read/write permission for user-level connection
    const scope = [
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/User.Read",
      "offline_access",
    ].join(" ")

    authUrl.searchParams.set("client_id", settings.o365ClientId)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_mode", "query")
    authUrl.searchParams.set("scope", scope)
    authUrl.searchParams.set("state", state)
    authUrl.searchParams.set("prompt", "select_account") // Let user choose account

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error("User O365 connect error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la connexion O365" },
      { status: 500 }
    )
  }
}
