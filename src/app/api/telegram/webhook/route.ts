import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

// Default configuration
const DEFAULT_TENANT_ID = BigInt(process.env.CRM_TENANT_ID || "1")
const DEFAULT_USER_ID = BigInt(process.env.CRM_USER_ID || "1")

// Conversation memory (in-memory cache, resets on restart)
const conversationHistory: Map<number, Array<{ role: "user" | "assistant"; content: string }>> = new Map()
const MAX_HISTORY = 10

// Cache for settings
let cachedSettings: {
  botToken: string
  allowedUsers: number[]
  openaiKey: string
  openaiModel: string
  lastFetch: number
} | null = null
const CACHE_TTL = 5 * 60 * 1000

async function getSettings() {
  const now = Date.now()
  if (cachedSettings && now - cachedSettings.lastFetch < CACHE_TTL) {
    return cachedSettings
  }

  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  let botToken = process.env.TELEGRAM_BOT_TOKEN || ""
  let openaiKey = process.env.OPENAI_API_KEY || ""
  let openaiModel = "gpt-4o-mini"
  let allowedUsers: number[] = []

  if (tenant?.settings) {
    try {
      const settings = JSON.parse(tenant.settings)
      if (settings.telegramBotToken) botToken = settings.telegramBotToken
      if (settings.openaiApiKey) openaiKey = settings.openaiApiKey
      if (settings.openaiModel) openaiModel = settings.openaiModel
      if (settings.telegramAllowedUsers) {
        allowedUsers = settings.telegramAllowedUsers
          .split(",")
          .map((id: string) => parseInt(id.trim()))
          .filter((id: number) => !isNaN(id) && id > 0)
      }
    } catch { /* ignore */ }
  }

  cachedSettings = { botToken, allowedUsers, openaiKey, openaiModel, lastFetch: now }
  return cachedSettings
}

// Telegram API helpers
async function sendMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  })
}

async function sendTyping(botToken: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  })
}

