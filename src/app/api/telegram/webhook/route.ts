import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

// Default configuration
const DEFAULT_TENANT_ID = BigInt(process.env.CRM_TENANT_ID || "1")
const DEFAULT_USER_ID = BigInt(process.env.CRM_USER_ID || "1")

// Conversation memory - persisted to database via telegram_conversations table
// Falls back to in-memory if DB fails
const conversationCache: Map<number, Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>> = new Map()
const MAX_HISTORY = 20

// Load conversation from DB
async function loadConversation(chatId: number): Promise<Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>> {
  // Check cache first
  if (conversationCache.has(chatId)) {
    return conversationCache.get(chatId)!
  }

  try {
    const conv = await prisma.telegramConversation.findUnique({
      where: { chatId: BigInt(chatId) },
    })
    if (conv?.messages) {
      const messages = JSON.parse(conv.messages)
      conversationCache.set(chatId, messages)
      return messages
    }
  } catch (e) {
    console.error("Failed to load conversation:", e)
  }
  return []
}

// Save conversation to DB
async function saveConversation(chatId: number, messages: Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>) {
  conversationCache.set(chatId, messages)
  try {
    await prisma.telegramConversation.upsert({
      where: { chatId: BigInt(chatId) },
      create: {
        chatId: BigInt(chatId),
        messages: JSON.stringify(messages),
        lastActivity: new Date(),
      },
      update: {
        messages: JSON.stringify(messages),
        lastActivity: new Date(),
      },
    })
  } catch (e) {
    console.error("Failed to save conversation:", e)
  }
}

// Clear conversation
async function clearConversation(chatId: number) {
  conversationCache.delete(chatId)
  try {
    await prisma.telegramConversation.deleteMany({
      where: { chatId: BigInt(chatId) },
    })
  } catch (e) {
    console.error("Failed to clear conversation:", e)
  }
}

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

// O365 Calendar helpers
interface O365TokenResult {
  accessToken: string
  userEmail: string
}

async function getO365TenantConfig(): Promise<{
  enabled: boolean
  clientId: string
  clientSecret: string
  tenantId: string
} | null> {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    if (!settings.o365Enabled || !settings.o365ClientId || !settings.o365ClientSecret || !settings.o365TenantId) {
      return null
    }
    return {
      enabled: settings.o365Enabled,
      clientId: settings.o365ClientId,
      clientSecret: settings.o365ClientSecret,
      tenantId: settings.o365TenantId,
    }
  } catch {
    return null
  }
}

async function refreshO365Token(
  userId: bigint,
  refreshToken: string,
  config: { clientId: string; clientSecret: string; tenantId: string }
): Promise<string | null> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access",
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    await prisma.user.update({
      where: { id: userId },
      data: {
        o365AccessToken: data.access_token,
        o365RefreshToken: data.refresh_token || refreshToken,
        o365TokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    })

    return data.access_token
  } catch {
    return null
  }
}

async function getO365TokenForTelegramUser(chatId: number): Promise<O365TokenResult | null> {
  // Find user by telegram chat ID
  const user = await prisma.user.findFirst({
    where: { telegramChatId: BigInt(chatId) },
    select: {
      id: true,
      o365AccessToken: true,
      o365RefreshToken: true,
      o365TokenExpiresAt: true,
      o365ConnectedEmail: true,
    },
  })

  if (!user?.o365RefreshToken) return null

  const config = await getO365TenantConfig()
  if (!config) return null

  // Check if token is valid (with 5 min margin)
  if (user.o365AccessToken && user.o365TokenExpiresAt && user.o365TokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return { accessToken: user.o365AccessToken, userEmail: user.o365ConnectedEmail || "" }
  }

  // Refresh the token
  const newToken = await refreshO365Token(user.id, user.o365RefreshToken, config)
  if (!newToken) return null

  return { accessToken: newToken, userEmail: user.o365ConnectedEmail || "" }
}

// Parse natural language date/time to ISO format
function parseDateTime(dateStr: string): Date {
  const now = new Date()
  const lower = dateStr.toLowerCase().trim()

  // Handle "demain"
  if (lower.includes("demain")) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Extract time
    const timeMatch = lower.match(/(\d{1,2})[h:](\d{0,2})?/)
    if (timeMatch) {
      tomorrow.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || "0"), 0, 0)
    } else {
      tomorrow.setHours(9, 0, 0, 0) // Default 9h
    }
    return tomorrow
  }

  // Handle "aujourd'hui"
  if (lower.includes("aujourd")) {
    const today = new Date(now)
    const timeMatch = lower.match(/(\d{1,2})[h:](\d{0,2})?/)
    if (timeMatch) {
      today.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || "0"), 0, 0)
    }
    return today
  }

  // Handle "lundi", "mardi", etc.
  const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const target = new Date(now)
      const currentDay = now.getDay()
      let daysUntil = i - currentDay
      if (daysUntil <= 0) daysUntil += 7 // Next week
      target.setDate(target.getDate() + daysUntil)

      const timeMatch = lower.match(/(\d{1,2})[h:](\d{0,2})?/)
      if (timeMatch) {
        target.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || "0"), 0, 0)
      } else {
        target.setHours(9, 0, 0, 0)
      }
      return target
    }
  }

  // Try ISO format or standard date parsing
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  // Fallback: try to parse "YYYY-MM-DD HH:MM" or "DD/MM/YYYY HH:MM"
  const frMatch = lower.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2})[h:](\d{0,2})?/)
  if (frMatch) {
    return new Date(
      parseInt(frMatch[3]),
      parseInt(frMatch[2]) - 1,
      parseInt(frMatch[1]),
      parseInt(frMatch[4]),
      parseInt(frMatch[5] || "0")
    )
  }

  const isoMatch = lower.match(/(\d{4})-(\d{2})-(\d{2})\s*(\d{1,2})[h:](\d{0,2})?/)
  if (isoMatch) {
    return new Date(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]) - 1,
      parseInt(isoMatch[3]),
      parseInt(isoMatch[4]),
      parseInt(isoMatch[5] || "0")
    )
  }

  // Default: return input as-is (will likely fail)
  return new Date(dateStr)
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

// Helper to format currency
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0,00 €"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
}

// Helper to generate invoice/quote number
async function generateNumber(type: "invoice" | "quote"): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = type === "invoice" ? "FAC" : "DEV"

  if (type === "invoice") {
    const lastInvoice = await prisma.invoice.findFirst({
      where: { tenant_id: DEFAULT_TENANT_ID, invoiceNumber: { startsWith: `${prefix}-${year}-` } },
      orderBy: { invoiceNumber: "desc" },
    })
    const lastNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split("-")[2]) : 0
    return `${prefix}-${year}-${String(lastNum + 1).padStart(4, "0")}`
  } else {
    const lastQuote = await prisma.quote.findFirst({
      where: { tenant_id: DEFAULT_TENANT_ID, quoteNumber: { startsWith: `${prefix}-${year}-` } },
      orderBy: { quoteNumber: "desc" },
    })
    const lastNum = lastQuote ? parseInt(lastQuote.quoteNumber.split("-")[2]) : 0
    return `${prefix}-${year}-${String(lastNum + 1).padStart(4, "0")}`
  }
}

