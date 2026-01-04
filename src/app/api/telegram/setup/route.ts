import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(process.env.CRM_TENANT_ID || "1")

async function getBotToken(): Promise<string> {
  // Try to get from database first
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })

  if (tenant?.settings) {
    try {
      const settings = JSON.parse(tenant.settings)
      if (settings.telegramBotToken) return settings.telegramBotToken
    } catch { /* ignore */ }
  }

  // Fallback to env var
  return process.env.TELEGRAM_BOT_TOKEN || ""
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action") || "info"
  const webhookUrl = searchParams.get("url")

  const BOT_TOKEN = await getBotToken()

  if (!BOT_TOKEN) {
    return NextResponse.json({
      error: "Telegram bot token not configured. Please configure it in Settings > Integrations > Telegram"
    }, { status: 500 })
  }

  try {
    switch (action) {
      case "set":
        if (!webhookUrl) {
          return NextResponse.json(
            { error: "Missing url parameter. Example: ?action=set&url=https://your-domain.com/api/telegram/webhook" },
            { status: 400 }
          )
        }

        const setResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: webhookUrl,
              allowed_updates: ["message", "callback_query"],
            }),
          }
        )
        const setResult = await setResponse.json()
        return NextResponse.json({
          action: "setWebhook",
          url: webhookUrl,
          result: setResult,
        })

      case "delete":
        const deleteResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`,
          { method: "POST" }
        )
        const deleteResult = await deleteResponse.json()
        return NextResponse.json({
          action: "deleteWebhook",
          result: deleteResult,
        })

      case "info":
      default:
        // Get bot info
        const meResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
        )
        const meResult = await meResponse.json()

        // Get webhook info
        const webhookResponse = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
        )
        const webhookResult = await webhookResponse.json()

        return NextResponse.json({
          bot: meResult.result,
          webhook: webhookResult.result,
          instructions: {
            setWebhook: "/api/telegram/setup?action=set&url=https://your-domain.com/api/telegram/webhook",
            deleteWebhook: "/api/telegram/setup?action=delete",
          },
        })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
