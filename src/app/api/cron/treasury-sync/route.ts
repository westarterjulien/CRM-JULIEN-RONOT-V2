import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"

// Cron Job - runs at 8:00 AM and 2:00 PM Paris time
// Dokploy cron (UTC): 0 7,13 * * * (winter) or 0 6,12 * * * (summer)
// Container is now in Europe/Paris timezone

const DEFAULT_TENANT_ID = BigInt(1)

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount)
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

// Get Telegram settings from tenant
async function getTelegramSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      botToken: settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN,
      allowedUsers: settings.telegramAllowedUsers
        ?.split(",")
        .map((id: string) => parseInt(id.trim()))
        .filter((id: number) => !isNaN(id) && id > 0) || [],
    }
  } catch {
    return null
  }
}

// Get GoCardless settings
async function getGoCardlessSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    if (!settings.gocardlessEnabled || !settings.gocardlessSecretId || !settings.gocardlessSecretKey) {
      return null
    }
    return {
      secretId: settings.gocardlessSecretId,
      secretKey: settings.gocardlessSecretKey,
    }
  } catch {
    return null
  }
}

// Send message to Telegram
async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  })
}

// Sync bank accounts and return new transactions
async function syncBankAccounts(client: GocardlessClient) {
  const bankAccounts = await prisma.bankAccount.findMany({
    where: {
      tenant_id: DEFAULT_TENANT_ID,
      connectionProvider: "gocardless",
      status: "active",
    },
  })

  if (bankAccounts.length === 0) {
    return { accounts: [], newTransactions: [], totalBalance: 0 }
  }

  const results: {
    accountName: string
    newCount: number
    balance: number
    error?: string
  }[] = []
  const newTransactions: {
    accountName: string
    amount: number
    type: "credit" | "debit"
    label: string
    date: Date
  }[] = []
  let totalBalance = 0

  // Sync last 7 days
  const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const toDate = new Date().toISOString().split("T")[0]

  for (const account of bankAccounts) {
    try {
      // Get GoCardless account ID
      let gocardlessAccountId = account.connectionId
      if (!gocardlessAccountId || /^\d+$/.test(gocardlessAccountId)) {
        gocardlessAccountId = account.accountNumber
      }

      if (!gocardlessAccountId) {
        const connection = await prisma.gocardlessConnection.findFirst({
          where: {
            bank_account_id: account.id,
            account_id: { not: null },
          },
        })
        gocardlessAccountId = connection?.account_id || null
      }

      if (!gocardlessAccountId) {
        results.push({
          accountName: account.accountName || "Compte inconnu",
          newCount: 0,
          balance: Number(account.currentBalance || 0),
          error: "Reconnexion requise",
        })
        continue
      }

      // Get balances
      const balances = await client.getAccountBalances(gocardlessAccountId)
      const currentBalance = balances.balances.find(
        (b) => b.balanceType === "interimAvailable" || b.balanceType === "closingBooked"
      )
      const balance = currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : Number(account.currentBalance || 0)
      totalBalance += balance

      // Get transactions
      const transactionsData = await client.getAccountTransactions(gocardlessAccountId, fromDate, toDate)
      const allTransactions = [
        ...transactionsData.transactions.booked,
        ...transactionsData.transactions.pending,
      ]

      let newCount = 0

      for (const tx of allTransactions) {
        const externalId = tx.transactionId || tx.internalTransactionId
        if (!externalId) continue

        const amount = parseFloat(tx.transactionAmount.amount)
        const type = amount >= 0 ? "credit" : "debit"

        // Check if transaction exists
        const existing = await prisma.bankTransaction.findFirst({
          where: {
            bankAccountId: account.id,
            OR: [
              { externalId },
              { transaction_id: externalId },
            ],
          },
        })

        const label = tx.remittanceInformationUnstructured ||
          tx.remittanceInformationUnstructuredArray?.join(" ") ||
          (type === "credit" ? tx.debtorName : tx.creditorName) ||
          "Transaction"

        if (!existing) {
          // Create new transaction
          await prisma.bankTransaction.create({
            data: {
              bankAccountId: account.id,
              tenant_id: DEFAULT_TENANT_ID,
              externalId,
              transaction_id: externalId,
              transactionDate: new Date(tx.bookingDate || tx.valueDate),
              valueDate: tx.valueDate ? new Date(tx.valueDate) : null,
              amount: Math.abs(amount),
              currency: tx.transactionAmount.currency || "EUR",
              type: type as "credit" | "debit",
              label,
              description: tx.remittanceInformationUnstructuredArray?.join("\n") || null,
              counterparty_name: type === "credit" ? tx.debtorName : tx.creditorName || null,
              counterparty_account: type === "credit"
                ? tx.debtorAccount?.iban
                : tx.creditorAccount?.iban || null,
              reference: tx.bankTransactionCode || tx.proprietaryBankTransactionCode || null,
              status: "completed" as const,
              raw_data: JSON.stringify(tx),
              createdAt: new Date(),
            },
          })
          newCount++

          // Add to new transactions list for notification
          newTransactions.push({
            accountName: account.accountName || "Compte",
            amount: Math.abs(amount),
            type: type as "credit" | "debit",
            label: label.length > 50 ? label.substring(0, 47) + "..." : label,
            date: new Date(tx.bookingDate || tx.valueDate),
          })
        }
      }

      // Update bank account
      await prisma.bankAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: balance,
          availableBalance: balance,
          lastSyncAt: new Date(),
          syncError: null,
        },
      })

      results.push({
        accountName: account.accountName || "Compte",
        newCount,
        balance,
      })
    } catch (error) {
      console.error(`[Treasury Sync] Error syncing account ${account.id}:`, error)

      await prisma.bankAccount.update({
        where: { id: account.id },
        data: {
          syncError: error instanceof Error ? error.message : "Erreur de synchronisation",
          lastSyncAt: new Date(),
        },
      })

      results.push({
        accountName: account.accountName || "Compte",
        newCount: 0,
        balance: Number(account.currentBalance || 0),
        error: error instanceof Error ? error.message : "Erreur",
      })
    }
  }

  return { accounts: results, newTransactions, totalBalance }
}

