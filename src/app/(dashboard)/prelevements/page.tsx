"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Landmark,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Euro,
  FileText,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  Building2,
  CreditCard,
} from "lucide-react"
import Link from "next/link"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const prelevementStatusOptions: SelectOption[] = [
  { value: "pending", label: "En attente", color: "#F59E0B" },
  { value: "exported", label: "Exportés", color: "#3B82F6" },
  { value: "executed", label: "Exécutés", color: "#10B981" },
]

interface Invoice {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  clientEmail: string | null
  clientIban: string | null
  clientBic: string | null
  sepaMandate: string | null
  sepaMandateDate: string | null
  sepaSequenceType: string
  amount: number
  issueDate: string
  dueDate: string
  debitDate: string
  status: string
  hasValidSepaInfo: boolean
}

interface ApiResponse {
  invoices: Invoice[]
  total: number
  totalAmount: number
}

export default function PrelevementsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState("pending")
  const [totalAmount, setTotalAmount] = useState(0)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [collectionDate, setCollectionDate] = useState("")

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/prelevements?status=${statusFilter}`)
      if (res.ok) {
        const data: ApiResponse = await res.json()
        setInvoices(data.invoices)
        setTotalAmount(data.totalAmount)
      }
    } catch (error) {
      console.error("Error fetching prelevements:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    const validInvoices = invoices.filter((inv) => inv.hasValidSepaInfo)
    if (selectedIds.size === validInvoices.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(validInvoices.map((inv) => inv.id)))
    }
  }

  const generatePain008 = async () => {
    if (selectedIds.size === 0) {
      setMessage({ type: "error", text: "Veuillez sélectionner au moins une facture" })
      return
    }

    setGenerating(true)
    setMessage(null)

    try {
      const res = await fetch("/api/prelevements/pain008", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedIds),
          requestedCollectionDate: collectionDate || undefined,
        }),
      })

      if (res.ok) {
        // Download the file
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        const disposition = res.headers.get("Content-Disposition")
        const filename = disposition?.match(/filename="(.+)"/)?.[1] || "SEPA_DD.xml"
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()

        setMessage({ type: "success", text: `Fichier PAIN.008 généré avec ${selectedIds.size} prélèvement(s)` })

        // Mark as exported
        await fetch("/api/prelevements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceIds: Array.from(selectedIds),
            action: "mark_exported",
          }),
        })

        setSelectedIds(new Set())
        fetchInvoices()
      } else {
        const error = await res.json()
        setMessage({ type: "error", text: error.error || "Erreur lors de la génération" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la génération du fichier" })
    } finally {
      setGenerating(false)
    }
  }

  const markAsPaid = async () => {
    if (selectedIds.size === 0) return

    try {
      const res = await fetch("/api/prelevements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedIds),
          action: "mark_paid",
        }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: `${selectedIds.size} facture(s) marquée(s) comme payée(s)` })
        setSelectedIds(new Set())
        fetchInvoices()
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la mise à jour" })
    }
  }

  const selectedAmount = invoices
    .filter((inv) => selectedIds.has(inv.id))
    .reduce((sum, inv) => sum + inv.amount, 0)

  const validInvoicesCount = invoices.filter((inv) => inv.hasValidSepaInfo).length
  const invalidInvoicesCount = invoices.filter((inv) => !inv.hasValidSepaInfo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#0064FA" }}
            >
              <Landmark className="h-7 w-7" style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
                Prélèvements SEPA
              </h1>
              <p className="text-sm" style={{ color: "#666666" }}>
                Gérez et exportez vos fichiers de prélèvement PAIN.008
              </p>
            </div>
          </div>

          <button
            onClick={fetchInvoices}
            className="px-4 py-2 rounded-xl flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: "#F5F5F7", color: "#666666" }}
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <label className="text-xs font-medium mb-2 block" style={{ color: "#666666" }}>
            Statut
          </label>
          <StyledSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={prelevementStatusOptions}
            placeholder="Statut"
          />
        </div>

        {/* Total invoices */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4" style={{ color: "#0064FA" }} />
            <span className="text-xs font-medium" style={{ color: "#666666" }}>Factures</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#111111" }}>{invoices.length}</p>
          {invalidInvoicesCount > 0 && (
            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "#F59E0B" }}>
              <AlertTriangle className="h-3 w-3" />
              {invalidInvoicesCount} sans info SEPA
            </p>
          )}
        </div>

        {/* Total amount */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4" style={{ color: "#28B95F" }} />
            <span className="text-xs font-medium" style={{ color: "#666666" }}>Montant total</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#111111" }}>
            {totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </p>
        </div>

        {/* Selected */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="h-4 w-4" style={{ color: "#5F00BA" }} />
            <span className="text-xs font-medium" style={{ color: "#666666" }}>Sélectionnés</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#111111" }}>{selectedIds.size}</p>
          {selectedIds.size > 0 && (
            <p className="text-xs mt-1" style={{ color: "#666666" }}>
              {selectedAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: message.type === "success" ? "#D1FAE5" : "#FEE2E2",
            color: message.type === "success" ? "#065F46" : "#DC2626",
          }}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Actions Bar */}
      {statusFilter === "pending" && (
        <div
          className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: "#666666" }} />
            <label className="text-sm" style={{ color: "#666666" }}>Date de prélèvement:</label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
            />
          </div>

          <div className="flex-1" />

          <button
            onClick={generatePain008}
            disabled={generating || selectedIds.size === 0}
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#0064FA", color: "#FFFFFF" }}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Générer PAIN.008
          </button>
        </div>
      )}

      {statusFilter === "exported" && (
        <div
          className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <p className="text-sm" style={{ color: "#666666" }}>
            Après confirmation de votre banque, marquez les prélèvements comme payés.
          </p>

          <div className="flex-1" />

          <button
            onClick={markAsPaid}
            disabled={selectedIds.size === 0}
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#28B95F", color: "#FFFFFF" }}
          >
            <CheckCircle className="h-4 w-4" />
            Marquer comme payé
          </button>
        </div>
      )}

      {/* Invoices Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0064FA" }} />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <Landmark className="h-12 w-12 mx-auto mb-4" style={{ color: "#CCCCCC" }} />
            <p className="text-lg font-medium" style={{ color: "#666666" }}>
              Aucun prélèvement trouvé
            </p>
            <p className="text-sm" style={{ color: "#999999" }}>
              Les factures avec mode de paiement &quot;Prélèvement&quot; et une date de prélèvement apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#F5F5F7" }}>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {selectedIds.size === validInvoicesCount && validInvoicesCount > 0 ? (
                        <CheckSquare className="h-5 w-5" style={{ color: "#0064FA" }} />
                      ) : (
                        <Square className="h-5 w-5" style={{ color: "#999999" }} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Facture
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Montant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Date prélèvement
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Info SEPA
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-t transition-colors hover:bg-gray-50"
                    style={{ borderColor: "#EEEEEE" }}
                  >
                    <td className="px-4 py-3">
                      {invoice.hasValidSepaInfo ? (
                        <button
                          onClick={() => toggleSelect(invoice.id)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          {selectedIds.has(invoice.id) ? (
                            <CheckSquare className="h-5 w-5" style={{ color: "#0064FA" }} />
                          ) : (
                            <Square className="h-5 w-5" style={{ color: "#999999" }} />
                          )}
                        </button>
                      ) : (
                        <AlertTriangle className="h-5 w-5" style={{ color: "#F59E0B" }} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/factures/${invoice.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "#0064FA" }}
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${invoice.clientId}`}
                        className="hover:underline"
                        style={{ color: "#111111" }}
                      >
                        {invoice.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "#111111" }}>
                      {invoice.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#666666" }}>
                      {invoice.debitDate
                        ? new Date(invoice.debitDate).toLocaleDateString("fr-FR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.hasValidSepaInfo ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#D1FAE5", color: "#065F46" }}
                          >
                            Complet
                          </span>
                          <span className="text-xs font-mono" style={{ color: "#999999" }}>
                            {invoice.sepaMandate}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#FEF3C7", color: "#D97706" }}
                          >
                            Incomplet
                          </span>
                          <Link
                            href={`/clients/${invoice.clientId}/edit`}
                            className="text-xs underline"
                            style={{ color: "#0064FA" }}
                          >
                            Compléter
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Box */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#E8F0FE", border: "1px solid #0064FA" }}
      >
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "#0064FA" }}>
          <Building2 className="h-5 w-5" />
          Comment fonctionne le prélèvement SEPA ?
        </h3>
        <ol className="space-y-2 text-sm" style={{ color: "#1565C0" }}>
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Configurez vos informations créancier SEPA dans Paramètres &gt; Intégrations &gt; SEPA</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Renseignez les informations bancaires (IBAN, BIC, mandat) de vos clients</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Créez des factures avec le mode de paiement &quot;Prélèvement&quot; et une date de prélèvement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Sélectionnez les factures à prélever et générez le fichier PAIN.008</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">5.</span>
            <span>Importez le fichier dans votre espace bancaire en ligne</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">6.</span>
            <span>Une fois confirmé par la banque, marquez les factures comme payées</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
