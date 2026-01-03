"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, Pencil, FileText, Receipt, RefreshCw, Ticket,
  Mail, Phone, MapPin, Globe, Building2, CreditCard, TrendingUp,
  Plus, Eye, ExternalLink, Euro, Clock, CheckCircle, AlertTriangle, Server, Trash2,
  Users
} from "lucide-react"
import { ClientUsersTab } from "@/components/clients/client-users-tab"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ClientData {
  client: {
    id: string
    companyName: string
    client_type: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    siret: string | null
    siren: string | null
    vatNumber: string | null
    apeCode: string | null
    legalForm: string | null
    capital: number | null
    address: string | null
    postalCode: string | null
    city: string | null
    country: string
    website: string | null
    contactFirstname: string | null
    contactLastname: string | null
    contactEmail: string | null
    contactPhone: string | null
    notes: string | null
    status: string
    createdAt: string
    invoices: Array<{
      id: string
      invoiceNumber: string
      status: string
      totalTtc: number
      issueDate: string
      dueDate: string
    }>
    quotes: Array<{
      id: string
      quoteNumber: string
      status: string
      totalTtc: number
      issueDate: string
      validUntil: string
    }>
    subscriptions: Array<{
      id: string
      name: string
      status: string
      amountTtc: number
      billingCycle: string
      nextBillingDate: string
    }>
    tickets: Array<{
      id: string
      ticketNumber: string
      subject: string
      status: string
      priority: string
      createdAt: string
    }>
    services: Array<{
      id: string
      customPriceHt: number | null
      quantity: number
      isActive: boolean
      service: {
        id: string
        name: string
        unitPriceHt: number
        isRecurring: boolean
      }
    }>
    domains: Array<{
      id: string
      domain: string
      expirationDate: string | null
      autoRenew: boolean
      lastSync: string | null
      renewalPrice: number | null
    }>
  }
  stats: {
    totalRevenue: number
    pendingAmount: number
    mrr: number
    invoiceCount: number
    quoteCount: number
    paidInvoices: number
    acceptedQuotes: number
    conversionRate: number
  }
}

// Aurora CRM Colors
const auroraColors = {
  primary: "#0064FA",
  success: "#28B95F",
  warning: "#DCB40A",
  danger: "#F04B69",
  orange: "#F0783C",
  purple: "#5F00BA",
}

function getStatusBadge(status: string, type: "client" | "invoice" | "quote" | "subscription" | "ticket") {
  const styles: Record<string, { bg: string; text: string }> = {
    active: { bg: "#E8F8EE", text: "#28B95F" },
    prospect: { bg: "#FFF9E6", text: "#DCB40A" },
    inactive: { bg: "#F5F5F7", text: "#666666" },
    paid: { bg: "#E8F8EE", text: "#28B95F" },
    sent: { bg: "#E6F0FF", text: "#0064FA" },
    draft: { bg: "#F5F5F7", text: "#666666" },
    overdue: { bg: "#FEE2E8", text: "#F04B69" },
    accepted: { bg: "#E8F8EE", text: "#28B95F" },
    rejected: { bg: "#FEE2E8", text: "#F04B69" },
    new: { bg: "#E6F0FF", text: "#0064FA" },
    open: { bg: "#FFF9E6", text: "#DCB40A" },
    pending: { bg: "#FFF9E6", text: "#DCB40A" },
    resolved: { bg: "#E8F8EE", text: "#28B95F" },
    closed: { bg: "#F5F5F7", text: "#666666" },
  }

  const labels: Record<string, string> = {
    active: "Client",
    prospect: "Prospect",
    inactive: "Inactif",
    paid: "Payée",
    sent: "Envoyée",
    draft: "Brouillon",
    overdue: "En retard",
    accepted: "Accepté",
    rejected: "Refusé",
    new: "Nouveau",
    open: "Ouvert",
    pending: "En attente",
    resolved: "Résolu",
    closed: "Fermé",
  }

  const style = styles[status] || { bg: "#F5F5F7", text: "#666666" }
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: style.bg, color: style.text }}
    >
      {labels[status] || status}
    </span>
  )
}

function getAvatarColor(status: string) {
  switch (status) {
    case "active":
      return "#28B95F"
    case "prospect":
      return "#DCB40A"
    default:
      return "#999999"
  }
}

