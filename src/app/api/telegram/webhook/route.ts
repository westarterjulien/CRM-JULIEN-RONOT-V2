import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Default configuration (fallback to env vars)
const DEFAULT_TENANT_ID = BigInt(process.env.CRM_TENANT_ID || "1")
const DEFAULT_USER_ID = BigInt(process.env.CRM_USER_ID || "1")

// Cache for settings (refreshed every 5 minutes)
let cachedSettings: { token: string; allowedUsers: number[]; lastFetch: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getTelegramSettings() {
  const now = Date.now()
  if (cachedSettings && now - cachedSettings.lastFetch < CACHE_TTL) {
    return cachedSettings
  }

  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  let token = process.env.TELEGRAM_BOT_TOKEN || ""
  let allowedUsers: number[] = []

  if (tenant?.settings) {
    try {
      const settings = JSON.parse(tenant.settings)
      if (settings.telegramBotToken) token = settings.telegramBotToken
      if (settings.telegramAllowedUsers) {
        allowedUsers = settings.telegramAllowedUsers
          .split(",")
          .map((id: string) => parseInt(id.trim()))
          .filter((id: number) => !isNaN(id) && id > 0)
      }
    } catch { /* ignore parse errors */ }
  }

  // Fallback to env vars for allowed users
  if (allowedUsers.length === 0 && process.env.TELEGRAM_ALLOWED_USERS) {
    allowedUsers = process.env.TELEGRAM_ALLOWED_USERS
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id) && id > 0)
  }

  cachedSettings = { token, allowedUsers, lastFetch: now }
  return cachedSettings
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    date: number
    text?: string
    entities?: Array<{ type: string; offset: number; length: number }>
  }
  callback_query?: {
    id: string
    from: { id: number }
    message: { chat: { id: number }; message_id: number }
    data: string
  }
}

async function sendMessage(botToken: string, chatId: number, text: string, options: Record<string, unknown> = {}) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...options,
    }),
  })
}

async function answerCallback(botToken: string, callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  })
}

function parseDate(input: string): Date {
  const now = new Date()

  if (input === "demain") {
    const date = new Date(now)
    date.setDate(date.getDate() + 1)
    return date
  }

  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  const dayIndex = days.indexOf(input.toLowerCase())
  if (dayIndex !== -1) {
    const date = new Date(now)
    const currentDay = date.getDay()
    const daysUntil = (dayIndex - currentDay + 7) % 7 || 7
    date.setDate(date.getDate() + daysUntil)
    return date
  }

  const dateParts = input.split("/")
  if (dateParts.length >= 2) {
    const day = parseInt(dateParts[0])
    const month = parseInt(dateParts[1]) - 1
    const year = dateParts[2] ? parseInt(dateParts[2]) : now.getFullYear()
    return new Date(year < 100 ? 2000 + year : year, month, day)
  }

  return now
}

