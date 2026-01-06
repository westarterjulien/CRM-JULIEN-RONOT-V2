"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, Pencil, FileText, Receipt, RefreshCw, Ticket,
  Mail, Phone, MapPin, Globe, Building2, CreditCard, TrendingUp,
  Plus, Eye, ExternalLink, Euro, Clock, CheckCircle, AlertTriangle, Server, Trash2,
  Users, StickyNote, Kanban, ChevronDown, ChevronRight, Info
} from "lucide-react"
import { ClientUsersTab } from "@/components/clients/client-users-tab"
import { ClientEmailsTab } from "@/components/clients/ClientEmailsTab"
import { NoteEntityTab } from "@/components/notes"
import { formatCurrency, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

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
    projects: Array<{
      id: string
      name: string
      description: string | null
      color: string
      isArchived: boolean
      createdAt: string
      updatedAt: string
      columns: Array<{
        id: string
        name: string
        cards: Array<{ id: string; isCompleted: boolean }>
      }>
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
  const [activeSection, setActiveSection] = useState("invoices")
  const [showClientInfo, setShowClientInfo] = useState(false)

  // Project creation modal states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [newProjectColor, setNewProjectColor] = useState("#6366F1")
  const [creatingProject, setCreatingProject] = useState(false)

  const projectColors = [
    "#0064FA", "#5F00BA", "#F0783C", "#2E7D32", "#C2185B",
    "#00838F", "#F9A825", "#5D4037", "#6B7280",
  ]

  const createProject = async () => {
    if (!newProjectName.trim() || !data?.client) return

    setCreatingProject(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
          color: newProjectColor,
          clientId: data.client.id,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setShowCreateProjectModal(false)
        setNewProjectName("")
        setNewProjectDescription("")
        setNewProjectColor("#6366F1")
        router.push(`/projects/${result.id}`)
      } else {
        alert(`Erreur: ${result.error || "Impossible de créer le projet"}`)
      }
    } catch (error) {
      console.error("Error creating project:", error)
      alert("Erreur de connexion au serveur")
    } finally {
      setCreatingProject(false)
    }
  }

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

      {/* Collapsible Client Info Banner */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <button
          onClick={() => setShowClientInfo(!showClientInfo)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E6F0FF" }}>
              <Info className="h-4 w-4" style={{ color: "#0064FA" }} />
            </div>
            <span className="font-medium" style={{ color: "#111111" }}>Informations client</span>
            {!showClientInfo && (
              <div className="hidden sm:flex items-center gap-4 ml-4 text-sm" style={{ color: "#666666" }}>
                {client.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </span>
                )}
                {client.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {client.city}
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown
            className={cn("h-5 w-5 transition-transform", showClientInfo && "rotate-180")}
            style={{ color: "#999999" }}
          />
        </button>

        {showClientInfo && (
          <div className="p-4 pt-0 border-t" style={{ borderColor: "#EEEEEE" }}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
              {client.email && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E6F0FF" }}>
                    <Mail className="h-4 w-4" style={{ color: "#0064FA" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "#999999" }}>Email</p>
                    <a href={`mailto:${client.email}`} className="text-sm font-medium hover:underline truncate block" style={{ color: "#0064FA" }}>
                      {client.email}
                    </a>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E8F8EE" }}>
                    <Phone className="h-4 w-4" style={{ color: "#28B95F" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "#999999" }}>Téléphone</p>
                    <a href={`tel:${client.phone}`} className="text-sm font-medium hover:underline" style={{ color: "#111111" }}>
                      {client.phone}
                    </a>
                  </div>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#FFF9E6" }}>
                    <MapPin className="h-4 w-4" style={{ color: "#DCB40A" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "#999999" }}>Adresse</p>
                    <p className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                      {client.postalCode} {client.city}
                    </p>
                  </div>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#F3E8FF" }}>
                    <Globe className="h-4 w-4" style={{ color: "#5F00BA" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "#999999" }}>Site web</p>
                    <a
                      href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline flex items-center gap-1 truncate"
                      style={{ color: "#5F00BA" }}
                    >
                      {client.website}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
              {client.vatNumber && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EEEEEE" }}>
                    <CreditCard className="h-4 w-4" style={{ color: "#666666" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "#999999" }}>N° TVA</p>
                    <p className="text-sm font-medium" style={{ color: "#111111" }}>{client.vatNumber}</p>
                  </div>
                </div>
              )}
              {client.siret && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F5F5F7" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EEEEEE" }}>
                    <Building2 className="h-4 w-4" style={{ color: "#666666" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: "#999999" }}>SIRET</p>
                    <p className="text-sm font-medium" style={{ color: "#111111" }}>{client.siret}</p>
                  </div>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: "#FFF9E6", border: "1px solid #F5E6A3" }}>
                <p className="text-xs font-medium mb-1" style={{ color: "#DCB40A" }}>Notes</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "#666666" }}>{client.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="rounded-2xl p-3 sticky top-6" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <nav className="space-y-1">
              {[
                { id: "invoices", label: "Factures", icon: FileText, count: client.invoices.length, color: "#0064FA", bg: "#E6F0FF" },
                { id: "quotes", label: "Devis", icon: Receipt, count: client.quotes.length, color: "#DCB40A", bg: "#FFF9E6" },
                { id: "subscriptions", label: "Abonnements", icon: RefreshCw, count: client.subscriptions.length, color: "#5F00BA", bg: "#F3E8FF" },
                { id: "services", label: "Services", icon: CreditCard, count: client.services.length, color: "#28B95F", bg: "#E8F8EE" },
                { id: "domains", label: "Domaines", icon: Globe, count: client.domains.length, color: "#F04B69", bg: "#FEE2E8" },
                { id: "tickets", label: "Tickets", icon: Ticket, count: client.tickets.length, color: "#F0783C", bg: "#FFF0E6" },
                { id: "projects", label: "Projets", icon: Kanban, count: client.projects?.length || 0, color: "#5F00BA", bg: "#F3E8FF" },
                { id: "emails", label: "Emails", icon: Mail, count: null, color: "#0064FA", bg: "#E6F0FF" },
                { id: "users", label: "Utilisateurs", icon: Users, count: null, color: "#666666", bg: "#F5F5F7" },
                { id: "notes", label: "Notes", icon: StickyNote, count: null, color: "#666666", bg: "#F5F5F7" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                    activeSection === item.id
                      ? "shadow-sm"
                      : "hover:bg-gray-50"
                  )}
                  style={{
                    background: activeSection === item.id ? item.bg : "transparent",
                  }}
                >
                  <item.icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: activeSection === item.id ? item.color : "#999999" }}
                  />
                  <span
                    className="text-sm font-medium flex-1"
                    style={{ color: activeSection === item.id ? item.color : "#666666" }}
                  >
                    {item.label}
                  </span>
                  {item.count !== null && item.count > 0 && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: activeSection === item.id ? `${item.color}20` : "#EEEEEE",
                        color: activeSection === item.id ? item.color : "#999999"
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile Section Selector */}
        <div className="lg:hidden w-full">
          <Select value={activeSection} onValueChange={setActiveSection}>
            <SelectTrigger className="rounded-xl mb-4" style={{ background: "#FFFFFF" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoices">Factures ({client.invoices.length})</SelectItem>
              <SelectItem value="quotes">Devis ({client.quotes.length})</SelectItem>
              <SelectItem value="subscriptions">Abonnements ({client.subscriptions.length})</SelectItem>
              <SelectItem value="services">Services ({client.services.length})</SelectItem>
              <SelectItem value="domains">Domaines ({client.domains.length})</SelectItem>
              <SelectItem value="tickets">Tickets ({client.tickets.length})</SelectItem>
              <SelectItem value="projects">Projets ({client.projects?.length || 0})</SelectItem>
              <SelectItem value="emails">Emails</SelectItem>
              <SelectItem value="users">Utilisateurs</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl p-4 lg:p-6" style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            {/* Invoices */}
            {activeSection === "invoices" && (
              client.invoices.length === 0 ? (
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
              )
            )}

            {/* Quotes */}
            {activeSection === "quotes" && (
              client.quotes.length === 0 ? (
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
              )
            )}

            {/* Subscriptions */}
            {activeSection === "subscriptions" && (
              client.subscriptions.length === 0 ? (
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
              )
            )}

            {/* Services */}
            {activeSection === "services" && (
              <>
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
                          <TableHead className="text-center">Quantité</TableHead>
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
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Récurrent
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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
              </>
            )}

            {/* Domains */}
            {activeSection === "domains" && (
              client.domains.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FEE2E8" }}>
                    <Globe className="h-8 w-8" style={{ color: "#F04B69" }} />
                  </div>
                  <p className="font-medium" style={{ color: "#666666" }}>Aucun domaine associé</p>
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
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Expiré
                                  </span>
                                ) : isExpiringSoon ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
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
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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
              )
            )}

            {/* Tickets */}
            {activeSection === "tickets" && (
              client.tickets.length === 0 ? (
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
                                ? "bg-red-100 text-red-800"
                                : ticket.priority === "high"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-600"
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
              )
            )}

            {/* Projects */}
            {activeSection === "projects" && (
              (!client.projects || client.projects.length === 0) ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F3E8FF" }}>
                    <Kanban className="h-8 w-8" style={{ color: "#5F00BA" }} />
                  </div>
                  <p className="font-medium mb-4" style={{ color: "#666666" }}>Aucun projet</p>
                  <Button
                    onClick={() => setShowCreateProjectModal(true)}
                    className="rounded-xl text-white"
                    style={{ background: "#5F00BA" }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un projet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setShowCreateProjectModal(true)}
                      className="rounded-xl text-white"
                      style={{ background: "#5F00BA" }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau projet
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {client.projects.map((project) => {
                      const totalCards = project.columns.reduce((acc, col) => acc + col.cards.length, 0)
                      const completedCards = project.columns.reduce(
                        (acc, col) => acc + col.cards.filter(c => c.isCompleted).length, 0
                      )
                      const progress = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="block rounded-xl p-4 transition-all hover:shadow-md"
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #EEEEEE",
                            borderLeft: `4px solid ${project.color || '#5F00BA'}`
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold truncate" style={{ color: "#111111" }}>
                                  {project.name}
                                </h4>
                                {project.isArchived && (
                                  <span
                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                    style={{ background: "#F5F5F7", color: "#999999" }}
                                  >
                                    Archivé
                                  </span>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm mt-1 line-clamp-2" style={{ color: "#666666" }}>
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: `${project.color || '#5F00BA'}20` }}
                            >
                              <Kanban className="w-5 h-5" style={{ color: project.color || '#5F00BA' }} />
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span style={{ color: "#999999" }}>
                                {completedCards}/{totalCards} tâches
                              </span>
                              <span style={{ color: project.color || '#5F00BA' }} className="font-medium">
                                {progress}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#EEEEEE" }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, background: project.color || '#5F00BA' }}
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs" style={{ color: "#999999" }}>
                              {project.columns.length} colonnes
                            </span>
                            <span className="text-xs" style={{ color: "#999999" }}>
                              Mis à jour le {formatDate(project.updatedAt)}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            )}

            {/* Emails */}
            {activeSection === "emails" && (
              <ClientEmailsTab clientId={client.id} />
            )}

            {/* Users */}
            {activeSection === "users" && (
              <ClientUsersTab clientId={client.id} clientName={client.companyName} />
            )}

            {/* Notes */}
            {activeSection === "notes" && (
              <NoteEntityTab entityType="client" entityId={client.id} />
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowCreateProjectModal(false)}
          />
          <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg">
            <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Nouveau projet pour {client.companyName}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du projet *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Mon projet"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#5F00BA] focus:border-transparent outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Description du projet..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#5F00BA] focus:border-transparent outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {projectColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewProjectColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newProjectColor === color
                            ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={createProject}
                  disabled={creatingProject || !newProjectName.trim()}
                  className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#5F00BA" }}
                >
                  {creatingProject ? "Création..." : "Créer le projet"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
