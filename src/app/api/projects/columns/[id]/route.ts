import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Helper to serialize BigInt values
function serializeColumn(col: any) {
  return {
    ...col,
    id: col.id.toString(),
    projectId: col.projectId.toString(),
    cards: col.cards?.map((card: any) => ({
      ...card,
      id: card.id.toString(),
      columnId: card.columnId.toString(),
      clientId: card.clientId?.toString() || null,
    })) || [],
  }
}

// PUT: Update a column
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, color, limit } = body

    const column = await prisma.projectColumn.update({
      where: { id: BigInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(limit !== undefined && { limit: limit || null }),
      },
      include: {
        cards: true,
      },
    })

    return NextResponse.json(serializeColumn(column))
  } catch (error) {
    console.error("Error updating column:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Delete a column
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params

    // Check if column has cards
    const column = await prisma.projectColumn.findUnique({
      where: { id: BigInt(id) },
      include: { cards: true },
    })

    if (column?.cards && column.cards.length > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer une colonne avec des cartes" },
        { status: 400 }
      )
    }

    await prisma.projectColumn.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting column:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
