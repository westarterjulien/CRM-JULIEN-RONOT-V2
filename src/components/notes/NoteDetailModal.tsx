"use client"

import { useState, useCallback } from "react"
import {
  X,
  Zap,
  StickyNote,
  CheckSquare,
  Pin,
  Share2,
  Archive,
  Trash2,
  Edit3,
  MoreHorizontal,
  Calendar,
  Clock,
  User,
  Paperclip,
  MessageCircle,
  Building2,
  Receipt,
  FileText,
  CreditCard,
  Globe,
  Ticket,
  FileSignature,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react"
import { MarkdownPreview } from "./MarkdownPreview"

interface Tag {
  id: string
  name: string
  color: string | null
  icon: string | null
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

interface NoteDetailModalProps {
  note: Note
  onClose: () => void
  onEdit?: (note: Note) => void
  onDelete?: (noteId: string) => void
  onArchive?: (noteId: string) => void
  onPin?: (noteId: string, pinned: boolean) => void
  onShare?: (noteId: string) => void
  onUpdateContent?: (noteId: string, content: string) => void
}

const typeConfig = {
  quick: {
    icon: Zap,
    label: "Flash",
    color: "#DCB40A",
    bgColor: "#FFF9E6",
  },
  note: {
    icon: StickyNote,
    label: "Note",
    color: "#0064FA",
    bgColor: "#E6F0FF",
  },
  todo: {
    icon: CheckSquare,
    label: "Tache",
    color: "#5F00BA",
    bgColor: "#F3E8FF",
  },
}

const entityTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; href: string }> = {
  client: { label: "Client", icon: Building2, color: "#0064FA", href: "/clients" },
  invoice: { label: "Facture", icon: Receipt, color: "#28B95F", href: "/invoices" },
  quote: { label: "Devis", icon: FileText, color: "#5F00BA", href: "/quotes" },
  subscription: { label: "Abonnement", icon: CreditCard, color: "#F0783C", href: "/subscriptions" },
  ticket: { label: "Ticket", icon: Ticket, color: "#F04B69", href: "/tickets" },
  contract: { label: "Contrat", icon: FileSignature, color: "#DCB40A", href: "/contracts" },
  domain: { label: "Domaine", icon: Globe, color: "#00B4D8", href: "/domains" },
}

function formatDate(dateStr: string, full = false) {
  const date = new Date(dateStr)
  if (full) {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return `Aujourd'hui a ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
  } else if (days === 1) {
    return `Hier a ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
  } else if (days < 7) {
    return `Il y a ${days} jours`
  } else {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  }
}

// Extract title from content (first line or first 50 chars)
function extractTitle(content: string): { title: string; body: string } {
  const lines = content.split("\n")
  const firstLine = lines[0].trim()

  // Check if first line is a heading
  if (firstLine.startsWith("# ")) {
    return {
      title: firstLine.slice(2),
      body: lines.slice(1).join("\n").trim(),
    }
  }

  // Use first line as title if reasonable length
  if (firstLine.length <= 100 && firstLine.length > 0) {
    return {
      title: firstLine,
      body: lines.slice(1).join("\n").trim(),
    }
  }

  // No clear title
  return {
    title: "",
    body: content,
  }
}

export function NoteDetailModal({
  note,
  onClose,
  onEdit,
  onDelete,
  onArchive,
  onPin,
  onShare,
  onUpdateContent,
}: NoteDetailModalProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const config = typeConfig[note.type]
  const TypeIcon = config.icon
  const { title, body } = extractTitle(note.content)

  const handleTaskToggle = useCallback((taskIndex: number, checked: boolean) => {
    const lines = note.content.split("\n")
    let currentTaskIndex = 0

    const newLines = lines.map(line => {
      const uncheckedMatch = line.match(/^- \[ \] (.+)$/)
      const checkedMatch = line.match(/^- \[x\] (.+)$/i)

      if (uncheckedMatch || checkedMatch) {
        if (currentTaskIndex === taskIndex) {
          currentTaskIndex++
          const taskContent = uncheckedMatch ? uncheckedMatch[1] : checkedMatch![1]
          return checked ? `- [x] ${taskContent}` : `- [ ] ${taskContent}`
        }
        currentTaskIndex++
      }
      return line
    })

    const newContent = newLines.join("\n")
    onUpdateContent?.(note.id, newContent)
  }, [note.content, note.id, onUpdateContent])

  const handleCopyContent = async () => {
    await navigator.clipboard.writeText(note.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Notion style */}
      <div
        className="relative w-full max-w-4xl mx-4 my-8 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {/* Cover/Header Bar */}
        <div
          className="h-2"
          style={{
            background: `linear-gradient(135deg, ${config.color}, ${config.color}99)`,
          }}
        />

        {/* Top Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#EEEEEE" }}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm" style={{ color: "#666666" }}>
            <StickyNote className="w-4 h-4" />
            <span>Notes</span>
            <ChevronRight className="w-4 h-4" />
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium"
              style={{ background: config.bgColor, color: config.color }}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              {config.label}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {note.isTop && (
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: "#FFF9E6", color: "#DCB40A" }}
              >
                <Pin className="w-3.5 h-3.5" />
                Epingle
              </span>
            )}

            {note.isShare && (
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: "#E6FAF0", color: "#28B95F" }}
              >
                <Share2 className="w-3.5 h-3.5" />
                Partage
              </span>
            )}

            <button
              onClick={() => onEdit?.(note)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Modifier"
            >
              <Edit3 className="w-4 h-4" style={{ color: "#666666" }} />
            </button>

            <button
              onClick={handleCopyContent}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Copier le contenu"
            >
              {copied ? (
                <Check className="w-4 h-4" style={{ color: "#28B95F" }} />
              ) : (
                <Copy className="w-4 h-4" style={{ color: "#666666" }} />
              )}
            </button>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" style={{ color: "#666666" }} />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-20 rounded-xl py-1 min-w-[180px]"
                    style={{
                      background: "#FFFFFF",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      border: "1px solid #EEEEEE",
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        onPin?.(note.id, !note.isTop)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      style={{ color: "#333333" }}
                    >
                      <Pin className="w-4 h-4" />
                      {note.isTop ? "Desepingler" : "Epingler en haut"}
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        onShare?.(note.id)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      style={{ color: "#333333" }}
                    >
                      <Share2 className="w-4 h-4" />
                      {note.isShare ? "Arreter le partage" : "Partager"}
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        onArchive?.(note.id)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      style={{ color: "#333333" }}
                    >
                      <Archive className="w-4 h-4" />
                      Archiver
                    </button>
                    <div className="h-px my-1" style={{ background: "#EEEEEE" }} />
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        if (confirm("Supprimer cette note ?")) {
                          onDelete?.(note.id)
                          onClose()
                        }
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 transition-colors"
                      style={{ color: "#F04B69" }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-2"
            >
              <X className="w-5 h-5" style={{ color: "#666666" }} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-8 py-6">
          {/* Title */}
          {title && (
            <h1
              className="text-2xl font-bold mb-4 leading-tight"
              style={{ color: "#111111" }}
            >
              {title}
            </h1>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: "#EEEEEE" }}>
            {/* Author */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ background: "#E6F0FF", color: "#0064FA" }}
              >
                {note.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: "#333333" }}>
                  {note.author.name}
                </div>
              </div>
            </div>

            <div className="h-4 w-px" style={{ background: "#EEEEEE" }} />

            {/* Created */}
            <div className="flex items-center gap-1.5 text-sm" style={{ color: "#666666" }}>
              <Calendar className="w-4 h-4" />
              <span>{formatDate(note.createdAt)}</span>
            </div>

            {/* Updated */}
            {note.updatedAt !== note.createdAt && (
              <>
                <div className="h-4 w-px" style={{ background: "#EEEEEE" }} />
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#999999" }}>
                  <Clock className="w-4 h-4" />
                  <span>Modifie {formatDate(note.updatedAt)}</span>
                </div>
              </>
            )}

            {/* Attachments */}
            {note.attachmentCount > 0 && (
              <>
                <div className="h-4 w-px" style={{ background: "#EEEEEE" }} />
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#666666" }}>
                  <Paperclip className="w-4 h-4" />
                  <span>{note.attachmentCount} piece{note.attachmentCount > 1 ? "s" : ""} jointe{note.attachmentCount > 1 ? "s" : ""}</span>
                </div>
              </>
            )}

            {/* Comments */}
            {note.commentCount > 0 && (
              <>
                <div className="h-4 w-px" style={{ background: "#EEEEEE" }} />
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#666666" }}>
                  <MessageCircle className="w-4 h-4" />
                  <span>{note.commentCount} commentaire{note.commentCount > 1 ? "s" : ""}</span>
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#999999" }}>
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      background: `${tag.color || "#0064FA"}12`,
                      color: tag.color || "#0064FA",
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Entity Links */}
          {note.entityLinks.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#999999" }}>
                Liens
              </div>
              <div className="flex flex-wrap gap-2">
                {note.entityLinks.map((link) => {
                  const config = entityTypeConfig[link.entityType]
                  const Icon = config?.icon || ExternalLink
                  return (
                    <a
                      key={link.id}
                      href={`${config?.href || ""}/${link.entityId}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] hover:shadow-md"
                      style={{
                        background: `${config?.color || "#666666"}10`,
                        color: config?.color || "#666666",
                        border: `1px solid ${config?.color || "#666666"}20`,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {link.entityName || `${config?.label || link.entityType} #${link.entityId}`}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reminder */}
          {note.reminderAt && (
            <div
              className="mb-6 p-4 rounded-xl flex items-center gap-3"
              style={{
                background: new Date(note.reminderAt) < new Date() ? "#FEE2E8" : "#FFF9E6",
                border: `1px solid ${new Date(note.reminderAt) < new Date() ? "#F04B69" : "#DCB40A"}30`,
              }}
            >
              <Clock
                className="w-5 h-5"
                style={{ color: new Date(note.reminderAt) < new Date() ? "#F04B69" : "#DCB40A" }}
              />
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ color: new Date(note.reminderAt) < new Date() ? "#F04B69" : "#DCB40A" }}
                >
                  {new Date(note.reminderAt) < new Date() ? "Rappel passe" : "Rappel programme"}
                </div>
                <div className="text-sm" style={{ color: "#666666" }}>
                  {formatDate(note.reminderAt, true)}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div
            className="prose prose-sm max-w-none"
            style={{ color: "#333333" }}
          >
            <MarkdownPreview
              content={body || note.content}
              interactive={!!onUpdateContent}
              onTaskToggle={handleTaskToggle}
              className="text-base leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="px-8 py-4 border-t flex items-center justify-between"
          style={{ background: "#FAFAFA", borderColor: "#EEEEEE" }}
        >
          <div className="text-xs" style={{ color: "#999999" }}>
            Cree le {formatDate(note.createdAt, true)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "#EEEEEE", color: "#666666" }}
            >
              Fermer
            </button>
            <button
              onClick={() => onEdit?.(note)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              Modifier
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
