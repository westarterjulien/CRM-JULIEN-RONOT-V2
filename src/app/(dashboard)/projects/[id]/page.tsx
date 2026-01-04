"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar,
  Users,
  X,
  Check,
  CheckSquare,
  MessageSquare,
  Paperclip,
  LayoutGrid,
  List,
  Filter,
  Search,
  Star,
  Settings,
  Share2,
  StickyNote,
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import CardDetailModal from "@/components/projects/CardDetailModal"

interface Card {
  id: string
  title: string
  description: string | null
  position: number
  priority: "low" | "medium" | "high" | "urgent"
  labels: string | null
  dueDate: string | null
  client: { id: string; companyName: string } | null
  assignee: { id: string; name: string } | null
  isCompleted: boolean
  subtasks?: { id: string; isCompleted: boolean }[]
  comments?: { id: string }[]
  attachments?: { id: string }[]
  cardLabels?: { id: string; name: string; color: string }[]
}

interface Column {
  id: string
  name: string
  color: string
  position: number
  cards: Card[]
}

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  client: { id: string; companyName: string } | null
  columns: Column[]
}

const priorityConfig = {
  low: { bg: "#F3F4F6", text: "#6B7280", label: "Basse" },
  medium: { bg: "#DBEAFE", text: "#2563EB", label: "Moyenne" },
  high: { bg: "#FED7AA", text: "#EA580C", label: "Haute" },
  urgent: { bg: "#FECACA", text: "#DC2626", label: "Urgente" },
}

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"board" | "list">("board")
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterPriority, setFilterPriority] = useState<string>("")
  const [filterAssignee, setFilterAssignee] = useState<string>("")

  // Drag state
  const [draggedCard, setDraggedCard] = useState<Card | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)

  // Forms
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState("")
  const [creatingCard, setCreatingCard] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Edit project modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editClientId, setEditClientId] = useState<string>("")
  const [editClientName, setEditClientName] = useState<string>("")
  const [clients, setClients] = useState<{id: string; companyName: string}[]>([])
  const [savingProject, setSavingProject] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  useEffect(() => {
    fetchProject()
  }, [resolvedParams.id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setProject({
          ...data,
          id: String(data.id),
          columns: data.columns.map((col: any) => ({
            ...col,
            id: String(col.id),
            cards: col.cards.map((card: any) => ({
              ...card,
              id: String(card.id),
              client: card.client ? { ...card.client, id: String(card.client.id) } : null,
              assignee: card.assignee ? { ...card.assignee, id: String(card.assignee.id) } : null,
            })),
          })),
        })
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients?limit=100")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients?.map((c: any) => ({ id: String(c.id), companyName: c.companyName })) || [])
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const openEditModal = () => {
    if (!project) return
    setEditName(project.name)
    setEditDescription(project.description || "")
    setEditColor(project.color)
    setEditClientId(project.client?.id || "")
    setEditClientName(project.client?.companyName || "")
    setClientSearch("")
    setShowClientDropdown(false)
    fetchClients()
    setShowEditModal(true)
  }

  const filteredClients = clients.filter(c =>
    c.companyName.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const selectClient = (client: {id: string; companyName: string} | null) => {
    if (client) {
      setEditClientId(client.id)
      setEditClientName(client.companyName)
    } else {
      setEditClientId("")
      setEditClientName("")
    }
    setClientSearch("")
    setShowClientDropdown(false)
  }

  const saveProject = async () => {
    if (!editName.trim()) return
    setSavingProject(true)
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          color: editColor,
          clientId: editClientId || null,
        }),
      })
      if (res.ok) {
        fetchProject()
        setShowEditModal(false)
      }
    } catch (error) {
      console.error("Error saving project:", error)
    } finally {
      setSavingProject(false)
    }
  }

  const deleteProject = async () => {
    if (!confirm("Supprimer ce projet et toutes ses taches ?")) return
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        router.push("/projects")
      }
    } catch (error) {
      console.error("Error deleting project:", error)
    }
  }

  const createCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return
    setCreatingCard(true)
    try {
      const res = await fetch("/api/projects/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, title: newCardTitle.trim() }),
      })
      if (res.ok) {
        setNewCardTitle("")
        setAddingCardToColumn(null)
        fetchProject()
      }
    } catch (error) {
      console.error("Error creating card:", error)
    } finally {
      setCreatingCard(false)
    }
  }

  const createColumn = async () => {
    if (!newColumnName.trim()) return
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newColumnName.trim() }),
      })
      if (res.ok) {
        setNewColumnName("")
        setAddingColumn(false)
        fetchProject()
      }
    } catch (error) {
      console.error("Error creating column:", error)
    }
  }

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Supprimer cette colonne et toutes ses taches ?")) return
    try {
      const res = await fetch(`/api/projects/columns/${columnId}`, { method: "DELETE" })
      if (res.ok) fetchProject()
      else {
        const data = await res.json()
        alert(data.error || "Erreur")
      }
    } catch (error) {
      console.error("Error deleting column:", error)
    }
  }

  const deleteCard = async (cardId: string) => {
    if (!confirm("Supprimer cette tache ?")) return
    try {
      await fetch(`/api/projects/cards/${cardId}`, { method: "DELETE" })
      fetchProject()
    } catch (error) {
      console.error("Error deleting card:", error)
    }
  }

  const updateCard = async (cardId: string, data: Partial<Card>) => {
    try {
      await fetch(`/api/projects/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      fetchProject()
    } catch (error) {
      console.error("Error updating card:", error)
    }
  }

  const moveCard = async (cardId: string, columnId: string, position: number) => {
    try {
      await fetch(`/api/projects/cards/${cardId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, position }),
      })
      fetchProject()
    } catch (error) {
      console.error("Error moving card:", error)
    }
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, card: Card) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, columnId: string, position: number) => {
    e.preventDefault()
    setDragOverColumn(columnId)
    setDragOverPosition(position)
  }

  const handleDrop = async (e: React.DragEvent, columnId: string, position: number) => {
    e.preventDefault()
    if (!draggedCard) return
    await moveCard(draggedCard.id, columnId, position)
    setDraggedCard(null)
    setDragOverColumn(null)
    setDragOverPosition(null)
  }

  const handleDragEnd = () => {
    setDraggedCard(null)
    setDragOverColumn(null)
    setDragOverPosition(null)
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getSubtaskProgress = (card: Card) => {
    if (!card.subtasks || card.subtasks.length === 0) return null
    const completed = card.subtasks.filter(s => s.isCompleted).length
    return { completed, total: card.subtasks.length }
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  // Filter cards
  const filterCards = (cards: Card[]) => {
    return cards.filter(card => {
      if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filterPriority && card.priority !== filterPriority) return false
      if (filterAssignee && card.assignee?.id !== filterAssignee) return false
      return true
    })
  }

  // Get all unique assignees
  const getAllAssignees = () => {
    if (!project) return []
    const assignees = new Map<string, { id: string; name: string }>()
    project.columns.forEach(col => {
      col.cards.forEach(card => {
        if (card.assignee) assignees.set(card.assignee.id, card.assignee)
      })
    })
    return Array.from(assignees.values())
  }

  // Stats
  const getStats = () => {
    if (!project) return { total: 0, completed: 0, overdue: 0 }
    let total = 0, completed = 0, overdue = 0
    project.columns.forEach(col => {
      col.cards.forEach(card => {
        total++
        if (card.isCompleted) completed++
        if (isOverdue(card.dueDate) && !card.isCompleted) overdue++
      })
    })
    return { total, completed, overdue }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0064FA]" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 text-lg">Projet non trouve</p>
        <button onClick={() => router.push("/projects")} className="mt-4 text-[#0064FA] hover:underline">
          Retour aux projets
        </button>
      </div>
    )
  }

  const stats = getStats()
  const assignees = getAllAssignees()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header with project color */}
      <div
        className="relative"
        style={{
          background: `linear-gradient(135deg, ${project.color}15 0%, ${project.color}05 100%)`,
          borderBottom: `3px solid ${project.color}`,
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/projects")}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                style={{ backgroundColor: project.color }}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                {project.client && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {project.client.companyName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats badges */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-gray-700">{stats.total} taches</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-gray-700">{stats.completed} terminees</span>
              </div>
              {stats.overdue > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-600">{stats.overdue} en retard</span>
                </div>
              )}
            </div>

            {/* Members avatars */}
            {assignees.length > 0 && (
              <div className="flex -space-x-2 mr-2">
                {assignees.slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className="w-8 h-8 rounded-full bg-[#0064FA] border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                    title={a.name}
                  >
                    {getInitials(a.name)}
                  </div>
                ))}
                {assignees.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium">
                    +{assignees.length - 4}
                  </div>
                )}
              </div>
            )}

            <Link
              href={`/notes?entityType=project&entityId=${resolvedParams.id}`}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              title="Notes du projet"
            >
              <StickyNote className="h-5 w-5 text-gray-400" />
            </Link>
            <button className="p-2 hover:bg-white/50 rounded-lg transition-colors" title="Favoris">
              <Star className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-white/50 rounded-lg transition-colors" title="Partager">
              <Share2 className="h-5 w-5 text-gray-400" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                  <Settings className="h-5 w-5 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openEditModal}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier le projet
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={deleteProject} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-2 bg-white/50">
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode("board")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "board"
                    ? "bg-[#0064FA] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-[#0064FA] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <List className="h-4 w-4" />
                Liste
              </button>
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters || filterPriority || filterAssignee
                  ? "bg-[#0064FA] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 shadow-sm"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtres
              {(filterPriority || filterAssignee) && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {[filterPriority, filterAssignee].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une tache..."
              className="w-64 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Priorite:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0064FA] outline-none"
              >
                <option value="">Toutes</option>
                <option value="urgent">Urgente</option>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Assigne a:</span>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0064FA] outline-none"
              >
                <option value="">Tous</option>
                {assignees.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            {(filterPriority || filterAssignee) && (
              <button
                onClick={() => { setFilterPriority(""); setFilterAssignee("") }}
                className="text-sm text-[#0064FA] hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Board / List content */}
      {viewMode === "board" ? (
        <div className="flex-1 overflow-x-auto px-4 py-3">
          <div className="flex gap-3 h-full">
            {project.columns.map((column) => {
              const filteredCards = filterCards(column.cards)

              return (
                <div
                  key={column.id}
                  className="flex flex-col w-72 flex-shrink-0 bg-slate-100 rounded-lg"
                  onDragOver={(e) => handleDragOver(e, column.id, filteredCards.length)}
                  onDrop={(e) => handleDrop(e, column.id, filteredCards.length)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                      <h3 className="font-semibold text-gray-800">{column.name}</h3>
                      <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full font-medium">
                        {filteredCards.length}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => deleteColumn(column.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer la colonne
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredCards.map((card, index) => {
                      const subtaskProgress = getSubtaskProgress(card)
                      const overdue = isOverdue(card.dueDate) && !card.isCompleted

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, column.id, index)}
                          onDrop={(e) => handleDrop(e, column.id, index)}
                          onClick={() => setSelectedCardId(card.id)}
                          className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-all group ${
                            draggedCard?.id === card.id ? "opacity-50 rotate-2" : ""
                          } ${
                            dragOverColumn === column.id && dragOverPosition === index
                              ? "ring-2 ring-[#0064FA] ring-dashed"
                              : overdue ? "ring-1 ring-red-300" : ""
                          }`}
                        >
                          {/* Labels */}
                          {card.cardLabels && card.cardLabels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {card.cardLabels.map((label) => (
                                <span
                                  key={label.id}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                                  style={{ backgroundColor: label.color }}
                                >
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Title */}
                          <p className={`text-sm font-medium mb-2 ${
                            card.isCompleted ? "line-through text-gray-400" : "text-gray-800"
                          }`}>
                            {card.title}
                          </p>

                          {/* Meta badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Priority */}
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                backgroundColor: priorityConfig[card.priority].bg,
                                color: priorityConfig[card.priority].text,
                              }}
                            >
                              {priorityConfig[card.priority].label}
                            </span>

                            {/* Due date */}
                            {card.dueDate && (
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                overdue ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                              }`}>
                                <Calendar className="h-3 w-3" />
                                {new Date(card.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </span>
                            )}

                            {/* Subtasks */}
                            {subtaskProgress && (
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                subtaskProgress.completed === subtaskProgress.total
                                  ? "bg-green-100 text-green-600"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                <CheckSquare className="h-3 w-3" />
                                {subtaskProgress.completed}/{subtaskProgress.total}
                              </span>
                            )}

                            {/* Comments */}
                            {card.comments && card.comments.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <MessageSquare className="h-3 w-3" />
                                {card.comments.length}
                              </span>
                            )}

                            {/* Attachments */}
                            {card.attachments && card.attachments.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Paperclip className="h-3 w-3" />
                                {card.attachments.length}
                              </span>
                            )}
                          </div>

                          {/* Footer */}
                          {(card.assignee || card.client) && (
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                              {card.assignee ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full bg-[#0064FA] flex items-center justify-center text-white text-[10px] font-bold">
                                    {getInitials(card.assignee.name)}
                                  </div>
                                  <span className="text-xs text-gray-500">{card.assignee.name.split(" ")[0]}</span>
                                </div>
                              ) : <div />}
                              {card.client && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {card.client.companyName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Drop indicator */}
                    {dragOverColumn === column.id && dragOverPosition === filteredCards.length && (
                      <div className="h-1 bg-[#0064FA] rounded-full mx-2" />
                    )}

                    {/* Add card */}
                    {addingCardToColumn === column.id ? (
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <textarea
                          value={newCardTitle}
                          onChange={(e) => setNewCardTitle(e.target.value)}
                          placeholder="Titre de la tache..."
                          className="w-full text-sm border-none outline-none bg-transparent text-gray-800 resize-none"
                          rows={2}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              createCard(column.id)
                            }
                            if (e.key === "Escape") {
                              setAddingCardToColumn(null)
                              setNewCardTitle("")
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => createCard(column.id)}
                            disabled={creatingCard || !newCardTitle.trim()}
                            className="px-3 py-1.5 bg-[#0064FA] text-white text-xs rounded-lg font-medium hover:bg-[#0052CC] disabled:opacity-50"
                          >
                            Ajouter
                          </button>
                          <button
                            onClick={() => { setAddingCardToColumn(null); setNewCardTitle("") }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                          >
                            <X className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingCardToColumn(column.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter une tache
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add column */}
            {addingColumn ? (
              <div className="w-72 flex-shrink-0 bg-gray-50 rounded-xl p-3 shadow-sm h-fit">
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Nom de la colonne..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#0064FA] bg-white"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createColumn()
                    if (e.key === "Escape") { setAddingColumn(false); setNewColumnName("") }
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={createColumn}
                    disabled={!newColumnName.trim()}
                    className="px-3 py-1.5 bg-[#0064FA] text-white text-sm rounded-lg font-medium hover:bg-[#0052CC] disabled:opacity-50"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => { setAddingColumn(false); setNewColumnName("") }}
                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="w-72 flex-shrink-0 h-12 flex items-center justify-center gap-2 bg-white/50 hover:bg-white rounded-xl text-gray-500 text-sm font-medium transition-all border-2 border-dashed border-gray-300 hover:border-[#0064FA] hover:text-[#0064FA]"
              >
                <Plus className="h-4 w-4" />
                Ajouter une colonne
              </button>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tache</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Colonne</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Priorite</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Assigne</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Echeance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progression</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.columns.flatMap(column =>
                  filterCards(column.cards).map(card => {
                    const subtaskProgress = getSubtaskProgress(card)
                    const overdue = isOverdue(card.dueDate) && !card.isCompleted

                    return (
                      <tr
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className="hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateCard(card.id, { isCompleted: !card.isCompleted })
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                card.isCompleted
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-gray-300 hover:border-[#0064FA]"
                              }`}
                            >
                              {card.isCompleted && <Check className="h-3 w-3" />}
                            </button>
                            <div>
                              <p className={`font-medium ${card.isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}>
                                {card.title}
                              </p>
                              {card.cardLabels && card.cardLabels.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {card.cardLabels.map(l => (
                                    <span key={l.id} className="px-1.5 py-0.5 rounded text-[10px] text-white" style={{ backgroundColor: l.color }}>
                                      {l.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-sm text-gray-600">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                            {column.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-1 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: priorityConfig[card.priority].bg,
                              color: priorityConfig[card.priority].text,
                            }}
                          >
                            {priorityConfig[card.priority].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {card.assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#0064FA] flex items-center justify-center text-white text-[10px] font-bold">
                                {getInitials(card.assignee.name)}
                              </div>
                              <span className="text-sm text-gray-600">{card.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {card.dueDate ? (
                            <span className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                              {new Date(card.dueDate).toLocaleDateString("fr-FR")}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {subtaskProgress ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${(subtaskProgress.completed / subtaskProgress.total) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {subtaskProgress.completed}/{subtaskProgress.total}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <button className="p-1 hover:bg-gray-200 rounded">
                                <MoreHorizontal className="h-4 w-4 text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedCardId(card.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Ouvrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteCard(card.id)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            {project.columns.every(c => filterCards(c.cards).length === 0) && (
              <div className="py-12 text-center text-gray-400">
                Aucune tache trouvee
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card detail modal */}
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          projectId={resolvedParams.id}
          onClose={() => setSelectedCardId(null)}
          onUpdate={fetchProject}
          onDelete={() => { fetchProject(); setSelectedCardId(null) }}
        />
      )}

      {/* Edit project modal */}
      {showEditModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-50 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Modifier le projet</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du projet</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none"
                  placeholder="Nom du projet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="Description du projet..."
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <div className="relative">
                  <div
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg flex items-center justify-between cursor-pointer hover:border-gray-300"
                    onClick={() => setShowClientDropdown(!showClientDropdown)}
                  >
                    <span className={editClientName ? "text-gray-900" : "text-gray-400"}>
                      {editClientName || "Aucun client"}
                    </span>
                    <Users className="h-4 w-4 text-gray-400" />
                  </div>

                  {showClientDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            placeholder="Rechercher un client..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          onClick={() => selectClient(null)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            !editClientId ? "bg-[#0064FA]/5 text-[#0064FA]" : "text-gray-600"
                          }`}
                        >
                          Aucun client
                        </button>
                        {filteredClients.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-400 text-center">
                            Aucun client trouve
                          </div>
                        ) : (
                          filteredClients.map((client) => (
                            <button
                              key={client.id}
                              onClick={() => selectClient(client)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                editClientId === client.id ? "bg-[#0064FA]/5 text-[#0064FA]" : "text-gray-700"
                              }`}
                            >
                              <div className="w-6 h-6 rounded-full bg-[#0064FA] flex items-center justify-center text-white text-xs font-medium">
                                {client.companyName.charAt(0).toUpperCase()}
                              </div>
                              {client.companyName}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {editClientId && (
                  <button
                    onClick={() => selectClient(null)}
                    className="absolute right-10 top-[34px] text-gray-400 hover:text-gray-600"
                    title="Retirer le client"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2">
                  {["#0064FA", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        editColor === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Annuler
              </button>
              <button
                onClick={saveProject}
                disabled={savingProject || !editName.trim()}
                className="px-4 py-2 bg-[#0064FA] text-white rounded-lg font-medium hover:bg-[#0052CC] disabled:opacity-50"
              >
                {savingProject ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
