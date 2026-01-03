"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  FileSignature, Eye, Download, Clock, CheckCircle2,
  XCircle, AlertCircle, Send, Users
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const contractFilterOptions: SelectOption[] = [
  { value: "all", label: "Tous les contrats" },
  { value: "sent", label: "En attente de signature", color: "#0064FA" },
  { value: "completed", label: "Signés", color: "#28B95F" },
  { value: "declined", label: "Refusés", color: "#F04B69" },
  { value: "expired", label: "Expirés", color: "#999999" },
]

interface Contract {
  id: string
  title: string
  description: string | null
  status: string
  documentsCount: number
  signersCount: number
  signedCount: number
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  expiresAt: string | null
}

const statusConfig: Record<string, { label: string; bg: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  sent: { label: "En attente", bg: "#E3F2FD", color: "#0064FA", icon: Send },
  viewed: { label: "Consulté", bg: "#FEF3CD", color: "#DCB40A", icon: Eye },
  partially_signed: { label: "En cours", bg: "#FFF3E0", color: "#F0783C", icon: AlertCircle },
  completed: { label: "Signé", bg: "#D4EDDA", color: "#28B95F", icon: CheckCircle2 },
  declined: { label: "Refusé", bg: "#FEE2E8", color: "#F04B69", icon: XCircle },
  expired: { label: "Expiré", bg: "#F5F5F7", color: "#999999", icon: Clock },
  voided: { label: "Annulé", bg: "#F5F5F7", color: "#999999", icon: XCircle },
}

function getStatusBadge(status: string) {
  const config = statusConfig[status] || statusConfig.sent
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

export default function ClientContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchContracts()
  }, [filter])

  const fetchContracts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "all") params.set("status", filter)

      const res = await fetch(`/api/client-portal/contracts?${params}`)
      const data = await res.json()
      setContracts(data.contracts || [])
    } catch (error) {
      console.error("Error fetching contracts:", error)
    } finally {
      setLoading(false)
    }
  }

  const pendingCount = contracts.filter((c) =>
    ["sent", "viewed", "partially_signed"].includes(c.status)
  ).length
  const completedCount = contracts.filter((c) => c.status === "completed").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
          Mes contrats
        </h1>
        <p className="text-sm mt-1" style={{ color: "#666666" }}>
          Consultez et signez vos contrats électroniques
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => setFilter("all")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Total</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#111111" }}>
                {contracts.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#E3F2FD" }}>
              <FileSignature className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => setFilter("sent")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>En attente</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#F0783C" }}>
                {pendingCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#FFF3E0" }}>
              <Clock className="w-6 h-6" style={{ color: "#F0783C" }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => setFilter("completed")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Signés</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#28B95F" }}>
                {completedCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#D4EDDA" }}>
              <CheckCircle2 className="w-6 h-6" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Filter */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "#EEEEEE" }}>
          <div className="w-56">
            <StyledSelect
              value={filter}
              onChange={setFilter}
              options={contractFilterOptions}
              placeholder="Tous les contrats"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0064FA", borderTopColor: "transparent" }} />
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#F5F5F7" }}>
              <FileSignature className="w-8 h-8" style={{ color: "#999999" }} />
            </div>
            <p className="text-base font-medium" style={{ color: "#666666" }}>
              Aucun contrat
            </p>
            <p className="text-sm mt-1" style={{ color: "#999999" }}>
              Vous n'avez pas encore de contrats à signer
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#EEEEEE" }}>
            {contracts.map((contract) => {
              const config = statusConfig[contract.status] || statusConfig.sent
              const StatusIcon = config.icon

              return (
                <Link
                  key={contract.id}
                  href={`/client-portal/contracts/${contract.id}`}
                  className="flex items-center gap-4 p-5 transition-colors hover:bg-[#F9F9FB]"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: config.bg, color: config.color }}
                  >
                    <StatusIcon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                        {contract.title}
                      </p>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs" style={{ color: "#999999" }}>
                        {contract.documentsCount} document{contract.documentsCount > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: "#999999" }}>
                        <Users className="w-3 h-3" />
                        {contract.signedCount}/{contract.signersCount} signatures
                      </span>
                      <span className="text-xs" style={{ color: "#999999" }}>
                        {contract.sentAt ? formatDate(contract.sentAt) : formatDate(contract.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {contract.status === "completed" && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          window.open(`/api/client-portal/contracts/${contract.id}/download?type=signed`, "_blank")
                        }}
                        className="p-2 rounded-lg transition-colors hover:bg-[#D4EDDA]"
                        title="Télécharger"
                      >
                        <Download className="w-5 h-5" style={{ color: "#28B95F" }} />
                      </button>
                    )}
                    <Eye className="w-5 h-5" style={{ color: "#999999" }} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
