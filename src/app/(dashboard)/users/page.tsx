"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  UserCog,
  UserCheck,
  UserX,
  ShieldCheck,
  Shield,
  Mail,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { StyledSelect, SelectOption, activeStatusOptions } from "@/components/ui/styled-select"

const userRoleOptions: SelectOption[] = [
  { value: "all", label: "Tous les rôles" },
  { value: "super_admin", label: "Super Admin", color: "#DC2626" },
  { value: "tenant_owner", label: "Propriétaire", color: "#7C3AED" },
  { value: "tenant_admin", label: "Admin", color: "#7C3AED" },
  { value: "tenant_user", label: "Utilisateur", color: "#2563EB" },
]

const userRoleFormOptions: SelectOption[] = [
  { value: "tenant_user", label: "Utilisateur", color: "#2563EB" },
  { value: "tenant_admin", label: "Admin", color: "#7C3AED" },
  { value: "tenant_owner", label: "Propriétaire", color: "#7C3AED" },
]

interface UserType {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  phone: string | null
  avatar: string | null
  slackUserId: string | null
  lastLoginAt: string | null
  createdAt: string
}

interface Stats {
  total: number
  active: number
  inactive: number
  admins: number
}

const roleConfig = {
  super_admin: { label: "Super Admin", bg: "#FEE2E2", color: "#DC2626", icon: ShieldCheck },
  tenant_owner: { label: "Propriétaire", bg: "#F3E8FF", color: "#7C3AED", icon: ShieldCheck },
  tenant_admin: { label: "Admin", bg: "#F3E8FF", color: "#7C3AED", icon: ShieldCheck },
  tenant_user: { label: "Utilisateur", bg: "#DBEAFE", color: "#2563EB", icon: Shield },
}

function getRoleBadge(role: string) {
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.tenant_user
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

function getStatusBadge(isActive: boolean) {
  if (isActive) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{ background: "#D4EDDA", color: "#28B95F" }}
      >
        <UserCheck className="w-3 h-3" />
        Actif
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: "#FEE2E2", color: "#DC2626" }}
    >
      <UserX className="w-3 h-3" />
      Inactif
    </span>
  )
}

