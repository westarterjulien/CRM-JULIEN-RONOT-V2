import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Get Microsoft OAuth settings from database
async function getMicrosoftSettings() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    return null
  }

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      clientId: settings.o365ClientId || settings.o365_client_id,
      clientSecret: settings.o365ClientSecret || settings.o365_client_secret,
      tenantId: settings.o365TenantId || settings.o365_tenant_id,
      enabled: settings.o365Enabled || settings.o365_enabled,
      allowedGroups: settings.o365AllowedGroups?.split(",").filter(Boolean) || [],
    }
  } catch {
    return null
  }
}

// GET: Initiate Microsoft OAuth flow
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const settings = await getMicrosoftSettings()

  if (!settings?.enabled || !settings.clientId || !settings.tenantId) {
    return NextResponse.json(
      { error: "Microsoft SSO non configuré" },
      { status: 400 }
    )
  }

  // Build the Microsoft OAuth URL
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/auth/microsoft/callback`

  const authUrl = new URL(
    `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/authorize`
  )

  authUrl.searchParams.set("client_id", settings.clientId)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "openid profile email User.Read GroupMember.Read.All")
  authUrl.searchParams.set("response_mode", "query")
  authUrl.searchParams.set("state", Buffer.from(JSON.stringify({ callbackUrl })).toString("base64"))

  return NextResponse.redirect(authUrl.toString())
}
