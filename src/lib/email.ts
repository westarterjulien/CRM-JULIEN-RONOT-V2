import nodemailer from "nodemailer"
import { prisma } from "./prisma"

interface SmtpSettings {
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  smtpEncryption: string
  smtpFromAddress: string
  smtpFromName: string
}

// Cache for SMTP settings (refreshed every 5 minutes)
let cachedSettings: SmtpSettings | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const now = Date.now()

  // Return cached settings if still valid
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings
  }

  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { settings: true, name: true },
    })

    if (!tenant?.settings) {
      console.warn("No SMTP settings found in database")
      return null
    }

    const rawSettings = JSON.parse(tenant.settings)

    cachedSettings = {
      smtpHost: rawSettings.smtpHost || rawSettings.smtp_host || "",
      smtpPort: parseInt(rawSettings.smtpPort || rawSettings.smtp_port || "587"),
      smtpUsername: rawSettings.smtpUsername || rawSettings.smtp_username || "",
      smtpPassword: rawSettings.smtpPassword || rawSettings.smtp_password || "",
      smtpEncryption: rawSettings.smtpEncryption || rawSettings.smtp_encryption || "tls",
      smtpFromAddress: rawSettings.smtpFromAddress || rawSettings.smtp_from_address || "",
      smtpFromName: rawSettings.smtpFromName || rawSettings.smtp_from_name || tenant.name || "CRM",
    }
    cacheTimestamp = now

    return cachedSettings
  } catch (error) {
    console.error("Error fetching SMTP settings:", error)
    return null
  }
}

async function createTransporter() {
  const settings = await getSmtpSettings()

  if (!settings || !settings.smtpHost || !settings.smtpUsername) {
    throw new Error("SMTP non configuré. Veuillez configurer les paramètres email dans les réglages.")
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpEncryption === "ssl", // true for 465, false for other ports
    auth: {
      user: settings.smtpUsername,
      pass: settings.smtpPassword,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const settings = await getSmtpSettings()

  if (!settings) {
    throw new Error("SMTP non configuré")
  }

  const transporter = await createTransporter()
  const fromAddress = settings.smtpFromAddress || settings.smtpUsername
  const fromName = settings.smtpFromName || "CRM"

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent:", info.messageId, "to:", to)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email to", to, ":", error)
    throw error
  }
}

// ============================================================================
// UNIFIED EMAIL TEMPLATE SYSTEM
// Design: Clean, professional, single color (#0064FA), compatible Outlook/Gmail
// ============================================================================

function getEmailHeader(logoUrl: string | undefined, companyName: string, title: string, subtitle?: string): string {
  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 48px; max-width: 180px;" />`
    : `<span style="font-size: 24px; font-weight: bold; color: #0064FA;">${companyName}</span>`

  return `
    <!-- Header with Logo -->
    <tr>
      <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #E5E7EB;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              ${logoSection}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Title Section -->
    <tr>
      <td style="padding: 32px 40px 24px 40px;">
        <h1 style="color: #111111; font-size: 24px; margin: 0 0 8px 0; font-weight: 600; text-align: center;">
          ${title}
        </h1>
        ${subtitle ? `<p style="color: #6B7280; font-size: 14px; margin: 0; text-align: center;">${subtitle}</p>` : ''}
      </td>
    </tr>
  `
}

function getEmailFooter(companyName: string): string {
  return `
    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0; text-align: center;">
          ${companyName} &bull; Cet email a été envoyé automatiquement
        </p>
      </td>
    </tr>
  `
}

