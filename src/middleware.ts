import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  // Auth routes
  "/api/auth",
  // Public access routes
  "/api/public",
  // Webhooks (should use signature validation)
  "/api/webhooks",
  "/api/revolut/webhook",
  "/api/telegram/webhook",
  // OAuth callbacks
  "/api/gocardless/callback",
  "/api/users/o365-callback",
  "/api/tickets/o365-callback",
  "/api/auth/microsoft/callback",
  // Email tracking (for campaigns)
  "/api/campaigns/track",
  // Electron auto-update
  "/api/releases",
]

// Routes that require CRON_SECRET
const CRON_ROUTES = [
  "/api/cron",
]

// Check if path matches any pattern in the list
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => path.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect API routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Allow public routes
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next()
  }

  // Check CRON routes - require CRON_SECRET header
  if (matchesRoute(pathname, CRON_ROUTES)) {
    const cronSecret = request.headers.get("x-cron-secret")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret) {
      console.error("[Middleware] CRON_SECRET not configured")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    if (cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid CRON secret" },
        { status: 401 }
      )
    }

    return NextResponse.next()
  }

  // All other API routes require authentication
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    )
  }

  // User is authenticated, allow the request
  return NextResponse.next()
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
}
