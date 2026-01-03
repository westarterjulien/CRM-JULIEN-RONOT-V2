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
      accessToken: settings.o365AccessToken,
      refreshToken: settings.o365RefreshToken,
      tokenExpiresAt: settings.o365TokenExpiresAt ? new Date(settings.o365TokenExpiresAt) : null,
    }
  } catch {
    return null
  }
}

// Update settings in database
async function updateSettings(updates: Record<string, unknown>) {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant) return

  const currentSettings = tenant.settings ? JSON.parse(tenant.settings) : {}
  const updatedSettings = { ...currentSettings, ...updates }

  await prisma.tenants.update({
    where: { id: BigInt(1) },
    data: { settings: JSON.stringify(updatedSettings) },
  })
}

// Refresh access token using refresh token
async function refreshAccessToken(settings: {
  clientId: string
  clientSecret: string
  tenantId: string
  refreshToken: string
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  const tokenUrl = `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      refresh_token: settings.refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access",
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error("[O365] Token refresh failed:", error)
    return null
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || settings.refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

// Get valid access token (refresh if needed)
export async function getValidAccessToken(): Promise<string | null> {
  const settings = await getO365Settings()

  if (!settings?.enabled || !settings.refreshToken) {
    return null
  }

  // Check if current token is still valid (with 5 min buffer)
  if (settings.accessToken && settings.tokenExpiresAt) {
    const expiresAt = new Date(settings.tokenExpiresAt)
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return settings.accessToken
    }
  }

  // Token expired or about to expire, refresh it
  console.log("[O365] Refreshing access token...")
  const newTokens = await refreshAccessToken({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    tenantId: settings.tenantId,
    refreshToken: settings.refreshToken,
  })

  if (!newTokens) {
    // Refresh failed - clear tokens
    await updateSettings({
      o365AccessToken: null,
      o365RefreshToken: null,
      o365TokenExpiresAt: null,
      o365ConnectedEmail: null,
    })
    return null
  }

  // Save new tokens
  await updateSettings({
    o365AccessToken: newTokens.accessToken,
    o365RefreshToken: newTokens.refreshToken,
    o365TokenExpiresAt: newTokens.expiresAt.toISOString(),
  })

  return newTokens.accessToken
}

// Send email via Microsoft Graph API
export async function sendO365Email(options: {
  to: string
  subject: string
  body: string
  isHtml?: boolean
  replyToMessageId?: string
  cc?: string[]
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = await getValidAccessToken()

  if (!accessToken) {
    return { success: false, error: "O365 non connecté ou token expiré" }
  }

  const message = {
    message: {
      subject: options.subject,
      body: {
        contentType: options.isHtml ? "HTML" : "Text",
        content: options.body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: options.to,
          },
        },
      ],
      ...(options.cc && options.cc.length > 0
        ? {
            ccRecipients: options.cc.map((email) => ({
              emailAddress: { address: email },
            })),
          }
        : {}),
    },
    saveToSentItems: true,
  }

  try {
    // If replying to a message, use reply endpoint
    if (options.replyToMessageId) {
      const replyResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${options.replyToMessageId}/reply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              body: {
                contentType: options.isHtml ? "HTML" : "Text",
                content: options.body,
              },
            },
          }),
        }
      )

      if (!replyResponse.ok) {
        const error = await replyResponse.json()
        console.error("[O365] Reply error:", error)
        // Fall through to send as new message
      } else {
        return { success: true }
      }
    }

    // Send as new message
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error("[O365] Send email error:", error)
      return {
        success: false,
        error: error.error?.message || "Erreur lors de l'envoi",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[O365] Send email exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

// Clean HTML content for display (strip scripts, styles, etc.)
export function cleanHtmlContent(html: string): string {
  if (!html) return ""

  // Remove script tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

  // Remove style tags
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")

  // Remove meta tags
  cleaned = cleaned.replace(/<meta[^>]*>/gi, "")

  // Remove head section entirely
  cleaned = cleaned.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "")

  // Remove html and body tags but keep content
  cleaned = cleaned.replace(/<\/?html[^>]*>/gi, "")
  cleaned = cleaned.replace(/<\/?body[^>]*>/gi, "")

  // Remove onclick and other event handlers
  cleaned = cleaned.replace(/\s*on\w+="[^"]*"/gi, "")
  cleaned = cleaned.replace(/\s*on\w+='[^']*'/gi, "")

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n")
  cleaned = cleaned.trim()

  return cleaned
}

// Extract plain text from HTML
export function htmlToPlainText(html: string): string {
  if (!html) return ""

  // First clean the HTML
  let text = cleanHtmlContent(html)

  // Replace common block elements with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<\/p>/gi, "\n\n")
  text = text.replace(/<\/div>/gi, "\n")
  text = text.replace(/<\/li>/gi, "\n")
  text = text.replace(/<\/tr>/gi, "\n")

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "")

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ")
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n")
  text = text.trim()

  return text
}