function getEmailButton(url: string, text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" stroke="f" fillcolor="#0064FA">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${text}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${url}" style="display: inline-block; background-color: #0064FA; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 15px; font-weight: 600; border-radius: 8px; mso-hide: all;">
            ${text}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>

    <p style="text-align: center; margin: 0;">
      <a href="${url}" style="color: #6B7280; font-size: 11px; word-break: break-all;">Lien direct</a>
    </p>
  `
}

function getEmailWrapper(content: string): string {
  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F4F6">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 560px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${content}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

export async function sendPasswordResetEmail(email: string, token: string, userName: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  let companyName = "CRM"
  let logoUrl: string | undefined
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { name: true, settings: true },
    })
    if (tenant?.name) companyName = tenant.name
    if (tenant?.settings) {
      const settings = JSON.parse(tenant.settings as string)
      logoUrl = settings.logoUrl || settings.logo_url
    }
  } catch {
    // Use default
  }

  const content = `
    ${getEmailHeader(logoUrl, companyName, "Réinitialisation du mot de passe")}

    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
          Bonjour <strong>${userName}</strong>,
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
        </p>

        <!-- Info Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F0F7FF; border-radius: 8px; border-left: 4px solid #0064FA;">
              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
                Ce lien est valable pendant <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.
              </p>
            </td>
          </tr>
        </table>

        ${getEmailButton(resetUrl, "Réinitialiser")}

        <!-- Warning -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #FEF3C7; border-radius: 8px;">
              <p style="margin: 0; color: #92400E; font-size: 13px; line-height: 1.5;">
                <strong>Vous n'êtes pas à l'origine de cette demande ?</strong><br />
                Ignorez simplement cet email, votre mot de passe restera inchangé.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getEmailFooter(companyName)}
  `

  return sendEmail({
    to: email,
    subject: `Réinitialisation de votre mot de passe - ${companyName}`,
    html: getEmailWrapper(content),
  })
}

export async function sendClientInvitationEmail(
  email: string,
  token: string,
  inviterName: string,
  companyName: string
) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client/accept-invitation?token=${token}`

  let logoUrl: string | undefined
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { settings: true },
    })
    if (tenant?.settings) {
      const settings = JSON.parse(tenant.settings as string)
      logoUrl = settings.logoUrl || settings.logo_url
    }
  } catch {
    // Ignore
  }

  const content = `
    ${getEmailHeader(logoUrl, companyName, "Bienvenue sur votre espace client", `Invitation de ${inviterName}`)}

    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Bonjour,
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          <strong>${inviterName}</strong> vous invite à rejoindre l'espace client de <strong>${companyName}</strong>.
        </p>

        <!-- Features Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px; background-color: #F9FAFB; border-radius: 8px;">
              <p style="margin: 0 0 12px 0; color: #111111; font-size: 14px; font-weight: 600;">
                Votre espace client vous permet de :
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding: 6px 0; color: #374151; font-size: 14px;">• Consulter et télécharger vos factures</td></tr>
                <tr><td style="padding: 6px 0; color: #374151; font-size: 14px;">• Voir et accepter vos devis en ligne</td></tr>
                <tr><td style="padding: 6px 0; color: #374151; font-size: 14px;">• Signer vos contrats électroniquement</td></tr>
              </table>
            </td>
          </tr>
        </table>

        ${getEmailButton(inviteUrl, "Créer mon compte")}

        <!-- Expiration Notice -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #FEF3C7; border-radius: 8px;">
              <p style="margin: 0; color: #92400E; font-size: 13px;">
                <strong>Attention :</strong> Ce lien d'invitation expire dans 72 heures.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getEmailFooter(companyName)}
  `

  return sendEmail({
    to: email,
    subject: `Invitation - Votre espace client ${companyName}`,
    html: getEmailWrapper(content),
  })
}

