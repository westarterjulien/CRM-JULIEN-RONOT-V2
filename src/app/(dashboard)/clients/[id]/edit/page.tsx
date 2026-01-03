"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Building2, User, Loader2, Landmark, Search, CheckCircle2, FileText } from "lucide-react"

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
}

// Calculate French VAT number from SIREN
function calculateVatNumber(siren: string): string {
  if (!siren || siren.length !== 9) return ""
  const sirenNum = parseInt(siren, 10)
  const key = (12 + 3 * (sirenNum % 97)) % 97
  return `FR${String(key).padStart(2, "0")}${siren}`
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientType, setClientType] = useState<"company" | "individual">("company")

  // Company search states
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([])
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
    notes: "",
    status: "prospect",
    // SEPA
    iban: "",
    bic: "",
    sepaMandate: "",
    sepaMandateDate: "",
    sepaSequenceType: "RCUR",
  })

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${params.id}`)
        if (!res.ok) throw new Error("Not found")
        const data = await res.json()
        const client = data.client

        setClientType(client.client_type || "company")
        setFormData({
          companyName: client.companyName || "",
          first_name: client.first_name || "",
          last_name: client.last_name || "",
          email: client.email || "",
          phone: client.phone || "",
          siret: client.siret || "",
          siren: client.siren || "",
          vatNumber: client.vatNumber || "",
          apeCode: client.apeCode || "",
          legalForm: client.legalForm || "",
          capital: client.capital?.toString() || "",
          address: client.address || "",
          postalCode: client.postalCode || "",
          city: client.city || "",
          country: client.country || "France",
          website: client.website || "",
          contactFirstname: client.contactFirstname || "",
          contactLastname: client.contactLastname || "",
          contactEmail: client.contactEmail || "",
          contactPhone: client.contactPhone || "",
          notes: client.notes || "",
          status: client.status || "prospect",
          // SEPA
          iban: client.iban || "",
          bic: client.bic || "",
          sepaMandate: client.sepaMandate || "",
          sepaMandateDate: client.sepaMandateDate ? client.sepaMandateDate.split("T")[0] : "",
          sepaSequenceType: client.sepaSequenceType || "RCUR",
        })
      } catch (error) {
        console.error(error)
        router.push("/clients")
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [params.id, router])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const searchCompany = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])

    try {
      const isNumber = /^\d+$/.test(searchQuery.replace(/\s/g, ""))
      const endpoint = isNumber
        ? `https://recherche-entreprises.api.gouv.fr/search?q=${searchQuery}&page=1&per_page=10`
        : `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(searchQuery)}&page=1&per_page=10`

      const res = await fetch(endpoint)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error("Search failed:", error)
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
    setSuccessMessage("Informations mises à jour !")
    setTimeout(() => {
      setSuccessMessage("")
      setHighlightedFields([])
    }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          client_type: clientType,
        }),
      })

      if (res.ok) {
        router.push(`/clients/${params.id}`)
      }
    } catch (error) {
      console.error("Failed to update client:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg bg-green-500 text-white">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/clients/${params.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modifier le client</h1>
          <p className="text-muted-foreground">{formData.companyName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Type */}
            <Card>
              <CardHeader>
                <CardTitle>Type de client</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={clientType} onValueChange={(v) => setClientType(v as "company" | "individual")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="company" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Entreprise
                    </TabsTrigger>
                    <TabsTrigger value="individual" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Particulier
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* API Lookup Section */}
            {clientType === "company" && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Search className="h-5 w-5" />
                    Rechercher une entreprise
                  </CardTitle>
                  <CardDescription>
                    Saisissez le SIRET ou le nom pour récupérer automatiquement les informations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="SIRET ou nom de l'entreprise..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          setShowSearchModal(true)
                          searchCompany()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        setShowSearchModal(true)
                        searchCompany()
                      }}
                      disabled={!searchQuery.trim()}
                      className="gradient-primary text-white"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Rechercher
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {clientType === "company" ? (
                  <>
                    <div className="md:col-span-2">
                      <Label htmlFor="companyName">Raison sociale *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="siret">SIRET</Label>
                      <Input
                        id="siret"
                        value={formData.siret}
                        onChange={(e) => handleChange("siret", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="siren">SIREN</Label>
                      <Input
                        id="siren"
                        value={formData.siren}
                        onChange={(e) => handleChange("siren", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vatNumber">N° TVA</Label>
                      <Input
                        id="vatNumber"
                        value={formData.vatNumber}
                        onChange={(e) => handleChange("vatNumber", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="apeCode">Code APE</Label>
                      <Input
                        id="apeCode"
                        value={formData.apeCode}
                        onChange={(e) => handleChange("apeCode", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="legalForm">Forme juridique</Label>
                      <Input
                        id="legalForm"
                        value={formData.legalForm}
                        onChange={(e) => handleChange("legalForm", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="capital">Capital</Label>
                      <Input
                        id="capital"
                        type="number"
                        value={formData.capital}
                        onChange={(e) => handleChange("capital", e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="first_name">Prenom</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Nom</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleChange("last_name", e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="companyName">Nom complet *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Coordonnees</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telephone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                  />
                </div>
                <div></div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Person */}
            {clientType === "company" && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact principal</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="contactFirstname">Prenom</Label>
                    <Input
                      id="contactFirstname"
                      value={formData.contactFirstname}
                      onChange={(e) => handleChange("contactFirstname", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactLastname">Nom</Label>
                    <Input
                      id="contactLastname"
                      value={formData.contactLastname}
                      onChange={(e) => handleChange("contactLastname", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleChange("contactEmail", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Telephone</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => handleChange("contactPhone", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Notes internes sur ce client..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* SEPA Direct Debit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Prélèvement SEPA
                </CardTitle>
                <CardDescription>
                  Informations bancaires pour les prélèvements automatiques
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => handleChange("iban", e.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    maxLength={34}
                  />
                </div>
                <div>
                  <Label htmlFor="bic">BIC</Label>
                  <Input
                    id="bic"
                    value={formData.bic}
                    onChange={(e) => handleChange("bic", e.target.value.toUpperCase())}
                    placeholder="BNPAFRPP"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label htmlFor="sepaMandate">Référence Unique de Mandat (RUM)</Label>
                  <Input
                    id="sepaMandate"
                    value={formData.sepaMandate}
                    onChange={(e) => handleChange("sepaMandate", e.target.value)}
                    placeholder="RUM-2024-001"
                    maxLength={35}
                  />
                </div>
                <div>
                  <Label htmlFor="sepaMandateDate">Date de signature du mandat</Label>
                  <Input
                    id="sepaMandateDate"
                    type="date"
                    value={formData.sepaMandateDate}
                    onChange={(e) => handleChange("sepaMandateDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sepaSequenceType">Type de séquence</Label>
                  <Select
                    value={formData.sepaSequenceType}
                    onValueChange={(v) => handleChange("sepaSequenceType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FRST">Premier prélèvement (FRST)</SelectItem>
                      <SelectItem value="RCUR">Récurrent (RCUR)</SelectItem>
                      <SelectItem value="OOFF">Ponctuel (OOFF)</SelectItem>
                      <SelectItem value="FNAL">Dernier prélèvement (FNAL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statut</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full gradient-primary text-white" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      "Enregistrer les modifications"
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push(`/clients/${params.id}`)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Search Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Recherche d&apos;entreprise
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                placeholder="SIRET ou nom d'entreprise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    searchCompany()
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={searchCompany}
                disabled={searching || !searchQuery.trim()}
                className="gradient-primary text-white"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Loading */}
            {searching && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-muted-foreground">Recherche en cours...</p>
              </div>
            )}

            {/* Results */}
            {!searching && searchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  {searchResults.length} résultat(s) trouvé(s)
                </p>
                {searchResults.map((company, index) => (
                  <button
                    key={company.siret || `company-${index}`}
                    type="button"
                    onClick={() => selectCompany(company)}
                    className="w-full p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="font-semibold">
                      {company.nom_complet || company.nom_raison_sociale}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      SIRET: {company.siret}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {company.siege?.adresse}, {company.siege?.code_postal} {company.siege?.libelle_commune}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {!searching && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">Aucune entreprise trouvée</p>
                <p className="text-sm text-muted-foreground">
                  Essayez avec un autre SIRET ou nom
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
