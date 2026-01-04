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
    column: card.column ? {
      ...card.column,
      id: card.column.id.toString(),
      projectId: card.column.projectId.toString(),
      project: card.column.project ? {
        ...card.column.project,
        id: card.column.project.id.toString(),
      } : null,
    } : null,
  }
}

// GET: Get a single card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params

    const card = await prisma.projectCard.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
        column: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 })
    }

    return NextResponse.json(serializeCard(card))
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT: Update a card
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
    const {
      title,
      description,
      priority,
      labels,
      clientId,
      dueDate,
      startDate,
      estimatedHours,
      actualHours,
      isCompleted,
    } = body

    const updateData: any = {}

    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (priority !== undefined) updateData.priority = priority
    if (labels !== undefined) updateData.labels = labels ? JSON.stringify(labels) : null
    if (clientId !== undefined) updateData.clientId = clientId ? BigInt(clientId) : null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours || null
    if (actualHours !== undefined) updateData.actualHours = actualHours || null
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted
      updateData.completedAt = isCompleted ? new Date() : null
    }

    const card = await prisma.projectCard.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        client: {
          select: { id: true, companyName: true },
        },
      },
    })

    return NextResponse.json(serializeCard(card))
  } catch (error) {
    console.error("Error updating card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Delete a card
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

    await prisma.projectCard.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
