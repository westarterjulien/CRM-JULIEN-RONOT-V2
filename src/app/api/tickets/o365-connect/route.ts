import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Get O365 settings from tenant
async function getO365Settings() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      enabled: settings.o365Enabled,
      clientId: settings.o365ClientId,
      clientSecret: settings.o365ClientSecret,
      tenantId: settings.o365TenantId,
      supportEmail: settings.o365SupportEmail,
    }
  } catch {
    return null
  }
}

// GET: Initiate OAuth authorization flow for O365 mailbox
export async function GET(request: NextRequest) {
  try {
    const settings = await getO365Settings()

    if (!settings?.enabled || !settings.clientId || !settings.tenantId) {
      return NextResponse.json(
        { error: "O365 non configuré" },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://crm.julienronot.fr"
    const redirectUri = `${baseUrl}/api/tickets/o365-callback`

    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7),
    })).toString("base64")

    // Build Microsoft OAuth URL
    const authUrl = new URL(
      `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/authorize`
    )

    // Request Mail permissions with offline_access for refresh token
    const scope = [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.ReadWrite",
      "https://graph.microsoft.com/Mail.Send",
      "offline_access",
    ].join(" ")

    authUrl.searchParams.set("client_id", settings.clientId)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("response_mode", "query")
    authUrl.searchParams.set("scope", scope)
    authUrl.searchParams.set("state", state)
    // Pre-select the support email account
    authUrl.searchParams.set("login_hint", settings.supportEmail || "")

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error("O365 connect error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la connexion O365" },
      { status: 500 }
    )
  }
}
