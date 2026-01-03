import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"

// Helper to get the correct base URL for redirects
function getBaseUrl(): string {
  // Use NEXT_PUBLIC_APP_URL if available, otherwise NEXTAUTH_URL, otherwise fallback
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://crm.julienronot.fr"
}

// GET: Handle callback after bank authentication
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get("ref")
    const baseUrl = getBaseUrl()

    if (!ref) {
      // Redirect to treasury page with error
      return NextResponse.redirect(new URL("/treasury?error=missing_ref", baseUrl))
    }

    // Find the connection - try multiple strategies:
    // 1. By requisitionId directly (if ref is the requisition ID)
    // 2. By link containing the ref
    // 3. Most recent pending connection (fallback for our CRM-xxxxx reference)
    let connection = await prisma.gocardlessConnection.findFirst({
      where: { requisitionId: ref },
    })

    if (!connection) {
      // Try to find by link containing the ref
      connection = await prisma.gocardlessConnection.findFirst({
        where: {
          link: { contains: ref },
        },
      })
    }

    if (!connection) {
      // Fallback: get the most recent pending connection
      // This works because the user just completed the auth flow
      connection = await prisma.gocardlessConnection.findFirst({
        where: {
          tenant_id: BigInt(1),
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
      })
    }

    if (!connection) {
      return NextResponse.redirect(new URL("/treasury?error=connection_not_found", baseUrl))
    }

    // Get tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: connection.tenant_id },
    })

    if (!tenant) {
      return NextResponse.redirect(new URL("/treasury?error=tenant_not_found", baseUrl))
    }

    const settings = tenant.settings ? JSON.parse(tenant.settings as string) : {}
    const client = new GocardlessClient(settings.gocardlessSecretId, settings.gocardlessSecretKey)

    // Get requisition status
    const requisition = await client.getRequisition(connection.requisitionId)

    if (requisition.status === "LN" && requisition.accounts.length > 0) {
      // Connection successful - process ALL accounts
      const createdAccounts: string[] = []
      let firstBankAccountId: bigint | null = null

      for (const accountId of requisition.accounts) {
        try {
          const accountDetails = await client.getAccountDetails(accountId)
          const balances = await client.getAccountBalances(accountId)

          // Find current balance
          const currentBalance = balances.balances.find(
            (b) => b.balanceType === "interimAvailable" || b.balanceType === "closingBooked"
          )

          // Try to find existing bank account by IBAN
          let bankAccount = null

          if (accountDetails.account.iban) {
            bankAccount = await prisma.bankAccount.findFirst({
              where: {
                tenant_id: BigInt(1),
                iban: accountDetails.account.iban,
              },
            })
          }

          // Also try to find by GoCardless account ID
          if (!bankAccount) {
            bankAccount = await prisma.bankAccount.findFirst({
              where: {
                tenant_id: BigInt(1),
                connectionProvider: "gocardless",
                accountNumber: accountId,
              },
            })
          }

          const accountName = accountDetails.account.name || accountDetails.account.ownerName || "Compte bancaire"

          if (!bankAccount) {
            // Create new bank account
            bankAccount = await prisma.bankAccount.create({
              data: {
                tenant_id: BigInt(1),
                bankName: connection.institutionName,
                accountName,
                iban: accountDetails.account.iban || null,
                accountNumber: accountId,
                accountType: accountDetails.account.cashAccountType === "CACC" ? "checking" : "savings",
                currentBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : 0,
                availableBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : 0,
                currency: accountDetails.account.currency || "EUR",
                status: "active",
                connectionProvider: "gocardless",
                connectionId: accountId,
                lastSyncAt: new Date(),
                createdAt: new Date(),
              },
            })
            createdAccounts.push(accountName)
          } else {
            // Update existing
            await prisma.bankAccount.update({
              where: { id: bankAccount.id },
              data: {
                connectionProvider: "gocardless",
                connectionId: accountId,
                accountNumber: accountId,
                iban: accountDetails.account.iban || bankAccount.iban,
                currentBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : bankAccount.currentBalance,
                availableBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : bankAccount.availableBalance,
                lastSyncAt: new Date(),
                syncError: null,
              },
            })
            createdAccounts.push(`${accountName} (mis à jour)`)
          }

          // Keep track of first account for connection link
          if (!firstBankAccountId) {
            firstBankAccountId = bankAccount.id
          }
        } catch (accountError) {
          console.error(`Error processing account ${accountId}:`, accountError)
          // Continue with other accounts even if one fails
        }
      }

      // Update connection with first bank account link
      await prisma.gocardlessConnection.update({
        where: { id: connection.id },
        data: {
          bank_account_id: firstBankAccountId,
          account_id: requisition.accounts.join(","), // Store all account IDs
          status: "linked",
          agreement_accepted_at: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
      })

      // Redirect to treasury with success
      const accountCount = createdAccounts.length
      return NextResponse.redirect(
        new URL(`/treasury?success=connected&bank=${encodeURIComponent(connection.institutionName)}&accounts=${accountCount}`, baseUrl)
      )
    } else if (requisition.status === "EX") {
      // Connection expired
      await prisma.gocardlessConnection.update({
        where: { id: connection.id },
        data: {
          status: "expired",
          error_message: "Connection request expired",
        },
      })
      return NextResponse.redirect(new URL("/treasury?error=expired", baseUrl))
    } else if (requisition.status === "RJ") {
      // Connection rejected
      await prisma.gocardlessConnection.update({
        where: { id: connection.id },
        data: {
          status: "error",
          error_message: "Connection was rejected by the bank",
        },
      })
      return NextResponse.redirect(new URL("/treasury?error=rejected", baseUrl))
    } else {
      // Still pending or other status
      await prisma.gocardlessConnection.update({
        where: { id: connection.id },
        data: {
          status: requisition.status === "CR" ? "pending" : "error",
          error_message: `Unexpected status: ${requisition.status}`,
        },
      })
      return NextResponse.redirect(new URL(`/treasury?error=status_${requisition.status}`, baseUrl))
    }
  } catch (error) {
    console.error("Error in callback:", error)
    const baseUrl = getBaseUrl()
    return NextResponse.redirect(
      new URL(`/treasury?error=${encodeURIComponent(error instanceof Error ? error.message : "unknown")}`, baseUrl)
    )
  }
}
