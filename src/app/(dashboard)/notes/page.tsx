"use client"

import { useEffect, useState, useCallback } from "react"
import { NoteQuickAdd } from "@/components/notes/NoteQuickAdd"
import { NoteList } from "@/components/notes/NoteList"
import { NoteEditModal } from "@/components/notes/NoteEditModal"
import { NoteDetailModal } from "@/components/notes/NoteDetailModal"
import {
  Search,
  Zap,
  StickyNote,
  CheckSquare,
  Archive,
  Trash2,
  Hash,
  Plus,
  Loader2,
  X,
} from "lucide-react"

interface Tag {
  id: string
  name: string
  color: string | null
  icon: string | null
  noteCount?: number
}

interface EntityLink {
  id: string
  entityType: string
  entityId: string
  entityName?: string | null
}

interface Note {
  id: string
  content: string
  type: "quick" | "note" | "todo"
  isTop: boolean
  isArchived: boolean
  isShare: boolean
  shareToken: string | null
  reminderAt: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
  }
  tags: Tag[]
  entityLinks: EntityLink[]
  attachmentCount: number
  commentCount: number
}

interface Stats {
  quick: number
  note: number
  todo: number
  archived: number
  total: number
}

type TabType = "all" | "quick" | "note" | "todo" | "archived" | "recycled"