interface AvailableService {
  id: string
  code: string
  name: string
  unitPriceHt: number
  vatRate: number
  isRecurring: boolean
  alreadyAssigned: boolean
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)

  // Service dialog states
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false)
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<string>("")
  const [serviceQuantity, setServiceQuantity] = useState<number>(1)
  const [addingService, setAddingService] = useState(false)
  const [deletingService, setDeletingService] = useState<string | null>(null)

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`)
      if (!res.ok) throw new Error("Not found")
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error(error)
      router.push("/clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClient()
  }, [params.id, router])

  const loadAvailableServices = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}/services`)
      if (res.ok) {
        const json = await res.json()
        setAvailableServices(json.availableServices)
      }
    } catch (error) {
      console.error("Error loading services:", error)
    }
  }

  const handleAddService = async () => {
    if (!selectedServiceId) return

    setAddingService(true)
    try {
      const res = await fetch(`/api/clients/${params.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          quantity: serviceQuantity,
          isActive: true,
        }),
      })

      if (res.ok) {
        setShowAddServiceDialog(false)
        setSelectedServiceId("")
        setServiceQuantity(1)
        await fetchClient() // Refresh data
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'ajout")
      }
    } catch (error) {
      console.error("Error adding service:", error)
      alert("Erreur lors de l'ajout du service")
    } finally {
      setAddingService(false)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Supprimer ce service du client ?")) return

    setDeletingService(serviceId)
    try {
      const res = await fetch(`/api/clients/${params.id}/services/${serviceId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchClient() // Refresh data
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      alert("Erreur lors de la suppression")
    } finally {
      setDeletingService(null)
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

  const { client, stats } = data

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
        style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >

          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/clients")}
            className="mb-4 rounded-lg"
            style={{ color: "#666666" }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux clients
          </Button>

          {/* Client Info */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center text-white font-bold text-xl lg:text-2xl"
                style={{ background: getAvatarColor(client.status), boxShadow: `0 4px 12px ${getAvatarColor(client.status)}40` }}
              >
                {client.companyName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "#111111" }}>{client.companyName}</h1>
                  {getStatusBadge(client.status, "client")}
                </div>
                {client.siret && (
                  <p className="mt-1" style={{ color: "#999999" }}>SIRET: {client.siret}</p>
                )}
                {(client.contactFirstname || client.contactLastname) && (
                  <p className="mt-1" style={{ color: "#666666" }}>
                    Contact: {client.contactFirstname} {client.contactLastname}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href={`/quotes/new?clientId=${client.id}`}>
                <Button variant="outline" className="rounded-xl" style={{ borderColor: "#EEEEEE", color: "#444444" }}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Nouveau devis
                </Button>
              </Link>
              <Link href={`/invoices/new?clientId=${client.id}`}>
                <Button variant="outline" className="rounded-xl" style={{ borderColor: "#EEEEEE", color: "#444444" }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Nouvelle facture
                </Button>
              </Link>
              <Link href={`/clients/${client.id}/edit`}>
                <Button className="rounded-xl text-white" style={{ background: "#0064FA" }}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile Quick Actions Bar */}
          <div className="lg:hidden grid grid-cols-4 gap-2 mt-6">
            <Link href={`/invoices/new?clientId=${client.id}`} className="flex flex-col items-center gap-1 rounded-xl p-3 transition-colors" style={{ background: "#E6F0FF" }}>
              <FileText className="h-5 w-5" style={{ color: "#0064FA" }} />
              <span className="text-xs" style={{ color: "#0064FA" }}>Facture</span>
            </Link>
            <Link href={`/quotes/new?clientId=${client.id}`} className="flex flex-col items-center gap-1 rounded-xl p-3 transition-colors" style={{ background: "#FFF9E6" }}>
              <Receipt className="h-5 w-5" style={{ color: "#DCB40A" }} />
              <span className="text-xs" style={{ color: "#DCB40A" }}>Devis</span>
            </Link>
            <a href={client.email ? `mailto:${client.email}` : "#"} className="flex flex-col items-center gap-1 rounded-xl p-3 transition-colors" style={{ background: "#E8F8EE" }}>
              <Mail className="h-5 w-5" style={{ color: "#28B95F" }} />
              <span className="text-xs" style={{ color: "#28B95F" }}>Email</span>
            </a>
            <Link href={`/clients/${client.id}/edit`} className="flex flex-col items-center gap-1 rounded-xl p-3 transition-colors" style={{ background: "#F5F5F7" }}>
              <Pencil className="h-5 w-5" style={{ color: "#666666" }} />
              <span className="text-xs" style={{ color: "#666666" }}>Modifier</span>
            </Link>
          </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <div className="rounded-2xl p-4 lg:p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center" style={{ background: "#E8F8EE" }}>
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: "#28B95F" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#999999" }}>CA Total</p>
              <p className="text-lg lg:text-xl font-bold" style={{ color: "#111111" }}>
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 lg:p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center" style={{ background: "#FFF9E6" }}>
              <Clock className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: "#DCB40A" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#999999" }}>En attente</p>
              <p className="text-lg lg:text-xl font-bold" style={{ color: "#DCB40A" }}>
                {formatCurrency(stats.pendingAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 lg:p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center" style={{ background: "#E6F0FF" }}>
              <FileText className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: "#0064FA" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#999999" }}>Factures</p>
              <p className="text-lg lg:text-xl font-bold" style={{ color: "#111111" }}>{stats.invoiceCount}</p>
              <p className="text-xs" style={{ color: "#28B95F" }}>{stats.paidInvoices} payées</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 lg:p-5" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
              <Receipt className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: "#5F00BA" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#999999" }}>Devis</p>
              <p className="text-lg lg:text-xl font-bold" style={{ color: "#111111" }}>{stats.quoteCount}</p>
              <p className="text-xs" style={{ color: "#28B95F" }}>{stats.acceptedQuotes} acceptes</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 lg:p-5 col-span-2 lg:col-span-1" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center" style={{ background: "#FEE2E8" }}>
              <RefreshCw className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: "#F04B69" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#999999" }}>MRR</p>
              <p className="text-lg lg:text-xl font-bold" style={{ color: "#111111" }}>
                {formatCurrency(stats.mrr)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Info Card */}
        <div className="rounded-2xl lg:col-span-1" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="p-6 border-b" style={{ borderColor: "#EEEEEE" }}>
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "#111111" }}>
              <Building2 className="h-5 w-5" style={{ color: "#0064FA" }} />
              Informations
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {client.email && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E6F0FF" }}>
                  <Mail className="h-5 w-5" style={{ color: "#0064FA" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>Email</p>
                  <a href={`mailto:${client.email}`} className="font-medium hover:underline" style={{ color: "#0064FA" }}>
                    {client.email}
                  </a>
                </div>
              </div>
            )}

            {client.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E8F8EE" }}>
                  <Phone className="h-5 w-5" style={{ color: "#28B95F" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>Telephone</p>
                  <a href={`tel:${client.phone}`} className="font-medium hover:underline" style={{ color: "#111111" }}>
                    {client.phone}
                  </a>
                </div>
              </div>
            )}

            {(client.address || client.city) && (
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FFF9E6" }}>
                  <MapPin className="h-5 w-5" style={{ color: "#DCB40A" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>Adresse</p>
                  <div style={{ color: "#111111" }}>
                    {client.address && <p>{client.address}</p>}
                    <p>{client.postalCode} {client.city}</p>
                    <p style={{ color: "#999999" }}>{client.country}</p>
                  </div>
                </div>
              </div>
            )}

            {client.website && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
                  <Globe className="h-5 w-5" style={{ color: "#5F00BA" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>Site web</p>
                  <a
                    href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline flex items-center gap-1"
                    style={{ color: "#5F00BA" }}
                  >
                    {client.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {client.vatNumber && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EEEEEE" }}>
                  <CreditCard className="h-5 w-5" style={{ color: "#666666" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>N TVA</p>
                  <p className="font-medium" style={{ color: "#111111" }}>{client.vatNumber}</p>
                </div>
              </div>
            )}

            {client.notes && (
              <div className="p-3 rounded-xl" style={{ background: "#FFF9E6", border: "1px solid #F5E6A3" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "#DCB40A" }}>Notes</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "#666666" }}>{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Card */}
        <div className="rounded-2xl lg:col-span-2" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Tabs defaultValue="invoices" className="w-full">
            <div className="p-4 lg:p-6 pb-0 overflow-x-auto">
              <TabsList className="inline-flex lg:grid lg:grid-cols-7 w-max lg:w-full gap-1 p-1 rounded-xl" style={{ background: "#F5F5F7" }}>
                <TabsTrigger value="invoices" className="flex items-center gap-2 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: "#666666" }}>
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Factures</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "#E6F0FF", color: "#0064FA" }}>{client.invoices.length}</span>
                </TabsTrigger>
                <TabsTrigger value="quotes" className="flex items-center gap-2 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: "#666666" }}>
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Devis</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "#FFF9E6", color: "#DCB40A" }}>{client.quotes.length}</span>
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="flex items-center gap-2 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: "#666666" }}>
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Abo</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "#F3E8FF", color: "#5F00BA" }}>{client.subscriptions.length}</span>
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center gap-2 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: "#666666" }}>
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Services</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "#E8F8EE", color: "#28B95F" }}>{client.services.length}</span>
                </TabsTrigger>
                <TabsTrigger value="domains" className="flex items-center gap-2 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: "#666666" }}>
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Domaines</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "#FEE2E8", color: "#F04B69" }}>{client.domains.length}</span>
                </TabsTrigger>
                <TabsTrigger value="tickets" className="flex items-center gap-2 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: "#666666" }}>
                  <Ticket className="h-4 w-4" />
                  <span className="hidden sm:inline">Tickets</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "#FFF0E6", color: "#F0783C" }}>{client.tickets.length}</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2 rounded-lg whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm" style={{ color: "#666666" }}>
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Utilisateurs</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 lg:p-6">
              {/* Invoices Tab */}
              <TabsContent value="invoices" className="mt-0">
                {client.invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#E6F0FF" }}>
                      <FileText className="h-8 w-8" style={{ color: "#0064FA" }} />
                    </div>
                    <p className="font-medium mb-4" style={{ color: "#666666" }}>Aucune facture</p>
                    <Link href={`/invoices/new?clientId=${client.id}`}>
                      <Button className="rounded-xl text-white" style={{ background: "#0064FA" }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer une facture
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Numéro</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Échéance</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.invoices.map((invoice) => (
                          <TableRow key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/invoices/${invoice.id}`)}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                            <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(invoice.totalTtc)}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status, "invoice")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="rounded-lg">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Quotes Tab */}
              <TabsContent value="quotes" className="mt-0">
                {client.quotes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF9E6" }}>
                      <Receipt className="h-8 w-8" style={{ color: "#DCB40A" }} />
                    </div>
                    <p className="font-medium mb-4" style={{ color: "#666666" }}>Aucun devis</p>
                    <Link href={`/quotes/new?clientId=${client.id}`}>
                      <Button className="rounded-xl text-white" style={{ background: "#DCB40A" }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un devis
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Numéro</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Validité</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.quotes.map((quote) => (
                          <TableRow key={quote.id} className="cursor-pointer" onClick={() => router.push(`/quotes/${quote.id}`)}>
                            <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                            <TableCell>{formatDate(quote.issueDate)}</TableCell>
                            <TableCell>{formatDate(quote.validUntil)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(quote.totalTtc)}
                            </TableCell>
                            <TableCell>{getStatusBadge(quote.status, "quote")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="rounded-lg">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="mt-0">
                {client.subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F3E8FF" }}>
                      <RefreshCw className="h-8 w-8" style={{ color: "#5F00BA" }} />
                    </div>
                    <p className="font-medium mb-4" style={{ color: "#666666" }}>Aucun abonnement</p>
                    <Link href={`/subscriptions/new?clientId=${client.id}`}>
                      <Button className="rounded-xl text-white" style={{ background: "#5F00BA" }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un abonnement
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Nom</TableHead>
                          <TableHead>Cycle</TableHead>
                          <TableHead>Prochaine échéance</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.subscriptions.map((sub) => (
                          <TableRow key={sub.id} className="cursor-pointer" onClick={() => router.push(`/subscriptions/${sub.id}`)}>
                            <TableCell className="font-medium">{sub.name}</TableCell>
                            <TableCell className="capitalize">{sub.billingCycle}</TableCell>
                            <TableCell>{formatDate(sub.nextBillingDate)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(sub.amountTtc)}
                            </TableCell>
                            <TableCell>{getStatusBadge(sub.status, "subscription")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="rounded-lg">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-0">
                {/* Add Service Button */}
                <div className="flex justify-end mb-4">
                  <Dialog open={showAddServiceDialog} onOpenChange={(open) => {
                    setShowAddServiceDialog(open)
                    if (open) loadAvailableServices()
                  }}>
                    <DialogTrigger asChild>
                      <Button className="rounded-xl text-white" style={{ background: "#28B95F" }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un service
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Ajouter un service</DialogTitle>
                        <DialogDescription>
                          Associer un service récurrent ou ponctuel à ce client.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="service">Service</Label>
                          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un service" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableServices.filter(s => !s.alreadyAssigned).map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{service.name}</span>
                                    <span className="text-gray-500">- {formatCurrency(service.unitPriceHt)}</span>
                                    {service.isRecurring && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Récurrent</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="quantity">Quantité</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            step="0.01"
                            value={serviceQuantity}
                            onChange={(e) => setServiceQuantity(parseFloat(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddServiceDialog(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleAddService} disabled={addingService || !selectedServiceId}>
                          {addingService ? "Ajout..." : "Ajouter"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {client.services.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#E8F8EE" }}>
                      <CreditCard className="h-8 w-8" style={{ color: "#28B95F" }} />
                    </div>
                    <p className="font-medium" style={{ color: "#666666" }}>Aucun service associé</p>
                    <p className="text-sm mt-2" style={{ color: "#999999" }}>Cliquez sur "Ajouter un service" pour associer des services à ce client.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Service</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Prix unitaire</TableHead>
                          <TableHead className="text-center">Quantite</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.services.map((cs) => (
                          <TableRow key={cs.id}>
                            <TableCell className="font-medium">{cs.service.name}</TableCell>
                            <TableCell>
                              {cs.service.isRecurring ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  Récurrent
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  Ponctuel
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(cs.customPriceHt || cs.service.unitPriceHt)}
                            </TableCell>
                            <TableCell className="text-center">{cs.quantity}</TableCell>
                            <TableCell>
                              {cs.isActive ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                  Inactif
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteService(cs.service.id)}
                                disabled={deletingService === cs.service.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Domains Tab */}
              <TabsContent value="domains" className="mt-0">
                {client.domains.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FEE2E8" }}>
                      <Globe className="h-8 w-8" style={{ color: "#F04B69" }} />
                    </div>
                    <p className="font-medium" style={{ color: "#666666" }}>Aucun domaine associe</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Domaine</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>Prix renouvellement</TableHead>
                          <TableHead>Auto-renouvellement</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.domains.map((domain) => {
                          const expirationDate = domain.expirationDate ? new Date(domain.expirationDate) : null
                          const today = new Date()
                          const daysUntilExpiration = expirationDate
                            ? Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                            : null
                          const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 30
                          const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0

                          return (
                            <TableRow key={domain.id} className="cursor-pointer" onClick={() => router.push(`/domains/${domain.id}`)}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-blue-500" />
                                  {domain.domain}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isExpired ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Expire
                                    </span>
                                  ) : isExpiringSoon ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {daysUntilExpiration}j
                                    </span>
                                  ) : null}
                                  <span className={isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : ""}>
                                    {domain.expirationDate ? formatDate(domain.expirationDate) : "-"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">
                                {domain.renewalPrice ? formatCurrency(domain.renewalPrice) : "-"}
                              </TableCell>
                              <TableCell>
                                {domain.autoRenew ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Actif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    Inactif
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="rounded-lg">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Tickets Tab */}
              <TabsContent value="tickets" className="mt-0">
                {client.tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FFF0E6" }}>
                      <Ticket className="h-8 w-8" style={{ color: "#F0783C" }} />
                    </div>
                    <p className="font-medium mb-4" style={{ color: "#666666" }}>Aucun ticket</p>
                    <Link href={`/tickets/new?clientId=${client.id}`}>
                      <Button className="rounded-xl text-white" style={{ background: "#F0783C" }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un ticket
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Numéro</TableHead>
                          <TableHead>Sujet</TableHead>
                          <TableHead>Priorité</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.tickets.map((ticket) => (
                          <TableRow key={ticket.id} className="cursor-pointer" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                            <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                ticket.priority === "urgent"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : ticket.priority === "high"
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }`}>
                                {ticket.priority}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                            <TableCell>{getStatusBadge(ticket.status, "ticket")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="rounded-lg">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-0">
                <ClientUsersTab clientId={client.id} clientName={client.companyName} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
