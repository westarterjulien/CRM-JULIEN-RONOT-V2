"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, FolderKanban, Archive, MoreHorizontal, Trash2, Edit, Users } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  isArchived: boolean
  client: { id: string; companyName: string } | null
  columns: {
    id: string
    name: string
    cards: { id: string }[]
  }[]
  createdAt: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectColor, setNewProjectColor] = useState("#0064FA")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [showArchived])

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?includeArchived=${showArchived}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.map((p: any) => ({ ...p, id: String(p.id) })))
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return

    setCreating(true)
    try {
      console.log("Creating project:", { name: newProjectName.trim(), color: newProjectColor })
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          color: newProjectColor,
        }),
      })

      console.log("Response status:", res.status)
      const data = await res.json()
      console.log("Response data:", data)

      if (res.ok) {
        router.push(`/projects/${data.id}`)
      } else {
        alert(`Erreur: ${data.error || "Impossible de creer le projet"}`)
      }
    } catch (error) {
      console.error("Error creating project:", error)
      alert("Erreur de connexion au serveur")
    } finally {
      setCreating(false)
    }
  }

  const archiveProject = async (projectId: string, archive: boolean) => {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: archive }),
      })
      fetchProjects()
    } catch (error) {
      console.error("Error archiving project:", error)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm("Supprimer ce projet et toutes ses taches ?")) return

    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
      fetchProjects()
    } catch (error) {
      console.error("Error deleting project:", error)
    }
  }

  const getTotalCards = (project: Project) => {
    return project.columns.reduce((acc, col) => acc + col.cards.length, 0)
  }

  const colors = [
    "#0064FA", "#5F00BA", "#F0783C", "#2E7D32", "#C2185B",
    "#00838F", "#F9A825", "#5D4037", "#6B7280",
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0064FA]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projets</h1>
          <p className="text-gray-500 mt-1">Gerez vos projets avec des tableaux Kanban</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showArchived
                ? "bg-gray-200 text-gray-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Masquer archives" : "Voir archives"}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouveau projet
          </button>
        </div>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <FolderKanban className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucun projet
          </h3>
          <p className="text-gray-500 mb-6">
            Creez votre premier projet pour commencer
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Creer un projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer ${
                project.isArchived ? "opacity-60" : ""
              }`}
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Ouvrir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveProject(project.id, !project.isArchived)}>
                        <Archive className="h-4 w-4 mr-2" />
                        {project.isArchived ? "Restaurer" : "Archiver"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => deleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-gray-500">
                    <span>{getTotalCards(project)} taches</span>
                    <span>{project.columns.length} colonnes</span>
                  </div>
                  {project.client && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="h-3 w-3" />
                      {project.client.companyName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-x-4 top-[20%] z-50 mx-auto max-w-md">
            <div className="bg-white rounded-xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Nouveau projet
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du projet
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Mon projet"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && createProject()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewProjectColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newProjectColor === color
                            ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createProject}
                  disabled={creating || !newProjectName.trim()}
                  className="px-4 py-2 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creation..." : "Creer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
