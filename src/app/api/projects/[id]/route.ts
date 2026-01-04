import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Helper to serialize BigInt values to strings for JSON
function serializeProject(project: any) {
  return {
    ...project,
    id: project.id.toString(),
    tenant_id: project.tenant_id?.toString(),
    clientId: project.clientId?.toString() || null,
    client: project.client ? {
      ...project.client,
      id: project.client.id.toString(),
    } : null,
    columns: project.columns?.map((col: any) => ({
      ...col,
      id: col.id.toString(),
      projectId: col.projectId.toString(),
      cards: col.cards?.map((card: any) => ({
        ...card,
        id: card.id.toString(),
        columnId: card.columnId.toString(),
        clientId: card.clientId?.toString() || null,
        client: card.client ? {
          ...card.client,
          id: card.client.id.toString(),
        } : null,
      })) || [],
    })) || [],
  }
}

// GET: Get a single project with all columns and cards
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

    const project = await prisma.project.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                client: {
                  select: { id: true, companyName: true },
                },
              },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Projet non trouve" }, { status: 404 })
    }

    return NextResponse.json(serializeProject(project))
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT: Update a project
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
    const { name, description, color, clientId, isArchived } = body

    const project = await prisma.project.update({
      where: { id: BigInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color }),
        ...(clientId !== undefined && { clientId: clientId ? BigInt(clientId) : null }),
        ...(isArchived !== undefined && { isArchived }),
      },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
            },
          },
        },
      },
    })

    return NextResponse.json(serializeProject(project))
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Delete a project
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

    await prisma.project.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
