"use client"

import { useState, useEffect, useCallback, use, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Send,
  Building,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Paperclip,
  Lock,
  MessageSquare,
  Sparkles,
  Bell,
  Tag,
  RotateCcw,
  Flame,
  Plus,
  X,
  Loader2,
  ChevronDown,
  User,
} from "lucide-react"

interface TicketAttachment {
  id: string
  filename: string
  originalName: string
  mimeType: string | null
  size: number
  path: string
}

interface TicketMessage {
  id: string
  userId: string | null
  client_id: string | null
  type: string
  content: string
  from_email: string | null
  from_name: string | null
  isInternal: boolean
  createdAt: string | null
  user: {
    id: string
    name: string
    email: string
  } | null
  clients: {
    id: string
    companyName: string
  } | null
  ticket_attachments: TicketAttachment[]
}

interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  senderEmail: string
  senderName: string | null
  status: string
  priority: string
  tags: string | null
  responseCount: number
  firstResponseAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  lastActivityAt: string | null
  createdAt: string | null
  client: {
    id: string
    companyName: string
    email: string
    phone: string | null
  } | null
  assignee: {
    id: string
    name: string
    email: string
  } | null
  messages: TicketMessage[]
}

interface Client {
  id: string
  companyName: string
  email: string | null
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Clients list
  const [clients, setClients] = useState<Client[]>([])
  const [clientDialogOpen, setClientDialogOpen] = useState(false)

