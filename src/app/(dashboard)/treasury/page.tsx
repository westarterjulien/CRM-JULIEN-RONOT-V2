"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  Building,
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Link2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Landmark,
  Unlink,
  AlertCircle,
  ExternalLink,
  X,
  Clock,
} from "lucide-react"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const transactionTypeOptions: SelectOption[] = [
  { value: "", label: "Tous les types" },
  { value: "credit", label: "Entrées", color: "#28B95F" },
  { value: "debit", label: "Sorties", color: "#F04B69" },
]

const reconciledOptions: SelectOption[] = [
  { value: "", label: "Rapprochement" },
  { value: "true", label: "Rapprochées", color: "#28B95F" },
  { value: "false", label: "Non rapprochées", color: "#999999" },
]

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNumber: string | null
  iban: string | null
  bic: string | null
  accountType: string | null
  currentBalance: number
  availableBalance: number
  currency: string
  status: string
  isPrimary: boolean
  lastSyncAt: string | null
  transactionCount: number
}

interface Transaction {
  id: string
  bankAccountId: string
  transactionDate: string
  valueDate: string | null
  amount: number
  type: "credit" | "debit"
  label: string | null
  description: string | null
  counterpartyName: string | null
  category: string | null
  subCategory: string | null
  isReconciled: boolean
  status: string
  balanceAfter: number | null
  bankAccount: {
    id: string
    accountName: string
    bankName: string
  }
  linkedInvoice: {
    id: string
    invoiceNumber: string
  } | null
}

interface Stats {
  totalBalance: number
  availableBalance: number
  accountCount: number
  activeCount: number
  monthlyIncome: number
  monthlyExpenses: number
  netCashFlow: number
}

interface TransactionStats {
  total: number
  totalAmount: number
  creditCount: number
  creditAmount: number
  debitCount: number
  debitAmount: number
  reconciledCount: number
}

interface CategoryStat {
  category: string
  count: number
  amount: number
}

interface GocardlessConnection {
  id: string
  requisitionId: string
  institutionId: string
  institutionName: string
  institutionLogo: string | null
  status: string
  errorMessage: string | null
  expiresAt: string | null
  createdAt: string | null
  bankAccount: {
    id: string
    accountName: string
    iban: string | null
    currentBalance: number
    lastSyncAt: string | null
  } | null
}

