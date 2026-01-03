"use client"

import { useEffect, useState } from "react"
import {
  Package,
  RefreshCw,
  CreditCard,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react"

interface Service {
  id: string
  serviceId: string
  code: string
  name: string
  description: string | null
  quantity: number
  unitPriceHt: number
  vatRate: number
  totalHt: number
  totalTtc: number
  isRecurring: boolean
  startDate: string | null
  endDate: string | null
}

interface Summary {
  totalServices: number
  recurringCount: number
  oneTimeCount: number
  monthlyTotal: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}


export default function ClientServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    try {
      const response = await fetch("/api/client-portal/services")
      const data = await response.json()

      if (response.ok) {
        setServices(data.services)
        setSummary(data.summary)
      } else {
        setError(data.error || "Erreur lors du chargement")
      }
    } catch {
      setError("Erreur de connexion")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#FEE2E8" }}>
          <AlertCircle className="w-8 h-8" style={{ color: "#F04B69" }} />
        </div>
        <p style={{ color: "#F04B69" }}>{error}</p>
      </div>
    )
  }

  const recurringServices = services.filter((s) => s.isRecurring)
  const oneTimeServices = services.filter((s) => !s.isRecurring)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
          Mes services
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#666666" }}>
          Liste de vos services actifs et abonnements
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#E6F0FF" }}>
                <Package className="w-6 h-6" style={{ color: "#0064FA" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>Total services</p>
                <p className="text-2xl font-bold" style={{ color: "#111111" }}>{summary.totalServices}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
                <RefreshCw className="w-6 h-6" style={{ color: "#5F00BA" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>Abonnements</p>
                <p className="text-2xl font-bold" style={{ color: "#111111" }}>{summary.recurringCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#FFF9E6" }}>
                <CreditCard className="w-6 h-6" style={{ color: "#DCB40A" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>Ponctuels</p>
                <p className="text-2xl font-bold" style={{ color: "#111111" }}>{summary.oneTimeCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#E8F8EE" }}>
                <TrendingUp className="w-6 h-6" style={{ color: "#28B95F" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>Total mensuel</p>
                <p className="text-xl font-bold" style={{ color: "#28B95F" }}>{formatCurrency(summary.monthlyTotal)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services List */}
      {services.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#E6F0FF" }}>
            <Package className="w-8 h-8" style={{ color: "#0064FA" }} />
          </div>
          <p className="font-medium" style={{ color: "#666666" }}>Aucun service actif</p>
          <p className="text-sm mt-2" style={{ color: "#999999" }}>
            Contactez-nous pour souscrire à nos services.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Recurring Services */}
          {recurringServices.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: "#EEEEEE" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
                  <RefreshCw className="w-5 h-5" style={{ color: "#5F00BA" }} />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: "#111111" }}>Abonnements</h2>
                  <p className="text-xs" style={{ color: "#999999" }}>{recurringServices.length} service(s) récurrent(s)</p>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: "#EEEEEE" }}>
                {recurringServices.map((service) => (
                  <div key={service.id} className="p-5 hover:bg-[#FAFAFA] transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold" style={{ color: "#111111" }}>{service.name}</h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "#F3E8FF", color: "#5F00BA" }}
                          >
                            Récurrent
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-sm mt-1" style={{ color: "#666666" }}>{service.description}</p>
                        )}
                        {service.startDate && (
                          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: "#999999" }}>
                            <Calendar className="w-3 h-3" />
                            Depuis le {formatDate(service.startDate)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "#999999" }}>Quantite</p>
                          <p className="font-medium" style={{ color: "#111111" }}>{service.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "#999999" }}>Prix unitaire HT</p>
                          <p className="font-medium" style={{ color: "#111111" }}>{formatCurrency(service.unitPriceHt)}</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-xs" style={{ color: "#999999" }}>Total TTC</p>
                          <p className="text-lg font-bold" style={{ color: "#5F00BA" }}>{formatCurrency(service.totalTtc)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* One-time Services */}
          {oneTimeServices.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: "#EEEEEE" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFF9E6" }}>
                  <CreditCard className="w-5 h-5" style={{ color: "#DCB40A" }} />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: "#111111" }}>Services ponctuels</h2>
                  <p className="text-xs" style={{ color: "#999999" }}>{oneTimeServices.length} service(s)</p>
                </div>
              </div>
              <div className="divide-y" style={{ borderColor: "#EEEEEE" }}>
                {oneTimeServices.map((service) => (
                  <div key={service.id} className="p-5 hover:bg-[#FAFAFA] transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold" style={{ color: "#111111" }}>{service.name}</h3>
                        {service.description && (
                          <p className="text-sm mt-1" style={{ color: "#666666" }}>{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "#999999" }}>Quantite</p>
                          <p className="font-medium" style={{ color: "#111111" }}>{service.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "#999999" }}>Prix unitaire HT</p>
                          <p className="font-medium" style={{ color: "#111111" }}>{formatCurrency(service.unitPriceHt)}</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-xs" style={{ color: "#999999" }}>Total TTC</p>
                          <p className="text-lg font-bold" style={{ color: "#DCB40A" }}>{formatCurrency(service.totalTtc)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
