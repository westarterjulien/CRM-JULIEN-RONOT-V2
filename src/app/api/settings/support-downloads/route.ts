import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getS3Config, uploadToS3 } from "@/lib/s3"
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

// POST /api/settings/support-downloads - Upload new file
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    console.log("[Upload] User:", session.user.email, "ID:", session.user.id)

    // Get S3 config
    const s3Config = await getS3Config()
    if (!s3Config) {
      return NextResponse.json(
        { error: "Veuillez d'abord configurer le stockage S3 dans les paramètres" },
        { status: 400 }
      )
    }

    console.log("[Upload] S3 Config found, bucket:", s3Config.bucket)

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const platform = formData.get("platform") as string
    const version = formData.get("version") as string | null

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 })
    }

    if (!platform || !["windows", "macos"].includes(platform)) {
      return NextResponse.json(
        { error: "Plateforme invalide (windows ou macos)" },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      "application/x-msdownload", // .exe
      "application/x-msdos-program",
      "application/octet-stream",
      "application/x-apple-diskimage", // .dmg
      "application/vnd.apple.installer+xml", // .pkg
    ]

    const ext = file.name.toLowerCase().split(".").pop()
    const allowedExtensions = ["exe", "dmg", "pkg", "zip"]

    if (!allowedExtensions.includes(ext || "")) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé (.exe, .dmg, .pkg, .zip uniquement)" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const uniqueId = uuidv4()
    const fileName = `${uniqueId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const s3Key = `support-downloads/${platform}/${fileName}`

    // Upload to S3
    console.log("[Upload] Uploading file:", file.name, "size:", file.size, "to key:", s3Key)
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadToS3(
      buffer,
      s3Key,
      file.type || "application/octet-stream",
      s3Config
    )

    if (!uploadResult.success) {
      console.error("[Upload] S3 upload failed:", uploadResult.error)
      return NextResponse.json(
        { error: `Erreur upload S3: ${uploadResult.error}` },
        { status: 500 }
      )
    }

    console.log("[Upload] S3 upload successful, creating DB record...")

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
        originalName: file.name,
        fileSize: BigInt(file.size),
        mimeType: file.type || "application/octet-stream",
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
    console.error("Error uploading support download:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

    // Check for specific errors
    if (errorMessage.includes("support_downloads") || errorMessage.includes("SupportDownload")) {
      return NextResponse.json(
        { error: "Table support_downloads non trouvée. Exécutez 'npx prisma db push' pour créer la table." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: `Erreur lors de l'upload: ${errorMessage}` },
      { status: 500 }
    )
  }
}
