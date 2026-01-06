"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserCog,
  FileText,
  Ticket,
  Wallet,
  LogOut,
  Package,
  Settings,
  ChevronDown,
  Zap,
  PanelLeftClose,
  PanelRightOpen,
  X,
  FileSignature,
  Landmark,
  Mail,
  StickyNote,
  FolderKanban,
  Rocket,
  Download,
  BookOpen,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useTenant } from "@/contexts/tenant-context"

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  badge?: number
  children?: { id: string; label: string; href: string }[]
}

const baseNavItems: Omit<NavItem, "badge">[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clients", href: "/clients", icon: Users },
  {
    id: "billing",
    label: "Facturation",
    href: "/invoices",
    icon: FileText,
    children: [
      { id: "invoices", label: "Factures", href: "/invoices" },
      { id: "quotes", label: "Devis", href: "/quotes" },
      { id: "prelevements", label: "Prélèvements", href: "/prelevements" },
    ],
  },
  { id: "contracts", label: "Contrats", href: "/contracts", icon: FileSignature },
  {
    id: "services",
    label: "Services",
    href: "/services",
    icon: Package,
    children: [
      { id: "services-list", label: "Catalogue", href: "/services" },
      { id: "domains", label: "Domaines", href: "/domains" },
      { id: "recurring", label: "Abonnements", href: "/recurring" },
    ],
  },
  { id: "treasury", label: "Trésorerie", href: "/treasury", icon: Wallet },
  { id: "campaigns", label: "Campagnes", href: "/campaigns", icon: Mail },
  { id: "tickets", label: "Tickets", href: "/tickets", icon: Ticket },
  { id: "notes", label: "Notes", href: "/notes", icon: StickyNote },
  { id: "projects", label: "Projets", href: "/projects", icon: FolderKanban },
  { id: "deployments", label: "Déploiements", href: "/deployments", icon: Rocket },
  { id: "users", label: "Utilisateurs", href: "/users", icon: UserCog },
]