// Generate notification message
function generateNotificationMessage(
  accounts: { accountName: string; newCount: number; balance: number; error?: string }[],
  newTransactions: { accountName: string; amount: number; type: "credit" | "debit"; label: string; date: Date }[],
  totalBalance: number
): string {
  const now = new Date()
  const timeStr = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(now)

  let message = `*Sync Trésorerie ${timeStr}*\n\n`

  // Total balance
  message += `*Solde total:* ${formatCurrency(totalBalance)}\n\n`

  // Account summaries
  if (accounts.length > 0) {
    message += `*Comptes:*\n`
    for (const acc of accounts) {
      if (acc.error) {
        message += `  - ${acc.accountName}: ${acc.error}\n`
      } else {
        message += `  - ${acc.accountName}: ${formatCurrency(acc.balance)}`
        if (acc.newCount > 0) {
          message += ` (+${acc.newCount} nouvelles)`
        }
        message += `\n`
      }
    }
    message += `\n`
  }

  // New transactions (show last 10 max)
  if (newTransactions.length > 0) {
    message += `*Dernières opérations:*\n`
    const sortedTx = newTransactions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)

    for (const tx of sortedTx) {
      const emoji = tx.type === "credit" ? "+" : "-"
      const sign = tx.type === "credit" ? "+" : "-"
      message += `  ${emoji} ${sign}${formatCurrency(tx.amount)}\n`
      message += `    _${tx.label}_\n`
    }

    if (newTransactions.length > 10) {
      message += `  _... et ${newTransactions.length - 10} autre(s)_\n`
    }
  } else {
    message += `_Aucune nouvelle opération_\n`
  }

  return message
}

export async function GET() {
  try {
    console.log("[Treasury Sync] Starting...")

    // Get GoCardless settings
    const gcSettings = await getGoCardlessSettings()
    if (!gcSettings) {
      console.log("[Treasury Sync] GoCardless not configured")
      return NextResponse.json({
        success: false,
        message: "GoCardless not configured",
      })
    }

    // Initialize client and sync
    const client = new GocardlessClient(gcSettings.secretId, gcSettings.secretKey)
    const { accounts, newTransactions, totalBalance } = await syncBankAccounts(client)

    console.log(`[Treasury Sync] Synced ${accounts.length} accounts, ${newTransactions.length} new transactions`)

    // Send Telegram notification
    const telegramSettings = await getTelegramSettings()
    let notificationsSent = 0

    if (telegramSettings?.botToken && telegramSettings.allowedUsers.length > 0) {
      const message = generateNotificationMessage(accounts, newTransactions, totalBalance)

      for (const chatId of telegramSettings.allowedUsers) {
        try {
          await sendTelegramMessage(telegramSettings.botToken, chatId, message)
          notificationsSent++
        } catch (error) {
          console.error(`[Treasury Sync] Failed to send notification to ${chatId}:`, error)
        }
      }
    }

    console.log(`[Treasury Sync] Sent ${notificationsSent} notifications`)

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      accounts: accounts.map(a => ({
        name: a.accountName,
        newTransactions: a.newCount,
        balance: a.balance,
        error: a.error,
      })),
      totalNewTransactions: newTransactions.length,
      totalBalance,
      notificationsSent,
    })
  } catch (error) {
    console.error("[Treasury Sync] Error:", error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    )
  }
}