interface Institution {
  id: string
  name: string
  bic: string
  logo: string
  countries: string[]
  maxHistoricalDays: number
}

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "accounts" | "transactions" | "sync">("dashboard")
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null)
  const [categories, setCategories] = useState<CategoryStat[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 25,
    total: 0,
    totalPages: 0,
  })

  // Filters
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [accountFilter, setAccountFilter] = useState("")
  const [reconciledFilter, setReconciledFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Dropdown menu states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // GoCardless states
  const [connections, setConnections] = useState<GocardlessConnection[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [connectModalOpen, setConnectModalOpen] = useState(false)
  const [institutionSearch, setInstitutionSearch] = useState("")
  const [loadingInstitutions, setLoadingInstitutions] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [rateLimit, setRateLimit] = useState<{ limit: number | null; remaining: number | null; reset: string | null } | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/treasury/accounts")
      const data = await res.json()
      setAccounts(data.accounts || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error("Error fetching accounts:", error)
    }
  }, [])

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/gocardless/connections")
      const data = await res.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error("Error fetching connections:", error)
    }
  }, [])

  const fetchInstitutions = async () => {
    setLoadingInstitutions(true)
    try {
      const res = await fetch("/api/gocardless/institutions?country=FR")
      const data = await res.json()
      if (data.error) {
        console.error("GoCardless error:", data.error)
        setInstitutions([])
      } else {
        setInstitutions(data.institutions || [])
      }
    } catch (error) {
      console.error("Error fetching institutions:", error)
    } finally {
      setLoadingInstitutions(false)
    }
  }

  const handleConnect = async (institution: Institution) => {
    setConnecting(true)
    try {
      const res = await fetch("/api/gocardless/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: institution.id,
          institutionName: institution.name,
          institutionLogo: institution.logo,
          maxHistoricalDays: institution.maxHistoricalDays,
        }),
      })
      const data = await res.json()
      if (data.link) {
        // Redirect to bank authentication
        window.location.href = data.link
      } else {
        console.error("No link returned:", data)
      }
    } catch (error) {
      console.error("Error connecting:", error)
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async (bankAccountId?: string) => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/gocardless/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankAccountId }),
      })
      const data = await res.json()
      if (data.success) {
        const totalNew = data.results.reduce((sum: number, r: { newTransactions?: number }) => sum + (r.newTransactions || 0), 0)
        setSyncResult({ success: true, message: `${totalNew} nouvelles transactions synchronisées` })
        // Update rate limit info from sync response
        if (data.rateLimit) {
          setRateLimit(data.rateLimit)
        }
        fetchAccounts()
        fetchTransactions()
        fetchConnections()
      } else {
        setSyncResult({ success: false, message: data.error || "Erreur de synchronisation" })
      }
    } catch (error) {
      setSyncResult({ success: false, message: "Erreur de connexion" })
    } finally {
      setSyncing(false)
    }
  }

  const fetchRateLimit = async () => {
    try {
      const res = await fetch("/api/gocardless/rate-limit")
      const data = await res.json()
      if (data.rateLimit) {
        setRateLimit(data.rateLimit)
      }
    } catch (error) {
      console.error("Error fetching rate limit:", error)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Voulez-vous vraiment déconnecter ce compte bancaire ?")) return
    try {
      await fetch(`/api/gocardless/connections?id=${connectionId}`, { method: "DELETE" })
      fetchConnections()
    } catch (error) {
      console.error("Error disconnecting:", error)
    }
  }

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    // First try without force to check if there are transactions
    const res = await fetch(`/api/treasury/accounts/${accountId}`, { method: "DELETE" })
    const data = await res.json()

    if (data.requiresForce) {
      // Account has transactions, ask for confirmation
      const confirmDelete = confirm(
        `Le compte "${accountName}" contient ${data.transactionCount} transaction(s).\n\n` +
        `Voulez-vous vraiment supprimer ce compte ET toutes ses transactions ?\n\n` +
        `Cette action est IRRÉVERSIBLE.`
      )
      if (!confirmDelete) return

      // Force delete
      const forceRes = await fetch(`/api/treasury/accounts/${accountId}?force=true`, { method: "DELETE" })
      if (forceRes.ok) {
        fetchAccounts()
        fetchConnections()
        setOpenMenuId(null)
      } else {
        const errorData = await forceRes.json()
        alert(`Erreur: ${errorData.error}`)
      }
    } else if (res.ok) {
      fetchAccounts()
      fetchConnections()
      setOpenMenuId(null)
    } else {
      alert(`Erreur: ${data.error}`)
    }
  }

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        perPage: pagination.perPage.toString(),
      })
      if (search) params.set("search", search)
      if (typeFilter) params.set("type", typeFilter)
      if (accountFilter) params.set("accountId", accountFilter)
      if (reconciledFilter) params.set("reconciled", reconciledFilter)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)

      const res = await fetch(`/api/treasury/transactions?${params}`)
      const data = await res.json()
      setTransactions(data.transactions || [])
      setTransactionStats(data.stats || null)
      setCategories(data.categories || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }))
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }, [pagination.page, pagination.perPage, search, typeFilter, accountFilter, reconciledFilter, startDate, endDate])

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchTransactions(), fetchConnections()]).then(() => {
      setLoading(false)
    })
    // Also fetch rate limit info on load
    fetchRateLimit()
  }, [fetchAccounts, fetchTransactions, fetchConnections])

  const handleReconcile = async (transactionId: string, reconcile: boolean) => {
    try {
      await fetch(`/api/treasury/transactions/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reconcile ? "reconcile" : "unreconcile" }),
      })
      fetchTransactions()
    } catch (error) {
      console.error("Error reconciling transaction:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenuId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "#EEEEEE", borderTopColor: "#28B95F" }}
          />
          <p style={{ color: "#666666" }}>Chargement...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: "dashboard", label: "Vue d'ensemble" },
    { id: "accounts", label: `Comptes (${accounts.length})` },
    { id: "transactions", label: "Transactions" },
    { id: "sync", label: "Synchronisation" },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#28B95F" }}
            >
              <Wallet className="h-7 w-7" style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
                Trésorerie
              </h1>
              <p className="text-sm" style={{ color: "#666666" }}>
                Gérez vos comptes bancaires et suivez vos transactions
              </p>
              {accounts.some(a => a.lastSyncAt) && (
                <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "#999999" }}>
                  <Clock className="h-3 w-3" />
                  Dernière sync: {new Date(Math.max(...accounts.filter(a => a.lastSyncAt).map(a => new Date(a.lastSyncAt!).getTime()))).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {connections.length > 0 && (
              <button
                onClick={() => handleSync()}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "#0064FA", color: "#FFFFFF" }}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Synchroniser
              </button>
            )}
            <button
              onClick={() => { fetchAccounts(); fetchTransactions(); fetchConnections(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-[#EEEEEE]"
              style={{ background: "#F5F5F7", color: "#444444" }}
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
            <button
              onClick={() => { setConnectModalOpen(true); fetchInstitutions(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "#14B4E6", color: "#FFFFFF" }}
            >
              <Landmark className="h-4 w-4" />
              Connecter une banque
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "#666666" }}>
                Solde total
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#E3F2FD" }}
              >
                <Wallet className="h-5 w-5" style={{ color: "#0064FA" }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#111111" }}>
              {formatCurrency(stats.totalBalance)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#999999" }}>
              Sur {stats.accountCount} compte{stats.accountCount > 1 ? "s" : ""}
            </p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "#666666" }}>
                Entrées du mois
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#D4EDDA" }}
              >
                <TrendingUp className="h-5 w-5" style={{ color: "#28B95F" }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#28B95F" }}>
              +{formatCurrency(stats.monthlyIncome)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#999999" }}>
              Ce mois-ci
            </p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "#666666" }}>
                Sorties du mois
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#FEE2E8" }}
              >
                <TrendingDown className="h-5 w-5" style={{ color: "#F04B69" }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#F04B69" }}>
              -{formatCurrency(stats.monthlyExpenses)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#999999" }}>
              Ce mois-ci
            </p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "#666666" }}>
                Flux net
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: stats.netCashFlow >= 0 ? "#D4EDDA" : "#FEE2E8" }}
              >
                {stats.netCashFlow >= 0 ? (
                  <ArrowUpRight className="h-5 w-5" style={{ color: "#28B95F" }} />
                ) : (
                  <ArrowDownRight className="h-5 w-5" style={{ color: "#F04B69" }} />
                )}
              </div>
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: stats.netCashFlow >= 0 ? "#28B95F" : "#F04B69" }}
            >
              {stats.netCashFlow >= 0 ? "+" : ""}{formatCurrency(stats.netCashFlow)}
            </p>
            <p className="text-xs mt-1" style={{ color: "#999999" }}>
              Entrées - Sorties
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex border-b" style={{ borderColor: "#EEEEEE" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-6 py-4 text-sm font-medium transition-all relative"
              style={{
                color: activeTab === tab.id ? "#28B95F" : "#666666",
                background: activeTab === tab.id ? "#F5F5F7" : "transparent",
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: "#28B95F" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="p-6 space-y-6">
            {/* Bank Accounts Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Comptes bancaires
                </h2>
                <Link
                  href="/treasury/accounts/new"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "#F5F5F7", color: "#444444" }}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Link>
              </div>

              {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl" style={{ background: "#F5F5F7" }}>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "#EEEEEE" }}
                  >
                    <Building className="h-8 w-8" style={{ color: "#999999" }} />
                  </div>
                  <h3 className="text-lg font-medium mb-1" style={{ color: "#111111" }}>
                    Aucun compte bancaire
                  </h3>
                  <p className="text-sm mb-4" style={{ color: "#666666" }}>
                    Ajoutez vos comptes bancaires pour suivre votre trésorerie
                  </p>
                  <Link
                    href="/treasury/accounts/new"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: "#28B95F", color: "#FFFFFF" }}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un compte
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="rounded-xl p-4 transition-all hover:shadow-md"
                      style={{ background: "#F5F5F7" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium" style={{ color: "#111111" }}>
                            {account.accountName}
                          </h3>
                          {account.isPrimary && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ background: "#E3F2FD", color: "#0064FA" }}
                            >
                              Principal
                            </span>
                          )}
                        </div>
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: account.status === "active" ? "#D4EDDA" : "#F5F5F7",
                            color: account.status === "active" ? "#28B95F" : "#666666",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: account.status === "active" ? "#28B95F" : "#999999" }}
                          />
                          {account.status === "active" ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: "#666666" }}>
                        {account.bankName}
                      </p>
                      <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                        {formatCurrency(account.currentBalance)}
                      </p>
                      {account.iban && (
                        <p
                          className="text-xs font-mono mt-2"
                          style={{ color: "#999999" }}
                        >
                          {account.iban.replace(/(.{4})/g, "$1 ").trim()}
                        </p>
                      )}
                      <div
                        className="flex items-center justify-between mt-4 pt-3"
                        style={{ borderTop: "1px solid #EEEEEE" }}
                      >
                        <span className="text-xs" style={{ color: "#999999" }}>
                          {account.transactionCount} transaction{account.transactionCount > 1 ? "s" : ""}
                        </span>
                        <Link
                          href={`/treasury/accounts/${account.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[#EEEEEE]"
                          style={{ color: "#444444" }}
                        >
                          <Eye className="h-3 w-3" />
                          Voir
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Transactions récentes
                </h2>
                <button
                  onClick={() => setActiveTab("transactions")}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "#F5F5F7", color: "#444444" }}
                >
                  Voir tout
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #EEEEEE" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#F5F5F7" }}>
                      <th className="text-left p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                        Date
                      </th>
                      <th className="text-left p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                        Description
                      </th>
                      <th className="text-left p-3 text-xs font-semibold hidden md:table-cell" style={{ color: "#666666" }}>
                        Compte
                      </th>
                      <th className="text-left p-3 text-xs font-semibold hidden lg:table-cell" style={{ color: "#666666" }}>
                        Catégorie
                      </th>
                      <th className="text-right p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                        Montant
                      </th>
                      <th className="text-center p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                        Rapproché
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 10).map((tx, index) => (
                      <tr
                        key={tx.id}
                        className="transition-all hover:bg-[#F5F5F7]"
                        style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                      >
                        <td className="p-3 text-sm" style={{ color: "#444444" }}>
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="p-3">
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate" style={{ color: "#111111" }}>
                              {tx.label || tx.description || tx.counterpartyName || "-"}
                            </p>
                            {tx.linkedInvoice && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Link2 className="h-3 w-3" style={{ color: "#0064FA" }} />
                                <Link
                                  href={`/invoices/${tx.linkedInvoice.id}`}
                                  className="text-xs hover:underline"
                                  style={{ color: "#0064FA" }}
                                >
                                  {tx.linkedInvoice.invoiceNumber}
                                </Link>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm hidden md:table-cell" style={{ color: "#666666" }}>
                          {tx.bankAccount.accountName}
                        </td>
                        <td className="p-3 text-sm hidden lg:table-cell">
                          {tx.category ? (
                            <span
                              className="px-2 py-1 rounded-lg text-xs font-medium"
                              style={{ background: "#F5F5F7", color: "#666666" }}
                            >
                              {tx.category}
                            </span>
                          ) : (
                            <span style={{ color: "#999999" }}>-</span>
                          )}
                        </td>
                        <td
                          className="p-3 text-right font-semibold"
                          style={{ color: tx.type === "credit" ? "#28B95F" : "#F04B69" }}
                        >
                          {tx.type === "credit" ? "+" : ""}{formatCurrency(tx.amount)}
                        </td>
                        <td className="p-3 text-center">
                          {tx.isReconciled ? (
                            <CheckCircle2 className="h-4 w-4 mx-auto" style={{ color: "#28B95F" }} />
                          ) : (
                            <XCircle className="h-4 w-4 mx-auto" style={{ color: "#CCCCCC" }} />
                          )}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center" style={{ color: "#666666" }}>
                          Aucune transaction
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Categories Breakdown */}
            {categories.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4" style={{ color: "#111111" }}>
                  Répartition par catégorie
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.slice(0, 9).map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: "#F5F5F7" }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: "#111111" }}>
                          {cat.category}
                        </p>
                        <p className="text-xs" style={{ color: "#666666" }}>
                          {cat.count} transaction{cat.count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <p
                        className="font-bold"
                        style={{ color: cat.amount >= 0 ? "#28B95F" : "#F04B69" }}
                      >
                        {formatCurrency(cat.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === "accounts" && (
          <div className="p-6">
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #EEEEEE" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F5F5F7" }}>
                    <th className="text-left p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Compte
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden sm:table-cell" style={{ color: "#666666" }}>
                      Banque
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden lg:table-cell" style={{ color: "#666666" }}>
                      IBAN
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden md:table-cell" style={{ color: "#666666" }}>
                      Type
                    </th>
                    <th className="text-right p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Solde
                    </th>
                    <th className="text-center p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Statut
                    </th>
                    <th className="text-right p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account, index) => (
                    <tr
                      key={account.id}
                      className="transition-all hover:bg-[#F5F5F7]"
                      style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: "#111111" }}>
                            {account.accountName}
                          </span>
                          {account.isPrimary && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{ background: "#E3F2FD", color: "#0064FA" }}
                            >
                              Principal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm hidden sm:table-cell" style={{ color: "#444444" }}>
                        {account.bankName}
                      </td>
                      <td className="p-3 text-sm font-mono hidden lg:table-cell" style={{ color: "#666666" }}>
                        {account.iban ? account.iban.replace(/(.{4})/g, "$1 ").trim() : "-"}
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell" style={{ color: "#444444" }}>
                        {account.accountType === "checking" ? "Courant" :
                         account.accountType === "savings" ? "Épargne" :
                         account.accountType || "-"}
                      </td>
                      <td className="p-3 text-right font-bold" style={{ color: "#111111" }}>
                        {formatCurrency(account.currentBalance)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: account.status === "active" ? "#D4EDDA" : "#F5F5F7",
                            color: account.status === "active" ? "#28B95F" : "#666666",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: account.status === "active" ? "#28B95F" : "#999999" }}
                          />
                          {account.status === "active" ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(openMenuId === account.id ? null : account.id)
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[#EEEEEE]"
                          >
                            <MoreHorizontal className="h-4 w-4" style={{ color: "#666666" }} />
                          </button>
                          {openMenuId === account.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-48 rounded-xl py-2 z-10"
                              style={{
                                background: "#FFFFFF",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                border: "1px solid #EEEEEE",
                              }}
                            >
                              <Link
                                href={`/treasury/accounts/${account.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <Eye className="h-4 w-4" />
                                Voir les détails
                              </Link>
                              <Link
                                href={`/treasury/accounts/${account.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <Edit className="h-4 w-4" />
                                Modifier
                              </Link>
                              <div className="my-1" style={{ borderTop: "1px solid #EEEEEE" }} />
                              <Link
                                href={`/treasury/transactions/new?accountId=${account.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <Plus className="h-4 w-4" />
                                Ajouter une transaction
                              </Link>
                              <div className="my-1" style={{ borderTop: "1px solid #EEEEEE" }} />
                              <button
                                onClick={() => handleDeleteAccount(account.id, account.accountName)}
                                className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#FEE2E8] w-full text-left"
                                style={{ color: "#F04B69" }}
                              >
                                <XCircle className="h-4 w-4" />
                                Supprimer le compte
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center" style={{ color: "#666666" }}>
                        Aucun compte bancaire
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="p-6 space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2 relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "#999999" }}
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: "#F5F5F7",
                    border: "1px solid #EEEEEE",
                    color: "#111111",
                  }}
                />
              </div>
              <StyledSelect
                value={accountFilter}
                onChange={setAccountFilter}
                options={[
                  { value: "", label: "Tous les comptes" },
                  ...accounts.map((acc) => ({
                    value: acc.id,
                    label: acc.accountName,
                  })),
                ]}
                placeholder="Tous les comptes"
              />
              <StyledSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={transactionTypeOptions}
                placeholder="Tous les types"
              />
              <StyledSelect
                value={reconciledFilter}
                onChange={setReconciledFilter}
                options={reconciledOptions}
                placeholder="Rapprochement"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#444444" }}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#444444" }}
                />
              </div>
            </div>

            {/* Transaction Stats */}
            {transactionStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl p-4" style={{ background: "#F5F5F7" }}>
                  <p className="text-sm" style={{ color: "#666666" }}>Total</p>
                  <p className="text-xl font-bold" style={{ color: "#111111" }}>
                    {transactionStats.total}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "#D4EDDA" }}>
                  <p className="text-sm" style={{ color: "#28B95F" }}>Entrées</p>
                  <p className="text-xl font-bold" style={{ color: "#28B95F" }}>
                    +{formatCurrency(transactionStats.creditAmount)}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "#FEE2E8" }}>
                  <p className="text-sm" style={{ color: "#F04B69" }}>Sorties</p>
                  <p className="text-xl font-bold" style={{ color: "#F04B69" }}>
                    -{formatCurrency(transactionStats.debitAmount)}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ background: "#E3F2FD" }}>
                  <p className="text-sm" style={{ color: "#0064FA" }}>Rapprochées</p>
                  <p className="text-xl font-bold" style={{ color: "#0064FA" }}>
                    {transactionStats.reconciledCount}
                  </p>
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #EEEEEE" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F5F5F7" }}>
                    <th className="text-left p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Date
                    </th>
                    <th className="text-left p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Description
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden md:table-cell" style={{ color: "#666666" }}>
                      Compte
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden lg:table-cell" style={{ color: "#666666" }}>
                      Catégorie
                    </th>
                    <th className="text-right p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Montant
                    </th>
                    <th className="text-center p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Rapproché
                    </th>
                    <th className="text-right p-3 text-xs font-semibold" style={{ color: "#666666" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr
                      key={tx.id}
                      className="transition-all hover:bg-[#F5F5F7]"
                      style={{ borderTop: index > 0 ? "1px solid #EEEEEE" : undefined }}
                    >
                      <td className="p-3 text-sm" style={{ color: "#444444" }}>
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate" style={{ color: "#111111" }}>
                            {tx.label || tx.description || tx.counterpartyName || "-"}
                          </p>
                          {tx.counterpartyName && tx.label !== tx.counterpartyName && (
                            <p className="text-xs truncate" style={{ color: "#666666" }}>
                              {tx.counterpartyName}
                            </p>
                          )}
                          {tx.linkedInvoice && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <FileText className="h-3 w-3" style={{ color: "#0064FA" }} />
                              <Link
                                href={`/invoices/${tx.linkedInvoice.id}`}
                                className="text-xs hover:underline"
                                style={{ color: "#0064FA" }}
                              >
                                {tx.linkedInvoice.invoiceNumber}
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell" style={{ color: "#666666" }}>
                        {tx.bankAccount.accountName}
                      </td>
                      <td className="p-3 text-sm hidden lg:table-cell">
                        {tx.category ? (
                          <span
                            className="px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ background: "#F5F5F7", color: "#666666" }}
                          >
                            {tx.category}
                          </span>
                        ) : (
                          <span style={{ color: "#999999" }}>-</span>
                        )}
                      </td>
                      <td
                        className="p-3 text-right font-semibold"
                        style={{ color: tx.type === "credit" ? "#28B95F" : "#F04B69" }}
                      >
                        {tx.type === "credit" ? "+" : ""}{formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleReconcile(tx.id, !tx.isReconciled)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all hover:bg-[#EEEEEE]"
                        >
                          {tx.isReconciled ? (
                            <CheckCircle2 className="h-4 w-4" style={{ color: "#28B95F" }} />
                          ) : (
                            <XCircle className="h-4 w-4" style={{ color: "#CCCCCC" }} />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(openMenuId === `tx-${tx.id}` ? null : `tx-${tx.id}`)
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-[#EEEEEE]"
                          >
                            <MoreHorizontal className="h-4 w-4" style={{ color: "#666666" }} />
                          </button>
                          {openMenuId === `tx-${tx.id}` && (
                            <div
                              className="absolute right-0 top-full mt-1 w-52 rounded-xl py-2 z-10"
                              style={{
                                background: "#FFFFFF",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                                border: "1px solid #EEEEEE",
                              }}
                            >
                              <Link
                                href={`/treasury/transactions/${tx.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <Eye className="h-4 w-4" />
                                Voir les détails
                              </Link>
                              <Link
                                href={`/treasury/transactions/${tx.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7]"
                                style={{ color: "#444444" }}
                              >
                                <Edit className="h-4 w-4" />
                                Modifier
                              </Link>
                              <div className="my-1" style={{ borderTop: "1px solid #EEEEEE" }} />
                              <button
                                onClick={() => handleReconcile(tx.id, !tx.isReconciled)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-all hover:bg-[#F5F5F7] text-left"
                                style={{ color: "#444444" }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {tx.isReconciled ? "Annuler rapprochement" : "Marquer rapprochée"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center" style={{ color: "#666666" }}>
                        Aucune transaction
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "#666666" }}>
                  Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                    style={{ background: "#F5F5F7", color: "#444444" }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </button>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                    style={{ background: "#F5F5F7", color: "#444444" }}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === "sync" && (
          <div className="p-6 space-y-6">
            {/* Sync Result Alert */}
            {syncResult && (
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{
                  background: syncResult.success ? "#D4EDDA" : "#FEE2E8",
                  border: `1px solid ${syncResult.success ? "#28B95F" : "#F04B69"}`,
                }}
              >
                {syncResult.success ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: "#28B95F" }} />
                ) : (
                  <AlertCircle className="h-5 w-5" style={{ color: "#F04B69" }} />
                )}
                <span style={{ color: syncResult.success ? "#28B95F" : "#F04B69" }}>
                  {syncResult.message}
                </span>
              </div>
            )}

            {/* GoCardless Info */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#F0F9FF", border: "1px solid #14B4E6" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#14B4E6" }}
                >
                  <Landmark className="h-6 w-6" style={{ color: "#FFFFFF" }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg" style={{ color: "#111111" }}>
                    Synchronisation bancaire via GoCardless
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "#666666" }}>
                    Connectez vos comptes bancaires pour synchroniser automatiquement vos transactions.
                    Les données sont récupérées en lecture seule via Open Banking.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button
                      onClick={() => { setConnectModalOpen(true); fetchInstitutions(); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{ background: "#14B4E6", color: "#FFFFFF" }}
                    >
                      <Plus className="h-4 w-4" />
                      Connecter une banque
                    </button>
                    {connections.length > 0 && (
                      <button
                        onClick={() => handleSync()}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                        style={{ background: "#0064FA", color: "#FFFFFF" }}
                      >
                        {syncing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Synchroniser maintenant
                      </button>
                    )}
                    {/* Rate Limit Indicator */}
                    {rateLimit && rateLimit.remaining !== null && (
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                        style={{
                          background: rateLimit.remaining < 10 ? "#FEE2E8" : rateLimit.remaining < 50 ? "#FFF9E6" : "#E8F8EE",
                          color: rateLimit.remaining < 10 ? "#F04B69" : rateLimit.remaining < 50 ? "#DCB40A" : "#28B95F",
                        }}
                      >
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{rateLimit.remaining}</span>
                        <span className="opacity-75">requêtes restantes</span>
                        {rateLimit.limit && (
                          <span className="opacity-50">/ {rateLimit.limit}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Banks */}
            <div>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "#111111" }}>
                Comptes connectés ({connections.filter(c => c.status === "linked").length})
              </h2>

              {connections.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center rounded-xl"
                  style={{ background: "#F5F5F7" }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "#EEEEEE" }}
                  >
                    <Landmark className="h-8 w-8" style={{ color: "#999999" }} />
                  </div>
                  <h3 className="text-lg font-medium mb-1" style={{ color: "#111111" }}>
                    Aucune banque connectée
                  </h3>
                  <p className="text-sm mb-4 max-w-md" style={{ color: "#666666" }}>
                    Connectez votre banque pour synchroniser automatiquement vos transactions et soldes
                  </p>
                  <button
                    onClick={() => { setConnectModalOpen(true); fetchInstitutions(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: "#14B4E6", color: "#FFFFFF" }}
                  >
                    <Landmark className="h-4 w-4" />
                    Connecter une banque
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {connections.map((conn) => (
                    <div
                      key={conn.id}
                      className="rounded-xl p-4 flex items-center justify-between"
                      style={{ background: "#F5F5F7" }}
                    >
                      <div className="flex items-center gap-4">
                        {conn.institutionLogo ? (
                          <img
                            src={conn.institutionLogo}
                            alt={conn.institutionName}
                            className="w-12 h-12 rounded-xl object-contain"
                            style={{ background: "#FFFFFF", padding: "4px" }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: "#EEEEEE" }}
                          >
                            <Landmark className="h-6 w-6" style={{ color: "#666666" }} />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" style={{ color: "#111111" }}>
                              {conn.institutionName}
                            </h3>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: conn.status === "linked" ? "#D4EDDA" : conn.status === "expired" ? "#FFF3E0" : conn.status === "pending" ? "#E8F4FD" : "#FEE2E8",
                                color: conn.status === "linked" ? "#28B95F" : conn.status === "expired" ? "#F0783C" : conn.status === "pending" ? "#0064FA" : "#F04B69",
                              }}
                            >
                              {conn.status === "linked" ? "Connecté" : conn.status === "expired" ? "Expiré" : conn.status === "pending" ? "En attente" : "Erreur"}
                            </span>
                          </div>
                          {conn.bankAccount && (
                            <p className="text-sm" style={{ color: "#666666" }}>
                              {conn.bankAccount.accountName}
                              {conn.bankAccount.iban && (
                                <span className="font-mono ml-2" style={{ color: "#999999" }}>
                                  {conn.bankAccount.iban.replace(/(.{4})/g, "$1 ").trim().slice(-14)}
                                </span>
                              )}
                            </p>
                          )}
                          {conn.bankAccount?.lastSyncAt && (
                            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "#999999" }}>
                              <Clock className="h-3 w-3" />
                              Dernière sync: {new Date(conn.bankAccount.lastSyncAt).toLocaleString("fr-FR")}
                            </p>
                          )}
                          {conn.errorMessage && (
                            <p className="text-xs mt-1" style={{ color: "#F04B69" }}>
                              {conn.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conn.status === "linked" && conn.bankAccount && (
                          <>
                            <p className="font-bold text-lg mr-4" style={{ color: "#111111" }}>
                              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(conn.bankAccount.currentBalance)}
                            </p>
                            <button
                              onClick={() => handleSync(conn.bankAccount!.id)}
                              disabled={syncing}
                              className="p-2 rounded-lg transition-all hover:bg-[#EEEEEE] disabled:opacity-50"
                              title="Synchroniser"
                            >
                              {syncing ? (
                                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#0064FA" }} />
                              ) : (
                                <RefreshCw className="h-4 w-4" style={{ color: "#0064FA" }} />
                              )}
                            </button>
                          </>
                        )}
                        {conn.status === "expired" && (
                          <button
                            onClick={() => {
                              // Pre-select this bank for reconnection
                              setInstitutionSearch(conn.institutionName)
                              setConnectModalOpen(true)
                              fetchInstitutions()
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 flex items-center gap-2"
                            style={{ background: "#F0783C", color: "#FFFFFF" }}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Reconnecter
                          </button>
                        )}
                        <button
                          onClick={() => handleDisconnect(conn.id)}
                          className="p-2 rounded-lg transition-all hover:bg-[#FEE2E8]"
                          title="Supprimer"
                        >
                          <Unlink className="h-4 w-4" style={{ color: "#F04B69" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info about expiration */}
            {connections.some(c => c.status === "linked") && (
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: "#FFF9E6", border: "1px solid #DCB40A" }}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#DCB40A" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#111111" }}>
                    Les connexions bancaires expirent après 90 jours
                  </p>
                  <p className="text-sm mt-1" style={{ color: "#666666" }}>
                    Vous devrez reconnecter votre banque périodiquement pour continuer la synchronisation.
                    C&apos;est une exigence de la réglementation Open Banking.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connect Bank Modal */}
      {connectModalOpen && (
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
                    style={{ background: "#14B4E6" }}
                  >
                    <Landmark className="h-5 w-5" style={{ color: "#FFFFFF" }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                      Connecter une banque
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Sélectionnez votre banque pour synchroniser vos comptes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConnectModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                  style={{ background: "#F5F5F7" }}
                >
                  <X className="h-4 w-4" style={{ color: "#666666" }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "#999999" }}
                />
                <input
                  type="text"
                  placeholder="Rechercher une banque..."
                  value={institutionSearch}
                  onChange={(e) => setInstitutionSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                />
              </div>

              {/* Institutions List */}
              {loadingInstitutions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#14B4E6" }} />
                </div>
              ) : institutions.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: "#F04B69" }} />
                  <p className="font-medium" style={{ color: "#111111" }}>
                    GoCardless non configuré
                  </p>
                  <p className="text-sm mt-1" style={{ color: "#666666" }}>
                    Configurez GoCardless dans Paramètres &gt; Intégrations
                  </p>
                  <Link
                    href="/settings?tab=integrations"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium"
                    style={{ background: "#F5F5F7", color: "#444444" }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Aller aux paramètres
                  </Link>
                </div>
              ) : (
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {institutions
                    .filter((inst) =>
                      inst.name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
                      inst.bic?.toLowerCase().includes(institutionSearch.toLowerCase())
                    )
                    .map((inst) => (
                      <button
                        key={inst.id}
                        onClick={() => handleConnect(inst)}
                        disabled={connecting}
                        className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:bg-[#F5F5F7] disabled:opacity-50"
                        style={{ border: "1px solid #EEEEEE" }}
                      >
                        {inst.logo ? (
                          <img
                            src={inst.logo}
                            alt={inst.name}
                            className="w-12 h-12 rounded-xl object-contain"
                            style={{ background: "#F5F5F7", padding: "4px" }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: "#F5F5F7" }}
                          >
                            <Landmark className="h-6 w-6" style={{ color: "#666666" }} />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: "#111111" }}>
                            {inst.name}
                          </p>
                          {inst.bic && (
                            <p className="text-xs font-mono" style={{ color: "#999999" }}>
                              {inst.bic}
                            </p>
                          )}
                        </div>
                        {connecting ? (
                          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#14B4E6" }} />
                        ) : (
                          <ExternalLink className="h-5 w-5" style={{ color: "#999999" }} />
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="p-6" style={{ borderTop: "1px solid #EEEEEE" }}>
              <p className="text-xs text-center" style={{ color: "#999999" }}>
                Vos données bancaires sont récupérées en lecture seule via GoCardless (Open Banking).
                Aucune opération ne sera effectuée sur votre compte.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
