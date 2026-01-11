"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Download,
  Mail,
  CheckCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  Ban,
  Send,
  X,
  RefreshCw,
  Link as LinkIcon,
  CreditCard,
  Building2,
  Banknote,
  EyeOff,
  TrendingUp,
  DollarSign,
  Loader2,
} from "lucide-react"
import { StyledSelect, SelectOption, invoiceStatusOptions } from "@/components/ui/styled-select"

const invoicePerPageOptions: SelectOption[] = [
  { value: "10", label: "10" },
  { value: "15", label: "15" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
]

const paymentMethodOptions: SelectOption[] = [
  { value: "", label: "Sélectionner..." },
  { value: "virement", label: "Virement bancaire", color: "#28B95F" },
  { value: "prelevement_sepa", label: "Prélèvement SEPA", color: "#0064FA" },
  { value: "cheque", label: "Chèque", color: "#F0783C" },
  { value: "especes", label: "Espèces", color: "#DCB40A" },
  { value: "carte", label: "Carte bancaire", color: "#5F00BA" },
  { value: "paypal", label: "PayPal", color: "#0070BA" },
  { value: "stripe", label: "Stripe", color: "#635BFF" },
  { value: "autre", label: "Autre", color: "#666666" },
]

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  totalHt: number
  totalTtc: number
  issueDate: string
  dueDate: string
  paymentDate: string | null
  paymentMethod: string | null
  debitDate: string | null
  sentAt: string | null
  viewCount: number
  lastViewedAt: string | null
  client: {
    id: string
    companyName: string
    email: string
  }
}

