"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus, Eye, Pencil, Trash2, Search, Users,
  UserCheck, Clock, ChevronLeft, ChevronRight, MoreHorizontal,
  FileText, Receipt, ArrowUpDown, Euro, UserX
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
import { formatDate, formatCurrency } from "@/lib/utils"

interface Client {
  id: string
  companyName: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  siret: string | null
  city: string | null
  status: string
  createdAt: string
  contactFirstname: string | null
  contactLastname: string | null
  activeServicesCount: number
  totalPaid: number
  totalPending: number
  _count: {
    invoices: number
    quotes: number
  }
}

interface Stats {
  total: number
  active: number
  prospect: number
  inactive: number
  totalRevenue: number
}

interface PaginatedResponse {
  clients: Client[]
  stats: Stats
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

const statusConfig = {
  active: { label: "Client", bg: "#D4EDDA", color: "#28B95F", dot: "#28B95F" },
  prospect: { label: "Prospect", bg: "#FEF3CD", color: "#DCB40A", dot: "#DCB40A" },
  inactive: { label: "Inactif", bg: "#F5F5F7", color: "#666666", dot: "#999999" },
}

function getStatusBadge(status: string) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: config.bg, color: config.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ background: config.dot }}
      />
      {config.label}
    </span>
  )
}

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase()
}

