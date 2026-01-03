import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Handle OAuth callback from Microsoft
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://crm.julienronot.fr"

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    if (error) {
      console.error("O365 OAuth error:", error, errorDescription)
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&o365_error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&o365_error=no_code`
      )
    }

    // Get tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant?.settings) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&o365_error=no_settings`
      )
    }

    const settings = JSON.parse(tenant.settings)
    const redirectUri = `${baseUrl}/api/tickets/o365-callback`

    // Exchange code for tokens
    const tokenUrl = `https://login.microsoftonline.com/${settings.o365TenantId}/oauth2/v2.0/token`

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: settings.o365ClientId,
        client_secret: settings.o365ClientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("Token exchange failed:", errorData)
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=integrations&o365_error=${encodeURIComponent(errorData.error_description || "token_exchange_failed")}`
      )
    }

    const tokenData = await tokenResponse.json()

    // Get user info to confirm which mailbox is connected
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    let connectedEmail = settings.o365SupportEmail
    if (userResponse.ok) {
      const userData = await userResponse.json()
      connectedEmail = userData.mail || userData.userPrincipalName || connectedEmail
    }

    // Save tokens to tenant settings
    const updatedSettings = {
      ...settings,
      o365AccessToken: tokenData.access_token,
      o365RefreshToken: tokenData.refresh_token,
      o365TokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      o365ConnectedEmail: connectedEmail,
      o365ConnectedAt: new Date().toISOString(),
    }

    await prisma.tenants.update({
      where: { id: BigInt(1) },
      data: { settings: JSON.stringify(updatedSettings) },
    })

    console.log("O365 mailbox connected:", connectedEmail)

    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&o365_success=connected&email=${encodeURIComponent(connectedEmail)}`
    )
  } catch (error) {
    console.error("O365 callback error:", error)
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=integrations&o365_error=${encodeURIComponent(error instanceof Error ? error.message : "unknown")}`
    )
  }
}