interface InvoicesResponse {
  invoices: Invoice[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
  stats: {
    counts: {
      total: number
      draft: number
      sent: number
      pending: number
      paid: number
      overdue: number
      cancelled: number
    }
    amounts: {
      paidThisYear: number
      paidCount: number
      pending: number
      pendingCount: number
      totalThisYear: number
    }
  }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Brouillon", color: "#F0783C", bgColor: "#FEF3CD" },
  sent: { label: "Envoyée", color: "#0064FA", bgColor: "#E3F2FD" },
  pending: { label: "En attente", color: "#DCB40A", bgColor: "#FEF3CD" },
  paid: { label: "Payée", color: "#28B95F", bgColor: "#D4EDDA" },
  overdue: { label: "En retard", color: "#F04B69", bgColor: "#FEE2E8" },
  cancelled: { label: "Annulée", color: "#666666", bgColor: "#F5F5F7" },
}

export default function InvoicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") || ""

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState(initialStatus)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<InvoicesResponse["stats"]>({
    counts: { total: 0, draft: 0, sent: 0, pending: 0, paid: 0, overdue: 0, cancelled: 0 },
    amounts: { paidThisYear: 0, paidCount: 0, pending: 0, pendingCount: 0, totalThisYear: 0 },
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailInvoice, setEmailInvoice] = useState<Invoice | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [debitDate, setDebitDate] = useState("")
  const [paymentLink, setPaymentLink] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false)
  const [paymentLinkError, setPaymentLinkError] = useState<string | null>(null)

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethodModal, setPaymentMethodModal] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [markingPaid, setMarkingPaid] = useState(false)

  // Bank Reconciliation State
  const [bankTransactions, setBankTransactions] = useState<{
    suggested: Array<{
      id: string
      date: string
      amount: number
      remainingAmount: number
      reconciledAmount: number
      isPartiallyReconciled: boolean
      label: string | null
      counterpartyName: string | null
      isExactMatch: boolean
      isCloseMatch: boolean
      invoiceFitsInRemaining: boolean
    }>
    others: Array<{
      id: string
      date: string
      amount: number
      remainingAmount: number
      reconciledAmount: number
      isPartiallyReconciled: boolean
      label: string | null
      counterpartyName: string | null
      isExactMatch: boolean
      isCloseMatch: boolean
      invoiceFitsInRemaining: boolean
    }>
  }>({ suggested: [], others: [] })
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
      })
      if (search) params.set("search", search)
      if (status) params.set("status", status)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      const response = await fetch(`/api/invoices?${params}`)
      if (response.ok) {
        const data: InvoicesResponse = await response.json()
        setInvoices(data.invoices)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des factures:", error)
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search, status, dateFrom, dateTo])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1)
      fetchInvoices()
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [search])

  const handleStatusFilter = (newStatus: string) => {
    setStatus(newStatus === status ? "" : newStatus)
    setPage(1)
  }

  const handleDelete = async () => {
    if (!invoiceToDelete) return

    setActionLoading(invoiceToDelete.id)
    try {
      const response = await fetch(`/api/invoices/${invoiceToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchInvoices()
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
    } finally {
      setActionLoading(null)
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    }
  }

  const handleAction = async (invoice: Invoice, action: string) => {
    if (action === "download") {
      window.location.href = `/api/invoices/${invoice.id}/download`
      return
    }

    if (action === "preview") {
      window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")
      return
    }

    setActionLoading(invoice.id)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (response.ok) {
        if (action === "duplicate") {
          const data = await response.json()
          router.push(`/invoices/${data.id}/edit`)
        } else {
          fetchInvoices()
        }
      }
    } catch (error) {
      console.error(`Erreur lors de l'action ${action}:`, error)
    } finally {
      setActionLoading(null)
    }
  }

  const openEmailModal = (invoice: Invoice) => {
    setEmailInvoice(invoice)
    setPaymentMethod("")
    setDebitDate("")
    setPaymentLink("")
    setPaymentLinkError(null)
    setEmailModalOpen(true)
  }

  const handleSendEmail = async () => {
    if (!emailInvoice || !paymentMethod) return

    setSendingEmail(true)
    try {
      const response = await fetch(`/api/invoices/${emailInvoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          debitDate: paymentMethod === "debit" ? debitDate : null,
          paymentLink: paymentMethod === "card" ? paymentLink : null,
        }),
      })
      if (response.ok) {
        setEmailModalOpen(false)
        fetchInvoices()
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
    } finally {
      setSendingEmail(false)
    }
  }

  const openPaymentModal = async (invoice: Invoice) => {
    setPaymentInvoice(invoice)
    if (invoice.paymentMethod === "debit" && invoice.debitDate) {
      setPaymentDate(invoice.debitDate.split("T")[0])
    } else {
      setPaymentDate(new Date().toISOString().split("T")[0])
    }
    const paymentMethodMap: Record<string, string> = {
      debit: "prelevement_sepa",
      transfer: "virement",
      card: "carte",
    }
    setPaymentMethodModal(invoice.paymentMethod ? paymentMethodMap[invoice.paymentMethod] || "" : "")
    setPaymentNotes("")
    setSelectedTransactionId(null)
    setBankTransactions({ suggested: [], others: [] })
    setPaymentModalOpen(true)

    // Fetch bank transaction suggestions
    setLoadingTransactions(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/reconcile-suggestions`)
      if (res.ok) {
        const data = await res.json()
        setBankTransactions({
          suggested: data.suggested || [],
          others: data.others || [],
        })
      }
    } catch (error) {
      console.error("Error fetching bank transactions:", error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!paymentInvoice || !paymentMethodModal) return

    setMarkingPaid(true)
    try {
      const response = await fetch(`/api/invoices/${paymentInvoice.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentDate,
          paymentMethod: paymentMethodModal,
          paymentNotes,
          bankTransactionId: selectedTransactionId, // Link to bank transaction
        }),
      })
      if (response.ok) {
        setPaymentModalOpen(false)
        fetchInvoices()
      }
    } catch (error) {
      console.error("Erreur lors du marquage:", error)
    } finally {
      setMarkingPaid(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) return `il y a ${Math.abs(days)} jour${Math.abs(days) > 1 ? "s" : ""}`
    if (days === 0) return "aujourd'hui"
    if (days === 1) return "demain"
    return `dans ${days} jours`
  }

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === "paid" || invoice.status === "cancelled") return false
    return new Date(invoice.dueDate) < new Date()
  }

  const currentYear = new Date().getFullYear()

  const clearFilters = () => {
    setSearch("")
    setStatus("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const hasFilters = search || status || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#0064FA" }}
          >
            <FileText className="h-7 w-7" style={{ color: "#FFFFFF" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
              Factures
            </h1>
            <p className="text-sm" style={{ color: "#666666" }}>
              {stats.counts.total} factures au total
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/recurring"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#444444" }}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Récurrent</span>
          </Link>
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: "#0064FA", color: "#FFFFFF" }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle Facture</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                {stats.counts.total}
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
            border: status === "draft" ? "2px solid #F0783C" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Brouillons
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#F0783C" }}>
                {stats.counts.draft}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FEF3CD" }}
            >
              <Pencil className="h-5 w-5" style={{ color: "#F0783C" }} />
            </div>
          </div>
        </button>

        {/* Envoyées */}
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
                Envoyées
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#0064FA" }}>
                {stats.counts.sent}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <Send className="h-5 w-5" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </button>

        {/* En attente */}
        <button
          onClick={() => handleStatusFilter("pending")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "pending" ? "2px solid #DCB40A" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                En attente
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#DCB40A" }}>
                {stats.counts.pending}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FEF3CD" }}
            >
              <Clock className="h-5 w-5" style={{ color: "#DCB40A" }} />
            </div>
          </div>
        </button>

        {/* En retard */}
        <button
          onClick={() => handleStatusFilter("overdue")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "overdue" ? "2px solid #F04B69" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                En retard
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#F04B69" }}>
                {stats.counts.overdue}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FEE2E8" }}
            >
              <AlertCircle className="h-5 w-5" style={{ color: "#F04B69" }} />
            </div>
          </div>
        </button>

        {/* Payées */}
        <button
          onClick={() => handleStatusFilter("paid")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "paid" ? "2px solid #28B95F" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Payées
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#28B95F" }}>
                {stats.counts.paid}
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

        {/* Annulées */}
        <button
          onClick={() => handleStatusFilter("cancelled")}
          className="rounded-2xl p-4 text-left transition-all hover:shadow-md"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: status === "cancelled" ? "2px solid #666666" : "2px solid transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Annulées
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#666666" }}>
                {stats.counts.cancelled}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#F5F5F7" }}
            >
              <Ban className="h-5 w-5" style={{ color: "#666666" }} />
            </div>
          </div>
        </button>
      </div>

      {/* CA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CA Encaissé */}
        <div className="rounded-2xl p-6" style={{ background: "#28B95F" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                CA Encaissé {currentYear}
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: "#FFFFFF" }}>
                {formatCurrency(stats.amounts.paidThisYear)}
              </p>
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                {stats.amounts.paidCount} factures payées
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <DollarSign className="h-8 w-8" style={{ color: "#FFFFFF" }} />
            </div>
          </div>
        </div>

        {/* En attente de paiement */}
        <div className="rounded-2xl p-6" style={{ background: "#DCB40A" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "rgba(17,17,17,0.7)" }}>
                En attente de paiement
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: "#111111" }}>
                {formatCurrency(stats.amounts.pending)}
              </p>
              <p className="text-sm mt-2" style={{ color: "rgba(17,17,17,0.6)" }}>
                {stats.amounts.pendingCount} factures
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

        {/* CA Total */}
        <div className="rounded-2xl p-6" style={{ background: "#5F00BA" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                Chiffre d&apos;Affaires {currentYear}
              </p>
              <p className="text-3xl font-bold mt-2" style={{ color: "#FFFFFF" }}>
                {formatCurrency(stats.amounts.totalThisYear)}
              </p>
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                Basé sur les factures payées
              </p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <TrendingUp className="h-8 w-8" style={{ color: "#FFFFFF" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
              Rechercher
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "#999999" }}
              />
              <input
                type="text"
                placeholder="Numéro, client, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #EEEEEE",
                  color: "#111111",
                }}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
              Statut
            </label>
            <StyledSelect
              value={status || "all"}
              onChange={(v) => {
                setStatus(v === "all" ? "" : v)
                setPage(1)
              }}
              options={invoiceStatusOptions}
              placeholder="Tous"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
              Du
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{
                background: "#FFFFFF",
                border: "1px solid #EEEEEE",
                color: "#111111",
              }}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
              Au
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{
                background: "#FFFFFF",
                border: "1px solid #EEEEEE",
                color: "#111111",
              }}
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                <X className="h-4 w-4" />
                Réinitialiser
              </button>
            )}
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
                  Facture
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Client
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Montant
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
                  Suivi
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#666666" }}
                >
                  Échéance
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
                      style={{ color: "#0064FA" }}
                    />
                    <span style={{ color: "#666666" }}>Chargement...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div
                      className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                      style={{ background: "#F5F5F7" }}
                    >
                      <FileText className="h-10 w-10" style={{ color: "#CCCCCC" }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
                      Aucune facture
                    </h3>
                    <p className="text-sm mb-6" style={{ color: "#666666" }}>
                      Commencez par créer votre première facture
                    </p>
                    <Link
                      href="/invoices/new"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: "#0064FA", color: "#FFFFFF" }}
                    >
                      <Plus className="h-4 w-4" />
                      Créer une facture
                    </Link>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const overdueStatus = isOverdue(invoice)
                  const displayStatus = overdueStatus ? "overdue" : invoice.status || "draft"
                  const statusInfo = statusConfig[displayStatus] || statusConfig.draft
                  return (
                    <tr
                      key={invoice.id}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid #EEEEEE",
                        background: overdueStatus ? "#FEF2F4" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!overdueStatus) e.currentTarget.style.background = "#FAFAFA"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = overdueStatus ? "#FEF2F4" : "transparent"
                      }}
                    >
                      {/* Invoice Number & Date */}
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${invoice.id}`} className="group">
                          <p
                            className="font-semibold group-hover:underline"
                            style={{ color: "#0064FA" }}
                          >
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#999999" }}>
                            {formatDate(invoice.issueDate)}
                          </p>
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${invoice.client.id}`}
                          className="group flex items-center"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center mr-3"
                            style={{ background: "#5F00BA" }}
                          >
                            <span className="text-xs font-bold" style={{ color: "#FFFFFF" }}>
                              {(invoice.client.companyName || "C").substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p
                              className="text-sm font-medium group-hover:underline"
                              style={{ color: "#111111" }}
                            >
                              {invoice.client.companyName}
                            </p>
                            <p className="text-xs" style={{ color: "#999999" }}>
                              {invoice.client.email}
                            </p>
                          </div>
                        </Link>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-bold" style={{ color: "#111111" }}>
                          {formatCurrencyFull(invoice.totalTtc)}
                        </p>
                        <p className="text-xs" style={{ color: "#999999" }}>
                          HT: {formatCurrencyFull(invoice.totalHt)}
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
                            style={{
                              background: statusInfo.color,
                              animation: overdueStatus ? "pulse 2s infinite" : "none",
                            }}
                          />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* View Tracking */}
                      <td className="px-4 py-3 text-center">
                        {invoice.viewCount > 0 ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#E3F9ED", color: "#28B95F" }}
                            title={`Vue ${invoice.viewCount} fois`}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            {invoice.viewCount}x
                          </span>
                        ) : invoice.sentAt ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#F5F5F7", color: "#999999" }}
                            title={`Envoyée le ${formatDate(invoice.sentAt)}`}
                          >
                            <EyeOff className="w-3.5 h-3.5 mr-1" />
                            Non vue
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#CCCCCC" }}>
                            -
                          </span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-3">
                        {invoice.dueDate ? (
                          <div>
                            <p
                              className="text-sm"
                              style={{
                                color: overdueStatus ? "#F04B69" : "#111111",
                                fontWeight: overdueStatus ? 600 : 400,
                              }}
                            >
                              {formatDate(invoice.dueDate)}
                            </p>
                            {overdueStatus && (
                              <p className="text-xs font-medium" style={{ color: "#F04B69" }}>
                                {formatRelativeDate(invoice.dueDate)}
                              </p>
                            )}
                            {!overdueStatus &&
                              invoice.status !== "paid" &&
                              new Date(invoice.dueDate).getTime() - new Date().getTime() <=
                                7 * 24 * 60 * 60 * 1000 && (
                                <p className="text-xs" style={{ color: "#DCB40A" }}>
                                  {formatRelativeDate(invoice.dueDate)}
                                </p>
                              )}
                          </div>
                        ) : (
                          <span style={{ color: "#CCCCCC" }}>-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "#0064FA" }}
                            title="Voir"
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#E3F2FD")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {invoice.status === "draft" && (
                            <Link
                              href={`/invoices/${invoice.id}/edit`}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "#F0783C" }}
                              title="Modifier"
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF3CD")}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}

                          <button
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "#F04B69" }}
                            title="Télécharger PDF"
                            onClick={() => handleAction(invoice, "download")}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE2E8")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {!["paid", "cancelled"].includes(invoice.status || "") && (
                            <>
                              <button
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: "#5F00BA" }}
                                title={invoice.sentAt ? "Renvoyer" : "Envoyer"}
                                onClick={() => openEmailModal(invoice)}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#F3E8FF")}
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "transparent")
                                }
                              >
                                <Send className="h-4 w-4" />
                              </button>

                              <button
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: "#28B95F" }}
                                title="Marquer comme payée"
                                onClick={() => openPaymentModal(invoice)}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#D4EDDA")}
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "transparent")
                                }
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          <div className="relative group">
                            <button
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "#666666" }}
                              disabled={actionLoading === invoice.id}
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
                              <button
                                onClick={() => handleAction(invoice, "duplicate")}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <Copy className="h-4 w-4" />
                                Dupliquer
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <LinkIcon className="h-4 w-4" />
                                Copier le lien
                              </button>
                              {/* Seuls les brouillons peuvent être supprimés (obligation légale) */}
                              {invoice.status === "draft" && (
                                <>
                                  <div style={{ borderTop: "1px solid #EEEEEE", margin: "4px 0" }} />
                                  <button
                                    onClick={() => {
                                      setInvoiceToDelete(invoice)
                                      setDeleteDialogOpen(true)
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#FEE2E8]"
                                    style={{ color: "#F04B69" }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Supprimer
                                  </button>
                                </>
                              )}
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
              factures
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
                        background: page === pageNum ? "#0064FA" : "#FFFFFF",
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
              <div className="ml-4 w-20">
                <StyledSelect
                  value={perPage.toString()}
                  onChange={(v) => {
                    setPerPage(parseInt(v))
                    setPage(1)
                  }}
                  options={invoicePerPageOptions}
                  showCheckmark={false}
                />
              </div>
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
              Supprimer la facture
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Êtes-vous sûr de vouloir supprimer la facture{" "}
              <strong>{invoiceToDelete?.invoiceNumber}</strong> ? Cette action est irréversible.
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

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEmailModalOpen(false)} />
          <div
            className="relative w-full max-w-xl rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 16px 48px rgba(0,0,0,0.16)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Envoyer la facture par email
                </h3>
                <p className="text-sm mt-1" style={{ color: "#666666" }}>
                  Facture {emailInvoice?.invoiceNumber} - {emailInvoice?.client.companyName}
                </p>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]"
              >
                <X className="h-5 w-5" style={{ color: "#666666" }} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold" style={{ color: "#444444" }}>
                Mode de paiement
              </p>

              {/* Prélèvement */}
              <label
                className="flex items-center p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border:
                    paymentMethod === "debit" ? "2px solid #0064FA" : "2px solid #EEEEEE",
                  background: paymentMethod === "debit" ? "#E3F2FD" : "#FFFFFF",
                }}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="debit"
                  checked={paymentMethod === "debit"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5"
                  style={{ accentColor: "#0064FA" }}
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mr-2"
                      style={{ background: "#E3F2FD" }}
                    >
                      <Building2 className="w-4 h-4" style={{ color: "#0064FA" }} />
                    </div>
                    <span className="font-semibold" style={{ color: "#111111" }}>
                      Prélèvement automatique
                    </span>
                  </div>
                  <p className="text-sm mt-1 ml-10" style={{ color: "#666666" }}>
                    Le montant sera prélevé automatiquement
                  </p>
                </div>
              </label>

              {/* Virement */}
              <label
                className="flex items-center p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border:
                    paymentMethod === "transfer" ? "2px solid #28B95F" : "2px solid #EEEEEE",
                  background: paymentMethod === "transfer" ? "#D4EDDA" : "#FFFFFF",
                }}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="transfer"
                  checked={paymentMethod === "transfer"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5"
                  style={{ accentColor: "#28B95F" }}
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mr-2"
                      style={{ background: "#D4EDDA" }}
                    >
                      <Banknote className="w-4 h-4" style={{ color: "#28B95F" }} />
                    </div>
                    <span className="font-semibold" style={{ color: "#111111" }}>
                      Virement bancaire
                    </span>
                  </div>
                  <p className="text-sm mt-1 ml-10" style={{ color: "#666666" }}>
                    Le client effectue un virement manuel
                  </p>
                </div>
              </label>

              {/* Carte */}
              <label
                className="flex items-center p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border:
                    paymentMethod === "card" ? "2px solid #5F00BA" : "2px solid #EEEEEE",
                  background: paymentMethod === "card" ? "#F3E8FF" : "#FFFFFF",
                }}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-5 h-5"
                  style={{ accentColor: "#5F00BA" }}
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mr-2"
                      style={{ background: "#F3E8FF" }}
                    >
                      <CreditCard className="w-4 h-4" style={{ color: "#5F00BA" }} />
                    </div>
                    <span className="font-semibold" style={{ color: "#111111" }}>
                      Carte bancaire
                    </span>
                  </div>
                  <p className="text-sm mt-1 ml-10" style={{ color: "#666666" }}>
                    Paiement sécurisé via lien
                  </p>
                </div>
              </label>

              {/* Date prélèvement */}
              {paymentMethod === "debit" && (
                <div>
                  <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
                    Date de prélèvement
                  </label>
                  <input
                    type="date"
                    value={debitDate}
                    onChange={(e) => setDebitDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#111111" }}
                  />
                  <p className="text-xs mt-1" style={{ color: "#999999" }}>
                    Le client sera informé de la date de prélèvement
                  </p>
                </div>
              )}

              {/* Lien de paiement Revolut */}
              {paymentMethod === "card" && (
                <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <label className="text-sm font-semibold mb-2 block" style={{ color: "#444444" }}>
                    Lien de paiement Revolut
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={paymentLink}
                      onChange={(e) => {
                        setPaymentLink(e.target.value)
                        setPaymentLinkError(null)
                      }}
                      placeholder="https://checkout.revolut.com/..."
                      className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#111111" }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!emailInvoice) return
                        setGeneratingPaymentLink(true)
                        setPaymentLinkError(null)
                        try {
                          const res = await fetch("/api/revolut/payment-link", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              invoiceId: emailInvoice.id,
                              amount: emailInvoice.totalTtc,
                              currency: "EUR",
                              description: `Facture ${emailInvoice.invoiceNumber}`,
                            }),
                          })
                          const data = await res.json()
                          if (res.ok && data.paymentLink) {
                            setPaymentLink(data.paymentLink)
                          } else {
                            setPaymentLinkError(data.error || "Erreur lors de la génération")
                          }
                        } catch (err) {
                          setPaymentLinkError("Erreur de connexion")
                        } finally {
                          setGeneratingPaymentLink(false)
                        }
                      }}
                      disabled={generatingPaymentLink}
                      className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: "#5F00BA", color: "#FFFFFF" }}
                    >
                      {generatingPaymentLink ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Générer lien Revolut
                    </button>
                  </div>
                  {paymentLinkError && (
                    <p className="text-sm mt-2" style={{ color: "#DC2626" }}>{paymentLinkError}</p>
                  )}
                  <p className="text-xs mt-2" style={{ color: "#999999" }}>
                    Cliquez sur &quot;Générer&quot; pour créer automatiquement un lien de paiement Revolut
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!paymentMethod || sendingEmail}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: "#0064FA", color: "#FFFFFF" }}
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPaymentModalOpen(false)} />
          <div
            className="relative w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 16px 48px rgba(0,0,0,0.16)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Marquer comme payée
                </h3>
                <p className="text-sm mt-1" style={{ color: "#666666" }}>
                  Facture {paymentInvoice?.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]"
              >
                <X className="h-5 w-5" style={{ color: "#666666" }} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Amount Display */}
              <div className="rounded-2xl p-4 text-center" style={{ background: "#D4EDDA" }}>
                <p className="text-sm font-medium" style={{ color: "#28B95F" }}>
                  Montant à encaisser
                </p>
                <p className="text-3xl font-bold mt-1" style={{ color: "#1A7F3E" }}>
                  {formatCurrencyFull(paymentInvoice?.totalTtc || 0)}
                </p>
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
                  Date de paiement
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#111111" }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
                  Mode de paiement
                </label>
                <StyledSelect
                  value={paymentMethodModal}
                  onChange={setPaymentMethodModal}
                  options={paymentMethodOptions}
                  placeholder="Sélectionner..."
                />
              </div>

              {/* Bank Transaction Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
                  Rapprochement bancaire (optionnel)
                </label>
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#0064FA" }} />
                  </div>
                ) : bankTransactions.suggested.length > 0 || bankTransactions.others.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl p-2" style={{ background: "#F5F5F7" }}>
                    {bankTransactions.suggested.length > 0 && (
                      <>
                        <p className="text-xs font-medium px-2" style={{ color: "#28B95F" }}>
                          Correspondances suggérées
                        </p>
                        {bankTransactions.suggested.map((tx) => (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => setSelectedTransactionId(selectedTransactionId === tx.id ? null : tx.id)}
                            className="w-full text-left p-2 rounded-lg transition-all flex items-center justify-between"
                            style={{
                              background: selectedTransactionId === tx.id ? "#D4EDDA" : "#FFFFFF",
                              border: selectedTransactionId === tx.id ? "2px solid #28B95F" : "1px solid #EEEEEE",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium" style={{ color: "#111111" }}>
                                  {tx.isPartiallyReconciled ? (
                                    <>
                                      <span style={{ color: "#0064FA" }}>{formatCurrencyFull(tx.remainingAmount)}</span>
                                      <span className="text-xs" style={{ color: "#999999" }}> / {formatCurrencyFull(tx.amount)}</span>
                                    </>
                                  ) : (
                                    formatCurrencyFull(tx.amount)
                                  )}
                                </p>
                                {tx.isExactMatch && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#D4EDDA", color: "#28B95F" }}>
                                    Exact
                                  </span>
                                )}
                                {tx.isPartiallyReconciled && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#E3F2FD", color: "#0064FA" }}>
                                    Batch
                                  </span>
                                )}
                              </div>
                              <p className="text-xs truncate" style={{ color: "#666666" }}>
                                {new Date(tx.date).toLocaleDateString("fr-FR")} - {tx.counterpartyName || tx.label || "Transaction"}
                              </p>
                              {tx.isPartiallyReconciled && (
                                <p className="text-xs" style={{ color: "#0064FA" }}>
                                  Déjà réconcilié: {formatCurrencyFull(tx.reconciledAmount)}
                                </p>
                              )}
                            </div>
                            {selectedTransactionId === tx.id && (
                              <CheckCircle className="h-5 w-5 flex-shrink-0 ml-2" style={{ color: "#28B95F" }} />
                            )}
                          </button>
                        ))}
                      </>
                    )}
                    {bankTransactions.others.length > 0 && (
                      <>
                        <p className="text-xs font-medium px-2 mt-2" style={{ color: "#666666" }}>
                          Autres transactions
                        </p>
                        {bankTransactions.others.slice(0, 5).map((tx) => (
                          <button
                            key={tx.id}
                            type="button"
                            onClick={() => setSelectedTransactionId(selectedTransactionId === tx.id ? null : tx.id)}
                            className="w-full text-left p-2 rounded-lg transition-all flex items-center justify-between"
                            style={{
                              background: selectedTransactionId === tx.id ? "#E8F4FD" : "#FFFFFF",
                              border: selectedTransactionId === tx.id ? "2px solid #0064FA" : "1px solid #EEEEEE",
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium" style={{ color: "#111111" }}>
                                  {tx.isPartiallyReconciled ? (
                                    <>
                                      <span style={{ color: "#0064FA" }}>{formatCurrencyFull(tx.remainingAmount)}</span>
                                      <span className="text-xs" style={{ color: "#999999" }}> / {formatCurrencyFull(tx.amount)}</span>
                                    </>
                                  ) : (
                                    formatCurrencyFull(tx.amount)
                                  )}
                                </p>
                                {tx.isPartiallyReconciled && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#E3F2FD", color: "#0064FA" }}>
                                    Batch
                                  </span>
                                )}
                              </div>
                              <p className="text-xs truncate" style={{ color: "#666666" }}>
                                {new Date(tx.date).toLocaleDateString("fr-FR")} - {tx.counterpartyName || tx.label || "Transaction"}
                              </p>
                              {tx.isPartiallyReconciled && (
                                <p className="text-xs" style={{ color: "#0064FA" }}>
                                  Déjà réconcilié: {formatCurrencyFull(tx.reconciledAmount)}
                                </p>
                              )}
                            </div>
                            {selectedTransactionId === tx.id && (
                              <CheckCircle className="h-5 w-5 flex-shrink-0 ml-2" style={{ color: "#0064FA" }} />
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs py-2" style={{ color: "#999999" }}>
                    Aucune transaction bancaire non rapprochée disponible
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: "#444444" }}>
                  Notes (optionnel)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Référence, numéro de transaction..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                  style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#111111" }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                Annuler
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={!paymentMethodModal || markingPaid}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ background: "#28B95F", color: "#FFFFFF" }}
              >
                {markingPaid ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirmer le paiement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
