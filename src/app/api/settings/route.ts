import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant non trouvé" },
        { status: 404 }
      )
    }

    // Parse settings JSON and map snake_case to camelCase
    let rawSettings: Record<string, unknown> = {}
    try {
      if (tenant.settings) {
        rawSettings = JSON.parse(tenant.settings)
      }
    } catch {
      rawSettings = {}
    }

    // Map old snake_case keys to new camelCase keys for compatibility
    const settings: Record<string, unknown> = {
      // Company
      ownerName: rawSettings.ownerName || rawSettings.owner_name || "",
      siret: rawSettings.siret || rawSettings.siret || "",
      city: rawSettings.city || "",
      postalCode: rawSettings.postalCode || rawSettings.postal_code || "",
      website: rawSettings.website || "",

      // Bank / Payment
      bankName: rawSettings.bankName || rawSettings.bank_name || "",
      bankAccountHolder: rawSettings.bankAccountHolder || rawSettings.bank_account_holder || "",
      iban: rawSettings.iban || rawSettings.bank_iban || "",
      bic: rawSettings.bic || rawSettings.bank_bic || "",
      paymentTerms: rawSettings.paymentTerms || rawSettings.payment_terms || 30,
      lateFee: rawSettings.lateFee || rawSettings.late_fee || 10,

      // Invoice
      invoicePrefix: rawSettings.invoicePrefix || rawSettings.invoice_prefix || "FAC",
      quotePrefix: rawSettings.quotePrefix || rawSettings.quote_prefix || "DEV",
      nextInvoiceNumber: rawSettings.nextInvoiceNumber || rawSettings.next_invoice_number || 1,
      nextQuoteNumber: rawSettings.nextQuoteNumber || rawSettings.next_quote_number || 1,
      invoiceNumberFormat: rawSettings.invoiceNumberFormat || rawSettings.invoice_number_format || "{PREFIX}-{YEAR}-{NUMBER}",
      quoteNumberFormat: rawSettings.quoteNumberFormat || rawSettings.quote_number_format || "{PREFIX}-{YEAR}-{NUMBER}",
      invoiceFooter: rawSettings.invoiceFooter || rawSettings.invoice_footer_text || "",
      quoteFooter: rawSettings.quoteFooter || rawSettings.quote_footer_text || "",
      legalMentions: rawSettings.legalMentions || rawSettings.legal_mentions || "",
      defaultVatRate: rawSettings.defaultVatRate || rawSettings.default_vat_rate || 20,

      // SMTP / Email
      smtpHost: rawSettings.smtpHost || rawSettings.smtp_host || "",
      smtpPort: rawSettings.smtpPort || rawSettings.smtp_port || 587,
      smtpUsername: rawSettings.smtpUsername || rawSettings.smtp_username || "",
      smtpPassword: rawSettings.smtpPassword || rawSettings.smtp_password || "",
      smtpEncryption: rawSettings.smtpEncryption || rawSettings.smtp_encryption || "tls",
      smtpFromAddress: rawSettings.smtpFromAddress || rawSettings.smtp_from_address || "",
      smtpFromName: rawSettings.smtpFromName || rawSettings.smtp_from_name || "",

      // Goals
      monthlyGoal: rawSettings.monthlyGoal || rawSettings.monthly_goal || null,
      monthlyGoalMode: rawSettings.monthlyGoalMode || rawSettings.monthly_goal_mode || "auto",

      // OVH
      ovhAppKey: rawSettings.ovhAppKey || rawSettings.ovh_app_key || "",
      ovhAppSecret: rawSettings.ovhAppSecret || rawSettings.ovh_app_secret || "",
      ovhConsumerKey: rawSettings.ovhConsumerKey || rawSettings.ovh_consumer_key || "",
      ovhEndpoint: rawSettings.ovhEndpoint || rawSettings.ovh_endpoint || "ovh-eu",

      // Cloudflare
      cloudflareApiToken: rawSettings.cloudflareApiToken || rawSettings.cloudflare_api_token || "",

      // Slack
      slackEnabled: rawSettings.slackEnabled || rawSettings.slack_enabled || false,
      slackWebhookUrl: rawSettings.slackWebhookUrl || rawSettings.slack_webhook_url || "",
      slackBotToken: rawSettings.slackBotToken || rawSettings.slack_bot_token || "",
      slackChannelId: rawSettings.slackChannelId || rawSettings.slack_channel_id || "",
      slackNotifyOnNew: rawSettings.slackNotifyOnNew ?? rawSettings.slack_notify_on_new ?? true,
      slackNotifyOnReply: rawSettings.slackNotifyOnReply ?? rawSettings.slack_notify_on_reply ?? true,
      slackNotifyOnAssign: rawSettings.slackNotifyOnAssign || rawSettings.slack_notify_on_assign || false,

      // OpenAI
      openaiEnabled: rawSettings.openaiEnabled || rawSettings.openai_enabled || false,
      openaiApiKey: rawSettings.openaiApiKey || rawSettings.openai_api_key || "",
      openaiModel: rawSettings.openaiModel || rawSettings.openai_model || "gpt-4o-mini",
      openaiAutoSuggest: rawSettings.openaiAutoSuggest ?? rawSettings.openai_auto_suggest ?? true,
      openaiAutoClassify: rawSettings.openaiAutoClassify ?? rawSettings.openai_auto_classify ?? false,

      // O365
      o365Enabled: rawSettings.o365Enabled || rawSettings.o365_enabled || false,
      o365ClientId: rawSettings.o365ClientId || rawSettings.o365_client_id || "",
      o365ClientSecret: rawSettings.o365ClientSecret || rawSettings.o365_client_secret || "",
      o365TenantId: rawSettings.o365TenantId || rawSettings.o365_tenant_id || "",
      o365SupportEmail: rawSettings.o365SupportEmail || rawSettings.o365_support_email || "",
      o365AutoSync: rawSettings.o365AutoSync ?? rawSettings.o365_auto_sync ?? false,
      o365AllowedGroups: rawSettings.o365AllowedGroups || "",

      // GoCardless (Bank Account Data API)
      gocardlessEnabled: rawSettings.gocardlessEnabled || false,
      gocardlessSecretId: rawSettings.gocardlessSecretId || "",
      gocardlessSecretKey: rawSettings.gocardlessSecretKey || "",
      gocardlessEnvironment: rawSettings.gocardlessEnvironment || "sandbox",

      // DocuSeal (Electronic Signatures)
      docusealEnabled: rawSettings.docusealEnabled || false,
      docusealApiUrl: rawSettings.docusealApiUrl || "https://api.docuseal.com",
      docusealApiKey: rawSettings.docusealApiKey || "",
      docusealWebhookSecret: rawSettings.docusealWebhookSecret || "",

      // SEPA Direct Debit
      sepaIcs: rawSettings.sepaIcs || "",
      sepaCreditorName: rawSettings.sepaCreditorName || "",
      sepaCreditorIban: rawSettings.sepaCreditorIban || "",
      sepaCreditorBic: rawSettings.sepaCreditorBic || "",

      // Telegram
      telegramEnabled: rawSettings.telegramEnabled || false,
      telegramBotToken: rawSettings.telegramBotToken || "",
      telegramAllowedUsers: rawSettings.telegramAllowedUsers || "",
      telegramWebhookConfigured: rawSettings.telegramWebhookConfigured || false,

      // Revolut
      revolutEnabled: rawSettings.revolutEnabled || false,
      revolutClientId: rawSettings.revolutClientId || "",
      revolutApiKey: rawSettings.revolutApiKey || "",
      revolutEnvironment: rawSettings.revolutEnvironment || "sandbox",

      // S3 Storage (for support downloads)
      s3Endpoint: rawSettings.s3Endpoint || "",
      s3Region: rawSettings.s3Region || "fr-par",
      s3AccessKey: rawSettings.s3AccessKey || "",
      s3SecretKey: rawSettings.s3SecretKey || "",
      s3Bucket: rawSettings.s3Bucket || "",
      s3ForcePathStyle: rawSettings.s3ForcePathStyle ?? true,
    }

    return NextResponse.json({
      id: tenant.id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      logo: tenant.logo,
      timezone: tenant.timezone,
      currency: tenant.currency,
      status: tenant.status,
      settings,
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Get current settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    let currentSettings: Record<string, unknown> = {}
    try {
      if (tenant?.settings) {
        currentSettings = JSON.parse(tenant.settings)
      }
    } catch {
      currentSettings = {}
    }

    // Handle different sections
    if (body.section === "company") {
      const updatedSettings = {
        ...currentSettings,
        ownerName: body.ownerName || "",
        siret: body.siret || "",
        city: body.city || "",
        postalCode: body.postalCode || "",
        website: body.website || "",
      }

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone || null,
          address: body.address || null,
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "goals") {
      const updatedSettings = {
        ...currentSettings,
        monthlyGoal: body.monthlyGoal || null,
        monthlyGoalMode: body.monthlyGoalMode || "auto",
      }

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "email") {
      // Preserve existing password if not provided (check both camelCase and snake_case for legacy)
      const existingPassword = String(currentSettings.smtpPassword || currentSettings.smtp_password || "")

      console.log("Saving email settings:", {
        smtpHost: body.smtpHost,
        smtpUsername: body.smtpUsername,
        smtpPasswordProvided: !!body.smtpPassword,
        smtpPasswordLength: body.smtpPassword?.length || 0,
        existingPasswordLength: existingPassword.length,
      })

      const updatedSettings = {
        ...currentSettings,
        smtpHost: body.smtpHost || "",
        smtpPort: body.smtpPort || 587,
        smtpUsername: body.smtpUsername || "",
        smtpPassword: body.smtpPassword || existingPassword,
        smtpEncryption: body.smtpEncryption || "tls",
        smtpFromAddress: body.smtpFromAddress || "",
        smtpFromName: body.smtpFromName || "",
        // Remove old snake_case key to avoid confusion
        smtp_password: undefined,
      }

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "payment") {
      const updatedSettings = {
        ...currentSettings,
        bankName: body.bankName || "",
        bankAccountHolder: body.bankAccountHolder || "",
        iban: body.iban || "",
        bic: body.bic || "",
        paymentTerms: body.paymentTerms || 30,
        lateFee: body.lateFee || 10,
      }

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "invoice") {
      const updatedSettings = {
        ...currentSettings,
        invoicePrefix: body.invoicePrefix || "FAC",
        quotePrefix: body.quotePrefix || "DEV",
        nextInvoiceNumber: body.nextInvoiceNumber ?? currentSettings.nextInvoiceNumber ?? 1,
        nextQuoteNumber: body.nextQuoteNumber ?? currentSettings.nextQuoteNumber ?? 1,
        invoiceNumberFormat: body.invoiceNumberFormat || "{PREFIX}-{YEAR}-{NUMBER}",
        quoteNumberFormat: body.quoteNumberFormat || "{PREFIX}-{YEAR}-{NUMBER}",
        invoiceFooter: body.invoiceFooter || "",
        quoteFooter: body.quoteFooter || "",
        legalMentions: body.legalMentions || "",
        defaultVatRate: body.defaultVatRate || 20,
      }

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "ovh") {
      // Pour OVH, on remplace toujours toutes les valeurs fournies
      const updatedSettings = {
        ...currentSettings,
        ovhAppKey: body.ovhAppKey ?? currentSettings.ovhAppKey ?? "",
        ovhAppSecret: body.ovhAppSecret ?? currentSettings.ovhAppSecret ?? "",
        ovhConsumerKey: body.ovhConsumerKey ?? currentSettings.ovhConsumerKey ?? "",
        ovhEndpoint: body.ovhEndpoint || "ovh-eu",
      }

      console.log("Saving OVH settings:", {
        appKey: updatedSettings.ovhAppKey,
        consumerKey: updatedSettings.ovhConsumerKey,
      })

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "cloudflare") {
      const updatedSettings = {
        ...currentSettings,
        cloudflareApiToken: body.cloudflareApiToken ?? currentSettings.cloudflareApiToken ?? "",
      }

      console.log("Saving Cloudflare settings")

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "slack") {
      const updatedSettings = {
        ...currentSettings,
        slackEnabled: body.slackEnabled || false,
        slackWebhookUrl: body.slackWebhookUrl || "",
        slackBotToken: body.slackBotToken || "",
        slackChannelId: body.slackChannelId || "",
        slackNotifyOnNew: body.slackNotifyOnNew ?? true,
        slackNotifyOnReply: body.slackNotifyOnReply ?? true,
        slackNotifyOnAssign: body.slackNotifyOnAssign || false,
      }

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (body.section === "integrations") {
      // Handle all integrations - partial updates based on what's provided
      const updatedSettings = { ...currentSettings }

      // Slack settings
      if (body.slackEnabled !== undefined) updatedSettings.slackEnabled = body.slackEnabled
      if (body.slackWebhookUrl !== undefined) updatedSettings.slackWebhookUrl = body.slackWebhookUrl
      if (body.slackBotToken !== undefined) updatedSettings.slackBotToken = body.slackBotToken
      if (body.slackChannelId !== undefined) updatedSettings.slackChannelId = body.slackChannelId
      if (body.slackNotifyOnNew !== undefined) updatedSettings.slackNotifyOnNew = body.slackNotifyOnNew
      if (body.slackNotifyOnReply !== undefined) updatedSettings.slackNotifyOnReply = body.slackNotifyOnReply

      // OpenAI settings
      if (body.openaiEnabled !== undefined) updatedSettings.openaiEnabled = body.openaiEnabled
      if (body.openaiApiKey !== undefined) updatedSettings.openaiApiKey = body.openaiApiKey
      if (body.openaiModel !== undefined) updatedSettings.openaiModel = body.openaiModel
      if (body.openaiAutoSuggest !== undefined) updatedSettings.openaiAutoSuggest = body.openaiAutoSuggest
      if (body.openaiAutoClassify !== undefined) updatedSettings.openaiAutoClassify = body.openaiAutoClassify

      // O365 settings
      if (body.o365Enabled !== undefined) updatedSettings.o365Enabled = body.o365Enabled
      if (body.o365ClientId !== undefined) updatedSettings.o365ClientId = body.o365ClientId
      if (body.o365ClientSecret !== undefined) updatedSettings.o365ClientSecret = body.o365ClientSecret
      if (body.o365TenantId !== undefined) updatedSettings.o365TenantId = body.o365TenantId
      if (body.o365SupportEmail !== undefined) updatedSettings.o365SupportEmail = body.o365SupportEmail
      if (body.o365AutoSync !== undefined) updatedSettings.o365AutoSync = body.o365AutoSync
      if (body.o365AllowedGroups !== undefined) updatedSettings.o365AllowedGroups = body.o365AllowedGroups

      // GoCardless settings
      if (body.gocardlessEnabled !== undefined) updatedSettings.gocardlessEnabled = body.gocardlessEnabled
      if (body.gocardlessSecretId !== undefined) updatedSettings.gocardlessSecretId = body.gocardlessSecretId
      if (body.gocardlessSecretKey !== undefined) updatedSettings.gocardlessSecretKey = body.gocardlessSecretKey
      if (body.gocardlessEnvironment !== undefined) updatedSettings.gocardlessEnvironment = body.gocardlessEnvironment

      // DocuSeal settings
      if (body.docusealEnabled !== undefined) updatedSettings.docusealEnabled = body.docusealEnabled
      if (body.docusealApiUrl !== undefined) updatedSettings.docusealApiUrl = body.docusealApiUrl
      if (body.docusealApiKey !== undefined) updatedSettings.docusealApiKey = body.docusealApiKey
      if (body.docusealWebhookSecret !== undefined) updatedSettings.docusealWebhookSecret = body.docusealWebhookSecret

      // SEPA settings
      if (body.sepaIcs !== undefined) updatedSettings.sepaIcs = body.sepaIcs
      if (body.sepaCreditorName !== undefined) updatedSettings.sepaCreditorName = body.sepaCreditorName
      if (body.sepaCreditorIban !== undefined) updatedSettings.sepaCreditorIban = body.sepaCreditorIban
      if (body.sepaCreditorBic !== undefined) updatedSettings.sepaCreditorBic = body.sepaCreditorBic

      // Telegram settings
      if (body.telegramEnabled !== undefined) updatedSettings.telegramEnabled = body.telegramEnabled
      if (body.telegramBotToken !== undefined) updatedSettings.telegramBotToken = body.telegramBotToken
      if (body.telegramAllowedUsers !== undefined) updatedSettings.telegramAllowedUsers = body.telegramAllowedUsers
      if (body.telegramWebhookConfigured !== undefined) updatedSettings.telegramWebhookConfigured = body.telegramWebhookConfigured

      // Revolut settings
      if (body.revolutEnabled !== undefined) updatedSettings.revolutEnabled = body.revolutEnabled
      if (body.revolutClientId !== undefined) updatedSettings.revolutClientId = body.revolutClientId
      if (body.revolutApiKey !== undefined) updatedSettings.revolutApiKey = body.revolutApiKey
      if (body.revolutEnvironment !== undefined) updatedSettings.revolutEnvironment = body.revolutEnvironment

      // S3 Storage settings
      if (body.s3Endpoint !== undefined) updatedSettings.s3Endpoint = body.s3Endpoint
      if (body.s3Region !== undefined) updatedSettings.s3Region = body.s3Region
      if (body.s3AccessKey !== undefined) updatedSettings.s3AccessKey = body.s3AccessKey
      if (body.s3SecretKey !== undefined) updatedSettings.s3SecretKey = body.s3SecretKey
      if (body.s3Bucket !== undefined) updatedSettings.s3Bucket = body.s3Bucket
      if (body.s3ForcePathStyle !== undefined) updatedSettings.s3ForcePathStyle = body.s3ForcePathStyle

      await prisma.tenants.update({
        where: { id: BigInt(1) },
        data: {
          settings: JSON.stringify(updatedSettings),
          updated_at: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: "Section non reconnue" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres" },
      { status: 500 }
    )
  }
}
