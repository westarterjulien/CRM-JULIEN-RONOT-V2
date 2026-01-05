"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Download,
  Mail,
  CheckCircle,
  Copy,
  Trash2,
  Building2,
  Calendar,
  CalendarClock,
  FileText,
  AlertCircle,
  Clock,
  Ban,
  Send,
  CreditCard,
  Banknote,
  CircleDollarSign,
  Euro,
  Eye,
  History,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"
import { NotesSidebarCard } from "@/components/notes"

const paymentMethodOptions: SelectOption[] = [
  { value: "virement", label: "Virement bancaire", color: "#28B95F" },
  { value: "prelevement", label: "Prélèvement SEPA", color: "#0064FA" },
  { value: "carte", label: "Carte bancaire", color: "#7C3AED" },
  { value: "cheque", label: "Chèque", color: "#F0783C" },
  { value: "especes", label: "Espèces", color: "#DCB40A" },
]

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPriceHt: number
  vatRate: number
  totalHt: number
  totalTtc: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  issueDate: string
  dueDate: string
  paymentDate: string | null
  paymentTerms: number
  notes: string | null
  totalHt: number
  totalVat: number
  totalTtc: number
  createdAt: string
  updatedAt: string
  paymentMethod: string | null
  debitDate: string | null
  payment_link: string | null
  client: {
    id: string
    companyName: string
    email: string
    phone: string | null
    address: string | null
    postalCode: string | null
    city: string | null
    country: string | null
    siret: string | null
    vatNumber: string | null
    contactFirstname: string | null
    contactLastname: string | null
  }
  items: InvoiceItem[]
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Brouillon", color: "#666666", bg: "#F5F5F7" },
  sent: { label: "Envoyée", color: "#0064FA", bg: "#E3F2FD" },
  paid: { label: "Payée", color: "#28B95F", bg: "#D4EDDA" },
  overdue: { label: "En retard", color: "#F0783C", bg: "#FFF3E0" },
  cancelled: { label: "Annulée", color: "#F04B69", bg: "#FEE2E8" },
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false)
  const [newDueDate, setNewDueDate] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [debitDate, setDebitDate] = useState("")
  const [paymentLink, setPaymentLink] = useState("")
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false)
  const [paymentLinkError, setPaymentLinkError] = useState<string | null>(null)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [paymentCheckResult, setPaymentCheckResult] = useState<{
    status: string
    message: string
  } | null>(null)

  // Mark as paid modal states
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false)
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split("T")[0])
  const [markPaidMethod, setMarkPaidMethod] = useState("virement")
  const [markPaidNotes, setMarkPaidNotes] = useState("")
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [bankTransactions, setBankTransactions] = useState<{
    suggested: Array<{
      id: string
      date: string
      amount: number
      counterpartyName: string | null
      label: string | null
      reference: string | null
      isExactMatch: boolean
      isCloseMatch: boolean
    }>
    others: Array<{
      id: string
      date: string
      amount: number
      counterpartyName: string | null
      label: string | null
      reference: string | null
      isExactMatch: boolean
      isCloseMatch: boolean
    }>
  }>({ suggested: [], others: [] })
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invoice not found")
        return res.json()
      })
      .then(setInvoice)
      .catch((error) => {
        console.error(error)
        router.push("/invoices")
      })
      .finally(() => setLoading(false))
  }, [id, router])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOverdue = () => {
    if (!invoice) return false
    if (invoice.status === "paid" || invoice.status === "cancelled") return false
    return new Date(invoice.dueDate) < new Date()
  }

  const getDaysRemaining = () => {
    if (!invoice) return 0
    const diff = new Date(invoice.dueDate).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getDaysOverdue = () => {
    if (!invoice) return 0
    const diff = new Date().getTime() - new Date(invoice.dueDate).getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getClientInitials = () => {
    if (!invoice) return "??"
    return invoice.client.companyName.substring(0, 2).toUpperCase()
  }

  const handleAction = async (action: string) => {
    if (!invoice) return

    if (action === "download") {
      window.location.href = `/api/invoices/${id}/download`
      return
    }

    if (action === "preview") {
      window.open(`/api/invoices/${id}/pdf`, "_blank")
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (response.ok) {
        if (action === "duplicate") {
          const data = await response.json()
          router.push(`/invoices/${data.id}/edit`)
        } else {
          const updatedInvoice = await response.json()
          setInvoice(updatedInvoice)
        }
      }
    } catch (error) {
      console.error(`Error performing action ${action}:`, error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        router.push("/invoices")
      }
    } catch (error) {
      console.error("Error deleting invoice:", error)
    } finally {
      setActionLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleSendEmail = async () => {
    if (!paymentMethod) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/invoices/${id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          debitDate: paymentMethod === "debit" ? debitDate : null,
          paymentLink: paymentMethod === "card" ? paymentLink : null,
        }),
      })
      if (response.ok) {
        const updatedInvoice = await response.json()
        setInvoice(updatedInvoice)
        setEmailDialogOpen(false)
        setPaymentMethod("")
        setDebitDate("")
        setPaymentLink("")
      }
    } catch (error) {
      console.error("Error sending email:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeDueDate = async () => {
    if (!newDueDate || !invoice) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/invoices/${id}/due-date`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDueDate }),
      })
      if (response.ok) {
        const data = await response.json()
        setInvoice({ ...invoice, dueDate: data.dueDate })
        setDueDateDialogOpen(false)
        setNewDueDate("")
      }
    } catch (error) {
      console.error("Error changing due date:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const openDueDateDialog = () => {
    if (invoice) {
      setNewDueDate(invoice.dueDate.split("T")[0])
      setDueDateDialogOpen(true)
    }
  }

  const openMarkPaidModal = async () => {
    setMarkPaidDialogOpen(true)
    setLoadingTransactions(true)
    setSelectedTransactionId(null)
    setMarkPaidDate(new Date().toISOString().split("T")[0])
    setMarkPaidMethod("virement")
    setMarkPaidNotes("")

    try {
      const response = await fetch(`/api/invoices/${id}/reconcile-suggestions`)
      if (response.ok) {
        const data = await response.json()
        setBankTransactions({
          suggested: data.suggested || [],
          others: data.others || [],
        })
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!invoice) return
    setActionLoading(true)

    try {
      const response = await fetch(`/api/invoices/${id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentDate: markPaidDate,
          paymentMethod: markPaidMethod,
          paymentNotes: markPaidNotes || null,
          bankTransactionId: selectedTransactionId || null,
        }),
      })

      if (response.ok) {
        // Refresh invoice data
        const invoiceResponse = await fetch(`/api/invoices/${id}`)
        if (invoiceResponse.ok) {
          const updatedInvoice = await invoiceResponse.json()
          setInvoice(updatedInvoice)
        }
        setMarkPaidDialogOpen(false)
      }
    } catch (error) {
      console.error("Error marking invoice as paid:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckPayment = async () => {
    if (!invoice) return
    setCheckingPayment(true)
    setPaymentCheckResult(null)

    try {
      const response = await fetch("/api/revolut/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })

      const result = await response.json()
      setPaymentCheckResult(result)

      // If payment was detected, refresh invoice data
      if (result.status === "paid") {
        const invoiceResponse = await fetch(`/api/invoices/${id}`)
        if (invoiceResponse.ok) {
          const updatedInvoice = await invoiceResponse.json()
          setInvoice(updatedInvoice)
        }
      }
    } catch (error) {
      console.error("Error checking payment:", error)
      setPaymentCheckResult({
        status: "error",
        message: "Erreur lors de la vérification",
      })
    } finally {
      setCheckingPayment(false)
    }
  }

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          className="h-10 w-10 border-4 rounded-full animate-spin"
          style={{ borderColor: "#EEEEEE", borderTopColor: "#0064FA" }}
        />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-96">
        <p style={{ color: "#666666" }}>Facture introuvable</p>
      </div>
    )
  }

  const currentStatus = isOverdue() ? "overdue" : invoice.status
  const statusInfo = statusConfig[currentStatus] || statusConfig.draft

  return (
    <div className="space-y-6">
      {/* Header - Style sobre */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
              style={{ background: "#F5F5F7", color: "#666666" }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
                {invoice.invoiceNumber}
              </h1>
              <span
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{ background: statusInfo.bg, color: statusInfo.color }}
              >
                {statusInfo.label}
              </span>
            </div>
            <Link
              href={`/clients/${invoice.client.id}`}
              className="text-sm mt-1 inline-block hover:underline"
              style={{ color: "#666666" }}
            >
              {invoice.client.companyName}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <Link href={`/invoices/${id}/edit`}>
              <button
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#0064FA", color: "#FFFFFF" }}
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
            </Link>
          )}
          <button
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: "#F5F5F7", color: "#666666" }}
            onClick={() => handleAction("download")}
            disabled={actionLoading}
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <button
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: "#28B95F", color: "#FFFFFF" }}
              onClick={() => setEmailDialogOpen(true)}
              disabled={actionLoading}
            >
              <Mail className="h-4 w-4" />
              Envoyer
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Preview Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Header */}
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#D4EDDA" }}
                  >
                    <FileText className="h-5 w-5" style={{ color: "#28B95F" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "#111111" }}>
                      Aperçu de la facture
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      {invoice.invoiceNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: "#666666" }}>Émise le</p>
                  <p className="font-semibold" style={{ color: "#111111" }}>
                    {formatShortDate(invoice.issueDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Client & Dates Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Client Info */}
                <div className="rounded-xl p-4" style={{ background: "#F5F5F7" }}>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "#999999" }}
                  >
                    Client
                  </h4>
                  <p className="font-semibold text-lg" style={{ color: "#111111" }}>
                    {invoice.client.companyName}
                  </p>
                  {(invoice.client.contactFirstname || invoice.client.contactLastname) && (
                    <p style={{ color: "#666666" }}>
                      {invoice.client.contactFirstname} {invoice.client.contactLastname}
                    </p>
                  )}
                  {invoice.client.address && (
                    <p className="mt-2" style={{ color: "#666666" }}>
                      {invoice.client.address}
                    </p>
                  )}
                  {(invoice.client.postalCode || invoice.client.city) && (
                    <p style={{ color: "#666666" }}>
                      {invoice.client.postalCode} {invoice.client.city}
                    </p>
                  )}
                  {invoice.client.email && (
                    <p className="text-sm mt-3 flex items-center gap-2" style={{ color: "#666666" }}>
                      <Mail className="h-4 w-4" />
                      {invoice.client.email}
                    </p>
                  )}
                </div>

                {/* Dates Info */}
                <div className="rounded-xl p-4" style={{ background: "#F5F5F7" }}>
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "#999999" }}
                  >
                    Informations
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span style={{ color: "#666666" }}>Date d&apos;émission</span>
                      <span className="font-semibold" style={{ color: "#111111" }}>
                        {formatShortDate(invoice.issueDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "#666666" }}>Date d&apos;échéance</span>
                      <span
                        className="font-semibold"
                        style={{ color: isOverdue() ? "#F04B69" : "#111111" }}
                      >
                        {formatShortDate(invoice.dueDate)}
                      </span>
                    </div>
                    {invoice.paymentDate && (
                      <div className="flex justify-between">
                        <span style={{ color: "#666666" }}>Date de paiement</span>
                        <span className="font-semibold" style={{ color: "#28B95F" }}>
                          {formatShortDate(invoice.paymentDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method Info */}
                {invoice.paymentMethod && (
                  <div className="p-4 rounded-xl" style={{ background: "#FAFAFA", border: "1px solid #EEEEEE" }}>
                    <h4
                      className="text-xs font-semibold uppercase tracking-wider mb-3"
                      style={{ color: "#999999" }}
                    >
                      Mode de paiement
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {invoice.paymentMethod === "debit" && (
                          <>
                            <div className="p-2 rounded-lg" style={{ background: "#E3F2FD" }}>
                              <Banknote className="h-4 w-4" style={{ color: "#0064FA" }} />
                            </div>
                            <span className="font-semibold" style={{ color: "#0064FA" }}>Prélèvement SEPA</span>
                          </>
                        )}
                        {invoice.paymentMethod === "transfer" && (
                          <>
                            <div className="p-2 rounded-lg" style={{ background: "#D4EDDA" }}>
                              <Euro className="h-4 w-4" style={{ color: "#28B95F" }} />
                            </div>
                            <span className="font-semibold" style={{ color: "#28B95F" }}>Virement bancaire</span>
                          </>
                        )}
                        {invoice.paymentMethod === "card" && (
                          <>
                            <div className="p-2 rounded-lg" style={{ background: "#F3E8FF" }}>
                              <CreditCard className="h-4 w-4" style={{ color: "#5F00BA" }} />
                            </div>
                            <span className="font-semibold" style={{ color: "#5F00BA" }}>Carte bancaire (Revolut)</span>
                          </>
                        )}
                      </div>
                      {invoice.paymentMethod === "debit" && invoice.debitDate && (
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "#666666" }}>Date de prélèvement</span>
                          <span className="font-medium" style={{ color: "#0064FA" }}>
                            {formatShortDate(invoice.debitDate)}
                          </span>
                        </div>
                      )}
                      {invoice.paymentMethod === "card" && invoice.payment_link && (
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={invoice.payment_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                              style={{ background: "#5F00BA", color: "#FFFFFF" }}
                            >
                              <CreditCard className="h-4 w-4" />
                              Voir le lien de paiement
                            </a>
                            {invoice.status !== "paid" && (
                              <button
                                onClick={handleCheckPayment}
                                disabled={checkingPayment}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                                style={{ background: "#F5F5F7", color: "#5F00BA", border: "1px solid #5F00BA" }}
                              >
                                {checkingPayment ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Vérification...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4" />
                                    Vérifier le paiement
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          {paymentCheckResult && (
                            <div
                              className="p-3 rounded-lg text-sm flex items-center gap-2"
                              style={{
                                background: paymentCheckResult.status === "paid" ? "#D4EDDA" :
                                           paymentCheckResult.status === "error" ? "#FEE2E8" : "#E3F2FD",
                                color: paymentCheckResult.status === "paid" ? "#28B95F" :
                                       paymentCheckResult.status === "error" ? "#F04B69" : "#0064FA",
                              }}
                            >
                              {paymentCheckResult.status === "paid" ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : paymentCheckResult.status === "error" ? (
                                <AlertCircle className="h-4 w-4" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
                              {paymentCheckResult.message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h4
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "#999999" }}
                >
                  Détail des prestations
                </h4>
                <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #EEEEEE" }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#FAFAFA" }}>
                        <th
                          className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Description
                        </th>
                        <th
                          className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Qté
                        </th>
                        <th
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Prix unit.
                        </th>
                        <th
                          className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          TVA
                        </th>
                        <th
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Total HT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-[#FAFAFA] transition-colors"
                          style={{
                            borderBottom:
                              idx < invoice.items.length - 1 ? "1px solid #EEEEEE" : "none",
                          }}
                        >
                          <td className="py-4 px-4 font-medium" style={{ color: "#111111" }}>
                            {item.description}
                          </td>
                          <td className="py-4 px-4 text-center" style={{ color: "#666666" }}>
                            {item.quantity.toFixed(2).replace(".", ",")}
                          </td>
                          <td className="py-4 px-4 text-right" style={{ color: "#666666" }}>
                            {formatCurrency(item.unitPriceHt)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                              style={{ background: "#F5F5F7", color: "#666666" }}
                            >
                              {item.vatRate}%
                            </span>
                          </td>
                          <td
                            className="py-4 px-4 text-right font-semibold"
                            style={{ color: "#111111" }}
                          >
                            {formatCurrency(item.totalHt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full md:w-80">
                  <div className="rounded-xl p-5" style={{ background: "#F5F5F7" }}>
                    <div className="space-y-2">
                      <div className="flex justify-between" style={{ color: "#666666" }}>
                        <span>Sous-total HT</span>
                        <span className="font-medium">{formatCurrency(invoice.totalHt)}</span>
                      </div>
                      <div className="flex justify-between" style={{ color: "#666666" }}>
                        <span>TVA</span>
                        <span className="font-medium">{formatCurrency(invoice.totalVat)}</span>
                      </div>
                      <div
                        className="pt-2 mt-2"
                        style={{ borderTop: "1px solid #DDDDDD" }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold" style={{ color: "#111111" }}>
                            Total TTC
                          </span>
                          <span className="text-2xl font-bold" style={{ color: "#28B95F" }}>
                            {formatCurrency(invoice.totalTtc)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-6">
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "#999999" }}
                  >
                    Notes
                  </h4>
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "#FFF9E6", border: "1px solid #DCB40A" }}
                  >
                    <p className="whitespace-pre-wrap" style={{ color: "#111111" }}>
                      {invoice.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4">
            {/* Montant TTC */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "#666666" }}>
                    Montant TTC
                  </p>
                  <p className="text-2xl font-bold mt-1" style={{ color: "#28B95F" }}>
                    {formatCurrency(invoice.totalTtc)}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#D4EDDA" }}
                >
                  <Euro className="w-6 h-6" style={{ color: "#28B95F" }} />
                </div>
              </div>
            </div>

            {/* Échéance */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "#666666" }}>
                    Échéance
                  </p>
                  {invoice.status === "paid" ? (
                    <p className="text-lg font-semibold mt-1 flex items-center gap-2" style={{ color: "#28B95F" }}>
                      <CheckCircle className="h-5 w-5" />
                      Payée
                    </p>
                  ) : isOverdue() ? (
                    <p className="text-lg font-semibold mt-1" style={{ color: "#F04B69" }}>
                      En retard de {getDaysOverdue()} jour{getDaysOverdue() > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-lg font-semibold mt-1" style={{ color: "#111111" }}>
                      {getDaysRemaining()} jour{getDaysRemaining() > 1 ? "s" : ""} restant{getDaysRemaining() > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: invoice.status === "paid" ? "#D4EDDA" : isOverdue() ? "#FEE2E8" : "#E3F2FD",
                  }}
                >
                  {invoice.status === "paid" ? (
                    <CheckCircle className="w-6 h-6" style={{ color: "#28B95F" }} />
                  ) : (
                    <Clock className="w-6 h-6" style={{ color: isOverdue() ? "#F04B69" : "#0064FA" }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Actions rapides
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {invoice.status === "draft" && (
                <button
                  className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                  style={{ background: "#E3F2FD", color: "#0064FA" }}
                  onClick={() => handleAction("markSent")}
                  disabled={actionLoading}
                >
                  <Send className="h-4 w-4" />
                  Marquer comme envoyée
                </button>
              )}

              {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                <button
                  className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                  style={{ background: "#D4EDDA", color: "#28B95F" }}
                  onClick={openMarkPaidModal}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4" />
                  Marquer comme payée
                </button>
              )}

              {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                <button
                  className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                  style={{ background: "#FFF3E0", color: "#F0783C" }}
                  onClick={openDueDateDialog}
                  disabled={actionLoading}
                >
                  <CalendarClock className="h-4 w-4" />
                  Modifier l&apos;échéance
                </button>
              )}

              <button
                className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: "#F3E8FF", color: "#5F00BA" }}
                onClick={() => handleAction("duplicate")}
                disabled={actionLoading}
              >
                <Copy className="h-4 w-4" />
                Dupliquer
              </button>

              <button
                className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => handleAction("download")}
                disabled={actionLoading}
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>

              {invoice.status === "draft" && (
                <button
                  className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                  style={{ background: "#FEE2E8", color: "#F04B69" }}
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={actionLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              )}
            </div>
          </div>

          {/* Timeline Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div
              className="px-5 py-4 flex items-center gap-2"
              style={{ borderBottom: "1px solid #EEEEEE" }}
            >
              <History className="h-4 w-4" style={{ color: "#666666" }} />
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Historique
              </h3>
            </div>
            <div className="p-5">
              <div className="relative">
                <div
                  className="absolute left-2 top-0 bottom-0 w-0.5"
                  style={{ background: "#EEEEEE" }}
                />

                <div className="space-y-4">
                  {invoice.paymentDate && (
                    <div className="relative flex items-start gap-4 pl-6">
                      <div
                        className="absolute left-0 w-4 h-4 rounded-full"
                        style={{ background: "#28B95F", border: "2px solid #FFFFFF" }}
                      />
                      <div>
                        <p className="font-semibold" style={{ color: "#111111" }}>
                          Payée
                        </p>
                        <p className="text-sm" style={{ color: "#666666" }}>
                          {formatShortDate(invoice.paymentDate)}
                        </p>
                      </div>
                    </div>
                  )}

                  {["sent", "paid", "overdue"].includes(invoice.status) && (
                    <div className="relative flex items-start gap-4 pl-6">
                      <div
                        className="absolute left-0 w-4 h-4 rounded-full"
                        style={{ background: "#0064FA", border: "2px solid #FFFFFF" }}
                      />
                      <div>
                        <p className="font-semibold" style={{ color: "#111111" }}>
                          Envoyée
                        </p>
                        <p className="text-sm" style={{ color: "#666666" }}>
                          {formatShortDate(invoice.updatedAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative flex items-start gap-4 pl-6">
                    <div
                      className="absolute left-0 w-4 h-4 rounded-full"
                      style={{ background: "#999999", border: "2px solid #FFFFFF" }}
                    />
                    <div>
                      <p className="font-semibold" style={{ color: "#111111" }}>
                        Créée
                      </p>
                      <p className="text-sm" style={{ color: "#666666" }}>
                        {formatDateTime(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div
              className="px-5 py-4 flex items-center gap-2"
              style={{ borderBottom: "1px solid #EEEEEE" }}
            >
              <Building2 className="h-4 w-4" style={{ color: "#666666" }} />
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Client
              </h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  {getClientInitials()}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "#111111" }}>
                    {invoice.client.companyName}
                  </p>
                  {invoice.client.email && (
                    <p className="text-sm" style={{ color: "#666666" }}>
                      {invoice.client.email}
                    </p>
                  )}
                </div>
              </div>

              <Link href={`/clients/${invoice.client.id}`}>
                <button
                  className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  <Eye className="h-4 w-4" />
                  Voir la fiche client
                </button>
              </Link>
            </div>
          </div>

          {/* Notes Card */}
          <NotesSidebarCard entityType="invoice" entityId={id} />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#FEE2E8" }}
              >
                <Trash2 className="h-5 w-5" style={{ color: "#F04B69" }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Supprimer la facture
                </h3>
              </div>
            </div>
            <p className="mb-6" style={{ color: "#666666" }}>
              Êtes-vous sûr de vouloir supprimer la facture{" "}
              <strong>{invoice.invoiceNumber}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => setDeleteDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#F04B69", color: "#FFFFFF" }}
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {emailDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-xl rounded-2xl"
            style={{ background: "#FFFFFF" }}
          >
            <div className="p-6" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#D4EDDA" }}
                  >
                    <Mail className="h-5 w-5" style={{ color: "#28B95F" }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                      Envoyer la facture
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Sélectionnez le mode de paiement qui sera indiqué au client
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailDialogOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                  style={{ background: "#F5F5F7" }}
                >
                  <X className="h-4 w-4" style={{ color: "#666666" }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {/* Prélèvement automatique */}
              <label
                className="flex items-center p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px solid ${paymentMethod === "debit" ? "#0064FA" : "#EEEEEE"}`,
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
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" style={{ color: "#0064FA" }} />
                    <span className="font-semibold" style={{ color: "#111111" }}>
                      Prélèvement automatique
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#666666" }}>
                    Le montant sera prélevé automatiquement
                  </p>
                </div>
              </label>

              {/* Virement bancaire */}
              <label
                className="flex items-center p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px solid ${paymentMethod === "transfer" ? "#28B95F" : "#EEEEEE"}`,
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
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" style={{ color: "#28B95F" }} />
                    <span className="font-semibold" style={{ color: "#111111" }}>
                      Virement bancaire
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#666666" }}>
                    Le client effectue un virement manuel
                  </p>
                </div>
              </label>

              {/* Carte bancaire */}
              <label
                className="flex items-center p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px solid ${paymentMethod === "card" ? "#5F00BA" : "#EEEEEE"}`,
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
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5" style={{ color: "#5F00BA" }} />
                    <span className="font-semibold" style={{ color: "#111111" }}>
                      Carte bancaire en ligne
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#666666" }}>
                    Paiement sécurisé via Revolut
                  </p>
                </div>
              </label>

              {/* Date de prélèvement field */}
              {paymentMethod === "debit" && (
                <div className="mt-4 p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <label className="text-sm font-semibold" style={{ color: "#444444" }}>
                    Date de prélèvement
                  </label>
                  <input
                    type="date"
                    value={debitDate}
                    onChange={(e) => setDebitDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full mt-2 px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                  <p className="text-sm mt-1" style={{ color: "#999999" }}>
                    Le client sera informé de cette date
                  </p>
                </div>
              )}

              {/* Lien de paiement field */}
              {paymentMethod === "card" && (
                <div className="mt-4 p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <label className="text-sm font-semibold" style={{ color: "#444444" }}>
                    Lien de paiement Revolut
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <input
                      type="url"
                      value={paymentLink}
                      onChange={(e) => {
                        setPaymentLink(e.target.value)
                        setPaymentLinkError(null)
                      }}
                      placeholder="https://checkout.revolut.com/..."
                      className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!invoice) return
                        setGeneratingPaymentLink(true)
                        setPaymentLinkError(null)
                        try {
                          const res = await fetch("/api/revolut/payment-link", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              invoiceId: invoice.id,
                              amount: invoice.totalTtc,
                              currency: "EUR",
                              description: `Facture ${invoice.invoiceNumber}`,
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

            <div
              className="p-6 flex gap-3"
              style={{ borderTop: "1px solid #EEEEEE" }}
            >
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => setEmailDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "#28B95F", color: "#FFFFFF" }}
                onClick={handleSendEmail}
                disabled={
                  !paymentMethod ||
                  (paymentMethod === "debit" && !debitDate) ||
                  (paymentMethod === "card" && !paymentLink) ||
                  actionLoading
                }
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Due Date Change Modal */}
      {dueDateDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl"
            style={{ background: "#FFFFFF" }}
          >
            <div className="p-6" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#FFF3E0" }}
                  >
                    <CalendarClock className="h-5 w-5" style={{ color: "#F0783C" }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                      Modifier la date d&apos;échéance
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Changer la date limite de paiement
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDueDateDialogOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                  style={{ background: "#F5F5F7" }}
                >
                  <X className="h-4 w-4" style={{ color: "#666666" }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl p-4" style={{ background: "#F5F5F7" }}>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#666666" }}>Échéance actuelle</span>
                  <span className="font-semibold" style={{ color: "#111111" }}>
                    {invoice && formatShortDate(invoice.dueDate)}
                  </span>
                </div>
                {isOverdue() && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#F04B69" }}>
                    <AlertCircle className="h-4 w-4" />
                    <span>En retard de {getDaysOverdue()} jour(s)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>
                  Nouvelle date d&apos;échéance
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              className="p-6 flex gap-3"
              style={{ borderTop: "1px solid #EEEEEE" }}
            >
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => setDueDateDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "#F0783C", color: "#FFFFFF" }}
                onClick={handleChangeDueDate}
                disabled={!newDueDate || actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CalendarClock className="h-4 w-4" />
                    Modifier
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal with Bank Transaction Selection */}
      {markPaidDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ background: "#FFFFFF" }}
          >
            <div className="p-6" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#D4EDDA" }}
                  >
                    <CheckCircle className="h-5 w-5" style={{ color: "#28B95F" }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                      Marquer comme payée
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Enregistrez le paiement et rapprochez-le d&apos;une transaction bancaire
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMarkPaidDialogOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                  style={{ background: "#F5F5F7" }}
                >
                  <X className="h-4 w-4" style={{ color: "#666666" }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Date de paiement
                  </label>
                  <input
                    type="date"
                    value={markPaidDate}
                    onChange={(e) => setMarkPaidDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Méthode de paiement
                  </label>
                  <StyledSelect
                    value={markPaidMethod}
                    onChange={setMarkPaidMethod}
                    options={paymentMethodOptions}
                    placeholder="Méthode de paiement"
                  />
                </div>
              </div>

              {/* Invoice Amount Reminder */}
              <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "#F5F5F7" }}>
                <div>
                  <p className="text-sm" style={{ color: "#666666" }}>Montant de la facture</p>
                  <p className="text-lg font-bold" style={{ color: "#111111" }}>
                    {invoice && formatCurrency(invoice.totalTtc)}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "#D4EDDA" }}
                >
                  <Euro className="h-5 w-5" style={{ color: "#28B95F" }} />
                </div>
              </div>

              {/* Bank Transaction Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Rapprocher avec une transaction bancaire (optionnel)
                  </label>
                  {selectedTransactionId && (
                    <button
                      onClick={() => setSelectedTransactionId(null)}
                      className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                      style={{ background: "#FEE2E8", color: "#F04B69" }}
                    >
                      Désélectionner
                    </button>
                  )}
                </div>

                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#0064FA" }} />
                    <span className="ml-2" style={{ color: "#666666" }}>Chargement des transactions...</span>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {/* Suggested Transactions */}
                    {bankTransactions.suggested.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#28B95F" }}>
                          Correspondances suggérées
                        </p>
                        {bankTransactions.suggested.map((tx) => (
                          <label
                            key={tx.id}
                            className="flex items-center p-3 rounded-xl cursor-pointer transition-all"
                            style={{
                              border: `2px solid ${selectedTransactionId === tx.id ? "#28B95F" : tx.isExactMatch ? "#28B95F" : "#DCB40A"}`,
                              background: selectedTransactionId === tx.id ? "#D4EDDA" : tx.isExactMatch ? "#F0FDF4" : "#FFFBEB",
                            }}
                          >
                            <input
                              type="radio"
                              name="bank_transaction"
                              checked={selectedTransactionId === tx.id}
                              onChange={() => setSelectedTransactionId(tx.id)}
                              className="w-4 h-4"
                              style={{ accentColor: "#28B95F" }}
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold truncate" style={{ color: "#111111" }}>
                                  {formatCurrency(tx.amount)}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{
                                  background: tx.isExactMatch ? "#D4EDDA" : "#FFF9E6",
                                  color: tx.isExactMatch ? "#28B95F" : "#DCB40A"
                                }}>
                                  {tx.isExactMatch ? "Montant exact" : "Proche"}
                                </span>
                              </div>
                              <p className="text-sm truncate" style={{ color: "#666666" }}>
                                {tx.counterpartyName || tx.label || "Transaction sans libellé"}
                              </p>
                              <p className="text-xs" style={{ color: "#999999" }}>
                                {formatShortDate(tx.date)} {tx.reference && `• Réf: ${tx.reference}`}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Other Transactions */}
                    {bankTransactions.others.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                          Autres transactions non rapprochées
                        </p>
                        {bankTransactions.others.slice(0, 5).map((tx) => (
                          <label
                            key={tx.id}
                            className="flex items-center p-3 rounded-xl cursor-pointer transition-all"
                            style={{
                              border: `2px solid ${selectedTransactionId === tx.id ? "#0064FA" : "#EEEEEE"}`,
                              background: selectedTransactionId === tx.id ? "#E3F2FD" : "#FFFFFF",
                            }}
                          >
                            <input
                              type="radio"
                              name="bank_transaction"
                              checked={selectedTransactionId === tx.id}
                              onChange={() => setSelectedTransactionId(tx.id)}
                              className="w-4 h-4"
                              style={{ accentColor: "#0064FA" }}
                            />
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold" style={{ color: "#111111" }}>
                                  {formatCurrency(tx.amount)}
                                </span>
                              </div>
                              <p className="text-sm truncate" style={{ color: "#666666" }}>
                                {tx.counterpartyName || tx.label || "Transaction sans libellé"}
                              </p>
                              <p className="text-xs" style={{ color: "#999999" }}>
                                {formatShortDate(tx.date)}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {bankTransactions.suggested.length === 0 && bankTransactions.others.length === 0 && (
                      <div className="text-center py-6 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <p style={{ color: "#666666" }}>Aucune transaction non rapprochée disponible</p>
                        <p className="text-sm mt-1" style={{ color: "#999999" }}>
                          Les transactions sont synchronisées depuis GoCardless
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>
                  Notes (optionnel)
                </label>
                <textarea
                  value={markPaidNotes}
                  onChange={(e) => setMarkPaidNotes(e.target.value)}
                  placeholder="Référence de paiement, informations complémentaires..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              className="p-6 flex gap-3"
              style={{ borderTop: "1px solid #EEEEEE" }}
            >
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => setMarkPaidDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "#28B95F", color: "#FFFFFF" }}
                onClick={handleMarkPaid}
                disabled={!markPaidDate || actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {selectedTransactionId ? "Valider et rapprocher" : "Marquer comme payée"}
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
