import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Cron Job - runs every day at 8:00 AM Paris time
// Dokploy cron (UTC): 0 7 * * * (winter) or 0 6 * * * (summer)
// Container is now in Europe/Paris timezone

const DEFAULT_TENANT_ID = BigInt(1)

// O365 Calendar types
interface CalendarEvent {
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName?: string }
  isAllDay: boolean
  organizer?: { emailAddress?: { name?: string } }
  attendees?: Array<{ emailAddress?: { name?: string; address?: string } }>
}

// User with O365 tokens
interface UserWithO365 {
  id: bigint
  name: string
  telegramChatId: bigint | null
  o365AccessToken: string | null
  o365RefreshToken: string | null
  o365TokenExpiresAt: Date | null
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date)
}

// Format time (HH:MM)
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date)
}

// Get O365 tenant settings (for client_id, client_secret, tenant_id)
async function getO365TenantSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
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

// Refresh O365 access token for a specific user
async function refreshUserO365Token(
  user: UserWithO365,
  tenantSettings: { clientId: string; clientSecret: string; tenantId: string }
): Promise<string | null> {
  if (!user.o365RefreshToken) return null

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantSettings.tenantId}/oauth2/v2.0/token`
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: tenantSettings.clientId,
        client_secret: tenantSettings.clientSecret,
        refresh_token: user.o365RefreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access",
      }),
    })

    if (!response.ok) {
      console.error(`[Morning Report] Token refresh failed for user ${user.id}`)
      return null
    }

    const data = await response.json()

    // Update user tokens in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        o365AccessToken: data.access_token,
        o365RefreshToken: data.refresh_token || user.o365RefreshToken,
        o365TokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    })

    return data.access_token
  } catch (error) {
    console.error(`[Morning Report] Token refresh error for user ${user.id}:`, error)
    return null
  }
}

// Get valid O365 access token for a user
async function getValidUserO365Token(
  user: UserWithO365,
  tenantSettings: { clientId: string; clientSecret: string; tenantId: string }
): Promise<string | null> {
  if (!user.o365RefreshToken) return null

  // Check if current token is valid (with 5 min buffer)
  if (user.o365AccessToken && user.o365TokenExpiresAt) {
    if (user.o365TokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return user.o365AccessToken
    }
  }

  // Refresh token
  return refreshUserO365Token(user, tenantSettings)
}

// Get today's date boundaries in Paris timezone
function getTodayBoundariesParis(): { startOfDay: Date; endOfDay: Date } {
  // Get current date in Paris
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parisDateStr = formatter.format(new Date()) // "2026-01-05"

  // Create start and end of day in Paris timezone using ISO format
  // Paris midnight = parisDateStr + "T00:00:00" interpreted as Paris time
  // We need UTC equivalents for the API

  // Get the offset between Paris and UTC
  const now = new Date()
  const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }))
  const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }))
  const offsetHours = Math.round((parisTime.getTime() - utcTime.getTime()) / 3600000)

  // Parse the Paris date
  const [year, month, day] = parisDateStr.split("-").map(Number)

  // Create UTC times that correspond to Paris midnight and Paris 23:59:59
  // Paris midnight = UTC (midnight - offset)
  const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0 - offsetHours, 0, 0))
  const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23 - offsetHours, 59, 59))

  console.log(`[Morning Report] Paris date: ${parisDateStr}, offset: ${offsetHours}h`)
  console.log(`[Morning Report] Start: ${startOfDayUTC.toISOString()} (${parisDateStr} 00:00 Paris)`)
  console.log(`[Morning Report] End: ${endOfDayUTC.toISOString()} (${parisDateStr} 23:59 Paris)`)

  return { startOfDay: startOfDayUTC, endOfDay: endOfDayUTC }
}

// Get today's calendar events for a specific user
async function getCalendarEventsForUser(
  user: UserWithO365,
  tenantSettings: { clientId: string; clientSecret: string; tenantId: string }
): Promise<CalendarEvent[]> {
  const accessToken = await getValidUserO365Token(user, tenantSettings)
  if (!accessToken) return []

  try {
    const { startOfDay, endOfDay } = getTodayBoundariesParis()

    console.log(`[Morning Report] Fetching events from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startOfDay.toISOString()}&endDateTime=${endOfDay.toISOString()}&$orderby=start/dateTime&$top=20&$select=subject,start,end,location,isAllDay,organizer,attendees`

    const response = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Paris"',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Morning Report] Calendar API error for user ${user.id}:`, response.status, errorText)
      return []
    }

    const data = await response.json()
    console.log(`[Morning Report] API returned ${data.value?.length || 0} events for date range`)
    if (data.value?.length === 0) {
      console.log(`[Morning Report] No events found - this could be normal or the range might be wrong`)
    }
    return data.value || []
  } catch (error) {
    console.error(`[Morning Report] Calendar fetch error for user ${user.id}:`, error)
    return []
  }
}

