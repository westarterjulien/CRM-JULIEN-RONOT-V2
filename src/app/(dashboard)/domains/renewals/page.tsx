"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Send,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

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
        throw new Error(error.error || "Erreur lors de la creation")
      }

      const result = await res.json()
      router.push(`/invoices/${result.invoice.id}`)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Erreur lors de la creation de la facture")
    } finally {
      setCreatingInvoice(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-6 lg:p-8 shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/domains")}
            className="text-white/80 hover:text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux domaines
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                <AlertTriangle className="h-8 w-8" />
                Alertes de renouvellement
              </h1>
              <p className="text-white/80 mt-2">
                Domaines à renouveler et factures à envoyer
              </p>
            </div>

            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 prochains jours</SelectItem>
                <SelectItem value="14">14 prochains jours</SelectItem>
                <SelectItem value="30">30 prochains jours</SelectItem>
                <SelectItem value="60">60 prochains jours</SelectItem>
                <SelectItem value="90">90 prochains jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-5 border border-white/20 dark:border-gray-700/50 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Expirent bientot
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.stats.totalExpiringSoon}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-5 border border-white/20 dark:border-gray-700/50 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Expires
              </p>
              <p className="text-2xl font-bold text-red-600">
                {data.stats.totalExpired}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-5 border border-white/20 dark:border-gray-700/50 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Euro className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Valeur renouvellements
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(data.stats.totalRenewalValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expired Domains */}
      {data.expired.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-900/50">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5" />
            Domaines expires ({data.expired.length})
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Expire depuis</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expired.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-red-500" />
                        <Link
                          href={`/domains/${domain.id}`}
                          className="font-medium hover:text-blue-600"
                        >
                          {domain.domain}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      {domain.client ? (
                        <Link
                          href={`/clients/${domain.client.id}`}
                          className="hover:text-blue-600"
                        >
                          {domain.client.companyName}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-red-600 font-medium">
                        {domain.daysUntilExpiration
                          ? `${Math.abs(domain.daysUntilExpiration)} jours`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {domain.renewalPrice
                        ? formatCurrency(domain.renewalPrice)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {domain.client && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-lg"
                          onClick={() => createInvoice(domain.id)}
                          disabled={creatingInvoice === domain.id}
                        >
                          {creatingInvoice === domain.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Facturer
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Expirent dans les {daysFilter} prochains jours ({data.expiringSoon.length})
          </h2>
        </div>

        {data.expiringSoon.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Aucun domaine à renouveler dans cette période
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Domaine</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Jours restants</TableHead>
                  <TableHead>Auto-renouvellement</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expiringSoon.map((domain) => {
                  const isUrgent =
                    domain.daysUntilExpiration !== null &&
                    domain.daysUntilExpiration <= 7
                  const isWarning =
                    domain.daysUntilExpiration !== null &&
                    domain.daysUntilExpiration <= 14

                  return (
                    <TableRow key={domain.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe
                            className={`h-4 w-4 ${
                              isUrgent
                                ? "text-red-500"
                                : isWarning
                                ? "text-amber-500"
                                : "text-blue-500"
                            }`}
                          />
                          <Link
                            href={`/domains/${domain.id}`}
                            className="font-medium hover:text-blue-600"
                          >
                            {domain.domain}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        {domain.client ? (
                          <Link
                            href={`/clients/${domain.client.id}`}
                            className="hover:text-blue-600"
                          >
                            {domain.client.companyName}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {domain.expirationDate
                          ? formatDate(domain.expirationDate)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            isUrgent
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : isWarning
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          }
                        >
                          {domain.daysUntilExpiration}j
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {domain.autoRenew ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            Inactif
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {domain.renewalPrice
                          ? formatCurrency(domain.renewalPrice)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {domain.client && (
                            <Button
                              size="sm"
                              className="rounded-lg bg-blue-600 hover:bg-blue-700"
                              onClick={() => createInvoice(domain.id)}
                              disabled={creatingInvoice === domain.id}
                            >
                              {creatingInvoice === domain.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Facturer
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => router.push(`/domains/${domain.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
