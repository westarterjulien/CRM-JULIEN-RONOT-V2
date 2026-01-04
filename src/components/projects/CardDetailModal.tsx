"use client"

import { useState, useEffect } from "react"
import {
  X, Calendar, Clock, User, Tag, Paperclip, MessageSquare,
  CheckSquare, Flag, Building2, MoreHorizontal, Trash2, Edit3,
  Save, Plus
} from "lucide-react"
import { StyledSelect } from "@/components/ui/styled-select"
import SubtaskList from "./SubtaskList"
import CommentSection from "./CommentSection"
import AttachmentList from "./AttachmentList"
import LabelSelector from "./LabelSelector"

interface CardDetail {
  id: string
  title: string
  description: string | null
  priority: string
  dueDate: string | null
  startDate: string | null
  estimatedHours: number | null
  actualHours: number | null
  isCompleted: boolean
  assigneeId: string | null
  clientId: string | null
  assignee: { id: string; name: string } | null
  client: { id: string; companyName: string } | null
  column: {
    id: string
    name: string
    projectId: string
    project: { id: string; name: string }
  }
  subtasks: any[]
  comments: any[]
  attachments: any[]
  cardLabels: any[]
}

interface User {
  id: string
  name: string
}

interface Label {
  id: string
  name: string
  color: string
}

interface CardDetailModalProps {
  cardId: string
  projectId: string
  onClose: () => void
  onUpdate: () => void
  onDelete?: () => void
}

