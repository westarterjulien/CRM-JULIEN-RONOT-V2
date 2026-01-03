"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Mail,
  Plus,
  Search,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Users,
  MoreHorizontal,
  Trash2,
  Copy,
  Pause,
  Pencil,
  Loader2,
} from "lucide-react"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const campaignStatusOptions: SelectOption[] = [
  { value: "all", label: "Tous" },
  { value: "draft", label: "Brouillon", color: "#666666" },
  { value: "scheduled", label: "Planifiée", color: "#F59E0B" },
  { value: "sending", label: "En cours", color: "#3B82F6" },
  { value: "sent", label: "Envoyée", color: "#10B981" },
  { value: "paused", label: "En pause", color: "#EF4444" },
]

interface Campaign {
  id: string
  name: string
  subject: string
  fromName: string | null
  fromEmail: string | null
  status: string
  recipientType: string
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  recipientCount: number
  stats: {
    pending: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    failed: number
  }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Brouillon", color: "#F0783C", bgColor: "#FEF3CD" },
  scheduled: { label: "Planifiée", color: "#0064FA", bgColor: "#E3F2FD" },
  sending: { label: "En cours", color: "#DCB40A", bgColor: "#FEF3CD" },
  sent: { label: "Envoyée", color: "#28B95F", bgColor: "#D4EDDA" },
  paused: { label: "En pause", color: "#F0783C", bgColor: "#FEF3CD" },
  cancelled: { label: "Annulée", color: "#666666", bgColor: "#F5F5F7" },
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  const fetchCampaigns = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/campaigns?${params}`)
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error("Error fetching campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm("Supprimer cette campagne ?")) return

    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" })
      fetchCampaigns()
    } catch (error) {
      console.error("Error deleting campaign:", error)
    }
  }

  const duplicateCampaign = async (campaign: Campaign) => {
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`)
      const data = await res.json()

      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${data.name} (copie)`,
          subject: data.subject,
          fromName: data.fromName,
          fromEmail: data.fromEmail,
          designJson: data.designJson,
          htmlContent: data.htmlContent,
          recipientType: data.recipientType,
        }),
      })

      fetchCampaigns()
    } catch (error) {
      console.error("Error duplicating campaign:", error)
    }
  }

  const filteredCampaigns = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase())
  )

  const getOpenRate = (c: Campaign) => {
    const total = c.stats.sent + c.stats.delivered + c.stats.opened + c.stats.clicked
    if (total === 0) return 0
    return Math.round(((c.stats.opened + c.stats.clicked) / total) * 100)
  }

  const getClickRate = (c: Campaign) => {
    const total = c.stats.sent + c.stats.delivered + c.stats.opened + c.stats.clicked
    if (total === 0) return 0
    return Math.round((c.stats.clicked / total) * 100)
  }

  const totalOpens = campaigns.reduce((sum, c) => sum + c.stats.opened + c.stats.clicked, 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + c.stats.clicked, 0)
  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#5F00BA" }}
          >
            <Mail className="h-7 w-7" style={{ color: "#FFFFFF" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
              Campagnes Email
            </h1>
            <p className="text-sm" style={{ color: "#666666" }}>
              {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""} au total
            </p>
          </div>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "#0064FA", color: "#FFFFFF" }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle campagne</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Campagnes */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Campagnes
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#5F00BA" }}>
                {campaigns.length}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#F3E8FF" }}
            >
              <Mail className="h-5 w-5" style={{ color: "#5F00BA" }} />
            </div>
          </div>
        </div>

        {/* Envoyées */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Envoyées
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#28B95F" }}>
                {sentCampaigns}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#D4EDDA" }}
            >
              <Send className="h-5 w-5" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>

        {/* Ouvertures */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Ouvertures
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#0064FA" }}>
                {totalOpens}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <Eye className="h-5 w-5" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        {/* Clics */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                Clics
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#F0783C" }}>
                {totalClicks}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#FEF3CD" }}
            >
              <MousePointer className="h-5 w-5" style={{ color: "#F0783C" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                placeholder="Nom, sujet..."
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
              value={statusFilter || "all"}
              onChange={(v) => setStatusFilter(v === "all" ? "" : v)}
              options={campaignStatusOptions}
              placeholder="Tous"
            />
          </div>

          <div className="flex items-end">
            {(search || statusFilter) && (
              <button
                onClick={() => {
                  setSearch("")
                  setStatusFilter("")
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                <XCircle className="h-4 w-4" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="px-4 py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" style={{ color: "#0064FA" }} />
            <span style={{ color: "#666666" }}>Chargement...</span>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "#F5F5F7" }}
            >
              <Mail className="h-10 w-10" style={{ color: "#CCCCCC" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
              Aucune campagne
            </h3>
            <p className="text-sm mb-6" style={{ color: "#666666" }}>
              Commencez par créer votre première campagne email
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              <Plus className="h-4 w-4" />
              Créer une campagne
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#F5F5F7" }}>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#666666" }}
                  >
                    Campagne
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
                    Destinataires
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide hidden md:table-cell"
                    style={{ color: "#666666" }}
                  >
                    Ouverture
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide hidden md:table-cell"
                    style={{ color: "#666666" }}
                  >
                    Clics
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "#666666" }}
                  >
                    Date
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
                {filteredCampaigns.map((campaign) => {
                  const statusInfo = statusConfig[campaign.status] || statusConfig.draft
                  return (
                    <tr
                      key={campaign.id}
                      className="transition-colors"
                      style={{ borderBottom: "1px solid #EEEEEE" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Campaign Info */}
                      <td className="px-4 py-3">
                        <Link href={`/campaigns/${campaign.id}`} className="group">
                          <p
                            className="font-semibold group-hover:underline"
                            style={{ color: "#0064FA" }}
                          >
                            {campaign.name}
                          </p>
                          <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: "#999999" }}>
                            {campaign.subject}
                          </p>
                        </Link>
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
                              animation: campaign.status === "sending" ? "pulse 2s infinite" : "none",
                            }}
                          />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Recipients */}
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1 text-sm" style={{ color: "#111111" }}>
                          <Users className="h-3.5 w-3.5" style={{ color: "#999999" }} />
                          {campaign.recipientCount}
                        </span>
                      </td>

                      {/* Open Rate */}
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {campaign.status === "sent" ? (
                          <span className="text-sm font-medium" style={{ color: "#0064FA" }}>
                            {getOpenRate(campaign)}%
                          </span>
                        ) : (
                          <span style={{ color: "#CCCCCC" }}>-</span>
                        )}
                      </td>

                      {/* Click Rate */}
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        {campaign.status === "sent" ? (
                          <span className="text-sm font-medium" style={{ color: "#F0783C" }}>
                            {getClickRate(campaign)}%
                          </span>
                        ) : (
                          <span style={{ color: "#CCCCCC" }}>-</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        {campaign.sentAt ? (
                          <div>
                            <p className="text-sm" style={{ color: "#111111" }}>
                              {new Date(campaign.sentAt).toLocaleDateString("fr-FR")}
                            </p>
                            <p className="text-xs" style={{ color: "#999999" }}>
                              Envoyée
                            </p>
                          </div>
                        ) : campaign.scheduledAt && campaign.status === "scheduled" ? (
                          <div>
                            <p className="text-sm" style={{ color: "#0064FA" }}>
                              {new Date(campaign.scheduledAt).toLocaleDateString("fr-FR")}
                            </p>
                            <p className="text-xs" style={{ color: "#999999" }}>
                              Planifiée
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm" style={{ color: "#111111" }}>
                              {new Date(campaign.createdAt).toLocaleDateString("fr-FR")}
                            </p>
                            <p className="text-xs" style={{ color: "#999999" }}>
                              Créée
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "#0064FA" }}
                            title="Voir / Modifier"
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#E3F2FD")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === campaign.id ? null : campaign.id)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "#666666" }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuOpen === campaign.id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-48 rounded-xl py-2 z-10"
                                style={{
                                  background: "#FFFFFF",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                  border: "1px solid #EEEEEE",
                                }}
                              >
                                <button
                                  onClick={() => {
                                    duplicateCampaign(campaign)
                                    setMenuOpen(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[#F5F5F7]"
                                  style={{ color: "#444444" }}
                                >
                                  <Copy className="h-4 w-4" />
                                  Dupliquer
                                </button>
                                {campaign.status === "draft" && (
                                  <>
                                    <div style={{ borderTop: "1px solid #EEEEEE", margin: "4px 0" }} />
                                    <button
                                      onClick={() => {
                                        deleteCampaign(campaign.id)
                                        setMenuOpen(null)
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
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
