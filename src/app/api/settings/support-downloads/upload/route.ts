import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getS3Config, createS3Client } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from "uuid"

export const maxDuration = 300
export const dynamic = "force-dynamic"

const DEFAULT_TENANT_ID = BigInt(1)
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB

// POST /api/settings/support-downloads/upload - Direct upload with streaming
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Get S3 config
    const s3Config = await getS3Config()
    if (!s3Config) {
      return NextResponse.json(
        { error: "Configuration S3 manquante" },
        { status: 400 }
      )
    }

    // Get metadata from headers
    const fileName = request.headers.get("x-file-name")
    const platform = request.headers.get("x-platform")
    const version = request.headers.get("x-version")
    const contentType = request.headers.get("content-type") || "application/octet-stream"
    const contentLength = parseInt(request.headers.get("content-length") || "0")

    if (!fileName || !platform) {
      return NextResponse.json({ error: "Métadonnées manquantes" }, { status: 400 })
    }

    if (!["windows", "macos"].includes(platform)) {
      return NextResponse.json({ error: "Plateforme invalide" }, { status: 400 })
    }

    if (contentLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      )
    }

    // Validate extension
    const ext = fileName.toLowerCase().split(".").pop()
    if (!["exe", "dmg", "pkg", "zip"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé" },
        { status: 400 }
      )
    }

    // Keep original filename, use UUID in S3 path to avoid conflicts
    const uniqueId = uuidv4()
    const s3Key = `support-downloads/${platform}/${uniqueId}/${fileName}`

    // Get the body as array buffer and upload to S3
    const body = await request.arrayBuffer()
    const buffer = Buffer.from(body)

    console.log("[Upload] Uploading to S3:", s3Key, "size:", buffer.length)

    const client = createS3Client(s3Config)
    await client.send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      })
    )

    console.log("[Upload] S3 upload successful")

    // Deactivate existing files for this platform
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
        fileName: fileName,
        originalName: fileName,
        fileSize: BigInt(buffer.length),
        mimeType: contentType,
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
  } catch (error) {
    console.error("[Upload] Error:", error)
    return NextResponse.json(
      { error: `Erreur: ${error instanceof Error ? error.message : "Inconnue"}` },
      { status: 500 }
    )
  }
}
