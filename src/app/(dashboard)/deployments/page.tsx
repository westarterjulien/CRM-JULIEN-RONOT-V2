"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  RefreshCw,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  Square,
  GitBranch,
  ExternalLink,
  Filter,
  Search,
  Rocket,
  AlertTriangle,
  Timer,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Bell,
  BellOff,
  Layers,
  Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ServerStatus {
  name: string
  id: number
  online: boolean
  running: number
  errors: number
}

interface DeploymentDetailModalProps {
  deployment: Deployment | null
  onClose: () => void
  onAction: (action: "redeploy" | "cancel", deployment: Deployment) => void
  actionLoading: string | null
}

interface Deployment {
  id: string
  title: string
  description: string
  status: "running" | "done" | "error" | "queued"
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
  duration: number | null
  server: string
  serverId: number
  serverUrl: string
  projectName: string
  appName: string
  appId: string
  appType: "application" | "compose"
  appStatus: string
  repository: string | null
  owner: string | null
  branch: string | null
  logPath: string | null
}

interface CatalogApp {
  name: string
  projectName: string
  type: "application" | "compose"
  repository: string | null
  owner: string | null
  branch: string | null
  servers: {
    serverId: number
    serverName: string
    serverUrl: string
    appId: string
    status: string
    lastDeployment: {
      id: string
      status: string
      createdAt: string
      duration: number | null
    } | null
  }[]
}

interface DeploymentData {
  servers: ServerStatus[]
  deployments: Deployment[]
  catalog: CatalogApp[]
  stats: {
    total: number
    running: number
    done: number
    error: number
  }
}

