import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT /api/notes/widget/[id] - Quick actions for widget (toggle task, archive, update content)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const { id } = await params
    const noteId = BigInt(id)
    const body = await request.json()
    const { action, taskIndex, content } = body

    const note = await prisma.note.findUnique({
      where: { id: noteId },
    })

    if (!note) {
      return NextResponse.json(
        { error: "Note non trouvée" },
        { status: 404 }
      )
    }

    let updatedContent = note.content

    // Handle different actions
    switch (action) {
      case "toggleTask": {
        // Toggle a specific task checkbox in the content
        if (typeof taskIndex !== "number") {
          return NextResponse.json(
            { error: "taskIndex requis" },
            { status: 400 }
          )
        }

        const lines = note.content.split("\n")
        let taskCount = 0

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          // Match task lines: - [ ] or - [x] or - [X]
          if (line.match(/^- \[[ xX]\] /)) {
            if (taskCount === taskIndex) {
              // Toggle the checkbox
              if (line.match(/^- \[ \] /)) {
                lines[i] = line.replace(/^- \[ \] /, "- [x] ")
              } else {
                lines[i] = line.replace(/^- \[[xX]\] /, "- [ ] ")
              }
              break
            }
            taskCount++
          }
        }

        updatedContent = lines.join("\n")
        break
      }

      case "archive": {
        // Archive the note
        const updated = await prisma.note.update({
          where: { id: noteId },
          data: { isArchived: true },
        })

        return NextResponse.json({
          success: true,
          id: String(updated.id),
          isArchived: updated.isArchived,
        })
      }

      case "unarchive": {
        // Unarchive the note
        const updated = await prisma.note.update({
          where: { id: noteId },
          data: { isArchived: false },
        })

        return NextResponse.json({
          success: true,
          id: String(updated.id),
          isArchived: updated.isArchived,
        })
      }

      case "togglePin": {
        // Toggle pin status
        const updated = await prisma.note.update({
          where: { id: noteId },
          data: { isTop: !note.isTop },
        })

        return NextResponse.json({
          success: true,
          id: String(updated.id),
          isTop: updated.isTop,
        })
      }

      case "updateContent": {
        // Update the entire content
        if (typeof content !== "string") {
          return NextResponse.json(
            { error: "content requis" },
            { status: 400 }
          )
        }
        updatedContent = content
        break
      }

      case "addTask": {
        // Add a new task to the note
        const newTask = body.task
        if (typeof newTask !== "string" || !newTask.trim()) {
          return NextResponse.json(
            { error: "task requis" },
            { status: 400 }
          )
        }

        // Add new task at the end
        updatedContent = note.content.trim() + "\n- [ ] " + newTask.trim()
        break
      }

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        )
    }

    // Update content if changed
    if (updatedContent !== note.content) {
      const updated = await prisma.note.update({
        where: { id: noteId },
        data: { content: updatedContent },
        include: {
          tags: {
            include: { tag: true },
          },
        },
      })

      return NextResponse.json({
        success: true,
        id: String(updated.id),
        content: updated.content,
        type: updated.type,
        isTop: updated.isTop,
        isArchived: updated.isArchived,
        tags: updated.tags.map((t) => ({
          name: t.tag.name,
          color: t.tag.color,
        })),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Widget note action error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