// OpenAI Tools definitions
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Créer un nouveau client/prospect dans le CRM",
      parameters: {
        type: "object",
        properties: {
          companyName: { type: "string", description: "Nom de la société" },
          email: { type: "string", description: "Email du contact" },
          phone: { type: "string", description: "Téléphone" },
          contactFirstname: { type: "string", description: "Prénom du contact" },
          contactLastname: { type: "string", description: "Nom du contact" },
        },
        required: ["companyName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Rechercher des clients par nom, email ou téléphone",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "Lister les derniers clients",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre de clients à afficher (défaut: 10)" },
          status: { type: "string", enum: ["prospect", "active", "inactive"], description: "Filtrer par statut" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Créer une note, éventuellement liée à un client",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Contenu de la note" },
          clientName: { type: "string", description: "Nom du client à lier (optionnel)" },
          reminderDate: { type: "string", description: "Date de rappel au format YYYY-MM-DD (optionnel)" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "Lister les notes récentes",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre de notes (défaut: 10)" },
          clientName: { type: "string", description: "Filtrer par client" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Créer une tâche/todo",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de la tâche" },
          clientName: { type: "string", description: "Client associé (optionnel)" },
          dueDate: { type: "string", description: "Date d'échéance YYYY-MM-DD (optionnel)" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priorité" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Lister les tâches en cours ou en retard",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", enum: ["all", "overdue", "today", "week"], description: "Filtre temporel" },
          limit: { type: "number", description: "Nombre max de tâches" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Marquer une tâche comme terminée",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "number", description: "ID de la tâche" },
          taskTitle: { type: "string", description: "Ou titre partiel de la tâche" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stats",
      description: "Obtenir des statistiques (clients, factures, devis, CA)",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Période" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_invoices",
      description: "Rechercher des factures",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nom du client" },
          status: { type: "string", enum: ["draft", "sent", "paid", "overdue"], description: "Statut" },
          limit: { type: "number", description: "Nombre max" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reminders",
      description: "Obtenir les rappels et notes avec date de rappel à venir",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Nombre de jours à venir (défaut: 7)" },
        },
      },
    },
  },
]

// Tool execution functions
async function executeToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "create_client": {
        const client = await prisma.client.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            companyName: args.companyName as string,
            email: (args.email as string) || null,
            phone: (args.phone as string) || null,
            contactFirstname: (args.contactFirstname as string) || null,
            contactLastname: (args.contactLastname as string) || null,
            status: "prospect",
          },
        })
        return JSON.stringify({ success: true, client: { id: Number(client.id), name: client.companyName } })
      }

      case "search_clients": {
        const query = args.query as string
        const clients = await prisma.client.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            OR: [
              { companyName: { contains: query } },
              { email: { contains: query } },
              { phone: { contains: query } },
              { contactFirstname: { contains: query } },
              { contactLastname: { contains: query } },
            ],
          },
          take: 10,
          select: { id: true, companyName: true, email: true, phone: true, status: true },
        })
        return JSON.stringify({ clients: clients.map(c => ({ ...c, id: Number(c.id) })) })
      }

      case "list_clients": {
        const limit = (args.limit as number) || 10
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status
        const clients = await prisma.client.findMany({
          where,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: { id: true, companyName: true, status: true, email: true },
        })
        return JSON.stringify({ clients: clients.map(c => ({ ...c, id: Number(c.id) })) })
      }

      case "create_note": {
        let clientId: bigint | undefined
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) clientId = client.id
        }

        let reminderAt: Date | undefined
        if (args.reminderDate) {
          reminderAt = new Date(args.reminderDate as string)
        }

        const note = await prisma.note.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            createdBy: DEFAULT_USER_ID,
            content: args.content as string,
            type: "note",
            reminderAt,
          },
        })

        if (clientId) {
          await prisma.noteEntityLink.create({
            data: { noteId: note.id, entityType: "client", entityId: clientId },
          })
        }

        return JSON.stringify({
          success: true,
          note: { id: Number(note.id), linkedToClient: !!clientId, hasReminder: !!reminderAt },
        })
      }

      case "list_notes": {
        const limit = (args.limit as number) || 10
        const notes = await prisma.note.findMany({
          where: { tenant_id: DEFAULT_TENANT_ID, isArchived: false, isRecycle: false },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: { id: true, content: true, type: true, reminderAt: true, createdAt: true },
        })
        return JSON.stringify({
          notes: notes.map(n => ({
            id: Number(n.id),
            content: n.content.substring(0, 100),
            type: n.type,
            reminderAt: n.reminderAt,
          })),
        })
      }

      case "create_task": {
        // Create task as a note with type "todo"
        const note = await prisma.note.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            content: args.title as string,
            type: "todo",
            reminderAt: args.dueDate ? new Date(args.dueDate as string) : null,
            createdBy: DEFAULT_USER_ID,
          },
        })

        // Link to client if specified
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) {
            await prisma.noteEntityLink.create({
              data: {
                noteId: note.id,
                entityType: "client",
                entityId: client.id,
              },
            })
          }
        }

        return JSON.stringify({
          success: true,
          task: { id: Number(note.id), title: note.content, dueDate: note.reminderAt },
        })
      }

      case "list_tasks": {
        const filter = args.filter as string || "all"
        const limit = (args.limit as number) || 15
        const now = new Date()
        const where: Record<string, unknown> = {
          tenant_id: DEFAULT_TENANT_ID,
          type: "todo",
          isArchived: false,
        }

        if (filter === "overdue") {
          where.reminderAt = { lt: now }
        } else if (filter === "today") {
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(0, 0, 0, 0)
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          where.reminderAt = { gte: today, lt: tomorrow }
        } else if (filter === "week") {
          const nextWeek = new Date(now)
          nextWeek.setDate(nextWeek.getDate() + 7)
          where.reminderAt = { lte: nextWeek }
        }

        const tasks = await prisma.note.findMany({
          where,
          take: limit,
          orderBy: [{ reminderAt: "asc" }, { createdAt: "desc" }],
          include: { entityLinks: true },
        })

        // Get client names for linked tasks
        const tasksWithClients = await Promise.all(tasks.map(async (t) => {
          const clientLink = t.entityLinks.find(l => l.entityType === "client")
          let clientName: string | null = null
          if (clientLink) {
            const client = await prisma.client.findUnique({ where: { id: clientLink.entityId } })
            clientName = client?.companyName || null
          }
          return {
            id: Number(t.id),
            title: t.content,
            dueDate: t.reminderAt,
            client: clientName,
            isOverdue: t.reminderAt && t.reminderAt < now,
          }
        }))

        return JSON.stringify({ tasks: tasksWithClients })
      }

      case "complete_task": {
        let task
        if (args.taskId) {
          task = await prisma.note.update({
            where: { id: BigInt(args.taskId as number) },
            data: { isArchived: true },
          })
        } else if (args.taskTitle) {
          const found = await prisma.note.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, type: "todo", isArchived: false, content: { contains: args.taskTitle as string } },
          })
          if (!found) return JSON.stringify({ success: false, error: "Tâche non trouvée" })
          task = await prisma.note.update({
            where: { id: found.id },
            data: { isArchived: true },
          })
        }
        return JSON.stringify({ success: true, task: task ? { id: Number(task.id), title: task.content } : null })
      }

      case "get_stats": {
        const period = (args.period as string) || "month"
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

        const [clientsCount, invoicesAgg, quotesAgg, tasksCompleted, tasksPending] = await Promise.all([
          prisma.client.count({ where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } } }),
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
          prisma.projectCard.count({ where: { isCompleted: true, completedAt: { gte: startDate } } }),
          prisma.projectCard.count({ where: { isCompleted: false } }),
        ])

        return JSON.stringify({
          period,
          stats: {
            newClients: clientsCount,
            invoices: { count: invoicesAgg._count, total: Number(invoicesAgg._sum?.totalTtc || 0) },
            quotes: { count: quotesAgg._count, total: Number(quotesAgg._sum?.totalTtc || 0) },
            tasksCompleted,
            tasksPending,
          },
        })
      }

      case "search_invoices": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) where.clientId = client.id
        }

        const invoices = await prisma.invoice.findMany({
          where,
          take: (args.limit as number) || 10,
          orderBy: { createdAt: "desc" },
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          invoices: invoices.map(i => ({
            id: Number(i.id),
            number: i.invoiceNumber,
            client: i.client?.companyName,
            total: Number(i.totalTtc),
            status: i.status,
            date: i.issueDate,
          })),
        })
      }

      case "get_reminders": {
        const days = (args.days as number) || 7
        const now = new Date()
        const future = new Date(now)
        future.setDate(future.getDate() + days)

        const notes = await prisma.note.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            isArchived: false,
            reminderAt: { gte: now, lte: future },
          },
          orderBy: { reminderAt: "asc" },
          select: { id: true, content: true, reminderAt: true },
        })

        return JSON.stringify({
          reminders: notes.map(n => ({
            id: Number(n.id),
            content: n.content.substring(0, 100),
            date: n.reminderAt,
          })),
        })
      }

      default:
        return JSON.stringify({ error: "Unknown tool" })
    }
  } catch (error) {
    console.error(`Tool ${name} error:`, error)
    return JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" })
  }
}

