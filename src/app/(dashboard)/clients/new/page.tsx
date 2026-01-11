"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft, Building2, User, Search, Loader2, CheckCircle2,
  MapPin, Phone, Globe, Users, FileText, X
} from "lucide-react"

interface CompanySearchResult {
  siren: string
  siret: string
  nom_complet: string
  nom_raison_sociale: string
  siege: {
    adresse: string
    code_postal: string
    libelle_commune: string
  }
  activite_principale: string
  nature_juridique: string
  tranche_effectif_salarie: string
}

// Calculate French VAT number from SIREN
function calculateVatNumber(siren: string): string {
  if (!siren || siren.length !== 9) return ""
  const sirenNum = parseInt(siren, 10)
  const key = (12 + 3 * (sirenNum % 97)) % 97
  return `FR${String(key).padStart(2, "0")}${siren}`
}

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([])
  const [clientType, setClientType] = useState<"company" | "individual">("company")
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [highlightedFields, setHighlightedFields] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState("")

  const [formData, setFormData] = useState({
    companyName: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    siret: "",
    siren: "",
    vatNumber: "",
    apeCode: "",
    legalForm: "",
    capital: "",
    address: "",
    postalCode: "",
    city: "",
    country: "France",
    website: "",
    contactFirstname: "",
    contactLastname: "",
    contactEmail: "",
    contactPhone: "",
    contactPosition: "",
    notes: "",
    status: "prospect",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const [searchError, setSearchError] = useState<string | null>(null)

  const searchCompany = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    setSearchError(null)

    try {
      // Utilise notre API interne pour éviter les problèmes CORS
      const res = await fetch(`/api/company-search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Erreur API: ${res.status}`)
      }

      setSearchResults(data.results || [])
    } catch (error) {
      console.error("Search failed:", error)
      setSearchError(error instanceof Error ? error.message : "Erreur de recherche")
    } finally {
      setSearching(false)
    }
  }

  const selectCompany = (company: CompanySearchResult) => {
    const newFormData = {
      ...formData,
      companyName: company.nom_complet || company.nom_raison_sociale,
      siret: company.siret,
      siren: company.siren,
      vatNumber: calculateVatNumber(company.siren),
      apeCode: company.activite_principale,
      legalForm: company.nature_juridique,
      address: company.siege?.adresse || "",
      postalCode: company.siege?.code_postal || "",
      city: company.siege?.libelle_commune || "",
    }

    setFormData(newFormData)
    setShowSearchModal(false)
    setSearchResults([])
    setSearchQuery("")

    // Highlight filled fields
    const filledFields = ["companyName", "siret", "siren", "vatNumber", "apeCode", "legalForm", "address", "postalCode", "city"]
      .filter((f) => newFormData[f as keyof typeof newFormData])
    setHighlightedFields(filledFields)

    // Show success message
    setSuccessMessage("Formulaire rempli automatiquement !")
    setTimeout(() => {
      setSuccessMessage("")
      setHighlightedFields([])
    }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          client_type: clientType,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/clients/${data.id}`)
      }
    } catch (error) {
      console.error("Failed to create client:", error)
    } finally {
      setLoading(false)
    }
  }

  const getInputClassName = (field: string) => {
    const baseClass = "w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0064FA] focus:border-[#0064FA] transition-all duration-200"
    if (highlightedFields.includes(field)) {
      return `${baseClass} ring-2 ring-[#28B95F] ring-opacity-50 border-[#28B95F]`
    }
    return `${baseClass} border-[#EEEEEE]`
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-white" style={{ background: "#28B95F" }}>
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#E6F0FF" }}>
            <Users className="h-6 w-6" style={{ color: "#0064FA" }} />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "#111111" }}>Nouveau Client</h1>
            <p className="font-medium" style={{ color: "#666666" }}>Ajouter un nouveau client à votre base</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/clients")}
          className="w-full md:w-auto rounded-xl px-6 py-3 font-semibold transition-all duration-200"
          style={{ borderColor: "#EEEEEE", color: "#666666" }}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Retour à la liste
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: "#EEEEEE", background: "#F5F5F7" }}>
            <h3 className="text-xl font-bold" style={{ color: "#111111" }}>Informations du Client</h3>
            <p className="text-sm mt-1" style={{ color: "#666666" }}>Remplissez les informations du nouveau client</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Client Type Tabs */}
            <div className="rounded-2xl p-4" style={{ background: "#F5F5F7" }}>
              <Tabs value={clientType} onValueChange={(v) => setClientType(v as "company" | "individual")}>
                <TabsList className="grid w-full grid-cols-2 h-14 rounded-xl bg-white p-1">
                  <TabsTrigger
                    value="company"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                    style={{
                      background: clientType === "company" ? "#0064FA" : "transparent",
                      color: clientType === "company" ? "white" : "#666666"
                    }}
                  >
                    <Building2 className="h-5 w-5" />
                    <span className="font-semibold">Entreprise</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="individual"
                    className="flex items-center gap-2 rounded-lg data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                    style={{
                      background: clientType === "individual" ? "#5F00BA" : "transparent",
                      color: clientType === "individual" ? "white" : "#666666"
                    }}
                  >
                    <User className="h-5 w-5" />
                    <span className="font-semibold">Particulier</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* API Lookup Section */}
            {clientType === "company" && (
              <div className="p-6 rounded-2xl" style={{ background: "#E6F0FF", border: "1px solid #CCE0FF" }}>
                <h4 className="text-lg font-semibold mb-2 flex items-center" style={{ color: "#111111" }}>
                  <Search className="w-5 h-5 mr-2" style={{ color: "#0064FA" }} />
                  Recherche Automatique
                </h4>
                <p className="text-sm mb-4" style={{ color: "#666666" }}>
                  Saisissez le SIRET ou le nom de l&apos;entreprise pour recuperer automatiquement les informations
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                      SIRET
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="12345678901234"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            setShowSearchModal(true)
                            searchCompany()
                          }
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowSearchModal(true)
                          searchCompany()
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                      Nom de l&apos;entreprise
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Nom de l'entreprise"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            setShowSearchModal(true)
                            searchCompany()
                          }
                        }}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowSearchModal(true)
                          searchCompany()
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-700"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Company Information */}
            <div className="p-6 rounded-2xl" style={{ background: "#F5F5F7" }}>
              <h4 className="text-lg font-semibold mb-6 flex items-center" style={{ color: "#111111" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3" style={{ background: "#E6F0FF" }}>
                  <Building2 className="w-5 h-5" style={{ color: "#0064FA" }} />
                </div>
                {clientType === "company" ? "Informations Entreprise" : "Informations Personnelles"}
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {clientType === "company" ? (
                  <>
                    <div className="lg:col-span-2">
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        Nom de l&apos;entreprise <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        required
                        placeholder="Nom de l'entreprise"
                        className={getInputClassName("companyName")}
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        SIRET
                      </Label>
                      <Input
                        value={formData.siret}
                        onChange={(e) => handleChange("siret", e.target.value)}
                        placeholder="12345678901234"
                        className={getInputClassName("siret")}
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        SIREN
                      </Label>
                      <Input
                        value={formData.siren}
                        onChange={(e) => {
                          handleChange("siren", e.target.value)
                          // Auto-calculate VAT when SIREN changes
                          if (e.target.value.length === 9) {
                            handleChange("vatNumber", calculateVatNumber(e.target.value))
                          }
                        }}
                        placeholder="123456789"
                        className={getInputClassName("siren")}
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        N° TVA Intracommunautaire
                      </Label>
                      <Input
                        value={formData.vatNumber}
                        onChange={(e) => handleChange("vatNumber", e.target.value)}
                        placeholder="FR12345678901"
                        className={getInputClassName("vatNumber")}
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        Code APE
                      </Label>
                      <Input
                        value={formData.apeCode}
                        onChange={(e) => handleChange("apeCode", e.target.value)}
                        placeholder="6201Z"
                        className={getInputClassName("apeCode")}
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        Forme juridique
                      </Label>
                      <Input
                        value={formData.legalForm}
                        onChange={(e) => handleChange("legalForm", e.target.value)}
                        placeholder="SAS, SARL, EURL..."
                        className={getInputClassName("legalForm")}
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        Capital
                      </Label>
                      <Input
                        type="number"
                        value={formData.capital}
                        onChange={(e) => handleChange("capital", e.target.value)}
                        placeholder="10000"
                        className={getInputClassName("capital")}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        Prenom
                      </Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        placeholder="Prenom"
                        className={getInputClassName("first_name")}
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        Nom
                      </Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => handleChange("last_name", e.target.value)}
                        placeholder="Nom"
                        className={getInputClassName("last_name")}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                        Nom complet <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        placeholder="Sera utilisé pour la facturation"
                        required
                        className={getInputClassName("companyName")}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    placeholder="contact@entreprise.com"
                    className={getInputClassName("email")}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Telephone
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="01 23 45 67 89"
                    className={getInputClassName("phone")}
                  />
                </div>
              </div>
            </div>

            {/* Contact Principal */}
            {clientType === "company" && (
              <div className="p-6 rounded-2xl" style={{ background: "#F5F5F7" }}>
                <h4 className="text-lg font-semibold mb-6 flex items-center" style={{ color: "#111111" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3" style={{ background: "#E8F8EE" }}>
                    <User className="w-5 h-5" style={{ color: "#28B95F" }} />
                  </div>
                  Contact Principal
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                      Nom du contact <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={formData.contactFirstname}
                        onChange={(e) => handleChange("contactFirstname", e.target.value)}
                        placeholder="Prenom"
                        className={getInputClassName("contactFirstname")}
                      />
                      <Input
                        value={formData.contactLastname}
                        onChange={(e) => handleChange("contactLastname", e.target.value)}
                        placeholder="Nom"
                        className={getInputClassName("contactLastname")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                      Poste
                    </Label>
                    <Input
                      value={formData.contactPosition}
                      onChange={(e) => handleChange("contactPosition", e.target.value)}
                      placeholder="Directeur, Responsable, etc."
                      className={getInputClassName("contactPosition")}
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                      Email du contact
                    </Label>
                    <Input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleChange("contactEmail", e.target.value)}
                      placeholder="contact@entreprise.com"
                      className={getInputClassName("contactEmail")}
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                      Telephone du contact
                    </Label>
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) => handleChange("contactPhone", e.target.value)}
                      placeholder="06 12 34 56 78"
                      className={getInputClassName("contactPhone")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address */}
            <div className="p-6 rounded-2xl" style={{ background: "#F5F5F7" }}>
              <h4 className="text-lg font-semibold mb-6 flex items-center" style={{ color: "#111111" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3" style={{ background: "#F3E8FF" }}>
                  <MapPin className="w-5 h-5" style={{ color: "#5F00BA" }} />
                </div>
                Adresse
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Adresse complete
                  </Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    rows={2}
                    placeholder="123 rue de la Paix"
                    className={`${getInputClassName("address")} resize-none`}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Code postal
                  </Label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    placeholder="75001"
                    className={getInputClassName("postalCode")}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Ville
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Paris"
                    className={getInputClassName("city")}
                  />
                </div>

                <div>
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Pays
                  </Label>
                  <Select value={formData.country} onValueChange={(v) => handleChange("country", v)}>
                    <SelectTrigger className={getInputClassName("country")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Belgique">Belgique</SelectItem>
                      <SelectItem value="Suisse">Suisse</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Statut
                  </Label>
                  <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                    <SelectTrigger className={getInputClassName("status")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Client Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                    Site web
                  </Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="https://www.entreprise.com"
                    className={getInputClassName("website")}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="block text-sm font-semibold mb-2" style={{ color: "#444444" }}>
                Notes
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
                placeholder="Notes internes sur ce client..."
                className={`${getInputClassName("notes")} resize-none`}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t" style={{ borderColor: "#EEEEEE" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/clients")}
                className="px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                style={{ background: "#FFFFFF", borderColor: "#EEEEEE", color: "#666666" }}
              >
                <X className="w-5 h-5 mr-2" />
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-xl text-white font-semibold transition-all duration-200"
                style={{ background: "#0064FA", boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Créer le Client
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Search Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: "#EEEEEE", background: "#E6F0FF" }}>
            <DialogTitle className="text-xl font-bold flex items-center" style={{ color: "#111111" }}>
              <Search className="w-6 h-6 mr-3" style={{ color: "#0064FA" }} />
              Recherche d&apos;entreprise
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            {/* Search Input */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Saisissez un SIRET ou nom d'entreprise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      searchCompany()
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0064FA]"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
                />
              </div>
              <Button
                onClick={searchCompany}
                disabled={searching}
                className="px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200"
                style={{ background: "#0064FA", boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)" }}
              >
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Loading */}
            {searching && (
              <div className="text-center py-12">
                <div className="inline-flex items-center px-6 py-3 rounded-2xl" style={{ background: "#E6F0FF" }}>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" style={{ color: "#0064FA" }} />
                  <span className="font-semibold" style={{ color: "#0064FA" }}>Recherche en cours...</span>
                </div>
              </div>
            )}

            {/* Results */}
            {!searching && searchResults.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-4" style={{ color: "#111111" }}>
                  Resultats trouves ({searchResults.length})
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.map((company) => (
                    <button
                      key={company.siret}
                      type="button"
                      onClick={() => selectCompany(company)}
                      className="w-full p-4 rounded-2xl cursor-pointer transition-all duration-200 transform hover:scale-[1.01] text-left"
                      style={{ border: "1px solid #EEEEEE", background: "#FFFFFF" }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-semibold text-lg" style={{ color: "#111111" }}>
                            {company.nom_complet || company.nom_raison_sociale || "Nom non disponible"}
                          </h5>
                          <p className="text-sm mt-1" style={{ color: "#666666" }}>
                            SIRET: {company.siret || "Non disponible"}
                          </p>
                          <p className="text-sm" style={{ color: "#666666" }}>
                            {company.siege?.adresse || "Adresse non disponible"}
                          </p>
                          <p className="text-sm" style={{ color: "#666666" }}>
                            {company.siege?.code_postal} {company.siege?.libelle_commune}
                          </p>
                        </div>
                        <div className="ml-4 px-4 py-2 rounded-xl text-white font-semibold text-sm" style={{ background: "#0064FA" }}>
                          Choisir
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {!searching && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <div className="inline-flex items-center px-6 py-3 rounded-2xl" style={{ background: "#FFF9E6" }}>
                  <FileText className="w-6 h-6 mr-3" style={{ color: "#DCB40A" }} />
                  <span className="font-semibold" style={{ color: "#DCB40A" }}>Aucune entreprise trouvee</span>
                </div>
                <p className="mt-2" style={{ color: "#666666" }}>
                  Essayez avec un autre SIRET ou nom d&apos;entreprise
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
