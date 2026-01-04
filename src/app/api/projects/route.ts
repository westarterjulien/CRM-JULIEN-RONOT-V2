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

// GET: List all projects
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const includeArchived = searchParams.get("includeArchived") === "true"

    const projects = await prisma.project.findMany({
      where: {
        tenant_id: BigInt(1),
        ...(clientId && { clientId: BigInt(clientId) }),
        ...(!includeArchived && { isArchived: false }),
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
              include: {
                client: {
                  select: { id: true, companyName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(projects.map(serializeProject))
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST: Create a new project
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, color, clientId, columns } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
    }

    // Create project with default columns if not provided
    const defaultColumns = columns || [
      { name: "A faire", color: "#E5E7EB", position: 0 },
      { name: "En cours", color: "#FEF3C7", position: 1 },
      { name: "En revue", color: "#DBEAFE", position: 2 },
      { name: "Termine", color: "#D1FAE5", position: 3 },
    ]

    const project = await prisma.project.create({
      data: {
        tenant_id: BigInt(1),
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#0064FA",
        clientId: clientId ? BigInt(clientId) : null,
        columns: {
          create: defaultColumns.map((col: any, index: number) => ({
            name: col.name,
            color: col.color || "#E5E7EB",
            position: col.position ?? index,
            limit: col.limit || null,
          })),
        },
      },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: true,
          },
        },
      },
    })

    return NextResponse.json(serializeProject(project), { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
