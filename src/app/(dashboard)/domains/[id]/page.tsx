"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Globe,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Loader2,
  ExternalLink,
  Clock,
  Server,
  Shield,
  Calendar,
  CheckCircle,
  AlertCircle,
  Copy,
  Building2,
  X,
} from "lucide-react"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"]

const dnsTypeOptions: SelectOption[] = DNS_TYPES.map((type) => ({
  value: type,
  label: type,
}))

const ttlOptions: SelectOption[] = [
  { value: "60", label: "1 minute" },
  { value: "300", label: "5 minutes" },
  { value: "3600", label: "1 heure" },
  { value: "86400", label: "1 jour" },
  { value: "604800", label: "1 semaine" },
]

interface Domain {
  id: string
  domain: string
  registrar: string
  status: string
  nameServerType: string | null
  offer: string | null
  expirationDate: string | null
  autoRenew: boolean
  notes: string | null
  lastSyncAt: string | null
  clientId: string | null
  client: {
    id: string
    companyName: string
    email: string | null
  } | null
}

interface DnsRecord {
  id: number
  type: string
  subdomain: string
  target: string
  ttl: number
}

interface Nameserver {
  id: number
  host: string
  ip: string | null
  isUsed: boolean
}

type DnsProvider = "cloudflare" | "ovh" | "unknown"

