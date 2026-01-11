"use client"

import { useEffect, useState } from "react"

interface Note {
  id: string
  type: "quick" | "note" | "todo"
  content: string
  isTop: boolean
  reminderAt: string | null
  createdAt: string
  tags: { name: string; color: string | null }[]
}

interface Stats {
  quick: number
  note: number
  todo: number
  total: number
}

// Icons as inline SVG
const icons = {
  quick: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-yellow-500">
      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
    </svg>
  ),
  note: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-blue-500">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" />
    </svg>
  ),
  todo: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-purple-500">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-yellow-500">
      <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-red-500">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
      <path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
      <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return "À l'instant"
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Hier"
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function formatReminder(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff < 0) return "Passé"
  if (diff < 60 * 60 * 1000) return `Dans ${Math.floor(diff / 60000)}min`
  if (diff < 24 * 60 * 60 * 1000) return `Dans ${Math.floor(diff / 3600000)}h`
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function truncate(text: string, max = 100) {
  const cleaned = text.replace(/^#+\s+/gm, "").replace(/\n+/g, " ").trim()
  if (cleaned.length <= max) return cleaned
  return cleaned.substring(0, max).trim() + "..."
}

export default function NotesWidgetPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/notes/widget?limit=15", {
        credentials: "include",
      })
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Session expirée")
        }
        throw new Error("Erreur de chargement")
      }
      const data = await res.json()
      setNotes(data.notes || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
    const interval = setInterval(fetchNotes, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const openCRM = () => {
    // @ts-expect-error - electronAPI is injected by preload
    window.electronAPI?.openCRM?.()
  }

  const openNote = (noteId: string) => {
    // @ts-expect-error - electronAPI is injected by preload
    window.electronAPI?.openNote?.(noteId)
  }

  const closeWidget = () => {
    // @ts-expect-error - electronAPI is injected by preload
    window.electronAPI?.closeWidget?.()
  }

  return (
    <div className="h-screen flex flex-col bg-transparent select-none" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
      <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/80 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 text-white"
          style={{ background: "linear-gradient(135deg, #0064FA 0%, #0050CC 100%)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">Mes Notes</div>
              <div className="text-xs opacity-80">
                {stats ? `${stats.total} note${stats.total > 1 ? "s" : ""}` : "Chargement..."}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <button
              onClick={fetchNotes}
              className="w-6 h-6 bg-white/15 hover:bg-white/25 rounded-md flex items-center justify-center transition-colors"
              title="Actualiser"
            >
              {icons.refresh}
            </button>
            <button
              onClick={openCRM}
              className="w-6 h-6 bg-white/15 hover:bg-white/25 rounded-md flex items-center justify-center transition-colors"
              title="Ouvrir CRM"
            >
              {icons.external}
            </button>
            <button
              onClick={closeWidget}
              className="w-6 h-6 bg-white/15 hover:bg-white/25 rounded-md flex items-center justify-center transition-colors"
              title="Fermer"
            >
              {icons.close}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && stats.total > 0 && (
          <div className="flex gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-yellow-500">
                <path d="M7 2v11h3v9l7-12h-4l4-8z" />
              </svg>
              <span>{stats.quick} Flash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-blue-500">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" />
              </svg>
              <span>{stats.note} Notes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-purple-500">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>{stats.todo} Tâches</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-500">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </div>
              <div className="text-xs font-medium text-red-500 mb-1">Erreur</div>
              <div className="text-xs text-gray-500 mb-3">{error}</div>
              <button
                onClick={fetchNotes}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-blue-500">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-600 mb-1">Aucune note</div>
              <div className="text-xs text-gray-400">Vos notes apparaîtront ici</div>
            </div>
          ) : (
            <div className="space-y-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openNote(note.id)}
                  className="flex gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      note.type === "quick"
                        ? "bg-yellow-500/10"
                        : note.type === "todo"
                        ? "bg-purple-500/10"
                        : "bg-blue-500/10"
                    }`}
                  >
                    {icons[note.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                      {truncate(note.content)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {note.isTop && <span className="text-yellow-500">{icons.pin}</span>}
                      {note.tags.slice(0, 2).map((t) => (
                        <span
                          key={t.name}
                          className="text-[10px] font-medium"
                          style={{ color: t.color || "#0064FA" }}
                        >
                          #{t.name}
                        </span>
                      ))}
                      {note.reminderAt && (
                        <span className="flex items-center gap-1 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                          {icons.bell}
                          {formatReminder(note.reminderAt)}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
