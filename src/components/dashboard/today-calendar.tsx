"use client"

import { useState, useEffect } from "react"
import { Calendar, MapPin, Video, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"

interface CalendarEvent {
  id: string
  subject: string
  startTime: string
  endTime: string
  location: string | null
  isAllDay: boolean
  hasVideoCall: boolean
  videoUrl: string | null
}

function formatTime(dateTimeStr: string): string {
  // dateTimeStr is in Paris time without timezone suffix (e.g., "2026-01-05T09:00:00")
  const time = dateTimeStr.substring(11, 16) // Extract "HH:MM"
  return time
}

function getTimeStatus(startTimeStr: string): { label: string; color: string } {
  const now = new Date()
  // Get current Paris time
  const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }))

  // Parse start time (it's already in Paris time)
  const [hours, minutes] = startTimeStr.substring(11, 16).split(":").map(Number)
  const eventTime = new Date(parisNow)
  eventTime.setHours(hours, minutes, 0, 0)

  const diffMs = eventTime.getTime() - parisNow.getTime()
  const diffMins = Math.round(diffMs / 60000)

  if (diffMins < 0) {
    return { label: "En cours", color: "text-emerald-400" }
  } else if (diffMins <= 15) {
    return { label: `Dans ${diffMins} min`, color: "text-amber-400" }
  } else if (diffMins <= 60) {
    return { label: `Dans ${diffMins} min`, color: "text-blue-400" }
  } else {
    const hours = Math.floor(diffMins / 60)
    return { label: `Dans ${hours}h${diffMins % 60 > 0 ? String(diffMins % 60).padStart(2, "0") : ""}`, color: "text-white/50" }
  }
}

export function TodayCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [needsConnection, setNeedsConnection] = useState(false)

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/users/today-events")
        const data = await res.json()

        if (data.needsConnection || data.needsSetup) {
          setNeedsConnection(true)
        } else {
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error("Failed to fetch calendar events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    // Refresh every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Agenda du jour</h3>
            <p className="text-xs text-white/40">Chargement...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (needsConnection) {
    return (
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Agenda du jour</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-white/30 mb-3" />
          <p className="text-sm text-white/50 mb-3">Calendrier non connecté</p>
          <Link
            href="/settings?tab=profile"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Connecter mon calendrier O365
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Agenda du jour</h3>
            <p className="text-xs text-white/40">
              {events.length === 0 ? "Aucun RDV" : `${events.length} RDV`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">Aucun rendez-vous aujourd&apos;hui</p>
            <p className="text-xs text-white/30 mt-1">Profitez de votre journée !</p>
          </div>
        ) : (
          events.map((event) => {
            const timeStatus = event.isAllDay ? null : getTimeStatus(event.startTime)

            return (
              <div
                key={event.id}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">
                      {event.subject}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {event.isAllDay ? (
                        <span className="text-xs text-violet-400">Toute la journée</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-white/50">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1 text-xs text-white/40 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.hasVideoCall && event.videoUrl && (
                      <a
                        href={event.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title="Rejoindre la visio"
                      >
                        <Video className="h-4 w-4" />
                      </a>
                    )}
                    {timeStatus && (
                      <span className={`text-xs font-medium ${timeStatus.color}`}>
                        {timeStatus.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