export default function DomainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [domain, setDomain] = useState<Domain | null>(null)
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [nameservers, setNameservers] = useState<Nameserver[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [loadingNameservers, setLoadingNameservers] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [dnsProvider, setDnsProvider] = useState<DnsProvider>("unknown")
  const [cloudflareZoneId, setCloudflareZoneId] = useState<string | null>(null)
  const [dnsError, setDnsError] = useState<string | null>(null)

  // Add/Edit dialog
  const [showDialog, setShowDialog] = useState(false)
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null)
  const [recordType, setRecordType] = useState("A")
  const [subdomain, setSubdomain] = useState("")
  const [target, setTarget] = useState("")
  const [ttl, setTtl] = useState("3600")
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteRecord, setDeleteRecord] = useState<DnsRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDomain = useCallback(async () => {
    try {
      const res = await fetch(`/api/domains/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDomain(data)
      } else {
        router.push("/domains")
      }
    } catch (error) {
      console.error("Error fetching domain:", error)
      router.push("/domains")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  const fetchDnsRecords = useCallback(async () => {
    setLoadingRecords(true)
    setDnsError(null)
    try {
      const res = await fetch(`/api/domains/${id}/dns`)
      const data = await res.json()

      setRecords(data.records || [])
      if (data.provider) {
        setDnsProvider(data.provider)
      }
      if (data.zoneId) {
        setCloudflareZoneId(data.zoneId)
      }
      if (data.error) {
        setDnsError(data.error)
      }
    } catch (error) {
      console.error("Error fetching DNS records:", error)
      setDnsError("Erreur lors de la récupération des enregistrements DNS")
    } finally {
      setLoadingRecords(false)
    }
  }, [id])

  const fetchNameservers = useCallback(async () => {
    setLoadingNameservers(true)
    try {
      const res = await fetch(`/api/domains/${id}/nameservers`)
      if (res.ok) {
        const data = await res.json()
        setNameservers(data.nameservers || [])
        if (data.provider) {
          setDnsProvider(data.provider)
        }
        if (data.zoneId) {
          setCloudflareZoneId(data.zoneId)
        }
      }
    } catch (error) {
      console.error("Error fetching nameservers:", error)
    } finally {
      setLoadingNameservers(false)
    }
  }, [id])

  useEffect(() => {
    fetchDomain()
    fetchDnsRecords()
    fetchNameservers()
  }, [fetchDomain, fetchDnsRecords, fetchNameservers])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchDnsRecords(), fetchNameservers()])
    setRefreshing(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error("Error copying:", err)
    }
  }

  const openAddDialog = () => {
    setEditRecord(null)
    setRecordType("A")
    setSubdomain("")
    setTarget("")
    setTtl("3600")
    setShowDialog(true)
  }

  const openEditDialog = (record: DnsRecord) => {
    setEditRecord(record)
    setRecordType(record.type)
    setSubdomain(record.subdomain)
    setTarget(record.target)
    setTtl(record.ttl.toString())
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editRecord) {
        const res = await fetch(`/api/domains/${id}/dns`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: editRecord.id,
            subdomain,
            target,
            ttl: parseInt(ttl),
          }),
        })

        if (res.ok) {
          fetchDnsRecords()
          setShowDialog(false)
        } else {
          const data = await res.json()
          alert(data.error || "Erreur lors de la modification")
        }
      } else {
        const res = await fetch(`/api/domains/${id}/dns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: recordType,
            subdomain,
            target,
            ttl: parseInt(ttl),
          }),
        })

        if (res.ok) {
          fetchDnsRecords()
          setShowDialog(false)
        } else {
          const data = await res.json()
          alert(data.error || "Erreur lors de la création")
        }
      }
    } catch (error) {
      console.error("Error saving record:", error)
      alert("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRecord) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/domains/${id}/dns?recordId=${deleteRecord.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchDnsRecords()
        setDeleteRecord(null)
      } else {
        const data = await res.json()
        alert(data.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting record:", error)
      alert("Erreur lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  const getRecordTypeStyle = (type: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      A: { bg: "#E6F0FF", color: "#0064FA" },
      AAAA: { bg: "#E6E6FF", color: "#5F00BA" },
      CNAME: { bg: "#F3E8FF", color: "#5F00BA" },
      MX: { bg: "#D4EDDA", color: "#28B95F" },
      TXT: { bg: "#FFF8E6", color: "#DCB40A" },
      NS: { bg: "#FFF0E6", color: "#F0783C" },
      SRV: { bg: "#FEE2E8", color: "#F04B69" },
      CAA: { bg: "#E0F7FA", color: "#14B4E6" },
    }
    return styles[type] || { bg: "#F5F5F7", color: "#666666" }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getDaysUntilExpiration = () => {
    if (!domain?.expirationDate) return null
    const expDate = new Date(domain.expirationDate)
    const today = new Date()
    const diffTime = expDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getExpirationStatus = () => {
    const days = getDaysUntilExpiration()
    if (days === null) return { bg: "#F5F5F7", color: "#999999", text: "Inconnu" }
    if (days < 0) return { bg: "#FEE2E8", color: "#F04B69", text: "Expiré" }
    if (days <= 7) return { bg: "#FEE2E8", color: "#F04B69", text: `${days}j restants` }
    if (days <= 30) return { bg: "#FFF0E6", color: "#F0783C", text: `${days}j restants` }
    if (days <= 90) return { bg: "#FFF8E6", color: "#DCB40A", text: `${days}j restants` }
    return { bg: "#D4EDDA", color: "#28B95F", text: `${days}j restants` }
  }

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  if (!domain) {
    return null
  }

  const expirationStatus = getExpirationStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/domains">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: "#F5F5F7", color: "#666666" }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
                {domain.domain}
              </h1>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: "#E6F0FF", color: "#0064FA" }}
              >
                {domain.registrar.toUpperCase()}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: "#666666" }}>
              {domain.status} {domain.offer && `- ${domain.offer}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-10 px-4 rounded-xl font-medium flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#F5F5F7", color: "#666666", border: "1px solid #EEEEEE" }}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </button>
          {dnsProvider === "cloudflare" ? (
            <a
              href={cloudflareZoneId
                ? `https://dash.cloudflare.com/?to=/:account/${cloudflareZoneId}`
                : `https://dash.cloudflare.com/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button
                className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90"
                style={{ background: "#F0783C" }}
              >
                <ExternalLink className="h-4 w-4" />
                Cloudflare
              </button>
            </a>
          ) : (
            <a
              href={`https://www.ovh.com/manager/web/#/domain/${domain.domain}/zone`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button
                className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90"
                style={{ background: "#0064FA" }}
              >
                <ExternalLink className="h-4 w-4" />
                OVH Manager
              </button>
            </a>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expiration Card */}
        <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Expiration</p>
              <p className="text-lg font-semibold mt-1" style={{ color: "#111111" }}>
                {formatDate(domain.expirationDate)}
              </p>
              <span
                className="inline-block px-2 py-0.5 rounded text-xs font-medium mt-2"
                style={{ background: expirationStatus.bg, color: expirationStatus.color }}
              >
                {expirationStatus.text}
              </span>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: expirationStatus.bg }}
            >
              <Calendar className="w-6 h-6" style={{ color: expirationStatus.color }} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs mt-3" style={{ color: "#999999" }}>
            {domain.autoRenew ? (
              <>
                <CheckCircle className="h-3 w-3" style={{ color: "#28B95F" }} />
                <span>Auto-renew actif</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" style={{ color: "#F0783C" }} />
                <span>Renouvellement manuel</span>
              </>
            )}
          </div>
        </div>

        {/* DNS Provider Card */}
        <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Provider DNS</p>
              <p className="text-lg font-semibold mt-1" style={{ color: "#111111" }}>
                {dnsProvider === "cloudflare" ? "Cloudflare" : dnsProvider === "ovh" ? "OVH" : "Inconnu"}
              </p>
              {dnsProvider === "cloudflare" && (
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-medium mt-2"
                  style={{ background: "#FFF0E6", color: "#F0783C" }}
                >
                  CDN
                </span>
              )}
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: dnsProvider === "cloudflare" ? "#FFF0E6" : "#F3E8FF" }}
            >
              <Server className="w-6 h-6" style={{ color: dnsProvider === "cloudflare" ? "#F0783C" : "#5F00BA" }} />
            </div>
          </div>
        </div>

        {/* Client Card */}
        <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Client</p>
              {domain.client ? (
                <Link href={`/clients/${domain.client.id}`} className="text-lg font-semibold mt-1 hover:underline" style={{ color: "#0064FA" }}>
                  {domain.client.companyName}
                </Link>
              ) : (
                <p className="text-lg font-semibold mt-1" style={{ color: "#999999" }}>Non assigné</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#E6F0FF" }}>
              <Building2 className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        {/* Last Sync Card */}
        <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Dernière synchro</p>
              <p className="text-lg font-semibold mt-1" style={{ color: "#111111" }}>{formatDate(domain.lastSyncAt)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#D4EDDA" }}>
              <Clock className="w-6 h-6" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Nameservers Section */}
      <div className="rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <Server className="h-5 w-5" style={{ color: "#F0783C" }} />
          <div>
            <h2 className="font-semibold" style={{ color: "#111111" }}>Serveurs DNS (Nameservers)</h2>
            <p className="text-sm" style={{ color: "#666666" }}>Serveurs qui gèrent la zone DNS</p>
          </div>
        </div>

        {loadingNameservers ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: "#999999" }} />
          </div>
        ) : nameservers.length === 0 ? (
          <div className="p-8 text-center">
            <Server className="h-12 w-12 mx-auto mb-3" style={{ color: "#DDDDDD" }} />
            <p style={{ color: "#999999" }}>Aucun serveur DNS trouvé</p>
          </div>
        ) : (
          <div>
            {nameservers.map((ns, index) => (
              <div
                key={ns.id}
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: index < nameservers.length - 1 ? "1px solid #EEEEEE" : "none" }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium"
                    style={{ background: "#FFF0E6", color: "#F0783C" }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-medium" style={{ color: "#111111" }}>{ns.host}</code>
                      <button
                        onClick={() => copyToClipboard(ns.host)}
                        className="transition-colors hover:opacity-70"
                        style={{ color: "#999999" }}
                      >
                        {copiedText === ns.host ? (
                          <CheckCircle className="h-4 w-4" style={{ color: "#28B95F" }} />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {ns.ip && <p className="text-xs" style={{ color: "#999999" }}>IP: {ns.ip}</p>}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    background: ns.isUsed ? "#D4EDDA" : "#F5F5F7",
                    color: ns.isUsed ? "#28B95F" : "#999999"
                  }}
                >
                  {ns.isUsed ? "Actif" : "Inactif"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DNS Records Section */}
      <div className="rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EEEEEE" }}>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5" style={{ color: "#0064FA" }} />
            <div>
              <h2 className="font-semibold" style={{ color: "#111111" }}>Enregistrements DNS</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Configuration de la zone DNS</p>
            </div>
          </div>
          <button
            onClick={openAddDialog}
            className="h-9 px-4 rounded-lg font-medium text-white flex items-center gap-2 transition-all hover:opacity-90"
            style={{ background: "#0064FA" }}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>

        {loadingRecords ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: "#999999" }} />
          </div>
        ) : dnsError ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF8E6" }}>
              <AlertCircle className="h-8 w-8" style={{ color: "#DCB40A" }} />
            </div>
            <h3 className="font-medium mb-2" style={{ color: "#111111" }}>Impossible de charger les DNS</h3>
            <p className="text-sm" style={{ color: "#666666" }}>{dnsError}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Globe className="h-12 w-12 mx-auto mb-4" style={{ color: "#DDDDDD" }} />
            <h3 className="font-medium mb-2" style={{ color: "#111111" }}>Aucun enregistrement DNS</h3>
            <p className="text-sm mb-4" style={{ color: "#666666" }}>Ajoutez des enregistrements pour configurer le domaine.</p>
            <button
              onClick={openAddDialog}
              className="h-9 px-4 rounded-lg font-medium text-white flex items-center gap-2 transition-all hover:opacity-90 mx-auto"
              style={{ background: "#0064FA" }}
            >
              <Plus className="h-4 w-4" />
              Ajouter un enregistrement
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: "#666666" }}>Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: "#666666" }}>Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: "#666666" }}>Valeur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: "#666666" }}>TTL</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: "#666666" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const typeStyle = getRecordTypeStyle(record.type)
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={{ borderBottom: index < records.length - 1 ? "1px solid #EEEEEE" : "none" }}
                    >
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: typeStyle.bg, color: typeStyle.color }}
                        >
                          {record.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm px-2 py-1 rounded font-mono" style={{ background: "#F5F5F7", color: "#111111" }}>
                            {record.subdomain || "@"}
                          </code>
                          <button
                            onClick={() => copyToClipboard(record.subdomain || "@")}
                            className="transition-colors hover:opacity-70"
                            style={{ color: "#999999" }}
                          >
                            {copiedText === (record.subdomain || "@") ? (
                              <CheckCircle className="h-3 w-3" style={{ color: "#28B95F" }} />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-md">
                          <code className="text-sm break-all" style={{ color: "#444444" }}>{record.target}</code>
                          <button
                            onClick={() => copyToClipboard(record.target)}
                            className="flex-shrink-0 transition-colors hover:opacity-70"
                            style={{ color: "#999999" }}
                          >
                            {copiedText === record.target ? (
                              <CheckCircle className="h-3 w-3" style={{ color: "#28B95F" }} />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "#999999" }}>
                        {record.ttl >= 3600
                          ? `${Math.floor(record.ttl / 3600)}h`
                          : record.ttl >= 60
                          ? `${Math.floor(record.ttl / 60)}m`
                          : `${record.ttl}s`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditDialog(record)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                            style={{ color: "#666666" }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteRecord(record)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                            style={{ color: "#F04B69" }}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {records.length > 0 && (
          <div className="px-6 py-3" style={{ background: "#FAFAFA", borderTop: "1px solid #EEEEEE" }}>
            <p className="text-sm" style={{ color: "#999999" }}>
              {records.length} enregistrement{records.length > 1 ? "s" : ""} DNS
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl" style={{ background: "#FFFFFF", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                {editRecord ? "Modifier l'enregistrement" : "Ajouter un enregistrement"}
              </h3>
              <button
                onClick={() => setShowDialog(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
                style={{ color: "#666666" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editRecord && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>Type</label>
                  <StyledSelect
                    value={recordType}
                    onChange={setRecordType}
                    options={dnsTypeOptions}
                    placeholder="Type"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>Sous-domaine</label>
                <input
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  placeholder="@ pour la racine, www, mail, etc."
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>Valeur</label>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={recordType === "A" ? "192.168.1.1" : recordType === "CNAME" ? "example.com." : "Valeur"}
                  className="w-full h-10 px-3 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: "#444444" }}>TTL</label>
                <StyledSelect
                  value={ttl}
                  onChange={setTtl}
                  options={ttlOptions}
                  placeholder="TTL"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={() => setShowDialog(false)}
                className="h-10 px-4 rounded-xl font-medium transition-all hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#0064FA" }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editRecord ? "Modifier" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#FFFFFF", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEE2E8" }}>
                <Trash2 className="h-5 w-5" style={{ color: "#F04B69" }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>Supprimer l&apos;enregistrement ?</h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Êtes-vous sûr de vouloir supprimer l&apos;enregistrement <strong>{deleteRecord.type}</strong> pour <strong>{deleteRecord.subdomain || "@"}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteRecord(null)}
                className="h-10 px-4 rounded-xl font-medium transition-all hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-10 px-4 rounded-xl font-medium text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#F04B69" }}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
