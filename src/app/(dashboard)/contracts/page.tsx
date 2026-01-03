"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import {
  Plus, Eye, Send, Download, Search, FileSignature,
  ChevronLeft, ChevronRight, Clock, CheckCircle2,
  XCircle, AlertCircle, Trash2, MoreHorizontal, Users,
  Upload, Sparkles, ChevronDown
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatDate } from "@/lib/utils"
import { StyledSelect, SelectOption, contractStatusOptions } from "@/components/ui/styled-select"

const contractPerPageOptions: SelectOption[] = [
  { value: "10", label: "10 / page" },
  { value: "15", label: "15 / page" },
  { value: "25", label: "25 / page" },
  { value: "50", label: "50 / page" },
]

const contractStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillons", color: "#666666" },
  { value: "sent", label: "Envoyés", color: "#0064FA" },
  { value: "viewed", label: "Consultés", color: "#DCB40A" },
  { value: "partially_signed", label: "En cours", color: "#F0783C" },
  { value: "completed", label: "Signés", color: "#28B95F" },
  { value: "declined", label: "Refusés", color: "#F04B69" },
  { value: "expired", label: "Expirés", color: "#999999" },
]

interface Contract {
  id: string
  title: string
  description: string | null
  status: string
  clientId: string | null
  clientName: string | null
  documentsCount: number
  signersCount: number
  signedCount: number
  expirationDays: number
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  expiresAt: string | null
}

interface PaginatedResponse {
  contracts: Contract[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

const statusConfig: Record<string, { label: string; bg: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Brouillon", bg: "#F5F5F7", color: "#666666", icon: Clock },
  sent: { label: "Envoyé", bg: "#E3F2FD", color: "#0064FA", icon: Send },
  viewed: { label: "Consulté", bg: "#FEF3CD", color: "#DCB40A", icon: Eye },
  partially_signed: { label: "En cours", bg: "#FFF3E0", color: "#F0783C", icon: AlertCircle },
  completed: { label: "Signé", bg: "#D4EDDA", color: "#28B95F", icon: CheckCircle2 },
  declined: { label: "Refusé", bg: "#FEE2E8", color: "#F04B69", icon: XCircle },
  expired: { label: "Expiré", bg: "#F5F5F7", color: "#999999", icon: Clock },
  voided: { label: "Annulé", bg: "#F5F5F7", color: "#999999", icon: XCircle },
}

function getStatusBadge(status: string) {
  const config = statusConfig[status] || statusConfig.draft
  const Icon = config.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

export default function ContractsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [perPage, setPerPage] = useState(searchParams.get("perPage") || "15")
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"))
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      perPage,
      ...(search && { search }),
      ...(status !== "all" && { status }),
    })