// Get Telegram settings from tenant
async function getTelegramSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      botToken: settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN,
      allowedUsers: settings.telegramAllowedUsers
        ?.split(",")
        .map((id: string) => parseInt(id.trim()))
        .filter((id: number) => !isNaN(id) && id > 0) || [],
    }
  } catch {
    return null
  }
}

// Send message to Telegram
async function sendTelegramMessage(botToken: string, chatId: number | bigint, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: Number(chatId),
      text,
      parse_mode: "Markdown",
    }),
  })
}

// Generate morning report with optional calendar events
async function generateMorningReport(calendarEvents: CalendarEvent[] = []): Promise<string> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  // Fetch all data in parallel
  const [
    bankAccounts,
    todayTasks,
    overdueTasks,
    overdueInvoices,
    sentInvoices,
    monthPaidInvoices,
    pendingQuotes,
    expiringQuotes,
    expiringDomains,
    upcomingRenewals,
    openTickets,
    todayReminders,
    recentInvoicesPaid,
    expiringContracts,
  ] = await Promise.all([
    prisma.bankAccount.aggregate({
      where: { tenant_id: DEFAULT_TENANT_ID, status: "active" },
      _sum: { currentBalance: true },
    }),
    prisma.projectCard.count({
      where: {
        column: { project: { tenant_id: DEFAULT_TENANT_ID } },
        dueDate: { gte: today, lte: endOfDay },
        isCompleted: false,
      },
    }),
    prisma.projectCard.findMany({
      where: {
        column: { project: { tenant_id: DEFAULT_TENANT_ID } },
        dueDate: { lt: today },
        isCompleted: false,
      },
      select: { title: true, dueDate: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: { in: ["sent", "overdue"] },
        dueDate: { lt: today },
      },
      include: { client: { select: { companyName: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.invoice.aggregate({
      where: { tenant_id: DEFAULT_TENANT_ID, status: { in: ["sent", "overdue"] } },
      _sum: { totalTtc: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "paid",
        paymentDate: { gte: monthStart },
      },
      _sum: { totalTtc: true },
      _count: true,
    }),
    prisma.quote.aggregate({
      where: { tenant_id: DEFAULT_TENANT_ID, status: "sent" },
      _sum: { totalTtc: true },
      _count: true,
    }),
    prisma.quote.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "sent",
        validityDate: { gte: today, lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { client: { select: { companyName: true } } },
      take: 5,
    }),
    prisma.domain.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "active",
        expirationDate: { gte: today, lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { expirationDate: "asc" },
      take: 5,
    }),
    prisma.subscription.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "active",
        nextBillingDate: { gte: today, lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { client: { select: { companyName: true } } },
      take: 5,
    }),
    prisma.ticket.count({
      where: { tenant_id: DEFAULT_TENANT_ID, status: { in: ["new", "open", "pending"] } },
    }),
    prisma.note.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        reminderAt: { gte: today, lte: endOfDay },
        reminderSent: false,
      },
      select: { content: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "paid",
        paymentDate: { gte: weekAgo },
      },
      include: { client: { select: { companyName: true } } },
      orderBy: { paymentDate: "desc" },
      take: 3,
    }),
    prisma.contract.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "sent",
      },
      include: { client: { select: { companyName: true } } },
      take: 3,
    }),
  ])

  // Build the report
  const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(now)
  const fullDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(now)

  let report = `*Bonjour ! Voici ton briefing du ${dayName} ${fullDate}*\n\n`

  // Treasury
  const treasury = Number(bankAccounts._sum?.currentBalance || 0)
  report += `*Trésorerie:* ${formatCurrency(treasury)}\n\n`

  // CA du mois
  const monthCA = Number(monthPaidInvoices._sum?.totalTtc || 0)
  report += `*CA encaissé ce mois:* ${formatCurrency(monthCA)} (${monthPaidInvoices._count} factures)\n\n`

  // Alerts section
  const alerts: string[] = []

  if (overdueInvoices.length > 0) {
    const total = overdueInvoices.reduce((sum, inv) => sum + Number(inv.totalTtc), 0)
    alerts.push(`${overdueInvoices.length} facture(s) en retard (${formatCurrency(total)})`)
  }

  if (overdueTasks.length > 0) {
    alerts.push(`${overdueTasks.length} tâche(s) en retard`)
  }

  if (openTickets > 0) {
    alerts.push(`${openTickets} ticket(s) ouvert(s)`)
  }

  if (expiringDomains.length > 0) {
    alerts.push(`${expiringDomains.length} domaine(s) expire(nt) bientôt`)
  }

  if (expiringContracts.length > 0) {
    alerts.push(`${expiringContracts.length} contrat(s) en attente de signature`)
  }

  if (alerts.length > 0) {
    report += `*Alertes:*\n`
    alerts.forEach(alert => {
      report += `  - ${alert}\n`
    })
    report += `\n`
  }

  // Today's agenda
  report += `*Aujourd'hui:*\n`

  // Calendar events from user's O365
  if (calendarEvents.length > 0) {
    report += `\n*Agenda:*\n`
    calendarEvents.forEach(event => {
      // The dateTime from Graph API is already in Paris time (due to Prefer header)
      // but without timezone suffix, so we parse it as local time string
      const startTimeStr = event.start.dateTime.substring(11, 16) // "HH:MM"
      const endTimeStr = event.end.dateTime.substring(11, 16) // "HH:MM"

      if (event.isAllDay) {
        report += `  - Journée: ${event.subject}\n`
      } else {
        report += `  - ${startTimeStr} - ${endTimeStr}: ${event.subject}\n`
      }

      if (event.location?.displayName) {
        report += `    _${event.location.displayName}_\n`
      }
    })
    report += `\n`
  }

  if (todayTasks > 0) {
    report += `  - ${todayTasks} tâche(s) à faire\n`
  }

  if (todayReminders.length > 0) {
    report += `  - ${todayReminders.length} rappel(s) programmé(s)\n`
    todayReminders.forEach(r => {
      const preview = r.content.length > 40 ? r.content.substring(0, 40) + "..." : r.content
      report += `    - _${preview}_\n`
    })
  }

  if (todayTasks === 0 && todayReminders.length === 0 && calendarEvents.length === 0) {
    report += `  - Rien de prévu\n`
  }
  report += `\n`

  // Pending quotes
  if (pendingQuotes._count > 0) {
    report += `*Devis en attente:* ${pendingQuotes._count} (${formatCurrency(Number(pendingQuotes._sum?.totalTtc || 0))})\n`
    if (expiringQuotes.length > 0) {
      report += `  _Expire(nt) bientôt:_\n`
      expiringQuotes.forEach(q => {
        report += `  - ${q.client.companyName}: ${formatCurrency(Number(q.totalTtc))} (${formatDate(q.validityDate)})\n`
      })
    }
    report += `\n`
  }

  // Invoices to chase
  if (sentInvoices._count > 0) {
    report += `*À encaisser:* ${formatCurrency(Number(sentInvoices._sum?.totalTtc || 0))} (${sentInvoices._count} factures)\n`
    if (overdueInvoices.length > 0) {
      report += `  _En retard:_\n`
      overdueInvoices.slice(0, 3).forEach(inv => {
        const daysLate = Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        report += `  - ${inv.client.companyName}: ${formatCurrency(Number(inv.totalTtc))} (${daysLate}j)\n`
      })
    }
    report += `\n`
  }

  // Upcoming renewals
  if (upcomingRenewals.length > 0) {
    report += `*Renouvellements cette semaine:*\n`
    upcomingRenewals.forEach(sub => {
      report += `  - ${sub.client.companyName}: ${formatCurrency(Number(sub.amountHt))} le ${formatDate(sub.nextBillingDate!)}\n`
    })
    report += `\n`
  }

  // Recent good news
  if (recentInvoicesPaid.length > 0) {
    report += `*Derniers encaissements:*\n`
    recentInvoicesPaid.forEach(inv => {
      report += `  - ${inv.client.companyName}: ${formatCurrency(Number(inv.totalTtc))}\n`
    })
    report += `\n`
  }

  // Motivational footer
  const motivations = [
    "Bonne journée productive !",
    "C'est parti pour une belle journée !",
    "Let's go !",
    "À toi de jouer !",
    "Que la force soit avec toi !",
  ]
  report += `_${motivations[Math.floor(Math.random() * motivations.length)]}_`

  return report
}