  // Reply form
  const [replyContent, setReplyContent] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)

  // AI Generation
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiAdditionalInfo, setAiAdditionalInfo] = useState("")
  const [aiInstructions, setAiInstructions] = useState("")

  // Reminders
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [reminderDate, setReminderDate] = useState("")
  const [reminderNote, setReminderNote] = useState("")

  // Tags
  const [editingTags, setEditingTags] = useState(false)
  const [tagsValue, setTagsValue] = useState("")

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`)
      if (res.ok) {
        const data = await res.json()
        setTicket(data)
        setTagsValue(data.tags || "")
      } else {
        router.push("/tickets")
      }
    } catch (error) {
      console.error("Error fetching ticket:", error)
      router.push("/tickets")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients?limit=100")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }, [])

  useEffect(() => {
    fetchTicket()
    fetchClients()
  }, [fetchTicket, fetchClients])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ticket?.messages])

  const handleAction = async (action: string, payload?: object) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      })

      if (res.ok) {
        fetchTicket()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'action")
      }
    } catch (error) {
      console.error("Error performing action:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/tickets")
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting ticket:", error)
    } finally {
      setActionLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyContent.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyContent,
          isInternal,
          type: isInternal ? "note" : "reply",
          userId: "1",
        }),
      })

      if (res.ok) {
        setReplyContent("")
        setIsInternal(false)
        fetchTicket()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'envoi")
      }
    } catch (error) {
      console.error("Error sending reply:", error)
    } finally {
      setSending(false)
    }
  }

  const handleGenerateAI = async () => {
    setAiLoading(true)
    try {
      const res = await fetch(`/api/tickets/${id}/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalInfo: aiAdditionalInfo,
          instructions: aiInstructions,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erreur de génération")
      }

      const data = await res.json()
      setReplyContent(data.response)
      setAiDialogOpen(false)
      setAiAdditionalInfo("")
      setAiInstructions("")

      if (data.warning) {
        console.log("AI Warning:", data.warning)
      }
    } catch (error) {
      console.error("Error generating AI response:", error)
      alert("Erreur lors de la génération de la réponse IA")
    } finally {
      setAiLoading(false)
    }
  }

  const handleAttachClient = async (clientId: string) => {
    await handleAction("attachClient", { clientId })
    setClientDialogOpen(false)
  }

  const handleDetachClient = async () => {
    await handleAction("detachClient", {})
  }

  const handleUpdateTags = async () => {
    await handleAction("updateTags", { tags: tagsValue })
    setEditingTags(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "#0064FA"
      case "open": return "#DCB40A"
      case "pending": return "#F0783C"
      case "resolved": return "#28B95F"
      case "closed": return "#999999"
      default: return "#999999"
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case "new": return "#E6F0FF"
      case "open": return "#FFF8E6"
      case "pending": return "#FFF0E6"
      case "resolved": return "#E6F9ED"
      case "closed": return "#F5F5F7"
      default: return "#F5F5F7"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new": return "Nouveau"
      case "open": return "Ouvert"
      case "pending": return "En attente"
      case "resolved": return "Résolu"
      case "closed": return "Fermé"
      default: return status
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "urgent": return "Urgente"
      case "high": return "Haute"
      case "normal": return "Normale"
      case "low": return "Basse"
      default: return priority
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "#F04B69"
      case "high": return "#F0783C"
      case "normal": return "#666666"
      case "low": return "#999999"
      default: return "#666666"
    }
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
  }

  // Clean HTML content for display
  const cleanHtmlContent = (html: string): string => {
    if (!html) return ""

    // Remove script tags
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

    // Remove style tags
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")

    // Remove meta tags
    cleaned = cleaned.replace(/<meta[^>]*>/gi, "")

    // Remove head section entirely
    cleaned = cleaned.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "")

    // Remove html and body tags but keep content
    cleaned = cleaned.replace(/<\/?html[^>]*>/gi, "")
    cleaned = cleaned.replace(/<\/?body[^>]*>/gi, "")

    // Remove onclick and other event handlers
    cleaned = cleaned.replace(/\s*on\w+="[^"]*"/gi, "")
    cleaned = cleaned.replace(/\s*on\w+='[^']*'/gi, "")

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n")
    cleaned = cleaned.trim()

    return cleaned
  }

  // Check if content looks like HTML
  const isHtmlContent = (content: string): boolean => {
    return /<[a-z][\s\S]*>/i.test(content)
  }

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  if (!ticket) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/tickets">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: "#F5F5F7", color: "#666666" }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
                Ticket #{ticket.ticketNumber}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: getStatusBg(ticket.status), color: getStatusColor(ticket.status) }}
              >
                {getStatusLabel(ticket.status)}
              </span>
              {ticket.priority !== "normal" && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: ticket.priority === "urgent" ? "#FEE2E8" : ticket.priority === "high" ? "#FFF0E6" : "#F5F5F7",
                    color: getPriorityColor(ticket.priority)
                  }}
                >
                  {ticket.priority === "urgent" && <Flame className="h-3 w-3" />}
                  {getPriorityLabel(ticket.priority)}
                </span>
              )}
            </div>
            <p className="text-sm mt-1" style={{ color: "#666666" }}>
              {ticket.subject}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <button
              onClick={() => handleAction("changeStatus", { status: "resolved" })}
              disabled={actionLoading}
              className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#28B95F" }}
            >
              <CheckCircle className="h-4 w-4" />
              Résoudre
            </button>
          )}

          {(ticket.status === "resolved" || ticket.status === "closed") && (
            <button
              onClick={() => handleAction("reopen")}
              disabled={actionLoading}
              className="h-10 px-4 rounded-xl font-medium flex items-center gap-2 transition-all hover:opacity-80"
              style={{ background: "#F5F5F7", color: "#666666", border: "1px solid #EEEEEE" }}
            >
              <RotateCcw className="h-4 w-4" />
              Réouvrir
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={actionLoading}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: "#F5F5F7", color: "#666666", border: "1px solid #EEEEEE" }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div
                  className="absolute right-0 top-12 w-48 rounded-xl py-2 z-50"
                  style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", border: "1px solid #EEEEEE" }}
                >
                  <button
                    onClick={() => { handleAction("changeStatus", { status: "open" }); setDropdownOpen(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50"
                    style={{ color: "#444444" }}
                  >
                    <Clock className="h-4 w-4" style={{ color: "#DCB40A" }} />
                    Marquer ouvert
                  </button>
                  <button
                    onClick={() => { handleAction("changeStatus", { status: "pending" }); setDropdownOpen(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50"
                    style={{ color: "#444444" }}
                  >
                    <AlertCircle className="h-4 w-4" style={{ color: "#F0783C" }} />
                    En attente
                  </button>
                  <button
                    onClick={() => { handleAction("changeStatus", { status: "closed" }); setDropdownOpen(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50"
                    style={{ color: "#444444" }}
                  >
                    <XCircle className="h-4 w-4" style={{ color: "#999999" }} />
                    Fermer
                  </button>
                  <div className="h-px my-2" style={{ background: "#EEEEEE" }} />
                  <button
                    onClick={() => { setDeleteDialogOpen(true); setDropdownOpen(false) }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-red-50"
                    style={{ color: "#F04B69" }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Messages Card */}
          <div className="rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" style={{ color: "#0064FA" }} />
                <h2 className="font-semibold" style={{ color: "#111111" }}>
                  Conversation ({ticket.messages.length})
                </h2>
              </div>
              <p className="text-sm" style={{ color: "#999999" }}>
                Créé le {formatShortDate(ticket.createdAt)}
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {ticket.messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3" style={{ color: "#DDDDDD" }} />
                  <p className="text-sm" style={{ color: "#999999" }}>Aucun message dans ce ticket.</p>
                </div>
              ) : (
                ticket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex gap-3"
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0"
                      style={{
                        background: msg.user ? "#5F00BA" : msg.clients ? "#0064FA" : "#999999"
                      }}
                    >
                      {msg.user
                        ? getInitials(msg.user.name)
                        : msg.clients
                        ? getInitials(msg.clients.companyName)
                        : getInitials(msg.from_name || msg.from_email || "?")}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: "#111111" }}>
                          {msg.user?.name || msg.clients?.companyName || msg.from_name || msg.from_email || "Client"}
                        </span>
                        <span className="text-xs" style={{ color: "#999999" }}>
                          {formatShortDate(msg.createdAt)}
                        </span>
                        {msg.user && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "#F3E8FF", color: "#5F00BA" }}
                          >
                            Agent
                          </span>
                        )}
                        {msg.isInternal && (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "#FFF8E6", color: "#DCB40A" }}
                          >
                            <Lock className="h-3 w-3" />
                            Note interne
                          </span>
                        )}
                      </div>

                      {isHtmlContent(msg.content) ? (
                        <div
                          className="text-sm p-3 rounded-xl prose prose-sm max-w-none"
                          style={{
                            background: msg.isInternal ? "#FFFBEB" : "#F5F5F7",
                            border: msg.isInternal ? "1px solid #FEF3C7" : "none",
                            color: "#444444"
                          }}
                          dangerouslySetInnerHTML={{ __html: cleanHtmlContent(msg.content) }}
                        />
                      ) : (
                        <div
                          className="whitespace-pre-wrap text-sm p-3 rounded-xl"
                          style={{
                            background: msg.isInternal ? "#FFFBEB" : "#F5F5F7",
                            border: msg.isInternal ? "1px solid #FEF3C7" : "none",
                            color: "#444444"
                          }}
                        >
                          {msg.content}
                        </div>
                      )}

                      {msg.ticket_attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.ticket_attachments.map((att) => (
                            <a
                              key={att.id}
                              href={`/api/attachments/${att.id}`}
                              className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg transition-all hover:opacity-80"
                              style={{ background: "#F5F5F7", color: "#444444" }}
                            >
                              <Paperclip className="h-3 w-3 mr-1.5" style={{ color: "#999999" }} />
                              {att.originalName}
                              <span className="ml-1.5" style={{ color: "#999999" }}>
                                ({Math.round(att.size / 1024)} Ko)
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            {ticket.status !== "closed" && (
              <div className="px-6 py-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                <div className="space-y-3">
                  <textarea
                    placeholder={isInternal ? "Ajouter une note interne..." : "Tapez votre réponse..."}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all focus:border-[#0064FA] focus:shadow-[0_0_0_3px_rgba(0,100,250,0.1)]"
                    style={inputStyle}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: "#DCB40A" }}
                      />
                      <span className="text-sm" style={{ color: "#666666" }}>
                        Note interne (non visible par le client)
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAiDialogOpen(true)}
                        disabled={aiLoading}
                        className="h-9 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: "#F3E8FF", color: "#5F00BA" }}
                      >
                        <Sparkles className="h-4 w-4" />
                        IA
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={sending || !replyContent.trim()}
                        className="h-9 px-4 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: "#0064FA" }}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {isInternal ? "Ajouter" : "Envoyer"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Details */}
          <div className="rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold" style={{ color: "#111111" }}>Détails</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#666666" }}>Statut</label>
                <div className="relative">
                  <select
                    value={ticket.status}
                    onChange={(e) => handleAction("changeStatus", { status: e.target.value })}
                    className="w-full h-10 px-3 pr-10 rounded-xl text-sm appearance-none cursor-pointer outline-none transition-all focus:border-[#0064FA]"
                    style={inputStyle}
                  >
                    <option value="new">Nouveau</option>
                    <option value="open">Ouvert</option>
                    <option value="pending">En attente</option>
                    <option value="resolved">Résolu</option>
                    <option value="closed">Fermé</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#999999" }} />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#666666" }}>Priorité</label>
                <div className="relative">
                  <select
                    value={ticket.priority}
                    onChange={(e) => handleAction("changePriority", { priority: e.target.value })}
                    className="w-full h-10 px-3 pr-10 rounded-xl text-sm appearance-none cursor-pointer outline-none transition-all focus:border-[#0064FA]"
                    style={inputStyle}
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#999999" }} />
                </div>
              </div>

              {/* Assigned */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#666666" }}>Assigné à</label>
                <div className="relative">
                  <select
                    value={ticket.assignee?.id || "none"}
                    onChange={(e) => handleAction("assign", { assignedTo: e.target.value === "none" ? null : e.target.value })}
                    className="w-full h-10 px-3 pr-10 rounded-xl text-sm appearance-none cursor-pointer outline-none transition-all focus:border-[#0064FA]"
                    style={inputStyle}
                  >
                    <option value="none">Non assigné</option>
                    <option value="1">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#999999" }} />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: "#666666" }}>
                  <Tag className="h-3 w-3" />
                  Tags
                </label>
                {editingTags ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagsValue}
                      onChange={(e) => setTagsValue(e.target.value)}
                      placeholder="tag1, tag2"
                      className="flex-1 h-10 px-3 rounded-xl text-sm outline-none transition-all focus:border-[#0064FA]"
                      style={inputStyle}
                    />
                    <button
                      onClick={handleUpdateTags}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ background: "#28B95F" }}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingTags(true)}
                    className="p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-100 min-h-[42px]"
                    style={{ background: "#F5F5F7" }}
                  >
                    {ticket.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags.split(",").map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#666666" }}
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "#999999" }}>Cliquer pour ajouter</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold" style={{ color: "#111111" }}>Contact</h3>
            </div>
            <div className="p-6">
              {ticket.client ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "#E6F0FF" }}
                      >
                        <Building className="h-4 w-4" style={{ color: "#0064FA" }} />
                      </div>
                      <Link href={`/clients/${ticket.client.id}`} className="font-medium text-sm hover:underline" style={{ color: "#0064FA" }}>
                        {ticket.client.companyName}
                      </Link>
                    </div>
                    <button
                      onClick={handleDetachClient}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
                      style={{ color: "#F04B69" }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" style={{ color: "#999999" }} />
                      <a href={`mailto:${ticket.client.email}`} className="hover:underline" style={{ color: "#444444" }}>
                        {ticket.client.email}
                      </a>
                    </div>
                    {ticket.client.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" style={{ color: "#999999" }} />
                        <a href={`tel:${ticket.client.phone}`} className="hover:underline" style={{ color: "#444444" }}>
                          {ticket.client.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {ticket.senderEmail && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: "#F5F5F7" }}
                        >
                          <User className="h-4 w-4" style={{ color: "#666666" }} />
                        </div>
                        <span className="font-medium text-sm" style={{ color: "#111111" }}>
                          {ticket.senderName || "Expéditeur"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm pl-10">
                        <Mail className="h-4 w-4" style={{ color: "#999999" }} />
                        <span style={{ color: "#444444" }}>{ticket.senderEmail}</span>
                      </div>
                    </div>
                  )}
                  <button
                    className="w-full h-9 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "#F5F5F7", color: "#666666", border: "1px dashed #CCCCCC" }}
                    onClick={() => setClientDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Associer un client
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Reminders */}
          <div className="rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold flex items-center gap-2" style={{ color: "#111111" }}>
                <Bell className="h-4 w-4" style={{ color: "#F0783C" }} />
                Rappels
              </h3>
            </div>
            <div className="p-6">
              <button
                className="w-full h-9 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666", border: "1px dashed #CCCCCC" }}
                onClick={() => setReminderDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Ajouter un rappel
              </button>
              <p className="text-xs text-center mt-3" style={{ color: "#999999" }}>Aucun rappel programmé</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold flex items-center gap-2" style={{ color: "#111111" }}>
                <Clock className="h-4 w-4" style={{ color: "#0064FA" }} />
                Timeline
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#0064FA" }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "#999999" }}>Créé</p>
                    <p className="text-sm font-medium" style={{ color: "#111111" }}>{formatShortDate(ticket.createdAt)}</p>
                  </div>
                </div>

                {ticket.firstResponseAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: "#5F00BA" }} />
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: "#999999" }}>Première réponse</p>
                      <p className="text-sm font-medium" style={{ color: "#111111" }}>{formatShortDate(ticket.firstResponseAt)}</p>
                    </div>
                  </div>
                )}

                {ticket.resolvedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: "#28B95F" }} />
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: "#999999" }}>Résolu</p>
                      <p className="text-sm font-medium" style={{ color: "#111111" }}>{formatShortDate(ticket.resolvedAt)}</p>
                    </div>
                  </div>
                )}

                {ticket.closedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: "#999999" }} />
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: "#999999" }}>Fermé</p>
                      <p className="text-sm font-medium" style={{ color: "#111111" }}>{formatShortDate(ticket.closedAt)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#F0783C" }} />
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "#999999" }}>Dernière activité</p>
                    <p className="text-sm font-medium" style={{ color: "#111111" }}>{formatShortDate(ticket.lastActivityAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEE2E8" }}>
                <Trash2 className="h-5 w-5" style={{ color: "#F04B69" }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>Supprimer le ticket</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Êtes-vous sûr de vouloir supprimer ce ticket et tous ses messages ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="h-10 px-4 rounded-xl font-medium transition-all hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#F04B69" }}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Options Dialog */}
      {aiDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            className="w-full max-w-lg rounded-2xl"
            style={{ background: "#FFFFFF", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: "#5F00BA" }} />
                <h3 className="font-semibold" style={{ color: "#111111" }}>Générer avec IA</h3>
              </div>
              <button
                onClick={() => setAiDialogOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
                style={{ color: "#666666" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>Informations supplémentaires</label>
                <textarea
                  value={aiAdditionalInfo}
                  onChange={(e) => setAiAdditionalInfo(e.target.value)}
                  placeholder="Ex: Le client utilise la version 2.5.1..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all focus:border-[#0064FA]"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>Instructions</label>
                <textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Ex: Répondre en français formel..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all focus:border-[#0064FA]"
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={() => setAiDialogOpen(false)}
                className="h-10 px-4 rounded-xl font-medium transition-all hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateAI}
                disabled={aiLoading}
                className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#5F00BA" }}
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? "Génération..." : "Générer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Selection Dialog */}
      {clientDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            className="w-full max-w-md rounded-2xl"
            style={{ background: "#FFFFFF", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold" style={{ color: "#111111" }}>Associer un client</h3>
              <button
                onClick={() => setClientDialogOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
                style={{ color: "#666666" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleAttachClient(client.id)}
                  className="p-3 rounded-xl cursor-pointer transition-colors hover:bg-blue-50"
                  style={{ border: "1px solid #EEEEEE" }}
                >
                  <p className="font-medium text-sm" style={{ color: "#111111" }}>{client.companyName}</p>
                  <p className="text-xs" style={{ color: "#999999" }}>{client.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reminder Dialog */}
      {reminderDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            className="w-full max-w-md rounded-2xl"
            style={{ background: "#FFFFFF", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" style={{ color: "#F0783C" }} />
                <h3 className="font-semibold" style={{ color: "#111111" }}>Ajouter un rappel</h3>
              </div>
              <button
                onClick={() => setReminderDialogOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
                style={{ color: "#666666" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>Date et heure</label>
                <input
                  type="datetime-local"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none transition-all focus:border-[#0064FA]"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>Note (optionnel)</label>
                <input
                  type="text"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="Ex: Relancer le client"
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none transition-all focus:border-[#0064FA]"
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={() => setReminderDialogOpen(false)}
                className="h-10 px-4 rounded-xl font-medium transition-all hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Annuler
              </button>
              <button
                className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90"
                style={{ background: "#F0783C" }}
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
