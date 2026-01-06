import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const emailId = BigInt(id)

    // Fetch the email
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: { clients: true },
    })

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // Resend the email using our email utility
    await sendEmail({
      to: email.to_email,
      subject: email.subject,
      html: email.body,
    })

    // Update the email record
    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "sent",
        sentAt: new Date(),
        // Reset opened_at since it's a fresh send
        opened_at: null,
      },
    })

    return NextResponse.json({
      id: updatedEmail.id.toString(),
      status: updatedEmail.status,
      sentAt: updatedEmail.sentAt?.toISOString() || null,
      message: "Email renvoyé avec succès",
    })
  } catch (error) {
    console.error("Error resending email:", error)
    return NextResponse.json(
      { error: "Failed to resend email" },
      { status: 500 }
    )
  }
}
