import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Vercel Cron Job - runs every day at 8:00 AM Paris time
// Add to vercel.json: { "path": "/api/cron/telegram-morning-report", "schedule": "0 7 * * *" }

const DEFAULT_TENANT_ID = BigInt(1)

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date)
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
async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
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

// Generate morning report
async function generateMorningReport(): Promise<string> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  // Fetch all data in parallel
  const [
    // Treasury
    bankAccounts,
    // Today's tasks
    todayTasks,
    overdueTasks,
    // Invoices
    overdueInvoices,
    sentInvoices,
    monthPaidInvoices,
    // Quotes
    pendingQuotes,
    expiringQuotes,
    // Domains
    expiringDomains,
    // Subscriptions
    upcomingRenewals,
    // Tickets
    openTickets,
    // Notes with reminders today
    todayReminders,
    // Recent activity
    recentInvoicesPaid,
    // Contracts expiring
    expiringContracts,
  ] = await Promise.all([
    // Treasury
    prisma.bankAccount.aggregate({
      where: { tenant_id: DEFAULT_TENANT_ID, status: "active" },
      _sum: { currentBalance: true },
    }),
    // Today's tasks
    prisma.projectCard.count({
      where: {
        column: { project: { tenant_id: DEFAULT_TENANT_ID } },
        dueDate: { gte: today, lte: endOfDay },
        isCompleted: false,
      },
    }),
    // Overdue tasks
    prisma.projectCard.findMany({
      where: {
        column: { project: { tenant_id: DEFAULT_TENANT_ID } },
        dueDate: { lt: today },
        isCompleted: false,
      },
      select: { title: true, dueDate: true },
      take: 5,
    }),
    // Overdue invoices
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
    // Sent but not paid invoices
    prisma.invoice.aggregate({
      where: { tenant_id: DEFAULT_TENANT_ID, status: { in: ["sent", "overdue"] } },
      _sum: { totalTtc: true },
      _count: true,
    }),
    // Month paid invoices
    prisma.invoice.aggregate({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "paid",
        paymentDate: { gte: monthStart },
      },
      _sum: { totalTtc: true },
      _count: true,
    }),
    // Pending quotes
    prisma.quote.aggregate({
      where: { tenant_id: DEFAULT_TENANT_ID, status: "sent" },
      _sum: { totalTtc: true },
      _count: true,
    }),
    // Expiring quotes (within 7 days)
    prisma.quote.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "sent",
        validityDate: { gte: today, lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { client: { select: { companyName: true } } },
      take: 5,
    }),
    // Expiring domains (within 30 days)
    prisma.domain.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "active",
        expirationDate: { gte: today, lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { expirationDate: "asc" },
      take: 5,
    }),
    // Upcoming subscription renewals (within 7 days)
    prisma.subscription.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        status: "active",
        nextBillingDate: { gte: today, lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
      include: { client: { select: { companyName: true } } },
      take: 5,
    }),
    // Open tickets
    prisma.ticket.count({
      where: { tenant_id: DEFAULT_TENANT_ID, status: { in: ["new", "open", "pending"] } },
    }),
    // Today's reminders
    prisma.note.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        reminderAt: { gte: today, lte: endOfDay },
        reminderSent: false,
      },
      select: { content: true },
      take: 5,
    }),
    // Recent invoices paid (last 7 days)
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
    // Contracts awaiting signature (sent status)
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

  if (todayTasks === 0 && todayReminders.length === 0) {
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

    const settings = await getTelegramSettings()
    if (!settings?.botToken || settings.allowedUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Telegram not configured",
      })
    }

    const report = await generateMorningReport()

    // Send to all allowed users
    let sent = 0
    for (const chatId of settings.allowedUsers) {
      try {
        await sendTelegramMessage(settings.botToken, chatId, report)
        sent++
      } catch (error) {
        console.error(`[Morning Report] Failed to send to ${chatId}:`, error)
      }
    }

    console.log(`[Morning Report] Sent to ${sent}/${settings.allowedUsers.length} users`)

    return NextResponse.json({
      success: true,
      message: `Morning report sent to ${sent} users`,
      stats: { sent, total: settings.allowedUsers.length },
    })
  } catch (error) {
    console.error("[Morning Report] Error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}
