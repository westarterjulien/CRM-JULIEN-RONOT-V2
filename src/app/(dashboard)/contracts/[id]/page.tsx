"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Download, Send, FileText, Users, Clock,
  CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw,
  Mail, Phone, ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
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

interface Signer {
  id: string
  name: string
  email: string
  phone: string | null
  signerType: string
  status: string
  viewedAt: string | null
  signedAt: string | null
  declinedAt: string | null
  declineReason: string | null
  docuseal_slug: string | null
}

interface Document {
  id: string
  filename: string
  originalPath: string
  pageCount: number | null
}

interface Contract {
  id: string
  title: string
  description: string | null
  status: string
  clientId: string | null
  clientName: string | null
  expirationDays: number
  lockOrder: boolean
  signerReminders: boolean
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  expiresAt: string | null
  voidedAt: string | null
  documents: Document[]
  signers: Signer[]
  docuseal_submission_id: number | null
  docuseal_combined_document_url: string | null
  docuseal_audit_log_url: string | null
}

const statusConfig: Record<string, { label: string; bg: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Brouillon", bg: "#F5F5F7", color: "#666666", icon: Clock },
  sent: { label: "Envoyé", bg: "#E3F2FD", color: "#0064FA", icon: Send },
  viewed: { label: "Consulté", bg: "#FEF3CD", color: "#DCB40A", icon: Eye },
  partially_signed: { label: "En cours de signature", bg: "#FFF3E0", color: "#F0783C", icon: AlertCircle },
  completed: { label: "Signé", bg: "#D4EDDA", color: "#28B95F", icon: CheckCircle2 },
  declined: { label: "Refusé", bg: "#FEE2E8", color: "#F04B69", icon: XCircle },
  expired: { label: "Expiré", bg: "#F5F5F7", color: "#999999", icon: Clock },
  voided: { label: "Annulé", bg: "#F5F5F7", color: "#999999", icon: XCircle },
}