export async function sendSignatureRequestEmail(
  email: string,
  signerName: string,
  signingUrl: string,
  contractTitle: string,
  senderName: string,
  senderCompany: string,
  expiresAt?: Date,
  message?: string,
  logoUrl?: string
) {
  const expirationDate = expiresAt
    ? expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const content = `
    ${getEmailHeader(logoUrl, senderCompany, "Document à signer", `De la part de ${senderName}`)}

    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Bonjour <strong>${signerName}</strong>,
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Vous avez un document à signer électroniquement.
        </p>

        <!-- Document Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px; background-color: #F0F7FF; border-radius: 8px; border-left: 4px solid #0064FA;">
              <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Document</p>
              <p style="margin: 0; color: #111111; font-size: 16px; font-weight: 600;">${contractTitle}</p>
              ${expirationDate ? `<p style="margin: 8px 0 0 0; color: #DC2626; font-size: 13px;">À signer avant le ${expirationDate}</p>` : ''}
            </td>
          </tr>
        </table>

        ${message ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F9FAFB; border-radius: 8px; border-left: 4px solid #E5E7EB;">
              <p style="margin: 0; color: #374151; font-size: 14px; font-style: italic; line-height: 1.5;">"${message}"</p>
            </td>
          </tr>
        </table>
        ` : ''}

        ${getEmailButton(signingUrl, "Signer le document")}

        <!-- Instructions -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F9FAFB; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; color: #111111; font-size: 13px; font-weight: 600;">Comment signer :</p>
              <p style="margin: 0; color: #6B7280; font-size: 13px; line-height: 1.6;">
                1. Cliquez sur le bouton ci-dessus<br/>
                2. Vérifiez le document<br/>
                3. Apposez votre signature électronique
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getEmailFooter(senderCompany)}
  `

  return sendEmail({
    to: email,
    subject: `Document à signer : ${contractTitle}`,
    html: getEmailWrapper(content),
  })
}

/**
 * Send invoice email to client
 * @param paymentMethod - Mode de paiement (ex: "Virement bancaire", "Prélèvement automatique", "Carte bancaire")
 * @param directDebitDate - Date de prélèvement si applicable
 */
export async function sendInvoiceEmail(
  email: string,
  clientName: string,
  invoiceNumber: string,
  invoiceDate: string,
  dueDate: string,
  totalAmount: string,
  viewUrl: string,
  senderCompany: string,
  logoUrl?: string,
  message?: string,
  paymentMethod?: string,
  directDebitDate?: string
) {
  const displayPaymentMethod = paymentMethod || 'Virement bancaire'
  const isDirectDebit = paymentMethod?.toLowerCase().includes('prélèvement')
  const isCard = paymentMethod?.toLowerCase().includes('carte')
  const isTransfer = !isDirectDebit && !isCard

  // Payment method specific message
  let paymentInfo = ''
  if (isDirectDebit && directDebitDate) {
    paymentInfo = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px; background-color: #DBEAFE; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #1E40AF; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Prélèvement automatique</p>
            <p style="margin: 0; color: #1E40AF; font-size: 18px; font-weight: 700;">Le ${directDebitDate}</p>
            <p style="margin: 8px 0 0 0; color: #3B82F6; font-size: 13px;">Aucune action requise de votre part</p>
          </td>
        </tr>
      </table>
    `
  } else if (isCard) {
    paymentInfo = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px; background-color: #F0FDF4; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Paiement par carte bancaire</p>
            <p style="margin: 0; color: #166534; font-size: 14px;">Cliquez sur le bouton ci-dessous pour payer en ligne de manière sécurisée.</p>
          </td>
        </tr>
      </table>
    `
  } else if (isTransfer) {
    paymentInfo = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px; background-color: #FEF3C7; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 4px 0; color: #92400E; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Paiement par virement bancaire</p>
            <p style="margin: 0; color: #92400E; font-size: 14px;">Les coordonnées bancaires sont disponibles sur la facture.</p>
          </td>
        </tr>
      </table>
    `
  }

  const content = `
    ${getEmailHeader(logoUrl, senderCompany, "Nouvelle facture", invoiceNumber)}

    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Bonjour <strong>${clientName}</strong>,
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Veuillez trouver ci-dessous votre facture.
        </p>

        <!-- Invoice Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 16px 20px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%">
                    <p style="margin: 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Date d'émission</p>
                    <p style="margin: 4px 0 0 0; color: #111111; font-size: 14px; font-weight: 600;">${invoiceDate}</p>
                  </td>
                  <td width="50%" align="right">
                    <p style="margin: 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Échéance</p>
                    <p style="margin: 4px 0 0 0; color: #DC2626; font-size: 14px; font-weight: 600;">${dueDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Montant TTC</p>
              <p style="margin: 0; color: #0064FA; font-size: 32px; font-weight: 700;">${totalAmount}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0; color: #374151; font-size: 13px;">
                <strong>Mode de paiement :</strong> ${displayPaymentMethod}
              </p>
            </td>
          </tr>
        </table>

        ${paymentInfo}

        ${message ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F9FAFB; border-radius: 8px; border-left: 4px solid #E5E7EB;">
              <p style="margin: 0; color: #374151; font-size: 14px; font-style: italic; line-height: 1.5;">"${message}"</p>
            </td>
          </tr>
        </table>
        ` : ''}

        ${getEmailButton(viewUrl, "Voir ma facture")}
      </td>
    </tr>

    ${getEmailFooter(senderCompany)}
  `

  return sendEmail({
    to: email,
    subject: `Facture ${invoiceNumber} - ${senderCompany}`,
    html: getEmailWrapper(content),
  })
}

/**
 * Send quote email to client
 */
export async function sendQuoteEmail(
  email: string,
  clientName: string,
  quoteNumber: string,
  quoteDate: string,
  validUntil: string,
  totalAmount: string,
  viewUrl: string,
  senderCompany: string,
  logoUrl?: string,
  message?: string
) {
  const content = `
    ${getEmailHeader(logoUrl, senderCompany, "Nouveau devis", quoteNumber)}

    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Bonjour <strong>${clientName}</strong>,
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Suite à notre échange, veuillez trouver ci-dessous notre proposition commerciale.
        </p>

        <!-- Quote Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 16px 20px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%">
                    <p style="margin: 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                    <p style="margin: 4px 0 0 0; color: #111111; font-size: 14px; font-weight: 600;">${quoteDate}</p>
                  </td>
                  <td width="50%" align="right">
                    <p style="margin: 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Valide jusqu'au</p>
                    <p style="margin: 4px 0 0 0; color: #DC2626; font-size: 14px; font-weight: 600;">${validUntil}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Montant TTC</p>
              <p style="margin: 0; color: #0064FA; font-size: 32px; font-weight: 700;">${totalAmount}</p>
            </td>
          </tr>
        </table>

        ${message ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F9FAFB; border-radius: 8px; border-left: 4px solid #E5E7EB;">
              <p style="margin: 0; color: #374151; font-size: 14px; font-style: italic; line-height: 1.5;">"${message}"</p>
            </td>
          </tr>
        </table>
        ` : ''}

        ${getEmailButton(viewUrl, "Voir mon devis")}

        <!-- Accept online notice -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F0FDF4; border-radius: 8px;">
              <p style="margin: 0; color: #166534; font-size: 13px; text-align: center;">
                Vous pouvez accepter ce devis directement en ligne en quelques clics.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getEmailFooter(senderCompany)}
  `

  return sendEmail({
    to: email,
    subject: `Devis ${quoteNumber} - ${senderCompany}`,
    html: getEmailWrapper(content),
  })
}

