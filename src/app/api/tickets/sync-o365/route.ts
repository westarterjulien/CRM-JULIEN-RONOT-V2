import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Get O365 settings from tenant (including OAuth tokens)
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
      // OAuth tokens (delegated permissions)
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
async function updateSettings(updates: Record<string, any>) {
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
    console.error("Token refresh failed:", error)
    return null
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || settings.refreshToken, // Use old refresh token if new one not provided
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
  // Check if we have OAuth tokens
  if (!settings.refreshToken) {
    return null // No OAuth connection, needs to connect mailbox first
  }

  // Check if current token is still valid (with 5 min buffer)
  if (settings.accessToken && settings.tokenExpiresAt) {
    const expiresAt = new Date(settings.tokenExpiresAt)
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return settings.accessToken
    }
  }

  // Token expired or about to expire, refresh it
  console.log("Refreshing O365 access token...")
  const newTokens = await refreshAccessToken({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    tenantId: settings.tenantId,
    refreshToken: settings.refreshToken,
  })

  if (!newTokens) {
    // Refresh failed, user needs to reconnect
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

// POST: Sync emails from O365 to tickets
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const debug = searchParams.get("debug") === "true"

    const settings = await getO365Settings()

    if (!settings?.enabled) {
      return NextResponse.json(
        { success: false, message: "O365 non active" },
        { status: 400 }
      )
    }

    if (!settings.clientId || !settings.clientSecret || !settings.tenantId || !settings.supportEmail) {
      return NextResponse.json(
        { success: false, message: "Configuration O365 incomplete" },
        { status: 400 }
      )
    }

    // Get valid access token (using OAuth delegated flow)
    const accessToken = await getValidAccessToken(settings)

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        message: "Boite mail non connectee. Veuillez connecter la boite mail O365 dans les parametres.",
        needsConnection: true,
      }, { status: 401 })
    }

    // Calculate since date (last sync or 7 days ago for first sync)
    const since = settings.lastO365Sync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const sinceFilter = since.toISOString()

    // Fetch emails using /me/messages (delegated permissions)
    // In debug mode, fetch ALL emails (including read); otherwise only unread
    const readFilter = debug ? "" : " and isRead eq false"
    const messagesUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${sinceFilter}${readFilter}&$orderby=receivedDateTime desc&$top=50&$select=id,subject,from,bodyPreview,body,receivedDateTime,conversationId,isRead`

    const messagesResponse = await fetch(messagesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!messagesResponse.ok) {
      const error = await messagesResponse.json()
      console.error("Graph API error:", error)

      // If unauthorized, clear tokens so user can reconnect
      if (messagesResponse.status === 401) {
        await updateSettings({
          o365AccessToken: null,
          o365RefreshToken: null,
          o365TokenExpiresAt: null,
          o365ConnectedEmail: null,
        })
        return NextResponse.json({
          success: false,
          message: "Session expiree. Veuillez reconnecter la boite mail O365.",
          needsConnection: true,
        }, { status: 401 })
      }

      return NextResponse.json({
        success: false,
        message: `Erreur d'acces a la boite mail: ${error.error?.message || "Permissions insuffisantes"}`,
      })
    }

    const messagesData = await messagesResponse.json()
    const messages = messagesData.value || []

    // Debug mode: return raw data
    if (debug) {
      return NextResponse.json({
        debug: true,
        sinceFilter,
        supportEmail: settings.supportEmail,
        connectedEmail: settings.connectedEmail,
        emailsFound: messages.length,
        emails: messages.map((e: any) => ({
          id: e.id,
          subject: e.subject,
          from: e.from?.emailAddress?.address,
          receivedDateTime: e.receivedDateTime,
          isRead: e.isRead,
        })),
      })
    }

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

      // Skip emails from our own domain (auto-replies, etc.)
      if (senderEmail?.includes(settings.supportEmail.split("@")[1])) {
        skipped++
        continue
      }

      // Check if we already processed this email by messageId
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

      // Check if there's an existing ticket for this conversation or sender
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

        // Update ticket activity and reopen if needed
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

      // Mark email as read in O365 using /me endpoint
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
        console.error("Failed to mark email as read:", e)
      }
    }

    // Update last sync timestamp
    await updateSettings({ lastO365Sync: new Date().toISOString() })

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminee: ${created} ticket(s) cree(s), ${updated} message(s) ajoute(s), ${skipped} ignore(s)`,
      stats: { created, updated, skipped, total: messages.length },
    })
  } catch (error) {
    console.error("O365 sync error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Erreur de synchronisation",
      },
      { status: 500 }
    )
  }
}

// GET: Check sync status
export async function GET() {
  try {
    const settings = await getO365Settings()

    const isConnected = !!(settings?.accessToken && settings?.refreshToken)

    return NextResponse.json({
      enabled: settings?.enabled || false,
      configured: !!(settings?.clientId && settings?.clientSecret && settings?.tenantId && settings?.supportEmail),
      connected: isConnected,
      connectedEmail: isConnected ? settings?.connectedEmail : null,
      lastSync: settings?.lastO365Sync || null,
      supportEmail: settings?.supportEmail || null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 })
  }
}
