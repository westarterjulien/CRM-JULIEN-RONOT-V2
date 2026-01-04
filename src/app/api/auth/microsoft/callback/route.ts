import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { encode } from "next-auth/jwt"

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
      allowedGroups: (settings.o365AllowedGroups || "").split(",").filter(Boolean),
    }
  } catch {
    return null
  }
}

// GET: Handle Microsoft OAuth callback
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Parse state to get callback URL
  let callbackUrl = "/"
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString())
      callbackUrl = stateData.callbackUrl || "/"
    } catch {
      // Ignore state parsing errors
    }
  }

  if (error) {
    console.error("Microsoft OAuth error:", error, errorDescription)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=microsoft_auth_failed`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=no_code`
    )
  }

  const settings = await getMicrosoftSettings()

  if (!settings?.enabled || !settings.clientId || !settings.clientSecret || !settings.tenantId) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=sso_not_configured`
    )
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/auth/microsoft/callback`

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: "openid profile email User.Read GroupMember.Read.All",
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", errorData)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=token_exchange_failed`
      )
    }

    const tokens = await tokenResponse.json()
    const accessToken = tokens.access_token

    // Get user info from Microsoft Graph
    const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      console.error("Failed to fetch user info")
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=user_info_failed`
      )
    }

    const microsoftUser = await userResponse.json()
    const email = microsoftUser.mail || microsoftUser.userPrincipalName
    const name = microsoftUser.displayName || email.split("@")[0]

    // Check group membership if allowed groups are configured
    if (settings.allowedGroups.length > 0) {
      const groupsResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me/memberOf",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        const userGroupIds =
          groupsData.value
            ?.filter((g: any) => g["@odata.type"] === "#microsoft.graph.group")
            ?.map((g: any) => g.id) || []

        const hasAccess = userGroupIds.some((groupId: string) =>
          settings.allowedGroups.includes(groupId)
        )

        if (!hasAccess) {
          console.log("User not in allowed groups:", email)
          return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL}/login?error=access_denied`
          )
        }
      }
    }

    // Find or create user in database
    let dbUser = await prisma.user.findFirst({
      where: { email },
    })

    if (dbUser) {
      // Update last login
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() },
      })
    } else {
      // Create new user
      dbUser = await prisma.user.create({
        data: {
          email,
          name,
          password: "", // SSO users don't have passwords
          role: "tenant_admin",
          isActive: true,
          lastLoginAt: new Date(),
          tenant_id: BigInt(1),
        },
      })
    }

    // Set the session cookie (NextAuth v5 uses __Secure- prefix in production)
    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === "production"
    const cookieName = isProduction ? "__Secure-authjs.session-token" : "authjs.session-token"

    // Create session token using NextAuth's encode function
    const token = await encode({
      token: {
        id: String(dbUser.id),
        email: dbUser.email,
        name: dbUser.name,
        type: dbUser.role,
        provider: "microsoft",
        sub: String(dbUser.id),
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 8 * 60 * 60, // 8 hours
      salt: cookieName, // Salt is based on the cookie name
    })

    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    })

    // Redirect to callback URL
    return NextResponse.redirect(`${baseUrl}${callbackUrl}`)
  } catch (error) {
    console.error("Microsoft SSO callback error:", error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=sso_error`
    )
  }
}