/**
 * Send invoice reminder email (overdue)
 */
export async function sendInvoiceReminderEmail(
  email: string,
  clientName: string,
  invoiceNumber: string,
  totalAmount: string,
  dueDate: string,
  daysOverdue: number,
  viewUrl: string,
  senderCompany: string,
  logoUrl?: string
) {
  const content = `
    ${getEmailHeader(logoUrl, senderCompany, "Rappel de paiement", `Facture ${invoiceNumber}`)}

    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Bonjour <strong>${clientName}</strong>,
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de la facture suivante :
        </p>

        <!-- Invoice Details Card - Overdue Style -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; border: 2px solid #DC2626; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 16px 20px; background-color: #FEF2F2; border-bottom: 1px solid #FECACA;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%">
                    <p style="margin: 0; color: #991B1B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Facture</p>
                    <p style="margin: 4px 0 0 0; color: #111111; font-size: 14px; font-weight: 600;">${invoiceNumber}</p>
                  </td>
                  <td width="50%" align="right">
                    <p style="margin: 0; color: #991B1B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Échéance dépassée</p>
                    <p style="margin: 4px 0 0 0; color: #DC2626; font-size: 14px; font-weight: 600;">${dueDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #FEF2F2;">
              <p style="margin: 0 0 4px 0; color: #991B1B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Montant dû</p>
              <p style="margin: 0; color: #DC2626; font-size: 32px; font-weight: 700;">${totalAmount}</p>
              <p style="margin: 8px 0 0 0; color: #DC2626; font-size: 13px; font-weight: 600;">
                ${daysOverdue} jour${daysOverdue > 1 ? 's' : ''} de retard
              </p>
            </td>
          </tr>
        </table>

        ${getEmailButton(viewUrl, "Voir et payer")}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F9FAFB; border-radius: 8px;">
              <p style="margin: 0; color: #6B7280; font-size: 13px; text-align: center;">
                Si vous avez déjà effectué le paiement, merci de ne pas tenir compte de ce message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getEmailFooter(senderCompany)}
  `

  return sendEmail({
    to: email,
    subject: `[Rappel] Facture ${invoiceNumber} en attente de paiement - ${senderCompany}`,
    html: getEmailWrapper(content),
  })
}

