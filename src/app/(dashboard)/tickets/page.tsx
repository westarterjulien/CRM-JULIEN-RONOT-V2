"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Settings,
  Inbox,
  Sparkles,
  Flame,
  Zap,
  CircleDot,
} from "lucide-react"

interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  senderEmail: string
  senderName: string | null
  status: string
  priority: string
  responseCount: number
  messageCount: number
  createdAt: string | null
  lastActivityAt: string | null
  client: {
    id: string
    companyName: string
  } | null
  assignee: {
    id: string
    name: string
  } | null
}

interface Stats {
  new: number
  open: number
  pending: number
  resolved: number
  total: number
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats>({
    new: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
      if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter)
      params.append("page", page.toString())
      params.append("limit", "20")

      const res = await fetch(`/api/tickets?${params}`)
      const data = await res.json()
      setTickets(data.tickets || [])
      setStats(data.stats || { new: 0, open: 0, pending: 0, resolved: 0, total: 0 })
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, priorityFilter, page])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenuId])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteConfirm(null)
        fetchTickets()
      }
    } catch (error) {
      console.error("Error deleting ticket:", error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return "Il y a quelques minutes"
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`

    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    })
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "new":
        return {
          label: "Nouveau",
          icon: <Sparkles className="h-3 w-3" />,
          bg: "#E3F2FD",
          color: "#0064FA",
          dot: "#0064FA"
        }
      case "open":
        return {
          label: "Ouvert",
          icon: <CircleDot className="h-3 w-3" />,
          bg: "#FEF3CD",
          color: "#DCB40A",
          dot: "#DCB40A"
        }
      case "pending":
        return {
          label: "En attente",
          icon: <Clock className="h-3 w-3" />,
          bg: "#F5F5F7",
          color: "#666666",
          dot: "#999999"
        }
      case "resolved":
        return {
          label: "Résolu",
          icon: <CheckCircle className="h-3 w-3" />,
          bg: "#D4EDDA",
          color: "#28B95F",
          dot: "#28B95F"
        }
      case "closed":
        return {
          label: "Fermé",
          icon: <XCircle className="h-3 w-3" />,
          bg: "#F5F5F7",
          color: "#999999",
          dot: "#CCCCCC"
        }
      default:
        return {
          label: status,
          icon: null,
          bg: "#F5F5F7",
          color: "#666666",
          dot: "#999999"
        }
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          label: "Urgent",
          icon: <Flame className="h-3 w-3" />,
          bg: "#FEE2E8",
          color: "#F04B69"
        }
      case "high":
        return {
          label: "Haute",
          icon: <Zap className="h-3 w-3" />,
          bg: "#FEF3CD",
          color: "#F0783C"
        }
      case "normal":
        return {
          label: "Normale",
          icon: null,
          bg: "#F5F5F7",
          color: "#666666"
        }
      case "low":
        return {
          label: "Basse",
          icon: null,
          bg: "#F5F5F7",
          color: "#999999"
        }
      default:
        return {
          label: priority,
          icon: null,
          bg: "#F5F5F7",
          color: "#666666"
        }
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = ["#5F00BA", "#0064FA", "#28B95F", "#F0783C", "#F04B69", "#14B4E6"]
    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  const statCards = [
    { id: "all", label: "Total", value: stats.total, icon: MessageSquare, bg: "#F5F5F7", color: "#666666" },
    { id: "new", label: "Nouveaux", value: stats.new, icon: Sparkles, bg: "#E3F2FD", color: "#0064FA" },
    { id: "open", label: "Ouverts", value: stats.open, icon: AlertCircle, bg: "#FEF3CD", color: "#DCB40A" },
    { id: "pending", label: "En attente", value: stats.pending, icon: Clock, bg: "#F5F5F7", color: "#666666" },
    { id: "resolved", label: "Résolus", value: stats.resolved, icon: CheckCircle, bg: "#D4EDDA", color: "#28B95F" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#F0783C" }}
            >
              <Inbox className="h-7 w-7" style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
                Support
              </h1>
              <p className="text-sm" style={{ color: "#666666" }}>
                Gérez les tickets de support client
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings?tab=integrations"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[#EEEEEE]"
              style={{ background: "#F5F5F7", color: "#444444" }}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Intégrations</span>
            </Link>
            <Link
              href="/tickets/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "#F0783C", color: "#FFFFFF" }}
            >
              <Plus className="h-4 w-4" />
              Nouveau ticket
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const isActive = statusFilter === card.id
          return (
            <button
              key={card.id}
              onClick={() => setStatusFilter(card.id)}
              className="relative rounded-2xl p-4 text-left transition-all hover:shadow-md"
              style={{
                background: "#FFFFFF",
                boxShadow: isActive
                  ? `0 0 0 2px ${card.color}, 0 4px 12px rgba(0,0,0,0.08)`
                  : "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: card.bg }}
                >
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                {card.id === "new" && stats.new > 0 && (
                  <span
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ background: "#0064FA" }}
                  />
                )}
              </div>
              <p className="text-sm font-medium" style={{ color: "#666666" }}>
                {card.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: card.color }}>
                {card.value}
              </p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: "#999999" }}
            />
            <input
              type="text"
              placeholder="Rechercher par numéro, sujet, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{
                background: "#F5F5F7",
                border: "1px solid #EEEEEE",
                color: "#111111",
              }}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#444444" }}
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouveau</option>
              <option value="open">Ouvert</option>
              <option value="pending">En attente</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#444444" }}
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">Urgent</option>
              <option value="high">Haute</option>
              <option value="normal">Normale</option>
              <option value="low">Basse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
              style={{ borderColor: "#EEEEEE", borderTopColor: "#F0783C" }}
            />
            <p style={{ color: "#666666" }}>Chargement des tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#FEF3CD" }}
            >
              <Inbox className="h-8 w-8" style={{ color: "#F0783C" }} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: "#111111" }}>
              Aucun ticket
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Les tickets de support apparaîtront ici
            </p>
            <Link
              href="/tickets/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "#F0783C", color: "#FFFFFF" }}
            >
              <Plus className="h-4 w-4" />
              Créer un ticket
            </Link>
          </div>
        ) : (
          <div>
            {tickets.map((ticket, index) => {
              const statusConfig = getStatusConfig(ticket.status)
              const priorityConfig = getPriorityConfig(ticket.priority)

              return (
                <div
                  key={ticket.id}
                  className="p-4 transition-all hover:bg-[#F5F5F7] group"
                  style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                >
                  <div className="flex items-start gap-4">
                    {/* Status indicator */}
                    <div className="relative mt-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: statusConfig.dot }}
                      />
                      {ticket.status === "new" && (
                        <div
                          className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping"
                          style={{ background: statusConfig.dot }}
                        />
                      )}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Link
                              href={`/tickets/${ticket.id}`}
                              className="font-semibold transition-colors hover:opacity-80"
                              style={{ color: "#111111" }}
                            >
                              {ticket.subject}
                            </Link>
                            {(ticket.priority === "urgent" || ticket.priority === "high") && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: priorityConfig.bg, color: priorityConfig.color }}
                              >
                                {priorityConfig.icon}
                                {priorityConfig.label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-sm flex-wrap" style={{ color: "#666666" }}>
                            <span
                              className="font-mono text-xs px-2 py-0.5 rounded"
                              style={{ background: "#F5F5F7", color: "#666666" }}
                            >
                              {ticket.ticketNumber}
                            </span>
                            <span className="truncate">
                              {ticket.client ? (
                                <Link
                                  href={`/clients/${ticket.client.id}`}
                                  className="hover:underline"
                                  style={{ color: "#0064FA" }}
                                >
                                  {ticket.client.companyName}
                                </Link>
                              ) : (
                                ticket.senderName || ticket.senderEmail
                              )}
                            </span>
                            <span className="hidden sm:inline" style={{ color: "#999999" }}>
                              {formatDate(ticket.lastActivityAt || ticket.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                          {/* Messages count */}
                          <div
                            className="hidden sm:flex items-center gap-1.5"
                            style={{ color: "#666666" }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-sm font-medium">{ticket.messageCount}</span>
                          </div>

                          {/* Status badge */}
                          <span
                            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: statusConfig.bg, color: statusConfig.color }}
                          >
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>

                          {/* Assignee */}
                          {ticket.assignee && (
                            <div
                              className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-white text-xs font-medium"
                              style={{ background: getAvatarColor(ticket.assignee.name) }}
                              title={ticket.assignee.name}
                            >
                              {getInitials(ticket.assignee.name)}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(openMenuId === ticket.id ? null : ticket.id)
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-[#EEEEEE]"
                            >
                              <MoreHorizontal className="h-4 w-4" style={{ color: "#666666" }} />
                            </button>
                            {openMenuId === ticket.id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-48 rounded-xl py-2 z-10"
                                style={{
                                  background: "#FFFFFF",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                  border: "1px solid #EEEEEE",
                                }}
                              >
                                <Link
                                  href={`/tickets/${ticket.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7]"
                                  style={{ color: "#444444" }}
                                >
                                  <Eye className="h-4 w-4" />
                                  Voir le ticket
                                </Link>
                                <Link
                                  href={`/tickets/${ticket.id}/edit`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7]"
                                  style={{ color: "#444444" }}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Modifier
                                </Link>
                                <div className="my-1" style={{ borderTop: "1px solid #EEEEEE" }} />
                                <button
                                  onClick={() => setDeleteConfirm(ticket.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#FEE2E8] text-left"
                                  style={{ color: "#F04B69" }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between p-4"
            style={{ borderTop: "1px solid #EEEEEE", background: "#F5F5F7" }}
          >
            <p className="text-sm" style={{ color: "#666666" }}>
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "#FFFFFF", color: "#444444", border: "1px solid #EEEEEE" }}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "#FFFFFF", color: "#444444", border: "1px solid #EEEEEE" }}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setDeleteConfirm(null)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 16px 48px rgba(0,0,0,0.16)" }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#FEE2E8" }}
            >
              <Trash2 className="h-6 w-6" style={{ color: "#F04B69" }} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-2" style={{ color: "#111111" }}>
              Supprimer ce ticket ?
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: "#666666" }}>
              Cette action est irréversible. Le ticket et tous ses messages seront supprimés définitivement.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "#F04B69", color: "#FFFFFF" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
