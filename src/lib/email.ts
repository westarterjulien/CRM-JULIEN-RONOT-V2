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

export async function sendPasswordResetEmail(email: string, token: string, userName: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  // Get company name from tenant settings
  let companyName = "CRM"
  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { name: true },
    })
    if (tenant?.name) companyName = tenant.name
  } catch {
    // Use default
  }

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Réinitialisation de mot de passe</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#0064FA" style="padding: 48px 40px 32px 40px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td width="64" height="64" align="center" valign="middle" bgcolor="#003D99" style="font-size: 32px; color: white;">
                          &#128274;
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Réinitialisation du mot de passe
                    </h1>
                    <p style="color: #B8D4FF; font-size: 15px; margin: 0;">
                      ${companyName}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour ${userName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe sécurisé.
                    </p>

                    <!-- Security Notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                      <tr>
                        <td bgcolor="#f0f4ff" style="padding: 20px; border-left: 4px solid #0064FA;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="40" valign="top" style="font-size: 24px;">
                                &#128737;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.5;">
                                  <strong>Demande de sécurité</strong><br />
                                  <span style="color: #4a4a4a;">Ce lien est valable pendant <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${resetUrl}" style="height:54px;v-text-anchor:middle;width:320px;" arcsize="22%" stroke="f" fillcolor="#0064FA">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#128274; Réinitialiser mon mot de passe</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${resetUrl}" style="display: inline-block; background-color: #0064FA; color: #ffffff; text-decoration: none; padding: 18px 48px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#128274;&nbsp;&nbsp;Réinitialiser mon mot de passe
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${resetUrl}" style="color: #0064FA; font-size: 12px; word-break: break-all;">${resetUrl}</a>
                    </p>

                    <!-- Warning -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#fff8e6" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#9888;&#65039;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #92600e; font-size: 14px; line-height: 1.5;">
                                  <strong>Vous n'êtes pas à l'origine de cette demande ?</strong><br />
                                  <span style="color: #b8860b;">Ignorez simplement cet email. Votre mot de passe restera inchangé.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${companyName}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Pour des raisons de sécurité, ne partagez jamais ce lien avec personne.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${companyName} - Tous droits réservés
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Réinitialisation de votre mot de passe - ${companyName}`,
    html,
  })
}

export async function sendClientInvitationEmail(
  email: string,
  token: string,
  inviterName: string,
  companyName: string
) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client/accept-invitation?token=${token}`

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invitation - Espace Client</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#10B981" style="padding: 48px 40px 32px 40px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td width="64" height="64" align="center" valign="middle" bgcolor="#059669" style="font-size: 32px; color: white;">
                          &#128100;
                        </td>
                      </tr>
                    </table>
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Bienvenue sur votre espace client
                    </h1>
                    <p style="color: #A7F3D0; font-size: 15px; margin: 0;">
                      ${companyName}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour,
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      <strong style="color: #10B981;">${inviterName}</strong> vous invite à rejoindre l'espace client de <strong>${companyName}</strong>.
                    </p>

                    <!-- Features Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                      <tr>
                        <td bgcolor="#f0fdf4" style="padding: 24px; border-left: 4px solid #10B981;">
                          <p style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 15px; font-weight: bold;">
                            Votre espace client vous permet de :
                          </p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #10B981;">&#10003;</strong>&nbsp;&nbsp;Consulter et télécharger vos factures
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #10B981;">&#10003;</strong>&nbsp;&nbsp;Voir et accepter vos devis en ligne
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #10B981;">&#10003;</strong>&nbsp;&nbsp;Signer vos contrats électroniquement
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #10B981;">&#10003;</strong>&nbsp;&nbsp;Suivre l'état de vos documents
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${inviteUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="22%" stroke="f" fillcolor="#10B981">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#128100; Créer mon compte</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${inviteUrl}" style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; padding: 18px 56px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#128100;&nbsp;&nbsp;Créer mon compte
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${inviteUrl}" style="color: #10B981; font-size: 12px; word-break: break-all;">${inviteUrl}</a>
                    </p>

                    <!-- Expiration Notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#fff8e6" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#9200;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #92600e; font-size: 14px; line-height: 1.5;">
                                  <strong>Attention :</strong> Ce lien d'invitation expire dans <strong>72 heures</strong>.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Security -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                      <tr>
                        <td bgcolor="#f5f5f5" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#128274;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.5;">
                                  <strong>Connexion sécurisée</strong><br />
                                  <span style="color: #6b7280;">Votre espace client est protégé par un accès sécurisé avec mot de passe personnel.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${companyName}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${companyName} - Tous droits réservés
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Invitation - Votre espace client ${companyName}`,
    html,
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
    ? expiresAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const customMessage = message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px; background-color: #F0F4FF; border-left: 4px solid #0064FA;">
            <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${message}"</p>
          </td>
        </tr>
      </table>`
    : ""

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${senderCompany}" style="max-height: 50px; max-width: 200px; margin-bottom: 16px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
        <tr>
          <td width="64" height="64" align="center" valign="middle" bgcolor="#7B2FD0" style="font-size: 32px;">
            &#9997;&#65039;
          </td>
        </tr>
      </table>`

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document à signer - ${contractTitle}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
          .button-link {background-color: #0064FA !important; padding: 18px 56px !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#5F00BA" style="padding: 48px 40px 32px 40px;">
                    ${logoSection}
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Document à signer
                    </h1>
                    <p style="color: #E8D5FF; font-size: 15px; margin: 0;">
                      ${senderCompany}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour ${signerName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      <strong style="color: #5F00BA;">${senderName}</strong> vous invite à signer un document électroniquement.
                    </p>

                    <!-- Document Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                      <tr>
                        <td bgcolor="#f0f4ff" style="padding: 24px; border-left: 5px solid #0064FA;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="56" valign="top">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="56" height="56" align="center" valign="middle" bgcolor="#e8f0ff" style="font-size: 28px;">
                                      &#128196;
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding-left: 20px;" valign="middle">
                                <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                                  Document
                                </p>
                                <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">
                                  ${contractTitle}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${customMessage}

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${signingUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="22%" stroke="f" fillcolor="#0064FA">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#9997; Signer le document</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${signingUrl}" style="display: inline-block; background-color: #0064FA; color: #ffffff; text-decoration: none; padding: 18px 56px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#9997;&#65039;&nbsp;&nbsp;Signer le document
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link for older clients -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${signingUrl}" style="color: #0064FA; font-size: 12px; word-break: break-all;">${signingUrl}</a>
                    </p>

                    ${expirationDate ? `
                    <!-- Expiration Notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                      <tr>
                        <td bgcolor="#fff8e6" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#9200;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #92600e; font-size: 14px; line-height: 1.5;">
                                  <strong>Date limite :</strong> ${expirationDate}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Instructions -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
                      <tr>
                        <td bgcolor="#fafafa" style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 15px; font-weight: bold;">
                            Comment signer :
                          </p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #0064FA;">1.</strong> Cliquez sur le bouton "Signer le document"
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #0064FA;">2.</strong> Vérifiez les informations du document
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #0064FA;">3.</strong> Apposez votre signature électronique
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #10b981;">&#10003;</strong> Validez pour finaliser
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Badge -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#f0fdf4" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#128274;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                                  <strong>Signature sécurisée</strong><br />
                                  <span style="color: #15803d;">Ce document utilise la signature électronique conforme au règlement eIDAS.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${senderCompany}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Si vous n'attendiez pas ce document, vous pouvez ignorer cet email.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${senderCompany} - Signature électronique sécurisée
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Document à signer : ${contractTitle}`,
    html,
  })
}

/**
 * Send invoice email to client
 * @param paymentMethod - Mode de paiement (ex: "Virement bancaire", "Prélèvement automatique", "Carte bancaire")
 * @param directDebitDate - Date de prélèvement si applicable (remplace la date d'échéance)
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
  const customMessage = message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px; background-color: #F0F4FF; border-left: 4px solid #0064FA;">
            <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${message}"</p>
          </td>
        </tr>
      </table>`
    : ""

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${senderCompany}" style="max-height: 50px; max-width: 200px; margin-bottom: 16px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
        <tr>
          <td width="64" height="64" align="center" valign="middle" bgcolor="#0064FA" style="font-size: 32px; color: white;">
            &#128195;
          </td>
        </tr>
      </table>`

  // Determine if it's a direct debit or regular due date
  const isDirectDebit = directDebitDate && paymentMethod?.toLowerCase().includes('prélèvement')
  const paymentDateLabel = isDirectDebit ? 'Date de prélèvement' : 'Échéance'
  const paymentDateValue = isDirectDebit ? directDebitDate : dueDate
  const paymentDateColor = isDirectDebit ? '#0064FA' : '#dc2626' // Blue for direct debit, red for due date

  // Payment method display
  const displayPaymentMethod = paymentMethod || 'Virement bancaire'

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Facture ${invoiceNumber}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#0064FA" style="padding: 48px 40px 32px 40px;">
                    ${logoSection}
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Nouvelle facture
                    </h1>
                    <p style="color: #B8D4FF; font-size: 15px; margin: 0;">
                      ${senderCompany}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour ${clientName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      Veuillez trouver ci-dessous votre facture. Vous pouvez la consulter et la télécharger en cliquant sur le bouton ci-dessous.
                    </p>

                    <!-- Invoice Details Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td bgcolor="#f8f9fc" style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Numéro</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">${invoiceNumber}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Date</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px;">${invoiceDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">${paymentDateLabel}</p>
                                <p style="margin: 4px 0 0 0; color: ${paymentDateColor}; font-size: 16px; font-weight: bold;">${paymentDateValue}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Mode de paiement</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">${displayPaymentMethod}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px;" align="center">
                          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Montant TTC</p>
                          <p style="margin: 4px 0 0 0; color: #0064FA; font-size: 28px; font-weight: bold;">${totalAmount}</p>
                        </td>
                      </tr>
                    </table>

                    ${customMessage}

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${viewUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="22%" stroke="f" fillcolor="#0064FA">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#128195; Voir ma facture</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${viewUrl}" style="display: inline-block; background-color: #0064FA; color: #ffffff; text-decoration: none; padding: 18px 56px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#128195;&nbsp;&nbsp;Voir ma facture
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${viewUrl}" style="color: #0064FA; font-size: 12px; word-break: break-all;">${viewUrl}</a>
                    </p>

                    <!-- Payment Info -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#fff8e6" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#128176;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #92600e; font-size: 14px; line-height: 1.5;">
                                  <strong>Modes de paiement acceptés :</strong> Virement bancaire, carte bancaire<br />
                                  <span style="color: #b8860b;">Les coordonnées bancaires sont disponibles sur la facture.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${senderCompany}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Pour toute question concernant cette facture, n'hésitez pas à nous contacter.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${senderCompany} - Tous droits réservés
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Facture ${invoiceNumber} - ${senderCompany}`,
    html,
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
  const customMessage = message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px; background-color: #F5F0FF; border-left: 4px solid #7B2FD0;">
            <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${message}"</p>
          </td>
        </tr>
      </table>`
    : ""

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${senderCompany}" style="max-height: 50px; max-width: 200px; margin-bottom: 16px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
        <tr>
          <td width="64" height="64" align="center" valign="middle" bgcolor="#7B2FD0" style="font-size: 32px; color: white;">
            &#128221;
          </td>
        </tr>
      </table>`

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Devis ${quoteNumber}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#7B2FD0" style="padding: 48px 40px 32px 40px;">
                    ${logoSection}
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Nouveau devis
                    </h1>
                    <p style="color: #DBC4FF; font-size: 15px; margin: 0;">
                      ${senderCompany}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour ${clientName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      Suite à notre échange, veuillez trouver ci-dessous notre proposition commerciale. Vous pouvez la consulter et l'accepter en ligne.
                    </p>

                    <!-- Quote Details Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td bgcolor="#f8f5ff" style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Numéro</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">${quoteNumber}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Date</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px;">${quoteDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Valide jusqu'au</p>
                                <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 16px; font-weight: bold;">${validUntil}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Montant TTC</p>
                                <p style="margin: 4px 0 0 0; color: #7B2FD0; font-size: 24px; font-weight: bold;">${totalAmount}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${customMessage}

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${viewUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="22%" stroke="f" fillcolor="#7B2FD0">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#128221; Voir mon devis</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${viewUrl}" style="display: inline-block; background-color: #7B2FD0; color: #ffffff; text-decoration: none; padding: 18px 56px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#128221;&nbsp;&nbsp;Voir mon devis
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${viewUrl}" style="color: #7B2FD0; font-size: 12px; word-break: break-all;">${viewUrl}</a>
                    </p>

                    <!-- Validity Notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#f0fdf4" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#10003;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                                  <strong>Acceptation en ligne</strong><br />
                                  <span style="color: #15803d;">Vous pouvez accepter ce devis directement depuis votre espace client en quelques clics.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Questions -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                      <tr>
                        <td bgcolor="#f5f5f5" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#128172;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.5;">
                                  <strong>Des questions ?</strong><br />
                                  <span style="color: #6b7280;">N'hésitez pas à nous contacter pour toute précision ou modification.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${senderCompany}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Nous restons à votre disposition pour toute information complémentaire.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${senderCompany} - Tous droits réservés
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `Devis ${quoteNumber} - ${senderCompany}`,
    html,
  })
}