// Deep Blue Navy Theme
const theme = {
  // Backgrounds
  sidebarBg: "linear-gradient(180deg, #0A1628 0%, #0D1E36 100%)",
  sidebarBgSolid: "#0A1628",

  // Text colors
  textInactive: "rgba(255, 255, 255, 0.6)",
  textHover: "rgba(255, 255, 255, 0.85)",
  textActive: "#FFFFFF",
  textMuted: "rgba(255, 255, 255, 0.4)",

  // Icon colors
  iconInactive: "rgba(255, 255, 255, 0.5)",
  iconHover: "rgba(255, 255, 255, 0.8)",
  iconActive: "#FFFFFF",

  // Accents
  accentPrimary: "#DCB40A",    // Yellow - Logo
  accentSecondary: "#3B82F6",  // Blue - Active items
  accentDanger: "#F04B69",     // Red - Logout/badges

  // Borders & separators
  border: "rgba(255, 255, 255, 0.08)",
  divider: "rgba(255, 255, 255, 0.06)",

  // Hover & Active backgrounds
  itemHover: "rgba(255, 255, 255, 0.06)",
  itemActive: "#3B82F6",
  submenuBg: "rgba(0, 0, 0, 0.15)",
  submenuBorder: "rgba(255, 255, 255, 0.1)",

  // Button styles
  buttonBorder: "rgba(255, 255, 255, 0.12)",
  buttonBg: "rgba(255, 255, 255, 0.04)",
  buttonHoverBg: "rgba(255, 255, 255, 0.08)",

  // Tooltip
  tooltipBg: "#FFFFFF",
  tooltipText: "#0A1628",
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen: mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { tenant } = useTenant()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [openTicketsCount, setOpenTicketsCount] = useState(0)

  // Fetch open tickets count
  useEffect(() => {
    const fetchOpenTickets = async () => {
      try {
        const res = await fetch("/api/tickets/count")
        if (res.ok) {
          const data = await res.json()
          setOpenTicketsCount(data.openCount || 0)
        }
      } catch (error) {
        console.error("Error fetching tickets count:", error)
      }
    }
    fetchOpenTickets()
    // Refresh every 30 seconds
    const interval = setInterval(fetchOpenTickets, 30000)
    return () => clearInterval(interval)
  }, [])

  // Build navItems with dynamic badge
  const navItems: NavItem[] = baseNavItems.map((item) => ({
    ...item,
    badge: item.id === "tickets" && openTicketsCount > 0 ? openTicketsCount : undefined,
  }))

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true
    return item.children?.some((child) => isActive(child.href)) || false
  }

  const toggleSubmenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId) ? prev.filter((m) => m !== menuId) : [...prev, menuId]
    )
  }

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"

  // Sidebar content
  const sidebarContent = (showLabels: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 h-16 border-b"
        style={{ borderColor: theme.border }}
      >
        <Link href="/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
          {tenant?.logo ? (
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: "#FFFFFF" }}
            >
              {/* Support both base64 data URLs and legacy file paths */}
              {tenant.logo.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logo}
                  alt={tenant.name || "Logo"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={`/uploads/${tenant.logo}`}
                  alt={tenant.name || "Logo"}
                  width={44}
                  height={44}
                  className="object-contain"
                />
              )}
            </div>
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#FFFFFF" }}
            >
              <Zap className="w-6 h-6" style={{ color: theme.accentPrimary }} />
            </div>
          )}
          {showLabels && (
            <div className="min-w-0">
              <span className="text-[15px] font-semibold block" style={{ color: theme.textActive }}>
                {tenant?.name?.split(" ")[0] || "Aurora"}
              </span>
              <span className="text-[11px] font-medium block" style={{ color: theme.textMuted }}>
                {tenant?.name?.split(" ").slice(1).join(" ") || "CRM"}
              </span>
            </div>
          )}
        </Link>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:bg-white/10"
            style={{
              border: `1px solid ${theme.buttonBorder}`,
              background: theme.buttonBg,
            }}
          >
            {collapsed ? (
              <PanelRightOpen className="w-4 h-4" style={{ color: theme.textInactive }} />
            ) : (
              <PanelLeftClose className="w-4 h-4" style={{ color: theme.textInactive }} />
            )}
          </button>
        )}
        {isMobile && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            style={{
              border: `1px solid ${theme.buttonBorder}`,
              background: theme.buttonBg,
            }}
          >
            <X className="w-4 h-4" style={{ color: theme.textInactive }} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isParentActive(item)
          const expanded = expandedMenus.includes(item.id)
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isHovered = hoveredItem === item.id

          return (
            <div key={item.id}>
              {hasChildren ? (
                <button
                  onClick={() => {
                    if (showLabels) {
                      toggleSubmenu(item.id)
                    }
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left relative group"
                  style={{
                    background: active ? theme.itemActive : "transparent",
                  }}
                >
                  <Icon
                    className="w-5 h-5 flex-shrink-0 transition-colors"
                    style={{ color: active ? theme.iconActive : theme.iconInactive }}
                  />
                  {showLabels && (
                    <>
                      <span
                        className="flex-1 text-[14px] font-medium transition-colors"
                        style={{ color: active ? theme.textActive : theme.textInactive }}
                      >
                        {item.label}
                      </span>
                      <ChevronDown
                        className="w-4 h-4 transition-transform duration-200"
                        style={{
                          color: active ? theme.textActive : theme.textMuted,
                          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    </>
                  )}
                  {/* Tooltip when collapsed */}
                  {!showLabels && isHovered && (
                    <div
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50 shadow-lg"
                      style={{ background: theme.tooltipBg, color: theme.tooltipText }}
                    >
                      {item.label}
                      <div
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                        style={{
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                          borderRight: `6px solid ${theme.tooltipBg}`,
                        }}
                      />
                    </div>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={isMobile ? onClose : undefined}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group"
                  style={{
                    background: active ? theme.itemActive : "transparent",
                  }}
                >
                  <Icon
                    className="w-5 h-5 flex-shrink-0 transition-colors"
                    style={{ color: active ? theme.iconActive : theme.iconInactive }}
                  />
                  {showLabels && (
                    <>
                      <span
                        className="flex-1 text-[14px] font-medium transition-colors"
                        style={{ color: active ? theme.textActive : theme.textInactive }}
                      >
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className="min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold text-white flex items-center justify-center"
                          style={{ background: theme.accentDanger }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!showLabels && item.badge && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ background: theme.accentDanger }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip when collapsed */}
                  {!showLabels && isHovered && (
                    <div
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50 shadow-lg"
                      style={{ background: theme.tooltipBg, color: theme.tooltipText }}
                    >
                      {item.label}
                      <div
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                        style={{
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                          borderRight: `6px solid ${theme.tooltipBg}`,
                        }}
                      />
                    </div>
                  )}
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && showLabels && (
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: expanded ? 200 : 0,
                    opacity: expanded ? 1 : 0,
                  }}
                >
                  <div
                    className="ml-5 pl-4 mt-1 mb-1 flex flex-col gap-0.5"
                    style={{ borderLeft: `1px solid ${theme.submenuBorder}` }}
                  >
                    {item.children?.map((child) => {
                      const childActive = isActive(child.href)
                      return (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={isMobile ? onClose : undefined}
                          className="px-3 py-2 rounded-lg text-[13px] transition-all"
                          style={{
                            color: childActive ? theme.textActive : theme.textInactive,
                            fontWeight: childActive ? 500 : 400,
                            background: childActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                          }}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: theme.border }}>
        {/* Download App */}
        <Link
          href="/download"
          onMouseEnter={() => setHoveredItem("download")}
          onMouseLeave={() => setHoveredItem(null)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative mb-1"
          style={{ background: isActive("/download") ? theme.itemActive : "transparent" }}
        >
          <Download
            className="w-5 h-5 flex-shrink-0"
            style={{ color: isActive("/download") ? theme.iconActive : theme.accentPrimary }}
          />
          {showLabels && (
            <span
              className="flex-1 text-[14px] font-medium"
              style={{ color: isActive("/download") ? theme.textActive : theme.textInactive }}
            >
              Application
            </span>
          )}
          {!showLabels && hoveredItem === "download" && (
            <div
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50 shadow-lg"
              style={{ background: theme.tooltipBg, color: theme.tooltipText }}
            >
              Application Desktop
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: `6px solid ${theme.tooltipBg}`,
                }}
              />
            </div>
          )}
        </Link>

        {/* API Docs */}
        <Link
          href="/api-docs"
          onMouseEnter={() => setHoveredItem("api-docs")}
          onMouseLeave={() => setHoveredItem(null)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative mb-1"
          style={{ background: isActive("/api-docs") ? theme.itemActive : "transparent" }}
        >
          <BookOpen
            className="w-5 h-5 flex-shrink-0"
            style={{ color: isActive("/api-docs") ? theme.iconActive : theme.iconInactive }}
          />
          {showLabels && (
            <span
              className="flex-1 text-[14px] font-medium"
              style={{ color: isActive("/api-docs") ? theme.textActive : theme.textInactive }}
            >
              Documentation API
            </span>
          )}
          {!showLabels && hoveredItem === "api-docs" && (
            <div
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50 shadow-lg"
              style={{ background: theme.tooltipBg, color: theme.tooltipText }}
            >
              Documentation API
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: `6px solid ${theme.tooltipBg}`,
                }}
              />
            </div>
          )}
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          onMouseEnter={() => setHoveredItem("settings")}
          onMouseLeave={() => setHoveredItem(null)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative"
          style={{ background: isActive("/settings") ? theme.itemActive : "transparent" }}
        >
          <Settings
            className="w-5 h-5 flex-shrink-0"
            style={{ color: isActive("/settings") ? theme.iconActive : theme.iconInactive }}
          />
          {showLabels && (
            <span
              className="flex-1 text-[14px] font-medium"
              style={{ color: isActive("/settings") ? theme.textActive : theme.textInactive }}
            >
              Paramètres
            </span>
          )}
          {!showLabels && hoveredItem === "settings" && (
            <div
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50 shadow-lg"
              style={{ background: theme.tooltipBg, color: theme.tooltipText }}
            >
              Paramètres
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: `6px solid ${theme.tooltipBg}`,
                }}
              />
            </div>
          )}
        </Link>

        {/* User / Mon compte */}
        <Link
          href="/account"
          onMouseEnter={() => setHoveredItem("account")}
          onMouseLeave={() => setHoveredItem(null)}
          className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-2xl transition-colors relative"
          style={{ background: isActive("/account") ? theme.itemActive : theme.itemHover }}
        >
          <div className="relative">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: isActive("/account") ? "#FFFFFF" : theme.accentSecondary }}
            >
              <span
                className="text-[11px] font-semibold"
                style={{ color: isActive("/account") ? theme.accentSecondary : "#FFFFFF" }}
              >
                {userInitials}
              </span>
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: "#28B95F", borderColor: theme.sidebarBgSolid }}
            />
          </div>
          {showLabels && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: theme.textActive }}>
                {session?.user?.name || "Utilisateur"}
              </p>
              <p className="text-[10px] truncate" style={{ color: theme.textMuted }}>
                Mon compte
              </p>
            </div>
          )}
          {!showLabels && hoveredItem === "account" && (
            <div
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50 shadow-lg"
              style={{ background: theme.tooltipBg, color: theme.tooltipText }}
            >
              Mon compte
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: `6px solid ${theme.tooltipBg}`,
                }}
              />
            </div>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          onMouseEnter={() => setHoveredItem("logout")}
          onMouseLeave={() => setHoveredItem(null)}
          className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative"
          style={{ background: hoveredItem === "logout" ? "rgba(240, 75, 105, 0.15)" : "transparent" }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" style={{ color: theme.accentDanger }} />
          {showLabels && (
            <span className="text-[13px] font-medium" style={{ color: theme.accentDanger }}>
              Déconnexion
            </span>
          )}
          {!showLabels && hoveredItem === "logout" && (
            <div
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap z-50 shadow-lg"
              style={{ background: theme.tooltipBg, color: theme.tooltipText }}
            >
              Déconnexion
              <div
                className="absolute -left-1.5 top-1/2 -translate-y-1/2"
                style={{
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderRight: `6px solid ${theme.tooltipBg}`,
                }}
              />
            </div>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="hidden lg:block h-screen flex-shrink-0 transition-all duration-300 relative z-10"
        style={{
          width: collapsed ? 72 : 260,
          background: theme.sidebarBg,
          borderRight: `1px solid ${theme.border}`,
        }}
      >
        {sidebarContent(!collapsed)}
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Mobile Sidebar */}
      <div
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] transition-transform duration-300"
        style={{
          background: theme.sidebarBg,
          boxShadow: "4px 0 24px rgba(0, 0, 0, 0.3)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {sidebarContent(true, true)}
      </div>
    </>
  )
}
