import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const DEFAULT_TENANT_ID = BigInt(1)

// DocuSeal webhook event types
type DocuSealEventType =
  | "form.viewed"
  | "form.started"
  | "form.completed"
  | "form.declined"
  | "submission.created"
  | "submission.completed"
  | "submission.expired"
  | "submission.archived"

interface DocuSealWebhookPayload {
  event_type: DocuSealEventType
  timestamp: string
  data: {
    id: number // submitter_id for form events, submission_id for submission events
    submission_id?: number
    email?: string
    slug?: string
    status?: string
    completed_at?: string
    declined_at?: string
    decline_reason?: string
    opened_at?: string
    submission?: {
      id: number
      status: string
      audit_log_url?: string
      combined_document_url?: string
    }
    values?: Array<{
      field: string
      value: string
    }>
    documents?: Array<{
      name: string
      url: string
    }>
  }
}

// Verify DocuSeal webhook signature (HMAC-SHA256)
function verifyDocuSealSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) {
    return false
  }

  try {
    // DocuSeal sends signature in X-Docuseal-Signature header
    // Format: sha256=<hex_hash>
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload, "utf8")
      .digest("hex")

    const receivedSig = signature.replace("sha256=", "")

    return crypto.timingSafeEqual(
      Buffer.from(receivedSig),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error("[DocuSeal Webhook] Signature verification error:", error)
    return false
  }
}

