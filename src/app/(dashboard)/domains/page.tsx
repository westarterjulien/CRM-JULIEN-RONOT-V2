"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Globe,
  Search,
  RefreshCw,
  ExternalLink,
  Settings,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  Bell,
  Eye,
  Edit,
  Building2,
  Server,
  X,
  ChevronDown,
} from "lucide-react"
import { StyledSelect, SelectOption, domainStatusOptions } from "@/components/ui/styled-select"

interface Domain {
  id: string
  domain: string
  registrar: string
  status: string
  nameServerType: string | null
  dnsProvider: "ovh" | "cloudflare" | "external" | "unknown"
  offer: string | null
  expirationDate: string | null
  autoRenew: boolean
  notes: string | null
  lastSyncAt: string | null
  clientId: string | null
  client: {
    id: string
    companyName: string
  } | null
}

interface Client {
  id: string
  companyName: string
}

interface Stats {
  total: number
  expiringCount: number
}

export default function DomainsPage() {
  const router = useRouter()
  const [domains, setDomains] = useState<Domain[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, expiringCount: 0 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [checkingRenewals, setCheckingRenewals] = useState(false)

  // Edit dialog
  const [editDomain, setEditDomain] = useState<Domain | null>(null)
  const [editClientId, setEditClientId] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchDomains = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
      if (clientFilter && clientFilter !== "all") params.append("clientId", clientFilter)

      const res = await fetch(`/api/domains?${params}`)
      const data = await res.json()
      setDomains(data.domains || [])
      setStats(data.stats || { total: 0, expiringCount: 0 })
    } catch (error) {
      console.error("Error fetching domains:", error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, clientFilter])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients?perPage=100")
      const data = await res.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
    fetchClients()
  }, [fetchDomains, fetchClients])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)

    try {
      const res = await fetch("/api/domains/sync", { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        setSyncMessage({
          type: "success",
          text: data.message || "Synchronisation réussie",
        })
        fetchDomains()
      } else {
        setSyncMessage({
          type: "error",
          text: data.error || "Erreur de synchronisation",
        })
      }
    } catch (error) {
      setSyncMessage({
        type: "error",
        text: "Erreur lors de la synchronisation",
      })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  const handleCheckRenewals = async () => {
    setCheckingRenewals(true)
    setSyncMessage(null)

    try {
      const res = await fetch("/api/domains/check-renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      })
      const data = await res.json()

      if (res.ok) {
        if (data.stats.notificationsCreated > 0) {
          setSyncMessage({
            type: "success",
            text: `${data.stats.notificationsCreated} notification(s) créée(s)`,
          })
        } else {
          setSyncMessage({
            type: "success",
            text: "Aucun nouveau domaine à signaler",
          })
        }
      } else {
        setSyncMessage({
          type: "error",
          text: data.error || "Erreur lors de la vérification",
        })
      }
    } catch (error) {
      setSyncMessage({
        type: "error",
        text: "Erreur lors de la vérification des renouvellements",
      })
    } finally {
      setCheckingRenewals(false)
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  const openEditDialog = (domain: Domain) => {
    setEditDomain(domain)
    setEditClientId(domain.clientId || "none")
    setEditNotes(domain.notes || "")
  }

  const handleSaveEdit = async () => {
    if (!editDomain) return

    setSaving(true)
    try {
      const res = await fetch(`/api/domains/${editDomain.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: editClientId === "none" ? null : editClientId,
          notes: editNotes,
        }),
      })

      if (res.ok) {
        fetchDomains()
        setEditDomain(null)
      }
    } catch (error) {
      console.error("Error updating domain:", error)
    } finally {
      setSaving(false)
    }
  }

  const getDaysUntilExpiration = (expirationDate: string | null) => {
    if (!expirationDate) return null
    const expDate = new Date(expirationDate)
    const now = new Date()
    const diffTime = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  // Group domains by expiration status
  const expiredDomains = domains.filter((d) => {
    const days = getDaysUntilExpiration(d.expirationDate)
    return days !== null && days < 0
  })
  const expiringSoonDomains = domains.filter((d) => {
    const days = getDaysUntilExpiration(d.expirationDate)
    return days !== null && days >= 0 && days <= 30
  })
  const activeDomains = domains.filter((d) => {
    const days = getDaysUntilExpiration(d.expirationDate)
    return days === null || days > 30
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
            Domaines
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            {stats.total} domaine(s) gérés via OVH
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stats.expiringCount > 0 && (
            <Link href="/domains/renewals">
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: "#F0783C" }}
              >
                <AlertTriangle className="h-4 w-4" />
                {stats.expiringCount} à renouveler
              </button>
            </Link>
          )}
          <button
            onClick={handleCheckRenewals}
            disabled={checkingRenewals}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "#F5F5F7", color: "#444444" }}
          >
            {checkingRenewals ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Vérifier
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: "#0064FA" }}
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync OVH
          </button>
          <Link href="/settings?tab=ovh">
            <button
              className="p-2.5 rounded-xl transition-all"
              style={{ background: "#F5F5F7", color: "#666666" }}
            >
              <Settings className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Sync message */}
      {syncMessage && (
        <div
          className="p-4 rounded-xl flex items-center justify-between"
          style={{
            background: syncMessage.type === "success" ? "#D4EDDA" : "#FEE2E8",
            color: syncMessage.type === "success" ? "#28B95F" : "#F04B69",
          }}
        >
          <span className="text-sm font-medium">{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Total</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#111111" }}>
                {activeDomains.length + expiringSoonDomains.length}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <Globe className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Actifs</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#28B95F" }}>
                {activeDomains.length}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#D4EDDA" }}
            >
              <CheckCircle className="w-6 h-6" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Expirent bientôt</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#F0783C" }}>
                {expiringSoonDomains.length}
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
                placeholder="Rechercher un domaine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
              />
            </div>
            <div className="w-40">
              <StyledSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={domainStatusOptions}
                placeholder="Tous les statuts"
              />
            </div>
            <div className="w-48">
              <StyledSelect
                value={clientFilter}
                onChange={setClientFilter}
                options={[
                  { value: "all", label: "Tous les clients" },
                  { value: "unassigned", label: "Non assigné", color: "#999999" },
                  ...clients.map((client) => ({
                    value: client.id,
                    label: client.companyName,
                  })),
                ]}
                placeholder="Tous les clients"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0064FA", borderTopColor: "transparent" }} />
          </div>
        ) : [...expiringSoonDomains, ...activeDomains].length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "#F5F5F7" }}
            >
              <Globe className="w-8 h-8" style={{ color: "#999999" }} />
            </div>
            <p className="text-base font-medium" style={{ color: "#666666" }}>Aucun domaine</p>
            <p className="text-sm mt-1" style={{ color: "#999999" }}>Synchronisez vos domaines depuis OVH</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "#0064FA" }}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Synchroniser OVH
            </button>
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
                    Statut
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Expiration
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    DNS
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...expiringSoonDomains, ...activeDomains].map((domain, index) => {
                  const days = getDaysUntilExpiration(domain.expirationDate)
                  const isExpiringSoon = days !== null && days >= 0 && days <= 30
                  const isWarning = days !== null && days > 30 && days <= 90

                  return (
                    <tr
                      key={domain.id}
                      className="transition-colors hover:bg-[#F9F9FB]"
                      style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                    >
                      {/* Domain */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: isExpiringSoon ? "#FEF3CD" : "#E3F2FD" }}
                          >
                            <Globe className="h-5 w-5" style={{ color: isExpiringSoon ? "#F0783C" : "#0064FA" }} />
                          </div>
                          <div>
                            <Link
                              href={`/domains/${domain.id}`}
                              className="text-sm font-medium hover:underline"
                              style={{ color: "#111111" }}
                            >
                              {domain.domain}
                            </Link>
                            {domain.offer && (
                              <p className="text-xs mt-0.5" style={{ color: "#999999" }}>{domain.offer}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client */}
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
                          <span className="text-sm flex items-center gap-1" style={{ color: "#CCCCCC" }}>
                            <User className="h-3 w-3" />
                            Non assigné
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: domain.status === "active" ? "#D4EDDA" : domain.status === "expired" ? "#FEE2E8" : "#F5F5F7",
                            color: domain.status === "active" ? "#28B95F" : domain.status === "expired" ? "#F04B69" : "#666666",
                          }}
                        >
                          {domain.status === "active" ? "Actif" : domain.status === "expired" ? "Expiré" : domain.status}
                        </span>
                      </td>

                      {/* Expiration */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className="text-sm font-medium"
                            style={{ color: isExpiringSoon ? "#F0783C" : isWarning ? "#DCB40A" : "#111111" }}
                          >
                            {formatDate(domain.expirationDate)}
                          </span>
                          {days !== null && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: isExpiringSoon ? "#FEF3CD" : isWarning ? "#FEF3CD" : "#D4EDDA",
                                color: isExpiringSoon ? "#F0783C" : isWarning ? "#DCB40A" : "#28B95F",
                              }}
                            >
                              {days}j
                            </span>
                          )}
                        </div>
                      </td>

                      {/* DNS */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {domain.dnsProvider === "cloudflare" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#FEF3CD", color: "#F0783C" }}>
                              <Server className="h-3 w-3 mr-1" />
                              Cloudflare
                            </span>
                          ) : domain.dnsProvider === "ovh" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#E3F2FD", color: "#0064FA" }}>
                              <Server className="h-3 w-3 mr-1" />
                              OVH
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#F5F5F7", color: "#666666" }}>
                              Externe
                            </span>
                          )}
                          {domain.autoRenew && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#D4EDDA", color: "#28B95F" }}>
                              Auto
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/domains/${domain.id}`)}
                            className="p-2 rounded-lg transition-colors hover:bg-[#E3F2FD]"
                            title="Voir"
                          >
                            <Eye className="w-4 h-4" style={{ color: "#0064FA" }} />
                          </button>
                          <button
                            onClick={() => openEditDialog(domain)}
                            className="p-2 rounded-lg transition-colors hover:bg-[#FEF3CD]"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" style={{ color: "#DCB40A" }} />
                          </button>
                          <a
                            href={
                              domain.dnsProvider === "cloudflare"
                                ? `https://dash.cloudflare.com/?search=${domain.domain}`
                                : `https://www.ovh.com/manager/web/#/domain/${domain.domain}/zone`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]"
                            title="Ouvrir"
                          >
                            <ExternalLink className="w-4 h-4" style={{ color: "#666666" }} />
                          </a>
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
        {domains.length > 0 && (
          <div className="px-5 py-4 border-t" style={{ borderColor: "#EEEEEE" }}>
            <p className="text-sm" style={{ color: "#666666" }}>
              {domains.length} domaine{domains.length > 1 ? "s" : ""} affiché{domains.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "#E3F2FD" }}
              >
                <Globe className="h-6 w-6" style={{ color: "#0064FA" }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>{editDomain.domain}</h3>
                <p className="text-sm" style={{ color: "#666666" }}>Modifier les informations</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>Client</label>
                <StyledSelect
                  value={editClientId}
                  onChange={setEditClientId}
                  options={[
                    { value: "none", label: "Aucun client", color: "#999999" },
                    ...clients.map((client) => ({
                      value: client.id,
                      label: client.companyName,
                    })),
                  ]}
                  placeholder="Sélectionner un client"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes sur ce domaine..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={() => setEditDomain(null)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#0064FA" }}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
