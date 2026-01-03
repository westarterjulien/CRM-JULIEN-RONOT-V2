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
      autoSync: settings.o365AutoSync,
      lastO365Sync: settings.lastO365Sync ? new Date(settings.lastO365Sync) : null,
    }
  } catch {
    return null
  }
}

// Update last sync timestamp
async function updateLastSync() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant) return

  const currentSettings = tenant.settings ? JSON.parse(tenant.settings) : {}
  currentSettings.lastO365Sync = new Date().toISOString()

  await prisma.tenants.update({
    where: { id: BigInt(1) },
    data: { settings: JSON.stringify(currentSettings) },
  })
}

// Get access token from Microsoft
async function getAccessToken(settings: {
  clientId: string
  clientSecret: string
  tenantId: string
}) {
  const tokenUrl = `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || "Failed to get access token")
  }

  const data = await response.json()
  return data.access_token
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
    const settings = await getO365Settings()

    if (!settings?.enabled) {
      return NextResponse.json(
        { success: false, message: "O365 non activé" },
        { status: 400 }
      )
    }

    if (!settings.clientId || !settings.clientSecret || !settings.tenantId || !settings.supportEmail) {
      return NextResponse.json(
        { success: false, message: "Configuration O365 incomplète" },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken(settings)

    // Calculate since date (last sync or 24h ago)
    const since = settings.lastO365Sync || new Date(Date.now() - 24 * 60 * 60 * 1000)
    const sinceFilter = since.toISOString()

    // Fetch unread emails from the support mailbox since last sync
    const messagesUrl = `https://graph.microsoft.com/v1.0/users/${settings.supportEmail}/messages?$filter=receivedDateTime ge ${sinceFilter} and isRead eq false&$orderby=receivedDateTime desc&$top=50&$select=id,subject,from,bodyPreview,body,receivedDateTime,conversationId`

    const messagesResponse = await fetch(messagesUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!messagesResponse.ok) {
      const error = await messagesResponse.json()
      return NextResponse.json({
        success: false,
        message: `Erreur d'accès à la boîte mail: ${error.error?.message || "Permissions insuffisantes"}`,
      })
    }

    const messagesData = await messagesResponse.json()
    const messages = messagesData.value || []

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

      // Mark email as read in O365
      try {
        await fetch(
          `https://graph.microsoft.com/v1.0/users/${settings.supportEmail}/messages/${messageId}`,
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
    await updateLastSync()

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée: ${created} ticket(s) créé(s), ${updated} message(s) ajouté(s), ${skipped} ignoré(s)`,
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

    return NextResponse.json({
      enabled: settings?.enabled || false,
      configured: !!(settings?.clientId && settings?.clientSecret && settings?.tenantId && settings?.supportEmail),
      lastSync: settings?.lastO365Sync || null,
      supportEmail: settings?.supportEmail || null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get sync status" }, { status: 500 })
  }
}
