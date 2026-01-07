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
  XCircle,
  Bell,
  Server,
  Calendar,
  Link,
  Unlink,
  Key,
} from "lucide-react"
import Image from "next/image"
import { useTenant } from "@/contexts/tenant-context"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"
import { NotificationSettings } from "@/components/settings/NotificationSettings"
import { DokploySettings } from "@/components/settings/DokploySettings"
import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings"

const monthlyGoalModeOptions: SelectOption[] = [
  { value: "auto", label: "Automatique (basé sur l'historique)", color: "#28B95F" },
  { value: "fixed", label: "Fixe (objectif manuel)", color: "#0064FA" },
]

const smtpEncryptionOptions: SelectOption[] = [
  { value: "tls", label: "TLS (port 587)", color: "#28B95F" },
  { value: "ssl", label: "SSL (port 465)", color: "#0064FA" },
  { value: "none", label: "Aucun (port 25)", color: "#999999" },
]

const ovhEndpointOptions: SelectOption[] = [
  { value: "ovh-eu", label: "OVH Europe (ovh-eu)" },
  { value: "ovh-ca", label: "OVH Canada (ovh-ca)" },
  { value: "ovh-us", label: "OVH US (ovh-us)" },
  { value: "kimsufi-eu", label: "Kimsufi Europe" },
  { value: "soyoustart-eu", label: "SoYouStart Europe" },
]

const openaiModelOptions: SelectOption[] = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (rapide, économique)", color: "#28B95F" },
  { value: "gpt-4o", label: "GPT-4o (meilleur, plus lent)", color: "#0064FA" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", color: "#7C3AED" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (legacy)", color: "#999999" },
]

const gocardlessEnvironmentOptions: SelectOption[] = [
  { value: "sandbox", label: "Sandbox (Test)", color: "#F59E0B" },
  { value: "production", label: "Production", color: "#28B95F" },
]

