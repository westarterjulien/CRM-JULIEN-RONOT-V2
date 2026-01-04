import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Helper to serialize BigInt values
function serializeCard(card: any) {
  return {
    ...card,
    id: card.id.toString(),
    columnId: card.columnId.toString(),
    clientId: card.clientId?.toString() || null,
    client: card.client ? {
      ...card.client,
      id: card.client.id.toString(),
    } : null,
  }
}

// PUT: Move a card to a different column or position
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
    const { columnId, position } = body

    if (columnId === undefined || position === undefined) {
      return NextResponse.json(
        { error: "columnId et position requis" },
        { status: 400 }
      )
    }

    // Get the current card
    const currentCard = await prisma.projectCard.findUnique({
      where: { id: BigInt(id) },
    })

    if (!currentCard) {
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 })
    }

    const oldColumnId = currentCard.columnId
    const newColumnId = BigInt(columnId)
    const newPosition = position

    // If moving within the same column
    if (oldColumnId === newColumnId) {
      const oldPosition = currentCard.position

      if (newPosition > oldPosition) {
        // Moving down: shift cards between old and new position up
        await prisma.projectCard.updateMany({
          where: {
            columnId: oldColumnId,
            position: { gt: oldPosition, lte: newPosition },
          },
          data: { position: { decrement: 1 } },
        })
      } else if (newPosition < oldPosition) {
        // Moving up: shift cards between new and old position down
        await prisma.projectCard.updateMany({
          where: {
            columnId: oldColumnId,
            position: { gte: newPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        })
      }
    } else {
      // Moving to a different column

      // Remove from old column: shift all cards after it up
      await prisma.projectCard.updateMany({
        where: {
          columnId: oldColumnId,
          position: { gt: currentCard.position },
        },
        data: { position: { decrement: 1 } },
      })

      // Insert into new column: shift all cards at or after new position down
      await prisma.projectCard.updateMany({
        where: {
          columnId: newColumnId,
          position: { gte: newPosition },
        },
        data: { position: { increment: 1 } },
      })
    }

    // Update the card itself
    const card = await prisma.projectCard.update({
      where: { id: BigInt(id) },
      data: {
        columnId: newColumnId,
        position: newPosition,
      },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
      },
    })

    return NextResponse.json(serializeCard(card))
  } catch (error) {
    console.error("Error moving card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
