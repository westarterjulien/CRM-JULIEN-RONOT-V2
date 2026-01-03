"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileCheck,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Download,
  Mail,
  CheckCircle,
  XCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowRight,
  FileText,
  Loader2,
} from "lucide-react"
import { StyledSelect, SelectOption, quoteStatusOptions } from "@/components/ui/styled-select"

const quotePerPageOptions: SelectOption[] = [
  { value: "10", label: "10" },
  { value: "15", label: "15" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
]

interface Quote {
  id: string
  quoteNumber: string
  status: string
  totalHt: number
  totalTtc: number
  issueDate: string
  validUntil: string
  client: {
    id: string
    companyName: string
    email: string
  }
}

interface QuotesResponse {
  quotes: Quote[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
  stats: {
    total: number
    draft: number
    sent: number
    accepted: number
    rejected: number
    expired: number
    converted: number
    totalAmount: number
    acceptedAmount: number
    pendingAmount: number
  }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Brouillon", color: "#666666", bgColor: "#F5F5F7" },
  sent: { label: "Envoyé", color: "#0064FA", bgColor: "#E3F2FD" },
  accepted: { label: "Accepté", color: "#28B95F", bgColor: "#D4EDDA" },
  rejected: { label: "Refusé", color: "#F04B69", bgColor: "#FEE2E8" },
  expired: { label: "Expiré", color: "#F0783C", bgColor: "#FEF3CD" },
  converted: { label: "Converti", color: "#5F00BA", bgColor: "#F3E8FF" },
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    converted: 0,
    totalAmount: 0,
    acceptedAmount: 0,
    pendingAmount: 0,
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
      })
      if (search) params.set("search", search)
      if (status) params.set("status", status)

      const response = await fetch(`/api/quotes?${params}`)
      if (response.ok) {
        const data: QuotesResponse = await response.json()
        setQuotes(data.quotes)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des devis:", error)
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, status])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1)
      fetchQuotes()
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [search])

  const handleStatusFilter = (value: string) => {
    setStatus(value === status ? "" : value)
    setPage(1)
  }

  const handleDelete = async () => {
    if (!quoteToDelete) return

    setActionLoading(quoteToDelete.id)
    try {
      const response = await fetch(`/api/quotes/${quoteToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchQuotes()
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
    } finally {
      setActionLoading(null)
      setDeleteDialogOpen(false)
      setQuoteToDelete(null)
    }
  }

  const handleAction = async (quote: Quote, action: string) => {
    if (action === "download") {
      window.location.href = `/api/quotes/${quote.id}/download`
      return
    }

    setActionLoading(quote.id)
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (response.ok) {
        if (action === "duplicate") {
          const data = await response.json()
          router.push(`/quotes/${data.id}/edit`)
        } else if (action === "convertToInvoice") {
          const data = await response.json()
          router.push(`/invoices/${data.invoiceId}`)
        } else {
          fetchQuotes()
        }
      }
    } catch (error) {
      console.error(`Erreur lors de l'action ${action}:`, error)
    } finally {
      setActionLoading(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  const isExpired = (quote: Quote) => {
    if (quote.status === "accepted" || quote.status === "rejected" || quote.status === "converted")
      return false
    return new Date(quote.validUntil) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#F0783C" }}
          >
            <FileCheck className="h-7 w-7" style={{ color: "#FFFFFF" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
              Devis
            </h1>
            <p className="text-sm" style={{ color: "#666666" }}>
              {stats.total} devis au total
            </p>
          </div>
        </div>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "#F0783C", color: "#FFFFFF" }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouveau devis</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Total
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#111111" }}>
                {stats.total}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#F5F5F7" }}
            >
              <FileText className="h-5 w-5" style={{ color: "#666666" }} />
            </div>
          </div>
        </div>

        {/* Brouillons */}
        <button
          onClick={() => handleStatusFilter("draft")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "draft" ? "2px solid #666666" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Brouillons
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#666666" }}>
                {stats.draft}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#F5F5F7" }}
            >
              <FileText className="h-5 w-5" style={{ color: "#666666" }} />
            </div>
          </div>
        </button>

        {/* Envoyés */}
        <button
          onClick={() => handleStatusFilter("sent")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "sent" ? "2px solid #0064FA" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Envoyés
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#0064FA" }}>
                {stats.sent}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <Mail className="h-5 w-5" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </button>

        {/* Acceptés */}
        <button
          onClick={() => handleStatusFilter("accepted")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "accepted" ? "2px solid #28B95F" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Acceptés
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#28B95F" }}>
                {stats.accepted}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#D4EDDA" }}
            >
              <CheckCircle className="h-5 w-5" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </button>

        {/* Refusés */}
        <button
          onClick={() => handleStatusFilter("rejected")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "rejected" ? "2px solid #F04B69" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Refusés
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#F04B69" }}>
                {stats.rejected}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FEE2E8" }}
            >
              <XCircle className="h-5 w-5" style={{ color: "#F04B69" }} />
            </div>
          </div>
        </button>

        {/* Convertis */}
        <button
          onClick={() => handleStatusFilter("converted")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "converted" ? "2px solid #5F00BA" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Convertis
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#5F00BA" }}>
                {stats.converted}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#F3E8FF" }}
            >
              <ArrowRight className="h-5 w-5" style={{ color: "#5F00BA" }} />
            </div>
          </div>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Montant Total */}
        <div className="rounded-2xl p-6" style={{ background: "#F0783C" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                Montant Total
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: "#FFFFFF" }}>
                {formatCurrency(stats.totalAmount)}
              </p>
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                Tous devis confondus
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <FileCheck className="h-8 w-8" style={{ color: "#FFFFFF" }} />
            </div>
          </div>
        </div>

        {/* Montant Accepté */}
        <div className="rounded-2xl p-6" style={{ background: "#28B95F" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                Montant Accepté
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: "#FFFFFF" }}>
                {formatCurrency(stats.acceptedAmount)}
              </p>
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                Devis validés par les clients
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <CheckCircle className="h-8 w-8" style={{ color: "#FFFFFF" }} />
            </div>
          </div>
        </div>

        {/* En attente */}
        <div className="rounded-2xl p-6" style={{ background: "#DCB40A" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "rgba(17,17,17,0.7)" }}>
                En Attente
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: "#111111" }}>
                {formatCurrency(stats.pendingAmount)}
              </p>
              <p className="text-sm mt-2" style={{ color: "rgba(17,17,17,0.6)" }}>
                {stats.sent + stats.draft} devis en attente
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(17,17,17,0.1)" }}
            >
              <Clock className="h-8 w-8" style={{ color: "#111111" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "#999999" }}
              />
              <input
                type="text"
                placeholder="Rechercher par numéro ou client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#111111" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-44">
              <StyledSelect
                value={status || "all"}
                onChange={(v) => {
                  setStatus(v === "all" ? "" : v)
                  setPage(1)
                }}
                options={quoteStatusOptions}
                placeholder="Tous les statuts"
              />
            </div>
            <span className="text-sm" style={{ color: "#666666" }}>
              Afficher
            </span>
            <div className="w-20">
              <StyledSelect
                value={perPage.toString()}
                onChange={(v) => {
                  setPerPage(parseInt(v))
                  setPage(1)
                }}
                options={quotePerPageOptions}
                showCheckmark={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F5F5F7" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Numéro
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Client
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Date
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Validité
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Montant TTC
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Statut
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2
                      className="h-6 w-6 animate-spin mx-auto mb-2"
                      style={{ color: "#F0783C" }}
                    />
                    <span style={{ color: "#666666" }}>Chargement...</span>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div
                      className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                      style={{ background: "#F5F5F7" }}
                    >
                      <FileCheck className="h-10 w-10" style={{ color: "#CCCCCC" }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
                      Aucun devis
                    </h3>
                    <p className="text-sm mb-6" style={{ color: "#666666" }}>
                      Créez votre premier devis
                    </p>
                    <Link
                      href="/quotes/new"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: "#F0783C", color: "#FFFFFF" }}
                    >
                      <Plus className="h-4 w-4" />
                      Nouveau devis
                    </Link>
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => {
                  const currentStatus = isExpired(quote) ? "expired" : quote.status
                  const statusInfo = statusConfig[currentStatus] || statusConfig.draft
                  return (
                    <tr
                      key={quote.id}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid #EEEEEE",
                        background: isExpired(quote) ? "#FEF9F3" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpired(quote)) e.currentTarget.style.background = "#FAFAFA"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isExpired(quote)
                          ? "#FEF9F3"
                          : "transparent"
                      }}
                    >
                      {/* Quote Number */}
                      <td className="px-4 py-3">
                        <Link href={`/quotes/${quote.id}`} className="group">
                          <p
                            className="font-semibold group-hover:underline"
                            style={{ color: "#F0783C" }}
                          >
                            {quote.quoteNumber}
                          </p>
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${quote.client.id}`}
                          className="group flex items-center"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center mr-3"
                            style={{ background: "#F0783C" }}
                          >
                            <span className="text-xs font-bold" style={{ color: "#FFFFFF" }}>
                              {(quote.client.companyName || "C").substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p
                              className="text-sm font-medium group-hover:underline"
                              style={{ color: "#111111" }}
                            >
                              {quote.client.companyName}
                            </p>
                            <p className="text-xs" style={{ color: "#999999" }}>
                              {quote.client.email}
                            </p>
                          </div>
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: "#111111" }}>
                          {formatDate(quote.issueDate)}
                        </p>
                      </td>

                      {/* Validité */}
                      <td className="px-4 py-3">
                        <p
                          className="text-sm"
                          style={{
                            color: isExpired(quote) ? "#F0783C" : "#111111",
                            fontWeight: isExpired(quote) ? 600 : 400,
                          }}
                        >
                          {formatDate(quote.validUntil)}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-bold" style={{ color: "#111111" }}>
                          {formatCurrency(quote.totalTtc)}
                        </p>
                        <p className="text-xs" style={{ color: "#999999" }}>
                          HT: {formatCurrency(quote.totalHt)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                          style={{ background: statusInfo.bgColor, color: statusInfo.color }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: statusInfo.color }}
                          />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/quotes/${quote.id}`}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "#0064FA" }}
                            title="Voir"
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#E3F2FD")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/quotes/${quote.id}/edit`}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "#F0783C" }}
                            title="Modifier"
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF3CD")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <button
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "#F04B69" }}
                            title="Télécharger PDF"
                            onClick={() => handleAction(quote, "download")}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE2E8")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {quote.status === "accepted" && (
                            <button
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "#5F00BA" }}
                              title="Convertir en facture"
                              onClick={() => handleAction(quote, "convertToInvoice")}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#F3E8FF")}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                              }
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}

                          <div className="relative group">
                            <button
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "#666666" }}
                              disabled={actionLoading === quote.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            <div
                              className="absolute right-0 top-full mt-1 w-48 rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10"
                              style={{
                                background: "#FFFFFF",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                border: "1px solid #EEEEEE",
                              }}
                            >
                              {quote.status === "draft" && (
                                <button
                                  onClick={() => handleAction(quote, "markSent")}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#F5F5F7]"
                                  style={{ color: "#444444" }}
                                >
                                  <Mail className="h-4 w-4" />
                                  Marquer envoyé
                                </button>
                              )}
                              {(quote.status === "sent" || quote.status === "draft") && (
                                <>
                                  <button
                                    onClick={() => handleAction(quote, "markAccepted")}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#D4EDDA]"
                                    style={{ color: "#28B95F" }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Marquer accepté
                                  </button>
                                  <button
                                    onClick={() => handleAction(quote, "markRejected")}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#FEE2E8]"
                                    style={{ color: "#F04B69" }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Marquer refusé
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleAction(quote, "duplicate")}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <Copy className="h-4 w-4" />
                                Dupliquer
                              </button>
                              <div style={{ borderTop: "1px solid #EEEEEE", margin: "4px 0" }} />
                              <button
                                onClick={() => {
                                  setQuoteToDelete(quote)
                                  setDeleteDialogOpen(true)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#FEE2E8]"
                                style={{ color: "#F04B69" }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1px solid #EEEEEE" }}
          >
            <p className="text-sm" style={{ color: "#666666" }}>
              Affichage de {(page - 1) * perPage + 1} à {Math.min(page * perPage, total)} sur {total}{" "}
              devis
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#444444" }}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: page === pageNum ? "#F0783C" : "#FFFFFF",
                        color: page === pageNum ? "#FFFFFF" : "#444444",
                        border: page === pageNum ? "none" : "1px solid #EEEEEE",
                      }}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#444444" }}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteDialogOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 16px 48px rgba(0,0,0,0.16)" }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
              Supprimer le devis
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Êtes-vous sûr de vouloir supprimer le devis{" "}
              <strong>{quoteToDelete?.quoteNumber}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "#F04B69", color: "#FFFFFF" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
