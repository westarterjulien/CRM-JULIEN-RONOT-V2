"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  Clock,
  Globe,
  FileText,
  Euro,
  RefreshCw,
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Building2,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StyledSelect } from "@/components/ui/styled-select"

interface Domain {
  id: string
  domain: string
  expirationDate: string | null
  autoRenew: boolean
  renewalPrice: number | null
  daysUntilExpiration: number | null
  client: {
    id: string
    companyName: string
    email: string | null
  } | null
}

interface RenewalData {
  expiringSoon: Domain[]
  expired: Domain[]
  stats: {
    totalExpiringSoon: number
    totalExpired: number
    totalRenewalValue: number
  }
}

const daysOptions = [
  { value: "7", label: "7 prochains jours" },
  { value: "14", label: "14 prochains jours" },
  { value: "30", label: "30 prochains jours" },
  { value: "60", label: "60 prochains jours" },
  { value: "90", label: "90 prochains jours" },
]

export default function DomainRenewalsPage() {
  const router = useRouter()
  const [data, setData] = useState<RenewalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState("30")
  const [creatingInvoice, setCreatingInvoice] = useState<string | null>(null)

  useEffect(() => {
    fetchRenewals()
  }, [daysFilter])

  async function fetchRenewals() {
    setLoading(true)
    try {
      const res = await fetch(`/api/domains/renewals?days=${daysFilter}`)
      if (!res.ok) throw new Error("Error fetching renewals")
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function createInvoice(domainId: string) {
    setCreatingInvoice(domainId)
    try {
      const res = await fetch(`/api/domains/${domainId}/create-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ years: 1 }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const result = await res.json()
      router.push(`/invoices/${result.invoice.id}`)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Erreur lors de la création de la facture")
    } finally {
      setCreatingInvoice(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#F0783C", borderTopColor: "transparent" }}
        />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/domains")}
            className="p-2 rounded-xl transition-colors hover:bg-[#F5F5F7]"
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "#666666" }} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3" style={{ color: "#111111" }}>
              <AlertTriangle className="h-6 w-6" style={{ color: "#F0783C" }} />
              Alertes de renouvellement
            </h1>
            <p className="text-sm mt-1" style={{ color: "#666666" }}>
              Domaines à renouveler et factures à envoyer
            </p>
          </div>
        </div>
        <div className="w-48">
          <StyledSelect
            value={daysFilter}
            onChange={setDaysFilter}
            options={daysOptions}
            placeholder="Période"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Expirent bientôt</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#F0783C" }}>
                {data.stats.totalExpiringSoon}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#FEF3CD" }}
            >
              <Clock className="w-6 h-6" style={{ color: "#F0783C" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Expirés</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#F04B69" }}>
                {data.stats.totalExpired}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#FEE2E8" }}
            >
              <AlertTriangle className="w-6 h-6" style={{ color: "#F04B69" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Valeur renouvellements</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#28B95F" }}>
                {formatCurrency(data.stats.totalRenewalValue)}
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
      </div>

      {/* Expired Domains */}
      {data.expired.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FEE2E8", border: "1px solid #F04B69" }}
        >
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(240,75,105,0.2)" }}>
            <AlertTriangle className="h-5 w-5" style={{ color: "#F04B69" }} />
            <h2 className="text-base font-semibold" style={{ color: "#F04B69" }}>
              Domaines expirés ({data.expired.length})
            </h2>
          </div>
          <div className="overflow-x-auto" style={{ background: "#FFFFFF" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FEF5F7" }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Domaine
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Client
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Expiré depuis
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Prix
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.expired.map((domain, index) => (
                  <tr
                    key={domain.id}
                    className="transition-colors hover:bg-[#FEF5F7]"
                    style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: "#FEE2E8" }}
                        >
                          <Globe className="h-5 w-5" style={{ color: "#F04B69" }} />
                        </div>
                        <Link
                          href={`/domains/${domain.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: "#111111" }}
                        >
                          {domain.domain}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {domain.client ? (
                        <Link
                          href={`/clients/${domain.client.id}`}
                          className="text-sm hover:underline flex items-center gap-1"
                          style={{ color: "#0064FA" }}
                        >
                          <Building2 className="h-3 w-3" />
                          {domain.client.companyName}
                        </Link>
                      ) : (
                        <span className="text-sm" style={{ color: "#CCCCCC" }}>-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: "#FEE2E8", color: "#F04B69" }}
                      >
                        {domain.daysUntilExpiration ? `${Math.abs(domain.daysUntilExpiration)}j` : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-semibold" style={{ color: "#111111" }}>
                        {domain.renewalPrice ? formatCurrency(domain.renewalPrice) : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {domain.client && (
                          <button
                            onClick={() => createInvoice(domain.id)}
                            disabled={creatingInvoice === domain.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                            style={{ background: "#F04B69" }}
                          >
                            {creatingInvoice === domain.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <FileText className="h-4 w-4" />
                                Facturer
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <Clock className="h-5 w-5" style={{ color: "#F0783C" }} />
          <h2 className="text-base font-semibold" style={{ color: "#111111" }}>
            Expirent dans les {daysFilter} prochains jours ({data.expiringSoon.length})
          </h2>
        </div>

        {data.expiringSoon.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "#D4EDDA" }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: "#28B95F" }} />
            </div>
            <p className="text-base font-medium" style={{ color: "#666666" }}>
              Aucun domaine à renouveler
            </p>
            <p className="text-sm mt-1" style={{ color: "#999999" }}>
              Tous les domaines sont à jour pour cette période
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Domaine
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Client
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Expiration
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Jours
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Auto-renouv.
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Prix
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.expiringSoon.map((domain, index) => {
                  const isUrgent = domain.daysUntilExpiration !== null && domain.daysUntilExpiration <= 7
                  const isWarning = domain.daysUntilExpiration !== null && domain.daysUntilExpiration <= 14

                  return (
                    <tr
                      key={domain.id}
                      className="transition-colors hover:bg-[#F9F9FB]"
                      style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              background: isUrgent ? "#FEE2E8" : isWarning ? "#FEF3CD" : "#E3F2FD",
                            }}
                          >
                            <Globe
                              className="h-5 w-5"
                              style={{
                                color: isUrgent ? "#F04B69" : isWarning ? "#F0783C" : "#0064FA",
                              }}
                            />
                          </div>
                          <Link
                            href={`/domains/${domain.id}`}
                            className="text-sm font-medium hover:underline"
                            style={{ color: "#111111" }}
                          >
                            {domain.domain}
                          </Link>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {domain.client ? (
                          <Link
                            href={`/clients/${domain.client.id}`}
                            className="text-sm hover:underline flex items-center gap-1"
                            style={{ color: "#0064FA" }}
                          >
                            <Building2 className="h-3 w-3" />
                            {domain.client.companyName}
                          </Link>
                        ) : (
                          <span className="text-sm" style={{ color: "#CCCCCC" }}>-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm" style={{ color: "#111111" }}>
                          {domain.expirationDate ? formatDate(domain.expirationDate) : "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: isUrgent ? "#FEE2E8" : isWarning ? "#FEF3CD" : "#D4EDDA",
                            color: isUrgent ? "#F04B69" : isWarning ? "#F0783C" : "#28B95F",
                          }}
                        >
                          {domain.daysUntilExpiration}j
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {domain.autoRenew ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#D4EDDA", color: "#28B95F" }}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Actif
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#F5F5F7", color: "#666666" }}
                          >
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm font-semibold" style={{ color: "#111111" }}>
                          {domain.renewalPrice ? formatCurrency(domain.renewalPrice) : "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {domain.client && (
                            <button
                              onClick={() => createInvoice(domain.id)}
                              disabled={creatingInvoice === domain.id}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                              style={{ background: "#0064FA" }}
                            >
                              {creatingInvoice === domain.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <FileText className="h-4 w-4" />
                                  Facturer
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/domains/${domain.id}`)}
                            className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]"
                            title="Voir"
                          >
                            <ExternalLink className="w-4 h-4" style={{ color: "#666666" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {data.expiringSoon.length > 0 && (
          <div className="px-5 py-4" style={{ borderTop: "1px solid #EEEEEE" }}>
            <p className="text-sm" style={{ color: "#666666" }}>
              {data.expiringSoon.length} domaine{data.expiringSoon.length > 1 ? "s" : ""} à renouveler
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
