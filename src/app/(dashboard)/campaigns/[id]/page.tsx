"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import type { EmailEditorProps } from "react-email-editor"
import {
  ArrowLeft,
  Save,
  Send,
  TestTube,
  Users,
  Sparkles,
  Settings,
  Eye,
  Loader2,
  Mail,
  CheckCircle,
  XCircle,
  MousePointer,
  AlertCircle,
} from "lucide-react"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const recipientTypeOptions: SelectOption[] = [
  { value: "all_clients", label: "Tous les clients", color: "#3B82F6" },
  { value: "active_clients", label: "Clients actifs uniquement", color: "#10B981" },
  { value: "prospects", label: "Prospects uniquement", color: "#F59E0B" },
]

// Import Unlayer dynamically (client-side only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EmailEditor = dynamic(() => import("react-email-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]" style={{ background: "#F5F5F7" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#5F00BA" }} />
    </div>
  ),
}) as React.ComponentType<EmailEditorProps & { ref?: React.Ref<any> }>

interface Campaign {
  id: string
  name: string
  subject: string
  fromName: string | null
  fromEmail: string | null
  replyTo: string | null
  designJson: string | null
  htmlContent: string | null
  status: string
  recipientType: string
  recipientCount: number
  stats: {
    pending: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    failed: number
  }
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Brouillon", color: "#F0783C", bgColor: "#FEF3CD" },
  scheduled: { label: "Planifiée", color: "#0064FA", bgColor: "#E8F0FF" },
  sent: { label: "Envoyée", color: "#28B95F", bgColor: "#D1FAE5" },
}

