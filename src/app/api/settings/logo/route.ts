import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized, forbidden } from "@/lib/auth-helpers"

export async function POST(request: NextRequest) {
  // Require authentication
  const authContext = await getAuthContext()
  if (!authContext) {
    return unauthorized()
  }

  // Only admins can change logo
  if (authContext.isClient) {
    return forbidden("Clients cannot modify tenant settings")
  }

  try {
    const formData = await request.formData()
    const file = formData.get("logo") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Validate file type - SVG removed for XSS security
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP." },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier est trop volumineux. Maximum 2 Mo." },
        { status: 400 }
      )
    }

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${file.type};base64,${base64}`

    // Update tenant with base64 logo
    await prisma.tenants.update({
      where: { id: BigInt(1) },
      data: {
        logo: dataUrl,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      logo: dataUrl,
    })
  } catch (error) {
    console.error("Error uploading logo:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload du logo" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // Require authentication
  const authContext = await getAuthContext()
  if (!authContext) {
    return unauthorized()
  }

  // Only admins can delete logo
  if (authContext.isClient) {
    return forbidden("Clients cannot modify tenant settings")
  }

  try {
    // Update tenant to remove logo
    await prisma.tenants.update({
      where: { id: authContext.tenantId },
      data: {
        logo: null,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting logo:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du logo" },
      { status: 500 }
    )
  }
}
