import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Routes that don't require authentication (webhooks should use HMAC signature validation)
const PUBLIC_ROUTES = [
  "/api/auth",
  "/api/public",
  "/api/webhooks",
  "/api/revolut/webhook",
  "/api/telegram/webhook",
  "/api/gocardless/callback",
  "/api/users/o365-callback",
  "/api/tickets/o365-callback",
  "/api/auth/microsoft/callback",
  "/api/campaigns/track",
  "/api/releases",
]

// Routes that require CRON_SECRET header
const CRON_ROUTES = ["/api/cron"]

// Check if path matches any pattern in the list
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => path.startsWith(route))
}

// Use next-auth v5 middleware wrapper pattern
export default auth((req) => {
  const { pathname } = req.nextUrl

  // Only protect API routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Allow public routes (webhooks validated by signature, not session)
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next()
  }

  // Check CRON routes - require CRON_SECRET header
  if (matchesRoute(pathname, CRON_ROUTES)) {
    const cronSecret = req.headers.get("x-cron-secret")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid CRON secret" },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // All other API routes require authentication
  // req.auth is populated by the auth() wrapper
  if (!req.auth?.user) {
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    )
  }

  // User is authenticated, allow the request
  return NextResponse.next()
})

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
}
