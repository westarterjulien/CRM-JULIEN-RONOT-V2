import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { htmlToPlainText } from "@/lib/o365-email"

// Get AI settings from tenant
async function getAISettings() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      aiEnabled: settings.aiEnabled || false,
      aiProvider: settings.aiProvider || "anthropic",
      aiApiKey: settings.aiApiKey || null,
      aiModel: settings.aiModel || "claude-3-haiku-20240307",
      aiSystemPrompt: settings.aiSystemPrompt || null,
    }
  } catch {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { additionalInfo, instructions } = body

    // Get ticket with messages
    const ticket = await prisma.ticket.findUnique({
      where: { id: BigInt(id) },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 10, // Last 10 messages for context
        },
        client: true,
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 })
    }

    // Get AI settings
    const aiSettings = await getAISettings()

    // Build conversation context
    const conversationContext = ticket.messages
      .map((msg: { userId: bigint | null; content: string }) => {
        const sender = msg.userId ? "Agent" : "Client"
        const content = htmlToPlainText(msg.content).substring(0, 500)
        return `${sender}: ${content}`
      })
      .join("\n\n")

    // If AI is not configured, use template-based response
    if (!aiSettings?.aiEnabled || !aiSettings?.aiApiKey) {
      const response = generateTemplateResponse({
        clientName: ticket.senderName || "Client",
        subject: ticket.subject,
        additionalInfo,
        instructions,
      })

      return NextResponse.json({
        success: true,
        response,
        provider: "template",
      })
    }

    // Use AI provider
    try {
      let aiResponse: string

      if (aiSettings.aiProvider === "anthropic") {
        aiResponse = await generateWithAnthropic({
          apiKey: aiSettings.aiApiKey,
          model: aiSettings.aiModel,
          systemPrompt: aiSettings.aiSystemPrompt,
          ticket: {
            subject: ticket.subject,
            clientName: ticket.senderName || "Client",
            clientEmail: ticket.senderEmail,
            clientCompany: ticket.client?.companyName,
          },
          conversationContext,
          additionalInfo,
          instructions,
        })
      } else if (aiSettings.aiProvider === "openai") {
        aiResponse = await generateWithOpenAI({
          apiKey: aiSettings.aiApiKey,
          model: aiSettings.aiModel || "gpt-4o-mini",
          systemPrompt: aiSettings.aiSystemPrompt,
          ticket: {
            subject: ticket.subject,
            clientName: ticket.senderName || "Client",
            clientEmail: ticket.senderEmail,
            clientCompany: ticket.client?.companyName,
          },
          conversationContext,
          additionalInfo,
          instructions,
        })
      } else {
        // Fallback to template
        aiResponse = generateTemplateResponse({
          clientName: ticket.senderName || "Client",
          subject: ticket.subject,
          additionalInfo,
          instructions,
        })
      }

      return NextResponse.json({
        success: true,
        response: aiResponse,
        provider: aiSettings.aiProvider,
      })
    } catch (aiError) {
      console.error("AI generation error:", aiError)
      // Fallback to template on error
      const response = generateTemplateResponse({
        clientName: ticket.senderName || "Client",
        subject: ticket.subject,
        additionalInfo,
        instructions,
      })

      return NextResponse.json({
        success: true,
        response,
        provider: "template",
        warning: "AI non disponible, réponse générée par template",
      })
    }
  } catch (error) {
    console.error("AI generation error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération" },
      { status: 500 }
    )
  }
}

function generateTemplateResponse(params: {
  clientName: string
  subject: string
  additionalInfo?: string
  instructions?: string
}): string {
  const { clientName, additionalInfo } = params
  const firstName = clientName.split(" ")[0]

  let response = `Bonjour ${firstName},

Merci de nous avoir contacté.

Nous avons bien pris en compte votre demande et nous y travaillons actuellement.`

  if (additionalInfo) {
    response += `

${additionalInfo}`
  }

  response += `

N'hésitez pas à nous recontacter si vous avez des questions supplémentaires.

Cordialement,
L'équipe Support`

  return response
}

async function generateWithAnthropic(params: {
  apiKey: string
  model: string
  systemPrompt?: string | null
  ticket: {
    subject: string
    clientName: string
    clientEmail: string
    clientCompany?: string | null
  }
  conversationContext: string
  additionalInfo?: string
  instructions?: string
}): Promise<string> {
  const { apiKey, model, systemPrompt, ticket, conversationContext, additionalInfo, instructions } = params

  const defaultSystemPrompt = `Tu es un agent de support client professionnel et amical. Tu rédiges des réponses claires, concises et utiles en français.

Règles:
- Sois poli et professionnel
- Utilise un ton amical mais pas trop familier
- Va droit au but
- Si tu ne connais pas la réponse, propose de transférer à un spécialiste
- Ne fais pas de promesses que tu ne peux pas tenir
- Signe avec "Cordialement, L'équipe Support"`

  const userMessage = `Contexte du ticket:
- Sujet: ${ticket.subject}
- Client: ${ticket.clientName}${ticket.clientCompany ? ` (${ticket.clientCompany})` : ""}

Historique de la conversation:
${conversationContext || "(Nouveau ticket)"}

${additionalInfo ? `Informations supplémentaires à inclure: ${additionalInfo}` : ""}
${instructions ? `Instructions spéciales: ${instructions}` : ""}

Génère une réponse professionnelle à ce ticket.`

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt || defaultSystemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "Anthropic API error")
  }

  const data = await response.json()
  return data.content[0].text
}

async function generateWithOpenAI(params: {
  apiKey: string
  model: string
  systemPrompt?: string | null
  ticket: {
    subject: string
    clientName: string
    clientEmail: string
    clientCompany?: string | null
  }
  conversationContext: string
  additionalInfo?: string
  instructions?: string
}): Promise<string> {
  const { apiKey, model, systemPrompt, ticket, conversationContext, additionalInfo, instructions } = params

  const defaultSystemPrompt = `Tu es un agent de support client professionnel et amical. Tu rédiges des réponses claires, concises et utiles en français.

Règles:
- Sois poli et professionnel
- Utilise un ton amical mais pas trop familier
- Va droit au but
- Si tu ne connais pas la réponse, propose de transférer à un spécialiste
- Ne fais pas de promesses que tu ne peux pas tenir
- Signe avec "Cordialement, L'équipe Support"`

  const userMessage = `Contexte du ticket:
- Sujet: ${ticket.subject}
- Client: ${ticket.clientName}${ticket.clientCompany ? ` (${ticket.clientCompany})` : ""}

Historique de la conversation:
${conversationContext || "(Nouveau ticket)"}

${additionalInfo ? `Informations supplémentaires à inclure: ${additionalInfo}` : ""}
${instructions ? `Instructions spéciales: ${instructions}` : ""}

Génère une réponse professionnelle à ce ticket.`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: systemPrompt || defaultSystemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || "OpenAI API error")
  }

  const data = await response.json()
  return data.choices[0].message.content
}