export async function GET() {
  try {
    console.log("[Morning Report] Starting...")

    const telegramSettings = await getTelegramSettings()
    if (!telegramSettings?.botToken || telegramSettings.allowedUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Telegram not configured",
      })
    }

    const o365Settings = await getO365TenantSettings()

    // Get users with their O365 tokens and telegramChatId
    const usersWithO365 = await prisma.user.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        isActive: true,
        OR: [
          { telegramChatId: { not: null } },
          { id: { in: telegramSettings.allowedUsers.map((id: number) => BigInt(id)) } },
        ],
      },
      select: {
        id: true,
        name: true,
        telegramChatId: true,
        o365AccessToken: true,
        o365RefreshToken: true,
        o365TokenExpiresAt: true,
      },
    })

    // Create a map of telegram chat ID to user for quick lookup
    const chatIdToUser = new Map<number, UserWithO365>()
    usersWithO365.forEach(user => {
      if (user.telegramChatId) {
        chatIdToUser.set(Number(user.telegramChatId), user as UserWithO365)
      }
    })

    let sent = 0

    // Send personalized report to each allowed user
    for (const chatId of telegramSettings.allowedUsers) {
      try {
        // Find the user associated with this chat ID
        const user = chatIdToUser.get(chatId)
        console.log(`[Morning Report] Processing chatId ${chatId}, user found: ${user?.name || "NO"}`)

        // Get calendar events for this specific user (if they have O365 connected)
        let calendarEvents: CalendarEvent[] = []
        if (user && o365Settings?.enabled && user.o365RefreshToken) {
          console.log(`[Morning Report] User ${user.name} has O365 token, fetching calendar...`)
          calendarEvents = await getCalendarEventsForUser(user, o365Settings)
          console.log(`[Morning Report] Found ${calendarEvents.length} events for user ${user.name}`)
          if (calendarEvents.length > 0) {
            calendarEvents.forEach((e, i) => {
              console.log(`[Morning Report]   Event ${i + 1}: ${e.subject} at ${e.start.dateTime}`)
            })
          }
        } else {
          console.log(`[Morning Report] Skipping calendar: o365Enabled=${o365Settings?.enabled}, hasToken=${!!user?.o365RefreshToken}`)
        }

        // Generate personalized report with user's calendar
        const report = await generateMorningReport(calendarEvents)

        await sendTelegramMessage(telegramSettings.botToken, chatId, report)
        sent++
      } catch (error) {
        console.error(`[Morning Report] Failed to send to ${chatId}:`, error)
      }
    }

    console.log(`[Morning Report] Sent to ${sent}/${telegramSettings.allowedUsers.length} users`)

    return NextResponse.json({
      success: true,
      message: `Morning report sent to ${sent} users`,
      stats: { sent, total: telegramSettings.allowedUsers.length },
    })
  } catch (error) {
    console.error("[Morning Report] Error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}
