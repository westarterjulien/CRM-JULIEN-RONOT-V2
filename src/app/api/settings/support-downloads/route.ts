import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getS3Config, getPresignedUploadUrl } from "@/lib/s3"
import { v4 as uuidv4 } from "uuid"

// App Router config
export const maxDuration = 300 // 5 minutes timeout for large file uploads
export const dynamic = "force-dynamic"

const DEFAULT_TENANT_ID = BigInt(1)
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB

// GET /api/settings/support-downloads - List all downloads (admin)
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const downloads = await prisma.supportDownload.findMany({
      where: { tenant_id: DEFAULT_TENANT_ID },
      include: {
        uploader: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      downloads: downloads.map((d) => ({
        id: d.id.toString(),
        platform: d.platform,
        fileName: d.fileName,
        originalName: d.originalName,
        fileSize: Number(d.fileSize),
        version: d.version,
        downloadCount: d.downloadCount,
        isActive: d.isActive,
        createdAt: d.createdAt.toISOString(),
        uploadedBy: d.uploader
          ? { name: d.uploader.name, email: d.uploader.email }
          : null,
      })),
    })
  } catch (error) {
    console.error("Error fetching support downloads:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des téléchargements" },
      { status: 500 }
    )
  }
}

// POST /api/settings/support-downloads - Get presigned URL or confirm upload
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Get S3 config
    const s3Config = await getS3Config()
    if (!s3Config) {
      return NextResponse.json(
        { error: "Veuillez d'abord configurer le stockage S3 dans les paramètres" },
        { status: 400 }
      )
    }

    // Step 1: Get presigned URL for upload
    if (action === "get-upload-url") {
      const { fileName, fileSize, contentType, platform } = body

      if (!fileName || !fileSize || !platform) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
      }

      if (!["windows", "macos"].includes(platform)) {
        return NextResponse.json(
          { error: "Plateforme invalide (windows ou macos)" },
          { status: 400 }
        )
      }

      // Validate file size
      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
          { status: 400 }
        )
      }

      // Validate file extension
      const ext = fileName.toLowerCase().split(".").pop()
      const allowedExtensions = ["exe", "dmg", "pkg", "zip"]

      if (!allowedExtensions.includes(ext || "")) {
        return NextResponse.json(
          { error: "Type de fichier non autorisé (.exe, .dmg, .pkg, .zip uniquement)" },
          { status: 400 }
        )
      }

      // Generate unique filename
      const uniqueId = uuidv4()
      const safeFileName = `${uniqueId}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      const s3Key = `support-downloads/${platform}/${safeFileName}`

      // Get presigned URL
      const uploadUrl = await getPresignedUploadUrl(
        s3Key,
        contentType || "application/octet-stream",
        s3Config,
        3600 // 1 hour expiry
      )

      return NextResponse.json({
        uploadUrl,
        s3Key,
        fileName: safeFileName,
      })
    }

    // Step 2: Confirm upload and create DB record
    if (action === "confirm-upload") {
      const { s3Key, fileName, originalName, fileSize, platform, version } = body

      if (!s3Key || !fileName || !originalName || !fileSize || !platform) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
      }

      // Deactivate existing file for this platform
      await prisma.supportDownload.updateMany({
        where: {
          tenant_id: DEFAULT_TENANT_ID,
          platform,
          isActive: true,
        },
        data: { isActive: false },
      })

      // Create database record
      const download = await prisma.supportDownload.create({
        data: {
          tenant_id: DEFAULT_TENANT_ID,
          platform,
          fileName,
          originalName,
          fileSize: BigInt(fileSize),
          mimeType: "application/octet-stream",
          s3Key,
          s3Bucket: s3Config.bucket,
          version: version || null,
          isActive: true,
          uploadedBy: BigInt(session.user.id),
        },
      })

      return NextResponse.json({
        id: download.id.toString(),
        platform: download.platform,
        fileName: download.fileName,
        originalName: download.originalName,
        fileSize: Number(download.fileSize),
        version: download.version,
        message: "Fichier uploadé avec succès",
      })
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 })
  } catch (error) {
    console.error("Error in support downloads:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

    return NextResponse.json(
      { error: `Erreur: ${errorMessage}` },
      { status: 500 }
    )
  }
}