async function handleCommand(botToken: string, chatId: number, command: string, args: string) {
  try {
    switch (command) {
      case "start":
      case "help":
        await sendMessage(
          botToken,
          chatId,
          `*CRM Bot*\n\n` +
            `Commandes:\n` +
            `/client <nom> - Créer un client\n` +
            `/clients - Lister les clients\n` +
            `/chercher <terme> - Rechercher\n` +
            `/note <contenu> - Créer une note\n` +
            `/notes - Lister les notes\n` +
            `/tache <titre> - Créer une tâche\n` +
            `/taches - Lister les tâches\n` +
            `/fait <id> - Terminer une tâche\n` +
            `/stats - Statistiques`
        )
        break

      case "client":
        if (!args) {
          await sendMessage(botToken, chatId, "Usage: /client <nom de la société>")
          return
        }
        const newClient = await prisma.client.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            companyName: args,
            status: "prospect",
          },
        })
        await sendMessage(botToken, chatId, `Client créé!\n\n*${newClient.companyName}*\nID: ${newClient.id}`)
        break

      case "clients":
        const clients = await prisma.client.findMany({
          where: { tenant_id: DEFAULT_TENANT_ID },
          take: 15,
          orderBy: { createdAt: "desc" },
        })
        if (clients.length === 0) {
          await sendMessage(botToken, chatId, "Aucun client.")
          return
        }
        const clientList = clients
          .map((c, i) => `${i + 1}. *${c.companyName}* (${c.status})`)
          .join("\n")
        await sendMessage(botToken, chatId, `*Clients:*\n\n${clientList}`)
        break

      case "chercher":
        if (!args) {
          await sendMessage(botToken, chatId, "Usage: /chercher <terme>")
          return
        }
        const found = await prisma.client.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            OR: [
              { companyName: { contains: args } },
              { email: { contains: args } },
              { phone: { contains: args } },
            ],
          },
          take: 10,
        })
        if (found.length === 0) {
          await sendMessage(botToken, chatId, `Aucun résultat pour "${args}"`)
          return
        }
        const foundList = found.map((c) => `*${c.companyName}*\n   ${c.email || c.phone || ""}`)
          .join("\n\n")
        await sendMessage(botToken, chatId, `*Résultats:*\n\n${foundList}`)
        break

      case "note":
        if (!args) {
          await sendMessage(botToken, chatId, "Usage: /note <contenu>\n\nPour lier: /note @Client contenu")
          return
        }

        let noteContent = args
        let clientIdForNote: bigint | undefined

        // Extract @client mention
        const clientMention = noteContent.match(/@(\S+)/)
        if (clientMention) {
          const clientForNote = await prisma.client.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              companyName: { contains: clientMention[1] },
            },
          })
          if (clientForNote) clientIdForNote = clientForNote.id
          noteContent = noteContent.replace(/@\S+/, "").trim()
        }

        // Extract reminder date
        let reminderAt: Date | undefined
        const dateMatch = noteContent.match(/#(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/)
        if (dateMatch) {
          reminderAt = parseDate(dateMatch[1])
          noteContent = noteContent.replace(/#\S+/, "").trim()
        }

        const note = await prisma.note.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            createdBy: DEFAULT_USER_ID,
            content: noteContent,
            type: "note",
            reminderAt,
          },
        })

        if (clientIdForNote) {
          await prisma.noteEntityLink.create({
            data: { noteId: note.id, entityType: "client", entityId: clientIdForNote },
          })
        }

        let noteMsg = "Note créée!"
        if (clientIdForNote) noteMsg += "\nLiée au client"
        if (reminderAt) noteMsg += `\nRappel: ${reminderAt.toLocaleDateString("fr-FR")}`
        await sendMessage(botToken, chatId, noteMsg)
        break

      case "notes":
        const notes = await prisma.note.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            isArchived: false,
            isRecycle: false,
          },
          take: 10,
          orderBy: { createdAt: "desc" },
        })
        if (notes.length === 0) {
          await sendMessage(botToken, chatId, "Aucune note.")
          return
        }
        const noteList = notes
          .map((n) => `[${n.type}] ${n.content.substring(0, 60)}...`)
          .join("\n\n")
        await sendMessage(botToken, chatId, `*Notes:*\n\n${noteList}`)
        break

      case "tache":
        if (!args) {
          await sendMessage(botToken, chatId, "Usage: /tache <titre>")
          return
        }

        let taskTitle = args
        let taskClientId: bigint | undefined
        let taskDueDate: Date | undefined
        let taskPriority: "low" | "medium" | "high" | "urgent" = "medium"

        // Extract @client
        const taskClientMatch = taskTitle.match(/@(\S+)/)
        if (taskClientMatch) {
          const taskClient = await prisma.client.findFirst({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              companyName: { contains: taskClientMatch[1] },
            },
          })
          if (taskClient) taskClientId = taskClient.id
          taskTitle = taskTitle.replace(/@\S+/, "").trim()
        }

        // Extract date
        const taskDateMatch = taskTitle.match(/#(demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/)
        if (taskDateMatch) {
          taskDueDate = parseDate(taskDateMatch[1])
          taskTitle = taskTitle.replace(/#\S+/, "").trim()
        }

        // Extract priority
        const priorityMatch = taskTitle.match(/!(urgent|high|low)/)
        if (priorityMatch) {
          taskPriority = priorityMatch[1] as typeof taskPriority
          taskTitle = taskTitle.replace(/!\S+/, "").trim()
        }

        // Get or create project and column
        let project = await prisma.project.findFirst({ where: { name: "Général" } })
        if (!project) {
          // Get the first tenant
          const tenant = await prisma.tenants.findFirst()
          if (!tenant) {
            await sendMessage(botToken, chatId, "Erreur: Aucun tenant configuré")
            return
          }
          project = await prisma.project.create({
            data: {
              name: "Général",
              tenants: { connect: { id: tenant.id } },
            },
          })
        }

        let column = await prisma.projectColumn.findFirst({
          where: { projectId: project.id, name: "À faire" },
        })
        if (!column) {
          column = await prisma.projectColumn.create({
            data: { projectId: project.id, name: "À faire", position: 0 },
          })
        }

        const task = await prisma.projectCard.create({
          data: {
            columnId: column.id,
            title: taskTitle,
            priority: taskPriority,
            dueDate: taskDueDate,
            clientId: taskClientId,
            position: 0,
          },
        })

        let taskMsg = `Tâche créée!\n\n*${task.title}*\nID: ${task.id}`
        if (taskDueDate) taskMsg += `\nÉchéance: ${taskDueDate.toLocaleDateString("fr-FR")}`
        if (taskPriority !== "medium") taskMsg += `\nPriorité: ${taskPriority}`
        await sendMessage(botToken, chatId, taskMsg)
        break

      case "taches":
        const tasks = await prisma.projectCard.findMany({
          where: { isCompleted: false },
          include: { client: true },
          take: 15,
          orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        })
        if (tasks.length === 0) {
          await sendMessage(botToken, chatId, "Aucune tâche en cours!")
          return
        }
        const taskList = tasks
          .map((t) => {
            const due = t.dueDate ? ` (${t.dueDate.toLocaleDateString("fr-FR")})` : ""
            const pri = t.priority !== "medium" ? ` [${t.priority}]` : ""
            return `${t.id}. *${t.title}*${pri}${due}`
          })
          .join("\n")
        await sendMessage(botToken, chatId, `*Tâches:*\n\n${taskList}`)
        break

      case "fait":
        const taskIdToComplete = parseInt(args)
        if (!taskIdToComplete) {
          await sendMessage(botToken, chatId, "Usage: /fait <id>")
          return
        }
        const completedTask = await prisma.projectCard.update({
          where: { id: BigInt(taskIdToComplete) },
          data: { isCompleted: true, completedAt: new Date() },
        })
        await sendMessage(botToken, chatId, `Tâche "${completedTask.title}" terminée!`)
        break

      case "stats":
        const period = args || "month"
        const now = new Date()
        let startDate: Date

        switch (period) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case "week":
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 7)
            break
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1)
            break
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        const [clientsCount, invoicesAgg, quotesAgg, tasksCount] = await Promise.all([
          prisma.client.count({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
          }),
          prisma.invoice.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
            _count: true,
            _sum: { totalTtc: true },
          }),
          prisma.quote.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
            _count: true,
            _sum: { totalTtc: true },
          }),
          prisma.projectCard.count({
            where: { createdAt: { gte: startDate }, isCompleted: true },
          }),
        ])

        await sendMessage(
          botToken,
          chatId,
          `*Stats ${period}*\n\n` +
            `Nouveaux clients: ${clientsCount}\n` +
            `Factures: ${invoicesAgg._count} (${Number(invoicesAgg._sum?.totalTtc || 0).toFixed(2)}€)\n` +
            `Devis: ${quotesAgg._count} (${Number(quotesAgg._sum?.totalTtc || 0).toFixed(2)}€)\n` +
            `Tâches terminées: ${tasksCount}`
        )
        break

      default:
        await sendMessage(botToken, chatId, "Commande inconnue. Tapez /help pour voir les commandes.")
    }
  } catch (error) {
    console.error("Command error:", error)
    await sendMessage(botToken, chatId, `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get settings from database
    const settings = await getTelegramSettings()
    const { token: botToken, allowedUsers } = settings

    if (!botToken) {
      console.error("Telegram bot token not configured")
      return NextResponse.json({ error: "Bot not configured" }, { status: 500 })
    }

    const update: TelegramUpdate = await request.json()

    // Handle message
    if (update.message?.text) {
      const { from, chat, text } = update.message
      const userId = from.id
      const chatId = chat.id

      // Auth check
      if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) {
        await sendMessage(botToken, chatId, "Accès non autorisé.")
        return NextResponse.json({ ok: true })
      }

      // Parse command
      if (text.startsWith("/")) {
        const [cmd, ...argParts] = text.slice(1).split(" ")
        const command = cmd.split("@")[0].toLowerCase() // Handle /command@botname
        const args = argParts.join(" ").trim()
        await handleCommand(botToken, chatId, command, args)
      }
    }

    // Handle callback query
    if (update.callback_query) {
      await answerCallback(botToken, update.callback_query.id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

// GET - Health check
export async function GET() {
  return NextResponse.json({ status: "ok", bot: "crm-telegram" })
}
