import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(1)

interface CalendarEvent {
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName?: string }
  isAllDay: boolean
  onlineMeeting?: { joinUrl?: string }
  webLink?: string
  bodyPreview?: string
}

// Parse datetime with timezone awareness
// Microsoft Graph returns local time when Prefer header is set
// We need to treat it as Europe/Paris time
function parseDateTimeWithTz(dateTime: string, timeZone: string): Date {
  // If dateTime doesn't include Z or offset, append the timezone offset
  // Europe/Paris is UTC+1 in winter, UTC+2 in summer
  if (!dateTime.includes("Z") && !dateTime.includes("+") && !dateTime.includes("-", 10)) {
    // Get current offset for Paris timezone
    const testDate = new Date(dateTime + "Z") // Parse as UTC first
    const parisOffset = new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })
    const utcDate = new Date().toLocaleString("en-US", { timeZone: "UTC" })
    const offsetMs = new Date(parisOffset).getTime() - new Date(utcDate).getTime()
    const offsetHours = Math.round(offsetMs / 3600000)

    // For Europe/Paris in winter (CET), offset is +1
    // The dateTime from Graph is already in Paris time, so we subtract the offset to get UTC
    return new Date(new Date(dateTime + "Z").getTime() - offsetHours * 3600000)
  }
  return new Date(dateTime)
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

// GET: Get next calendar event for current user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const o365Settings = await getO365TenantSettings()
    if (!o365Settings?.enabled) {
      return NextResponse.json({ nextEvent: null })
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
      return NextResponse.json({ nextEvent: null, needsConnection: true })
    }

    // Get valid access token
    let accessToken = user.o365AccessToken
    if (!accessToken || !user.o365TokenExpiresAt || user.o365TokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      accessToken = await refreshUserToken(user.id, user.o365RefreshToken, o365Settings)
      if (!accessToken) {
        return NextResponse.json({ nextEvent: null, tokenExpired: true })
      }
    }

    // Get events from now until end of day
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // Request more fields including online meeting info
    const calendarUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${endOfDay.toISOString()}&$orderby=start/dateTime&$top=1&$select=subject,start,end,location,isAllDay,onlineMeeting,webLink,bodyPreview`

    const response = await fetch(calendarUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="Europe/Paris"',
      },
    })

    if (!response.ok) {
      console.error("[Next Event] Calendar API error:", response.status)
      return NextResponse.json({ nextEvent: null })
    }

    const data = await response.json()
    const events: CalendarEvent[] = data.value || []

    if (events.length === 0) {
      return NextResponse.json({ nextEvent: null })
    }

    const nextEvent = events[0]

    // Parse dates with timezone awareness
    const startTime = parseDateTimeWithTz(nextEvent.start.dateTime, nextEvent.start.timeZone)
    const endTime = parseDateTimeWithTz(nextEvent.end.dateTime, nextEvent.end.timeZone)
    const startsInMinutes = Math.round((startTime.getTime() - now.getTime()) / 60000)

    return NextResponse.json({
      nextEvent: {
        subject: nextEvent.subject,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: nextEvent.location?.displayName || null,
        isAllDay: nextEvent.isAllDay,
        startsIn: startsInMinutes,
        // Additional fields for modal
        onlineMeetingUrl: nextEvent.onlineMeeting?.joinUrl || null,
        webLink: nextEvent.webLink || null,
        bodyPreview: nextEvent.bodyPreview || null,
      },
    })
  } catch (error) {
    console.error("[Next Event] Error:", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