const signerStatusConfig: Record<string, { label: string; color: string }> = {
  waiting: { label: "En attente", color: "#999999" },
  sent: { label: "Envoyé", color: "#0064FA" },
  viewed: { label: "Consulté", color: "#DCB40A" },
  signed: { label: "Signé", color: "#28B95F" },
  validated: { label: "Validé", color: "#28B95F" },
  declined: { label: "Refusé", color: "#F04B69" },
  nonvalidated: { label: "Non validé", color: "#F04B69" },
  error: { label: "Erreur", color: "#F04B69" },
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showPreview, setShowPreview] = useState(true) // Show preview by default for completed contracts

  useEffect(() => {
    fetchContract()
  }, [id])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
      const data = await res.json()
      if (data.contract) {
        setContract(data.contract)
      }
    } catch (error) {
      console.error("Error fetching contract:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchContract()
  }

  const handleSyncFromDocuSeal = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`/api/contracts/${id}/sync`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        // Refresh contract data
        await fetchContract()
      } else {
        alert(data.error || "Erreur lors de la synchronisation")
      }
    } catch (error) {
      console.error("Error syncing from DocuSeal:", error)
      alert("Erreur lors de la synchronisation")
    } finally {
      setSyncing(false)
    }
  }

  const handleVoid = async () => {
    setVoiding(true)
    try {
      // Call void API if exists
      // For now just show success
      alert("Fonction d'annulation à implémenter")
    } catch (error) {
      console.error("Error voiding contract:", error)
    } finally {
      setVoiding(false)
      setVoidDialogOpen(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await fetch(`/api/contracts/${id}/reset`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        // Redirect to edit page
        router.push(`/contracts/${id}/edit`)
      } else {
        alert(data.error || "Erreur lors de la réinitialisation")
      }
    } catch (error) {
      console.error("Error resetting contract:", error)
      alert("Erreur lors de la réinitialisation")
    } finally {
      setResetting(false)
      setResetDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0064FA", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "#666666" }}>Contrat non trouvé</p>
        <Link href="/contracts">
          <Button className="mt-4">Retour aux contrats</Button>
        </Link>
      </div>
    )
  }

  const StatusIcon = statusConfig[contract.status]?.icon || Clock
  const statusConf = statusConfig[contract.status] || statusConfig.draft

  const signedCount = contract.signers.filter((s) =>
    s.status === "signed" || s.status === "validated"
  ).length
  const totalSigners = contract.signers.filter((s) =>
    s.signerType === "signer" || s.signerType === "validator"
  ).length

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <button className="p-2 rounded-xl transition-colors hover:bg-[#F5F5F7]">
            <ArrowLeft className="w-5 h-5" style={{ color: "#666666" }} />
          </button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold" style={{ color: "#111111" }}>
              {contract.title}
            </h1>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: statusConf.bg, color: statusConf.color }}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {statusConf.label}
            </span>
          </div>
          {contract.clientName && (
            <p className="text-sm mt-1" style={{ color: "#666666" }}>
              {contract.clientName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl transition-colors hover:bg-[#F5F5F7]"
            title="Actualiser"
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
              style={{ color: "#666666" }}
            />
          </button>

          {/* Sync from DocuSeal button - show for sent contracts */}
          {contract.docuseal_submission_id && contract.status !== "draft" && contract.status !== "completed" && (
            <Button
              onClick={handleSyncFromDocuSeal}
              disabled={syncing}
              variant="outline"
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Synchronisation..." : "Sync DocuSeal"}
            </Button>
          )}

          {contract.status === "draft" && (
            <Link href={`/contracts/${id}/edit`}>
              <Button className="rounded-xl" style={{ background: "#0064FA" }}>
                Modifier
              </Button>
            </Link>
          )}

          {["sent", "viewed", "partially_signed"].includes(contract.status) && (
            <Button
              onClick={() => setResetDialogOpen(true)}
              variant="outline"
              className="rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Remettre en brouillon
            </Button>
          )}

          {contract.status === "completed" && (
            <>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="rounded-xl"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Masquer" : "Aperçu"}
              </Button>
              <Button
                onClick={() => window.open(`/api/contracts/${id}/download?type=signed`, "_blank")}
                className="rounded-xl"
                style={{ background: "#28B95F" }}
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger signé
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Document Preview for completed contracts */}
      {showPreview && contract.status === "completed" && contract.docuseal_combined_document_url && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#EEEEEE" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#111111" }}>
              <FileText className="w-4 h-4 inline mr-2" style={{ color: "#28B95F" }} />
              Document signé
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/api/contracts/${id}/download?type=signed`, "_blank")}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                style={{ background: "#D4EDDA", color: "#28B95F" }}
              >
                <Download className="w-3 h-3" />
                Télécharger
              </button>
              <button
                onClick={() => window.open(`/api/contracts/${id}/download?type=audit`, "_blank")}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                style={{ background: "#E3F2FD", color: "#0064FA" }}
              >
                <Download className="w-3 h-3" />
                Piste d'audit
              </button>
            </div>
          </div>
          <iframe
            src={`/api/contracts/${id}/download?type=signed`}
            className="w-full"
            style={{ height: "600px", border: "none" }}
            title="Document signé"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          {contract.status !== "draft" && (
            <div
              className="rounded-2xl p-6"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#111111" }}>
                Progression
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-2 rounded-full" style={{ background: "#F5F5F7" }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(signedCount / Math.max(totalSigners, 1)) * 100}%`,
                      background: contract.status === "completed" ? "#28B95F"
                        : contract.status === "declined" ? "#F04B69" : "#0064FA"
                    }}
                  />
                </div>
                <span className="text-sm font-medium" style={{ color: "#444444" }}>
                  {signedCount}/{totalSigners}
                </span>
              </div>

              {/* Signers status */}
              <div className="space-y-3">
                {contract.signers.map((signer) => {
                  const signerConf = signerStatusConfig[signer.status] || signerStatusConfig.waiting
                  const signingUrl = signer.docuseal_slug ? `https://docuseal.eu/s/${signer.docuseal_slug}` : null
                  const canSign = signingUrl && signer.status !== "signed" && signer.status !== "validated" && signer.status !== "declined"

                  return (
                    <div
                      key={signer.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "#F9F9FB" }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{
                          background: signer.status === "signed" || signer.status === "validated" ? "#28B95F"
                            : signer.status === "declined" || signer.status === "nonvalidated" ? "#F04B69"
                              : "#0064FA"
                        }}
                      >
                        {signer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "#111111" }}>
                          {signer.name}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs" style={{ color: "#999999" }}>
                            {signer.email}
                          </span>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ background: `${signerConf.color}20`, color: signerConf.color }}
                          >
                            {signer.signerType === "signer" ? "Signataire"
                              : signer.signerType === "validator" ? "Validateur" : "Observateur"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Signing link */}
                        {canSign && (
                          <a
                            href={signingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                            style={{ background: "#E3F2FD", color: "#0064FA" }}
                            title="Ouvrir le lien de signature"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Signer
                          </a>
                        )}
                        <div className="text-right">
                          <span
                            className="text-xs font-medium"
                            style={{ color: signerConf.color }}
                          >
                            {signerConf.label}
                          </span>
                          {signer.signedAt && (
                            <p className="text-[10px] mt-0.5" style={{ color: "#999999" }}>
                              {formatDate(signer.signedAt)}
                            </p>
                          )}
                          {signer.viewedAt && !signer.signedAt && (
                            <p className="text-[10px] mt-0.5" style={{ color: "#999999" }}>
                              Vu le {formatDate(signer.viewedAt)}
                            </p>
                          )}
                          {signer.declineReason && (
                            <p className="text-[10px] mt-0.5" style={{ color: "#F04B69" }}>
                              {signer.declineReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Documents */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#111111" }}>
              <FileText className="w-4 h-4 inline mr-2" style={{ color: "#666666" }} />
              Documents ({contract.documents.length})
            </h3>
            <div className="space-y-2">
              {contract.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "#F9F9FB" }}
                >
                  <FileText className="w-5 h-5" style={{ color: "#0064FA" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                      {doc.filename}
                    </p>
                    {doc.pageCount && (
                      <p className="text-xs" style={{ color: "#999999" }}>
                        {doc.pageCount} page{doc.pageCount > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  {contract.status === "completed" && (
                    <button
                      onClick={() => window.open(`/api/contracts/${id}/download?type=signed`, "_blank")}
                      className="p-2 rounded-lg transition-colors hover:bg-[#E3F2FD]"
                    >
                      <Download className="w-4 h-4" style={{ color: "#0064FA" }} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Download options for completed contracts */}
            {contract.status === "completed" && (
              <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: "#EEEEEE" }}>
                <button
                  onClick={() => window.open(`/api/contracts/${id}/download?type=signed`, "_blank")}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "#D4EDDA", color: "#28B95F" }}
                >
                  <Download className="w-4 h-4" />
                  Document signé
                </button>
                <button
                  onClick={() => window.open(`/api/contracts/${id}/download?type=audit`, "_blank")}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "#E3F2FD", color: "#0064FA" }}
                >
                  <Download className="w-4 h-4" />
                  Piste d'audit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#111111" }}>
              Informations
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "#666666" }}>Créé le</span>
                <span style={{ color: "#111111" }}>{formatDate(contract.createdAt)}</span>
              </div>
              {contract.sentAt && (
                <div className="flex justify-between">
                  <span style={{ color: "#666666" }}>Envoyé le</span>
                  <span style={{ color: "#111111" }}>{formatDate(contract.sentAt)}</span>
                </div>
              )}
              {contract.completedAt && (
                <div className="flex justify-between">
                  <span style={{ color: "#666666" }}>Signé le</span>
                  <span style={{ color: "#28B95F" }}>{formatDate(contract.completedAt)}</span>
                </div>
              )}
              {contract.expiresAt && contract.status !== "completed" && (
                <div className="flex justify-between">
                  <span style={{ color: "#666666" }}>Expire le</span>
                  <span style={{ color: "#F0783C" }}>{formatDate(contract.expiresAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: "#666666" }}>Validité</span>
                <span style={{ color: "#111111" }}>{contract.expirationDays} jours</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#666666" }}>Ordre obligatoire</span>
                <span style={{ color: "#111111" }}>{contract.lockOrder ? "Oui" : "Non"}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#666666" }}>Rappels auto</span>
                <span style={{ color: "#111111" }}>{contract.signerReminders ? "Oui" : "Non"}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {contract.description && (
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#111111" }}>
                Description
              </h3>
              <p className="text-sm" style={{ color: "#666666" }}>
                {contract.description}
              </p>
            </div>
          )}

          {/* Actions */}
          {contract.status !== "draft" && contract.status !== "completed" && contract.status !== "voided" && (
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#111111" }}>
                Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setVoidDialogOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "#FEE2E8", color: "#F04B69" }}
                >
                  <XCircle className="w-4 h-4" />
                  Annuler le contrat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Void Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera la demande de signature. Les signataires ne pourront plus signer le document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={voiding}
              className="rounded-xl"
              style={{ background: "#F04B69" }}
            >
              Annuler le contrat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre en brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              La demande de signature en cours sera annulée chez iLovePDF. Vous pourrez ensuite modifier et renvoyer le contrat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
              className="rounded-xl"
              style={{ background: "#0064FA" }}
            >
              {resetting ? "En cours..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
