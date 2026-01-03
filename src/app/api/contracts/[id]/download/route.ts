import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { docuseal } from "@/lib/docuseal"
import fs from "fs"
import path from "path"

// GET - Download contract files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || "signed" // signed, original, audit
    const inline = searchParams.get("inline") === "true" // For iframe display

    const contract = await prisma.contract.findUnique({
      where: { id: BigInt(id) },
      include: {
        documents: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    let buffer: Buffer
    let filename: string

    switch (type) {
      case "audit":
        // For DocuSeal, audit log is accessed via URL in submission response
        if (!contract.docuseal_submission_id) {
          return NextResponse.json(
            { error: "Ce contrat n'a pas été envoyé pour signature" },
            { status: 400 }
          )
        }

        const submission = await docuseal.getSubmission(contract.docuseal_submission_id)
        if (!submission.audit_log_url) {
          return NextResponse.json(
            { error: "Le journal d'audit n'est pas encore disponible" },
            { status: 400 }
          )
        }

        // Fetch the audit log PDF from DocuSeal
        const auditResponse = await fetch(submission.audit_log_url)
        if (!auditResponse.ok) {
          throw new Error("Failed to fetch audit log")
        }
        buffer = Buffer.from(await auditResponse.arrayBuffer())
        filename = `audit-${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        break

      case "original":
        // Return the original uploaded document
        if (contract.documents.length === 0) {
          return NextResponse.json(
            { error: "Aucun document attaché à ce contrat" },
            { status: 400 }
          )
        }

        const originalDoc = contract.documents[0]
        const originalPath = path.join(process.cwd(), "public", originalDoc.originalPath)

        if (!fs.existsSync(originalPath)) {
          return NextResponse.json(
            { error: "Document original non trouvé" },
            { status: 404 }
          )
        }

        buffer = fs.readFileSync(originalPath)
        filename = `original-${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        break

      case "signed":
      default:
        // For signed files, contract must be completed
        if (contract.status !== "completed") {
          return NextResponse.json(
            { error: "Le contrat n'a pas encore été signé par tous les signataires" },
            { status: 400 }
          )
        }

        if (!contract.docuseal_submission_id) {
          return NextResponse.json(
            { error: "Ce contrat n'a pas été envoyé pour signature" },
            { status: 400 }
          )
        }

        // Get signed document URL from DocuSeal
        const signedSubmission = await docuseal.getSubmission(contract.docuseal_submission_id)
        if (!signedSubmission.combined_document_url) {
          // Try to get from stored document path
          const signedDoc = contract.documents[0]
          if (signedDoc?.signedPath) {
            const signedResponse = await fetch(signedDoc.signedPath)
            if (signedResponse.ok) {
              buffer = Buffer.from(await signedResponse.arrayBuffer())
            } else {
              return NextResponse.json(
                { error: "Document signé non disponible" },
                { status: 400 }
              )
            }
          } else {
            return NextResponse.json(
              { error: "Document signé non encore disponible" },
              { status: 400 }
            )
          }
        } else {
          const signedResponse = await fetch(signedSubmission.combined_document_url)
          if (!signedResponse.ok) {
            throw new Error("Failed to fetch signed document")
          }
          buffer = Buffer.from(await signedResponse.arrayBuffer())
        }
        filename = `signe-${contract.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
        break
    }

    const uint8Array = new Uint8Array(buffer)
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error downloading contract:", error)
    return NextResponse.json(
      {
        error: "Erreur lors du téléchargement",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