function formatDate(date: string | null) {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, admins: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const [showDialog, setShowDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserType | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "tenant_user",
    phone: "",
    slackUserId: "",
    isActive: true,
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (roleFilter !== "all") params.set("role", roleFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)

        // Calculate stats
        const total = data.length
        const active = data.filter((u: UserType) => u.isActive).length
        const inactive = total - active
        const admins = data.filter((u: UserType) =>
          ["super_admin", "tenant_owner", "tenant_admin"].includes(u.role)
        ).length
        setStats({ total, active, inactive, admins })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openDialog = (user?: UserType) => {
    if (user) {
      setEditingUser(user)
      setForm({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        phone: user.phone || "",
        slackUserId: user.slackUserId || "",
        isActive: user.isActive,
      })
    } else {
      setEditingUser(null)
      setForm({
        name: "",
        email: "",
        password: "",
        role: "tenant_user",
        phone: "",
        slackUserId: "",
        isActive: true,
      })
    }
    setShowDialog(true)
  }

  const saveUser = async () => {
    if (!form.name || !form.email) return
    if (!editingUser && !form.password) return

    setSaving(true)
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PUT" : "POST"

      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || null,
        slackUserId: form.slackUserId || null,
        isActive: form.isActive,
      }

      if (form.password) {
        body.password = form.password
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowDialog(false)
        fetchUsers()
      }
    } catch (error) {
      console.error("Error saving user:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/users/${deleteId}`, { method: "DELETE" })
      fetchUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
    }
    setDeleteId(null)
  }

  const toggleUserStatus = async (user: UserType) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      fetchUsers()
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
            Utilisateurs
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Gérez les accès et permissions
          </p>
        </div>
        <button
          onClick={() => openDialog()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:shadow-lg"
          style={{ background: "#0064FA" }}
        >
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatusFilter("all"); setRoleFilter("all") }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Total</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#111111" }}>{stats.total}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <UserCog className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        {/* Actifs */}
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatusFilter("active"); setRoleFilter("all") }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Actifs</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#28B95F" }}>{stats.active}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#D4EDDA" }}
            >
              <UserCheck className="w-6 h-6" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>

        {/* Inactifs */}
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setStatusFilter("inactive"); setRoleFilter("all") }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Inactifs</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#DC2626" }}>{stats.inactive}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#FEE2E2" }}
            >
              <UserX className="w-6 h-6" style={{ color: "#DC2626" }} />
            </div>
          </div>
        </div>

        {/* Admins */}
        <div
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          onClick={() => { setRoleFilter("admin"); setStatusFilter("all") }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>Admins</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: "#7C3AED" }}>{stats.admins}</p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#F3E8FF" }}
            >
              <ShieldCheck className="w-6 h-6" style={{ color: "#7C3AED" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Filters */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "#EEEEEE" }}>
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#999999" }} />
              <input
                type="text"
                placeholder="Rechercher par nom, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "#F5F5F7",
                  border: "1px solid #EEEEEE",
                  color: "#111111"
                }}
              />
            </div>

            {/* Role Filter */}
            <div className="w-44">
              <StyledSelect
                value={roleFilter}
                onChange={setRoleFilter}
                options={userRoleOptions}
                placeholder="Tous les rôles"
              />
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <StyledSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={activeStatusOptions}
                placeholder="Tous les statuts"
              />
            </div>

            {(search || roleFilter !== "all" || statusFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all") }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[#EEEEEE]"
                style={{ background: "#F5F5F7", color: "#666666" }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-sm" style={{ color: "#666666" }}>Chargement...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserCog className="h-12 w-12 mx-auto mb-4" style={{ color: "#CCCCCC" }} />
            <p className="text-sm" style={{ color: "#666666" }}>Aucun utilisateur trouvé</p>
            <button
              onClick={() => openDialog()}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "#0064FA" }}
            >
              Créer un utilisateur
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: "#666666" }}>
                    Utilisateur
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: "#666666" }}>
                    Contact
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: "#666666" }}>
                    Rôle
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: "#666666" }}>
                    Statut
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: "#666666" }}>
                    Dernière connexion
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase" style={{ color: "#666666" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-[#FAFAFA]"
                    style={{ borderTop: idx > 0 ? "1px solid #EEEEEE" : undefined }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm"
                          style={{
                            background: ["super_admin", "tenant_owner", "tenant_admin"].includes(user.role)
                              ? "#7C3AED"
                              : "#2563EB"
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: "#111111" }}>
                            {user.name}
                          </p>
                          <p className="text-xs" style={{ color: "#999999" }}>
                            Créé le {formatDate(user.createdAt).split(" ")[0]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm" style={{ color: "#444444" }}>
                          <Mail className="h-3.5 w-3.5" style={{ color: "#999999" }} />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm" style={{ color: "#666666" }}>
                            <Phone className="h-3.5 w-3.5" style={{ color: "#999999" }} />
                            {user.phone}
                          </div>
                        )}
                        {user.slackUserId && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: "#7C3AED" }}>
                            <MessageSquare className="h-3.5 w-3.5" />
                            Slack connecté
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(user.isActive)}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: "#666666" }}>
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]">
                            <MoreHorizontal className="h-4 w-4" style={{ color: "#666666" }} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openDialog(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                            {user.isActive ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activer
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(user.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom complet *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jean Dupont"
              />
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jean@exemple.com"
              />
            </div>

            <div className="space-y-2">
              <Label>{editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe *"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingUser ? "Laisser vide pour ne pas modifier" : "••••••••"}
              />
            </div>

            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div className="space-y-2">
              <Label>Slack User ID</Label>
              <Input
                value={form.slackUserId}
                onChange={(e) => setForm({ ...form, slackUserId: e.target.value })}
                placeholder="U01234ABCDE"
              />
              <p className="text-xs" style={{ color: "#666666" }}>
                Pour recevoir des notifications avec @mention
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rôle</Label>
              <StyledSelect
                value={form.role}
                onChange={(v) => setForm({ ...form, role: v })}
                options={userRoleFormOptions}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Utilisateur actif
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveUser}
              disabled={saving || !form.name || !form.email || (!editingUser && !form.password)}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