// POST - Handle DocuSeal webhook events
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // Get webhook signature from header
    const signature = request.headers.get("X-Docuseal-Signature")
      || request.headers.get("x-docuseal-signature")

    // Get webhook secret from tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: DEFAULT_TENANT_ID },
    })

    let webhookSecret = ""
    if (tenant?.settings) {
      try {
        const settings = JSON.parse(tenant.settings)
        webhookSecret = settings.docusealWebhookSecret || ""
      } catch {}
    }

    // Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = verifyDocuSealSignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error("[DocuSeal Webhook] Invalid signature - rejecting request")
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        )
      }
    } else {
      console.warn("[DocuSeal Webhook] No webhook secret configured - signature not verified!")
    }

    const payload: DocuSealWebhookPayload = JSON.parse(rawBody)

    console.log(`[DocuSeal Webhook] Received: ${payload.event_type}`)

    switch (payload.event_type) {
      case "form.viewed":
        await handleFormViewed(payload)
        break
      case "form.started":
        await handleFormStarted(payload)
        break
      case "form.completed":
        await handleFormCompleted(payload)
        break
      case "form.declined":
        await handleFormDeclined(payload)
        break
      case "submission.completed":
        await handleSubmissionCompleted(payload)
        break
      case "submission.expired":
        await handleSubmissionExpired(payload)
        break
      default:
        console.log(`Unhandled event type: ${payload.event_type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing DocuSeal webhook:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// Handle form.viewed event - signer opened the document
async function handleFormViewed(payload: DocuSealWebhookPayload) {
  const submitterId = payload.data.id

  const signer = await prisma.contractSigner.findFirst({
    where: { docuseal_submitter_id: submitterId },
    include: { contract: true },
  })

  if (!signer) {
    console.log(`Signer not found for submitter_id: ${submitterId}`)
    return
  }

  // Update signer status
  await prisma.contractSigner.update({
    where: { id: signer.id },
    data: {
      status: "viewed",
      viewedAt: new Date(payload.timestamp),
    },
  })

  // Update contract status if first view
  if (signer.contract.status === "sent") {
    await prisma.contract.update({
      where: { id: signer.contract.id },
      data: { status: "viewed" },
    })
  }

  console.log(`Signer ${signer.email} viewed the document`)
}

// Handle form.started event - signer started filling/signing
async function handleFormStarted(payload: DocuSealWebhookPayload) {
  const submitterId = payload.data.id

  const signer = await prisma.contractSigner.findFirst({
    where: { docuseal_submitter_id: submitterId },
  })

  if (!signer) {
    console.log(`Signer not found for submitter_id: ${submitterId}`)
    return
  }

  // Just log - status stays as viewed
  console.log(`Signer ${signer.email} started signing`)
}

// Handle form.completed event - signer completed their part
async function handleFormCompleted(payload: DocuSealWebhookPayload) {
  const submitterId = payload.data.id

  const signer = await prisma.contractSigner.findFirst({
    where: { docuseal_submitter_id: submitterId },
    include: { contract: { include: { signers: true } } },
  })

  if (!signer) {
    console.log(`Signer not found for submitter_id: ${submitterId}`)
    return
  }

  // Update signer status
  await prisma.contractSigner.update({
    where: { id: signer.id },
    data: {
      status: "signed",
      signedAt: payload.data.completed_at
        ? new Date(payload.data.completed_at)
        : new Date(payload.timestamp),
    },
  })

  // Check if all signers have completed
  const allSigners = signer.contract.signers
  const completedSigners = allSigners.filter(s =>
    s.status === "signed" || s.id === signer.id
  )

  if (completedSigners.length === allSigners.length) {
    // All signers completed - wait for submission.completed event
    await prisma.contract.update({
      where: { id: signer.contract.id },
      data: { status: "completed" },
    })
  } else {
    // Some signers still pending
    await prisma.contract.update({
      where: { id: signer.contract.id },
      data: { status: "partially_signed" },
    })
  }

  console.log(`Signer ${signer.email} completed signing (${completedSigners.length}/${allSigners.length})`)
}

// Handle form.declined event - signer declined to sign
async function handleFormDeclined(payload: DocuSealWebhookPayload) {
  const submitterId = payload.data.id

  const signer = await prisma.contractSigner.findFirst({
    where: { docuseal_submitter_id: submitterId },
    include: { contract: true },
  })

  if (!signer) {
    console.log(`Signer not found for submitter_id: ${submitterId}`)
    return
  }

  // Update signer status
  await prisma.contractSigner.update({
    where: { id: signer.id },
    data: {
      status: "declined",
      declinedAt: payload.data.declined_at
        ? new Date(payload.data.declined_at)
        : new Date(payload.timestamp),
      declineReason: payload.data.decline_reason || null,
    },
  })

  // Update contract status
  await prisma.contract.update({
    where: { id: signer.contract.id },
    data: { status: "declined" },
  })

  console.log(`Signer ${signer.email} declined to sign`)
}

// Handle submission.completed event - all signers completed
async function handleSubmissionCompleted(payload: DocuSealWebhookPayload) {
  const submissionId = payload.data.id

  const contract = await prisma.contract.findFirst({
    where: { docuseal_submission_id: submissionId },
    include: { documents: true },
  })

  if (!contract) {
    console.log(`Contract not found for submission_id: ${submissionId}`)
    return
  }

  // Update contract with completion data
  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: "completed",
      completedAt: new Date(payload.timestamp),
    },
  })

  // Store signed document URLs if provided
  if (payload.data.documents && payload.data.documents.length > 0) {
    // Update first document with signed path
    // In a more complete implementation, you'd download and store these
    const signedDoc = payload.data.documents[0]
    if (contract.documents[0]) {
      await prisma.contractDocument.update({
        where: { id: contract.documents[0].id },
        data: { signedPath: signedDoc.url },
      })
    }
  }

  console.log(`Submission ${submissionId} completed - all signers have signed`)
}

// Handle submission.expired event
async function handleSubmissionExpired(payload: DocuSealWebhookPayload) {
  const submissionId = payload.data.id

  const contract = await prisma.contract.findFirst({
    where: { docuseal_submission_id: submissionId },
  })

  if (!contract) {
    console.log(`Contract not found for submission_id: ${submissionId}`)
    return
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: { status: "expired" },
  })

  console.log(`Submission ${submissionId} expired`)
}
