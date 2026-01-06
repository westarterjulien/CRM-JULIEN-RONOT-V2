import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Security helpers for API routes
 * Prevents IDOR (Insecure Direct Object Reference) vulnerabilities
 */

const DEFAULT_TENANT_ID = BigInt(1)

export interface AuthContext {
  userId: string
  userType: string // "admin" | "tenant_admin" | "user" | "client"
  tenantId: bigint
  clientId?: bigint
  isClient: boolean
  isAdmin: boolean
}

/**
 * Get authentication context for the current request
 * Returns null if not authenticated
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  const userType = session.user.type || "user"
  const isClient = userType === "client"
  const isAdmin = userType === "admin" || userType === "tenant_admin"

  return {
    userId: session.user.id,
    userType,
    tenantId: DEFAULT_TENANT_ID, // TODO: Get from session when multi-tenant is implemented
    clientId: session.user.clientId ? BigInt(session.user.clientId) : undefined,
    isClient,
    isAdmin,
  }
}

/**
 * Build Prisma where clause with tenant isolation
 * Ensures users can only access resources belonging to their tenant
 */
export function withTenantFilter(
  authContext: AuthContext,
  additionalFilters: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tenant_id: authContext.tenantId,
    ...additionalFilters,
  }
}

/**
 * Build Prisma where clause for client-specific access
 * Clients can only access their own resources
 */
export function withClientFilter(
  authContext: AuthContext,
  additionalFilters: Record<string, unknown> = {}
): Record<string, unknown> {
  const baseFilters: Record<string, unknown> = {
    tenant_id: authContext.tenantId,
    ...additionalFilters,
  }

  // If user is a client, restrict to their client ID
  if (authContext.isClient && authContext.clientId) {
    baseFilters.clientId = authContext.clientId
  }

  return baseFilters
}

/**
 * Check if user can access a specific client's resources
 */
export function canAccessClient(
  authContext: AuthContext,
  clientId: bigint
): boolean {
  // Admins can access all clients
  if (authContext.isAdmin) {
    return true
  }

  // Clients can only access their own data
  if (authContext.isClient) {
    return authContext.clientId === clientId
  }

  // Regular users can access based on tenant
  return true
}

/**
 * Return unauthorized response
 */
export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Return forbidden response
 */
export function forbidden(message = "Access denied") {
  return NextResponse.json({ error: message }, { status: 403 })
}

/**
 * Return not found response
 */
export function notFound(message = "Resource not found") {
  return NextResponse.json({ error: message }, { status: 404 })
}

/**
 * Validate BigInt ID from string
 * Returns null if invalid
 */
export function parseId(id: string): bigint | null {
  try {
    const parsed = BigInt(id)
    if (parsed <= 0) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Whitelist for orderBy fields to prevent SQL injection via dynamic sorting
 */
export const ALLOWED_SORT_FIELDS = {
  invoices: ["id", "invoiceNumber", "status", "issueDate", "dueDate", "totalTtc", "createdAt", "updatedAt"],
  quotes: ["id", "quoteNumber", "status", "issueDate", "validUntil", "totalTtc", "createdAt", "updatedAt"],
  clients: ["id", "companyName", "email", "status", "createdAt", "updatedAt"],
  contracts: ["id", "title", "status", "startDate", "endDate", "createdAt", "updatedAt"],
  tickets: ["id", "subject", "status", "priority", "createdAt", "updatedAt"],
} as const

/**
 * Validate and sanitize sort field
 */
export function validateSortField(
  field: string | null,
  entity: keyof typeof ALLOWED_SORT_FIELDS,
  defaultField = "createdAt"
): string {
  if (!field) return defaultField
  const allowed = ALLOWED_SORT_FIELDS[entity]
  return (allowed as readonly string[]).includes(field) ? field : defaultField
}

/**
 * Validate sort order
 */
export function validateSortOrder(order: string | null): "asc" | "desc" {
  return order === "asc" ? "asc" : "desc"
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page: string | null,
  perPage: string | null,
  maxPerPage = 100
): { page: number; perPage: number; skip: number } {
  const pageNum = Math.max(1, parseInt(page || "1") || 1)
  const perPageNum = Math.min(maxPerPage, Math.max(1, parseInt(perPage || "20") || 20))

  return {
    page: pageNum,
    perPage: perPageNum,
    skip: (pageNum - 1) * perPageNum,
  }
}
