"use client"

import { useState, useEffect, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Users,
  FileText,
  Receipt,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
} from "lucide-react"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const periodOptions: SelectOption[] = [
  { value: "month", label: "Ce mois", color: "#0064FA" },
  { value: "quarter", label: "Ce trimestre", color: "#7C3AED" },
  { value: "year", label: "Cette année", color: "#28B95F" },
]

interface Statistics {
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
    draft: number
  }
  quotes: {
    total: number
    accepted: number
    rejected: number
    pending: number
    conversionRate: number
  }
  clients: {
    total: number
    active: number
    prospects: number
    newThisMonth: number
  }
  mrr: {
    current: number
    growth: number
    arr: number
  }
  topClients: {
    id: string
    name: string
    revenue: number
    invoiceCount: number
  }[]
  monthlyRevenue: {
    month: string
    revenue: number
    invoiceCount: number
  }[]
  revenueByService: {
    name: string
    revenue: number
    percentage: number
  }[]
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("year")

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/statistics?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching statistics:", error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            Chargement des statistiques...
          </p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Erreur lors du chargement des statistiques
        </p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Statistiques
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Vue d&apos;ensemble de votre activité
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-40">
            <StyledSelect
              value={period}
              onChange={(v) => setPeriod(v as "month" | "quarter" | "year")}
              options={periodOptions}
              placeholder="Période"
            />
          </div>
          <button
            onClick={fetchStats}
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100">Chiffre d&apos;affaires</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(stats.revenue.total)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {stats.revenue.growth >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm text-green-100">
                  {formatPercent(stats.revenue.growth)} vs période précédente
                </span>
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <Euro className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* MRR */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">MRR</p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(stats.mrr.current)}
              </p>
              <p className="text-sm text-blue-100 mt-2">
                ARR: {formatCurrency(stats.mrr.arr)}
              </p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Clients</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.clients.total}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                +{stats.clients.newThisMonth} ce mois
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Factures</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.invoices.total}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {stats.invoices.pending} en attente
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Receipt className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Statut des factures
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Payées</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.invoices.paid}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${(stats.invoices.paid / stats.invoices.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">En attente</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.invoices.pending}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${(stats.invoices.pending / stats.invoices.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">En retard</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.invoices.overdue}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${(stats.invoices.overdue / stats.invoices.total) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Brouillon</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.invoices.draft}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 rounded-full"
                  style={{
                    width: `${(stats.invoices.draft / stats.invoices.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quote Conversion */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conversion des devis
            </h2>
          </div>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  className="text-green-500"
                  strokeWidth="12"
                  strokeDasharray={`${stats.quotes.conversionRate * 4.4} 440`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.quotes.conversionRate.toFixed(0)}%
                  </span>
                  <p className="text-xs text-gray-500">conversion</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.quotes.accepted}</p>
              <p className="text-xs text-gray-500">Acceptés</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.quotes.pending}</p>
              <p className="text-xs text-gray-500">En attente</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.quotes.rejected}</p>
              <p className="text-xs text-gray-500">Refusés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              CA mensuel
            </h2>
          </div>
          <div className="space-y-3">
            {stats.monthlyRevenue.map((month, idx) => {
              const maxRevenue = Math.max(...stats.monthlyRevenue.map((m) => m.revenue))
              const percentage = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {month.month}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(month.revenue)}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top clients
            </h2>
          </div>
          <div className="space-y-4">
            {stats.topClients.map((client, idx) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {client.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {client.invoiceCount} factures
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(client.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Répartition des clients
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <p className="text-4xl font-bold text-green-600">{stats.clients.active}</p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Clients actifs</p>
          </div>
          <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-4xl font-bold text-blue-600">{stats.clients.prospects}</p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Prospects</p>
          </div>
          <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <p className="text-4xl font-bold text-purple-600">{stats.clients.newThisMonth}</p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Nouveaux ce mois</p>
          </div>
        </div>
      </div>
    </div>
  )
}
