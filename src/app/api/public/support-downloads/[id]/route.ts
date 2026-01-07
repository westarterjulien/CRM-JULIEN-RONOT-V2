import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getS3Config, getPresignedDownloadUrl } from "@/lib/s3"

const DEFAULT_TENANT_ID = BigInt(1)

// GET /api/public/support-downloads/:id - Get presigned download URL and increment counter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Find the download
    const download = await prisma.supportDownload.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: DEFAULT_TENANT_ID,
        isActive: true,
      },
    })

    if (!download) {
      return NextResponse.json(
        { error: "Téléchargement non trouvé" },
        { status: 404 }
      )
    }

    // Get S3 config
    const s3Config = await getS3Config()
    if (!s3Config) {
      return NextResponse.json(
        { error: "Configuration de stockage non disponible" },
        { status: 503 }
      )
    }

    // Generate presigned URL with original filename for download
    const presignedUrl = await getPresignedDownloadUrl(
      download.s3Key,
      s3Config,
      3600, // 1 hour expiry
      download.originalName // Force download with original filename
    )

    // Increment download counter
    await prisma.supportDownload.update({
      where: { id: download.id },
      data: { downloadCount: { increment: 1 } },
    })

    return NextResponse.json({
      url: presignedUrl,
      fileName: download.originalName,
    })
  } catch (error) {
    console.error("Error generating download URL:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du lien de téléchargement" },
      { status: 500 }
    )
  }
}