const revolutEnvironmentOptions: SelectOption[] = [
  { value: "sandbox", label: "Sandbox (Test)", color: "#F59E0B" },
  { value: "production", label: "Production", color: "#28B95F" },
]

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
    // Deployment notifications
    deploymentNotificationsEnabled?: boolean
    deploymentNotifyOnSuccess?: boolean
    deploymentNotifyOnFailure?: boolean
    deploymentNotifyOnAppError?: boolean
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
    // Telegram
    telegramEnabled?: boolean
    telegramBotToken?: string
    telegramAllowedUsers?: string
    telegramWebhookConfigured?: boolean
    // Revolut
    revolutEnabled?: boolean
    revolutClientId?: string
    revolutApiKey?: string
    revolutEnvironment?: string
    // Cron
    cronSecret?: string
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
  // Deployment notifications
  const [deploymentNotificationsEnabled, setDeploymentNotificationsEnabled] = useState(true)
  const [deploymentNotifyOnSuccess, setDeploymentNotifyOnSuccess] = useState(false)
  const [deploymentNotifyOnFailure, setDeploymentNotifyOnFailure] = useState(true)
  const [deploymentNotifyOnAppError, setDeploymentNotifyOnAppError] = useState(true)

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
  // O365 Mailbox Connection (for tickets)
  const [o365MailboxConnected, setO365MailboxConnected] = useState(false)
  const [o365ConnectedEmail, setO365ConnectedEmail] = useState("")
  const [connectingO365Mailbox, setConnectingO365Mailbox] = useState(false)

  // Personal Calendar (O365 per user)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarConnectedEmail, setCalendarConnectedEmail] = useState("")
  const [calendarConnectedAt, setCalendarConnectedAt] = useState<string | null>(null)
  const [connectingCalendar, setConnectingCalendar] = useState(false)
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false)

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

  // Telegram
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramBotToken, setTelegramBotToken] = useState("")
  const [telegramAllowedUsers, setTelegramAllowedUsers] = useState("")
  const [telegramWebhookConfigured, setTelegramWebhookConfigured] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [configuringWebhook, setConfiguringWebhook] = useState(false)
  const [telegramTestResult, setTelegramTestResult] = useState<{ type: "success" | "error"; message: string; botName?: string } | null>(null)

  // Revolut
  const [revolutEnabled, setRevolutEnabled] = useState(false)
  const [revolutClientId, setRevolutClientId] = useState("")
  const [revolutApiKey, setRevolutApiKey] = useState("")
  const [revolutEnvironment, setRevolutEnvironment] = useState<"sandbox" | "production">("sandbox")
  const [testingRevolut, setTestingRevolut] = useState(false)
  const [revolutTestResult, setRevolutTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Automations / Crons
  const [runningCron, setRunningCron] = useState<string | null>(null)
  const [cronResults, setCronResults] = useState<Record<string, { success: boolean; message: string; timestamp: Date }>>({})
  const [cronSecret, setCronSecret] = useState("")
  const [showCronSecret, setShowCronSecret] = useState(false)

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
        setDeploymentNotificationsEnabled(data.settings?.deploymentNotificationsEnabled ?? true)
        setDeploymentNotifyOnSuccess(data.settings?.deploymentNotifyOnSuccess ?? false)
        setDeploymentNotifyOnFailure(data.settings?.deploymentNotifyOnFailure ?? true)
        setDeploymentNotifyOnAppError(data.settings?.deploymentNotifyOnAppError ?? true)
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

        // Load O365 mailbox connection status
        try {
          const o365StatusRes = await fetch("/api/tickets/sync-o365")
          if (o365StatusRes.ok) {
            const o365Status = await o365StatusRes.json()
            setO365MailboxConnected(o365Status.connected || false)
            setO365ConnectedEmail(o365Status.connectedEmail || "")
          }
        } catch (e) {
          console.error("Error fetching O365 mailbox status:", e)
        }

        // Load personal calendar connection status
        try {
          const calendarStatusRes = await fetch("/api/users/calendar-status")
          if (calendarStatusRes.ok) {
            const calendarStatus = await calendarStatusRes.json()
            setCalendarConnected(calendarStatus.connected || false)
            setCalendarConnectedEmail(calendarStatus.connectedEmail || "")
            setCalendarConnectedAt(calendarStatus.connectedAt || null)
          }
        } catch (e) {
          console.error("Error fetching calendar status:", e)
        }

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

        // Telegram
        setTelegramEnabled(data.settings?.telegramEnabled || false)
        setTelegramBotToken(data.settings?.telegramBotToken || "")
        setTelegramAllowedUsers(data.settings?.telegramAllowedUsers || "")
        setTelegramWebhookConfigured(data.settings?.telegramWebhookConfigured || false)

        // Revolut
        setRevolutEnabled(data.settings?.revolutEnabled || false)
        setRevolutClientId(data.settings?.revolutClientId || "")
        setRevolutApiKey(data.settings?.revolutApiKey || "")
        setRevolutEnvironment((data.settings?.revolutEnvironment as "sandbox" | "production") || "sandbox")

        // Cron Secret
        setCronSecret(data.settings?.cronSecret || "")
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

  // Crons configuration
  const availableCrons = [
    {
      id: "revolut-payments",
      name: "Vérification paiements Revolut",
      description: "Vérifie les paiements par carte bancaire via Revolut et marque les factures comme payées",
      endpoint: "/api/cron/revolut-payments",
      icon: CreditCard,
      color: "#0064FA",
      schedule: "Toutes les 15 minutes",
      cronExpression: "*/15 * * * *",
      requires: "Revolut API",
    },
    {
      id: "invoice-reminders",
      name: "Relances factures",
      description: "Envoie des emails de relance pour les factures impayées ou proches de l'échéance",
      endpoint: "/api/cron/invoice-reminders",
      icon: Mail,
      color: "#F04B69",
      schedule: "Tous les jours à 9h",
      cronExpression: "0 9 * * *",
      requires: "SMTP",
    },
    {
      id: "telegram-morning-report",
      name: "Rapport matinal Telegram",
      description: "Envoie un récapitulatif quotidien des factures et du CA sur Telegram",
      endpoint: "/api/cron/telegram-morning-report",
      icon: Send,
      color: "#0088CC",
      schedule: "Tous les jours à 8h",
      cronExpression: "0 8 * * *",
      requires: "Telegram Bot",
    },
    {
      id: "deployment-monitor",
      name: "Monitoring déploiements",
      description: "Surveille les déploiements Dokploy et envoie des notifications",
      endpoint: "/api/cron/deployment-monitor",
      icon: Server,
      color: "#28B95F",
      schedule: "Toutes les 5 minutes",
      cronExpression: "*/5 * * * *",
      requires: "Dokploy API",
    },
    {
      id: "treasury-sync",
      name: "Synchronisation bancaire",
      description: "Récupère les transactions bancaires via GoCardless",
      endpoint: "/api/cron/treasury-sync",
      icon: Landmark,
      color: "#7C3AED",
      schedule: "Toutes les 6 heures",
      cronExpression: "0 */6 * * *",
      requires: "GoCardless API",
    },
    {
      id: "sync-o365",
      name: "Sync emails O365",
      description: "Synchronise les emails de la boîte support O365",
      endpoint: "/api/cron/sync-o365",
      icon: Mail,
      color: "#0078D4",
      schedule: "Toutes les 5 minutes",
      cronExpression: "*/5 * * * *",
      requires: "O365 API",
    },
    {
      id: "calendar-reminders",
      name: "Rappels calendrier",
      description: "Envoie des rappels pour les événements calendrier à venir",
      endpoint: "/api/cron/calendar-reminders",
      icon: Calendar,
      color: "#14B4E6",
      schedule: "Toutes les heures",
      cronExpression: "0 * * * *",
      requires: "O365 Calendar",
    },
    {
      id: "note-reminders",
      name: "Rappels notes",
      description: "Envoie des notifications pour les notes avec rappel programmé",
      endpoint: "/api/cron/note-reminders",
      icon: Bell,
      color: "#DCB40A",
      schedule: "Toutes les minutes",
      cronExpression: "* * * * *",
      requires: "Aucun",
    },
    {
      id: "ticket-reminders",
      name: "Rappels tickets",
      description: "Envoie des rappels pour les tickets sans réponse",
      endpoint: "/api/cron/ticket-reminders",
      icon: MessageSquare,
      color: "#F0783C",
      schedule: "Toutes les heures",
      cronExpression: "0 * * * *",
      requires: "Aucun",
    },
  ]

  const runCron = async (cronId: string, endpoint: string) => {
    setRunningCron(cronId)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      setCronResults(prev => ({
        ...prev,
        [cronId]: {
          success: res.ok && data.success !== false,
          message: data.message || (res.ok ? "Exécution terminée avec succès" : "Erreur lors de l'exécution"),
          timestamp: new Date(),
        },
      }))
    } catch (error) {
      setCronResults(prev => ({
        ...prev,
        [cronId]: {
          success: false,
          message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
          timestamp: new Date(),
        },
      }))
    } finally {
      setRunningCron(null)
    }
  }

  const tabGroups = [
    {
      label: "Général",
      tabs: [
        { id: "company", label: "Entreprise", icon: Building2, color: "#0064FA" },
        { id: "appearance", label: "Apparence", icon: ImagePlus, color: "#5F00BA" },
        { id: "goals", label: "Objectifs", icon: Target, color: "#28B95F" },
      ],
    },
    {
      label: "Documents",
      tabs: [
        { id: "email", label: "Email", icon: Mail, color: "#5F00BA" },
        { id: "invoice", label: "Facturation", icon: FileText, color: "#F0783C" },
        { id: "payment", label: "Paiement", icon: CreditCard, color: "#28B95F" },
      ],
    },
    {
      label: "Connecteurs",
      tabs: [
        { id: "integrations", label: "Intégrations", icon: Puzzle, color: "#28B95F" },
        { id: "dns", label: "DNS", icon: Globe, color: "#14B4E6" },
        { id: "api", label: "API Externe", icon: Key, color: "#F04B69" },
      ],
    },
    {
      label: "Personnel",
      tabs: [
        { id: "calendar", label: "Calendrier", icon: Calendar, color: "#14B4E6" },
        { id: "notifications", label: "Notifications", icon: Bell, color: "#F04B69" },
        { id: "automations", label: "Automatisations", icon: Clock, color: "#DCB40A" },
      ],
    },
  ]

  // Flat tabs for backward compatibility
  const tabs = tabGroups.flatMap((g) => g.tabs)

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

      {/* Tabs - Grouped Layout */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tabGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider px-2" style={{ color: "#999999" }}>
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left"
                      style={{
                        background: isActive ? tab.color : "transparent",
                        color: isActive ? "#FFFFFF" : "#666666",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isActive ? "rgba(255,255,255,0.2)" : `${tab.color}15`,
                        }}
                      >
                        <Icon className="h-4 w-4" style={{ color: isActive ? "#FFFFFF" : tab.color }} />
                      </div>
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
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
              <StyledSelect
                value={monthlyGoalMode}
                onChange={(v) => setMonthlyGoalMode(v as "auto" | "fixed")}
                options={monthlyGoalModeOptions}
                placeholder="Mode de calcul"
              />
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
              <StyledSelect
                value={smtpEncryption}
                onChange={(v) => setSmtpEncryption(v as "tls" | "ssl" | "none")}
                options={smtpEncryptionOptions}
                placeholder="Chiffrement"
              />
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
                <StyledSelect
                  value={invoiceNumberFormat}
                  onChange={setInvoiceNumberFormat}
                  options={[
                    { value: "{PREFIX}-{YEAR}-{NUMBER}", label: `${invoicePrefix}-2025-001` },
                    { value: "{PREFIX}{YEAR}{NUMBER}", label: `${invoicePrefix}2025001` },
                    { value: "{PREFIX}-{NUMBER}", label: `${invoicePrefix}-001` },
                    { value: "{YEAR}-{NUMBER}", label: "2025-001" },
                  ]}
                  placeholder="Format"
                />
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
                <StyledSelect
                  value={quoteNumberFormat}
                  onChange={setQuoteNumberFormat}
                  options={[
                    { value: "{PREFIX}-{YEAR}-{NUMBER}", label: `${quotePrefix}-2025-001` },
                    { value: "{PREFIX}{YEAR}{NUMBER}", label: `${quotePrefix}2025001` },
                    { value: "{PREFIX}-{NUMBER}", label: `${quotePrefix}-001` },
                    { value: "{YEAR}-{NUMBER}", label: "2025-001" },
                  ]}
                  placeholder="Format"
                />
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
                <StyledSelect
                  value={ovhEndpoint}
                  onChange={setOvhEndpoint}
                  options={ovhEndpointOptions}
                  placeholder="Endpoint OVH"
                />
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

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div
          className="rounded-2xl p-6 w-full space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FDEAEA" }}>
              <Bell className="h-5 w-5" style={{ color: "#F04B69" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Notifications Push</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Recevez des alertes en temps reel sur vos appareils</p>
            </div>
          </div>

          <NotificationSettings />

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Les notifications push vous alertent pour les rappels de notes, tickets et factures.
              Elles fonctionnent meme lorsque le navigateur est ferme.
            </p>
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
            <button onClick={() => setActiveIntegrationTab("telegram")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "telegram" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "telegram" ? "#0088CC" : "#666666", boxShadow: activeIntegrationTab === "telegram" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Telegram</span>
            </button>
            <button onClick={() => setActiveIntegrationTab("revolut")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "revolut" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "revolut" ? "#191C1F" : "#666666", boxShadow: activeIntegrationTab === "revolut" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Revolut</span>
            </button>
            <button onClick={() => setActiveIntegrationTab("dokploy")} className="flex-1 min-w-[80px] px-3 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all" style={{ background: activeIntegrationTab === "dokploy" ? "#FFFFFF" : "transparent", color: activeIntegrationTab === "dokploy" ? "#0064FA" : "#666666", boxShadow: activeIntegrationTab === "dokploy" ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">Dokploy</span>
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

                  {/* Deployment Notifications */}
                  <div className="pt-6 mt-6" style={{ borderTop: "1px solid #EEEEEE" }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F0FDF4" }}>
                          <Server className="h-4 w-4" style={{ color: "#22C55E" }} />
                        </div>
                        <div>
                          <h3 className="font-medium" style={{ color: "#111111" }}>Notifications Déploiements</h3>
                          <p className="text-sm" style={{ color: "#666666" }}>Alertes Dokploy (Orion, Andromeda, Cassiopeia)</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={deploymentNotificationsEnabled} onChange={(e) => setDeploymentNotificationsEnabled(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: deploymentNotificationsEnabled ? "#22C55E" : "#CCCCCC" }} />
                      </label>
                    </div>

                    {deploymentNotificationsEnabled && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                          <div>
                            <p className="font-medium" style={{ color: "#111111" }}>Déploiement réussi</p>
                            <p className="text-sm" style={{ color: "#666666" }}>Notifier quand un déploiement se termine avec succès</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={deploymentNotifyOnSuccess} onChange={(e) => setDeploymentNotifyOnSuccess(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: deploymentNotifyOnSuccess ? "#22C55E" : "#CCCCCC" }} />
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#FEF2F2" }}>
                          <div>
                            <p className="font-medium" style={{ color: "#111111" }}>Échec de déploiement</p>
                            <p className="text-sm" style={{ color: "#666666" }}>Alerte quand un déploiement échoue</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={deploymentNotifyOnFailure} onChange={(e) => setDeploymentNotifyOnFailure(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: deploymentNotifyOnFailure ? "#EF4444" : "#CCCCCC" }} />
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#FEF3C7" }}>
                          <div>
                            <p className="font-medium" style={{ color: "#111111" }}>Application en erreur</p>
                            <p className="text-sm" style={{ color: "#666666" }}>Alerte quand une app est détectée en erreur sur Dokploy</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={deploymentNotifyOnAppError} onChange={(e) => setDeploymentNotifyOnAppError(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: deploymentNotifyOnAppError ? "#F59E0B" : "#CCCCCC" }} />
                          </label>
                        </div>
                      </div>
                    )}
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
                <button onClick={() => handleSave("integrations", { slackEnabled, slackWebhookUrl, slackBotToken, slackChannelId, slackNotifyOnNew, slackNotifyOnReply, deploymentNotificationsEnabled, deploymentNotifyOnSuccess, deploymentNotifyOnFailure, deploymentNotifyOnAppError })} disabled={saving === "integrations"} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "#5F00BA", color: "#FFFFFF" }}>
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
                      <StyledSelect
                        value={openaiModel}
                        onChange={setOpenaiModel}
                        options={openaiModelOptions}
                        placeholder="Modèle"
                      />
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
                        <li>Configurez les Redirect URIs (Web) :
                          <ul className="ml-4 mt-1 space-y-0.5 list-disc">
                            <li><code className="bg-white/50 px-1 rounded text-xs">https://crm.julienronot.fr/api/auth/microsoft/callback</code> <span className="text-xs">(SSO)</span></li>
                            <li><code className="bg-white/50 px-1 rounded text-xs">https://crm.julienronot.fr/api/tickets/o365-callback</code> <span className="text-xs">(Mailbox)</span></li>
                          </ul>
                        </li>
                        <li>Ajoutez les permissions Microsoft Graph (voir tableau ci-dessous)</li>
                        <li>Créez un Client Secret et copiez les identifiants</li>
                        <li><strong>Important :</strong> Pour Group.Read.All (Application), cliquez sur &quot;Grant admin consent&quot;</li>
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
                              📧 Tickets (Synchronisation emails) - Requiert connexion OAuth
                            </td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">Mail.Read</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Lire les emails de la boîte support</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">Mail.ReadWrite</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Marquer comme lu, déplacer, archiver</td>
                          </tr>
                          <tr style={{ borderBottom: "1px solid #EEE" }}>
                            <td className="px-3 py-1.5 font-mono">Mail.Send</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Envoyer des réponses aux tickets</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-1.5 font-mono">offline_access</td>
                            <td className="px-3 py-1.5"><span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#E3F2FD", color: "#1565C0" }}>Delegated</span></td>
                            <td className="px-3 py-1.5">Maintenir la connexion (refresh token)</td>
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

                    {/* Mailbox Connection Section */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: o365MailboxConnected ? "#E8F5E9" : "#FFF8E1", border: `1px solid ${o365MailboxConnected ? "#4CAF50" : "#F57C00"}` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: o365MailboxConnected ? "#C8E6C9" : "#FFECB3" }}>
                            <Mail className="h-5 w-5" style={{ color: o365MailboxConnected ? "#2E7D32" : "#F57C00" }} />
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: o365MailboxConnected ? "#2E7D32" : "#E65100" }}>
                              {o365MailboxConnected ? "Boîte mail connectée" : "Connexion requise"}
                            </p>
                            <p className="text-sm" style={{ color: o365MailboxConnected ? "#388E3C" : "#F57C00" }}>
                              {o365MailboxConnected
                                ? `Connecté à ${o365ConnectedEmail}`
                                : "Autorisez l'accès à la boîte mail pour synchroniser les emails"}
                            </p>
                          </div>
                        </div>
                        {o365ClientId && o365ClientSecret && o365TenantId && o365SupportEmail && (
                          <div className="flex items-center gap-2">
                            {o365MailboxConnected && (
                              <button
                                onClick={async () => {
                                  if (!confirm("Déconnecter la boîte mail O365 ? Vous devrez la reconnecter pour synchroniser les emails.")) return
                                  try {
                                    const res = await fetch("/api/tickets/o365-disconnect", { method: "POST" })
                                    if (res.ok) {
                                      setO365MailboxConnected(false)
                                      setO365ConnectedEmail("")
                                    }
                                  } catch (error) {
                                    console.error("Disconnect error:", error)
                                  }
                                }}
                                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity hover:opacity-90"
                                style={{ background: "#FEE2E8", color: "#F04B69" }}
                              >
                                <XCircle className="h-4 w-4" />
                                Déconnecter
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setConnectingO365Mailbox(true)
                                window.location.href = "/api/tickets/o365-connect"
                              }}
                              disabled={connectingO365Mailbox}
                              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                              style={{
                                background: o365MailboxConnected ? "#FFFFFF" : "#F57C00",
                                color: o365MailboxConnected ? "#F57C00" : "#FFFFFF",
                                border: o365MailboxConnected ? "1px solid #F57C00" : "none"
                              }}
                            >
                              {connectingO365Mailbox ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                              {o365MailboxConnected ? "Reconnecter" : "Connecter la boîte mail"}
                            </button>
                          </div>
                        )}
                      </div>
                      {!o365ClientId || !o365ClientSecret || !o365TenantId || !o365SupportEmail ? (
                        <p className="text-xs" style={{ color: "#F57C00" }}>
                          Remplissez d&apos;abord les champs Client ID, Tenant ID, Client Secret et Email de support ci-dessus
                        </p>
                      ) : null}
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
                      <StyledSelect
                        value={gocardlessEnvironment}
                        onChange={(v) => setGocardlessEnvironment(v as "sandbox" | "production")}
                        options={gocardlessEnvironmentOptions}
                        placeholder="Environnement"
                      />
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

          {/* Telegram Settings */}
          {activeIntegrationTab === "telegram" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E3F2FD" }}>
                    <Send className="h-5 w-5" style={{ color: "#0088CC" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Intégration Telegram</h2>
                    <p className="text-sm" style={{ color: "#666666" }}>Gérez votre CRM via un bot Telegram</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#0088CC]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0088CC]"></div>
                </label>
              </div>

              {telegramEnabled && (
                <>
                  <div className="p-4 rounded-xl" style={{ background: "#E3F2FD" }}>
                    <p className="text-sm" style={{ color: "#0088CC" }}>
                      <strong>Configuration du bot:</strong>
                      <br />1. Créez un bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">@BotFather</a> sur Telegram
                      <br />2. Copiez le token du bot ci-dessous
                      <br />3. Ajoutez votre ID Telegram pour l'autorisation
                      <br />4. Configurez le webhook
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "#111111" }}>Token du Bot</label>
                      <div className="relative">
                        <input
                          type={showIntegrationSecrets ? "text" : "password"}
                          value={telegramBotToken}
                          onChange={(e) => setTelegramBotToken(e.target.value)}
                          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                          className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0088CC]/20"
                          style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ color: "#666666" }}
                        >
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "#111111" }}>IDs Telegram autorisés</label>
                      <input
                        type="text"
                        value={telegramAllowedUsers}
                        onChange={(e) => setTelegramAllowedUsers(e.target.value)}
                        placeholder="123456789, 987654321"
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0088CC]/20"
                        style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                      />
                      <p className="text-xs mt-1" style={{ color: "#999999" }}>Séparez les IDs par des virgules. Utilisez @userinfobot pour obtenir votre ID.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={async () => {
                        if (!telegramBotToken) {
                          setTelegramTestResult({ type: "error", message: "Token du bot requis" })
                          return
                        }
                        setTestingTelegram(true)
                        setTelegramTestResult(null)
                        try {
                          const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getMe`)
                          const data = await res.json()
                          if (data.ok) {
                            setTelegramTestResult({ type: "success", message: `Bot connecté: @${data.result.username}`, botName: data.result.username })
                          } else {
                            setTelegramTestResult({ type: "error", message: data.description || "Erreur de connexion" })
                          }
                        } catch {
                          setTelegramTestResult({ type: "error", message: "Erreur de connexion à l'API Telegram" })
                        } finally {
                          setTestingTelegram(false)
                        }
                      }}
                      disabled={testingTelegram || !telegramBotToken}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
                      style={{ background: "#E3F2FD", color: "#0088CC" }}
                    >
                      {testingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                      Tester la connexion
                    </button>

                    <button
                      onClick={async () => {
                        if (!telegramBotToken) {
                          setTelegramTestResult({ type: "error", message: "Token du bot requis" })
                          return
                        }
                        setConfiguringWebhook(true)
                        setTelegramTestResult(null)
                        try {
                          const webhookUrl = `${window.location.origin}/api/telegram/webhook`
                          const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/setWebhook`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message", "callback_query"] })
                          })
                          const data = await res.json()
                          if (data.ok) {
                            setTelegramWebhookConfigured(true)
                            setTelegramTestResult({ type: "success", message: "Webhook configuré avec succès!" })
                          } else {
                            setTelegramTestResult({ type: "error", message: data.description || "Erreur de configuration" })
                          }
                        } catch {
                          setTelegramTestResult({ type: "error", message: "Erreur de configuration du webhook" })
                        } finally {
                          setConfiguringWebhook(false)
                        }
                      }}
                      disabled={configuringWebhook || !telegramBotToken}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
                      style={{ background: telegramWebhookConfigured ? "#E8F5E9" : "#FFF3E0", color: telegramWebhookConfigured ? "#28B95F" : "#F57C00" }}
                    >
                      {configuringWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
                      {telegramWebhookConfigured ? "Webhook configuré" : "Configurer le webhook"}
                    </button>
                  </div>

                  {telegramTestResult && (
                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${telegramTestResult.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {telegramTestResult.type === "success" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {telegramTestResult.message}
                    </div>
                  )}

                  {/* Section des fonctionnalités complètes */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base" style={{ color: "#111111" }}>Fonctionnalités du Bot Telegram</h4>

                    {/* Conversation Naturelle */}
                    <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💬</span>
                        <h5 className="font-medium" style={{ color: "#2E7D32" }}>Conversation Naturelle avec IA</h5>
                      </div>
                      <p className="text-sm" style={{ color: "#388E3C" }}>
                        Discutez naturellement avec le bot ! Pas besoin de commandes, écrivez simplement ce que vous voulez faire.
                        Le bot comprend le contexte et se souvient de vos conversations précédentes.
                      </p>
                      <div className="mt-2 text-xs" style={{ color: "#4CAF50" }}>
                        Ex: &quot;Montre-moi les clients qui ont des factures impayées&quot; ou &quot;Crée un rappel pour appeler Jean demain à 10h&quot;
                      </div>
                    </div>

                    {/* Grid des fonctionnalités */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* Clients */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">👥</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Gestion des Clients</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Créer un nouveau client</li>
                          <li>• Rechercher un client par nom</li>
                          <li>• Voir le résumé complet d&apos;un client</li>
                          <li>• Score de santé client (0-100)</li>
                          <li>• Top clients par chiffre d&apos;affaires</li>
                        </ul>
                      </div>

                      {/* Factures */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🧾</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Gestion des Factures</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Créer une facture rapidement</li>
                          <li>• Lister par statut (envoyées, payées, etc.)</li>
                          <li>• Marquer une facture comme payée</li>
                          <li>• Voir les factures en retard</li>
                          <li>• <strong>Export PDF par message</strong></li>
                        </ul>
                      </div>

                      {/* Devis */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📝</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Gestion des Devis</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Créer un devis</li>
                          <li>• Lister les devis en attente</li>
                          <li>• Voir les devis qui expirent bientôt</li>
                          <li>• <strong>Export PDF par message</strong></li>
                        </ul>
                      </div>

                      {/* Notes & Rappels */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📌</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Notes & Rappels</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Créer des notes (liées ou non à un client)</li>
                          <li>• Programmer des rappels</li>
                          <li>• Notifications automatiques aux rappels</li>
                          <li>• Rechercher dans les notes</li>
                        </ul>
                      </div>

                      {/* Tâches */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">✅</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Gestion des Tâches</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Créer des tâches dans un projet</li>
                          <li>• Voir les tâches du jour</li>
                          <li>• Voir les tâches en retard</li>
                          <li>• Marquer comme terminée</li>
                          <li>• Assigner une date d&apos;échéance</li>
                        </ul>
                      </div>

                      {/* Trésorerie & Stats */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📊</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Trésorerie & Analytics</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Solde de trésorerie en temps réel</li>
                          <li>• CA du mois / de l&apos;année</li>
                          <li>• Montant à encaisser</li>
                          <li>• <strong>Prédictions de CA</strong></li>
                          <li>• Comparaisons temporelles</li>
                        </ul>
                      </div>

                      {/* Domaines & Abonnements */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🌐</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Domaines & Abonnements</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Domaines qui expirent bientôt</li>
                          <li>• Informations sur un domaine</li>
                          <li>• Abonnements à renouveler</li>
                          <li>• Calcul du MRR (revenu récurrent)</li>
                        </ul>
                      </div>

                      {/* Tickets */}
                      <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎫</span>
                          <h5 className="font-medium" style={{ color: "#111111" }}>Tickets Support</h5>
                        </div>
                        <ul className="text-sm space-y-1" style={{ color: "#666666" }}>
                          <li>• Voir les tickets ouverts</li>
                          <li>• Nombre de tickets par priorité</li>
                          <li>• Détails d&apos;un ticket</li>
                        </ul>
                      </div>
                    </div>

                    {/* Fonctionnalités Multimédia */}
                    <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🎤</span>
                        <h5 className="font-medium" style={{ color: "#1565C0" }}>Fonctionnalités Multimédia</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.7)" }}>
                          <div className="font-medium text-sm mb-1" style={{ color: "#1976D2" }}>🎙️ Messages Vocaux</div>
                          <p className="text-xs" style={{ color: "#1565C0" }}>
                            Envoyez un message vocal, il sera automatiquement transcrit et traité par l&apos;IA.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.7)" }}>
                          <div className="font-medium text-sm mb-1" style={{ color: "#1976D2" }}>📸 OCR Carte de Visite</div>
                          <p className="text-xs" style={{ color: "#1565C0" }}>
                            Photographiez une carte de visite pour créer automatiquement un client.
                          </p>
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.7)" }}>
                          <div className="font-medium text-sm mb-1" style={{ color: "#1976D2" }}>📄 Export PDF</div>
                          <p className="text-xs" style={{ color: "#1565C0" }}>
                            Demandez le PDF d&apos;une facture ou d&apos;un devis, recevez-le directement.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Rapport Matinal */}
                    <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">☀️</span>
                        <h5 className="font-medium" style={{ color: "#F57C00" }}>Rapport Matinal Automatique</h5>
                      </div>
                      <p className="text-sm" style={{ color: "#EF6C00" }}>
                        Chaque matin à 8h, recevez automatiquement un briefing complet: trésorerie, tâches du jour,
                        factures en retard, devis qui expirent, domaines à renouveler, et plus encore.
                      </p>
                    </div>

                    {/* Exemples de commandes */}
                    <div className="p-4 rounded-xl" style={{ background: "#FAFAFA", border: "1px solid #EEEEEE" }}>
                      <h5 className="font-medium mb-3" style={{ color: "#111111" }}>Exemples de ce que vous pouvez dire:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm" style={{ color: "#666666" }}>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Montre-moi la trésorerie&quot;</div>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Quelles sont mes tâches du jour ?&quot;</div>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Crée un client Dupont SARL&quot;</div>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Envoie-moi le PDF de la facture FAC-2025-0042&quot;</div>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Factures impayées de plus de 30 jours&quot;</div>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Rappelle-moi d&apos;appeler Jean demain 14h&quot;</div>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Quel est le score santé de Acme Corp ?&quot;</div>
                        <div className="p-2 rounded" style={{ background: "#F5F5F7" }}>&quot;Compare le CA janvier vs février&quot;</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                <button
                  onClick={() => handleSave("integrations", { telegramEnabled, telegramBotToken, telegramAllowedUsers, telegramWebhookConfigured })}
                  disabled={saving === "integrations"}
                  className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#0088CC", color: "#FFFFFF" }}
                >
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}

          {/* Revolut Settings */}
          {activeIntegrationTab === "revolut" && (
            <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5F5F5" }}>
                    <CreditCard className="h-5 w-5" style={{ color: "#191C1F" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Revolut Business</h2>
                    <p className="text-sm" style={{ color: "#666666" }}>Synchronisez vos transactions bancaires Revolut</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={revolutEnabled} onChange={(e) => setRevolutEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: revolutEnabled ? "#191C1F" : "#CCCCCC" }} />
                </label>
              </div>

              {revolutEnabled && (
                <>
                  <div className="rounded-xl p-4" style={{ background: "#F5F5F5", border: "1px solid #E0E0E0" }}>
                    <h4 className="font-medium mb-2" style={{ color: "#191C1F" }}>Configuration Revolut Business API</h4>
                    <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#666666" }}>
                      <li>Connectez-vous à votre <a href="https://business.revolut.com/settings/api" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">compte Revolut Business</a></li>
                      <li>Allez dans Settings &gt; API et créez une nouvelle clé API</li>
                      <li>Générez un Client ID et une API Key</li>
                      <li>Copiez les informations ci-dessous</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Environnement</label>
                      <StyledSelect
                        value={revolutEnvironment}
                        onChange={(v) => setRevolutEnvironment(v as "sandbox" | "production")}
                        options={revolutEnvironmentOptions}
                        placeholder="Environnement"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>Client ID *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={revolutClientId} onChange={(e) => setRevolutClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#191C1F]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: "#444444" }}>API Key *</label>
                      <div className="relative">
                        <input type={showIntegrationSecrets ? "text" : "password"} value={revolutApiKey} onChange={(e) => setRevolutApiKey(e.target.value)} placeholder="••••••••••••••••" className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#191C1F]/20" style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }} />
                        <button type="button" onClick={() => setShowIntegrationSecrets(!showIntegrationSecrets)} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70" style={{ color: "#999999" }}>
                          {showIntegrationSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!revolutApiKey) {
                          setRevolutTestResult({ type: "error", message: "API Key requis" })
                          return
                        }
                        setTestingRevolut(true)
                        setRevolutTestResult(null)
                        try {
                          const res = await fetch("/api/revolut/test", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              apiKey: revolutApiKey,
                              environment: revolutEnvironment,
                            }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            setRevolutTestResult({ type: "success", message: data.message })
                          } else {
                            setRevolutTestResult({ type: "error", message: data.error || "Erreur de connexion" })
                          }
                        } catch (err) {
                          setRevolutTestResult({ type: "error", message: "Erreur de connexion à l'API" })
                        } finally {
                          setTestingRevolut(false)
                        }
                      }}
                      disabled={testingRevolut || !revolutApiKey}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
                      style={{ background: "#F5F5F5", color: "#191C1F" }}
                    >
                      {testingRevolut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                      Tester la connexion
                    </button>

                    {revolutTestResult && (
                      <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${revolutTestResult.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {revolutTestResult.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {revolutTestResult.message}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
                <button onClick={() => handleSave("integrations", { revolutEnabled, revolutClientId, revolutApiKey, revolutEnvironment })} disabled={saving === "integrations"} className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "#191C1F", color: "#FFFFFF" }}>
                  {saving === "integrations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
                {saved === "integrations" && <span className="flex items-center gap-1 text-sm" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              </div>
            </div>
          )}

          {/* Dokploy Settings */}
          {activeIntegrationTab === "dokploy" && (
            <DokploySettings />
          )}
        </div>
      )}

      {/* Automations Tab - Crons Management */}
      {activeTab === "automations" && (
        <div
          className="rounded-2xl p-6 w-full space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFF8E1" }}>
              <Clock className="h-5 w-5" style={{ color: "#DCB40A" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Automatisations</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Gérez les tâches automatiques (crons) de votre CRM</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-xl p-4" style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: "#0284C7" }} />
              <div className="text-sm" style={{ color: "#0369A1" }}>
                <strong>À propos des crons</strong>
                <p className="mt-1">Les crons sont des tâches automatiques planifiées. Vous pouvez les exécuter manuellement ici pour tester ou forcer une exécution. En production, ils sont exécutés automatiquement selon leur planification.</p>
              </div>
            </div>
          </div>

          {/* Cron Cards */}
          <div className="space-y-3">
            {availableCrons.map((cron) => {
              const CronIcon = cron.icon
              const result = cronResults[cron.id]
              const isRunning = runningCron === cron.id

              return (
                <div
                  key={cron.id}
                  className="rounded-xl p-4 transition-all"
                  style={{
                    background: "#F8F9FA",
                    border: result
                      ? result.success
                        ? "1px solid #4ADE80"
                        : "1px solid #F87171"
                      : "1px solid #EEEEEE",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${cron.color}15` }}
                      >
                        <CronIcon className="h-5 w-5" style={{ color: cron.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate" style={{ color: "#111111" }}>{cron.name}</h3>
                        <p className="text-sm mt-0.5" style={{ color: "#666666" }}>{cron.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ background: "#E5E7EB", color: "#374151" }}
                          >
                            <Clock className="h-3 w-3" />
                            {cron.schedule}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ background: "#FEE2E2", color: "#991B1B" }}
                          >
                            <Plug className="h-3 w-3" />
                            {cron.requires}
                          </span>
                        </div>
                        {result && (
                          <div
                            className="mt-2 p-2 rounded-lg text-sm flex items-start gap-2"
                            style={{
                              background: result.success ? "#DCFCE7" : "#FEE2E2",
                              color: result.success ? "#166534" : "#991B1B",
                            }}
                          >
                            {result.success ? (
                              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <span>{result.message}</span>
                              <span className="block text-xs opacity-75 mt-1">
                                {result.timestamp.toLocaleString("fr-FR")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => runCron(cron.id, cron.endpoint)}
                      disabled={isRunning || runningCron !== null}
                      className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                      style={{
                        background: isRunning ? "#DCB40A" : "#191C1F",
                        color: "#FFFFFF",
                      }}
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Exécution...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Exécuter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dokploy Configuration */}
          <div className="rounded-xl p-4" style={{ background: "#F8F9FA", border: "1px solid #EEEEEE" }}>
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-5 w-5" style={{ color: "#28B95F" }} />
              <h3 className="font-medium" style={{ color: "#111111" }}>Configuration Dokploy</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: "#666666" }}>
              Copiez ces lignes dans la section &quot;Cron Jobs&quot; de votre application Dokploy.
            </p>

            {/* Cron Secret Field */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}>
              <label className="block text-sm font-medium mb-2" style={{ color: "#111111" }}>
                CRON_SECRET (variable d&apos;environnement)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showCronSecret ? "text" : "password"}
                    value={cronSecret}
                    onChange={(e) => setCronSecret(e.target.value)}
                    placeholder="Entrez votre CRON_SECRET..."
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono pr-10"
                    style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCronSecret(!showCronSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  >
                    {showCronSecret ? (
                      <EyeOff className="h-4 w-4" style={{ color: "#666666" }} />
                    ) : (
                      <Eye className="h-4 w-4" style={{ color: "#666666" }} />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => handleSave("automations", { cronSecret })}
                  disabled={saving === "automations"}
                  className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#191C1F", color: "#FFFFFF" }}
                >
                  {saving === "automations" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
              {saved === "automations" && <span className="flex items-center gap-1 text-sm mt-2" style={{ color: "#28B95F" }}><CheckCircle className="h-4 w-4" />Enregistré</span>}
              <p className="text-xs mt-2" style={{ color: "#666666" }}>
                Ce secret doit correspondre à la variable <code className="px-1 py-0.5 rounded" style={{ background: "#E5E7EB" }}>CRON_SECRET</code> de votre application.
              </p>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 rounded-t-lg text-xs font-medium" style={{ background: "#E5E7EB", color: "#374151" }}>
              <div className="col-span-2">Nom</div>
              <div className="col-span-2">Schedule</div>
              <div className="col-span-7">Commande</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table rows */}
            <div className="divide-y" style={{ borderColor: "#EEEEEE" }}>
              {availableCrons.map((cron) => {
                const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${cron.endpoint}` : cron.endpoint
                const curlCommand = cronSecret
                  ? `curl -X GET "${fullUrl}" -H "Authorization: Bearer ${cronSecret}"`
                  : `curl -X GET "${fullUrl}"`

                return (
                  <div key={cron.id} className="grid grid-cols-12 gap-2 px-3 py-3 items-center hover:bg-white transition-colors">
                    <div className="col-span-2">
                      <span className="text-xs font-medium truncate block" style={{ color: "#111111" }}>{cron.name}</span>
                    </div>
                    <div className="col-span-2">
                      <code className="px-2 py-1 rounded text-xs font-mono" style={{ background: "#FEF3CD", color: "#92400E" }}>
                        {cron.cronExpression}
                      </code>
                    </div>
                    <div className="col-span-7">
                      <code
                        className="block px-2 py-1.5 rounded text-xs font-mono truncate"
                        style={{ background: "#FFFFFF", border: "1px solid #EEEEEE", color: "#374151" }}
                        title={curlCommand}
                      >
                        {curlCommand}
                      </code>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(curlCommand)
                          setCopiedCron(cron.id)
                          setTimeout(() => setCopiedCron(null), 2000)
                        }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ background: copiedCron === cron.id ? "#DCFCE7" : "transparent" }}
                        title="Copier la commande"
                      >
                        {copiedCron === cron.id ? (
                          <CheckCircle className="h-4 w-4" style={{ color: "#16A34A" }} />
                        ) : (
                          <Copy className="h-4 w-4" style={{ color: "#666666" }} />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Copy all button */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={() => {
                  const authHeader = cronSecret ? ` -H "Authorization: Bearer ${cronSecret}"` : ""
                  const allCommands = availableCrons.map(cron => {
                    const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${cron.endpoint}` : cron.endpoint
                    return `# ${cron.name} (${cron.schedule})\n${cron.cronExpression} curl -X GET "${fullUrl}"${authHeader}`
                  }).join("\n\n")
                  navigator.clipboard.writeText(allCommands)
                  setCopiedCron("all")
                  setTimeout(() => setCopiedCron(null), 2000)
                }}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                style={{
                  background: copiedCron === "all" ? "#DCFCE7" : "#FFFFFF",
                  border: "1px solid #EEEEEE",
                  color: copiedCron === "all" ? "#16A34A" : "#374151"
                }}
              >
                {copiedCron === "all" ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copier tous les crons
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Tab - Personal O365 Calendar */}
      {activeTab === "calendar" && (
        <div
          className="rounded-2xl p-6 w-full space-y-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#E3F2FD" }}>
              <Calendar className="h-5 w-5" style={{ color: "#14B4E6" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Mon Calendrier</h2>
              <p className="text-sm" style={{ color: "#666666" }}>Connectez votre calendrier Microsoft 365 pour les rappels et l&apos;affichage des rendez-vous</p>
            </div>
          </div>

          {/* Status Card */}
          <div
            className="rounded-xl p-5"
            style={{
              background: calendarConnected ? "#E8F5E9" : "#FFF8E1",
              border: `1px solid ${calendarConnected ? "#4CAF50" : "#F57C00"}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ background: calendarConnected ? "#C8E6C9" : "#FFECB3" }}
                >
                  {calendarConnected ? (
                    <Link className="h-6 w-6" style={{ color: "#2E7D32" }} />
                  ) : (
                    <Unlink className="h-6 w-6" style={{ color: "#F57C00" }} />
                  )}
                </div>
                <div>
                  <p className="font-medium" style={{ color: calendarConnected ? "#2E7D32" : "#E65100" }}>
                    {calendarConnected ? "Calendrier connecté" : "Calendrier non connecté"}
                  </p>
                  {calendarConnected && calendarConnectedEmail && (
                    <p className="text-sm" style={{ color: "#388E3C" }}>
                      {calendarConnectedEmail}
                    </p>
                  )}
                  {calendarConnected && calendarConnectedAt && (
                    <p className="text-xs mt-0.5" style={{ color: "#66BB6A" }}>
                      Connecté le {new Date(calendarConnectedAt).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {!calendarConnected && (
                    <p className="text-sm" style={{ color: "#F57C00" }}>
                      Connectez votre calendrier pour voir vos prochains RDV
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {calendarConnected && (
                  <button
                    onClick={async () => {
                      if (!confirm("Déconnecter votre calendrier O365 ?")) return
                      setDisconnectingCalendar(true)
                      try {
                        const res = await fetch("/api/users/o365-disconnect", { method: "POST" })
                        if (res.ok) {
                          setCalendarConnected(false)
                          setCalendarConnectedEmail("")
                          setCalendarConnectedAt(null)
                        }
                      } catch (e) {
                        console.error("Error disconnecting calendar:", e)
                      } finally {
                        setDisconnectingCalendar(false)
                      }
                    }}
                    disabled={disconnectingCalendar}
                    className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: "#FFFFFF", color: "#F04B69", border: "1px solid #F04B69" }}
                  >
                    {disconnectingCalendar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                    Déconnecter
                  </button>
                )}
                <button
                  onClick={() => {
                    setConnectingCalendar(true)
                    window.location.href = "/api/users/o365-connect"
                  }}
                  disabled={connectingCalendar}
                  className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: calendarConnected ? "#E8F5E9" : "#14B4E6",
                    color: calendarConnected ? "#2E7D32" : "#FFFFFF",
                  }}
                >
                  {connectingCalendar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link className="h-4 w-4" />
                  )}
                  {calendarConnected ? "Reconnecter" : "Connecter mon calendrier"}
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="rounded-xl p-4" style={{ background: "#F5F5F7" }}>
            <h3 className="font-medium mb-3" style={{ color: "#111111" }}>Fonctionnalités activées avec votre calendrier</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E3F2FD" }}>
                  <Calendar className="h-4 w-4" style={{ color: "#14B4E6" }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: "#111111" }}>Prochain RDV dans la navbar</p>
                  <p className="text-xs" style={{ color: "#666666" }}>Votre prochain rendez-vous s&apos;affiche en haut de l&apos;écran</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E3F2FD" }}>
                  <Bell className="h-4 w-4" style={{ color: "#14B4E6" }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: "#111111" }}>Rappels Telegram</p>
                  <p className="text-xs" style={{ color: "#666666" }}>Notification 10 min avant chaque réunion</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E3F2FD" }}>
                  <MessageSquare className="h-4 w-4" style={{ color: "#14B4E6" }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: "#111111" }}>Rapport matinal personnalisé</p>
                  <p className="text-xs" style={{ color: "#666666" }}>Vos RDV du jour dans le briefing Telegram</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E3F2FD" }}>
                  <Clock className="h-4 w-4" style={{ color: "#14B4E6" }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: "#111111" }}>Synchronisation en temps réel</p>
                  <p className="text-xs" style={{ color: "#666666" }}>Mise à jour automatique toutes les 2 minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl p-4" style={{ background: "#E3F2FD", border: "1px solid #14B4E6" }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#14B4E6" }} />
              <div>
                <p className="font-medium" style={{ color: "#0D47A1" }}>Connexion personnelle</p>
                <p className="text-sm mt-1" style={{ color: "#1565C0" }}>
                  Cette connexion est propre à votre compte utilisateur. Chaque administrateur peut connecter
                  son propre calendrier O365 pour recevoir ses rappels personnalisés.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === "api" && (
        <div
          className="rounded-2xl p-6 w-full"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <ApiKeysSettings />
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