// System prompt for the AI
const SYSTEM_PROMPT = `Tu es l'assistant CRM intelligent de l'utilisateur. Tu l'aides à gérer ses clients, notes, tâches, factures et devis via Telegram.

PERSONNALITÉ:
- Amical et professionnel, tutoiement
- Concis mais informatif
- Proactif (suggère des actions pertinentes)
- Utilise des emojis avec modération

CAPACITÉS:
- Créer/rechercher des clients
- Créer des notes (avec rappels et liens vers clients)
- Gérer les tâches (créer, lister, terminer)
- Consulter les statistiques (CA, factures, devis)
- Rechercher des factures

RÈGLES:
- Utilise TOUJOURS les outils disponibles pour les actions CRM
- Formate les réponses de façon lisible (listes, montants formatés)
- Si une action échoue, explique clairement pourquoi
- Pour les dates relatives (demain, lundi, etc.), convertis en YYYY-MM-DD
- Les montants sont en euros

EXEMPLES DE REQUÊTES:
- "Crée un client Dupont SARL"
- "Note pour rappeler Dupont demain : envoyer le devis"
- "Mes tâches en retard"
- "Stats du mois"
- "Cherche les factures de Martin"
`

// Main AI processing
async function processWithAI(
  openai: OpenAI,
  model: string,
  chatId: number,
  userMessage: string
): Promise<string> {
  // Get conversation history
  const history = conversationHistory.get(chatId) || []

  // Build messages
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userMessage },
  ]

  try {
    // First call to get intent and tool calls
    const response = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1000,
    })

    const assistantMessage = response.choices[0].message

    // If there are tool calls, execute them
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") continue
        const args = JSON.parse(toolCall.function.arguments)
        const result = await executeToolCall(toolCall.function.name, args)
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      // Second call with tool results
      const finalResponse = await openai.chat.completions.create({
        model,
        messages: [
          ...messages,
          assistantMessage,
          ...toolResults,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })

      const finalContent = finalResponse.choices[0].message.content || "Action effectuée ✓"

      // Update history
      history.push({ role: "user", content: userMessage })
      history.push({ role: "assistant", content: finalContent })
      if (history.length > MAX_HISTORY * 2) history.splice(0, 2)
      conversationHistory.set(chatId, history)

      return finalContent
    }

    // No tool calls, just return the response
    const content = assistantMessage.content || "Je ne suis pas sûr de comprendre. Peux-tu reformuler ?"

    // Update history
    history.push({ role: "user", content: userMessage })
    history.push({ role: "assistant", content: content })
    if (history.length > MAX_HISTORY * 2) history.splice(0, 2)
    conversationHistory.set(chatId, history)

    return content
  } catch (error) {
    console.error("OpenAI error:", error)
    throw error
  }
}

