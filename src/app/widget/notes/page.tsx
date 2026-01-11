"use client"

import { useEffect, useState } from "react"

interface Task {
  text: string
  checked: boolean
  index: number
}

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
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
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
  send: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  ),
  checkbox: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-gray-400">
      <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </svg>
  ),
  checkboxChecked: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-500">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
      <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
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

// Parse tasks from content
function parseTasks(content: string): Task[] {
  const tasks: Task[] = []
  const lines = content.split("\n")
  let index = 0

  for (const line of lines) {
    const match = line.match(/^- \[([ xX])\] (.+)$/)
    if (match) {
      tasks.push({
        text: match[2],
        checked: match[1].toLowerCase() === "x",
        index: index,
      })
      index++
    }
  }

  return tasks
}

// Get summary for list view
function getNoteSummary(note: Note) {
  const cleaned = note.content.replace(/^#+\s+/gm, "")

  if (note.type === "todo") {
    const tasks = parseTasks(note.content)
    const checked = tasks.filter((t) => t.checked).length
    const firstUnchecked = tasks.find((t) => !t.checked)
    const displayText = firstUnchecked?.text || tasks[0]?.text || cleaned.split("\n")[0]
    return { text: displayText, checked, total: tasks.length }
  }

  const text = cleaned.replace(/\n+/g, " ").trim().substring(0, 80)
  return { text: text + (cleaned.length > 80 ? "..." : ""), checked: 0, total: 0 }
}

export default function NotesWidgetPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quickNote, setQuickNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Expanded note state
  const [expandedNote, setExpandedNote] = useState<Note | null>(null)
  const [newTaskText, setNewTaskText] = useState("")
  const [addingTask, setAddingTask] = useState(false)

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

      // Update expanded note if it exists
      if (expandedNote) {
        const updated = (data.notes || []).find((n: Note) => n.id === expandedNote.id)
        if (updated) {
          setExpandedNote(updated)
        } else {
          setExpandedNote(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  const submitQuickNote = async () => {
    if (!quickNote.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: quickNote.trim(),
          type: "quick",
          tagIds: [],
          entityLinks: [],
          reminderAt: null,
        }),
      })

      if (res.ok) {
        setQuickNote("")
        fetchNotes()
      }
    } catch (err) {
      console.error("Error creating note:", err)
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle task checkbox
  const toggleTask = async (noteId: string, taskIndex: number) => {
    try {
      const res = await fetch(`/api/notes/widget/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "toggleTask", taskIndex }),
      })

      if (res.ok) {
        const data = await res.json()
        // Update local state
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, content: data.content } : n))
        )
        if (expandedNote?.id === noteId) {
          setExpandedNote((prev) => (prev ? { ...prev, content: data.content } : null))
        }
      }
    } catch (err) {
      console.error("Error toggling task:", err)
    }
  }

  // Archive note
  const archiveNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/widget/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "archive" }),
      })

      if (res.ok) {
        setExpandedNote(null)
        fetchNotes()
      }
    } catch (err) {
      console.error("Error archiving note:", err)
    }
  }

  // Add new task
  const addTask = async () => {
    if (!expandedNote || !newTaskText.trim() || addingTask) return

    setAddingTask(true)
    try {
      const res = await fetch(`/api/notes/widget/${expandedNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "addTask", task: newTaskText.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setNewTaskText("")
        setNotes((prev) =>
          prev.map((n) => (n.id === expandedNote.id ? { ...n, content: data.content } : n))
        )
        setExpandedNote((prev) => (prev ? { ...prev, content: data.content } : null))
      }
    } catch (err) {
      console.error("Error adding task:", err)
    } finally {
      setAddingTask(false)
    }
  }

  // Toggle pin
  const togglePin = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/widget/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "togglePin" }),
      })

      if (res.ok) {
        fetchNotes()
      }
    } catch (err) {
      console.error("Error toggling pin:", err)
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

  // Render expanded note view
  if (expandedNote) {
    const tasks = parseTasks(expandedNote.content)
    const checkedCount = tasks.filter((t) => t.checked).length

    return (
      <div
        className="h-screen flex flex-col bg-transparent select-none"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/80 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2.5 text-white"
            style={{ background: "linear-gradient(135deg, #0064FA 0%, #0050CC 100%)" }}
          >
            <div
              className="flex items-center gap-2"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <button
                onClick={() => setExpandedNote(null)}
                className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition-colors"
              >
                {icons.back}
              </button>
              <div className="text-sm font-medium">
                {expandedNote.type === "todo" ? "Liste de tâches" : "Note"}
              </div>
            </div>
            <div
              className="flex gap-1.5"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <button
                onClick={() => togglePin(expandedNote.id)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  expandedNote.isTop ? "bg-yellow-500 text-white" : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                title={expandedNote.isTop ? "Désépingler" : "Épingler"}
              >
                {icons.pin}
              </button>
              <button
                onClick={() => archiveNote(expandedNote.id)}
                className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition-colors text-white"
                title="Archiver"
              >
                {icons.archive}
              </button>
              <button
                onClick={() => openNote(expandedNote.id)}
                className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition-colors"
                title="Ouvrir dans CRM"
              >
                {icons.external}
              </button>
            </div>
          </div>

          {/* Progress bar for todos */}
          {expandedNote.type === "todo" && tasks.length > 0 && (
            <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center justify-between text-xs text-purple-700 mb-1.5">
                <span className="font-medium">
                  {checkedCount}/{tasks.length} terminées
                </span>
                <span>{Math.round((checkedCount / tasks.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${(checkedCount / tasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {expandedNote.type === "todo" ? (
              <div className="space-y-1">
                {tasks.map((task) => (
                  <div
                    key={task.index}
                    onClick={() => toggleTask(expandedNote.id, task.index)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                      task.checked
                        ? "bg-gray-50 hover:bg-gray-100"
                        : "bg-white hover:bg-blue-50 border border-gray-100"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {task.checked ? icons.checkboxChecked : icons.checkbox}
                    </div>
                    <span
                      className={`text-sm leading-relaxed ${
                        task.checked ? "text-gray-400 line-through" : "text-gray-700"
                      }`}
                    >
                      {task.text}
                    </span>
                  </div>
                ))}

                {/* Add task input */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        addTask()
                      }
                    }}
                    placeholder="Nouvelle tâche..."
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-purple-400 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTaskText.trim() || addingTask}
                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    {icons.add}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {expandedNote.content.replace(/^#+\s+/gm, "")}
              </div>
            )}
          </div>

          {/* Tags */}
          {expandedNote.tags.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 flex flex-wrap gap-1.5">
              {expandedNote.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: tag.color || "#0064FA",
                    backgroundColor: (tag.color || "#0064FA") + "15",
                  }}
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render list view
  return (
    <div
      className="h-screen flex flex-col bg-transparent select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
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
          <div
            className="flex gap-1.5"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
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

        {/* Quick note input */}
        <div
          className="px-3 py-2 border-b border-gray-100"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submitQuickNote()
                }
              }}
              placeholder="Note rapide..."
              className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
            <button
              onClick={submitQuickNote}
              disabled={!quickNote.trim() || submitting}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              title="Ajouter"
            >
              {icons.send}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && stats.total > 0 && (
          <div className="flex gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-yellow-500">
                <path d="M7 2v11h3v9l7-12h-4l4-8z" />
              </svg>
              <span>{stats.quick}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-blue-500">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" />
              </svg>
              <span>{stats.note}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-purple-500">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>{stats.todo}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-2"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
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
              <div className="text-xs text-gray-400">Utilisez le champ ci-dessus</div>
            </div>
          ) : (
            <div className="space-y-1">
              {notes.map((note) => {
                const summary = getNoteSummary(note)
                return (
                  <div
                    key={note.id}
                    onClick={() => setExpandedNote(note)}
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
                      {note.type === "todo" && summary.total > 0 ? (
                        summary.checked === summary.total ? (
                          icons.checkboxChecked
                        ) : (
                          icons.checkbox
                        )
                      ) : (
                        icons[note.type]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs leading-relaxed line-clamp-2 ${
                          note.type === "todo" && summary.checked === summary.total
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        }`}
                      >
                        {summary.text}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {note.isTop && (
                          <span className="text-yellow-500">{icons.pin}</span>
                        )}
                        {note.type === "todo" && summary.total > 0 && (
                          <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            {summary.checked}/{summary.total}
                          </span>
                        )}
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
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