function getAvatarColor(status: string) {
  switch (status) {
    case "active": return "#28B95F"
    case "prospect": return "#DCB40A"
    default: return "#999999"
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [perPage, setPerPage] = useState(searchParams.get("perPage") || "15")
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1"))
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "companyName")
  const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "asc")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      perPage,
      ...(search && { search }),
      ...(status !== "all" && { status }),
      sortBy,
      sortOrder,
    })

    try {
      const res = await fetch(`/api/clients?${params}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, status, sortBy, sortOrder])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status !== "all") params.set("status", status)
    if (perPage !== "15") params.set("perPage", perPage)
    if (page > 1) params.set("page", page.toString())
    if (sortBy !== "companyName") params.set("sortBy", sortBy)
    if (sortOrder !== "asc") params.set("sortOrder", sortOrder)

    const newUrl = params.toString() ? `?${params.toString()}` : "/clients"
    router.replace(newUrl, { scroll: false })
  }, [search, status, perPage, page, sortBy, sortOrder, router])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
    setPage(1)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/clients/${deleteId}`, { method: "DELETE" })
      fetchClients()
    } catch (error) {
      console.error("Failed to delete client:", error)
    }
    setDeleteId(null)
  }

  const stats = data?.stats || { total: 0, active: 0, prospect: 0, inactive: 0, totalRevenue: 0 }
  const clients = data?.clients || []
  const pagination = data?.pagination || { page: 1, perPage: 15, total: 0, totalPages: 1 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
            Clients
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Gérez votre portefeuille client
          </p>
        </div>
        <Link href="/clients/new">
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:shadow-lg"
            style={{ background: "#0064FA" }}
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatus("all"); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Total</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#111111" }}>{stats.total}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <Users className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        {/* Clients actifs */}
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatus("active"); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Clients</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#28B95F" }}>{stats.active}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#D4EDDA" }}
            >
              <UserCheck className="w-6 h-6" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>

        {/* Prospects */}
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatus("prospect"); setPage(1) }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Prospects</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#DCB40A" }}>{stats.prospect}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#FEF3CD" }}
            >
              <Clock className="w-6 h-6" style={{ color: "#DCB40A" }} />
            </div>
          </div>
        </div>

        {/* CA Total */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>CA Total</p>
              <p className="text-2xl font-semibold mt-1" style={{ color: "#111111" }}>
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#F3E8FF" }}
            >
              <Euro className="w-6 h-6" style={{ color: "#5F00BA" }} />
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
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#999999" }} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, SIRET..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "#F5F5F7",
                  border: "1px solid #EEEEEE",
                  color: "#111111"
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#444444" }}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Clients actifs</option>
              <option value="prospect">Prospects</option>
              <option value="inactive">Inactifs</option>
            </select>

            {/* Per Page */}
            <select
              value={perPage}
              onChange={(e) => { setPerPage(e.target.value); setPage(1) }}
              className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#444444" }}
            >
              <option value="10">10 / page</option>
              <option value="15">15 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>

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
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "#F5F5F7" }}
              >
                <Users className="w-8 h-8" style={{ color: "#999999" }} />
              </div>
              <p className="text-base font-medium" style={{ color: "#666666" }}>Aucun client trouvé</p>
              <p className="text-sm mt-1" style={{ color: "#999999" }}>Commencez par ajouter votre premier client</p>
              {!search && status === "all" && (
                <Link href="/clients/new">
                  <button
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                    style={{ background: "#0064FA" }}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un client
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  <th
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    style={{ color: "#666666" }}
                    onClick={() => handleSort("companyName")}
                  >
                    <div className="flex items-center gap-1">
                      Client
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Contact
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Statut
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Factures
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Services
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    CA Généré
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className="transition-colors cursor-pointer hover:bg-[#F9F9FB]"
                    style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                    onClick={() => router.push(`/clients/${client.id}`)}
                  >
                    {/* Client Info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                          style={{ background: getAvatarColor(client.status) }}
                        >
                          {getInitials(client.companyName)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#111111" }}>
                            {client.companyName}
                          </p>
                          {client.siret && (
                            <p className="text-xs mt-0.5" style={{ color: "#999999" }}>
                              SIRET: {client.siret}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: "#444444" }}>
                        {client.contactFirstname} {client.contactLastname}
                      </p>
                      <p className="text-xs" style={{ color: "#999999" }}>{client.email}</p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      {getStatusBadge(client.status)}
                    </td>

                    {/* Invoices */}
                    <td className="px-5 py-4 text-center">
                      {client._count.invoices > 0 ? (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold"
                          style={{ background: "#E3F2FD", color: "#0064FA" }}
                        >
                          {client._count.invoices}
                        </span>
                      ) : (
                        <span style={{ color: "#CCCCCC" }}>-</span>
                      )}
                    </td>

                    {/* Services */}
                    <td className="px-5 py-4 text-center">
                      {client.activeServicesCount > 0 ? (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold"
                          style={{ background: "#F3E8FF", color: "#5F00BA" }}
                        >
                          {client.activeServicesCount}
                        </span>
                      ) : (
                        <span style={{ color: "#CCCCCC" }}>-</span>
                      )}
                    </td>

                    {/* Revenue */}
                    <td className="px-5 py-4 text-right">
                      {client.totalPaid > 0 ? (
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#28B95F" }}>
                            {formatCurrency(client.totalPaid)}
                          </p>
                          {client.totalPending > 0 && (
                            <p className="text-xs" style={{ color: "#F0783C" }}>
                              + {formatCurrency(client.totalPending)} en attente
                            </p>
                          )}
                        </div>
                      ) : client.totalPending > 0 ? (
                        <p className="text-sm" style={{ color: "#F0783C" }}>
                          {formatCurrency(client.totalPending)} en attente
                        </p>
                      ) : (
                        <span style={{ color: "#CCCCCC" }}>-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => router.push(`/clients/${client.id}`)}
                          className="p-2 rounded-lg transition-colors hover:bg-[#E3F2FD]"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" style={{ color: "#0064FA" }} />
                        </button>
                        <button
                          onClick={() => router.push(`/clients/${client.id}/edit`)}
                          className="p-2 rounded-lg transition-colors hover:bg-[#FEF3CD]"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" style={{ color: "#DCB40A" }} />
                        </button>
                        <button
                          onClick={() => router.push(`/invoices/new?clientId=${client.id}`)}
                          className="p-2 rounded-lg transition-colors hover:bg-[#D4EDDA]"
                          title="Créer facture"
                        >
                          <FileText className="w-4 h-4" style={{ color: "#28B95F" }} />
                        </button>
                        <button
                          onClick={() => setDeleteId(client.id)}
                          className="p-2 rounded-lg transition-colors hover:bg-[#FEE2E8]"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: "#F04B69" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && clients.length > 0 && (
          <div
            className="px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t"
            style={{ borderColor: "#EEEEEE" }}
          >
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
              <span className="font-medium" style={{ color: "#111111" }}>{pagination.total}</span> clients
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
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées (factures, devis, etc.) seront également supprimées.
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
