import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    const endpoint = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&page=1&per_page=10`

    const res = await fetch(endpoint, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!res.ok) {
      console.error("API gouv error:", res.status, res.statusText)
      return NextResponse.json(
        { error: `Erreur API: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ results: data.results || [] })
  } catch (error) {
    console.error("Company search failed:", error)
    return NextResponse.json(
      { error: "Impossible de contacter l'API entreprises" },
      { status: 500 }
    )
  }
}