/**
 * Send invoice due soon reminder
 */
export async function sendInvoiceDueSoonEmail(
  email: string,
  clientName: string,
  invoiceNumber: string,
  totalAmount: string,
  dueDate: string,
  daysUntilDue: number,
  viewUrl: string,
  senderCompany: string,
  logoUrl?: string
) {
  const content = `
    ${getEmailHeader(logoUrl, senderCompany, "Échéance proche", `Facture ${invoiceNumber}`)}

    <tr>
      <td style="padding: 0 40px 32px 40px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Bonjour <strong>${clientName}</strong>,
        </p>

        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Nous vous rappelons que la facture suivante arrive bientôt à échéance :
        </p>

        <!-- Invoice Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 16px 20px; background-color: #F9FAFB; border-bottom: 1px solid #E5E7EB;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%">
                    <p style="margin: 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Facture</p>
                    <p style="margin: 4px 0 0 0; color: #111111; font-size: 14px; font-weight: 600;">${invoiceNumber}</p>
                  </td>
                  <td width="50%" align="right">
                    <p style="margin: 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Échéance</p>
                    <p style="margin: 4px 0 0 0; color: #F59E0B; font-size: 14px; font-weight: 600;">${dueDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Montant TTC</p>
              <p style="margin: 0; color: #0064FA; font-size: 32px; font-weight: 700;">${totalAmount}</p>
              <p style="margin: 8px 0 0 0; color: #F59E0B; font-size: 13px; font-weight: 600;">
                Dans ${daysUntilDue} jour${daysUntilDue > 1 ? 's' : ''}
              </p>
            </td>
          </tr>
        </table>

        ${getEmailButton(viewUrl, "Voir ma facture")}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
          <tr>
            <td style="padding: 16px; background-color: #F9FAFB; border-radius: 8px;">
              <p style="margin: 0; color: #6B7280; font-size: 13px; text-align: center;">
                Si vous avez déjà effectué le paiement, merci de ne pas tenir compte de ce message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${getEmailFooter(senderCompany)}
  `

  return sendEmail({
    to: email,
    subject: `Rappel : Facture ${invoiceNumber} arrive à échéance - ${senderCompany}`,
    html: getEmailWrapper(content),
  })
}
