import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Cron Job - runs every 5 minutes to check for upcoming calendar events
// Dokploy: */5 * * * * curl -s "https://crm.julienronot.fr/api/cron/calendar-reminders"

const DEFAULT_TENANT_ID = BigInt(1)
const REMINDER_MINUTES = 10 // Send reminder 10 minutes before event

interface CalendarEvent {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName?: string }
  isAllDay: boolean
}

interface UserWithO365 {
  id: bigint
  name: string
  telegramChatId: bigint | null
  o365AccessToken: string | null
  o365RefreshToken: string | null
  o365TokenExpiresAt: Date | null
}

// Get O365 tenant settings
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
      botToken: settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN,
    }
  } catch {
    return null
  }
}

// Refresh user's O365 token
async function refreshUserToken(
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

    if (!response.ok) return null

    const data = await response.json()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        o365AccessToken: data.access_token,
        o365RefreshToken: data.refresh_token || user.o365RefreshToken,
        o365TokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    })

    return data.access_token
  } catch {
    return null
  }
}

// Get valid access token for user
async function getValidUserToken(
  user: UserWithO365,
  tenantSettings: { clientId: string; clientSecret: string; tenantId: string }
): Promise<string | null> {
  if (!user.o365RefreshToken) return null

  if (user.o365AccessToken && user.o365TokenExpiresAt) {
    if (user.o365TokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return user.o365AccessToken
    }
  }

  return refreshUserToken(user, tenantSettings)
}

// Get upcoming events for user (next 15 minutes)
async function getUpcomingEvents(
  user: UserWithO365,
  tenantSettings: { clientId: string; clientSecret: string; tenantId: string }
): Promise<CalendarEvent[]> {
  const accessToken = await getValidUserToken(user, tenantSettings)
  if (!accessToken) return []

  try {
    const now = new Date()
    // Look for events starting in the next 15 minutes
    const soon = new Date(now.getTime() + 15 * 60 * 1000)

    const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${soon.toISOString()}&$orderby=start/dateTime&$top=5&$select=id,subject,start,end,location,isAllDay`

    const response = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Paris"',
      },
    })

    if (!response.ok) return []

    const data = await response.json()
    return data.value || []
  } catch {
    return []
  }
}

// Send Telegram message
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

// Format time
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date)
}

// Create a unique key for event to prevent duplicate notifications
function getEventKey(userId: bigint, eventId: string, eventStart: string): string {
  return `${userId}-${eventId}-${eventStart}`
}

// In-memory cache to prevent duplicate notifications (resets on deploy)
// For production, consider using Redis or a database table
const notifiedEvents = new Set<string>()

export async function GET() {
  try {
    console.log("[Calendar Reminders] Starting...")

    const settings = await getO365TenantSettings()
    if (!settings?.enabled || !settings.botToken) {
      return NextResponse.json({
        success: false,
        message: "O365 or Telegram not configured",
      })
    }

    // Get users with O365 connected AND Telegram chat ID
    const users = await prisma.user.findMany({
      where: {
        tenant_id: DEFAULT_TENANT_ID,
        isActive: true,
        telegramChatId: { not: null },
        o365RefreshToken: { not: null },
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

    console.log(`[Calendar Reminders] Checking ${users.length} users`)

    let notificationsSent = 0
    const now = new Date()

    for (const user of users) {
      const events = await getUpcomingEvents(user as UserWithO365, settings)

      for (const event of events) {
        // Skip all-day events
        if (event.isAllDay) continue

        const eventStart = new Date(event.start.dateTime)
        const minutesUntil = Math.round((eventStart.getTime() - now.getTime()) / 60000)

        // Send notification if event starts in 8-12 minutes (to catch the 10 min window)
        if (minutesUntil >= 8 && minutesUntil <= 12) {
          const eventKey = getEventKey(user.id, event.id, event.start.dateTime)

          // Skip if already notified
          if (notifiedEvents.has(eventKey)) continue

          // Mark as notified
          notifiedEvents.add(eventKey)

          // Build notification message
          let message = `*Rappel RDV dans ${minutesUntil} min*\n\n`
          message += `${event.subject}\n`
          message += `${formatTime(eventStart)}`

          if (event.location?.displayName) {
            message += `\n_${event.location.displayName}_`
          }

          try {
            await sendTelegramMessage(settings.botToken, user.telegramChatId!, message)
            notificationsSent++
            console.log(`[Calendar Reminders] Sent reminder to ${user.name} for: ${event.subject}`)
          } catch (error) {
            console.error(`[Calendar Reminders] Failed to send to ${user.name}:`, error)
          }
        }
      }
    }

    // Clean up old entries from cache (older than 1 hour)
    // This is a simple cleanup, in production use a proper cache with TTL
    if (notifiedEvents.size > 1000) {
      notifiedEvents.clear()
    }

    console.log(`[Calendar Reminders] Sent ${notificationsSent} notifications`)

    return NextResponse.json({
      success: true,
      message: `Sent ${notificationsSent} calendar reminders`,
      stats: { users: users.length, notificationsSent },
    })
  } catch (error) {
    console.error("[Calendar Reminders] Error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}