export default function DeploymentsPage() {
  const [data, setData] = useState<DeploymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [serverFilter, setServerFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showCatalog, setShowCatalog] = useState(true)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")
  const previousDeploymentsRef = useRef<Map<string, string>>(new Map())

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true)
      }
    }
  }, [])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Les notifications ne sont pas supportées par votre navigateur")
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    if (permission === "granted") {
      setNotificationsEnabled(true)
      // Show test notification
      new Notification("Notifications activées", {
        body: "Vous recevrez une notification quand un déploiement se termine",
        icon: "/favicon.ico",
      })
    }
  }

  // Send notification
  const sendNotification = (title: string, body: string, isError: boolean = false) => {
    if (!notificationsEnabled || Notification.permission !== "granted") return

    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: `deployment-${Date.now()}`,
      requireInteraction: isError, // Keep error notifications visible
    })
  }

  const fetchDeployments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      if (serverFilter) params.set("server", serverFilter)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/deployments?${params.toString()}`)
      if (res.ok) {
        const result = await res.json()

        // Check for status changes and send notifications
        if (isRefresh && notificationsEnabled && result.deployments) {
          const previousStates = previousDeploymentsRef.current

          for (const deployment of result.deployments as Deployment[]) {
            const prevStatus = previousStates.get(deployment.id)

            // Only notify if we knew about this deployment before and status changed
            if (prevStatus && prevStatus !== deployment.status) {
              if (deployment.status === "done") {
                sendNotification(
                  `✅ Déploiement terminé`,
                  `${deployment.appName} sur ${deployment.server}`,
                  false
                )
              } else if (deployment.status === "error") {
                sendNotification(
                  `❌ Échec du déploiement`,
                  `${deployment.appName} sur ${deployment.server}`,
                  true
                )
              }
            }
          }

          // Update previous states
          const newStates = new Map<string, string>()
          for (const d of result.deployments as Deployment[]) {
            newStates.set(d.id, d.status)
          }
          previousDeploymentsRef.current = newStates
        } else if (result.deployments) {
          // Initial load - just store states without notifying
          const newStates = new Map<string, string>()
          for (const d of result.deployments as Deployment[]) {
            newStates.set(d.id, d.status)
          }
          previousDeploymentsRef.current = newStates
        }

        setData(result)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error("Error fetching deployments:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [serverFilter, statusFilter, notificationsEnabled])

  useEffect(() => {
    fetchDeployments()
  }, [fetchDeployments])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchDeployments(true)
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchDeployments])

  const handleAction = async (
    action: "redeploy" | "cancel",
    deployment: Deployment
  ) => {
    setActionLoading(deployment.id)
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          serverId: deployment.serverId,
          appId: deployment.appId,
          appType: deployment.appType,
        }),
      })

      if (res.ok) {
        // Refresh after action
        setTimeout(() => fetchDeployments(true), 1000)
      } else {
        alert("Erreur lors de l'exécution de l'action")
      }
    } catch (error) {
      console.error("Error executing action:", error)
      alert("Erreur de connexion")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "-"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins}min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Il y a ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `Il y a ${diffDays}j`
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "running":
        return {
          label: "En cours",
          icon: Loader2,
          color: "#0064FA",
          bg: "#E6F0FF",
          animate: true,
        }
      case "done":
        return {
          label: "Terminé",
          icon: CheckCircle2,
          color: "#28B95F",
          bg: "#E6F9EE",
          animate: false,
        }
      case "error":
        return {
          label: "Erreur",
          icon: XCircle,
          color: "#EF4444",
          bg: "#FEE2E2",
          animate: false,
        }
      case "queued":
        return {
          label: "En attente",
          icon: Clock,
          color: "#F59E0B",
          bg: "#FEF3C7",
          animate: false,
        }
      default:
        return {
          label: status,
          icon: Clock,
          color: "#6B7280",
          bg: "#F3F4F6",
          animate: false,
        }
    }
  }

  const filteredDeployments = data?.deployments.filter((d) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        d.appName.toLowerCase().includes(query) ||
        d.projectName.toLowerCase().includes(query) ||
        d.title.toLowerCase().includes(query) ||
        d.repository?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const runningDeployments = filteredDeployments?.filter(
    (d) => d.status === "running"
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#0064FA]" />
          <p className="text-gray-500">Chargement des déploiements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Rocket className="h-6 w-6 text-[#0064FA]" />
              Suivi des Déploiements
            </h1>
            <p className="text-gray-500 mt-1">
              Vue consolidée de vos 3 serveurs Dokploy
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification toggle */}
            <button
              onClick={() => {
                if (notificationPermission === "granted") {
                  setNotificationsEnabled(!notificationsEnabled)
                } else if (notificationPermission === "denied") {
                  alert("Les notifications sont bloquées. Modifiez les paramètres de votre navigateur.")
                } else {
                  requestNotificationPermission()
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                notificationsEnabled
                  ? "bg-green-100 text-green-700"
                  : notificationPermission === "denied"
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-600"
              )}
              title={
                notificationPermission === "denied"
                  ? "Notifications bloquées"
                  : notificationsEnabled
                  ? "Désactiver les notifications"
                  : "Activer les notifications"
              }
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              {notificationsEnabled ? "Notifs ON" : "Notifs OFF"}
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                autoRefresh
                  ? "bg-[#E6F0FF] text-[#0064FA]"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <Activity className={cn("h-4 w-4", autoRefresh && "animate-pulse")} />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => fetchDeployments(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#0064FA] text-white rounded-xl text-sm font-medium hover:bg-[#0052CC] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Server Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.servers.map((server) => (
            <div
              key={server.id}
              className={cn(
                "bg-white rounded-xl border p-4 transition-all cursor-pointer",
                serverFilter === server.name
                  ? "border-[#0064FA] ring-2 ring-[#0064FA]/20"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() =>
                setServerFilter(serverFilter === server.name ? "" : server.name)
              }
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{server.name}</span>
                </div>
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    server.online ? "bg-green-500" : "bg-red-500"
                  )}
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                {server.running > 0 && (
                  <div className="flex items-center gap-1 text-[#0064FA]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{server.running} en cours</span>
                  </div>
                )}
                {server.errors > 0 && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{server.errors} erreurs</span>
                  </div>
                )}
                {server.running === 0 && server.errors === 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Tout est OK</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        {data?.stats && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Total:</span>
              <span className="font-medium">{data.stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0064FA]" />
              <span className="text-gray-500">En cours:</span>
              <span className="font-medium">{data.stats.running}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-500">Terminés:</span>
              <span className="font-medium">{data.stats.done}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-500">Erreurs:</span>
              <span className="font-medium">{data.stats.error}</span>
            </div>
            {lastRefresh && (
              <div className="ml-auto text-gray-400 text-xs">
                Dernière mise à jour: {lastRefresh.toLocaleTimeString("fr-FR")}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une app, projet..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="running">En cours</option>
              <option value="done">Terminés</option>
              <option value="error">Erreurs</option>
            </select>
          </div>

          {(serverFilter || statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setServerFilter("")
                setStatusFilter("")
                setSearchQuery("")
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Running Deployments - Priority Section (above catalog) */}
      {runningDeployments && runningDeployments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#0064FA]" />
            Déploiements en cours ({runningDeployments.length})
          </h2>
          <div className="space-y-3">
            {runningDeployments.map((deployment) => (
              <DeploymentCard
                key={deployment.id}
                deployment={deployment}
                onAction={handleAction}
                actionLoading={actionLoading}
                formatDuration={formatDuration}
                formatTimeAgo={formatTimeAgo}
                getStatusConfig={getStatusConfig}
                highlighted
                onClick={() => setSelectedDeployment(deployment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Deployments - Alert Section (only show if app is currently in error state) */}
      {filteredDeployments && filteredDeployments.filter((d) => d.status === "error" && d.appStatus === "error").length > 0 && !statusFilter && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Déploiements en erreur ({filteredDeployments.filter((d) => d.status === "error" && d.appStatus === "error").length})
          </h2>
          <div className="space-y-3">
            {filteredDeployments
              .filter((d) => d.status === "error" && d.appStatus === "error")
              .slice(0, 5)
              .map((deployment) => (
                <DeploymentCard
                  key={deployment.id}
                  deployment={deployment}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                  formatDuration={formatDuration}
                  formatTimeAgo={formatTimeAgo}
                  getStatusConfig={getStatusConfig}
                  onClick={() => setSelectedDeployment(deployment)}
                />
              ))}
            {filteredDeployments.filter((d) => d.status === "error" && d.appStatus === "error").length > 5 && (
              <button
                onClick={() => setStatusFilter("error")}
                className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Voir toutes les erreurs ({filteredDeployments.filter((d) => d.status === "error" && d.appStatus === "error").length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Applications Catalog */}
      {data?.catalog && data.catalog.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 hover:text-[#0064FA] transition-colors"
          >
            {showCatalog ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
            <Layers className="h-5 w-5 text-[#0064FA]" />
            Catalogue des Applications
            <span className="text-sm font-normal text-gray-500">
              ({data.catalog.length} apps)
            </span>
          </button>

          {showCatalog && (
            <>
              {/* Search in catalog */}
              <div className="relative mb-4 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Rechercher une application..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none text-sm"
                />
              </div>

              {/* Server columns header */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-[1fr_repeat(3,120px)] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div>Application</div>
                  {data.servers.map((server) => (
                    <div key={server.id} className="text-center">
                      {server.name.replace(" NEW", "")}
                    </div>
                  ))}
                </div>

                {/* Apps list */}
                <div className="divide-y divide-gray-100">
                  {data.catalog
                    .filter((app) =>
                      catalogSearch
                        ? app.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                          app.projectName.toLowerCase().includes(catalogSearch.toLowerCase())
                        : true
                    )
                    .map((app) => (
                      <CatalogAppRow
                        key={`${app.name}-${app.projectName}`}
                        app={app}
                        allServers={data.servers}
                        onRedeploy={(serverId, appId, appType) => {
                          handleAction("redeploy", {
                            id: appId,
                            serverId,
                            appId,
                            appType,
                          } as Deployment)
                        }}
                        actionLoading={actionLoading}
                      />
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* History Toggle */}
      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3 hover:text-[#0064FA] transition-colors"
        >
          {showHistory ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
          {statusFilter === "error" ? "Tous les déploiements en erreur" : "Historique des déploiements"}
          {filteredDeployments && (
            <span className="text-sm font-normal text-gray-500">
              ({filteredDeployments.filter((d) => statusFilter ? true : d.status !== "running" && d.status !== "error").length})
            </span>
          )}
        </button>

        {showHistory && (
          <>
            {filteredDeployments && filteredDeployments.length > 0 ? (
              <div className="space-y-2">
                {filteredDeployments
                  .filter((d) => statusFilter ? true : d.status !== "running" && d.status !== "error")
                  .map((deployment) => (
                    <DeploymentCard
                      key={deployment.id}
                      deployment={deployment}
                      onAction={handleAction}
                      actionLoading={actionLoading}
                      formatDuration={formatDuration}
                      formatTimeAgo={formatTimeAgo}
                      getStatusConfig={getStatusConfig}
                      onClick={() => setSelectedDeployment(deployment)}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <Rocket className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Aucun déploiement trouvé</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Deployment Detail Modal */}
      <DeploymentDetailModal
        deployment={selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
        onAction={handleAction}
        actionLoading={actionLoading}
      />
    </div>
  )
}

function DeploymentCard({
  deployment,
  onAction,
  actionLoading,
  formatDuration,
  formatTimeAgo,
  getStatusConfig,
  highlighted = false,
  onClick,
}: {
  deployment: Deployment
  onAction: (action: "redeploy" | "cancel", deployment: Deployment) => void
  actionLoading: string | null
  formatDuration: (seconds: number | null) => string
  formatTimeAgo: (dateStr: string) => string
  getStatusConfig: (status: string) => {
    label: string
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    color: string
    bg: string
    animate: boolean
  }
  highlighted?: boolean
  onClick?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const statusConfig = getStatusConfig(deployment.status)
  const StatusIcon = statusConfig.icon
  const isError = deployment.status === "error"

  // Clean commit message (remove long descriptions)
  const titleLine = deployment.title.split("\n")[0].slice(0, 80)
  const fullDescription = deployment.title

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 transition-all cursor-pointer",
        highlighted
          ? "border-[#0064FA] shadow-lg shadow-[#0064FA]/10"
          : isError
          ? "border-red-300 bg-red-50/30 hover:bg-red-50/50"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: statusConfig.bg }}
        >
          <StatusIcon
            className={cn(
              "h-5 w-5",
              statusConfig.animate && "animate-spin"
            )}
            style={{ color: statusConfig.color }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium text-gray-900">
                  {deployment.appName}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: statusConfig.bg,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {deployment.server}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate" title={deployment.title}>
                {titleLine || "Manual deployment"}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{deployment.projectName}</span>
                {deployment.repository && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {deployment.owner}/{deployment.repository}
                    {deployment.branch && `:${deployment.branch}`}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              {deployment.status === "running" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAction("cancel", deployment)
                  }}
                  disabled={actionLoading === deployment.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading === deployment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  Annuler
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAction("redeploy", deployment)
                  }}
                  disabled={actionLoading === deployment.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0064FA] bg-[#E6F0FF] hover:bg-[#CCE0FF] rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading === deployment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Redéployer
                </button>
              )}
              <a
                href={`${deployment.serverUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Ouvrir dans Dokploy"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Error message banner */}
          {isError && (
            <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">
                    Échec du déploiement
                  </p>
                  {deployment.errorMessage ? (
                    <p className="text-sm text-red-700 mt-1">
                      {deployment.errorMessage}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 mt-1">
                      Consultez les logs pour plus de détails
                    </p>
                  )}
                </div>
                <a
                  href={`${deployment.serverUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-200 hover:bg-red-300 rounded transition-colors shrink-0"
                >
                  <FileText className="h-3 w-3" />
                  Voir logs
                </a>
              </div>
            </div>
          )}

          {/* Progress bar for running */}
          {deployment.status === "running" && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0064FA] rounded-full animate-pulse"
                  style={{ width: "60%" }}
                />
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="flex items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeAgo(deployment.createdAt)}
              </span>
              {deployment.duration !== null && (
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {formatDuration(deployment.duration)}
                </span>
              )}
            </div>
            {fullDescription.includes("\n") && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Plus
                  </>
                )}
              </button>
            )}
          </div>

          {/* Expanded details */}
          {expanded && fullDescription.includes("\n") && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Message de commit complet</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {fullDescription}
              </pre>
              {deployment.description && (
                <p className="text-xs text-gray-500 mt-2">
                  {deployment.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DeploymentDetailModal({
  deployment,
  onClose,
  onAction,
  actionLoading,
}: DeploymentDetailModalProps) {
  if (!deployment) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "-"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const isError = deployment.status === "error"
  const isRunning = deployment.status === "running"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={cn(
            "px-6 py-4 border-b flex items-center justify-between",
            isError ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isError ? "bg-red-100" : isRunning ? "bg-blue-100" : "bg-green-100"
              )}
            >
              {isError ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : isRunning ? (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {deployment.appName}
              </h2>
              <p className="text-sm text-gray-500">
                {deployment.projectName} • {deployment.server}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                isError
                  ? "bg-red-100 text-red-700"
                  : isRunning
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              )}
            >
              {isError ? "Échec" : isRunning ? "En cours" : "Terminé"}
            </span>
            {deployment.duration !== null && (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Timer className="h-4 w-4" />
                Durée: {formatDuration(deployment.duration)}
              </span>
            )}
          </div>

          {/* Error Section - Highlighted for errors */}
          {isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2">
                    Erreur de déploiement
                  </h3>
                  {deployment.errorMessage ? (
                    <div className="bg-red-100 p-3 rounded-lg">
                      <pre className="text-sm text-red-900 whitespace-pre-wrap font-mono overflow-x-auto">
                        {deployment.errorMessage}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-red-700">
                      Aucun message d&apos;erreur disponible. Consultez les logs pour plus de détails.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Commit Message */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Message de commit
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {deployment.title || "Manual deployment"}
              </pre>
              {deployment.description && (
                <p className="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-200">
                  {deployment.description}
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Serveur
              </h4>
              <p className="text-sm text-gray-900">{deployment.server}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Projet
              </h4>
              <p className="text-sm text-gray-900">{deployment.projectName}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Type
              </h4>
              <p className="text-sm text-gray-900 capitalize">{deployment.appType}</p>
            </div>
            {deployment.repository && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Repository
                </h4>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  <GitBranch className="h-3.5 w-3.5" />
                  {deployment.owner}/{deployment.repository}
                  {deployment.branch && (
                    <span className="text-gray-500">:{deployment.branch}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Chronologie</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Créé le</span>
                <span className="text-gray-900 font-mono">
                  {formatDate(deployment.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Démarré le</span>
                <span className="text-gray-900 font-mono">
                  {formatDate(deployment.startedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Terminé le</span>
                <span className="text-gray-900 font-mono">
                  {formatDate(deployment.finishedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
          <a
            href={deployment.serverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir dans Dokploy
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Fermer
            </button>
            {isRunning ? (
              <button
                onClick={() => onAction("cancel", deployment)}
                disabled={actionLoading === deployment.id}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === deployment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Annuler le déploiement
              </button>
            ) : (
              <button
                onClick={() => onAction("redeploy", deployment)}
                disabled={actionLoading === deployment.id}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0064FA] hover:bg-[#0052CC] rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === deployment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Redéployer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CatalogAppRow({
  app,
  allServers,
  onRedeploy,
  actionLoading,
}: {
  app: CatalogApp
  allServers: ServerStatus[]
  onRedeploy: (serverId: number, appId: string, appType: "application" | "compose") => void
  actionLoading: string | null
}) {
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `${diffMins}min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}j`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" }
      case "done":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" }
      case "error":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" }
      case "idle":
        return { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" }
      default:
        return { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" }
    }
  }

  return (
    <div className="grid grid-cols-[1fr_repeat(3,120px)] gap-2 px-4 py-3 hover:bg-gray-50 transition-colors items-center">
      {/* App info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{app.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
            {app.type}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 truncate">{app.projectName}</span>
          {app.repository && (
            <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
              <GitBranch className="h-3 w-3" />
              {app.branch || "main"}
            </span>
          )}
        </div>
      </div>

      {/* Server columns */}
      {allServers.map((server) => {
        const serverInfo = app.servers.find((s) => s.serverId === server.id)

        if (!serverInfo) {
          // App not present on this server
          return (
            <div key={server.id} className="flex justify-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
                <Minus className="h-4 w-4 text-gray-300" />
              </div>
            </div>
          )
        }

        const statusColors = getStatusColor(serverInfo.status)
        const isLoading = actionLoading === serverInfo.appId

        return (
          <div key={server.id} className="flex justify-center">
            <div className="relative group">
              <button
                onClick={() => onRedeploy(serverInfo.serverId, serverInfo.appId, app.type)}
                disabled={isLoading}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                  statusColors.bg,
                  "hover:ring-2 hover:ring-offset-1 hover:ring-[#0064FA]/30"
                )}
                title={`${serverInfo.status} - Cliquer pour redéployer`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#0064FA]" />
                ) : serverInfo.status === "running" ? (
                  <CheckCircle2 className={cn("h-4 w-4", statusColors.text)} />
                ) : serverInfo.status === "error" ? (
                  <XCircle className={cn("h-4 w-4", statusColors.text)} />
                ) : (
                  <CheckCircle2 className={cn("h-4 w-4", statusColors.text)} />
                )}
              </button>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10">
                {serverInfo.status === "running" ? "En ligne" : serverInfo.status === "error" ? "Erreur" : "Actif"}
                {serverInfo.lastDeployment && (
                  <span className="text-gray-400 ml-1">
                    • {formatTimeAgo(serverInfo.lastDeployment.createdAt)}
                  </span>
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
