import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Handle OAuth callback from Microsoft for user calendar
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://crm.julienronot.fr"

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")
    const state = searchParams.get("state")

    if (error) {
      console.error("User O365 OAuth error:", error, errorDescription)
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=profile&o365_error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=profile&o365_error=missing_code_or_state`
      )
    }

    // Decode state to get user ID
    let stateData: { userId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString())
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=profile&o365_error=invalid_state`
      )
    }

    // Verify state is not too old (15 minutes max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=profile&o365_error=state_expired`
      )
    }

    // Get tenant O365 settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant?.settings) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=profile&o365_error=no_tenant_settings`
      )
    }

    const settings = JSON.parse(tenant.settings)
    const redirectUri = `${baseUrl}/api/users/o365-callback`

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
        scope: "https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("User O365 token exchange failed:", errorData)
      return NextResponse.redirect(
        `${baseUrl}/settings?tab=profile&o365_error=${encodeURIComponent(errorData.error_description || "token_exchange_failed")}`
      )
    }

    const tokenData = await tokenResponse.json()

    // Get user info to confirm which account is connected
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    let connectedEmail = "unknown"
    if (userResponse.ok) {
      const userData = await userResponse.json()
      connectedEmail = userData.mail || userData.userPrincipalName || "unknown"
    }

    // Save tokens to user record
    await prisma.user.update({
      where: { id: BigInt(stateData.userId) },
      data: {
        o365AccessToken: tokenData.access_token,
        o365RefreshToken: tokenData.refresh_token,
        o365TokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        o365ConnectedEmail: connectedEmail,
        o365ConnectedAt: new Date(),
      },
    })

    console.log(`User ${stateData.userId} connected O365 calendar: ${connectedEmail}`)

    return NextResponse.redirect(
      `${baseUrl}/settings?tab=profile&o365_success=connected&email=${encodeURIComponent(connectedEmail)}`
    )
  } catch (error) {
    console.error("User O365 callback error:", error)
    return NextResponse.redirect(
      `${baseUrl}/settings?tab=profile&o365_error=${encodeURIComponent(error instanceof Error ? error.message : "unknown")}`
    )
  }
}
