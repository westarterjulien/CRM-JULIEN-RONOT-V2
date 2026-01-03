"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, FileSignature, Users, Building2,
  Save, Send, Loader2, Plus, Trash2, Search, X
} from "lucide-react"
import { AIContractEditor } from "@/components/contracts/ai-contract-editor"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const signerTypeOptions: SelectOption[] = [
  { value: "signer", label: "Signataire", color: "#28B95F" },
  { value: "validator", label: "Validateur", color: "#0064FA" },
  { value: "viewer", label: "Observateur", color: "#666666" },
]

interface Client {
  id: string
  companyName: string
  email: string
}

interface Signer {
  name: string
  email: string
  phone: string
  signerType: string
}

export default function CreateAIContractPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [expirationDays, setExpirationDays] = useState(30)
  const [content, setContent] = useState("")
  const [signers, setSigners] = useState<Signer[]>([])

  // Client search
  const [clientSearch, setClientSearch] = useState("")
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [searchingClients, setSearchingClients] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const clientSearchRef = useRef<HTMLDivElement>(null)

  // Signer form
  const [showSignerForm, setShowSignerForm] = useState(false)
  const [newSigner, setNewSigner] = useState<Signer>({
    name: "",
    email: "",
    phone: "",
    signerType: "signer",
  })

  // Search clients
  useEffect(() => {
    const searchClients = async () => {
      if (clientSearch.length < 2) {
        setClientResults([])
        return
      }

      setSearchingClients(true)
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&status=active&limit=10`)
        const data = await res.json()
        setClientResults(data.clients || [])
      } catch (error) {
        console.error("Error searching clients:", error)
      } finally {
        setSearchingClients(false)
      }
    }

    const debounce = setTimeout(searchClients, 300)
    return () => clearTimeout(debounce)
  }, [clientSearch])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectClient = (client: Client) => {
    setSelectedClient(client)
    setClientSearch("")
    setShowClientDropdown(false)
  }

  const addSigner = () => {
    if (!newSigner.name.trim() || !newSigner.email.trim()) {
      alert("Nom et email requis")
      return
    }
    setSigners([...signers, { ...newSigner }])
    setNewSigner({ name: "", email: "", phone: "", signerType: "signer" })
    setShowSignerForm(false)
  }

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index))
  }

  const handleSave = async (sendForSignature: boolean = false) => {
    if (!title.trim()) {
      alert("Titre requis")
      return
    }
    if (!selectedClient) {
      alert("Veuillez sélectionner un client")
      return
    }
    if (!content.trim()) {
      alert("Le contenu du contrat est vide")
      return
    }
    if (signers.length === 0) {
      alert("Ajoutez au moins un signataire")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          clientId: selectedClient.id,
          expirationDays,
          htmlContent: content,
          signers: signers.map((s, i) => ({
            ...s,
            sortOrder: i,
            language: "fr",
          })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const data = await res.json()

      if (sendForSignature) {
        const sendRes = await fetch(`/api/contracts/${data.contract.id}/send`, {
          method: "POST",
        })
        if (!sendRes.ok) {
          alert("Contrat créé mais erreur lors de l'envoi.")
        }
      }

      router.push(`/contracts/${data.contract.id}`)
    } catch (error) {
      console.error("Error saving contract:", error)
      alert(error instanceof Error ? error.message : "Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/contracts"
            className="p-2 rounded-lg transition-colors hover:bg-white"
            style={{ color: "#666666" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
              Nouveau contrat
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#666666" }}>
              Générez et personnalisez votre contrat avec l'IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "#F5F5F7", color: "#444444" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Brouillon
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "#0064FA", color: "#FFFFFF" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer pour signature
          </button>
        </div>
      </div>

      {/* Contract Info Bar */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Title */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: "#999999" }}>
            Titre du contrat
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Contrat de prestation"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
            style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
          />
        </div>

        {/* Client Search */}
        <div className="flex-1 min-w-[200px]" ref={clientSearchRef}>
          <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: "#999999" }}>
            Client
          </label>
          {selectedClient ? (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: "#E6F0FF", border: "1px solid #0064FA" }}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" style={{ color: "#0064FA" }} />
                <span className="text-sm font-medium" style={{ color: "#0064FA" }}>
                  {selectedClient.companyName}
                </span>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-1 rounded hover:bg-[#0064FA]/10"
              >
                <X className="w-3.5 h-3.5" style={{ color: "#0064FA" }} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#999999" }} />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  setShowClientDropdown(true)
                }}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Rechercher un client..."
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
              />
              {showClientDropdown && (clientResults.length > 0 || searchingClients) && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 max-h-60 overflow-y-auto"
                  style={{ background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                >
                  {searchingClients ? (
                    <div className="p-4 text-center text-sm" style={{ color: "#666666" }}>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Recherche...
                    </div>
                  ) : (
                    clientResults.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => selectClient(client)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F5F5F7]"
                      >
                        <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: "#666666" }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                            {client.companyName}
                          </p>
                          <p className="text-xs truncate" style={{ color: "#999999" }}>
                            {client.email}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expiration */}
        <div className="w-32">
          <label className="block text-[10px] font-medium mb-1 uppercase tracking-wide" style={{ color: "#999999" }}>
            Expiration
          </label>
          <div className="relative">
            <input
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(parseInt(e.target.value) || 30)}
              min={1}
              max={365}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#999999" }}>
              jours
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor */}
        <div className="lg:col-span-3">
          <AIContractEditor
            content={content}
            onChange={setContent}
            placeholder="Utilisez l'assistant IA ou commencez à rédiger..."
          />
        </div>

        {/* Signers Panel */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl p-5 sticky top-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: "#0064FA" }} />
                <h2 className="font-semibold" style={{ color: "#111111" }}>
                  Signataires
                </h2>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#E6F0FF", color: "#0064FA" }}
              >
                {signers.length}
              </span>
            </div>

            {signers.length === 0 && !showSignerForm ? (
              <div className="text-center py-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "#F5F5F7" }}
                >
                  <Users className="w-6 h-6" style={{ color: "#999999" }} />
                </div>
                <p className="text-sm mb-3" style={{ color: "#666666" }}>
                  Aucun signataire
                </p>
                <button
                  onClick={() => setShowSignerForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {signers.map((signer, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl group"
                      style={{ background: "#F5F5F7" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "#0064FA", color: "#FFFFFF" }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                          {signer.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: "#666666" }}>
                          {signer.email}
                        </p>
                      </div>
                      <button
                        onClick={() => removeSigner(index)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FEE2E8]"
                        style={{ color: "#F04B69" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {!showSignerForm && (
                  <button
                    onClick={() => setShowSignerForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 border-dashed transition-colors hover:bg-[#F5F5F7]"
                    style={{ borderColor: "#DDDDDD", color: "#666666" }}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un signataire
                  </button>
                )}
              </>
            )}

            {/* Add Signer Form */}
            {showSignerForm && (
              <div className="space-y-3 p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                <input
                  type="text"
                  value={newSigner.name}
                  onChange={(e) => setNewSigner({ ...newSigner, name: e.target.value })}
                  placeholder="Nom complet"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                  style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
                />
                <input
                  type="email"
                  value={newSigner.email}
                  onChange={(e) => setNewSigner({ ...newSigner, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                  style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
                />
                <input
                  type="tel"
                  value={newSigner.phone}
                  onChange={(e) => setNewSigner({ ...newSigner, phone: e.target.value })}
                  placeholder="Téléphone (optionnel)"
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                  style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
                />
                <StyledSelect
                  value={newSigner.signerType}
                  onChange={(v) => setNewSigner({ ...newSigner, signerType: v })}
                  options={signerTypeOptions}
                  placeholder="Type de signataire"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowSignerForm(false)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ background: "#FFFFFF", color: "#666666" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={addSigner}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ background: "#0064FA", color: "#FFFFFF" }}
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "#EEEEEE" }}>
              <label className="block text-[10px] font-medium mb-2 uppercase tracking-wide" style={{ color: "#999999" }}>
                Note interne
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description optionnelle..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