// Telegram webhook handler
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await getSettings()
    const { botToken, allowedUsers, openaiKey, openaiModel } = settings

    if (!botToken) {
      console.error("Telegram bot token not configured")
      return NextResponse.json({ error: "Bot not configured" }, { status: 500 })
    }

    const update: TelegramUpdate = await request.json()

    if (update.message?.text) {
      const { from, chat, text } = update.message
      const userId = from.id
      const chatId = chat.id

      // Auth check
      if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) {
        await sendMessage(botToken, chatId, "⛔ Accès non autorisé.")
        return NextResponse.json({ ok: true })
      }

      // Handle /clear command to reset conversation
      if (text.toLowerCase() === "/clear" || text.toLowerCase() === "/reset") {
        conversationHistory.delete(chatId)
        await sendMessage(botToken, chatId, "🔄 Conversation réinitialisée !")
        return NextResponse.json({ ok: true })
      }

      // Handle /help command
      if (text.toLowerCase() === "/help" || text.toLowerCase() === "/start") {
        await sendMessage(
          botToken,
          chatId,
          `👋 *Salut ! Je suis ton assistant CRM.*\n\n` +
          `Tu peux me parler naturellement, par exemple :\n\n` +
          `📝 "Crée un client Dupont SARL"\n` +
          `📋 "Ajoute une tâche : rappeler Martin demain"\n` +
          `🔍 "Cherche le client Durand"\n` +
          `📊 "Stats du mois"\n` +
          `✅ "Mes tâches en retard"\n` +
          `📄 "Factures impayées"\n\n` +
          `_Tape /clear pour réinitialiser la conversation_`
        )
        return NextResponse.json({ ok: true })
      }

      // Check if OpenAI is configured
      if (!openaiKey) {
        await sendMessage(
          botToken,
          chatId,
          "⚠️ L'IA n'est pas configurée. Configure ta clé OpenAI dans Settings > Intégrations > OpenAI."
        )
        return NextResponse.json({ ok: true })
      }

      // Show typing indicator
      await sendTyping(botToken, chatId)

      // Process with AI
      const openai = new OpenAI({ apiKey: openaiKey })
      const response = await processWithAI(openai, openaiModel, chatId, text)

      await sendMessage(botToken, chatId, response)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: "ok", bot: "crm-telegram-ai", version: "2.0" })
}
