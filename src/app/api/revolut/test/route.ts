import { NextRequest, NextResponse } from "next/server"

// POST: Test Revolut Merchant API connection with provided credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, environment = "sandbox" } = body

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key (clé secrète) requis" },
        { status: 400 }
      )
    }

    // Build Merchant API URL based on environment
    // Note: Merchant API uses /api/orders (not /api/1.0/orders)
    const baseUrl = environment === "production"
      ? "https://merchant.revolut.com/api"
      : "https://sandbox-merchant.revolut.com/api"

    // Test connection by listing orders (Merchant API endpoint)
    const response = await fetch(`${baseUrl}/orders?limit=1`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Revolut-Api-Version": "2024-09-01",
      },
    })

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Connexion Merchant API réussie! Environnement: ${environment}`,
      })
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Revolut Test] API Response:", response.status, errorData)

      // Provide helpful error messages
      let errorMessage = errorData.message || errorData.error || `Erreur ${response.status}`
      if (response.status === 401) {
        errorMessage = "Clé API invalide. Utilisez la clé SECRÈTE (pas la publique) depuis Revolut Business > APIs > Merchant API"
      } else if (response.status === 403) {
        errorMessage = "Accès refusé. Vérifiez que les permissions API sont activées dans Revolut Business"
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: errorData,
      })
    }
  } catch (error) {
    console.error("[Revolut Test] Error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur de connexion à l'API Revolut Merchant" },
      { status: 500 }
    )
  }
}
