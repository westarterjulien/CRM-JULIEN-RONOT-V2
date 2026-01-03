"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Plus,
  Package,
  Tag,
  Edit,
  Trash2,
  RefreshCw,
  FolderOpen,
  Euro,
  RotateCcw,
  Check,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const unitOptions: SelectOption[] = [
  { value: "unité", label: "Unité" },
  { value: "heure", label: "Heure" },
  { value: "jour", label: "Jour" },
  { value: "mois", label: "Mois" },
  { value: "an", label: "An" },
  { value: "forfait", label: "Forfait" },
]

interface Service {
  id: string
  code: string
  name: string
  description: string | null
  priceHt: number
  vatRate: number
  unit: string
  isActive: boolean
  isRecurring: boolean
  category: {
    id: string
    name: string
    color?: string
  } | null
  usage?: {
    invoices: number
    quotes: number
    subscriptions: number
    clients: number
  }
}

interface Category {
  id: string
  name: string
  slug: string
  color: string
  icon: string | null
  description: string | null
  sortOrder: number
  isActive: boolean
  serviceCount: number
}

interface Pagination {
  page: number
  perPage: number
  total: number
  totalPages: number
}

// Mobile Service Card Component
function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: Service
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="rounded-2xl p-4 transition-all hover:shadow-md"
      style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: service.isActive ? "#0064FA" : "#CCCCCC" }}
          >
            <Package className="h-5 w-5" style={{ color: "#FFFFFF" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate" style={{ color: "#111111" }}>
              {service.name}
            </h3>
            <p className="text-xs" style={{ color: "#999999" }}>
              {service.code}
            </p>
          </div>
        </div>
        {service.isRecurring && (
          <span
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            style={{ background: "#F3E8FF", color: "#5F00BA" }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Récurrent
          </span>
        )}
      </div>

      {service.description && (
        <p className="text-sm mb-3 line-clamp-2" style={{ color: "#666666" }}>
          {service.description}
        </p>
      )}

      {/* Category & Status Row */}
      <div className="flex items-center justify-between mb-3">
        {service.category ? (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${service.category.color}20`,
              color: service.category.color,
            }}
          >
            {service.category.name}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "#999999" }}>
            Non classé
          </span>
        )}
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          style={{
            background: service.isActive ? "#D4EDDA" : "#F5F5F7",
            color: service.isActive ? "#28B95F" : "#666666",
          }}
        >
          {service.isActive ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ background: "#28B95F" }}
              />
              Actif
            </>
          ) : (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ background: "#999999" }}
              />
              Inactif
            </>
          )}
        </span>
      </div>

      {/* Price Info */}
      <div
        className="grid grid-cols-3 gap-2 mb-3 py-2 rounded-xl px-2"
        style={{ background: "#F5F5F7" }}
      >
        <div className="text-center">
          <p className="text-xs" style={{ color: "#999999" }}>
            Prix HT
          </p>
          <p className="font-semibold text-sm" style={{ color: "#111111" }}>
            {formatCurrency(service.priceHt)}
          </p>
        </div>
        <div
          className="text-center"
          style={{ borderLeft: "1px solid #EEEEEE", borderRight: "1px solid #EEEEEE" }}
        >
          <p className="text-xs" style={{ color: "#999999" }}>
            TVA
          </p>
          <p className="font-semibold text-sm" style={{ color: "#111111" }}>
            {service.vatRate}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: "#999999" }}>
            Unité
          </p>
          <p className="font-semibold text-sm" style={{ color: "#111111" }}>
            {service.unit}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
          style={{ background: "#E3F2FD", color: "#0064FA" }}
        >
          <Edit className="h-4 w-4" />
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="py-2 px-3 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "#FEE2E8", color: "#F04B69" }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    perPage: 15,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [activeTab, setActiveTab] = useState<"services" | "categories">("services")

  // Dialog states
  const [showServiceDialog, setShowServiceDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingItem, setDeletingItem] = useState<{
    type: "service" | "category"
    id: string
    name: string
  } | null>(null)

  // Form states
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    priceHt: "",
    vatRate: "20",
    unit: "unité",
    categoryId: "",
    isActive: true,
    isRecurring: false,
  })

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: "#0064FA",
    icon: "",
    description: "",
    sortOrder: "0",
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/services/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }, [])

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        perPage: pagination.perPage.toString(),
      })
      if (search) params.set("search", search)
      if (selectedCategory) params.set("categoryId", selectedCategory)
      if (showInactive) params.set("includeInactive", "true")

      const res = await fetch(`/api/services?${params}`)
      if (res.ok) {
        const data = await res.json()
        setServices(data.services)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Error fetching services:", error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.perPage, search, selectedCategory, showInactive])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchServices()
  }

  const openServiceDialog = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setServiceForm({
        name: service.name,
        description: service.description || "",
        priceHt: service.priceHt.toString(),
        vatRate: service.vatRate.toString(),
        unit: service.unit,
        categoryId: service.category?.id || "",
        isActive: service.isActive,
        isRecurring: service.isRecurring,
      })
    } else {
      setEditingService(null)
      setServiceForm({
        name: "",
        description: "",
        priceHt: "",
        vatRate: "20",
        unit: "unité",
        categoryId: "",
        isActive: true,
        isRecurring: false,
      })
    }
    setShowServiceDialog(true)
  }

  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        color: category.color,
        icon: category.icon || "",
        description: category.description || "",
        sortOrder: category.sortOrder.toString(),
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({
        name: "",
        color: "#0064FA",
        icon: "",
        description: "",
        sortOrder: "0",
      })
    }
    setShowCategoryDialog(true)
  }

  const saveService = async () => {
    if (!serviceForm.name || !serviceForm.priceHt) return

    setSaving(true)
    try {
      const url = editingService
        ? `/api/services/${editingService.id}`
        : "/api/services"
      const method = editingService ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceForm.name,
          description: serviceForm.description || null,
          priceHt: parseFloat(serviceForm.priceHt),
          vatRate: parseFloat(serviceForm.vatRate),
          unit: serviceForm.unit,
          categoryId: serviceForm.categoryId || null,
          isActive: serviceForm.isActive,
          isRecurring: serviceForm.isRecurring,
        }),
      })

      if (res.ok) {
        setShowServiceDialog(false)
        fetchServices()
      }
    } catch (error) {
      console.error("Error saving service:", error)
    } finally {
      setSaving(false)
    }
  }

  const saveCategory = async () => {
    if (!categoryForm.name) return

    setSaving(true)
    try {
      const url = editingCategory
        ? `/api/services/categories/${editingCategory.id}`
        : "/api/services/categories"
      const method = editingCategory ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryForm.name,
          color: categoryForm.color,
          icon: categoryForm.icon || null,
          description: categoryForm.description || null,
          sortOrder: parseInt(categoryForm.sortOrder) || 0,
        }),
      })

      if (res.ok) {
        setShowCategoryDialog(false)
        fetchCategories()
      }
    } catch (error) {
      console.error("Error saving category:", error)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (
    type: "service" | "category",
    id: string,
    name: string
  ) => {
    setDeletingItem({ type, id, name })
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    setDeleting(true)
    try {
      const url =
        deletingItem.type === "service"
          ? `/api/services/${deletingItem.id}`
          : `/api/services/categories/${deletingItem.id}`

      const res = await fetch(url, { method: "DELETE" })

      if (res.ok) {
        setShowDeleteDialog(false)
        setDeletingItem(null)
        if (deletingItem.type === "service") {
          fetchServices()
        } else {
          fetchCategories()
        }
      }
    } catch (error) {
      console.error("Error deleting:", error)
    } finally {
      setDeleting(false)
    }
  }

  // Stats
  const activeServices = services.filter((s) => s.isActive).length
  const recurringServices = services.filter((s) => s.isRecurring).length

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const { page, totalPages } = pagination

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages)
      }
    }

    return pages
  }

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
              style={{ background: "#0064FA" }}
            >
              <Package className="h-7 w-7" style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
                Catalogue de Services
              </h1>
              <p className="text-sm" style={{ color: "#999999" }}>
                Gérez vos services et catégories
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openCategoryDialog()}
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              style={{ background: "#F3E8FF", color: "#5F00BA" }}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle</span> Catégorie
            </button>
            <button
              onClick={() => openServiceDialog()}
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau</span> Service
            </button>
          </div>
        </div>
      </div>

      {/* Categories Badges Section */}
      {categories.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div
            className="px-5 py-3 flex items-center gap-2"
            style={{ background: "#F5F5F7", borderBottom: "1px solid #EEEEEE" }}
          >
            <Tag className="w-4 h-4" style={{ color: "#5F00BA" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#444444" }}>
              Catégories de Services
            </h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedCategory("")
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: selectedCategory === "" ? "#111111" : "#F5F5F7",
                  color: selectedCategory === "" ? "#FFFFFF" : "#666666",
                }}
              >
                Tous
                <span
                  className="ml-2 text-xs rounded-full px-2 py-0.5"
                  style={{
                    background: selectedCategory === "" ? "rgba(255,255,255,0.2)" : "#EEEEEE",
                  }}
                >
                  {pagination.total}
                </span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat.id ? "" : cat.id)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor:
                      selectedCategory === cat.id ? cat.color : `${cat.color}20`,
                    color: selectedCategory === cat.id ? "white" : cat.color,
                  }}
                >
                  {cat.name}
                  <span
                    className="ml-2 text-xs rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor:
                        selectedCategory === cat.id ? "rgba(255,255,255,0.2)" : "white",
                    }}
                  >
                    {cat.serviceCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="rounded-xl p-1 inline-flex"
        style={{ background: "#F5F5F7" }}
      >
        <button
          onClick={() => setActiveTab("services")}
          className="px-5 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
          style={{
            background: activeTab === "services" ? "#FFFFFF" : "transparent",
            color: activeTab === "services" ? "#0064FA" : "#666666",
            boxShadow: activeTab === "services" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Package className="h-4 w-4" />
          Services ({pagination.total})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className="px-5 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
          style={{
            background: activeTab === "categories" ? "#FFFFFF" : "transparent",
            color: activeTab === "categories" ? "#5F00BA" : "#666666",
            boxShadow: activeTab === "categories" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Tag className="h-4 w-4" />
          Catégories ({categories.length})
        </button>
      </div>

      {activeTab === "services" ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#E3F2FD" }}
                >
                  <Package className="h-6 w-6" style={{ color: "#0064FA" }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                    {pagination.total}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                    Total Services
                  </p>
                </div>
              </div>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#D4EDDA" }}
                >
                  <Check className="h-6 w-6" style={{ color: "#28B95F" }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                    {activeServices}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                    Actifs
                  </p>
                </div>
              </div>
            </div>
            <div
              className="col-span-2 lg:col-span-1 rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#F3E8FF" }}
                >
                  <RotateCcw className="h-6 w-6" style={{ color: "#5F00BA" }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                    {recurringServices}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#999999" }}>
                    Récurrents
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
                  style={{ color: "#999999" }}
                />
                <input
                  type="text"
                  placeholder="Rechercher un service..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #EEEEEE",
                    color: "#111111",
                  }}
                />
              </div>
            </form>
            <div className="flex gap-2">
              <div className="w-48">
                <StyledSelect
                  value={selectedCategory}
                  onChange={(v) => {
                    setSelectedCategory(v)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  options={[
                    { value: "", label: "Toutes catégories" },
                    ...categories.map((cat) => ({
                      value: cat.id,
                      label: cat.name,
                      color: cat.color,
                    })),
                  ]}
                  placeholder="Toutes catégories"
                />
              </div>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="px-4 py-3 rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
                style={{
                  background: showInactive ? "#F0783C" : "#FFFFFF",
                  color: showInactive ? "#FFFFFF" : "#666666",
                  border: showInactive ? "none" : "1px solid #EEEEEE",
                }}
              >
                {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="hidden lg:inline">
                  {showInactive ? "Masquer" : "Voir"} inactifs
                </span>
              </button>
              <button
                onClick={() => fetchServices()}
                className="p-3 rounded-xl transition-all"
                style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
              >
                <RefreshCw className="h-5 w-5" style={{ color: "#666666" }} />
              </button>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="lg:hidden space-y-3">
            {loading ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="animate-spin h-8 w-8 border-4 rounded-full mx-auto"
                  style={{ borderColor: "#EEEEEE", borderTopColor: "#0064FA" }}
                />
                <p className="mt-4" style={{ color: "#999999" }}>
                  Chargement...
                </p>
              </div>
            ) : services.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#F5F5F7" }}
                >
                  <Package className="h-8 w-8" style={{ color: "#CCCCCC" }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
                  Aucun service trouvé
                </h3>
                <p className="mb-4" style={{ color: "#999999" }}>
                  Commencez par créer votre premier service
                </p>
                <button
                  onClick={() => openServiceDialog()}
                  className="px-4 py-2 rounded-xl font-medium"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  Créer un service
                </button>
              </div>
            ) : (
              services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={() => openServiceDialog(service)}
                  onDelete={() => confirmDelete("service", service.id, service.name)}
                />
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div
            className="hidden lg:block rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {loading ? (
              <div className="p-8 text-center">
                <div
                  className="animate-spin h-8 w-8 border-4 rounded-full mx-auto"
                  style={{ borderColor: "#EEEEEE", borderTopColor: "#0064FA" }}
                />
                <p className="mt-4" style={{ color: "#999999" }}>
                  Chargement...
                </p>
              </div>
            ) : services.length === 0 ? (
              <div className="p-12 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#F5F5F7" }}
                >
                  <Package className="h-8 w-8" style={{ color: "#CCCCCC" }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
                  Aucun service trouvé
                </h3>
                <p className="mb-6" style={{ color: "#999999" }}>
                  Commencez par créer votre premier service
                </p>
                <button
                  onClick={() => openServiceDialog()}
                  className="px-6 py-3 rounded-xl font-medium"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  Créer un service
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead style={{ background: "#F5F5F7" }}>
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      Service
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      Catégorie
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      Prix HT
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      TVA
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      Unité
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      Type
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      Statut
                    </th>
                    <th
                      className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#666666" }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, idx) => (
                    <tr
                      key={service.id}
                      className="transition-colors hover:bg-[#F5F5F7]"
                      style={{ borderBottom: idx < services.length - 1 ? "1px solid #EEEEEE" : "none" }}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium" style={{ color: "#111111" }}>
                            {service.name}
                          </p>
                          <p className="text-sm" style={{ color: "#999999" }}>
                            {service.code}
                          </p>
                          {service.description && (
                            <p
                              className="text-sm truncate max-w-xs"
                              style={{ color: "#AEAEAE" }}
                            >
                              {service.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {service.category ? (
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${service.category.color}20`,
                              color: service.category.color,
                            }}
                          >
                            {service.category.name}
                          </span>
                        ) : (
                          <span className="text-sm italic" style={{ color: "#CCCCCC" }}>
                            Non classé
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold" style={{ color: "#111111" }}>
                          {formatCurrency(service.priceHt)}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ color: "#666666" }}>
                        {service.vatRate}%
                      </td>
                      <td className="px-6 py-4" style={{ color: "#666666" }}>
                        {service.unit}
                      </td>
                      <td className="px-6 py-4">
                        {service.isRecurring ? (
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#F3E8FF", color: "#5F00BA" }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Récurrent
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: "#999999" }}>
                            Ponctuel
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: service.isActive ? "#D4EDDA" : "#F5F5F7",
                            color: service.isActive ? "#28B95F" : "#666666",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full mr-1.5"
                            style={{ background: service.isActive ? "#28B95F" : "#999999" }}
                          />
                          {service.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openServiceDialog(service)}
                            className="p-2 rounded-lg transition-colors hover:bg-[#E3F2FD]"
                            style={{ color: "#666666" }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete("service", service.id, service.name)}
                            className="p-2 rounded-lg transition-colors hover:bg-[#FEE2E8]"
                            style={{ color: "#666666" }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderTop: "1px solid #EEEEEE" }}
              >
                <p className="text-sm" style={{ color: "#999999" }}>
                  Affichage de{" "}
                  <span className="font-medium" style={{ color: "#444444" }}>
                    {(pagination.page - 1) * pagination.perPage + 1}
                  </span>{" "}
                  à{" "}
                  <span className="font-medium" style={{ color: "#444444" }}>
                    {Math.min(pagination.page * pagination.perPage, pagination.total)}
                  </span>{" "}
                  sur{" "}
                  <span className="font-medium" style={{ color: "#444444" }}>
                    {pagination.total}
                  </span>{" "}
                  services
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: "#666666" }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {getPageNumbers().map((pageNum, idx) =>
                    pageNum === "..." ? (
                      <span key={`dots-${idx}`} className="px-2" style={{ color: "#999999" }}>
                        ...
                      </span>
                    ) : (
                      <button
                        key={pageNum}
                        onClick={() => setPagination((prev) => ({ ...prev, page: pageNum as number }))}
                        className="w-9 h-9 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          background: pagination.page === pageNum ? "#0064FA" : "transparent",
                          color: pagination.page === pageNum ? "#FFFFFF" : "#666666",
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: "#666666" }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Pagination */}
          {pagination.totalPages > 1 && (
            <div
              className="lg:hidden flex items-center justify-between rounded-2xl p-4"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#F5F5F7" }}
              >
                <ChevronLeft className="h-5 w-5" style={{ color: "#666666" }} />
              </button>
              <span className="text-sm" style={{ color: "#666666" }}>
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#F5F5F7" }}
              >
                <ChevronRight className="h-5 w-5" style={{ color: "#666666" }} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Categories Tab */
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
            <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
              Liste des Catégories
            </h3>
            <p className="text-sm" style={{ color: "#999999" }}>
              Organisez vos services par catégorie
            </p>
          </div>
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "#F3E8FF" }}
              >
                <Tag className="h-8 w-8" style={{ color: "#5F00BA" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
                Aucune catégorie créée
              </h3>
              <p className="mb-6" style={{ color: "#999999" }}>
                Créez des catégories pour organiser vos services
              </p>
              <button
                onClick={() => openCategoryDialog()}
                className="px-6 py-3 rounded-xl font-medium"
                style={{ background: "#5F00BA", color: "#FFFFFF" }}
              >
                Créer une catégorie
              </button>
            </div>
          ) : (
            <>
              {/* Mobile Categories */}
              <div className="lg:hidden p-4 space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-xl p-4"
                    style={{ background: "#F5F5F7" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: category.color + "30" }}
                        >
                          <Tag className="h-5 w-5" style={{ color: category.color }} />
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: "#111111" }}>
                            {category.name}
                          </p>
                          <p className="text-xs" style={{ color: "#999999" }}>
                            {category.slug}
                          </p>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                        }}
                      >
                        {category.serviceCount} services
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm mb-3" style={{ color: "#666666" }}>
                        {category.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openCategoryDialog(category)}
                        className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
                        style={{ background: "#E3F2FD", color: "#0064FA" }}
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                      <button
                        onClick={() => confirmDelete("category", category.id, category.name)}
                        disabled={category.serviceCount > 0}
                        className="py-2 px-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "#FEE2E8", color: "#F04B69" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Categories Table */}
              <div className="hidden lg:block">
                <table className="w-full">
                  <thead style={{ background: "#F5F5F7" }}>
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Catégorie
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Couleur
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Description
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Ordre
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Services
                      </th>
                      <th
                        className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, idx) => (
                      <tr
                        key={category.id}
                        className="transition-colors hover:bg-[#F5F5F7]"
                        style={{ borderBottom: idx < categories.length - 1 ? "1px solid #EEEEEE" : "none" }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: category.color + "30" }}
                            >
                              <Tag className="h-5 w-5" style={{ color: category.color }} />
                            </div>
                            <div>
                              <p className="font-medium" style={{ color: "#111111" }}>
                                {category.name}
                              </p>
                              <p className="text-sm" style={{ color: "#999999" }}>
                                {category.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg"
                              style={{
                                backgroundColor: category.color,
                                border: "1px solid #EEEEEE",
                              }}
                            />
                            <span className="text-sm font-mono" style={{ color: "#666666" }}>
                              {category.color}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate" style={{ color: "#666666" }}>
                          {category.description || (
                            <span className="italic" style={{ color: "#CCCCCC" }}>
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4" style={{ color: "#666666" }}>
                          {category.sortOrder}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                            }}
                          >
                            {category.serviceCount} services
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openCategoryDialog(category)}
                              className="p-2 rounded-lg transition-colors hover:bg-[#E3F2FD]"
                              style={{ color: "#666666" }}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => confirmDelete("category", category.id, category.name)}
                              className="p-2 rounded-lg transition-colors hover:bg-[#FEE2E8] disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ color: "#666666" }}
                              disabled={category.serviceCount > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Service Dialog */}
      {showServiceDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowServiceDialog(false)}
            />
            <div
              className="relative rounded-2xl shadow-xl max-w-lg w-full p-6"
              style={{ background: "#FFFFFF" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#0064FA" }}
                >
                  <Package className="h-6 w-6" style={{ color: "#FFFFFF" }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#111111" }}>
                    {editingService ? "Modifier le service" : "Nouveau service"}
                  </h3>
                  <p className="text-sm" style={{ color: "#999999" }}>
                    {editingService
                      ? "Modifiez les informations du service"
                      : "Créez un nouveau service"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#444444" }}
                  >
                    Nom du service *
                  </label>
                  <input
                    type="text"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Ex: Développement Web"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #EEEEEE",
                      color: "#111111",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#444444" }}
                  >
                    Description
                  </label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, description: e.target.value })
                    }
                    placeholder="Description du service..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #EEEEEE",
                      color: "#111111",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#444444" }}
                    >
                      Prix HT *
                    </label>
                    <div className="relative">
                      <Euro
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5"
                        style={{ color: "#999999" }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={serviceForm.priceHt}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, priceHt: e.target.value })
                        }
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #EEEEEE",
                          color: "#111111",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#444444" }}
                    >
                      Taux TVA (%)
                    </label>
                    <input
                      type="number"
                      value={serviceForm.vatRate}
                      onChange={(e) =>
                        setServiceForm({ ...serviceForm, vatRate: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #EEEEEE",
                        color: "#111111",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#444444" }}
                    >
                      Unité
                    </label>
                    <StyledSelect
                      value={serviceForm.unit}
                      onChange={(v) =>
                        setServiceForm({ ...serviceForm, unit: v })
                      }
                      options={unitOptions}
                      placeholder="Unité"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#444444" }}
                    >
                      Catégorie
                    </label>
                    <StyledSelect
                      value={serviceForm.categoryId}
                      onChange={(v) =>
                        setServiceForm({ ...serviceForm, categoryId: v })
                      }
                      options={[
                        { value: "", label: "Sans catégorie" },
                        ...categories.map((cat) => ({
                          value: cat.id,
                          label: cat.name,
                          color: cat.color,
                        })),
                      ]}
                      placeholder="Sans catégorie"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={serviceForm.isActive}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, isActive: e.target.checked })
                        }
                        className="sr-only"
                      />
                      <div
                        className="w-10 h-6 rounded-full transition-colors"
                        style={{
                          background: serviceForm.isActive ? "#28B95F" : "#CCCCCC",
                        }}
                      >
                        <div
                          className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5"
                          style={{
                            transform: serviceForm.isActive
                              ? "translateX(18px)"
                              : "translateX(2px)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium" style={{ color: "#444444" }}>
                      Actif
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={serviceForm.isRecurring}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, isRecurring: e.target.checked })
                        }
                        className="sr-only"
                      />
                      <div
                        className="w-10 h-6 rounded-full transition-colors"
                        style={{
                          background: serviceForm.isRecurring ? "#5F00BA" : "#CCCCCC",
                        }}
                      >
                        <div
                          className="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5"
                          style={{
                            transform: serviceForm.isRecurring
                              ? "translateX(18px)"
                              : "translateX(2px)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium" style={{ color: "#444444" }}>
                      Récurrent
                    </span>
                  </label>
                </div>
              </div>

              <div
                className="flex gap-3 mt-6 pt-4"
                style={{ borderTop: "1px solid #EEEEEE" }}
              >
                <button
                  onClick={() => setShowServiceDialog(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  onClick={saveService}
                  disabled={saving || !serviceForm.name || !serviceForm.priceHt}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Dialog */}
      {showCategoryDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowCategoryDialog(false)}
            />
            <div
              className="relative rounded-2xl shadow-xl max-w-md w-full p-6"
              style={{ background: "#FFFFFF" }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#5F00BA" }}
                >
                  <Tag className="h-6 w-6" style={{ color: "#FFFFFF" }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#111111" }}>
                    {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
                  </h3>
                  <p className="text-sm" style={{ color: "#999999" }}>
                    {editingCategory
                      ? "Modifiez les informations"
                      : "Créez une nouvelle catégorie"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#444444" }}
                  >
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, name: e.target.value })
                    }
                    placeholder="Ex: Développement"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #EEEEEE",
                      color: "#111111",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#444444" }}
                  >
                    Description
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, description: e.target.value })
                    }
                    placeholder="Description de la catégorie..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #EEEEEE",
                      color: "#111111",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#444444" }}
                    >
                      Couleur
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, color: e.target.value })
                        }
                        className="w-12 h-12 rounded-xl cursor-pointer"
                        style={{ border: "1px solid #EEEEEE" }}
                      />
                      <span className="text-sm font-mono" style={{ color: "#666666" }}>
                        {categoryForm.color}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: "#444444" }}
                    >
                      Ordre d'affichage
                    </label>
                    <input
                      type="number"
                      value={categoryForm.sortOrder}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, sortOrder: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #EEEEEE",
                        color: "#111111",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="flex gap-3 mt-6 pt-4"
                style={{ borderTop: "1px solid #EEEEEE" }}
              >
                <button
                  onClick={() => setShowCategoryDialog(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  onClick={saveCategory}
                  disabled={saving || !categoryForm.name}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#5F00BA", color: "#FFFFFF" }}
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deletingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0"
              style={{ background: "rgba(0,0,0,0.4)" }}
              onClick={() => setShowDeleteDialog(false)}
            />
            <div
              className="relative rounded-2xl shadow-xl max-w-md w-full p-6"
              style={{ background: "#FFFFFF" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#FEE2E8" }}
                >
                  <AlertTriangle className="h-6 w-6" style={{ color: "#F04B69" }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: "#111111" }}>
                    Confirmer la suppression
                  </h3>
                </div>
              </div>
              <p className="mb-4" style={{ color: "#666666" }}>
                Êtes-vous sûr de vouloir supprimer{" "}
                {deletingItem.type === "service" ? "le service" : "la catégorie"}{" "}
                <strong style={{ color: "#111111" }}>{deletingItem.name}</strong> ?
              </p>
              {deletingItem.type === "service" && (
                <div
                  className="p-3 rounded-xl mb-4"
                  style={{ background: "#FEF3CD" }}
                >
                  <p className="text-sm" style={{ color: "#F0783C" }}>
                    <strong>Note :</strong> Si ce service est utilisé dans des factures,
                    devis ou abonnements, il sera désactivé au lieu d'être supprimé.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                  style={{ background: "#F04B69", color: "#FFFFFF" }}
                >
                  {deleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