    try {
      const res = await fetch(`/api/contracts?${params}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to fetch contracts:", error)
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, status])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status !== "all") params.set("status", status)
    if (perPage !== "15") params.set("perPage", perPage)
    if (page > 1) params.set("page", page.toString())

    const newUrl = params.toString() ? `?${params.toString()}` : "/contracts"
    router.replace(newUrl, { scroll: false })
  }, [search, status, perPage, page, router])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/contracts/${deleteId}`, { method: "DELETE" })
      fetchContracts()
    } catch (error) {
      console.error("Failed to delete contract:", error)
    }
    setDeleteId(null)
  }

  const handleSend = async (contractId: string) => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/send`, { method: "POST" })
      if (res.ok) {
        fetchContracts()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'envoi")
      }
    } catch (error) {
      console.error("Failed to send contract:", error)
    }
  }

  const contracts = data?.contracts || []
  const pagination = data?.pagination || { page: 1, perPage: 15, total: 0, totalPages: 1 }

  // Stats
  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === "draft").length,
    pending: contracts.filter(c => ["sent", "viewed", "partially_signed"].includes(c.status)).length,
    completed: contracts.filter(c => c.status === "completed").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
            Contrats
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Gérez vos contrats et signatures électroniques
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:shadow-lg"
              style={{ background: "#0064FA" }}
            >
              <Plus className="h-4 w-4" />
              Nouveau contrat
              <ChevronDown className="h-3 w-3 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="cursor-pointer gap-3 py-3"
              onClick={() => router.push("/contracts/new")}
            >
              <Upload className="h-4 w-4" style={{ color: "#0064FA" }} />
              <div>
                <p className="font-medium">Importer des PDF</p>
                <p className="text-xs text-gray-500">Uploadez vos documents existants</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-3 py-3"
              onClick={() => router.push("/contracts/create")}
            >
              <Sparkles className="h-4 w-4" style={{ color: "#8B5CF6" }} />
              <div>
                <p className="font-medium">Créer avec l'IA</p>
                <p className="text-xs text-gray-500">Générez un contrat automatiquement</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatus("all"); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Total</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#111111" }}>{pagination.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#E3F2FD" }}>
              <FileSignature className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatus("draft"); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Brouillons</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#666666" }}>{stats.draft}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#F5F5F7" }}>
              <Clock className="w-6 h-6" style={{ color: "#666666" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatus("sent"); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>En attente</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#F0783C" }}>{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#FFF3E0" }}>
              <Send className="w-6 h-6" style={{ color: "#F0783C" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatus("completed"); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Signés</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#28B95F" }}>{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#D4EDDA" }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Filters */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "#EEEEEE" }}>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#999999" }} />
              <input
                type="text"
                placeholder="Rechercher par titre..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
              />
            </div>

            <div className="w-44">
              <StyledSelect
                value={status}
                onChange={(v) => { setStatus(v); setPage(1) }}
                options={contractStatusFilterOptions}
                placeholder="Tous les statuts"
              />
            </div>

            <div className="w-32">
              <StyledSelect
                value={perPage}
                onChange={(v) => { setPerPage(v); setPage(1) }}
                options={contractPerPageOptions}
                showCheckmark={false}
              />
            </div>

            {(search || status !== "all") && (
              <button
                onClick={() => { setSearch(""); setStatus("all"); setPage(1) }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[#EEEEEE]"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0064FA", borderTopColor: "transparent" }} />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#F5F5F7" }}>
                <FileSignature className="w-8 h-8" style={{ color: "#999999" }} />
              </div>
              <p className="text-base font-medium" style={{ color: "#666666" }}>Aucun contrat trouvé</p>
              <p className="text-sm mt-1" style={{ color: "#999999" }}>Créez votre premier contrat électronique</p>
              {!search && status === "all" && (
                <Link href="/contracts/new">
                  <button
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                    style={{ background: "#0064FA" }}
                  >
                    <Plus className="h-4 w-4" />
                    Créer un contrat
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Contrat
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Client
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Statut
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Signataires
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Date
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract, index) => (
                  <tr
                    key={contract.id}
                    className="transition-colors cursor-pointer hover:bg-[#F9F9FB]"
                    style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: statusConfig[contract.status]?.bg || "#F5F5F7" }}
                        >
                          <FileSignature className="w-5 h-5" style={{ color: statusConfig[contract.status]?.color || "#666666" }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#111111" }}>
                            {contract.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#999999" }}>
                            {contract.documentsCount} document{contract.documentsCount > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {contract.clientName ? (
                        <p className="text-sm" style={{ color: "#444444" }}>{contract.clientName}</p>
                      ) : (
                        <span style={{ color: "#CCCCCC" }}>-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(contract.status)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4" style={{ color: "#999999" }} />
                        <span className="text-sm" style={{ color: "#444444" }}>
                          {contract.signedCount}/{contract.signersCount}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: "#444444" }}>
                        {contract.completedAt
                          ? formatDate(contract.completedAt)
                          : contract.sentAt
                            ? formatDate(contract.sentAt)
                            : formatDate(contract.createdAt)}
                      </p>
                      {contract.expiresAt && contract.status !== "completed" && (
                        <p className="text-xs" style={{ color: "#F0783C" }}>
                          Expire le {formatDate(contract.expiresAt)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]">
                              <MoreHorizontal className="w-4 h-4" style={{ color: "#666666" }} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => router.push(`/contracts/${contract.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            {contract.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => router.push(`/contracts/${contract.id}/edit`)}>
                                  <FileSignature className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSend(contract.id)}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Envoyer
                                </DropdownMenuItem>
                              </>
                            )}
                            {contract.status === "completed" && (
                              <DropdownMenuItem onClick={() => window.open(`/api/contracts/${contract.id}/download?type=signed`, "_blank")}>
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger signé
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {contract.status === "draft" && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteId(contract.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && contracts.length > 0 && (
          <div className="px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: "#EEEEEE" }}>
            <p className="text-sm" style={{ color: "#666666" }}>
              Affichage de{" "}
              <span className="font-medium" style={{ color: "#111111" }}>
                {((pagination.page - 1) * pagination.perPage) + 1}
              </span>
              {" "}à{" "}
              <span className="font-medium" style={{ color: "#111111" }}>
                {Math.min(pagination.page * pagination.perPage, pagination.total)}
              </span>
              {" "}sur{" "}
              <span className="font-medium" style={{ color: "#111111" }}>{pagination.total}</span> contrats
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>
              <span className="text-sm px-3" style={{ color: "#666666" }}>
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrat et tous ses documents seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl"
              style={{ background: "#F04B69" }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