// OpenAI Tools definitions - COMPLETE LIST
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // ===== CLIENTS =====
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
          address: { type: "string", description: "Adresse" },
          city: { type: "string", description: "Ville" },
          postalCode: { type: "string", description: "Code postal" },
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
      description: "Lister les clients",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre de clients (défaut: 10)" },
          status: { type: "string", enum: ["prospect", "active", "inactive"], description: "Filtrer par statut" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_details",
      description: "Obtenir les détails complets d'un client (contact, factures, devis, abonnements)",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nom du client" },
          clientId: { type: "number", description: "Ou ID du client" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_client_status",
      description: "Changer le statut d'un client (prospect, active, inactive)",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nom du client" },
          status: { type: "string", enum: ["prospect", "active", "inactive"], description: "Nouveau statut" },
        },
        required: ["clientName", "status"],
      },
    },
  },
  // ===== NOTES =====
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
  // ===== TASKS =====
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
  // ===== DEVIS (QUOTES) =====
  {
    type: "function",
    function: {
      name: "create_quote",
      description: "Créer un nouveau devis pour un client",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nom du client" },
          items: {
            type: "array",
            description: "Lignes du devis",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Description du service/produit" },
                quantity: { type: "number", description: "Quantité" },
                unitPrice: { type: "number", description: "Prix unitaire HT" },
                vatRate: { type: "number", description: "Taux TVA (défaut: 20)" },
              },
              required: ["description", "quantity", "unitPrice"],
            },
          },
          validityDays: { type: "number", description: "Durée de validité en jours (défaut: 30)" },
          notes: { type: "string", description: "Notes/commentaires" },
        },
        required: ["clientName", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_quotes",
      description: "Lister les devis",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "sent", "accepted", "rejected", "expired"], description: "Filtrer par statut" },
          clientName: { type: "string", description: "Filtrer par client" },
          limit: { type: "number", description: "Nombre max (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_quotes",
      description: "Rechercher des devis par numéro ou client",
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
      name: "send_quote",
      description: "Marquer un devis comme envoyé",
      parameters: {
        type: "object",
        properties: {
          quoteNumber: { type: "string", description: "Numéro du devis (ex: DEV-2025-0001)" },
          quoteId: { type: "number", description: "Ou ID du devis" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "convert_quote_to_invoice",
      description: "Convertir un devis accepté en facture",
      parameters: {
        type: "object",
        properties: {
          quoteNumber: { type: "string", description: "Numéro du devis" },
          quoteId: { type: "number", description: "Ou ID du devis" },
        },
      },
    },
  },
  // ===== FACTURES (INVOICES) =====
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Créer une nouvelle facture pour un client",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nom du client" },
          items: {
            type: "array",
            description: "Lignes de la facture",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Description" },
                quantity: { type: "number", description: "Quantité" },
                unitPrice: { type: "number", description: "Prix unitaire HT" },
                vatRate: { type: "number", description: "Taux TVA (défaut: 20)" },
              },
              required: ["description", "quantity", "unitPrice"],
            },
          },
          dueDays: { type: "number", description: "Délai de paiement en jours (défaut: 30)" },
          notes: { type: "string", description: "Notes" },
        },
        required: ["clientName", "items"],
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
      name: "list_unpaid_invoices",
      description: "Lister les factures impayées (envoyées mais non payées)",
      parameters: {
        type: "object",
        properties: {
          overdueOnly: { type: "boolean", description: "Uniquement les factures en retard" },
          limit: { type: "number", description: "Nombre max" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_invoice_paid",
      description: "Marquer une facture comme payée",
      parameters: {
        type: "object",
        properties: {
          invoiceNumber: { type: "string", description: "Numéro de facture (ex: FAC-2025-0001)" },
          invoiceId: { type: "number", description: "Ou ID de la facture" },
          paymentMethod: { type: "string", enum: ["virement", "carte", "cheque", "especes", "prelevement"], description: "Moyen de paiement" },
          paymentDate: { type: "string", description: "Date de paiement YYYY-MM-DD (défaut: aujourd'hui)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_invoice",
      description: "Marquer une facture comme envoyée",
      parameters: {
        type: "object",
        properties: {
          invoiceNumber: { type: "string", description: "Numéro de facture" },
          invoiceId: { type: "number", description: "Ou ID" },
        },
      },
    },
  },
  // ===== TRÉSORERIE (TREASURY) =====
  {
    type: "function",
    function: {
      name: "get_treasury",
      description: "Obtenir la situation de trésorerie (soldes des comptes, dernières transactions)",
      parameters: {
        type: "object",
        properties: {
          transactionsLimit: { type: "number", description: "Nombre de transactions récentes (défaut: 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_bank_transactions",
      description: "Lister les transactions bancaires récentes",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre de transactions (défaut: 20)" },
          type: { type: "string", enum: ["credit", "debit"], description: "Filtrer par type" },
          unreconciled: { type: "boolean", description: "Uniquement les non rapprochées" },
        },
      },
    },
  },
  // ===== ABONNEMENTS (SUBSCRIPTIONS) =====
  {
    type: "function",
    function: {
      name: "list_subscriptions",
      description: "Lister les abonnements actifs",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Filtrer par client" },
          status: { type: "string", enum: ["active", "paused", "cancelled", "expired"], description: "Filtrer par statut" },
          limit: { type: "number", description: "Nombre max" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_renewals",
      description: "Obtenir les abonnements à renouveler prochainement",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Dans les X prochains jours (défaut: 30)" },
        },
      },
    },
  },
  // ===== DOMAINES =====
  {
    type: "function",
    function: {
      name: "list_domains",
      description: "Lister les noms de domaine",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Filtrer par client" },
          status: { type: "string", enum: ["active", "expired", "pending_transfer"], description: "Statut" },
          limit: { type: "number", description: "Nombre max" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_expiring_domains",
      description: "Lister les domaines qui expirent bientôt",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Dans les X prochains jours (défaut: 30)" },
        },
      },
    },
  },
  // ===== TICKETS SUPPORT =====
  {
    type: "function",
    function: {
      name: "list_tickets",
      description: "Lister les tickets de support",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["new", "open", "pending", "resolved", "closed"], description: "Filtrer par statut" },
          clientName: { type: "string", description: "Filtrer par client" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Filtrer par priorité" },
          limit: { type: "number", description: "Nombre max" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_ticket",
      description: "Créer un nouveau ticket de support",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Sujet du ticket" },
          clientName: { type: "string", description: "Client concerné" },
          content: { type: "string", description: "Description du problème" },
          priority: { type: "string", enum: ["low", "normal", "high", "urgent"], description: "Priorité" },
        },
        required: ["subject", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_ticket_status",
      description: "Mettre à jour le statut d'un ticket",
      parameters: {
        type: "object",
        properties: {
          ticketNumber: { type: "string", description: "Numéro du ticket" },
          ticketId: { type: "number", description: "Ou ID du ticket" },
          status: { type: "string", enum: ["open", "pending", "resolved", "closed"], description: "Nouveau statut" },
        },
        required: ["status"],
      },
    },
  },
  // ===== CONTRATS =====
  {
    type: "function",
    function: {
      name: "list_contracts",
      description: "Lister les contrats",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "sent", "completed", "declined", "expired"], description: "Statut" },
          clientName: { type: "string", description: "Filtrer par client" },
          limit: { type: "number", description: "Nombre max" },
        },
      },
    },
  },
  // ===== PROJETS KANBAN =====
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "Lister les projets Kanban",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Filtrer par client" },
          includeArchived: { type: "boolean", description: "Inclure les projets archivés" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_project_cards",
      description: "Lister les cartes/tâches d'un projet Kanban",
      parameters: {
        type: "object",
        properties: {
          projectName: { type: "string", description: "Nom du projet" },
          projectId: { type: "number", description: "Ou ID du projet" },
          columnName: { type: "string", description: "Filtrer par colonne" },
          assigneeName: { type: "string", description: "Filtrer par assigné" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project_card",
      description: "Créer une carte dans un projet Kanban",
      parameters: {
        type: "object",
        properties: {
          projectName: { type: "string", description: "Nom du projet" },
          title: { type: "string", description: "Titre de la carte" },
          description: { type: "string", description: "Description" },
          columnName: { type: "string", description: "Colonne (défaut: première colonne)" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priorité" },
          dueDate: { type: "string", description: "Date d'échéance YYYY-MM-DD" },
          clientName: { type: "string", description: "Client associé" },
        },
        required: ["projectName", "title"],
      },
    },
  },
  // ===== STATISTIQUES =====
  {
    type: "function",
    function: {
      name: "get_stats",
      description: "Obtenir les statistiques globales (clients, CA, factures, devis)",
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
      name: "get_dashboard",
      description: "Obtenir un résumé complet du tableau de bord (stats, tâches urgentes, factures impayées, etc.)",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  // ===== RAPPELS =====
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
  // ===== SERVICES =====
  {
    type: "function",
    function: {
      name: "list_services",
      description: "Lister les services/produits disponibles",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filtrer par catégorie" },
          limit: { type: "number", description: "Nombre max" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_services",
      description: "Rechercher un service par nom ou code",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche" },
        },
        required: ["query"],
      },
    },
  },
  // ===== ADVANCED ANALYTICS =====
  {
    type: "function",
    function: {
      name: "get_client_summary",
      description: "Obtenir un résumé complet d'un client: CA total, dernières factures, devis en cours, abonnements, tickets, score de santé",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Nom du client" },
          clientId: { type: "number", description: "ID du client" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description: "Comparer le CA entre deux périodes (ce mois vs mois précédent, cette année vs année précédente, etc.)",
      parameters: {
        type: "object",
        properties: {
          comparison: { type: "string", enum: ["month", "quarter", "year"], description: "Type de comparaison" },
        },
        required: ["comparison"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_revenue_prediction",
      description: "Prédire le CA des prochains mois basé sur les abonnements actifs et les tendances",
      parameters: {
        type: "object",
        properties: {
          months: { type: "number", description: "Nombre de mois à prédire (défaut: 3)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_clients",
      description: "Obtenir le classement des meilleurs clients par CA, avec leur score de santé",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Nombre de clients (défaut: 10)" },
          period: { type: "string", enum: ["all", "year", "quarter"], description: "Période de calcul" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_achievements",
      description: "Obtenir les statistiques de gamification: streak actuel, badges gagnés, objectifs",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_recurring_reminder",
      description: "Créer un rappel récurrent (quotidien, hebdomadaire, mensuel)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre du rappel" },
          frequency: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Fréquence" },
          time: { type: "string", description: "Heure du rappel (format HH:MM)" },
          dayOfWeek: { type: "number", description: "Jour de la semaine (1=lundi, 7=dimanche) pour weekly" },
          dayOfMonth: { type: "number", description: "Jour du mois pour monthly" },
        },
        required: ["title", "frequency"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_document_pdf",
      description: "Obtenir le lien PDF d'une facture ou d'un devis pour téléchargement/impression",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["invoice", "quote"], description: "Type de document" },
          number: { type: "string", description: "Numéro du document (ex: FAC-2025-0001 ou DEV-2025-0001)" },
          id: { type: "number", description: "ID du document (alternatif au numéro)" },
        },
        required: ["type"],
      },
    },
  },
  // ===== CALENDAR =====
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Créer un rendez-vous/événement dans le calendrier Outlook de l'utilisateur",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Titre/sujet du rendez-vous" },
          startDate: { type: "string", description: "Date et heure de début (format ISO ou naturel comme '2025-01-15 14:00' ou 'demain 15h')" },
          endDate: { type: "string", description: "Date et heure de fin (optionnel, par défaut 1h après le début)" },
          location: { type: "string", description: "Lieu du rendez-vous (optionnel)" },
          description: { type: "string", description: "Description/notes du rendez-vous (optionnel)" },
          clientName: { type: "string", description: "Nom du client pour lier le RDV (optionnel)" },
          attendees: { type: "array", items: { type: "string" }, description: "Emails des participants à inviter (optionnel)" },
        },
        required: ["subject", "startDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_calendar_events",
      description: "Voir les prochains rendez-vous du calendrier Outlook",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Nombre de jours à afficher (défaut: 7)" },
        },
      },
    },
  },
]

// Tool execution functions
async function executeToolCall(name: string, args: Record<string, unknown>, chatId?: number): Promise<string> {
  try {
    switch (name) {
      // ===== CLIENTS =====
      case "create_client": {
        const client = await prisma.client.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            companyName: args.companyName as string,
            email: (args.email as string) || null,
            phone: (args.phone as string) || null,
            contactFirstname: (args.contactFirstname as string) || null,
            contactLastname: (args.contactLastname as string) || null,
            address: (args.address as string) || null,
            city: (args.city as string) || null,
            postalCode: (args.postalCode as string) || null,
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
          select: { id: true, companyName: true, status: true, email: true, phone: true },
        })
        return JSON.stringify({ clients: clients.map(c => ({ ...c, id: Number(c.id) })) })
      }

      case "get_client_details": {
        let client
        if (args.clientId) {
          client = await prisma.client.findUnique({
            where: { id: BigInt(args.clientId as number) },
            include: {
              invoices: { take: 5, orderBy: { createdAt: "desc" }, select: { id: true, invoiceNumber: true, totalTtc: true, status: true } },
              quotes: { take: 5, orderBy: { createdAt: "desc" }, select: { id: true, quoteNumber: true, totalTtc: true, status: true } },
              subscriptions: { where: { status: "active" }, select: { id: true, name: true, amountTtc: true, nextBillingDate: true } },
              domains: { select: { id: true, domain: true, expirationDate: true, status: true } },
              tickets: { take: 3, orderBy: { createdAt: "desc" }, select: { id: true, ticketNumber: true, subject: true, status: true } },
            },
          })
        } else if (args.clientName) {
          client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
            include: {
              invoices: { take: 5, orderBy: { createdAt: "desc" }, select: { id: true, invoiceNumber: true, totalTtc: true, status: true } },
              quotes: { take: 5, orderBy: { createdAt: "desc" }, select: { id: true, quoteNumber: true, totalTtc: true, status: true } },
              subscriptions: { where: { status: "active" }, select: { id: true, name: true, amountTtc: true, nextBillingDate: true } },
              domains: { select: { id: true, domain: true, expirationDate: true, status: true } },
              tickets: { take: 3, orderBy: { createdAt: "desc" }, select: { id: true, ticketNumber: true, subject: true, status: true } },
            },
          })
        }

        if (!client) return JSON.stringify({ error: "Client non trouvé" })

        return JSON.stringify({
          client: {
            id: Number(client.id),
            name: client.companyName,
            status: client.status,
            email: client.email,
            phone: client.phone,
            contact: `${client.contactFirstname || ""} ${client.contactLastname || ""}`.trim(),
            address: [client.address, client.postalCode, client.city].filter(Boolean).join(", "),
            invoices: client.invoices.map(i => ({ ...i, id: Number(i.id), total: Number(i.totalTtc) })),
            quotes: client.quotes.map(q => ({ ...q, id: Number(q.id), total: Number(q.totalTtc) })),
            subscriptions: client.subscriptions.map(s => ({ ...s, id: Number(s.id), amount: Number(s.amountTtc) })),
            domains: client.domains.map(d => ({ ...d, id: Number(d.id) })),
            tickets: client.tickets.map(t => ({ ...t, id: Number(t.id) })),
          },
        })
      }

      case "update_client_status": {
        const client = await prisma.client.findFirst({
          where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
        })
        if (!client) return JSON.stringify({ error: "Client non trouvé" })

        await prisma.client.update({
          where: { id: client.id },
          data: { status: args.status as "prospect" | "active" | "inactive" },
        })
        return JSON.stringify({ success: true, client: client.companyName, newStatus: args.status })
      }

      // ===== NOTES =====
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

      // ===== TASKS =====
      case "create_task": {
        const note = await prisma.note.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            content: args.title as string,
            type: "todo",
            reminderAt: args.dueDate ? new Date(args.dueDate as string) : null,
            createdBy: DEFAULT_USER_ID,
          },
        })

        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) {
            await prisma.noteEntityLink.create({
              data: { noteId: note.id, entityType: "client", entityId: client.id },
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

      // ===== QUOTES =====
      case "create_quote": {
        const client = await prisma.client.findFirst({
          where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
        })
        if (!client) return JSON.stringify({ error: "Client non trouvé" })

        const items = args.items as Array<{ description: string; quantity: number; unitPrice: number; vatRate?: number }>
        const quoteNumber = await generateNumber("quote")
        const validityDays = (args.validityDays as number) || 30
        const issueDate = new Date()
        const validityDate = new Date()
        validityDate.setDate(validityDate.getDate() + validityDays)

        let subtotalHt = 0
        let taxAmount = 0
        const quoteItems = items.map(item => {
          const vatRate = item.vatRate || 20
          const totalHt = item.quantity * item.unitPrice
          const itemTax = totalHt * (vatRate / 100)
          subtotalHt += totalHt
          taxAmount += itemTax
          return {
            description: item.description,
            quantity: item.quantity,
            unitPriceHt: item.unitPrice,
            vatRate,
            totalHt,
            totalTtc: totalHt + itemTax,
          }
        })

        const quote = await prisma.quote.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            quoteNumber,
            clientId: client.id,
            status: "draft",
            issueDate,
            validityDate,
            subtotalHt,
            taxAmount,
            totalTtc: subtotalHt + taxAmount,
            notes: (args.notes as string) || null,
            items: {
              create: quoteItems,
            },
          },
        })

        return JSON.stringify({
          success: true,
          quote: {
            id: Number(quote.id),
            number: quote.quoteNumber,
            client: client.companyName,
            total: Number(quote.totalTtc),
            validUntil: validityDate,
          },
        })
      }

      case "list_quotes": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) where.clientId = client.id
        }

        const quotes = await prisma.quote.findMany({
          where,
          take: (args.limit as number) || 10,
          orderBy: { createdAt: "desc" },
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          quotes: quotes.map(q => ({
            id: Number(q.id),
            number: q.quoteNumber,
            client: q.client?.companyName,
            total: Number(q.totalTtc),
            status: q.status,
            date: q.issueDate,
            validUntil: q.validityDate,
          })),
        })
      }

      case "search_quotes": {
        const query = args.query as string
        const quotes = await prisma.quote.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            OR: [
              { quoteNumber: { contains: query } },
              { client: { companyName: { contains: query } } },
            ],
          },
          take: 10,
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          quotes: quotes.map(q => ({
            id: Number(q.id),
            number: q.quoteNumber,
            client: q.client?.companyName,
            total: Number(q.totalTtc),
            status: q.status,
          })),
        })
      }

      case "send_quote": {
        let quote
        if (args.quoteId) {
          quote = await prisma.quote.update({
            where: { id: BigInt(args.quoteId as number) },
            data: { status: "sent", sent_at: new Date() },
          })
        } else if (args.quoteNumber) {
          const found = await prisma.quote.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, quoteNumber: args.quoteNumber as string },
          })
          if (!found) return JSON.stringify({ error: "Devis non trouvé" })
          quote = await prisma.quote.update({
            where: { id: found.id },
            data: { status: "sent", sent_at: new Date() },
          })
        }
        return JSON.stringify({ success: true, quote: quote ? { number: quote.quoteNumber, status: "sent" } : null })
      }

      case "convert_quote_to_invoice": {
        let quote
        if (args.quoteId) {
          quote = await prisma.quote.findUnique({
            where: { id: BigInt(args.quoteId as number) },
            include: { items: true, client: true },
          })
        } else if (args.quoteNumber) {
          quote = await prisma.quote.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, quoteNumber: args.quoteNumber as string },
            include: { items: true, client: true },
          })
        }

        if (!quote) return JSON.stringify({ error: "Devis non trouvé" })
        if (quote.invoiceId) return JSON.stringify({ error: "Devis déjà converti en facture" })

        const invoiceNumber = await generateNumber("invoice")
        const issueDate = new Date()
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)

        const invoice = await prisma.invoice.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            invoiceNumber,
            clientId: quote.clientId,
            status: "draft",
            issueDate,
            dueDate,
            subtotalHt: quote.subtotalHt,
            taxAmount: quote.taxAmount,
            totalTtc: quote.totalTtc,
            quoteId: quote.id,
            items: {
              create: quote.items.map(item => ({
                tenant_id: DEFAULT_TENANT_ID,
                description: item.description,
                quantity: item.quantity,
                unitPriceHt: item.unitPriceHt,
                vatRate: item.vatRate,
                taxAmount: Number(item.totalTtc) - Number(item.totalHt),
                totalHt: item.totalHt,
                totalTtc: item.totalTtc,
              })),
            },
          },
        })

        await prisma.quote.update({
          where: { id: quote.id },
          data: { invoiceId: invoice.id, status: "accepted" },
        })

        return JSON.stringify({
          success: true,
          invoice: {
            id: Number(invoice.id),
            number: invoice.invoiceNumber,
            total: Number(invoice.totalTtc),
          },
          fromQuote: quote.quoteNumber,
        })
      }

      // ===== INVOICES =====
      case "create_invoice": {
        const client = await prisma.client.findFirst({
          where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
        })
        if (!client) return JSON.stringify({ error: "Client non trouvé" })

        const items = args.items as Array<{ description: string; quantity: number; unitPrice: number; vatRate?: number }>
        const invoiceNumber = await generateNumber("invoice")
        const dueDays = (args.dueDays as number) || 30
        const issueDate = new Date()
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + dueDays)

        let subtotalHt = 0
        let taxAmount = 0
        const invoiceItems = items.map(item => {
          const vatRate = item.vatRate || 20
          const totalHt = item.quantity * item.unitPrice
          const itemTax = totalHt * (vatRate / 100)
          subtotalHt += totalHt
          taxAmount += itemTax
          return {
            tenant_id: DEFAULT_TENANT_ID,
            description: item.description,
            quantity: item.quantity,
            unitPriceHt: item.unitPrice,
            vatRate,
            taxAmount: itemTax,
            totalHt,
            totalTtc: totalHt + itemTax,
          }
        })

        const invoice = await prisma.invoice.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            invoiceNumber,
            clientId: client.id,
            status: "draft",
            issueDate,
            dueDate,
            subtotalHt,
            taxAmount,
            totalTtc: subtotalHt + taxAmount,
            notes: (args.notes as string) || null,
            items: { create: invoiceItems },
          },
        })

        return JSON.stringify({
          success: true,
          invoice: {
            id: Number(invoice.id),
            number: invoice.invoiceNumber,
            client: client.companyName,
            total: Number(invoice.totalTtc),
            dueDate,
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
            dueDate: i.dueDate,
          })),
        })
      }

      case "list_unpaid_invoices": {
        const now = new Date()
        const where: Record<string, unknown> = {
          tenant_id: DEFAULT_TENANT_ID,
          status: "sent",
        }
        if (args.overdueOnly) {
          where.dueDate = { lt: now }
        }

        const invoices = await prisma.invoice.findMany({
          where,
          take: (args.limit as number) || 20,
          orderBy: { dueDate: "asc" },
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          invoices: invoices.map(i => ({
            id: Number(i.id),
            number: i.invoiceNumber,
            client: i.client?.companyName,
            total: Number(i.totalTtc),
            dueDate: i.dueDate,
            isOverdue: i.dueDate < now,
            daysOverdue: i.dueDate < now ? Math.floor((now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
          })),
          totalUnpaid: invoices.reduce((sum, i) => sum + Number(i.totalTtc), 0),
        })
      }

      case "mark_invoice_paid": {
        let invoice
        if (args.invoiceId) {
          invoice = await prisma.invoice.findUnique({ where: { id: BigInt(args.invoiceId as number) } })
        } else if (args.invoiceNumber) {
          invoice = await prisma.invoice.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, invoiceNumber: args.invoiceNumber as string },
          })
        }

        if (!invoice) return JSON.stringify({ error: "Facture non trouvée" })

        const paymentDate = args.paymentDate ? new Date(args.paymentDate as string) : new Date()
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "paid",
            paymentDate,
            paymentMethod: (args.paymentMethod as string) || "virement",
          },
        })

        return JSON.stringify({
          success: true,
          invoice: { number: invoice.invoiceNumber, status: "paid", paymentDate },
        })
      }

      case "send_invoice": {
        let invoice
        if (args.invoiceId) {
          invoice = await prisma.invoice.update({
            where: { id: BigInt(args.invoiceId as number) },
            data: { status: "sent", sentAt: new Date() },
          })
        } else if (args.invoiceNumber) {
          const found = await prisma.invoice.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, invoiceNumber: args.invoiceNumber as string },
          })
          if (!found) return JSON.stringify({ error: "Facture non trouvée" })
          invoice = await prisma.invoice.update({
            where: { id: found.id },
            data: { status: "sent", sentAt: new Date() },
          })
        }
        return JSON.stringify({ success: true, invoice: invoice ? { number: invoice.invoiceNumber, status: "sent" } : null })
      }

      // ===== TREASURY =====
      case "get_treasury": {
        const accounts = await prisma.bankAccount.findMany({
          where: { tenant_id: DEFAULT_TENANT_ID, status: "active" },
          select: { id: true, bankName: true, accountName: true, currentBalance: true, availableBalance: true, lastSyncAt: true },
        })

        const transactionsLimit = (args.transactionsLimit as number) || 5
        const recentTransactions = await prisma.bankTransaction.findMany({
          where: { tenant_id: DEFAULT_TENANT_ID },
          take: transactionsLimit,
          orderBy: { transactionDate: "desc" },
          select: { id: true, label: true, amount: true, type: true, transactionDate: true, counterparty_name: true },
        })

        const totalBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0)

        return JSON.stringify({
          totalBalance,
          accounts: accounts.map(a => ({
            id: Number(a.id),
            bank: a.bankName,
            name: a.accountName,
            balance: Number(a.currentBalance),
            available: Number(a.availableBalance),
            lastSync: a.lastSyncAt,
          })),
          recentTransactions: recentTransactions.map(t => ({
            id: Number(t.id),
            label: t.label,
            amount: Number(t.amount),
            type: t.type,
            date: t.transactionDate,
            counterparty: t.counterparty_name,
          })),
        })
      }

      case "list_bank_transactions": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.type) where.type = args.type
        if (args.unreconciled) where.isReconciled = false

        const transactions = await prisma.bankTransaction.findMany({
          where,
          take: (args.limit as number) || 20,
          orderBy: { transactionDate: "desc" },
          select: { id: true, label: true, amount: true, type: true, transactionDate: true, counterparty_name: true, isReconciled: true, category: true },
        })

        return JSON.stringify({
          transactions: transactions.map(t => ({
            id: Number(t.id),
            label: t.label,
            amount: Number(t.amount),
            type: t.type,
            date: t.transactionDate,
            counterparty: t.counterparty_name,
            reconciled: t.isReconciled,
            category: t.category,
          })),
        })
      }

      // ===== SUBSCRIPTIONS =====
      case "list_subscriptions": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status
        else where.status = "active"
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) where.clientId = client.id
        }

        const subscriptions = await prisma.subscription.findMany({
          where,
          take: (args.limit as number) || 20,
          orderBy: { nextBillingDate: "asc" },
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          subscriptions: subscriptions.map(s => ({
            id: Number(s.id),
            number: s.subscriptionNumber,
            name: s.name,
            client: s.client?.companyName,
            amount: Number(s.amountTtc),
            cycle: s.billingCycle,
            nextBilling: s.nextBillingDate,
            status: s.status,
          })),
        })
      }

      case "get_upcoming_renewals": {
        const days = (args.days as number) || 30
        const now = new Date()
        const future = new Date()
        future.setDate(future.getDate() + days)

        const subscriptions = await prisma.subscription.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            status: "active",
            nextBillingDate: { gte: now, lte: future },
          },
          orderBy: { nextBillingDate: "asc" },
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          renewals: subscriptions.map(s => ({
            id: Number(s.id),
            name: s.name,
            client: s.client?.companyName,
            amount: Number(s.amountTtc),
            nextBilling: s.nextBillingDate,
            daysUntil: Math.ceil((s.nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          })),
          totalAmount: subscriptions.reduce((sum, s) => sum + Number(s.amountTtc), 0),
        })
      }

      // ===== DOMAINS =====
      case "list_domains": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) where.clientId = client.id
        }

        const domains = await prisma.domain.findMany({
          where,
          take: (args.limit as number) || 20,
          orderBy: { expirationDate: "asc" },
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          domains: domains.map(d => ({
            id: Number(d.id),
            domain: d.domain,
            client: d.client?.companyName,
            registrar: d.registrar,
            expires: d.expirationDate,
            autoRenew: d.autoRenew,
            status: d.status,
          })),
        })
      }

      case "list_expiring_domains": {
        const days = (args.days as number) || 30
        const now = new Date()
        const future = new Date()
        future.setDate(future.getDate() + days)

        const domains = await prisma.domain.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            status: "active",
            expirationDate: { gte: now, lte: future },
          },
          orderBy: { expirationDate: "asc" },
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          expiringDomains: domains.map(d => ({
            id: Number(d.id),
            domain: d.domain,
            client: d.client?.companyName,
            expires: d.expirationDate,
            daysUntil: Math.ceil((d.expirationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            autoRenew: d.autoRenew,
          })),
        })
      }

      // ===== TICKETS =====
      case "list_tickets": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status
        if (args.priority) where.priority = args.priority
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) where.clientId = client.id
        }

        const tickets = await prisma.ticket.findMany({
          where,
          take: (args.limit as number) || 20,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          include: { client: { select: { companyName: true } } },
        })

        return JSON.stringify({
          tickets: tickets.map(t => ({
            id: Number(t.id),
            number: t.ticketNumber,
            subject: t.subject,
            client: t.client?.companyName,
            status: t.status,
            priority: t.priority,
            created: t.createdAt,
          })),
        })
      }

      case "create_ticket": {
        let clientId: bigint | null = null
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) clientId = client.id
        }

        const lastTicket = await prisma.ticket.findFirst({
          where: { tenant_id: DEFAULT_TENANT_ID },
          orderBy: { id: "desc" },
        })
        const ticketNumber = `TKT-${String((lastTicket ? Number(lastTicket.id) : 0) + 1).padStart(5, "0")}`

        const ticket = await prisma.ticket.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            ticketNumber,
            subject: args.subject as string,
            clientId,
            senderEmail: "telegram@crm.local",
            senderName: "Bot Telegram",
            status: "new",
            priority: (args.priority as "low" | "normal" | "high" | "urgent") || "normal",
            messages: {
              create: {
                content: args.content as string,
                type: "note",
                from_email: "telegram@crm.local",
                from_name: "Bot Telegram",
              },
            },
          },
        })

        return JSON.stringify({
          success: true,
          ticket: { id: Number(ticket.id), number: ticket.ticketNumber, subject: ticket.subject },
        })
      }

      case "update_ticket_status": {
        let ticket
        if (args.ticketId) {
          ticket = await prisma.ticket.findUnique({ where: { id: BigInt(args.ticketId as number) } })
        } else if (args.ticketNumber) {
          ticket = await prisma.ticket.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, ticketNumber: args.ticketNumber as string },
          })
        }

        if (!ticket) return JSON.stringify({ error: "Ticket non trouvé" })

        const updateData: Record<string, unknown> = { status: args.status }
        if (args.status === "resolved") updateData.resolvedAt = new Date()
        if (args.status === "closed") updateData.closedAt = new Date()

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: updateData,
        })

        return JSON.stringify({ success: true, ticket: { number: ticket.ticketNumber, newStatus: args.status } })
      }

      // ===== CONTRACTS =====
      case "list_contracts": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (args.status) where.status = args.status
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) where.clientId = client.id
        }

        const contracts = await prisma.contract.findMany({
          where,
          take: (args.limit as number) || 20,
          orderBy: { createdAt: "desc" },
          include: { client: { select: { companyName: true } }, signers: { select: { name: true, status: true } } },
        })

        return JSON.stringify({
          contracts: contracts.map(c => ({
            id: Number(c.id),
            title: c.title,
            client: c.client?.companyName,
            status: c.status,
            signers: c.signers.map(s => ({ name: s.name, status: s.status })),
            sentAt: c.sentAt,
            completedAt: c.completedAt,
          })),
        })
      }

      // ===== PROJECTS =====
      case "list_projects": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID }
        if (!args.includeArchived) where.isArchived = false
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) where.clientId = client.id
        }

        const projects = await prisma.project.findMany({
          where,
          include: {
            client: { select: { companyName: true } },
            columns: { include: { cards: { where: { isCompleted: false } } } },
          },
        })

        return JSON.stringify({
          projects: projects.map(p => ({
            id: Number(p.id),
            name: p.name,
            description: p.description,
            client: p.client?.companyName,
            color: p.color,
            columns: p.columns.length,
            pendingCards: p.columns.reduce((sum, col) => sum + col.cards.length, 0),
            isArchived: p.isArchived,
          })),
        })
      }

      case "list_project_cards": {
        let project
        if (args.projectId) {
          project = await prisma.project.findUnique({ where: { id: BigInt(args.projectId as number) } })
        } else if (args.projectName) {
          project = await prisma.project.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, name: { contains: args.projectName as string } },
          })
        }

        if (!project) return JSON.stringify({ error: "Projet non trouvé" })

        const where: Record<string, unknown> = {}
        if (args.columnName) {
          const column = await prisma.projectColumn.findFirst({
            where: { projectId: project.id, name: { contains: args.columnName as string } },
          })
          if (column) where.columnId = column.id
        }

        const cards = await prisma.projectCard.findMany({
          where: { column: { projectId: project.id }, ...where, isCompleted: false },
          include: {
            column: { select: { name: true } },
            client: { select: { companyName: true } },
            assignee: { select: { name: true } },
            subtasks: { select: { id: true, isCompleted: true } },
          },
          orderBy: [{ priority: "desc" }, { position: "asc" }],
        })

        return JSON.stringify({
          project: project.name,
          cards: cards.map(c => ({
            id: Number(c.id),
            title: c.title,
            column: c.column?.name,
            priority: c.priority,
            client: c.client?.companyName,
            assignee: c.assignee?.name,
            dueDate: c.dueDate,
            subtasks: { total: c.subtasks.length, completed: c.subtasks.filter(s => s.isCompleted).length },
          })),
        })
      }

      case "create_project_card": {
        const project = await prisma.project.findFirst({
          where: { tenant_id: DEFAULT_TENANT_ID, name: { contains: args.projectName as string } },
          include: { columns: { orderBy: { position: "asc" } } },
        })

        if (!project) return JSON.stringify({ error: "Projet non trouvé" })
        if (project.columns.length === 0) return JSON.stringify({ error: "Projet sans colonnes" })

        let column = project.columns[0]
        if (args.columnName) {
          const found = project.columns.find(c => c.name.toLowerCase().includes((args.columnName as string).toLowerCase()))
          if (found) column = found
        }

        let clientId: bigint | null = null
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) clientId = client.id
        }

        const lastCard = await prisma.projectCard.findFirst({
          where: { columnId: column.id },
          orderBy: { position: "desc" },
        })

        const card = await prisma.projectCard.create({
          data: {
            columnId: column.id,
            title: args.title as string,
            description: (args.description as string) || null,
            priority: (args.priority as "low" | "medium" | "high" | "urgent") || "medium",
            dueDate: args.dueDate ? new Date(args.dueDate as string) : null,
            clientId,
            position: (lastCard?.position || 0) + 1,
          },
        })

        return JSON.stringify({
          success: true,
          card: {
            id: Number(card.id),
            title: card.title,
            column: column.name,
            project: project.name,
          },
        })
      }

      // ===== STATS =====
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

        const [clientsCount, invoicesAgg, paidInvoicesAgg, quotesAgg, ticketsOpen] = await Promise.all([
          prisma.client.count({ where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } } }),
          prisma.invoice.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
            _count: true,
            _sum: { totalTtc: true },
          }),
          prisma.invoice.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, status: "paid", paymentDate: { gte: startDate } },
            _count: true,
            _sum: { totalTtc: true },
          }),
          prisma.quote.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: startDate } },
            _count: true,
            _sum: { totalTtc: true },
          }),
          prisma.ticket.count({ where: { tenant_id: DEFAULT_TENANT_ID, status: { in: ["new", "open", "pending"] } } }),
        ])

        return JSON.stringify({
          period,
          stats: {
            newClients: clientsCount,
            invoices: { count: invoicesAgg._count, total: Number(invoicesAgg._sum?.totalTtc || 0) },
            paidInvoices: { count: paidInvoicesAgg._count, revenue: Number(paidInvoicesAgg._sum?.totalTtc || 0) },
            quotes: { count: quotesAgg._count, total: Number(quotesAgg._sum?.totalTtc || 0) },
            openTickets: ticketsOpen,
          },
        })
      }

      case "get_dashboard": {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)

        const [
          bankAccounts,
          overdueInvoices,
          pendingTasks,
          openTickets,
          expiringDomains,
          upcomingRenewals,
          monthRevenue,
          pendingQuotes,
        ] = await Promise.all([
          prisma.bankAccount.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, status: "active" },
            _sum: { currentBalance: true },
          }),
          prisma.invoice.findMany({
            where: { tenant_id: DEFAULT_TENANT_ID, status: "sent", dueDate: { lt: now } },
            select: { invoiceNumber: true, totalTtc: true, dueDate: true },
            take: 5,
          }),
          prisma.note.count({
            where: { tenant_id: DEFAULT_TENANT_ID, type: "todo", isArchived: false, reminderAt: { lt: now } },
          }),
          prisma.ticket.count({
            where: { tenant_id: DEFAULT_TENANT_ID, status: { in: ["new", "open"] } },
          }),
          prisma.domain.count({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              status: "active",
              expirationDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
            },
          }),
          prisma.subscription.count({
            where: {
              tenant_id: DEFAULT_TENANT_ID,
              status: "active",
              nextBillingDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
            },
          }),
          prisma.invoice.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, status: "paid", paymentDate: { gte: monthStart } },
            _sum: { totalTtc: true },
          }),
          prisma.quote.count({
            where: { tenant_id: DEFAULT_TENANT_ID, status: "sent" },
          }),
        ])

        return JSON.stringify({
          treasury: Number(bankAccounts._sum?.currentBalance || 0),
          monthRevenue: Number(monthRevenue._sum?.totalTtc || 0),
          alerts: {
            overdueInvoices: overdueInvoices.length,
            overdueTasks: pendingTasks,
            openTickets,
            expiringDomains,
            upcomingRenewals,
            pendingQuotes,
          },
          overdueInvoicesList: overdueInvoices.map(i => ({
            number: i.invoiceNumber,
            amount: Number(i.totalTtc),
            dueDate: i.dueDate,
          })),
        })
      }

      // ===== REMINDERS =====
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

      // ===== SERVICES =====
      case "list_services": {
        const where: Record<string, unknown> = { tenant_id: DEFAULT_TENANT_ID, isActive: true }

        const services = await prisma.service.findMany({
          where,
          take: (args.limit as number) || 20,
          orderBy: { name: "asc" },
          include: { category: { select: { name: true } } },
        })

        return JSON.stringify({
          services: services.map(s => ({
            id: Number(s.id),
            code: s.code,
            name: s.name,
            category: s.category?.name,
            priceHt: Number(s.unitPriceHt),
            vatRate: Number(s.vatRate),
            unit: s.unit,
            isRecurring: s.isRecurring,
          })),
        })
      }

      case "search_services": {
        const query = args.query as string
        const services = await prisma.service.findMany({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            isActive: true,
            OR: [
              { name: { contains: query } },
              { code: { contains: query } },
              { description: { contains: query } },
            ],
          },
          take: 10,
          include: { category: { select: { name: true } } },
        })

        return JSON.stringify({
          services: services.map(s => ({
            id: Number(s.id),
            code: s.code,
            name: s.name,
            priceHt: Number(s.unitPriceHt),
            unit: s.unit,
          })),
        })
      }

      // ===== ADVANCED ANALYTICS =====
      case "get_client_summary": {
        let client
        if (args.clientId) {
          client = await prisma.client.findUnique({
            where: { id: BigInt(args.clientId as number) },
          })
        } else if (args.clientName) {
          client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
        }

        if (!client) return JSON.stringify({ error: "Client non trouvé" })

        // Get comprehensive data
        const [
          invoices,
          quotes,
          subscriptions,
          tickets,
          notes,
          totalPaid,
          totalPending,
        ] = await Promise.all([
          prisma.invoice.findMany({
            where: { clientId: client.id },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, invoiceNumber: true, totalTtc: true, status: true, issueDate: true },
          }),
          prisma.quote.findMany({
            where: { clientId: client.id, status: { in: ["draft", "sent"] } },
            select: { id: true, quoteNumber: true, totalTtc: true, status: true },
          }),
          prisma.subscription.findMany({
            where: { clientId: client.id, status: "active" },
            select: { id: true, name: true, amountTtc: true, billingCycle: true, nextBillingDate: true },
          }),
          prisma.ticket.findMany({
            where: { clientId: client.id, status: { in: ["new", "open", "pending"] } },
            select: { id: true, ticketNumber: true, subject: true, priority: true },
          }),
          prisma.note.findMany({
            where: {
              entityLinks: { some: { entityType: "client", entityId: client.id } },
            },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { content: true, createdAt: true },
          }),
          prisma.invoice.aggregate({
            where: { clientId: client.id, status: "paid" },
            _sum: { totalTtc: true },
            _count: true,
          }),
          prisma.invoice.aggregate({
            where: { clientId: client.id, status: { in: ["sent", "overdue"] } },
            _sum: { totalTtc: true },
          }),
        ])

        // Calculate health score (0-100)
        let healthScore = 50
        const paidAmount = Number(totalPaid._sum.totalTtc || 0)
        const pendingAmount = Number(totalPending._sum.totalTtc || 0)

        if (paidAmount > 10000) healthScore += 20
        else if (paidAmount > 5000) healthScore += 10
        else if (paidAmount > 1000) healthScore += 5

        if (subscriptions.length > 0) healthScore += 15
        if (pendingAmount > 0) healthScore -= 10
        if (tickets.filter(t => t.priority === "urgent").length > 0) healthScore -= 10
        if (client.status === "active") healthScore += 10

        healthScore = Math.max(0, Math.min(100, healthScore))

        return JSON.stringify({
          client: {
            id: Number(client.id),
            name: client.companyName,
            status: client.status,
            healthScore,
            healthLabel: healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Bon" : healthScore >= 40 ? "Moyen" : "À surveiller",
          },
          financials: {
            totalPaid: paidAmount,
            invoicesPaid: totalPaid._count,
            pending: pendingAmount,
            mrr: subscriptions.reduce((sum, s) => sum + Number(s.amountTtc) / (s.billingCycle === "yearly" ? 12 : 1), 0),
          },
          recentInvoices: invoices.map(i => ({ ...i, id: Number(i.id), total: Number(i.totalTtc) })),
          pendingQuotes: quotes.map(q => ({ ...q, id: Number(q.id), total: Number(q.totalTtc) })),
          activeSubscriptions: subscriptions.map(s => ({ ...s, id: Number(s.id), amount: Number(s.amountTtc) })),
          openTickets: tickets.map(t => ({ ...t, id: Number(t.id) })),
          recentNotes: notes.map(n => ({ content: n.content.substring(0, 100), date: n.createdAt })),
        })
      }

      case "compare_periods": {
        const now = new Date()
        let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date
        let periodLabel: string

        switch (args.comparison) {
          case "month":
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
            currentEnd = now
            previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            previousEnd = new Date(now.getFullYear(), now.getMonth(), 0)
            periodLabel = "mois"
            break
          case "quarter":
            const currentQuarter = Math.floor(now.getMonth() / 3)
            currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
            currentEnd = now
            previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1)
            previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0)
            periodLabel = "trimestre"
            break
          case "year":
          default:
            currentStart = new Date(now.getFullYear(), 0, 1)
            currentEnd = now
            previousStart = new Date(now.getFullYear() - 1, 0, 1)
            previousEnd = new Date(now.getFullYear() - 1, 11, 31)
            periodLabel = "année"
        }

        const [currentPaid, previousPaid, currentInvoices, previousInvoices, currentClients, previousClients] = await Promise.all([
          prisma.invoice.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, status: "paid", paymentDate: { gte: currentStart, lte: currentEnd } },
            _sum: { totalTtc: true },
            _count: true,
          }),
          prisma.invoice.aggregate({
            where: { tenant_id: DEFAULT_TENANT_ID, status: "paid", paymentDate: { gte: previousStart, lte: previousEnd } },
            _sum: { totalTtc: true },
            _count: true,
          }),
          prisma.invoice.count({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: currentStart, lte: currentEnd } },
          }),
          prisma.invoice.count({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: previousStart, lte: previousEnd } },
          }),
          prisma.client.count({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: currentStart, lte: currentEnd } },
          }),
          prisma.client.count({
            where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: previousStart, lte: previousEnd } },
          }),
        ])

        const currentRevenue = Number(currentPaid._sum.totalTtc || 0)
        const previousRevenue = Number(previousPaid._sum.totalTtc || 0)
        const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100) : 0

        return JSON.stringify({
          period: periodLabel,
          current: {
            revenue: currentRevenue,
            invoicesPaid: currentPaid._count,
            invoicesCreated: currentInvoices,
            newClients: currentClients,
          },
          previous: {
            revenue: previousRevenue,
            invoicesPaid: previousPaid._count,
            invoicesCreated: previousInvoices,
            newClients: previousClients,
          },
          changes: {
            revenue: revenueChange.toFixed(1) + "%",
            trend: revenueChange > 0 ? "up" : revenueChange < 0 ? "down" : "stable",
          },
        })
      }

      case "get_revenue_prediction": {
        const months = (args.months as number) || 3
        const now = new Date()

        // Get MRR from active subscriptions
        const activeSubscriptions = await prisma.subscription.findMany({
          where: { tenant_id: DEFAULT_TENANT_ID, status: "active" },
          select: { amountTtc: true, billingCycle: true, nextBillingDate: true },
        })

        const mrr = activeSubscriptions.reduce((sum, s) => {
          const monthly = Number(s.amountTtc) / (s.billingCycle === "yearly" ? 12 : s.billingCycle === "quarterly" ? 3 : 1)
          return sum + monthly
        }, 0)

        // Get average one-time revenue from last 6 months
        const sixMonthsAgo = new Date(now)
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const oneTimeRevenue = await prisma.invoice.aggregate({
          where: {
            tenant_id: DEFAULT_TENANT_ID,
            status: "paid",
            paymentDate: { gte: sixMonthsAgo },
          },
          _sum: { totalTtc: true },
          _count: true,
        })

        const avgMonthlyOneTime = Number(oneTimeRevenue._sum.totalTtc || 0) / 6

        // Build predictions
        const predictions = []
        for (let i = 1; i <= months; i++) {
          const predictionDate = new Date(now)
          predictionDate.setMonth(predictionDate.getMonth() + i)
          predictions.push({
            month: predictionDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
            recurring: mrr,
            oneTimeEstimate: avgMonthlyOneTime,
            total: mrr + avgMonthlyOneTime,
            confidence: i === 1 ? "high" : i === 2 ? "medium" : "low",
          })
        }

        return JSON.stringify({
          currentMRR: mrr,
          avgOneTimeMonthly: avgMonthlyOneTime,
          activeSubscriptions: activeSubscriptions.length,
          predictions,
          totalPredicted: predictions.reduce((sum, p) => sum + p.total, 0),
        })
      }

      case "get_top_clients": {
        const limit = (args.limit as number) || 10
        const period = args.period as string || "year"
        const now = new Date()

        let startDate: Date
        switch (period) {
          case "quarter":
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
            break
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1)
            break
          default:
            startDate = new Date(0) // all time
        }

        // Get clients with their total revenue
        const clients = await prisma.client.findMany({
          where: { tenant_id: DEFAULT_TENANT_ID },
          include: {
            invoices: {
              where: { status: "paid", ...(period !== "all" ? { paymentDate: { gte: startDate } } : {}) },
              select: { totalTtc: true },
            },
            subscriptions: {
              where: { status: "active" },
              select: { amountTtc: true, billingCycle: true },
            },
            tickets: {
              where: { status: { in: ["new", "open", "pending"] } },
              select: { id: true },
            },
          },
        })

        const clientsWithScore = clients.map(c => {
          const totalRevenue = c.invoices.reduce((sum: number, i: { totalTtc: unknown }) => sum + Number(i.totalTtc), 0)
          const mrr = c.subscriptions.reduce((sum: number, s: { amountTtc: unknown; billingCycle: string | null }) => sum + Number(s.amountTtc) / (s.billingCycle === "yearly" ? 12 : 1), 0)

          let score = 50
          if (totalRevenue > 10000) score += 25
          else if (totalRevenue > 5000) score += 15
          else if (totalRevenue > 1000) score += 5
          if (mrr > 0) score += 20
          if (c.tickets.length > 0) score -= 5
          if (c.status === "active") score += 5

          return {
            id: Number(c.id),
            name: c.companyName,
            status: c.status,
            totalRevenue,
            mrr,
            score: Math.min(100, Math.max(0, score)),
            openTickets: c.tickets.length,
          }
        })

        const topClients = clientsWithScore
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, limit)

        return JSON.stringify({
          period: period === "all" ? "tout le temps" : period === "year" ? "cette année" : "ce trimestre",
          topClients,
          totalRevenue: topClients.reduce((sum, c) => sum + c.totalRevenue, 0),
        })
      }

      case "get_achievements": {
        // This would normally use TelegramUserStats, but for now return mock data
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [monthStats, totalStats] = await Promise.all([
          Promise.all([
            prisma.client.count({ where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: thisMonth } } }),
            prisma.invoice.count({ where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: thisMonth } } }),
            prisma.quote.count({ where: { tenant_id: DEFAULT_TENANT_ID, createdAt: { gte: thisMonth } } }),
            prisma.projectCard.count({ where: { column: { project: { tenant_id: DEFAULT_TENANT_ID } }, isCompleted: true, completedAt: { gte: thisMonth } } }),
          ]),
          Promise.all([
            prisma.client.count({ where: { tenant_id: DEFAULT_TENANT_ID } }),
            prisma.invoice.count({ where: { tenant_id: DEFAULT_TENANT_ID } }),
          ]),
        ])

        const [clientsThisMonth, invoicesThisMonth, quotesThisMonth, tasksCompleted] = monthStats
        const [totalClients, totalInvoices] = totalStats

        // Generate badges based on achievements
        const badges = []
        if (clientsThisMonth >= 5) badges.push({ name: "Chasseur", description: "5+ clients créés ce mois", icon: "🎯" })
        if (invoicesThisMonth >= 10) badges.push({ name: "Machine à facturer", description: "10+ factures ce mois", icon: "💰" })
        if (tasksCompleted >= 20) badges.push({ name: "Productif", description: "20+ tâches terminées", icon: "⚡" })
        if (totalClients >= 100) badges.push({ name: "Empire", description: "100+ clients au total", icon: "👑" })
        if (totalInvoices >= 500) badges.push({ name: "Vétéran", description: "500+ factures au total", icon: "🏆" })

        return JSON.stringify({
          thisMonth: {
            clientsCreated: clientsThisMonth,
            invoicesCreated: invoicesThisMonth,
            quotesCreated: quotesThisMonth,
            tasksCompleted,
          },
          totals: {
            clients: totalClients,
            invoices: totalInvoices,
          },
          badges,
          streakDays: Math.floor(Math.random() * 30) + 1, // TODO: implement real streak tracking
          nextMilestone: {
            name: totalClients < 100 ? "100 clients" : "250 clients",
            current: totalClients,
            target: totalClients < 100 ? 100 : 250,
          },
        })
      }

      case "set_recurring_reminder": {
        const title = args.title as string
        const frequency = args.frequency as string
        const time = (args.time as string) || "09:00"
        const [hours, minutes] = time.split(":").map(Number)

        // Calculate next run
        const nextRun = new Date()
        nextRun.setHours(hours, minutes, 0, 0)

        if (nextRun <= new Date()) {
          // Next occurrence is tomorrow or later
          switch (frequency) {
            case "daily":
              nextRun.setDate(nextRun.getDate() + 1)
              break
            case "weekly":
              const dayOfWeek = (args.dayOfWeek as number) || 1
              const daysUntil = (dayOfWeek - nextRun.getDay() + 7) % 7 || 7
              nextRun.setDate(nextRun.getDate() + daysUntil)
              break
            case "monthly":
              const dayOfMonth = (args.dayOfMonth as number) || 1
              nextRun.setMonth(nextRun.getMonth() + 1)
              nextRun.setDate(dayOfMonth)
              break
          }
        }

        const reminder = await prisma.recurringReminder.create({
          data: {
            tenant_id: DEFAULT_TENANT_ID,
            chatId: BigInt(0), // Will be set by the webhook handler
            title,
            frequency,
            nextRun,
            isActive: true,
          },
        })

        return JSON.stringify({
          success: true,
          reminder: {
            id: Number(reminder.id),
            title: reminder.title,
            frequency: reminder.frequency,
            nextRun: reminder.nextRun,
          },
          message: `Rappel "${title}" créé ! Prochaine notification: ${nextRun.toLocaleDateString("fr-FR")} à ${time}`,
        })
      }

      // ===== PDF EXPORT =====
      case "get_document_pdf": {
        const docType = args.type as "invoice" | "quote"
        const docNumber = args.number as string | undefined
        const docId = args.id as number | undefined

        // Get base URL from tenant settings or env
        const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.luelis.fr"
        if (tenant?.settings) {
          try {
            const settings = JSON.parse(tenant.settings)
            if (settings.appUrl) baseUrl = settings.appUrl
          } catch { /* ignore */ }
        }

        let document: { id: bigint; number: string; clientName: string; totalTtc: unknown; status: string } | null = null

        if (docType === "invoice") {
          const invoice = docId
            ? await prisma.invoice.findUnique({
                where: { id: BigInt(docId) },
                include: { client: { select: { companyName: true } } },
              })
            : docNumber
              ? await prisma.invoice.findFirst({
                  where: { tenant_id: DEFAULT_TENANT_ID, invoiceNumber: docNumber },
                  include: { client: { select: { companyName: true } } },
                })
              : null

          if (invoice) {
            document = {
              id: invoice.id,
              number: invoice.invoiceNumber || "",
              clientName: invoice.client.companyName,
              totalTtc: invoice.totalTtc,
              status: String(invoice.status),
            }
          }
        } else {
          const quote = docId
            ? await prisma.quote.findUnique({
                where: { id: BigInt(docId) },
                include: { client: { select: { companyName: true } } },
              })
            : docNumber
              ? await prisma.quote.findFirst({
                  where: { tenant_id: DEFAULT_TENANT_ID, quoteNumber: docNumber },
                  include: { client: { select: { companyName: true } } },
                })
              : null

          if (quote) {
            document = {
              id: quote.id,
              number: quote.quoteNumber || "",
              clientName: quote.client.companyName,
              totalTtc: quote.totalTtc,
              status: String(quote.status),
            }
          }
        }

        if (!document) {
          return JSON.stringify({ error: `${docType === "invoice" ? "Facture" : "Devis"} non trouvé(e)` })
        }

        const pdfPath = docType === "invoice" ? "invoices" : "quotes"
        const pdfUrl = `${baseUrl}/api/${pdfPath}/${document.id}/pdf`
        const viewUrl = `${baseUrl}/${pdfPath}/${document.id}`

        return JSON.stringify({
          success: true,
          document: {
            type: docType === "invoice" ? "Facture" : "Devis",
            number: document.number,
            client: document.clientName,
            totalTtc: formatCurrency(Number(document.totalTtc)),
            status: document.status,
          },
          links: {
            pdf: pdfUrl,
            view: viewUrl,
          },
          message: `Voici les liens pour ${docType === "invoice" ? "la facture" : "le devis"} ${document.number}:
📄 PDF: ${pdfUrl}
👁️ Voir: ${viewUrl}

Ouvre le lien PDF et utilise "Imprimer > Enregistrer en PDF" pour télécharger.`,
        })
      }

      // ===== CALENDAR =====
      case "create_calendar_event": {
        if (!chatId) {
          return JSON.stringify({ error: "Contexte utilisateur manquant" })
        }

        const tokenResult = await getO365TokenForTelegramUser(chatId)
        if (!tokenResult) {
          return JSON.stringify({
            error: "Calendrier non connecté. Connecte ton calendrier O365 dans les paramètres du CRM (Settings > Mon Calendrier).",
          })
        }

        // Parse dates
        const startDate = parseDateTime(args.startDate as string)
        let endDate: Date

        if (args.endDate) {
          endDate = parseDateTime(args.endDate as string)
        } else {
          // Default: 1 hour duration
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
        }

        // Build event payload for Microsoft Graph
        const eventPayload: Record<string, unknown> = {
          subject: args.subject as string,
          start: {
            dateTime: startDate.toISOString(),
            timeZone: "Europe/Paris",
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: "Europe/Paris",
          },
        }

        if (args.location) {
          eventPayload.location = { displayName: args.location as string }
        }

        if (args.description) {
          eventPayload.body = {
            contentType: "text",
            content: args.description as string,
          }
        }

        if (args.attendees && Array.isArray(args.attendees)) {
          eventPayload.attendees = (args.attendees as string[]).map((email) => ({
            emailAddress: { address: email },
            type: "required",
          }))
        }

        // Create event via Microsoft Graph API
        const createResponse = await fetch("https://graph.microsoft.com/v1.0/me/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResult.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPayload),
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          console.error("[Calendar] Create event error:", errorData)
          return JSON.stringify({ error: "Erreur lors de la création du RDV: " + (errorData.error?.message || "Erreur inconnue") })
        }

        const createdEvent = await createResponse.json()

        // Format response
        const formattedStart = new Intl.DateTimeFormat("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }).format(startDate)

        // If client name provided, create a note linking the event
        if (args.clientName) {
          const client = await prisma.client.findFirst({
            where: { tenant_id: DEFAULT_TENANT_ID, companyName: { contains: args.clientName as string } },
          })
          if (client) {
            const note = await prisma.note.create({
              data: {
                tenant_id: DEFAULT_TENANT_ID,
                createdBy: DEFAULT_USER_ID,
                content: `RDV Outlook: ${args.subject} - ${formattedStart}`,
                type: "note",
              },
            })
            await prisma.noteEntityLink.create({
              data: { noteId: note.id, entityType: "client", entityId: client.id },
            })
          }
        }

        return JSON.stringify({
          success: true,
          event: {
            id: createdEvent.id,
            subject: createdEvent.subject,
            start: formattedStart,
            location: args.location || null,
            webLink: createdEvent.webLink,
          },
          message: `RDV créé: ${args.subject} le ${formattedStart}`,
        })
      }

      case "get_calendar_events": {
        if (!chatId) {
          return JSON.stringify({ error: "Contexte utilisateur manquant" })
        }

        const tokenResult = await getO365TokenForTelegramUser(chatId)
        if (!tokenResult) {
          return JSON.stringify({
            error: "Calendrier non connecté. Connecte ton calendrier O365 dans les paramètres du CRM.",
          })
        }

        const days = (args.days as number) || 7
        const now = new Date()
        const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

        const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${endDate.toISOString()}&$orderby=start/dateTime&$top=20&$select=subject,start,end,location,isAllDay,onlineMeeting`

        const response = await fetch(calendarUrl, {
          headers: {
            Authorization: `Bearer ${tokenResult.accessToken}`,
            Prefer: 'outlook.timezone="Europe/Paris"',
          },
        })

        if (!response.ok) {
          return JSON.stringify({ error: "Erreur lors de la récupération des événements" })
        }

        const data = await response.json()
        const events = (data.value || []).map((event: {
          subject: string
          start: { dateTime: string }
          end: { dateTime: string }
          location?: { displayName?: string }
          isAllDay: boolean
          onlineMeeting?: { joinUrl?: string }
        }) => {
          const startTime = event.start.dateTime.substring(0, 16).replace("T", " ")
          const endTime = event.end.dateTime.substring(11, 16)

          return {
            subject: event.subject,
            start: startTime,
            end: endTime,
            location: event.location?.displayName || null,
            isAllDay: event.isAllDay,
            hasOnlineMeeting: !!event.onlineMeeting?.joinUrl,
          }
        })

        return JSON.stringify({
          events,
          count: events.length,
          period: `${days} jours`,
        })
      }

      default:
        return JSON.stringify({ error: "Fonction inconnue" })
    }
  } catch (error) {
    console.error(`Tool ${name} error:`, error)
    return JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" })
  }
}

// System prompt for the AI
const SYSTEM_PROMPT = `Tu es l'assistant CRM intelligent ultra-avancé. Tu gères clients, factures, devis, tâches, tickets, domaines, abonnements, contrats et projets via Telegram.

PERSONNALITÉ:
- Amical et professionnel, tutoiement
- Concis mais informatif
- Proactif (suggère des actions utiles après chaque opération)
- Emojis avec modération
- Tu te souviens des conversations précédentes

CAPACITÉS COMPLÈTES:

📋 CLIENTS: créer, rechercher, lister, détails complets, changer statut, résumé client avec scoring santé
📝 NOTES & TÂCHES: créer notes/tâches, lister, terminer, rappels, rappels récurrents
💰 DEVIS: créer, lister, rechercher, envoyer, convertir en facture, export PDF
🧾 FACTURES: créer, lister, impayées, marquer payée, envoyer, export PDF
🏦 TRÉSORERIE: soldes comptes, transactions récentes
📅 ABONNEMENTS: lister, renouvellements à venir
📆 CALENDRIER O365: créer RDV ("rdv avec X demain 14h"), voir agenda des 7 prochains jours
🌐 DOMAINES: lister, domaines qui expirent
🎫 TICKETS: lister, créer, changer statut
📑 CONTRATS: lister les contrats et leurs signataires
📊 PROJETS KANBAN: lister projets, cartes, créer des cartes
📈 STATS: stats périodiques, dashboard, comparaisons entre périodes
🛠️ SERVICES: lister et rechercher les services/produits

🎯 ANALYTICS AVANCÉES:
- Résumé client complet avec scoring santé (0-100)
- Comparaisons temporelles (mois vs mois, trimestre vs trimestre, année vs année)
- Prédictions de chiffre d'affaires (basées sur MRR et historique)
- Top clients par CA avec classement

🏆 GAMIFICATION:
- Suivi des achievements et badges
- Streaks de productivité
- Statistiques d'utilisation

🔔 RAPPELS:
- Créer des rappels récurrents (quotidien, hebdomadaire, mensuel)
- Rappels one-shot avec date

🎤 MULTIMÉDIA (automatique):
- Messages vocaux : transcription automatique et traitement
- Photos de cartes de visite : OCR et création automatique du client
- Export PDF de devis/factures sur demande

RÈGLES CRITIQUES:
1. NOMS DE SOCIÉTÉ: Un nom de société est TOUJOURS une seule entité, même s'il contient "et", "&", "and", des virgules, etc.
   - "Per et Mer" = UNE société appelée "Per et Mer"
   - "Martin & Associés" = UNE société appelée "Martin & Associés"
   - "Dupont, fils et associés" = UNE société
   - NE JAMAIS diviser un nom de société en plusieurs entités !

2. RECHERCHE AVANT ACTION: Quand un utilisateur mentionne un client :
   - D'abord utilise search_clients pour vérifier si le client existe
   - Si plusieurs résultats similaires, demande clarification
   - Si aucun résultat, propose de créer le client

3. ACTIONS MULTIPLES: Une demande = UNE action sur UN client/entité, sauf si explicitement demandé autrement
   - "Note pour Per et Mer" = 1 note pour le client "Per et Mer"
   - "Factures pour Dupont et Martin" = 2 factures SEULEMENT si c'est clairement 2 clients distincts

4. SUGGESTIONS PROACTIVES: Après chaque action, suggère des actions complémentaires pertinentes
   - Après création client → "Tu veux créer un devis ?"
   - Après facture payée → "Tu veux voir le résumé mensuel ?"
   - Après création devis → "Tu veux l'envoyer au client ?"

5. Utilise TOUJOURS les outils pour les actions CRM
6. Formate lisiblement (listes, montants €)
7. Dates relatives → YYYY-MM-DD (aujourd'hui = ${new Date().toISOString().split("T")[0]})
8. Montants en euros

EXEMPLES:
- "Note pour Per et Mer: rappeler demain" → search_clients("Per et Mer") puis create_note avec ce client
- "Crée un devis pour Dupont: 10h développement à 80€"
- "Factures impayées"
- "Stats du mois"
- "Trésorerie"
- "Domaines qui expirent bientôt"
- "Tickets ouverts"
- "Dashboard"
- "Abonnements à renouveler"
- "Résumé client Dupont" → get_client_summary
- "Compare janvier et février 2025" → compare_periods
- "Prédiction CA 3 prochains mois" → get_revenue_prediction
- "Top 5 clients" → get_top_clients
- "Mes achievements" → get_achievements
- "Rappel tous les lundis: relancer prospects" → set_recurring_reminder
- "Envoie-moi le PDF de la facture FAC-2025-001" → export PDF
`

// Main AI processing
async function processWithAI(
  openai: OpenAI,
  model: string,
  chatId: number,
  userMessage: string,
  botToken?: string // Optional: pass to enable typing indicators during processing
): Promise<string> {
  // Load persisted conversation history
  const history = await loadConversation(chatId)

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userMessage },
  ]

  // Set up continuous typing indicator (refreshes every 4 seconds)
  let typingInterval: ReturnType<typeof setInterval> | null = null
  if (botToken) {
    // Initial typing
    try { await sendTyping(botToken, chatId) } catch { /* ignore */ }
    // Continuous refresh every 4 seconds (typing expires after 5s)
    typingInterval = setInterval(async () => {
      try { await sendTyping(botToken, chatId) } catch { /* ignore */ }
    }, 4000)
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1500,
    })

    const assistantMessage = response.choices[0].message

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") continue
        const args = JSON.parse(toolCall.function.arguments)
        const result = await executeToolCall(toolCall.function.name, args, chatId)
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      const finalResponse = await openai.chat.completions.create({
        model,
        messages: [
          ...messages,
          assistantMessage,
          ...toolResults,
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })

      const finalContent = finalResponse.choices[0].message.content || "Action effectuée ✓"

      // Save to persistent storage
      history.push({ role: "user", content: userMessage, timestamp: new Date() })
      history.push({ role: "assistant", content: finalContent, timestamp: new Date() })
      if (history.length > MAX_HISTORY * 2) history.splice(0, 2)
      await saveConversation(chatId, history)

      return finalContent
    }

    const content = assistantMessage.content || "Je ne suis pas sûr de comprendre. Peux-tu reformuler ?"

    // Save to persistent storage
    history.push({ role: "user", content: userMessage, timestamp: new Date() })
    history.push({ role: "assistant", content: content, timestamp: new Date() })
    if (history.length > MAX_HISTORY * 2) history.splice(0, 2)
    await saveConversation(chatId, history)

    return content
  } catch (error) {
    console.error("OpenAI error:", error)
    throw error
  } finally {
    // Always clear the typing interval
    if (typingInterval) clearInterval(typingInterval)
  }
}

// Voice message transcription with Whisper
async function transcribeVoice(openai: OpenAI, botToken: string, fileId: string): Promise<string> {
  try {
    // Get file path from Telegram
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
    const fileData = await fileRes.json()

    if (!fileData.ok || !fileData.result?.file_path) {
      throw new Error("Could not get file path")
    }

    // Download the voice file
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
    const audioRes = await fetch(downloadUrl)
    const audioBuffer = await audioRes.arrayBuffer()

    // Convert to File object for OpenAI
    const audioFile = new File([audioBuffer], "voice.ogg", { type: "audio/ogg" })

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "fr",
    })

    return transcription.text
  } catch (error) {
    console.error("Transcription error:", error)
    throw error
  }
}

// Process image with Vision API (business card OCR)
async function processImageWithVision(openai: OpenAI, botToken: string, fileId: string, prompt: string): Promise<string> {
  try {
    // Get file path from Telegram
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`)
    const fileData = await fileRes.json()

    if (!fileData.ok || !fileData.result?.file_path) {
      throw new Error("Could not get file path")
    }

    // Get the image URL
    const imageUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`

    // Download and convert to base64
    const imageRes = await fetch(imageUrl)
    const imageBuffer = await imageRes.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const mimeType = fileData.result.file_path.endsWith(".png") ? "image/png" : "image/jpeg"

    // Process with Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    })

    return response.choices[0].message.content || ""
  } catch (error) {
    console.error("Vision API error:", error)
    throw error
  }
}

// Send document to Telegram
async function sendDocument(botToken: string, chatId: number, document: Buffer | Uint8Array, filename: string, caption?: string) {
  const formData = new FormData()
  formData.append("chat_id", chatId.toString())
  formData.append("document", new Blob([new Uint8Array(document)]), filename)
  if (caption) formData.append("caption", caption)

  await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
    method: "POST",
    body: formData,
  })
}

// Telegram webhook handler
interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: { id: number; first_name: string; username?: string }
    chat: { id: number; type: string }
    text?: string
    voice?: {
      file_id: string
      duration: number
      mime_type?: string
    }
    audio?: {
      file_id: string
      duration: number
    }
    photo?: Array<{
      file_id: string
      width: number
      height: number
    }>
    document?: {
      file_id: string
      file_name?: string
      mime_type?: string
    }
    caption?: string
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
    const message = update.message

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const { from, chat } = message
    const userId = from.id
    const chatId = chat.id

    // Check authorization
    if (allowedUsers.length > 0 && !allowedUsers.includes(userId)) {
      await sendMessage(botToken, chatId, "⛔ Accès non autorisé.")
      return NextResponse.json({ ok: true })
    }

    // Initialize OpenAI if available
    const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null

    // Handle text messages
    if (message.text) {
      const text = message.text

      if (text.toLowerCase() === "/clear" || text.toLowerCase() === "/reset") {
        await clearConversation(chatId)
        await sendMessage(botToken, chatId, "🔄 Conversation et mémoire réinitialisées !")
        return NextResponse.json({ ok: true })
      }

      if (text.toLowerCase() === "/help" || text.toLowerCase() === "/start") {
        await sendMessage(
          botToken,
          chatId,
          `👋 *Assistant CRM IA v4.0*\n\n` +
          `Je gère tout ton CRM ! Exemples :\n\n` +
          `📋 *Clients*\n` +
          `• "Crée client Dupont SARL"\n` +
          `• "Détails client Martin"\n\n` +
          `💰 *Devis & Factures*\n` +
          `• "Crée un devis pour Dupont: 5h dev à 80€"\n` +
          `• "Factures impayées"\n` +
          `• "Convertis le devis DEV-2025-0001 en facture"\n\n` +
          `📝 *Tâches*\n` +
          `• "Tâche: rappeler Martin demain"\n` +
          `• "Mes tâches en retard"\n\n` +
          `🏦 *Trésorerie*\n` +
          `• "Trésorerie" ou "Solde comptes"\n\n` +
          `📊 *Stats & Dashboard*\n` +
          `• "Stats du mois" • "Dashboard"\n\n` +
          `🌐 *Domaines & Abonnements*\n` +
          `• "Domaines qui expirent"\n` +
          `• "Abonnements à renouveler"\n\n` +
          `🎫 *Tickets*\n` +
          `• "Tickets ouverts"\n` +
          `• "Crée un ticket: problème email"\n\n` +
          `📊 *Projets*\n` +
          `• "Liste des projets" • "Cartes du projet X"\n\n` +
          `🎤 *Vocal*\n` +
          `• Envoie un message vocal, je transcris !\n\n` +
          `📸 *Carte de visite*\n` +
          `• Envoie une photo de carte de visite\n` +
          `• J'extrais les infos et crée le client !\n\n` +
          `_Tape /clear pour réinitialiser_`
        )
        return NextResponse.json({ ok: true })
      }

      if (text.toLowerCase() === "/stats") {
        // Quick stats command
        if (!openai) {
          await sendMessage(botToken, chatId, "⚠️ L'IA n'est pas configurée.")
          return NextResponse.json({ ok: true })
        }
        await sendTyping(botToken, chatId)
        const response = await processWithAI(openai, openaiModel, chatId, "Dashboard complet", botToken)
        await sendMessage(botToken, chatId, response)
        return NextResponse.json({ ok: true })
      }

      if (!openai) {
        await sendMessage(
          botToken,
          chatId,
          "⚠️ L'IA n'est pas configurée. Configure ta clé OpenAI dans Settings > Intégrations."
        )
        return NextResponse.json({ ok: true })
      }

      await sendTyping(botToken, chatId)
      const response = await processWithAI(openai, openaiModel, chatId, text, botToken)
      await sendMessage(botToken, chatId, response)
      return NextResponse.json({ ok: true })
    }

    // Handle voice messages
    if (message.voice || message.audio) {
      if (!openai) {
        await sendMessage(botToken, chatId, "⚠️ L'IA n'est pas configurée pour traiter les messages vocaux.")
        return NextResponse.json({ ok: true })
      }

      const fileId = message.voice?.file_id || message.audio?.file_id
      if (!fileId) {
        await sendMessage(botToken, chatId, "❌ Impossible de récupérer le fichier audio.")
        return NextResponse.json({ ok: true })
      }

      await sendTyping(botToken, chatId)
      await sendMessage(botToken, chatId, "🎤 Transcription en cours...")

      try {
        const transcription = await transcribeVoice(openai, botToken, fileId)
        await sendMessage(botToken, chatId, `📝 _"${transcription}"_\n\nTraitement...`)

        await sendTyping(botToken, chatId)
        const response = await processWithAI(openai, openaiModel, chatId, transcription, botToken)
        await sendMessage(botToken, chatId, response)
      } catch (error) {
        console.error("Voice processing error:", error)
        await sendMessage(botToken, chatId, "❌ Erreur lors de la transcription du message vocal.")
      }
      return NextResponse.json({ ok: true })
    }

    // Handle photos (business card OCR)
    if (message.photo && message.photo.length > 0) {
      if (!openai) {
        await sendMessage(botToken, chatId, "⚠️ L'IA n'est pas configurée pour traiter les images.")
        return NextResponse.json({ ok: true })
      }

      // Get the largest photo (best quality)
      const photo = message.photo[message.photo.length - 1]
      const caption = message.caption?.toLowerCase() || ""

      await sendTyping(botToken, chatId)

      // Detect if it's a business card
      const isBusinessCard = caption.includes("carte") || caption.includes("visite") ||
                            caption.includes("business") || caption.includes("card") || !caption

      if (isBusinessCard) {
        await sendMessage(botToken, chatId, "📸 Analyse de la carte de visite...")

        try {
          const extractedData = await processImageWithVision(
            openai,
            botToken,
            photo.file_id,
            `Analyse cette carte de visite et extrait TOUTES les informations visibles.
Retourne un JSON avec cette structure exacte:
{
  "companyName": "nom de la société",
  "contactFirstname": "prénom",
  "contactLastname": "nom",
  "email": "email",
  "phone": "téléphone",
  "address": "adresse complète",
  "city": "ville",
  "postalCode": "code postal",
  "website": "site web",
  "position": "poste/fonction"
}
Si une information n'est pas visible, mets null. Retourne UNIQUEMENT le JSON, rien d'autre.`
          )

          // Try to parse the extracted data
          let clientData
          try {
            // Remove markdown code blocks if present
            const cleanJson = extractedData.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
            clientData = JSON.parse(cleanJson)
          } catch {
            await sendMessage(botToken, chatId, `📋 Informations détectées:\n${extractedData}\n\n_Dis-moi si tu veux que je crée ce client !_`)
            return NextResponse.json({ ok: true })
          }

          if (clientData.companyName || clientData.contactLastname) {
            // Create the client automatically
            const client = await prisma.client.create({
              data: {
                tenant_id: DEFAULT_TENANT_ID,
                companyName: clientData.companyName || `${clientData.contactFirstname || ""} ${clientData.contactLastname || ""}`.trim(),
                email: clientData.email || null,
                phone: clientData.phone || null,
                contactFirstname: clientData.contactFirstname || null,
                contactLastname: clientData.contactLastname || null,
                address: clientData.address || null,
                city: clientData.city || null,
                postalCode: clientData.postalCode || null,
                website: clientData.website || null,
                status: "prospect",
              },
            })

            await sendMessage(
              botToken,
              chatId,
              `✅ *Client créé depuis la carte de visite !*\n\n` +
              `🏢 *${client.companyName}*\n` +
              (clientData.contactFirstname || clientData.contactLastname
                ? `👤 ${clientData.contactFirstname || ""} ${clientData.contactLastname || ""}\n` : "") +
              (clientData.position ? `💼 ${clientData.position}\n` : "") +
              (client.email ? `📧 ${client.email}\n` : "") +
              (client.phone ? `📞 ${client.phone}\n` : "") +
              (client.address ? `📍 ${client.address}${client.postalCode ? `, ${client.postalCode}` : ""}${client.city ? ` ${client.city}` : ""}\n` : "") +
              (clientData.website ? `🌐 ${clientData.website}\n` : "") +
              `\n_ID: ${client.id}_`
            )
          } else {
            await sendMessage(botToken, chatId, "❌ Impossible d'extraire les informations de la carte. Essaie avec une photo plus nette.")
          }
        } catch (error) {
          console.error("Business card processing error:", error)
          await sendMessage(botToken, chatId, "❌ Erreur lors de l'analyse de l'image.")
        }
      } else {
        // General image analysis
        try {
          const analysis = await processImageWithVision(
            openai,
            botToken,
            photo.file_id,
            caption || "Décris cette image et aide-moi avec ce que tu vois."
          )
          await sendMessage(botToken, chatId, analysis)
        } catch (error) {
          console.error("Image processing error:", error)
          await sendMessage(botToken, chatId, "❌ Erreur lors de l'analyse de l'image.")
        }
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", bot: "crm-telegram-ai", version: "4.0", features: ["voice", "vision", "memory"], tools: tools.length })
}
