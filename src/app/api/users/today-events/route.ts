import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(1)

interface CalendarEvent {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName?: string }
  isAllDay: boolean
  onlineMeeting?: { joinUrl?: string }
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
    }
  } catch {
    return null
  }
}

// Refresh user's O365 token
async function refreshUserToken(
  userId: bigint,
  refreshToken: string,
  tenantSettings: { clientId: string; clientSecret: string; tenantId: string }
): Promise<string | null> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantSettings.tenantId}/oauth2/v2.0/token`
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: tenantSettings.clientId,
        client_secret: tenantSettings.clientSecret,
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

// Get today's boundaries in Paris timezone
function getTodayBoundariesParis(): { startOfDay: Date; endOfDay: Date } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parisDateStr = formatter.format(new Date())

  const now = new Date()
  const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }))
  const utcTime = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }))
  const offsetHours = Math.round((parisTime.getTime() - utcTime.getTime()) / 3600000)

  const [year, month, day] = parisDateStr.split("-").map(Number)

  const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0 - offsetHours, 0, 0))
  const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23 - offsetHours, 59, 59))

  return { startOfDay: startOfDayUTC, endOfDay: endOfDayUTC }
}

// GET: Get today's calendar events for current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const o365Settings = await getO365TenantSettings()
    if (!o365Settings?.enabled) {
      return NextResponse.json({ events: [], needsSetup: true })
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        id: true,
        o365AccessToken: true,
        o365RefreshToken: true,
        o365TokenExpiresAt: true,
      },
    })

    if (!user?.o365RefreshToken) {
      return NextResponse.json({ events: [], needsConnection: true })
    }

    // Get valid access token
    let accessToken = user.o365AccessToken
    if (!accessToken || !user.o365TokenExpiresAt || user.o365TokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      accessToken = await refreshUserToken(user.id, user.o365RefreshToken, o365Settings)
      if (!accessToken) {
        return NextResponse.json({ events: [], tokenExpired: true })
      }
    }

    // Get today's events
    const { startOfDay, endOfDay } = getTodayBoundariesParis()

    const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startOfDay.toISOString()}&endDateTime=${endOfDay.toISOString()}&$orderby=start/dateTime&$top=20&$select=id,subject,start,end,location,isAllDay,onlineMeeting`

    const response = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Paris"',
      },
    })

    if (!response.ok) {
      console.error("[Today Events] Calendar API error:", response.status)
      return NextResponse.json({ events: [] })
    }

    const data = await response.json()
    const events: CalendarEvent[] = data.value || []

    // Format events for frontend
    const formattedEvents = events.map((event) => ({
      id: event.id,
      subject: event.subject,
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      location: event.location?.displayName || null,
      isAllDay: event.isAllDay,
      hasVideoCall: !!event.onlineMeeting?.joinUrl,
      videoUrl: event.onlineMeeting?.joinUrl || null,
    }))

    return NextResponse.json({ events: formattedEvents })
  } catch (error) {
    console.error("[Today Events] Error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
