import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyClientReply, parseSlackConfig } from "@/lib/slack"
import { sendO365Email, cleanHtmlContent } from "@/lib/o365-email"

// Get Slack config from tenant settings
async function getSlackConfig() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })
  if (!tenant?.settings) return null
  const settings = JSON.parse(tenant.settings as string)
  return parseSlackConfig(settings)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: BigInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        clients: {
          select: {
            id: true,
            companyName: true,
          },
        },
        ticket_attachments: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(
      messages.map((msg) => ({
        ...msg,
        id: msg.id.toString(),
        ticketId: msg.ticketId.toString(),
        userId: msg.userId?.toString() || null,
        client_id: msg.client_id?.toString() || null,
        user: msg.user
          ? {
              ...msg.user,
              id: msg.user.id.toString(),
            }
          : null,
        clients: msg.clients
          ? {
              ...msg.clients,
              id: msg.clients.id.toString(),
            }
          : null,
        ticket_attachments: msg.ticket_attachments.map((att) => ({
          ...att,
          id: att.id.toString(),
          ticket_message_id: att.ticket_message_id.toString(),
        })),
      }))
    )
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des messages" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get ticket to update
    const ticket = await prisma.ticket.findUnique({
      where: { id: BigInt(id) },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket non trouvé" },
        { status: 404 }
      )
    }

    // Determine message type
    let messageType: "email_in" | "email_out" | "note" | "system" = "note"
    if (body.isInternal) {
      messageType = "note"
    } else if (body.userId) {
      messageType = "email_out"
    } else {
      messageType = "email_in"
    }

    // Create message
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: BigInt(id),
        userId: body.userId ? BigInt(body.userId) : null,
        client_id: body.clientId ? BigInt(body.clientId) : null,
        type: messageType,
        content: body.content,
        from_email: body.fromEmail || null,
        from_name: body.fromName || null,
        to_email: body.toEmail || null,
        cc_emails: body.ccEmails || null,
        isInternal: body.isInternal || false,
        createdAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        clients: {
          select: {
            id: true,
            companyName: true,
          },
        },
        ticket_attachments: true,
      },
    })

    // Update ticket
    const updateData: Record<string, unknown> = {
      lastActivityAt: new Date(),
      responseCount: { increment: 1 },
    }

    // Set first response time if this is the first staff response
    if (!ticket.firstResponseAt && body.userId && !body.isInternal) {
      updateData.firstResponseAt = new Date()
    }

    // Update status to open if it was new
    if (ticket.status === "new" && body.userId) {
      updateData.status = "open"
    }

    await prisma.ticket.update({
      where: { id: BigInt(id) },
      data: updateData,
    })

    // Send email via O365 for outgoing messages (staff replies to clients)
    let emailSent = false
    let emailError: string | null = null

    if (messageType === "email_out" && !body.isInternal && body.userId) {
      const recipientEmail = body.toEmail || ticket.senderEmail

      if (recipientEmail) {
        // Get sender info
        const sender = await prisma.user.findUnique({
          where: { id: BigInt(body.userId) },
          select: { name: true, email: true },
        })

        // Build email subject with Re: if it's a reply
        const emailSubject = ticket.subject.startsWith("Re:")
          ? ticket.subject
          : `Re: ${ticket.subject}`

        // Build email body with signature
        const signature = `
<br><br>
<div style="color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px;">
  ${sender?.name || "L'équipe support"}<br>
  <a href="mailto:${sender?.email || ""}">${sender?.email || ""}</a>
</div>`

        const emailBody = body.content + signature

        console.log(`[Tickets] Sending email to ${recipientEmail}...`)

        const result = await sendO365Email({
          to: recipientEmail,
          subject: emailSubject,
          body: emailBody,
          isHtml: true,
          replyToMessageId: ticket.emailMessageId || undefined,
          cc: body.ccEmails ? body.ccEmails.split(",").map((e: string) => e.trim()) : undefined,
        })

        emailSent = result.success
        emailError = result.error || null

        if (result.success) {
          console.log(`[Tickets] Email sent successfully to ${recipientEmail}`)
        } else {
          console.error(`[Tickets] Failed to send email: ${result.error}`)
        }

        // Update message with email status
        await prisma.ticketMessage.update({
          where: { id: message.id },
          data: {
            emailSent: result.success,
            emailError: result.error || null,
          },
        })
      }
    }

    // Send Slack notification for client reply (only for non-internal messages from clients)
    if (!body.isInternal && !body.userId && messageType === "email_in") {
      try {
        const slackConfig = await getSlackConfig()
        if (slackConfig && slackConfig.slackEnabled && slackConfig.slackNotifyOnReply) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          const ticketUrl = `${baseUrl}/tickets/${ticket.id}`

          const result = await notifyClientReply(
            slackConfig,
            {
              id: ticket.id.toString(),
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              priority: ticket.priority,
              status: ticket.status,
              senderName: ticket.senderName,
              senderEmail: ticket.senderEmail,
            },
            {
              id: message.id.toString(),
              content: body.content,
              fromName: body.fromName || null,
              fromEmail: body.fromEmail || null,
            },
            ticketUrl,
            ticket.slackTs || undefined
          )

          // Store Slack timestamp in message if available
          if (result.success && result.slackTs) {
            await prisma.ticketMessage.update({
              where: { id: message.id },
              data: { slackTs: result.slackTs },
            })
          }
        }
      } catch (slackError) {
        console.error("Slack notification error:", slackError)
        // Don't fail the request if Slack fails
      }
    }

    return NextResponse.json({
      ...message,
      id: message.id.toString(),
      ticketId: message.ticketId.toString(),
      userId: message.userId?.toString() || null,
      client_id: message.client_id?.toString() || null,
      user: message.user
        ? {
            ...message.user,
            id: message.user.id.toString(),
          }
        : null,
      clients: message.clients
        ? {
            ...message.clients,
            id: message.clients.id.toString(),
          }
        : null,
      ticket_attachments: [],
    })
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du message" },
      { status: 500 }
    )
  }
}
