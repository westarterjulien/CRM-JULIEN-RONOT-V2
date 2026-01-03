"use client"

import { useState, useEffect } from "react"
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  MessageSquare,
  Key,
  Save,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Account {
  id: string
  name: string
  email: string
  role: string
  slackUserId: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

const roleConfig = {
  super_admin: { label: "Super Admin", bg: "#FEE2E2", color: "#DC2626", icon: ShieldCheck },
  tenant_owner: { label: "Propriétaire", bg: "#F3E8FF", color: "#7C3AED", icon: ShieldCheck },
  tenant_admin: { label: "Admin", bg: "#F3E8FF", color: "#7C3AED", icon: ShieldCheck },
  tenant_user: { label: "Utilisateur", bg: "#DBEAFE", color: "#2563EB", icon: Shield },
}

function getRoleInfo(role: string) {
  return roleConfig[role as keyof typeof roleConfig] || roleConfig.tenant_user
}

function formatDate(date: string | null) {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Profile form
  const [name, setName] = useState("")
  const [slackUserId, setSlackUserId] = useState("")

  // Password form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    fetchAccount()
  }, [])

  const fetchAccount = async () => {
    try {
      const res = await fetch("/api/account")
      if (res.ok) {
        const data = await res.json()
        setAccount(data)
        setName(data.name)
        setSlackUserId(data.slackUserId || "")
      }
    } catch (error) {
      console.error("Error fetching account:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slackUserId }),
      })

      if (res.ok) {
        const data = await res.json()
        setAccount(prev => prev ? { ...prev, ...data.user } : null)
        setMessage({ type: "success", text: "Profil mis à jour avec succès" })
      } else {
        const error = await res.json()
        setMessage({ type: "error", text: error.error || "Erreur lors de la mise à jour" })
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      setMessage({ type: "error", text: "Erreur lors de la mise à jour" })
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Tous les champs de mot de passe sont requis" })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Le nouveau mot de passe doit contenir au moins 6 caractères" })
      return
    }

    setSavingPassword(true)
    setMessage(null)
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Mot de passe modifié avec succès" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        const error = await res.json()
        setMessage({ type: "error", text: error.error || "Erreur lors de la modification" })
      }
    } catch (error) {
      console.error("Error saving password:", error)
      setMessage({ type: "error", text: "Erreur lors de la modification" })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p style={{ color: "#666666" }}>Impossible de charger le compte</p>
      </div>
    )
  }

  const roleInfo = getRoleInfo(account.role)
  const RoleIcon = roleInfo.icon

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
          Mon compte
        </h1>
        <p className="text-sm mt-1" style={{ color: "#666666" }}>
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: message.type === "success" ? "#D4EDDA" : "#FEE2E2",
            color: message.type === "success" ? "#28B95F" : "#DC2626",
          }}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Account Overview Card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-semibold"
            style={{
              background: ["super_admin", "tenant_owner", "tenant_admin"].includes(account.role)
                ? "#7C3AED"
                : "#0064FA"
            }}
          >
            {account.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold" style={{ color: "#111111" }}>
                {account.name}
              </h2>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: roleInfo.bg, color: roleInfo.color }}
              >
                <RoleIcon className="w-3 h-3" />
                {roleInfo.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: "#666666" }}>
              <div className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {account.email}
              </div>
              {account.slackUserId && (
                <div className="flex items-center gap-1.5" style={{ color: "#7C3AED" }}>
                  <MessageSquare className="h-4 w-4" />
                  Slack connecté
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: "#999999" }}>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Inscrit le {formatDate(account.createdAt).split(" à")[0]}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Dernière connexion : {formatDate(account.lastLoginAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Edit Profile Card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <User className="w-5 h-5" style={{ color: "#0064FA" }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Informations personnelles
              </h3>
              <p className="text-xs" style={{ color: "#666666" }}>
                Modifiez votre profil
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={account.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs" style={{ color: "#999999" }}>
                L'email ne peut pas être modifié
              </p>
            </div>

            <div className="space-y-2">
              <Label>Slack User ID</Label>
              <Input
                value={slackUserId}
                onChange={(e) => setSlackUserId(e.target.value)}
                placeholder="U01234ABCDE"
              />
              <p className="text-xs" style={{ color: "#666666" }}>
                Pour recevoir les notifications avec @mention
              </p>
            </div>

            <Button
              onClick={saveProfile}
              disabled={saving || !name}
              className="w-full"
              style={{ background: "#0064FA" }}
            >
              {saving ? (
                "Enregistrement..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Change Password Card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#F3E8FF" }}
            >
              <Key className="w-5 h-5" style={{ color: "#7C3AED" }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Mot de passe
              </h3>
              <p className="text-xs" style={{ color: "#666666" }}>
                Modifiez votre mot de passe
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#999999" }}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#999999" }}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirmer le nouveau mot de passe</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs" style={{ color: "#DC2626" }}>
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            <Button
              onClick={savePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              variant="outline"
              className="w-full"
            >
              {savingPassword ? (
                "Modification..."
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Modifier le mot de passe
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
