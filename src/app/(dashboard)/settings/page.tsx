"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Building2,
  Mail,
  CreditCard,
  FileText,
  Save,
  CheckCircle,
  Target,
  Send,
  Plug,
  AlertCircle,
  TrendingUp,
  Euro,
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  Clock,
  Copy,
  Settings,
  ImagePlus,
  Trash2,
  Upload,
  Loader2,
  Puzzle,
  MessageSquare,
  Users,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Building,
  PenTool,
  Webhook,
  Landmark,
} from "lucide-react"
import Image from "next/image"
import { useTenant } from "@/contexts/tenant-context"

interface SettingsData {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  logo: string | null
  settings: {
    ownerName?: string
    siret?: string
    city?: string
    postalCode?: string
    website?: string
    iban?: string
    bic?: string
    bankName?: string
    bankAccountHolder?: string
    paymentTerms?: number
    lateFee?: number
    invoicePrefix?: string
    quotePrefix?: string
    nextInvoiceNumber?: number
    nextQuoteNumber?: number
    invoiceNumberFormat?: string
    quoteNumberFormat?: string
    invoiceFooter?: string
    quoteFooter?: string
    legalMentions?: string
    defaultVatRate?: number
    monthlyGoal?: number
    monthlyGoalMode?: "auto" | "fixed"
    smtpHost?: string
    smtpPort?: number
    smtpUsername?: string
    smtpEncryption?: "tls" | "ssl" | "none"
    smtpFromAddress?: string
    smtpFromName?: string
    ovhAppKey?: string
    ovhAppSecret?: string
    ovhConsumerKey?: string
    ovhEndpoint?: string
    cloudflareApiToken?: string
    // Slack
    slackEnabled?: boolean
    slackWebhookUrl?: string
    slackBotToken?: string
    slackChannelId?: string
    slackNotifyOnNew?: boolean
    slackNotifyOnReply?: boolean
    // OpenAI
    openaiEnabled?: boolean
    openaiApiKey?: string
    openaiModel?: string
    openaiAutoSuggest?: boolean
    openaiAutoClassify?: boolean
    // O365
    o365Enabled?: boolean
    o365ClientId?: string
    o365ClientSecret?: string
    o365TenantId?: string
    o365SupportEmail?: string
    o365AutoSync?: boolean
    o365AllowedGroups?: string
    // GoCardless
    gocardlessEnabled?: boolean
    gocardlessSecretId?: string
    gocardlessSecretKey?: string
    gocardlessEnvironment?: string
    // DocuSeal
    docusealEnabled?: boolean
    docusealApiUrl?: string
    docusealApiKey?: string
    docusealWebhookSecret?: string
    // SEPA
    sepaIcs?: string
    sepaCreditorName?: string
    sepaCreditorIban?: string
    sepaCreditorBic?: string
  }
}