export default function CardDetailModal({
  cardId,
  projectId,
  onClose,
  onUpdate,
  onDelete,
}: CardDetailModalProps) {
  const [card, setCard] = useState<CardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [labels, setLabels] = useState<Label[]>([])

  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [assigneeId, setAssigneeId] = useState<string>("")
  const [dueDate, setDueDate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [actualHours, setActualHours] = useState("")

  useEffect(() => {
    fetchCard()
    fetchUsers()
    fetchLabels()
  }, [cardId])

  const fetchCard = async () => {
    try {
      const res = await fetch(`/api/projects/cards/${cardId}`)
      if (res.ok) {
        const data = await res.json()
        setCard(data)
        setTitle(data.title)
        setDescription(data.description || "")
        setPriority(data.priority)
        setAssigneeId(data.assigneeId || "")
        setDueDate(data.dueDate?.split("T")[0] || "")
        setStartDate(data.startDate?.split("T")[0] || "")
        setEstimatedHours(data.estimatedHours?.toString() || "")
        setActualHours(data.actualHours?.toString() || "")
      }
    } catch (error) {
      console.error("Error fetching card:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?role=admin")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.map((u: any) => ({ id: u.id.toString(), name: u.name })))
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchLabels = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/labels`)
      if (res.ok) {
        const data = await res.json()
        setLabels(data)
      }
    } catch (error) {
      console.error("Error fetching labels:", error)
    }
  }

  const updateCard = async (updates: Record<string, any>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/projects/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        const data = await res.json()
        setCard(data)
        onUpdate()
      }
    } catch (error) {
      console.error("Error updating card:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleTitleSave = () => {
    if (title.trim() && title !== card?.title) {
      updateCard({ title: title.trim() })
    }
    setEditingTitle(false)
  }

  const handleDescriptionSave = () => {
    if (description !== card?.description) {
      updateCard({ description: description.trim() || null })
    }
    setEditingDescription(false)
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer cette carte ?")) return

    try {
      const res = await fetch(`/api/projects/cards/${cardId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        onDelete?.()
        onClose()
      }
    } catch (error) {
      console.error("Error deleting card:", error)
    }
  }

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-100 text-blue-600",
    high: "bg-orange-100 text-orange-600",
    urgent: "bg-red-100 text-red-600",
  }

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
        <div className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-[5%] md:max-w-4xl md:w-full z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      </>
    )
  }

  if (!card) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
        <div className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-[5%] md:max-w-4xl md:w-full z-50">
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">Carte non trouvee</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:top-[5%] md:max-w-4xl md:w-full z-50 max-h-[90vh] overflow-hidden">
        <div className="bg-white rounded-xl shadow-2xl flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-200">
            <div className="flex-1 pr-4">
              {editingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                  className="w-full text-xl font-semibold bg-transparent border-b-2 border-[#0064FA] outline-none text-gray-900"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-[#0064FA] transition-colors"
                  onClick={() => setEditingTitle(true)}
                >
                  {card.title}
                </h2>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {card.column?.project?.name && `${card.column.project.name} / `}{card.column?.name || ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
              {/* Main content - Left side */}
              <div className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
                {/* Labels */}
                <div className="flex flex-wrap gap-2">
                  {card.cardLabels.map((label) => (
                    <span
                      key={label.id}
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Description</span>
                  </div>
                  {editingDescription ? (
                    <div>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none resize-none"
                        rows={4}
                        placeholder="Ajouter une description..."
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleDescriptionSave}
                          className="px-3 py-1.5 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC]"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => {
                            setDescription(card.description || "")
                            setEditingDescription(false)
                          }}
                          className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="min-h-[60px] p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setEditingDescription(true)}
                    >
                      {card.description ? (
                        <p className="text-gray-700 whitespace-pre-wrap">{card.description}</p>
                      ) : (
                        <p className="text-gray-400 italic">Cliquez pour ajouter une description...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtasks */}
                <SubtaskList
                  cardId={cardId}
                  subtasks={card.subtasks}
                  users={users}
                  onUpdate={fetchCard}
                />

                {/* Attachments */}
                <AttachmentList
                  cardId={cardId}
                  attachments={card.attachments}
                  onUpdate={fetchCard}
                />

                {/* Comments */}
                <CommentSection
                  cardId={cardId}
                  comments={card.comments}
                  onUpdate={fetchCard}
                />
              </div>

              {/* Sidebar - Right side */}
              <div className="w-full lg:w-72 p-4 lg:p-6 space-y-4 bg-gray-50">
                {/* Assignee */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4" />
                    Assigne a
                  </label>
                  <StyledSelect
                    value={assigneeId}
                    onChange={(val: string) => {
                      setAssigneeId(val)
                      updateCard({ assigneeId: val || null })
                    }}
                    placeholder="Non assigne"
                    options={[
                      { value: "", label: "Non assigne" },
                      ...users.map(u => ({ value: u.id, label: u.name }))
                    ]}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Flag className="h-4 w-4" />
                    Priorite
                  </label>
                  <StyledSelect
                    value={priority}
                    onChange={(val: string) => {
                      setPriority(val)
                      updateCard({ priority: val })
                    }}
                    options={[
                      { value: "low", label: "Basse" },
                      { value: "medium", label: "Moyenne" },
                      { value: "high", label: "Haute" },
                      { value: "urgent", label: "Urgente" },
                    ]}
                  />
                </div>

                {/* Labels */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4" />
                    Labels
                  </label>
                  <LabelSelector
                    cardId={cardId}
                    projectId={projectId}
                    selectedLabels={card.cardLabels}
                    availableLabels={labels}
                    onUpdate={() => {
                      fetchCard()
                      fetchLabels()
                    }}
                  />
                </div>

                {/* Dates */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4" />
                    Date debut
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      updateCard({ startDate: e.target.value || null })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4" />
                    Date limite
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value)
                      updateCard({ dueDate: e.target.value || null })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
                  />
                </div>

                {/* Time tracking */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                      <Clock className="h-3 w-3" />
                      Estime (h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={estimatedHours}
                      onChange={(e) => {
                        setEstimatedHours(e.target.value)
                        updateCard({ estimatedHours: parseFloat(e.target.value) || null })
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                      <Clock className="h-3 w-3" />
                      Reel (h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={actualHours}
                      onChange={(e) => {
                        setActualHours(e.target.value)
                        updateCard({ actualHours: parseFloat(e.target.value) || null })
                      }}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Client */}
                {card.client && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="h-4 w-4" />
                      Client
                    </label>
                    <p className="text-sm text-gray-600">{card.client.companyName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