const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "all", label: "Toutes", icon: StickyNote, color: "#0064FA" },
  { id: "quick", label: "Flash", icon: Zap, color: "#DCB40A" },
  { id: "note", label: "Notes", icon: StickyNote, color: "#0064FA" },
  { id: "todo", label: "Tâches", icon: CheckSquare, color: "#5F00BA" },
  { id: "archived", label: "Archives", icon: Archive, color: "#666666" },
  { id: "recycled", label: "Corbeille", icon: Trash2, color: "#F04B69" },
]

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [search, setSearch] = useState("")
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#0064FA")
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)

  const fetchNotes = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (activeTab !== "all" && activeTab !== "archived" && activeTab !== "recycled") {
        params.set("type", activeTab)
      }
      if (activeTab === "archived") {
        params.set("archived", "true")
      }
      if (activeTab === "recycled") {
        params.set("recycled", "true")
      }
      if (search) {
        params.set("search", search)
      }
      if (selectedTagId) {
        params.set("tagId", selectedTagId)
      }

      const response = await fetch(`/api/notes?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setNotes(data.notes)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching notes:", error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, search, selectedTagId])

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/notes/tags")
      const data = await response.json()
      if (response.ok) {
        setTags(data.tags)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
    fetchTags()
  }, [fetchNotes, fetchTags])

  const handleCreateNote = async (data: {
    content: string
    type: "quick" | "note" | "todo"
    tagIds: string[]
    entityLinks: { entityType: string; entityId: string }[]
    reminderAt: string | null
  }): Promise<{ id: string } | void> => {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      const note = await response.json()
      fetchNotes()
      fetchTags()
      return { id: note.id }
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "DELETE",
    })

    if (response.ok) {
      fetchNotes()
    }
  }

  const handleArchiveNote = async (noteId: string) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    })

    if (response.ok) {
      fetchNotes()
    }
  }

  const handlePinNote = async (noteId: string, pinned: boolean) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTop: pinned }),
    })

    if (response.ok) {
      fetchNotes()
    }
  }

  const handleEditNote = (note: Note) => {
    setViewingNote(null) // Ferme le detail si ouvert
    setEditingNote(note)
  }

  const handleViewNote = (note: Note) => {
    setViewingNote(note)
  }

  const handleSaveNote = async (
    noteId: string,
    data: {
      content: string
      type: "quick" | "note" | "todo"
      tagIds: string[]
      entityLinks: { entityType: string; entityId: string }[]
      reminderAt: string | null
    }
  ) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      fetchNotes()
      fetchTags()
    }
  }

  const handleUpdateContent = async (noteId: string, content: string) => {
    // Optimistic update
    setNotes(notes.map(n => n.id === noteId ? { ...n, content } : n))

    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      // Revert on error
      fetchNotes()
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setIsCreatingTag(true)
    try {
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName, color: newTagColor }),
      })

      if (response.ok) {
        fetchTags()
        setNewTagName("")
        setNewTagColor("#0064FA")
      }
    } catch (error) {
      console.error("Error creating tag:", error)
    } finally {
      setIsCreatingTag(false)
    }
  }

  const tagColors = [
    "#0064FA", "#5F00BA", "#28B95F", "#DCB40A", "#F04B69",
    "#FF6B35", "#00C9A7", "#845EC2", "#FF9671", "#00C9A7",
  ]

  return (
    <div className="flex gap-6 min-h-[calc(100vh-120px)]">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
            Notes
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#666666" }}>
            Gérez vos idées, notes et tâches
          </p>
        </div>

        {/* Quick Add */}
        <div className="mb-6">
          <NoteQuickAdd onSubmit={handleCreateNote} tags={tags} />
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#F5F5F5" }}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const count =
                tab.id === "all"
                  ? stats?.total
                  : tab.id === "quick"
                  ? stats?.quick
                  : tab.id === "note"
                  ? stats?.note
                  : tab.id === "todo"
                  ? stats?.todo
                  : tab.id === "archived"
                  ? stats?.archived
                  : null

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isActive ? "#FFFFFF" : "transparent",
                    color: isActive ? tab.color : "#666666",
                    boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== null && count !== undefined && (
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        background: isActive ? `${tab.color}15` : "#EEEEEE",
                        color: isActive ? tab.color : "#999999",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#999999" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 rounded-xl text-sm w-full md:w-[240px] outline-none"
              style={{
                background: "#F5F5F5",
                color: "#333333",
                border: "1px solid transparent",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0064FA")}
              onBlur={(e) => (e.target.style.borderColor = "transparent")}
            />
          </div>
        </div>

        {/* Active Filters */}
        {selectedTagId && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm" style={{ color: "#666666" }}>
              Filtré par:
            </span>
            {(() => {
              const tag = tags.find((t) => t.id === selectedTagId)
              if (!tag) return null
              return (
                <span
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${tag.color || "#0064FA"}15`,
                    color: tag.color || "#0064FA",
                  }}
                >
                  #{tag.name}
                  <button onClick={() => setSelectedTagId(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })()}
          </div>
        )}

        {/* Notes List */}
        <NoteList
          notes={notes}
          isLoading={isLoading}
          onEdit={handleEditNote}
          onDelete={handleDeleteNote}
          onArchive={handleArchiveNote}
          onPin={handlePinNote}
          onClick={handleViewNote}
          onUpdateContent={handleUpdateContent}
          emptyMessage={
            activeTab === "archived"
              ? "Aucune note archivée"
              : activeTab === "recycled"
              ? "La corbeille est vide"
              : "Aucune note"
          }
        />
      </div>

      {/* Tags Sidebar */}
      <div
        className="hidden lg:block w-[280px] rounded-2xl p-4 h-fit sticky top-4"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #EEEEEE",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "#111111" }}>
            Tags
          </h2>
          <button
            onClick={() => setShowTagPanel(!showTagPanel)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: showTagPanel ? "#E6F0FF" : "#F5F5F5",
              color: showTagPanel ? "#0064FA" : "#666666",
            }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Create Tag Form */}
        {showTagPanel && (
          <div
            className="mb-4 p-3 rounded-xl"
            style={{ background: "#F5F5F5" }}
          >
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nom du tag..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
              style={{ background: "#FFFFFF" }}
            />
            <div className="flex flex-wrap gap-1 mb-2">
              {tagColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    background: color,
                    transform: newTagColor === color ? "scale(1.2)" : "scale(1)",
                    border: newTagColor === color ? "2px solid #FFFFFF" : "none",
                    boxShadow: newTagColor === color ? `0 0 0 2px ${color}` : "none",
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreatingTag}
              className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              {isCreatingTag ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                "Créer le tag"
              )}
            </button>
          </div>
        )}

        {/* Tags List */}
        <div className="space-y-1">
          <button
            onClick={() => setSelectedTagId(null)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: selectedTagId === null ? "#E6F0FF" : "transparent",
              color: selectedTagId === null ? "#0064FA" : "#666666",
            }}
          >
            <span className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Tous les tags
            </span>
          </button>

          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTagId(tag.id)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background: selectedTagId === tag.id ? `${tag.color || "#0064FA"}15` : "transparent",
                color: selectedTagId === tag.id ? tag.color || "#0064FA" : "#666666",
              }}
            >
              <span className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: tag.color || "#0064FA" }}
                />
                {tag.name}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: "#EEEEEE", color: "#999999" }}
              >
                {tag.noteCount ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {viewingNote && (
        <NoteDetailModal
          note={viewingNote}
          onClose={() => setViewingNote(null)}
          onEdit={(note) => {
            setViewingNote(null)
            handleEditNote(note)
          }}
          onDelete={(noteId) => {
            handleDeleteNote(noteId)
            setViewingNote(null)
          }}
          onArchive={(noteId) => {
            handleArchiveNote(noteId)
            setViewingNote(null)
          }}
          onPin={(noteId, pinned) => {
            handlePinNote(noteId, pinned)
            // Update local state
            setViewingNote(prev => prev ? { ...prev, isTop: pinned } : null)
          }}
          onUpdateContent={(noteId, content) => {
            handleUpdateContent(noteId, content)
            // Update local state
            setViewingNote(prev => prev ? { ...prev, content } : null)
          }}
        />
      )}

      {/* Edit Modal */}
      {editingNote && (
        <NoteEditModal
          note={editingNote}
          tags={tags}
          onSave={handleSaveNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  )
}
