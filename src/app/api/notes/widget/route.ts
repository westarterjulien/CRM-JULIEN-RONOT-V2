import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/notes/widget - Get notes for the desktop widget (uses session auth)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "15"), 50)

    // Fetch notes for the widget
    const notes = await prisma.note.findMany({
      where: {
        tenantId: session.user.tenantId,
        isArchived: false,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [
        { isTop: "desc" },
        { reminderAt: "asc" },
        { createdAt: "desc" },
      ],
      take: limit,
    })

    // Get stats
    const stats = await prisma.note.groupBy({
      by: ["type"],
      where: {
        tenantId: session.user.tenantId,
        isArchived: false,
      },
      _count: true,
    })

    const statsMap = {
      quick: 0,
      note: 0,
      todo: 0,
      total: 0,
    }

    stats.forEach((s) => {
      statsMap[s.type as keyof typeof statsMap] = s._count
      statsMap.total += s._count
    })

    // Format notes for the widget
    const formattedNotes = notes.map((note) => ({
      id: note.id,
      type: note.type,
      content: note.content,
      isTop: note.isTop,
      reminderAt: note.reminderAt?.toISOString() || null,
      createdAt: note.createdAt.toISOString(),
      tags: note.tags.map((t) => ({
        name: t.tag.name,
        color: t.tag.color,
      })),
    }))

    return NextResponse.json({
      notes: formattedNotes,
      stats: statsMap,
    })
  } catch (error) {
    console.error("Widget notes error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
