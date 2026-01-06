import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const clientId = BigInt(id)

    // Fetch all emails for this client
    const emails = await prisma.email.findMany({
      where: { client_id: clientId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      emails.map((email) => ({
        id: email.id.toString(),
        clientId: email.client_id.toString(),
        subject: email.subject,
        body: email.body,
        fromEmail: email.from_email,
        toEmail: email.to_email,
        cc: email.cc,
        bcc: email.bcc,
        attachments: email.attachments ? JSON.parse(email.attachments) : null,
        status: email.status,
        sentAt: email.sentAt?.toISOString() || null,
        openedAt: email.opened_at?.toISOString() || null,
        createdAt: email.createdAt?.toISOString() || null,
        updatedAt: email.updatedAt?.toISOString() || null,
      }))
    )
  } catch (error) {
    console.error("Error fetching client emails:", error)
    return NextResponse.json(
      { error: "Failed to fetch client emails" },
      { status: 500 }
    )
  }
}
