import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Vercel Cron Job - runs every 5 minutes
// Configured in vercel.json

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
      autoSync: settings.o365AutoSync,
      lastO365Sync: settings.lastO365Sync ? new Date(settings.lastO365Sync) : null,
      accessToken: settings.o365AccessToken,
      refreshToken: settings.o365RefreshToken,
      tokenExpiresAt: settings.o365TokenExpiresAt ? new Date(settings.o365TokenExpiresAt) : null,
      connectedEmail: settings.o365ConnectedEmail,
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
    console.error("[Cron] Token refresh failed:", error)
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
async function getValidAccessToken(settings: {
  clientId: string
  clientSecret: string
  tenantId: string
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date | null
}): Promise<string | null> {
  if (!settings.refreshToken) {
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
  console.log("[Cron] Refreshing O365 access token...")
  const newTokens = await refreshAccessToken({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    tenantId: settings.tenantId,
    refreshToken: settings.refreshToken,
  })

  if (!newTokens) {
    // Refresh failed
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

// Generate unique ticket number
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TKT-${year}-`

  const lastTicket = await prisma.ticket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: "desc" },
  })

  let nextNumber = 1
  if (lastTicket) {
    const match = lastTicket.ticketNumber.match(/(\d+)$/)
    if (match) nextNumber = parseInt(match[1]) + 1
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`
}

// GET: Cron job endpoint
// Can be called:
// - With Authorization header: Bearer {CRON_SECRET}
// - With query param: ?secret={CRON_SECRET}
// Configure a cron service (cron-job.org, EasyCron, etc.) to call this endpoint every 5 minutes
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get("secret")
  const cronSecret = process.env.CRON_SECRET

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (cronSecret && querySecret === cronSecret)

  if (!cronSecret || !isAuthorized) {
    console.log("[Cron] Unauthorized request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[Cron] Starting O365 email sync...")

    const settings = await getO365Settings()

    if (!settings?.enabled) {
      console.log("[Cron] O365 not enabled, skipping")
      return NextResponse.json({ success: false, message: "O365 not enabled" })
    }

    if (!settings.autoSync) {
      console.log("[Cron] Auto-sync disabled, skipping")
      return NextResponse.json({ success: false, message: "Auto-sync disabled" })
    }

    if (!settings.clientId || !settings.clientSecret || !settings.tenantId || !settings.supportEmail) {
      console.log("[Cron] O365 not configured")
      return NextResponse.json({ success: false, message: "O365 not configured" })
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(settings)

    if (!accessToken) {
      console.log("[Cron] No valid access token, mailbox needs reconnection")
      return NextResponse.json({ success: false, message: "Mailbox not connected" })
    }

    // Calculate since date (last sync or 1 day ago for cron)
    const since = settings.lastO365Sync || new Date(Date.now() - 24 * 60 * 60 * 1000)
    const sinceFilter = since.toISOString()

    // Fetch unread emails only
    const messagesUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${sinceFilter} and isRead eq false&$orderby=receivedDateTime desc&$top=50&$select=id,subject,from,bodyPreview,body,receivedDateTime,conversationId,isRead`

    const messagesResponse = await fetch(messagesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!messagesResponse.ok) {
      const error = await messagesResponse.json()
      console.error("[Cron] Graph API error:", error)

      if (messagesResponse.status === 401) {
        await updateSettings({
          o365AccessToken: null,
          o365RefreshToken: null,
          o365TokenExpiresAt: null,
          o365ConnectedEmail: null,
        })
      }

      return NextResponse.json({
        success: false,
        message: `Graph API error: ${error.error?.message || "Unknown"}`,
      })
    }

    const messagesData = await messagesResponse.json()
    const messages = messagesData.value || []

    console.log(`[Cron] Found ${messages.length} unread emails`)

    let created = 0
    let updated = 0
    let skipped = 0

    for (const email of messages) {
      const senderEmail = email.from?.emailAddress?.address?.toLowerCase()
      const senderName = email.from?.emailAddress?.name || senderEmail
      const subject = email.subject || "(Sans objet)"
      const bodyHtml = email.body?.content || ""
      const bodyText = email.bodyPreview || ""
      const conversationId = email.conversationId
      const messageId = email.id

      // Skip emails from our own domain
      if (senderEmail?.includes(settings.supportEmail.split("@")[1])) {
        skipped++
        continue
      }

      // Check if we already processed this email
      const existingMessage = await prisma.ticketMessage.findFirst({
        where: { emailMessageId: messageId },
      })

      if (existingMessage) {
        skipped++
        continue
      }

      // Find client by email
      const client = await prisma.client.findFirst({
        where: { email: senderEmail },
      })

      // Check for existing ticket
      let ticket = await prisma.ticket.findFirst({
        where: {
          OR: [
            { emailMessageId: conversationId },
            {
              AND: [
                { senderEmail: senderEmail },
                { status: { notIn: ["closed", "resolved"] } },
              ],
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      })

      if (ticket) {
        // Add message to existing ticket
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            type: "email_in",
            content: bodyHtml || bodyText,
            from_email: senderEmail,
            from_name: senderName,
            emailMessageId: messageId,
            client_id: client?.id,
            createdAt: new Date(),
          },
        })

        // Update ticket
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: ticket.status === "closed" ? "open" : ticket.status,
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          },
        })

        updated++
      } else {
        // Create new ticket
        const ticketNumber = await generateTicketNumber()

        ticket = await prisma.ticket.create({
          data: {
            tenant_id: BigInt(1),
            ticketNumber,
            subject,
            senderEmail: senderEmail || "unknown@email.com",
            senderName,
            status: "new",
            priority: "normal",
            clientId: client?.id,
            emailMessageId: conversationId,
            lastActivityAt: new Date(),
            createdAt: new Date(),
          },
        })

        // Create first message
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            type: "email_in",
            content: bodyHtml || bodyText,
            from_email: senderEmail,
            from_name: senderName,
            emailMessageId: messageId,
            client_id: client?.id,
            createdAt: new Date(),
          },
        })

        created++
      }

      // Mark email as read
      try {
        await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isRead: true }),
          }
        )
      } catch (e) {
        console.error("[Cron] Failed to mark email as read:", e)
      }
    }

    // Update last sync timestamp
    await updateSettings({ lastO365Sync: new Date().toISOString() })

    console.log(`[Cron] Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`)

    return NextResponse.json({
      success: true,
      message: `Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`,
      stats: { created, updated, skipped, total: messages.length },
    })
  } catch (error) {
    console.error("[Cron] O365 sync error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Sync error",
      },
      { status: 500 }
    )
  }
}