export default function CampaignEditorPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string
  const isNew = campaignId === "new"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailEditorRef = useRef<any>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [activeTab, setActiveTab] = useState<"editor" | "settings" | "recipients" | "stats">("editor")

  // Form state
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [fromName, setFromName] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [replyTo, setReplyTo] = useState("")
  const [recipientType, setRecipientType] = useState("all_clients")
  const [testEmail, setTestEmail] = useState("")

  // AI state
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)

  useEffect(() => {
    if (!isNew) {
      fetchCampaign()
    }
  }, [isNew])

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      const data = await res.json()
      setCampaign(data)
      setName(data.name || "")
      setSubject(data.subject || "")
      setFromName(data.fromName || "")
      setFromEmail(data.fromEmail || "")
      setReplyTo(data.replyTo || "")
      setRecipientType(data.recipientType || "all_clients")
    } catch (error) {
      console.error("Error fetching campaign:", error)
    } finally {
      setLoading(false)
    }
  }

  const onEditorReady = useCallback(() => {
    setEditorReady(true)
    // Load existing design if available
    if (campaign?.designJson && emailEditorRef.current?.editor) {
      try {
        const design = JSON.parse(campaign.designJson)
        emailEditorRef.current.editor.loadDesign(design)
      } catch (e) {
        console.error("Error loading design:", e)
      }
    }
  }, [campaign?.designJson])

  const saveCampaign = async () => {
    if (!name || !subject) {
      alert("Veuillez remplir le nom et l'objet de la campagne")
      return
    }

    setSaving(true)

    try {
      // Export HTML from editor
      let designJson = null
      let htmlContent = null

      if (emailEditorRef.current?.editor) {
        await new Promise<void>((resolve) => {
          emailEditorRef.current!.editor.exportHtml((data: { design: unknown; html: string }) => {
            designJson = JSON.stringify(data.design)
            htmlContent = data.html
            resolve()
          })
        })
      }

      const payload = {
        name,
        subject,
        fromName: fromName || null,
        fromEmail: fromEmail || null,
        replyTo: replyTo || null,
        recipientType,
        designJson,
        htmlContent,
      }

      if (isNew) {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        router.push(`/campaigns/${data.id}`)
      } else {
        await fetch(`/api/campaigns/${campaignId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        fetchCampaign()
      }
    } catch (error) {
      console.error("Error saving campaign:", error)
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const generateRecipients = async () => {
    if (isNew) {
      alert("Sauvegardez d'abord la campagne")
      return
    }

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      alert(`${data.count} destinataires ajoutés`)
      fetchCampaign()
    } catch (error) {
      console.error("Error generating recipients:", error)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert("Entrez une adresse email de test")
      return
    }

    setSending(true)
    try {
      // Save first
      await saveCampaign()

      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testMode: true, testEmail }),
      })
      const data = await res.json()

      if (data.success) {
        alert(`Email de test envoyé à ${testEmail}`)
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error("Error sending test:", error)
      alert("Erreur lors de l'envoi du test")
    } finally {
      setSending(false)
    }
  }

  const sendCampaign = async () => {
    if (!confirm("Envoyer cette campagne à tous les destinataires ?")) return

    setSending(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (data.success) {
        alert(
          `Campagne envoyée ! ${data.sentCount} emails envoyés, ${data.failedCount} échecs`
        )
        fetchCampaign()
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error("Error sending campaign:", error)
      alert("Erreur lors de l'envoi")
    } finally {
      setSending(false)
    }
  }

  const generateWithAI = async () => {
    if (!aiPrompt) return

    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          type: "newsletter",
          tone: "professionnel",
        }),
      })
      const data = await res.json()

      if (data.success) {
        // Update subject
        setSubject(data.subject)

        // Create a simple design with AI content
        const design = {
          body: {
            rows: [
              {
                cells: [1],
                columns: [
                  {
                    contents: [
                      {
                        type: "heading",
                        values: {
                          text: data.headline,
                          headingType: "h1",
                        },
                      },
                      {
                        type: "text",
                        values: {
                          text: data.body,
                        },
                      },
                      ...(data.cta
                        ? [
                            {
                              type: "button",
                              values: {
                                text: data.cta.text,
                                href: data.cta.url || "#",
                              },
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
            ],
          },
        }

        if (emailEditorRef.current?.editor) {
          emailEditorRef.current.editor.loadDesign(design)
        }

        setShowAiPanel(false)
        setAiPrompt("")
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error("Error generating with AI:", error)
      alert("Erreur lors de la génération")
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#5F00BA", borderTopColor: "transparent" }} />
      </div>
    )
  }

  const tabs = [
    { id: "editor", label: "Éditeur", icon: Mail },
    { id: "settings", label: "Paramètres", icon: Settings },
    { id: "recipients", label: "Destinataires", icon: Users },
    ...(campaign?.status === "sent" ? [{ id: "stats", label: "Statistiques", icon: Eye }] : []),
  ]

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ background: "#FFFFFF", borderColor: "#EEEEEE" }}
      >
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <button
              className="p-2 rounded-xl transition-colors hover:bg-[#F5F5F7]"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "#666666" }} />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de la campagne"
              className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-0"
              style={{ color: "#111111" }}
            />
            {campaign?.status && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5"
                style={{
                  background: statusConfig[campaign.status]?.bgColor || "#F5F5F7",
                  color: statusConfig[campaign.status]?.color || "#666666",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: statusConfig[campaign.status]?.color || "#666666" }}
                />
                {statusConfig[campaign.status]?.label || campaign.status}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{
              background: showAiPanel ? "#5F00BA" : "linear-gradient(135deg, #F3E8FF 0%, #E8F0FF 100%)",
              color: showAiPanel ? "#FFFFFF" : "#5F00BA",
            }}
          >
            <Sparkles className="w-4 h-4" />
            IA
          </button>
          <button
            onClick={saveCampaign}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "#F5F5F7", color: "#444444" }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Sauvegarder
          </button>
          {!isNew && campaign?.status !== "sent" && (
            <button
              onClick={sendCampaign}
              disabled={sending || (campaign?.recipientCount || 0) === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Envoyer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-6 py-2 border-b"
        style={{ background: "#FFFFFF", borderColor: "#EEEEEE" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "#F5F5F7" : "transparent",
              color: activeTab === tab.id ? "#5F00BA" : "#666666",
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI Panel */}
      {showAiPanel && (
        <div
          className="p-4 border-b"
          style={{ background: "linear-gradient(135deg, #F3E8FF 0%, #E8F0FF 100%)", borderColor: "#E5E5E5" }}
        >
          <div className="flex items-start gap-4 max-w-4xl mx-auto">
            <Sparkles className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: "#5F00BA" }} />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2" style={{ color: "#5F00BA" }}>
                Générer le contenu avec l&apos;IA
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Décrivez le contenu que vous souhaitez... Ex: Une newsletter pour annoncer notre nouvelle offre de maintenance avec 20% de réduction"
                className="w-full p-3 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
                style={{
                  borderColor: "#E5E5E5",
                  background: "#FFFFFF",
                  color: "#111111",
                }}
                rows={3}
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={generateWithAI}
                  disabled={aiLoading || !aiPrompt}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#5F00BA", color: "#FFFFFF" }}
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Générer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ background: "#F8F9FA" }}>
        {activeTab === "editor" && (
          <EmailEditor
            ref={emailEditorRef}
            onReady={onEditorReady}
            options={{
              locale: "fr-FR",
              appearance: {
                theme: "modern_light",
              },
              features: {
                textEditor: {
                  spellChecker: true,
                },
              },
              mergeTags: {
                email: { name: "Email", value: "{{email}}" },
                name: { name: "Nom", value: "{{name}}" },
                prenom: { name: "Prénom", value: "{{prenom}}" },
                entreprise: { name: "Entreprise", value: "{{entreprise}}" },
              },
            }}
          />
        )}

        {activeTab === "settings" && (
          <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div
              className="rounded-2xl p-6 space-y-6"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                  Objet de l&apos;email *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="L'objet qui apparaîtra dans la boîte de réception"
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E5E5", background: "#FAFAFA", color: "#111111" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                    Nom de l&apos;expéditeur
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Ex: Julien de MonEntreprise"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: "#E5E5E5", background: "#FAFAFA", color: "#111111" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                    Email de l&apos;expéditeur
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="Ex: contact@monentreprise.fr"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: "#E5E5E5", background: "#FAFAFA", color: "#111111" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                  Répondre à
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="Adresse pour les réponses (optionnel)"
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E5E5", background: "#FAFAFA", color: "#111111" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#444444" }}>
                  Type de destinataires
                </label>
                <StyledSelect
                  value={recipientType}
                  onChange={setRecipientType}
                  options={recipientTypeOptions}
                  placeholder="Type de destinataires"
                />
              </div>
            </div>

            {/* Test Email Section */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h3 className="text-sm font-medium mb-4" style={{ color: "#444444" }}>
                Envoyer un email de test
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votreemail@example.com"
                  className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E5E5", background: "#FAFAFA", color: "#111111" }}
                />
                <button
                  onClick={sendTestEmail}
                  disabled={sending || !testEmail}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "#F5F5F7", color: "#444444" }}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Tester
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "recipients" && (
          <div className="p-6 max-w-4xl mx-auto">
            <div
              className="rounded-2xl p-6"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                    Destinataires
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "#666666" }}>
                    {campaign?.recipientCount || 0} destinataires pour cette campagne
                  </p>
                </div>
                <button
                  onClick={generateRecipients}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  <Users className="w-4 h-4" />
                  Générer la liste
                </button>
              </div>

              {campaign && campaign.recipientCount > 0 ? (
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: "#D1FAE5", border: "1px solid #28B95F" }}
                >
                  <CheckCircle className="w-5 h-5" style={{ color: "#28B95F" }} />
                  <span className="font-medium" style={{ color: "#166534" }}>
                    {campaign.recipientCount} destinataires prêts à recevoir la campagne
                  </span>
                </div>
              ) : (
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: "#FEF3CD", border: "1px solid #F0783C" }}
                >
                  <AlertCircle className="w-5 h-5" style={{ color: "#F0783C" }} />
                  <span className="font-medium" style={{ color: "#92400E" }}>
                    Aucun destinataire. Cliquez sur &quot;Générer la liste&quot; pour ajouter des destinataires.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "stats" && campaign && (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
              Statistiques de la campagne
            </h3>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="rounded-2xl p-4"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#E8F0FF" }}
                  >
                    <Send className="w-5 h-5" style={{ color: "#0064FA" }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                      {campaign.stats.sent + campaign.stats.delivered + campaign.stats.opened + campaign.stats.clicked}
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>Envoyés</p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#D1FAE5" }}
                  >
                    <Eye className="w-5 h-5" style={{ color: "#28B95F" }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                      {campaign.stats.opened + campaign.stats.clicked}
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>Ouverts</p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#F3E8FF" }}
                  >
                    <MousePointer className="w-5 h-5" style={{ color: "#5F00BA" }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                      {campaign.stats.clicked}
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>Clics</p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#FEE2E2" }}
                  >
                    <XCircle className="w-5 h-5" style={{ color: "#EF4444" }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                      {campaign.stats.bounced + campaign.stats.failed}
                    </p>
                    <p className="text-sm" style={{ color: "#666666" }}>Échecs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate Charts */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-6"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <h4 className="text-sm font-medium mb-2" style={{ color: "#666666" }}>Taux d&apos;ouverture</h4>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold" style={{ color: "#111111" }}>
                    {(() => {
                      const total = campaign.stats.sent + campaign.stats.delivered + campaign.stats.opened + campaign.stats.clicked
                      if (total === 0) return 0
                      return Math.round(((campaign.stats.opened + campaign.stats.clicked) / total) * 100)
                    })()}%
                  </p>
                </div>
                <div
                  className="mt-4 w-full h-2 rounded-full"
                  style={{ background: "#E5E5E5" }}
                >
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      background: "#28B95F",
                      width: `${(() => {
                        const total = campaign.stats.sent + campaign.stats.delivered + campaign.stats.opened + campaign.stats.clicked
                        if (total === 0) return 0
                        return Math.round(((campaign.stats.opened + campaign.stats.clicked) / total) * 100)
                      })()}%`,
                    }}
                  />
                </div>
              </div>

              <div
                className="rounded-2xl p-6"
                style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <h4 className="text-sm font-medium mb-2" style={{ color: "#666666" }}>Taux de clic</h4>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold" style={{ color: "#111111" }}>
                    {(() => {
                      const total = campaign.stats.sent + campaign.stats.delivered + campaign.stats.opened + campaign.stats.clicked
                      if (total === 0) return 0
                      return Math.round((campaign.stats.clicked / total) * 100)
                    })()}%
                  </p>
                </div>
                <div
                  className="mt-4 w-full h-2 rounded-full"
                  style={{ background: "#E5E5E5" }}
                >
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      background: "#5F00BA",
                      width: `${(() => {
                        const total = campaign.stats.sent + campaign.stats.delivered + campaign.stats.opened + campaign.stats.clicked
                        if (total === 0) return 0
                        return Math.round((campaign.stats.clicked / total) * 100)
                      })()}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