function SettingsContent() {
  const { tenant, refreshTenant } = useTenant()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "company")
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)

  // Company form
  const [companyName, setCompanyName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [siret, setSiret] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")

  // Email form
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpEncryption, setSmtpEncryption] = useState<"tls" | "ssl" | "none">("tls")
  const [smtpFromAddress, setSmtpFromAddress] = useState("")
  const [smtpFromName, setSmtpFromName] = useState("")
  const [testEmail, setTestEmail] = useState("")
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Payment form
  const [bankName, setBankName] = useState("")
  const [bankAccountHolder, setBankAccountHolder] = useState("")
  const [iban, setIban] = useState("")
  const [bic, setBic] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("30")
  const [lateFee, setLateFee] = useState("10")

  // Invoice form
  const [invoicePrefix, setInvoicePrefix] = useState("FAC")
  const [quotePrefix, setQuotePrefix] = useState("DEV")
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("1")
  const [nextQuoteNumber, setNextQuoteNumber] = useState("1")
  const [invoiceNumberFormat, setInvoiceNumberFormat] = useState("{PREFIX}-{YEAR}-{NUMBER}")
  const [quoteNumberFormat, setQuoteNumberFormat] = useState("{PREFIX}-{YEAR}-{NUMBER}")
  const [invoiceFooter, setInvoiceFooter] = useState("")
  const [quoteFooter, setQuoteFooter] = useState("")
  const [legalMentions, setLegalMentions] = useState("")
  const [defaultVatRate, setDefaultVatRate] = useState("20")

  // Goals form
  const [monthlyGoal, setMonthlyGoal] = useState("")
  const [monthlyGoalMode, setMonthlyGoalMode] = useState<"auto" | "fixed">("auto")

  // OVH form
  const [ovhAppKey, setOvhAppKey] = useState("")
  const [ovhAppSecret, setOvhAppSecret] = useState("")
  const [ovhConsumerKey, setOvhConsumerKey] = useState("")
  const [ovhEndpoint, setOvhEndpoint] = useState("ovh-eu")
  const [showOvhSecrets, setShowOvhSecrets] = useState(false)
  const [testingOvh, setTestingOvh] = useState(false)
  const [ovhTestResult, setOvhTestResult] = useState<{ type: "success" | "error"; message: string; domains?: number } | null>(null)
  const [authorizingOvh, setAuthorizingOvh] = useState(false)
  const [ovhAuthResult, setOvhAuthResult] = useState<{ validationUrl: string; consumerKey: string } | null>(null)
  const [copiedCron, setCopiedCron] = useState<string | null>(null)

  // Cloudflare form
  const [cloudflareApiToken, setCloudflareApiToken] = useState("")
  const [showCloudflareToken, setShowCloudflareToken] = useState(false)
  const [testingCloudflare, setTestingCloudflare] = useState(false)
  const [cloudflareTestResult, setCloudflareTestResult] = useState<{ type: "success" | "error"; message: string; zones?: number } | null>(null)

  // Slack
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("")
  const [slackBotToken, setSlackBotToken] = useState("")
  const [slackChannelId, setSlackChannelId] = useState("")
  const [slackNotifyOnNew, setSlackNotifyOnNew] = useState(true)
  const [slackNotifyOnReply, setSlackNotifyOnReply] = useState(true)

  // OpenAI
  const [openaiEnabled, setOpenaiEnabled] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini")
  const [openaiAutoSuggest, setOpenaiAutoSuggest] = useState(true)
  const [openaiAutoClassify, setOpenaiAutoClassify] = useState(false)

  // O365
  const [o365Enabled, setO365Enabled] = useState(false)
  const [o365ClientId, setO365ClientId] = useState("")
  const [o365ClientSecret, setO365ClientSecret] = useState("")
  const [o365TenantId, setO365TenantId] = useState("")
  const [o365SupportEmail, setO365SupportEmail] = useState("")
  const [o365AutoSync, setO365AutoSync] = useState(false)
  const [o365AllowedGroups, setO365AllowedGroups] = useState("")
  const [azureGroups, setAzureGroups] = useState<Array<{ id: string; name: string; description: string; type: string }>>([])
  const [loadingAzureGroups, setLoadingAzureGroups] = useState(false)
  const [azureGroupsError, setAzureGroupsError] = useState("")

  // GoCardless (Bank Account Data)
  const [gocardlessEnabled, setGocardlessEnabled] = useState(false)
  const [gocardlessSecretId, setGocardlessSecretId] = useState("")
  const [gocardlessSecretKey, setGocardlessSecretKey] = useState("")
  const [gocardlessEnvironment, setGocardlessEnvironment] = useState<"sandbox" | "production">("sandbox")

  // DocuSeal (Electronic Signatures)
  const [docusealEnabled, setDocusealEnabled] = useState(false)
  const [docusealApiUrl, setDocusealApiUrl] = useState("https://api.docuseal.com")
  const [docusealApiKey, setDocusealApiKey] = useState("")
  const [docusealWebhookSecret, setDocusealWebhookSecret] = useState("")

  // SEPA Direct Debit
  const [sepaIcs, setSepaIcs] = useState("")
  const [sepaCreditorName, setSepaCreditorName] = useState("")
  const [sepaCreditorIban, setSepaCreditorIban] = useState("")
  const [sepaCreditorBic, setSepaCreditorBic] = useState("")

  const [showIntegrationSecrets, setShowIntegrationSecrets] = useState(false)
  const [integrationTestResult, setIntegrationTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [activeIntegrationTab, setActiveIntegrationTab] = useState("slack")

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data: SettingsData = await res.json()
        setCompanyName(data.name || "")
        setOwnerName(data.settings?.ownerName || "")
        setSiret(data.settings?.siret || "")
        setAddress(data.address || "")
        setCity(data.settings?.city || "")
        setPostalCode(data.settings?.postalCode || "")
        setPhone(data.phone || "")
        setEmail(data.email || "")
        setWebsite(data.settings?.website || "")
        setSmtpHost(data.settings?.smtpHost || "")
        setSmtpPort(data.settings?.smtpPort?.toString() || "587")
        setSmtpUser(data.settings?.smtpUsername || "")
        setSmtpEncryption(data.settings?.smtpEncryption || "tls")
        setSmtpFromAddress(data.settings?.smtpFromAddress || data.email || "")
        setSmtpFromName(data.settings?.smtpFromName || data.name || "")
        setTestEmail(data.email || "")
        setBankName(data.settings?.bankName || "")
        setBankAccountHolder(data.settings?.bankAccountHolder || "")
        setIban(data.settings?.iban || "")
        setBic(data.settings?.bic || "")
        setPaymentTerms(data.settings?.paymentTerms?.toString() || "30")
        setLateFee(data.settings?.lateFee?.toString() || "10")
        setInvoicePrefix(data.settings?.invoicePrefix || "FAC")
        setQuotePrefix(data.settings?.quotePrefix || "DEV")
        setNextInvoiceNumber(data.settings?.nextInvoiceNumber?.toString() || "1")
        setNextQuoteNumber(data.settings?.nextQuoteNumber?.toString() || "1")
        setInvoiceNumberFormat(data.settings?.invoiceNumberFormat || "{PREFIX}-{YEAR}-{NUMBER}")
        setQuoteNumberFormat(data.settings?.quoteNumberFormat || "{PREFIX}-{YEAR}-{NUMBER}")
        setInvoiceFooter(data.settings?.invoiceFooter || "")
        setQuoteFooter(data.settings?.quoteFooter || "")
        setLegalMentions(data.settings?.legalMentions || "")
        setDefaultVatRate(data.settings?.defaultVatRate?.toString() || "20")
        setMonthlyGoal(data.settings?.monthlyGoal?.toString() || "")
        setMonthlyGoalMode(data.settings?.monthlyGoalMode || "auto")
        setOvhAppKey(data.settings?.ovhAppKey || "")
        setOvhAppSecret(data.settings?.ovhAppSecret || "")
        setOvhConsumerKey(data.settings?.ovhConsumerKey || "")
        setOvhEndpoint(data.settings?.ovhEndpoint || "ovh-eu")
        setCloudflareApiToken(data.settings?.cloudflareApiToken || "")
        // Integrations
        setSlackEnabled(data.settings?.slackEnabled || false)
        setSlackWebhookUrl(data.settings?.slackWebhookUrl || "")
        setSlackBotToken(data.settings?.slackBotToken || "")
        setSlackChannelId(data.settings?.slackChannelId || "")
        setSlackNotifyOnNew(data.settings?.slackNotifyOnNew ?? true)
        setSlackNotifyOnReply(data.settings?.slackNotifyOnReply ?? true)
        setOpenaiEnabled(data.settings?.openaiEnabled || false)
        setOpenaiApiKey(data.settings?.openaiApiKey || "")
        setOpenaiModel(data.settings?.openaiModel || "gpt-4o-mini")
        setOpenaiAutoSuggest(data.settings?.openaiAutoSuggest ?? true)
        setOpenaiAutoClassify(data.settings?.openaiAutoClassify ?? false)
        setO365Enabled(data.settings?.o365Enabled || false)
        setO365ClientId(data.settings?.o365ClientId || "")
        setO365ClientSecret(data.settings?.o365ClientSecret || "")
        setO365TenantId(data.settings?.o365TenantId || "")
        setO365SupportEmail(data.settings?.o365SupportEmail || "")
        setO365AutoSync(data.settings?.o365AutoSync ?? false)
        setO365AllowedGroups(data.settings?.o365AllowedGroups || "")

        // GoCardless
        setGocardlessEnabled(data.settings?.gocardlessEnabled || false)
        setGocardlessSecretId(data.settings?.gocardlessSecretId || "")
        setGocardlessSecretKey(data.settings?.gocardlessSecretKey || "")
        setGocardlessEnvironment((data.settings?.gocardlessEnvironment as "sandbox" | "production") || "sandbox")

        // DocuSeal
        setDocusealEnabled(data.settings?.docusealEnabled || false)
        setDocusealApiUrl(data.settings?.docusealApiUrl || "https://api.docuseal.com")
        setDocusealApiKey(data.settings?.docusealApiKey || "")
        setDocusealWebhookSecret(data.settings?.docusealWebhookSecret || "")

        // SEPA
        setSepaIcs(data.settings?.sepaIcs || "")
        setSepaCreditorName(data.settings?.sepaCreditorName || "")
        setSepaCreditorIban(data.settings?.sepaCreditorIban || "")
        setSepaCreditorBic(data.settings?.sepaCreditorBic || "")
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (section: string, data: Record<string, unknown>) => {
    setSaving(section)
    setSaved(null)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, ...data }),
      })
      if (res.ok) {
        setSaved(section)
        setTimeout(() => setSaved(null), 3000)
        if (section !== "ovh") fetchSettings()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'enregistrement")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Erreur lors de l'enregistrement")
    } finally {
      setSaving(null)
    }
  }

  const testSmtpConnection = async () => {
    setTestingSmtp(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtpHost, smtpPort: parseInt(smtpPort), smtpUser, smtpPassword, smtpEncryption }),
      })
      const data = await res.json()
      setTestResult({ type: data.success ? "success" : "error", message: data.message })
    } catch {
      setTestResult({ type: "error", message: "Erreur lors du test de connexion" })
    } finally {
      setTestingSmtp(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      setTestResult({ type: "error", message: "Veuillez saisir une adresse email de test" })
      return
    }
    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/settings/smtp/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtpHost, smtpPort: parseInt(smtpPort), smtpUser, smtpPassword, smtpEncryption, smtpFromAddress, smtpFromName, testEmail }),
      })
      const data = await res.json()
      setTestResult({ type: data.success ? "success" : "error", message: data.message })
    } catch {
      setTestResult({ type: "error", message: "Erreur lors de l'envoi" })
    } finally {
      setSendingTest(false)
    }
  }

  const testOvhConnection = async () => {
    setTestingOvh(true)
    setOvhTestResult(null)
    try {
      const res = await fetch("/api/settings/ovh/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey: ovhAppKey, appSecret: ovhAppSecret, consumerKey: ovhConsumerKey, endpoint: ovhEndpoint }),
      })
      const data = await res.json()
      setOvhTestResult({ type: data.success ? "success" : "error", message: data.message, domains: data.domains })
    } catch {
      setOvhTestResult({ type: "error", message: "Erreur lors du test OVH" })
    } finally {
      setTestingOvh(false)
    }
  }

  const authorizeOvh = async () => {
    if (!ovhAppKey || !ovhAppSecret) {
      setOvhTestResult({ type: "error", message: "Veuillez saisir l'Application Key et Secret" })
      return
    }
    setAuthorizingOvh(true)
    setOvhTestResult(null)
    setOvhAuthResult(null)
    try {
      const res = await fetch("/api/settings/ovh/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey: ovhAppKey, appSecret: ovhAppSecret, endpoint: ovhEndpoint }),
      })
      const data = await res.json()
      if (res.ok && data.validationUrl) {
        setOvhAuthResult({ validationUrl: data.validationUrl, consumerKey: data.consumerKey })
        setOvhConsumerKey(data.consumerKey)
        setShowOvhSecrets(true)
      } else {
        setOvhTestResult({ type: "error", message: data.error || "Erreur d'autorisation" })
      }
    } catch {
      setOvhTestResult({ type: "error", message: "Erreur d'autorisation OVH" })
    } finally {
      setAuthorizingOvh(false)
    }
  }

  const testCloudflareConnection = async () => {
    setTestingCloudflare(true)
    setCloudflareTestResult(null)
    try {
      const res = await fetch("/api/settings/cloudflare/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: cloudflareApiToken }),
      })
      const data = await res.json()
      setCloudflareTestResult({ type: data.success ? "success" : "error", message: data.message, zones: data.zones })
    } catch {
      setCloudflareTestResult({ type: "error", message: "Erreur de connexion Cloudflare" })
    } finally {
      setTestingCloudflare(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setLogoError(null)

    const formData = new FormData()
    formData.append("logo", file)

    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        refreshTenant()
        setSaved("appearance")
        setTimeout(() => setSaved(null), 3000)
      } else {
        setLogoError(data.error || "Erreur lors de l'upload")
      }
    } catch {
      setLogoError("Erreur lors de l'upload du logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!confirm("Supprimer le logo ?")) return

    setDeletingLogo(true)
    setLogoError(null)

    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" })
      if (res.ok) {
        refreshTenant()
        setSaved("appearance")
        setTimeout(() => setSaved(null), 3000)
      } else {
        const data = await res.json()
        setLogoError(data.error || "Erreur lors de la suppression")
      }
    } catch {
      setLogoError("Erreur lors de la suppression du logo")
    } finally {
      setDeletingLogo(false)
    }
  }

  const formatIban = (value: string) => value.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim()
  const formatCurrency = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCron(id)
    setTimeout(() => setCopiedCron(null), 2000)
  }
  const getBaseUrl = () => typeof window !== "undefined" ? window.location.origin : "https://votre-domaine.com"

  // Integration test functions
  const testSlack = async () => {
    setSaving("slack-test")
    setIntegrationTestResult(null)
    try {
      const res = await fetch("/api/tickets/settings/test-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: slackWebhookUrl, botToken: slackBotToken, channelId: slackChannelId }),
      })
      const data = await res.json()
      setIntegrationTestResult({ type: data.success ? "success" : "error", message: data.message })
    } catch {
      setIntegrationTestResult({ type: "error", message: "Erreur lors du test Slack" })
    } finally {
      setSaving(null)
    }
  }

  const testOpenAI = async () => {
    setSaving("openai-test")
    setIntegrationTestResult(null)
    try {
      const res = await fetch("/api/tickets/settings/test-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: openaiApiKey, model: openaiModel }),
      })
      const data = await res.json()
      setIntegrationTestResult({ type: data.success ? "success" : "error", message: data.message })
    } catch {
      setIntegrationTestResult({ type: "error", message: "Erreur lors du test OpenAI" })
    } finally {
      setSaving(null)
    }
  }

  const testO365 = async () => {
    setSaving("o365-test")
    setIntegrationTestResult(null)
    try {
      const res = await fetch("/api/tickets/settings/test-o365", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: o365ClientId, clientSecret: o365ClientSecret, tenantId: o365TenantId, supportEmail: o365SupportEmail }),
      })
      const data = await res.json()
      setIntegrationTestResult({ type: data.success ? "success" : "error", message: data.message })
    } catch {
      setIntegrationTestResult({ type: "error", message: "Erreur lors du test O365" })
    } finally {
      setSaving(null)
    }
  }

  const fetchAzureGroups = async () => {
    setLoadingAzureGroups(true)
    setAzureGroupsError("")
    try {
      const res = await fetch("/api/settings/azure-groups")
      const data = await res.json()
      if (data.groups) {
        setAzureGroups(data.groups)
      } else {
        setAzureGroupsError(data.error || "Erreur lors de la récupération des groupes")
      }
    } catch {
      setAzureGroupsError("Erreur lors de la récupération des groupes")
    } finally {
      setLoadingAzureGroups(false)
    }
  }

  const toggleAzureGroup = (groupId: string) => {
    const currentGroups = o365AllowedGroups ? o365AllowedGroups.split(",").map(g => g.trim()).filter(Boolean) : []
    if (currentGroups.includes(groupId)) {
      setO365AllowedGroups(currentGroups.filter(g => g !== groupId).join(", "))
    } else {
      setO365AllowedGroups([...currentGroups, groupId].join(", "))
    }
  }

  const isGroupSelected = (groupId: string): boolean => {
    const currentGroups = o365AllowedGroups ? o365AllowedGroups.split(",").map(g => g.trim()).filter(Boolean) : []
    return currentGroups.includes(groupId)
  }

  const tabs = [
    { id: "company", label: "Entreprise", icon: Building2, color: "#0064FA" },
    { id: "appearance", label: "Apparence", icon: ImagePlus, color: "#5F00BA" },
    { id: "goals", label: "Objectifs", icon: Target, color: "#28B95F" },
    { id: "email", label: "Email", icon: Mail, color: "#5F00BA" },
    { id: "payment", label: "Paiement", icon: CreditCard, color: "#28B95F" },
    { id: "invoice", label: "Facturation", icon: FileText, color: "#F0783C" },
    { id: "dns", label: "DNS", icon: Globe, color: "#14B4E6" },
    { id: "integrations", label: "Intégrations", icon: Puzzle, color: "#28B95F" },
  ]

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "#EEEEEE", borderTopColor: "#5F00BA" }}
          />
          <p style={{ color: "#666666" }}>Chargement des paramètres...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#5F00BA" }}
          >
            <Settings className="h-7 w-7" style={{ color: "#FFFFFF" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
              Paramètres
            </h1>
            <p className="text-sm" style={{ color: "#666666" }}>
              Configurez votre entreprise et vos préférences
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="rounded-2xl p-2 flex flex-wrap gap-1"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isActive ? tab.color : "transparent",
                color: isActive ? "#FFFFFF" : "#666666",
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Company Tab */}
      {activeTab === "company" && (
        <div
          className="rounded-2xl p-6 w-full space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E3F2FD" }}>
              <Building2 className="h-5 w-5" style={{ color: "#0064FA" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Informations de l&apos;entreprise</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Ces informations apparaissent sur vos factures et devis</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Nom de l&apos;entreprise *</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Mon Entreprise" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Nom du gérant/responsable</label>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jean Dupont" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
              <p className="text-xs" style={{ color: "#999999" }}>Utilisé pour les signatures de contrats</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>SIRET</label>
              <input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@entreprise.com" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Adresse</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Rue Example" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Code postal</label>
              <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Ville</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 1 23 45 67 89" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Site web</label>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.entreprise.com" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
            <button onClick={() => handleSave("company", { name: companyName, ownerName, siret, address, city, postalCode, phone, email, website })} disabled={saving === "company"} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#0064FA", color: "#FFFFFF" }}>
              {saving === "company" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
            {saved === "company" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EDE9FE" }}>
              <ImagePlus className="h-5 w-5" style={{ color: "#5F00BA" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Apparence</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Personnalisez votre logo et identité visuelle</p>
            </div>
          </div>

          {/* Logo Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium" style={{ color: "#444444" }}>Logo de l&apos;entreprise</h3>
            <p className="text-sm" style={{ color: "#666666" }}>
              Ce logo sera affiché dans la barre latérale, sur les pages de connexion et sur vos documents (factures, devis).
            </p>

            {logoError && (
              <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "#FEE2E8", border: "1px solid #F04B69" }}>
                <AlertCircle className="h-4 w-4" style={{ color: "#F04B69" }} />
                <span className="text-sm" style={{ color: "#F04B69" }}>{logoError}</span>
              </div>
            )}

            <div className="flex items-start gap-6">
              {/* Current Logo Preview */}
              <div className="flex-shrink-0">
                <div
                  className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden"
                  style={{ background: "#F5F5F7", border: "2px dashed #DDDDDD" }}
                >
                  {tenant?.logo ? (
                    <Image
                      src={`/uploads/${tenant.logo}`}
                      alt="Logo actuel"
                      width={96}
                      height={96}
                      className="object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <ImagePlus className="h-8 w-8 mx-auto" style={{ color: "#CCCCCC" }} />
                      <span className="text-xs mt-1 block" style={{ color: "#999999" }}>Aucun logo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all hover:opacity-90" style={{ background: "#0064FA", color: "#FFFFFF" }}>
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {tenant?.logo ? "Changer le logo" : "Uploader un logo"}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>

                  {tenant?.logo && (
                    <button
                      onClick={handleLogoDelete}
                      disabled={deletingLogo}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: "#FEE2E8", color: "#F04B69" }}
                    >
                      {deletingLogo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="text-xs" style={{ color: "#999999" }}>
                  <p>Formats acceptés : JPG, PNG, GIF, WebP, SVG</p>
                  <p>Taille maximum : 2 Mo</p>
                  <p>Dimensions recommandées : 200x200 pixels minimum</p>
                </div>
              </div>
            </div>
          </div>

          {saved === "appearance" && (
            <div className="flex items-center gap-2 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
              <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}>
                <CheckCircle className="h-4 w-4" />
                Logo mis à jour avec succès
              </span>
            </div>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4EDDA" }}>
              <Target className="h-5 w-5" style={{ color: "#28B95F" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Objectifs commerciaux</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Définissez vos objectifs de chiffre d&apos;affaires</p>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: "#D4EDDA" }}>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 mt-0.5" style={{ color: "#28B95F" }} />
              <div className="text-sm" style={{ color: "#1E7E34" }}>
                <p className="font-medium">Objectif mensuel</p>
                <p className="mt-1">Cet objectif est affiché sur votre tableau de bord. En mode automatique, il est calculé selon vos performances passées.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Mode de calcul</label>
              <select value={monthlyGoalMode} onChange={(e) => setMonthlyGoalMode(e.target.value as "auto" | "fixed")} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="auto">Automatique (basé sur l&apos;historique)</option>
                <option value="fixed">Fixe (objectif manuel)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Objectif CA mensuel (EUR)</label>
              <div className="relative">
                <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(e.target.value)} placeholder={monthlyGoalMode === "auto" ? "Calcul auto" : "Ex: 10000"} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 pr-10" style={inputStyle} />
                <Euro className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#999999" }} />
              </div>
              {monthlyGoal && <p className="text-sm" style={{ color: "#28B95F" }}>Objectif : {formatCurrency(parseInt(monthlyGoal))} / mois</p>}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
            <button onClick={() => handleSave("goals", { monthlyGoal: monthlyGoal ? parseInt(monthlyGoal) : null, monthlyGoalMode })} disabled={saving === "goals"} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#28B95F", color: "#FFFFFF" }}>
              {saving === "goals" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
            {saved === "goals" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === "email" && (
        <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
              <Mail className="h-5 w-5" style={{ color: "#5F00BA" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Configuration Email (SMTP)</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Configurez l&apos;envoi d&apos;emails</p>
            </div>
          </div>

          {testResult && (
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: testResult.type === "success" ? "#D4EDDA" : "#FEE2E8", color: testResult.type === "success" ? "#28B95F" : "#F04B69" }}>
              {testResult.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Serveur SMTP *</label>
              <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Port *</label>
              <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Nom d&apos;utilisateur *</label>
              <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="user@gmail.com" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Mot de passe *</label>
              <input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Chiffrement *</label>
              <select value={smtpEncryption} onChange={(e) => setSmtpEncryption(e.target.value as "tls" | "ssl" | "none")} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                <option value="tls">TLS (port 587)</option>
                <option value="ssl">SSL (port 465)</option>
                <option value="none">Aucun (port 25)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Adresse d&apos;envoi *</label>
              <input type="email" value={smtpFromAddress} onChange={(e) => setSmtpFromAddress(e.target.value)} placeholder="noreply@entreprise.com" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Nom d&apos;expéditeur *</label>
              <input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} placeholder="Mon Entreprise" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Email de test</label>
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
            <button onClick={testSmtpConnection} disabled={testingSmtp || !smtpHost || !smtpUser} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#F5F5F7", color: "#444444", border: "1px solid #EEEEEE" }}>
              {testingSmtp ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Plug className="h-4 w-4" />}
              Tester la connexion
            </button>
            <button onClick={sendTestEmail} disabled={sendingTest || !testEmail} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#F5F5F7", color: "#444444", border: "1px solid #EEEEEE" }}>
              {sendingTest ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer un test
            </button>
            <button onClick={() => handleSave("email", { smtpHost, smtpPort: parseInt(smtpPort), smtpUsername: smtpUser, smtpPassword, smtpEncryption, smtpFromAddress, smtpFromName })} disabled={saving === "email"} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#5F00BA", color: "#FFFFFF" }}>
              {saving === "email" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
            {saved === "email" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
          </div>
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === "payment" && (
        <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4EDDA" }}>
              <CreditCard className="h-5 w-5" style={{ color: "#28B95F" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Informations bancaires (RIB)</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Configurez vos informations bancaires et conditions de paiement</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Nom de la banque</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex: Crédit Agricole" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Titulaire du compte</label>
              <input value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} placeholder="Nom du titulaire" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>IBAN</label>
              <input value={iban} onChange={(e) => setIban(formatIban(e.target.value))} placeholder="FR76 1234 5678 9012 3456 7890 123" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>BIC / SWIFT</label>
              <input value={bic} onChange={(e) => setBic(e.target.value.toUpperCase())} placeholder="AGRIFRPPXXX" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Délai de paiement (jours)</label>
              <input type="number" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="30" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Pénalités de retard (%)</label>
              <input type="number" value={lateFee} onChange={(e) => setLateFee(e.target.value)} placeholder="10" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
            <button onClick={() => handleSave("payment", { bankName, bankAccountHolder, iban, bic, paymentTerms: parseInt(paymentTerms) || 30, lateFee: parseInt(lateFee) || 10 })} disabled={saving === "payment"} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#28B95F", color: "#FFFFFF" }}>
              {saving === "payment" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
            {saved === "payment" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
          </div>
        </div>
      )}

      {/* Invoice Tab */}
      {activeTab === "invoice" && (
        <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3CD" }}>
              <FileText className="h-5 w-5" style={{ color: "#F0783C" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Paramètres de facturation</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Configurez vos préférences de factures et devis</p>
            </div>
          </div>

          {/* Numérotation Factures */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold" style={{ color: "#111111" }}>Numérotation des factures</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Préfixe</label>
                <input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="FAC" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Prochain numéro</label>
                <input type="number" min="1" value={nextInvoiceNumber} onChange={(e) => setNextInvoiceNumber(e.target.value)} placeholder="1" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Format</label>
                <select value={invoiceNumberFormat} onChange={(e) => setInvoiceNumberFormat(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="{PREFIX}-{YEAR}-{NUMBER}">{invoicePrefix}-2025-001</option>
                  <option value="{PREFIX}{YEAR}{NUMBER}">{invoicePrefix}2025001</option>
                  <option value="{PREFIX}-{NUMBER}">{invoicePrefix}-001</option>
                  <option value="{YEAR}-{NUMBER}">2025-001</option>
                </select>
              </div>
            </div>
            <p className="text-xs" style={{ color: "#999999" }}>Aperçu: {invoiceNumberFormat.replace("{PREFIX}", invoicePrefix).replace("{YEAR}", new Date().getFullYear().toString()).replace("{NUMBER}", nextInvoiceNumber.padStart(3, "0"))}</p>
          </div>

          {/* Numérotation Devis */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold" style={{ color: "#111111" }}>Numérotation des devis</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Préfixe</label>
                <input value={quotePrefix} onChange={(e) => setQuotePrefix(e.target.value)} placeholder="DEV" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Prochain numéro</label>
                <input type="number" min="1" value={nextQuoteNumber} onChange={(e) => setNextQuoteNumber(e.target.value)} placeholder="1" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Format</label>
                <select value={quoteNumberFormat} onChange={(e) => setQuoteNumberFormat(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="{PREFIX}-{YEAR}-{NUMBER}">{quotePrefix}-2025-001</option>
                  <option value="{PREFIX}{YEAR}{NUMBER}">{quotePrefix}2025001</option>
                  <option value="{PREFIX}-{NUMBER}">{quotePrefix}-001</option>
                  <option value="{YEAR}-{NUMBER}">2025-001</option>
                </select>
              </div>
            </div>
            <p className="text-xs" style={{ color: "#999999" }}>Aperçu: {quoteNumberFormat.replace("{PREFIX}", quotePrefix).replace("{YEAR}", new Date().getFullYear().toString()).replace("{NUMBER}", nextQuoteNumber.padStart(3, "0"))}</p>
          </div>

          {/* Autres paramètres */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Taux TVA par défaut (%)</label>
              <input type="number" value={defaultVatRate} onChange={(e) => setDefaultVatRate(e.target.value)} placeholder="20" className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>Pied de page facture</label>
            <textarea value={invoiceFooter} onChange={(e) => setInvoiceFooter(e.target.value)} placeholder="En cas de retard de paiement..." rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none" style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>Pied de page devis</label>
            <textarea value={quoteFooter} onChange={(e) => setQuoteFooter(e.target.value)} placeholder="Devis valable 30 jours..." rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none" style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>Mentions légales</label>
            <textarea value={legalMentions} onChange={(e) => setLegalMentions(e.target.value)} placeholder="SIRET, TVA intracommunautaire..." rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none" style={inputStyle} />
          </div>

          <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
            <button onClick={() => handleSave("invoice", { invoicePrefix, quotePrefix, nextInvoiceNumber: parseInt(nextInvoiceNumber) || 1, nextQuoteNumber: parseInt(nextQuoteNumber) || 1, invoiceNumberFormat, quoteNumberFormat, invoiceFooter, quoteFooter, legalMentions, defaultVatRate: parseInt(defaultVatRate) || 20 })} disabled={saving === "invoice"} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#F0783C", color: "#FFFFFF" }}>
              {saving === "invoice" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
            {saved === "invoice" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
          </div>
        </div>
      )}

      {/* DNS Tab */}
      {activeTab === "dns" && (
        <div className="space-y-6">
          {/* OVH Section */}
          <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E3F2FD" }}>
                <Globe className="h-5 w-5" style={{ color: "#14B4E6" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Configuration OVH</h2>
                <p className="text-sm" style={{ color: "#666666" }}>Connectez votre compte OVH pour gérer vos domaines</p>
              </div>
            </div>

            {ovhTestResult && (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: ovhTestResult.type === "success" ? "#D4EDDA" : "#FEE2E8", color: ovhTestResult.type === "success" ? "#28B95F" : "#F04B69" }}>
                {ovhTestResult.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <span>{ovhTestResult.message} {ovhTestResult.domains !== undefined && `(${ovhTestResult.domains} domaines)`}</span>
              </div>
            )}

            {ovhAuthResult && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: "#FEF3CD", border: "1px solid #DCB40A" }}>
                <h4 className="font-medium" style={{ color: "#111111" }}>Autorisation requise</h4>
                <p className="text-sm" style={{ color: "#666666" }}>Cliquez sur le bouton ci-dessous pour autoriser l&apos;accès à vos domaines OVH.</p>
                <div className="space-y-2">
                  <p className="text-sm"><span style={{ color: "#666666" }}>Consumer Key : </span><code className="px-2 py-0.5 rounded font-mono text-sm" style={{ background: "#FFFFFF" }}>{ovhAuthResult.consumerKey}</code></p>
                  <a href={ovhAuthResult.validationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#DCB40A", color: "#111111" }}>
                    <Globe className="h-4 w-4" />
                    Autoriser sur OVH
                  </a>
                </div>
              </div>
            )}

            <div className="rounded-xl p-4" style={{ background: "#E3F2FD" }}>
              <h4 className="font-medium mb-2" style={{ color: "#0064FA" }}>Méthode simple : Token avec toutes les permissions</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#0052CC" }}>
                <li>Allez sur <a href="https://eu.api.ovh.com/createToken/?GET=/domain&GET=/domain/*&PUT=/domain/*&GET=/domain/zone/*&POST=/domain/zone/*&PUT=/domain/zone/*&DELETE=/domain/zone/*" target="_blank" rel="noopener noreferrer" className="underline font-medium">ce lien OVH (pré-configuré)</a></li>
                <li>Connectez-vous avec votre compte OVH</li>
                <li>Définissez une durée de validité</li>
                <li>Cliquez sur &quot;Create keys&quot;</li>
                <li>Copiez les 3 clés générées ci-dessous</li>
              </ol>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Endpoint OVH</label>
                <select value={ovhEndpoint} onChange={(e) => setOvhEndpoint(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2" style={inputStyle}>
                  <option value="ovh-eu">OVH Europe (ovh-eu)</option>
                  <option value="ovh-ca">OVH Canada (ovh-ca)</option>
                  <option value="ovh-us">OVH US (ovh-us)</option>
                  <option value="kimsufi-eu">Kimsufi Europe</option>
                  <option value="soyoustart-eu">SoYouStart Europe</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Application Key *</label>
                <div className="relative">
                  <input type={showOvhSecrets ? "text" : "password"} value={ovhAppKey} onChange={(e) => setOvhAppKey(e.target.value)} placeholder="47c321e698c6430c" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 pr-10" style={inputStyle} />
                  <button type="button" onClick={() => setShowOvhSecrets(!showOvhSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#999999" }}>
                    {showOvhSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Application Secret *</label>
                <input type={showOvhSecrets ? "text" : "password"} value={ovhAppSecret} onChange={(e) => setOvhAppSecret(e.target.value)} placeholder="••••••••••••••••••••••••••••••" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "#444444" }}>Consumer Key *</label>
                <input type={showOvhSecrets ? "text" : "password"} value={ovhConsumerKey} onChange={(e) => setOvhConsumerKey(e.target.value)} placeholder="••••••••••••••••••••••••••••••" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2" style={inputStyle} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
              <button onClick={authorizeOvh} disabled={authorizingOvh || !ovhAppKey || !ovhAppSecret} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#F5F5F7", color: "#444444", border: "1px solid #EEEEEE" }}>
                {authorizingOvh ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <Plug className="h-4 w-4" />}
                Générer Consumer Key
              </button>
              <button onClick={testOvhConnection} disabled={testingOvh || !ovhAppKey || !ovhAppSecret || !ovhConsumerKey} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#F5F5F7", color: "#444444", border: "1px solid #EEEEEE" }}>
                {testingOvh ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Tester la connexion
              </button>
              <button onClick={() => handleSave("ovh", { ovhAppKey, ovhAppSecret, ovhConsumerKey, ovhEndpoint })} disabled={saving === "ovh"} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#14B4E6", color: "#FFFFFF" }}>
                {saving === "ovh" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
              {saved === "ovh" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
            </div>

            {/* Cron Section */}
            <div className="pt-6 mt-6 space-y-4" style={{ borderTop: "1px solid #EEEEEE" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#5F00BA" }}>
                  <Clock className="h-4 w-4" style={{ color: "#FFFFFF" }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "#111111" }}>Automatisation (Cron)</h3>
                  <p className="text-sm" style={{ color: "#666666" }}>Configurez des tâches automatiques</p>
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-4" style={{ background: "#F3E8FF" }}>
                <p className="text-sm" style={{ color: "#5F00BA" }}>Ajoutez ces commandes à votre crontab pour automatiser la synchronisation des domaines.</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-sm" style={{ color: "#5F00BA" }}>1. Synchroniser les domaines OVH (6h00)</label>
                    <button onClick={() => copyToClipboard(`0 6 * * * curl -X POST ${getBaseUrl()}/api/domains/sync`, "sync")} className="flex items-center gap-1 text-xs" style={{ color: "#5F00BA" }}>
                      {copiedCron === "sync" ? <><CheckCircle className="h-3 w-3" />Copié</> : <><Copy className="h-3 w-3" />Copier</>}
                    </button>
                  </div>
                  <code className="block p-3 rounded-lg text-sm font-mono overflow-x-auto" style={{ background: "#111111", color: "#FFFFFF" }}>0 6 * * * curl -X POST {getBaseUrl()}/api/domains/sync</code>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-sm" style={{ color: "#5F00BA" }}>2. Vérifier les expirations (7h00)</label>
                    <button onClick={() => copyToClipboard(`0 7 * * * curl -X POST ${getBaseUrl()}/api/domains/check-renewals -H "Content-Type: application/json" -d '{"days": 30}'`, "renewals")} className="flex items-center gap-1 text-xs" style={{ color: "#5F00BA" }}>
                      {copiedCron === "renewals" ? <><CheckCircle className="h-3 w-3" />Copié</> : <><Copy className="h-3 w-3" />Copier</>}
                    </button>
                  </div>
                  <code className="block p-3 rounded-lg text-sm font-mono overflow-x-auto break-all" style={{ background: "#111111", color: "#FFFFFF" }}>0 7 * * * curl -X POST {getBaseUrl()}/api/domains/check-renewals -H &quot;Content-Type: application/json&quot; -d &apos;{`{"days": 30}`}&apos;</code>
                </div>
              </div>
            </div>
          </div>

          {/* Cloudflare Section */}
          <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3CD" }}>
                <svg className="h-5 w-5" style={{ color: "#F0783C" }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713.1547.1547 0 0 1-.0049-.1499c.0355-.0752.1087-.127.1885-.131l8.7573-.1123c1.0351-.0445 2.1582-.8935 2.5372-1.9185l.4905-1.319c.0119-.0337.018-.0693.018-.1053 0-.0293-.0033-.0585-.01-.0866a7.4543 7.4543 0 0 0-7.3893-6.1279 7.4646 7.4646 0 0 0-7.0837 5.0186 3.3048 3.3048 0 0 0-2.3113-.5382 3.2703 3.2703 0 0 0-2.7351 2.6953 3.416 3.416 0 0 0 .0371.9968A4.4968 4.4968 0 0 0 .0068 17.2c.0068 2.3912 1.9178 4.3404 4.2974 4.3404l11.6631.0008c.6366 0 1.2387-.2617 1.6953-.7373.4566-.4747.7086-1.1037.7098-1.7703.0008-.5273-.1697-1.0313-.4636-1.4489z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Configuration Cloudflare</h2>
                <p className="text-sm" style={{ color: "#666666" }}>Connectez votre compte Cloudflare pour gérer les zones DNS</p>
              </div>
            </div>

            {cloudflareTestResult && (
              <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: cloudflareTestResult.type === "success" ? "#D4EDDA" : "#FEE2E8", color: cloudflareTestResult.type === "success" ? "#28B95F" : "#F04B69" }}>
                {cloudflareTestResult.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <span>{cloudflareTestResult.message} {cloudflareTestResult.zones !== undefined && `(${cloudflareTestResult.zones} zones)`}</span>
              </div>
            )}

            <div className="rounded-xl p-4" style={{ background: "#FEF3CD" }}>
              <h4 className="font-medium mb-2" style={{ color: "#F0783C" }}>Comment obtenir un token API Cloudflare</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#C4680A" }}>
                <li>Allez sur <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="underline font-medium">Cloudflare Dashboard → API Tokens</a></li>
                <li>Cliquez sur &quot;Create Token&quot;</li>
                <li>Utilisez le template &quot;Edit zone DNS&quot;</li>
                <li>Sélectionnez les zones concernées</li>
                <li>Copiez le token</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>API Token *</label>
              <div className="relative">
                <input type={showCloudflareToken ? "text" : "password"} value={cloudflareApiToken} onChange={(e) => setCloudflareApiToken(e.target.value)} placeholder="Votre token API Cloudflare" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 pr-10" style={inputStyle} />
                <button type="button" onClick={() => setShowCloudflareToken(!showCloudflareToken)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#999999" }}>
                  {showCloudflareToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs" style={{ color: "#999999" }}>Le token doit avoir les permissions &quot;Zone:DNS:Edit&quot; et &quot;Zone:Zone:Read&quot;</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
              <button onClick={testCloudflareConnection} disabled={testingCloudflare || !cloudflareApiToken} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#F5F5F7", color: "#444444", border: "1px solid #EEEEEE" }}>
                {testingCloudflare ? <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Tester la connexion
              </button>
              <button onClick={() => handleSave("cloudflare", { cloudflareApiToken })} disabled={saving === "cloudflare"} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50" style={{ background: "#F0783C", color: "#FFFFFF" }}>
                {saving === "cloudflare" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
              {saved === "cloudflare" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
            </div>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl p-6 w-full" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4EDDA" }}>
                <Puzzle className="h-5 w-5" style={{ color: "#28B95F" }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Intégrations</h2>
                <p className="text-sm" style={{ color: "#666666" }}>Connectez vos outils et services externes</p>
              </div>
            </div>
          </div>

          {/* Test result */}
          {integrationTestResult && (
            <div className="w-full p-4 rounded-xl flex items-center justify-between" style={{ background: integrationTestResult.type === "success" ? "#D4EDDA" : "#FEE2E8", border: `1px solid ${integrationTestResult.type === "success" ? "#28B95F" : "#F04B69"}` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: integrationTestResult.type === "success" ? "#28B95F" : "#F04B69" }}>
                  {integrationTestResult.type === "success" ? <CheckCircle className="h-5 w-5" style={{ color: "#FFFFFF" }} /> : <AlertCircle className="h-5 w-5" style={{ color: "#FFFFFF" }} />}
                </div>
                <span style={{ color: integrationTestResult.type === "success" ? "#28B95F" : "#F04B69" }}>{integrationTestResult.message}</span>
              </div>
              <button onClick={() => setIntegrationTestResult(null)} className="hover:opacity-70" style={{ color: integrationTestResult.type === "success" ? "#28B95F" : "#F04B69" }}>×</button>
            </div>
          )}

          {/* Integration Sub-tabs */}
          <div className="flex flex-wrap gap-1 p-1 rounded-xl w-full" style={{ background: "#F5F5F7" }}>
            <button onClick={() => setActiveIntegrationTab("slack")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "slack" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "slack" ? "#5F00BA" : "#666666", boxShadow: activeIntegrationTab === "slack" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Slack</span>
            </button>
            <button onClick={() => setActiveIntegrationTab("openai")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "openai" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "openai" ? "#28B95F" : "#666666", boxShadow: activeIntegrationTab === "openai" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">OpenAI</span>
            </button>
            <button onClick={() => setActiveIntegrationTab("o365")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "o365" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "o365" ? "#0064FA" : "#666666", boxShadow: activeIntegrationTab === "o365" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">O365</span>
            </button>
            <button onClick={() => setActiveIntegrationTab("gocardless")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "gocardless" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "gocardless" ? "#14B4E6" : "#666666", boxShadow: activeIntegrationTab === "gocardless" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">GoCardless</span>
            </button>
            <button onClick={() => setActiveIntegrationTab("docuseal")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "docuseal" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "docuseal" ? "#F0783C" : "#666666", boxShadow: activeIntegrationTab === "docuseal" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <PenTool className="h-4 w-4" />
              <span className="hidden sm:inline">DocuSeal</span>
            </button>
            <button onClick={() => setActiveIntegrationTab("sepa")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "sepa" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "sepa" ? "#0064FA" : "#666666", boxShadow: activeIntegrationTab === "sepa" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">SEPA</span>
            </button>
          </div>

          {/* Slack Settings */}
          {activeIntegrationTab === "slack" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F3E8FF" }}>
                    <MessageSquare className="h-5 w-5" style={{ color: "#5F00BA" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Intégration Slack</h2>
                    <p className="text-sm" style={{ color: "#666666" }}>Recevez les notifications dans Slack</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={slackEnabled} onChange={(e) => setSlackEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: slackEnabled ? "#5F00BA" : "#CCCCCC" }} />
                </label>
              </div>

              {slackEnabled && (
                <>
                  <div className="rounded-xl p-4" style={{ background: "#F3E8FF", border: "1px solid #5F00BA" }}>
                    <h4 className="font-medium mb-2" style={{ color: "#5F00BA" }}>Configuration Slack</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#5F00BA" }}>
                      <li>Créez une App Slack sur <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">api.slack.com</a></li>
                      <li>Activez les Incoming Webhooks et copiez l&apos;URL</li>
                      <li>Pour les notifications avancées, ajoutez un Bot Token</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Webhook URL *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={slackWebhookUrl} onChange={(e) => setSlackWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#5F00BA]/20" style={inputStyle} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Bot Token (optionnel)</label>
                      <input type={showIntegrationSecrets ? "text" : "password"} value={slackBotToken} onChange={(e) => setSlackBotToken(e.target.value)} placeholder="xoxb-..." className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#5F00BA]/20" style={inputStyle} />
                      <p className="text-xs" style={{ color: "#999999" }}>Pour des fonctionnalités avancées (réponses depuis Slack)</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Channel ID</label>
                      <input value={slackChannelId} onChange={(e) => setSlackChannelId(e.target.value)} placeholder="C0123456789" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5F00BA]/20" style={inputStyle} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                      <div>
                        <p className="font-medium" style={{ color: "#111111" }}>Notifier à la création</p>
                        <p className="text-sm" style={{ color: "#666666" }}>Recevoir une alerte pour chaque nouveau ticket</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={slackNotifyOnNew} onChange={(e) => setSlackNotifyOnNew(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: slackNotifyOnNew ? "#5F00BA" : "#CCCCCC" }} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                      <div>
                        <p className="font-medium" style={{ color: "#111111" }}>Notifier à chaque réponse</p>
                        <p className="text-sm" style={{ color: "#666666" }}>Recevoir une alerte quand un client répond</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={slackNotifyOnReply} onChange={(e) => setSlackNotifyOnReply(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: slackNotifyOnReply ? "#5F00BA" : "#CCCCCC" }} />
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                {slackEnabled && (
                  <button onClick={testSlack} disabled={saving === "slack-test" || !slackWebhookUrl} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "#F5F5F7", color: "#666666" }}>
                    {saving === "slack-test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                    Tester
                  </button>
                )}
                <button onClick={() => handleSave("integrations", { slackEnabled, slackWebhookUrl, slackBotToken, slackChannelId, slackNotifyOnNew, slackNotifyOnReply })} disabled={saving === "integrations"} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "#5F00BA", color: "#FFFFFF" }}>
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}

          {/* OpenAI Settings */}
          {activeIntegrationTab === "openai" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4EDDA" }}>
                    <Sparkles className="h-5 w-5" style={{ color: "#28B95F" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Intelligence Artificielle (OpenAI)</h2>
                    <p className="text-sm" style={{ color: "#666666" }}>Utilisez l&apos;IA pour améliorer votre productivité</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={openaiEnabled} onChange={(e) => setOpenaiEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: openaiEnabled ? "#28B95F" : "#CCCCCC" }} />
                </label>
              </div>

              {openaiEnabled && (
                <>
                  <div className="rounded-xl p-4" style={{ background: "#D4EDDA", border: "1px solid #28B95F" }}>
                    <h4 className="font-medium mb-2" style={{ color: "#28B95F" }}>Fonctionnalités IA</h4>
                    <ul className="text-sm space-y-1" style={{ color: "#28B95F" }}>
                      <li>• <strong>Suggestions de réponse :</strong> L&apos;IA propose des réponses basées sur l&apos;historique</li>
                      <li>• <strong>Classification automatique :</strong> Priorité et catégorie détectées automatiquement</li>
                      <li>• <strong>Résumé :</strong> Génération de résumés des conversations</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>API Key *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={openaiApiKey} onChange={(e) => setOpenaiApiKey(e.target.value)} placeholder="sk-..." className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#28B95F]/20" style={inputStyle} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: "#999999" }}>Obtenez votre clé sur <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Modèle</label>
                      <div className="relative">
                        <select value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm outline-none appearance-none focus:ring-2 focus:ring-[#28B95F]/20" style={inputStyle}>
                          <option value="gpt-4o-mini">GPT-4o Mini (rapide, économique)</option>
                          <option value="gpt-4o">GPT-4o (meilleur, plus lent)</option>
                          <option value="gpt-4-turbo">GPT-4 Turbo</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (legacy)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "#999999" }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                      <div>
                        <p className="font-medium" style={{ color: "#111111" }}>Suggestions de réponse</p>
                        <p className="text-sm" style={{ color: "#666666" }}>L&apos;IA suggère des réponses aux tickets</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={openaiAutoSuggest} onChange={(e) => setOpenaiAutoSuggest(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: openaiAutoSuggest ? "#28B95F" : "#CCCCCC" }} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                      <div>
                        <p className="font-medium" style={{ color: "#111111" }}>Classification automatique</p>
                        <p className="text-sm" style={{ color: "#666666" }}>Détecter automatiquement la priorité et le type</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={openaiAutoClassify} onChange={(e) => setOpenaiAutoClassify(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: openaiAutoClassify ? "#28B95F" : "#CCCCCC" }} />
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                {openaiEnabled && (
                  <button onClick={testOpenAI} disabled={saving === "openai-test" || !openaiApiKey} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "#F5F5F7", color: "#666666" }}>
                    {saving === "openai-test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                    Tester
                  </button>
                )}
                <button onClick={() => handleSave("integrations", { openaiEnabled, openaiApiKey, openaiModel, openaiAutoSuggest, openaiAutoClassify })} disabled={saving === "integrations"} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "#28B95F", color: "#FFFFFF" }}>
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}

          {/* O365 Settings */}
          {activeIntegrationTab === "o365" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E3F2FD" }}>
                    <Mail className="h-5 w-5" style={{ color: "#0064FA" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Microsoft Office 365</h2>
                    <p className="text-sm" style={{ color: "#666666" }}>Synchronisez les emails avec Office 365</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={o365Enabled} onChange={(e) => setO365Enabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: o365Enabled ? "#0064FA" : "#CCCCCC" }} />
                </label>
              </div>

              {o365Enabled && (
                <>
                  <div className="rounded-xl p-4 space-y-4" style={{ background: "#E3F2FD", border: "1px solid #0064FA" }}>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: "#0064FA" }}>
                        <span>Configuration Azure AD</span>
                        <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps" target="_blank" rel="noopener noreferrer" className="text-xs underline hover:no-underline">
                          Ouvrir le portail Azure →
                        </a>
                      </h4>
                      <ol className="text-sm space-y-1 list-decimal list-inside mb-3" style={{ color: "#0064FA" }}>
                        <li>Créez une application dans Azure AD (App registrations)</li>
                        <li>Configurez le Redirect URI : <code className="bg-white/50 px-1 rounded text-xs">https://crm.julienronot.fr/api/auth/microsoft/callback</code></li>
                        <li>Ajoutez les permissions Microsoft Graph (voir tableau ci-dessous)</li>
                        <li>Créez un Client Secret et copiez les identifiants</li>
                        <li><strong>Important :</strong> Pour les permissions Application, cliquez sur &quot;Grant admin consent&quot;</li>
                      </ol>
                    </div>

                    {/* Permissions Table */}
                    <div className="rounded-lg overflow-hidden" style={{ background: "white" }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "#0064FA", color: "white" }}>
                            <th className="px-3 py-2 text-left font-medium">Permission</th>
                            <th className="px-3 py-2 text-left font-medium">Type</th>
                            <th className="px-3 py-2 text-left font-medium">Fonction</th>
                          </tr>
                        </thead>
                        <tbody style={{ color: "#333" }}>
                          {/* SSO Permissions Header */}
                          <tr style={{ background: "#E8F5E9" }}>
                            <td colSpan={3} className="px-3 py-1.5 font-semibold" style={{ color: "#2E7D32" }}>
                              🔐 SSO (Authentification)
                            </td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">openid</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Connexion OpenID Connect</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">profile</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Accès au profil utilisateur</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">email</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Accès à l&apos;email de l&apos;utilisateur</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">User.Read</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Lire le profil utilisateur connecté</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">offline_access</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Refresh token pour sessions longues</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">Group.Read.All</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#FFF3E0", color: "#E65100" }}>Application</span></td>
                            <td className="px-3 py-1.5">Récupérer les groupes AD (filtrage SSO)</td>
                          </tr>
                          {/* Tickets Permissions Header */}
                          <tr style={{ background: "#FFF8E1" }}>
                            <td colSpan={3} className="px-3 py-1.5 font-semibold" style={{ color: "#F57C00" }}>
                              📧 Tickets (Synchronisation emails)
                            </td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">Mail.Read</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#FFF3E0", color: "#E65100" }}>Application</span></td>
                            <td className="px-3 py-1.5">Lire les emails de la boîte support</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">Mail.ReadBasic</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#FFF3E0", color: "#E65100" }}>Application</span></td>
                            <td className="px-3 py-1.5">Lire les métadonnées des emails</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">Mail.Send</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#FFF3E0", color: "#E65100" }}>Application</span></td>
                            <td className="px-3 py-1.5">Envoyer des réponses aux tickets</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 font-mono">Mail.ReadWrite</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#FFF3E0", color: "#E65100" }}>Application</span></td>
                            <td className="px-3 py-1.5">Marquer comme lu, déplacer, archiver</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="text-xs space-y-1" style={{ color: "#1565C0" }}>
                      <p className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded" style={{ background: "#E3F2FD" }}>Delegated</span>
                        = L&apos;utilisateur doit consentir (pour SSO)
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded" style={{ background: "#FFF3E0", color: "#E65100" }}>Application</span>
                        = Admin consent requis (pour tickets/groupes)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Client ID (Application ID) *</label>
                      <input value={o365ClientId} onChange={(e) => setO365ClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20" style={inputStyle} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Tenant ID *</label>
                      <input value={o365TenantId} onChange={(e) => setO365TenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20" style={inputStyle} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Client Secret *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={o365ClientSecret} onChange={(e) => setO365ClientSecret(e.target.value)} placeholder="••••••••••••••••" className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20" style={inputStyle} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Adresse email de support *</label>
                      <input type="email" value={o365SupportEmail} onChange={(e) => setO365SupportEmail(e.target.value)} placeholder="support@votreentreprise.com" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0064FA]/20" style={inputStyle} />
                      <p className="text-xs" style={{ color: "#999999" }}>La boîte mail à synchroniser pour les tickets</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                      <div>
                        <p className="font-medium" style={{ color: "#111111" }}>Synchronisation automatique</p>
                        <p className="text-sm" style={{ color: "#666666" }}>Créer des tickets depuis les emails entrants</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={o365AutoSync} onChange={(e) => setO365AutoSync(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: o365AutoSync ? "#0064FA" : "#CCCCCC" }} />
                      </label>
                    </div>

                    {/* SSO Access Control */}
                    <div className="space-y-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium" style={{ color: "#444444" }}>Groupes Azure AD autorisés (SSO)</label>
                        <button
                          onClick={fetchAzureGroups}
                          disabled={loadingAzureGroups || !o365ClientId || !o365ClientSecret || !o365TenantId}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-50"
                          style={{ background: "#E8F0FE", color: "#0064FA" }}
                        >
                          {loadingAzureGroups ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          Récupérer les groupes
                        </button>
                      </div>

                      {azureGroupsError && (
                        <div className="p-3 rounded-lg text-sm" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                          {azureGroupsError}
                        </div>
                      )}

                      {azureGroups.length > 0 && (
                        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EEEEEE" }}>
                          <div className="max-h-60 overflow-y-auto">
                            {azureGroups.map((group) => (
                              <label
                                key={group.id}
                                className="flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-gray-50"
                                style={{ borderBottom: "1px solid #EEEEEE" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isGroupSelected(group.id)}
                                  onChange={() => toggleAzureGroup(group.id)}
                                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm" style={{ color: "#111111" }}>{group.name}</span>
                                    <span className="px-1.5 py-0.5 rounded text-xs" style={{
                                      background: group.type === "security" ? "#E8F0FE" : group.type === "mail" ? "#FEF3C7" : "#F3E8FF",
                                      color: group.type === "security" ? "#0064FA" : group.type === "mail" ? "#D97706" : "#7C3AED"
                                    }}>
                                      {group.type === "security" ? "Sécurité" : group.type === "mail" ? "Mail" : "Autre"}
                                    </span>
                                  </div>
                                  {group.description && (
                                    <p className="text-xs mt-0.5 truncate" style={{ color: "#666666" }}>{group.description}</p>
                                  )}
                                  <p className="text-xs font-mono mt-0.5" style={{ color: "#999999" }}>{group.id}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {azureGroups.length === 0 && !azureGroupsError && (
                        <div className="p-4 rounded-xl text-center" style={{ background: "#F5F5F7" }}>
                          <Users className="h-8 w-8 mx-auto mb-2" style={{ color: "#999999" }} />
                          <p className="text-sm" style={{ color: "#666666" }}>
                            Cliquez sur &quot;Récupérer les groupes&quot; pour charger les groupes Azure AD
                          </p>
                        </div>
                      )}

                      {o365AllowedGroups && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: "#666666" }}>
                          <CheckCircle className="h-3 w-3" style={{ color: "#28B95F" }} />
                          <span>{o365AllowedGroups.split(",").filter(g => g.trim()).length} groupe(s) sélectionné(s)</span>
                        </div>
                      )}

                      <p className="text-xs" style={{ color: "#999999" }}>
                        Sélectionnez les groupes Azure AD dont les membres peuvent se connecter au CRM via SSO. Laisser vide pour autoriser tous les utilisateurs du tenant.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                {o365Enabled && (
                  <button onClick={testO365} disabled={saving === "o365-test" || !o365ClientId || !o365ClientSecret} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "#F5F5F7", color: "#666666" }}>
                    {saving === "o365-test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                    Tester la connexion
                  </button>
                )}
                <button onClick={() => handleSave("integrations", { o365Enabled, o365ClientId, o365ClientSecret, o365TenantId, o365SupportEmail, o365AutoSync, o365AllowedGroups })} disabled={saving === "integrations"} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "#0064FA", color: "#FFFFFF" }}>
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}

          {/* GoCardless Settings */}
          {activeIntegrationTab === "gocardless" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E0F7FA" }}>
                    <Building className="h-5 w-5" style={{ color: "#14B4E6" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>GoCardless Bank Account Data</h2>
                    <p className="text-sm" style={{ color: "#666666" }}>Connectez vos comptes bancaires via Open Banking</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={gocardlessEnabled} onChange={(e) => setGocardlessEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: gocardlessEnabled ? "#14B4E6" : "#CCCCCC" }} />
                </label>
              </div>

              {gocardlessEnabled && (
                <>
                  <div className="rounded-xl p-4" style={{ background: "#E0F7FA", border: "1px solid #14B4E6" }}>
                    <h4 className="font-medium mb-2" style={{ color: "#14B4E6" }}>Configuration GoCardless</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#0097A7" }}>
                      <li>Créez un compte sur <a href="https://bankaccountdata.gocardless.com/" target="_blank" rel="noopener noreferrer" className="underline">GoCardless Bank Account Data</a></li>
                      <li>Créez une nouvelle clé API dans la section &quot;User secrets&quot;</li>
                      <li>Copiez le Secret ID et la Secret Key</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Environnement</label>
                      <select value={gocardlessEnvironment} onChange={(e) => setGocardlessEnvironment(e.target.value as "sandbox" | "production")} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#14B4E6]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}>
                        <option value="sandbox">Sandbox (Test)</option>
                        <option value="production">Production</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Secret ID *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={gocardlessSecretId} onChange={(e) => setGocardlessSecretId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#14B4E6]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Secret Key *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={gocardlessSecretKey} onChange={(e) => setGocardlessSecretKey(e.target.value)} placeholder="••••••••••••••••" className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#14B4E6]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                <button onClick={() => handleSave("integrations", { gocardlessEnabled, gocardlessSecretId, gocardlessSecretKey, gocardlessEnvironment })} disabled={saving === "integrations"} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "#14B4E6", color: "#FFFFFF" }}>
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}

          {/* DocuSeal Settings */}
          {activeIntegrationTab === "docuseal" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFF3E0" }}>
                    <PenTool className="h-5 w-5" style={{ color: "#F0783C" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>DocuSeal</h2>
                    <p className="text-sm" style={{ color: "#666666" }}>Signatures électroniques pour vos contrats</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={docusealEnabled} onChange={(e) => setDocusealEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: docusealEnabled ? "#F0783C" : "#CCCCCC" }} />
                </label>
              </div>

              {docusealEnabled && (
                <>
                  <div className="rounded-xl p-4" style={{ background: "#FFF3E0", border: "1px solid #F0783C" }}>
                    <h4 className="font-medium mb-2" style={{ color: "#F0783C" }}>Configuration DocuSeal</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#E65100" }}>
                      <li>Connectez-vous à votre instance <a href="https://docuseal.com" target="_blank" rel="noopener noreferrer" className="underline">DocuSeal</a></li>
                      <li>Allez dans Settings &gt; API et créez une clé API</li>
                      <li>Configurez le webhook URL ci-dessous dans DocuSeal</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>URL de l&apos;API DocuSeal</label>
                      <input value={docusealApiUrl} onChange={(e) => setDocusealApiUrl(e.target.value)} placeholder="https://api.docuseal.com" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#F0783C]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }} />
                      <p className="text-xs" style={{ color: "#999999" }}>Laissez par défaut pour DocuSeal Cloud, ou entrez l&apos;URL de votre instance self-hosted</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Clé API *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={docusealApiKey} onChange={(e) => setDocusealApiKey(e.target.value)} placeholder="••••••••••••••••" className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#F0783C]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2" style={{ color: "#444444" }}>
                        <Webhook className="h-4 w-4" />
                        Webhook Secret (optionnel)
                      </label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={docusealWebhookSecret} onChange={(e) => setDocusealWebhookSecret(e.target.value)} placeholder="whsec_..." className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#F0783C]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: "#999999" }}>Pour valider les événements webhook (signature des documents)</p>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: "#F5F5F7" }}>
                      <p className="text-sm font-medium mb-2" style={{ color: "#444444" }}>URL du Webhook</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono" style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#666666" }}>
                          {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/docuseal` : "/api/webhooks/docuseal"}
                        </code>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/docuseal`); }} className="p-2 rounded-lg hover:bg-[#EEEEEE] transition-all" title="Copier">
                          <Copy className="h-4 w-4" style={{ color: "#666666" }} />
                        </button>
                      </div>
                      <p className="text-xs mt-2" style={{ color: "#999999" }}>Configurez cette URL dans DocuSeal pour recevoir les notifications de signature</p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                <button onClick={() => handleSave("integrations", { docusealEnabled, docusealApiUrl, docusealApiKey, docusealWebhookSecret })} disabled={saving === "integrations"} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "#F0783C", color: "#FFFFFF" }}>
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}

          {/* SEPA Direct Debit Settings */}
          {activeIntegrationTab === "sepa" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E8F0FE" }}>
                  <Landmark className="h-5 w-5" style={{ color: "#0064FA" }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Prélèvements SEPA</h2>
                  <p className="text-sm" style={{ color: "#666666" }}>Configurez vos informations créancier pour les prélèvements bancaires</p>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: "#E8F0FE", border: "1px solid #0064FA" }}>
                <h4 className="font-medium mb-2" style={{ color: "#0064FA" }}>Informations requises</h4>
                <p className="text-sm" style={{ color: "#1565C0" }}>
                  Ces informations sont nécessaires pour générer les fichiers de prélèvement PAIN.008 à envoyer à votre banque.
                  L&apos;ICS (Identifiant Créancier SEPA) est fourni par votre banque lors de l&apos;activation du service de prélèvement.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>ICS (Identifiant Créancier SEPA) *</label>
                  <input
                    value={sepaIcs}
                    onChange={(e) => setSepaIcs(e.target.value.toUpperCase())}
                    placeholder="FR00ZZZ000000"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                    style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                  />
                  <p className="text-xs" style={{ color: "#999999" }}>Format: 2 lettres pays + 2 chiffres + 3 caractères + 11 caractères</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>Nom du créancier *</label>
                  <input
                    value={sepaCreditorName}
                    onChange={(e) => setSepaCreditorName(e.target.value)}
                    placeholder="Nom de votre entreprise"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                    style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>IBAN créancier *</label>
                  <input
                    value={sepaCreditorIban}
                    onChange={(e) => setSepaCreditorIban(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="FR7630001007941234567890185"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                    style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>BIC créancier *</label>
                  <input
                    value={sepaCreditorBic}
                    onChange={(e) => setSepaCreditorBic(e.target.value.toUpperCase())}
                    placeholder="BNPAFRPP"
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                    style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                <button
                  onClick={() => handleSave("integrations", { sepaIcs, sepaCreditorName, sepaCreditorIban, sepaCreditorBic })}
                  disabled={saving === "integrations"}
                  className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: "#EEEEEE", borderTopColor: "#5F00BA" }} />
          <p style={{ color: "#666666" }}>Chargement des paramètres...</p>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
