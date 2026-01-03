import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import {
  Users, FileText, FileCheck, TrendingUp, AlertTriangle,
  Clock, CheckCircle, ArrowUpRight, RefreshCw, Wallet,
  AlertCircle, Calendar, Euro, Target, Mail, Ticket,
  ArrowUp, ArrowDown, MoreVertical
} from "lucide-react"
import Link from "next/link"

interface TenantSettings {
  monthlyGoal?: number
  monthlyGoalMode?: "auto" | "fixed"
}

async function getTenantSettings(): Promise<TenantSettings> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    return {}
  }

  try {
    const parsed = JSON.parse(tenant.settings)
    // Map snake_case to camelCase and ensure proper types
    return {
      monthlyGoal: parsed.monthly_goal ? Number(parsed.monthly_goal) : undefined,
      monthlyGoalMode: parsed.monthly_goal_mode as "auto" | "fixed" | undefined,
    }
  } catch {
    return {}
  }
}

async function getDashboardStats() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfWeek = new Date(now)
  endOfWeek.setDate(now.getDate() + 7)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const settings = await getTenantSettings()

  const [
    totalClients,
    activeClients,
    newClientsThisMonth,
    totalInvoices,
    paidInvoices,
    overdueInvoices,
    draftInvoices,
    totalQuotes,
    acceptedQuotes,
    pendingQuotes,
    openTickets,
    totalRevenue,
    monthlyRevenue,
    recentInvoices,
    overdueInvoicesList,
    draftInvoicesList,
    pendingQuotesList,
    lastMonthRevenue,
    overdueAmount,
    thisWeekAmount,
    thisMonthAmount,
    laterAmount,
    clientServices,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "active" } }),
    prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.invoice.count({ where: { createdAt: { gte: startOfYear } } }),
    prisma.invoice.count({ where: { status: "paid", createdAt: { gte: startOfYear } } }),
    prisma.invoice.count({ where: { status: "overdue", createdAt: { gte: startOfYear } } }),
    prisma.invoice.count({ where: { status: "draft", createdAt: { gte: startOfYear } } }),
    prisma.quote.count({ where: { createdAt: { gte: startOfYear } } }),
    prisma.quote.count({ where: { status: "accepted", createdAt: { gte: startOfYear } } }),
    prisma.quote.count({ where: { status: { in: ["draft", "sent"] }, createdAt: { gte: startOfYear } } }),
    prisma.ticket.count({ where: { status: { in: ["new", "open", "pending"] } } }),
    prisma.invoice.aggregate({ _sum: { totalTtc: true }, where: { status: "paid" } }),
    prisma.invoice.aggregate({ _sum: { totalTtc: true }, where: { status: "paid", paymentDate: { gte: startOfMonth } } }),
    prisma.invoice.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { client: { select: { companyName: true } } } }),
    prisma.invoice.findMany({
      where: { status: "overdue" },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { client: { select: { id: true, companyName: true } } }
    }),
    prisma.invoice.findMany({
      where: { status: "draft" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { id: true, companyName: true } } }
    }),
    prisma.quote.findMany({
      where: { status: { in: ["draft", "sent"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { id: true, companyName: true } } }
    }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: {
        status: "paid",
        paymentDate: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: startOfMonth
        }
      }
    }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: { status: { in: ["sent", "overdue"] }, dueDate: { lt: now } }
    }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: { status: { in: ["sent"] }, dueDate: { gte: now, lte: endOfWeek } }
    }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: { status: { in: ["sent"] }, dueDate: { gt: endOfWeek, lte: endOfMonth } }
    }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: { status: { in: ["sent"] }, dueDate: { gt: endOfMonth } }
    }),
    prisma.clientService.findMany({
      where: { is_active: true, service: { isRecurring: true } },
      include: { service: true }
    }),
  ])

  let calculatedMRR = 0
  clientServices.forEach(cs => {
    const price = cs.custom_price_ht ? Number(cs.custom_price_ht) : Number(cs.service.unitPriceHt)
    calculatedMRR += price * Number(cs.quantity)
  })

  const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0
  const lastMonthRev = Number(lastMonthRevenue._sum.totalTtc || 0)
  const currentMonthRev = Number(monthlyRevenue._sum.totalTtc || 0)
  let monthlyGoal = 5000

  if (settings.monthlyGoal && settings.monthlyGoal > 0 && settings.monthlyGoalMode === "fixed") {
    monthlyGoal = settings.monthlyGoal
  } else {
    if (lastMonthRev > 0) {
      monthlyGoal = Math.round(lastMonthRev * 1.1)
    } else if (currentMonthRev > 0) {
      monthlyGoal = Math.round(currentMonthRev * 1.2)
    }
  }

  const growth = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0

  return {
    totalClients, activeClients, newClientsThisMonth,
    totalInvoices, paidInvoices, overdueInvoices, draftInvoices,
    totalQuotes, acceptedQuotes, pendingQuotes, openTickets,
    totalRevenue: Number(totalRevenue._sum.totalTtc || 0),
    monthlyRevenue: currentMonthRev,
    mrr: calculatedMRR,
    clientServicesCount: clientServices.length,
    recentInvoices,
    conversionRate: Math.round(conversionRate),
    monthlyGoal,
    growth,
    overdueInvoicesList,
    draftInvoicesList,
    pendingQuotesList,
    treasury: {
      overdue: Number(overdueAmount._sum.totalTtc || 0),
      thisWeek: Number(thisWeekAmount._sum.totalTtc || 0),
      thisMonth: Number(thisMonthAmount._sum.totalTtc || 0),
      later: Number(laterAmount._sum.totalTtc || 0),
    },
  }
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Bonjour"
  if (hour < 18) return "Bon apres-midi"
  return "Bonsoir"
}

function getDaysOverdue(dueDate: Date): number {
  const now = new Date()
  const due = new Date(dueDate)
  const diffTime = now.getTime() - due.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const greeting = getGreeting()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const goalProgress = stats.monthlyGoal > 0 ? Math.min(100, (stats.monthlyRevenue / stats.monthlyGoal) * 100) : 0

  return (
    <div className="space-y-6 min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-[34px] leading-[40px] font-medium tracking-[-0.5px]" style={{ color: '#111111' }}>
            {greeting}, Julien
          </h1>
          <p className="text-sm mt-1" style={{ color: '#666666' }}>
            Voici ce qui vous attend aujourd'hui.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/quotes/new"
            className="flex items-center gap-2 px-[18px] py-[10px] rounded-[10px] text-sm font-medium transition-all"
            style={{
              background: '#FFFFFF',
              color: '#111111',
              border: '1px solid #DDDDDD',
            }}
          >
            <FileCheck className="h-4 w-4" />
            Nouveau devis
          </Link>
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 px-[18px] py-[10px] rounded-[10px] text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: '#0064FA' }}
          >
            <span className="text-base font-normal mr-1">+</span>
            Nouvelle facture
          </Link>
        </div>
      </div>

      {/* Stats Grid - 4 colonnes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CA du mois */}
        <div
          className="relative rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          <span className="text-sm" style={{ color: '#666666' }}>CA du mois</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[48px] leading-none font-medium tracking-[-1px]" style={{ color: '#111111' }}>
              {Math.round(stats.monthlyRevenue / 1000)}
            </span>
            <span className="text-2xl font-normal" style={{ color: '#999999' }}>k</span>
          </div>
          {stats.growth !== 0 && (
            <div className={`inline-flex items-center gap-1 mt-3 px-2 py-1 rounded-full text-xs font-medium ${
              stats.growth > 0 ? 'text-[#28B95F]' : 'text-[#F04B69]'
            }`} style={{ background: stats.growth > 0 ? '#D4EDDA' : '#FEE2E8' }}>
              {stats.growth > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(Math.round(stats.growth))}%
            </div>
          )}
          {/* Illustration décorative */}
          <div className="absolute right-4 bottom-4 w-16 h-16 opacity-10">
            <Euro className="w-full h-full" style={{ color: '#0064FA' }} />
          </div>
        </div>

        {/* MRR */}
        <div
          className="relative rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          <span className="text-sm" style={{ color: '#666666' }}>Revenus récurrents</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[48px] leading-none font-medium tracking-[-1px]" style={{ color: '#111111' }}>
              {formatCurrency(stats.mrr).replace(/[^0-9]/g, '').slice(0, -2) || '0'}
            </span>
            <span className="text-2xl font-normal" style={{ color: '#999999' }}></span>
          </div>
          <span className="text-xs mt-3 block" style={{ color: '#999999' }}>{stats.clientServicesCount} services actifs</span>
          <div className="absolute right-4 bottom-4 w-16 h-16 opacity-10">
            <RefreshCw className="w-full h-full" style={{ color: '#14B4E6' }} />
          </div>
        </div>

        {/* Clients */}
        <div
          className="relative rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          <span className="text-sm" style={{ color: '#666666' }}>Clients actifs</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[48px] leading-none font-medium tracking-[-1px]" style={{ color: '#111111' }}>
              {stats.activeClients}
            </span>
            <span className="text-2xl font-normal" style={{ color: '#999999' }}>/{stats.totalClients}</span>
          </div>
          {stats.newClientsThisMonth > 0 && (
            <span className="inline-flex items-center gap-1 mt-3 px-2 py-1 rounded-full text-xs font-medium"
              style={{ background: '#D4EDDA', color: '#28B95F' }}>
              +{stats.newClientsThisMonth} ce mois
            </span>
          )}
          <div className="absolute right-4 bottom-4 w-16 h-16 opacity-10">
            <Users className="w-full h-full" style={{ color: '#5F00BA' }} />
          </div>
        </div>

        {/* Tickets */}
        <div
          className="relative rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          <span className="text-sm" style={{ color: '#666666' }}>Tickets ouverts</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[48px] leading-none font-medium tracking-[-1px]" style={{ color: '#111111' }}>
              {stats.openTickets}
            </span>
          </div>
          {stats.openTickets > 0 && (
            <span className="inline-flex items-center gap-1 mt-3 px-2 py-1 rounded-full text-xs font-medium"
              style={{ background: '#FEF3CD', color: '#F0783C' }}>
              A traiter
            </span>
          )}
          <div className="absolute right-4 bottom-4 w-16 h-16 opacity-10">
            <Ticket className="w-full h-full" style={{ color: '#F0783C' }} />
          </div>
        </div>
      </div>

      {/* A traiter - Bookings style */}
      {(stats.overdueInvoicesList.length > 0 || stats.draftInvoicesList.length > 0 || stats.pendingQuotesList.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] leading-[28px] font-medium" style={{ color: '#111111' }}>A traiter</h2>
            <Link href="/invoices" className="text-[13px] font-medium hover:underline" style={{ color: '#0064FA' }}>
              Voir tout ({stats.overdueInvoices + stats.draftInvoices + stats.pendingQuotes})
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Factures en retard */}
            {stats.overdueInvoicesList.slice(0, 2).map((inv) => (
              <Link
                key={inv.id.toString()}
                href={`/invoices/${inv.id}`}
                className="rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  borderLeft: '4px solid #F04B69'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium" style={{ color: '#111111' }}>{inv.invoiceNumber}</h3>
                  <button className="p-1 rounded hover:bg-[#F5F5F7]">
                    <MoreVertical className="w-5 h-5" style={{ color: '#999999' }} />
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  <span className="px-[10px] py-1 rounded-[6px] text-xs" style={{ background: '#F5F5F7', color: '#666666' }}>
                    Facture
                  </span>
                  <span className="px-[10px] py-1 rounded-[6px] text-xs" style={{ background: '#F5F5F7', color: '#666666' }}>
                    {inv.client.companyName}
                  </span>
                </div>
                <div className="flex gap-6 mb-4">
                  <div>
                    <span className="flex items-center gap-1 text-xs mb-1" style={{ color: '#999999' }}>
                      <AlertTriangle className="w-3 h-3" />
                      Retard
                    </span>
                    <span className="text-sm" style={{ color: '#111111' }}>+{getDaysOverdue(inv.dueDate)} jours</span>
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-xs mb-1" style={{ color: '#999999' }}>
                      <Euro className="w-3 h-3" />
                      Montant
                    </span>
                    <span className="text-sm" style={{ color: '#111111' }}>{formatCurrency(Number(inv.totalTtc))}</span>
                  </div>
                </div>
                <div className="pt-4 border-t flex justify-end" style={{ borderColor: '#EEEEEE' }}>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: '#FEE2E8', color: '#F04B69' }}>
                    <AlertCircle className="w-3 h-3" />
                    En retard
                  </span>
                </div>
              </Link>
            ))}

            {/* Devis en attente */}
            {stats.pendingQuotesList.slice(0, 1).map((quote) => (
              <Link
                key={quote.id.toString()}
                href={`/quotes/${quote.id}`}
                className="rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  borderLeft: '4px solid #F0783C'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium" style={{ color: '#111111' }}>{quote.quoteNumber}</h3>
                  <button className="p-1 rounded hover:bg-[#F5F5F7]">
                    <MoreVertical className="w-5 h-5" style={{ color: '#999999' }} />
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  <span className="px-[10px] py-1 rounded-[6px] text-xs" style={{ background: '#F5F5F7', color: '#666666' }}>
                    Devis
                  </span>
                  <span className="px-[10px] py-1 rounded-[6px] text-xs" style={{ background: '#F5F5F7', color: '#666666' }}>
                    {quote.client.companyName}
                  </span>
                </div>
                <div className="flex gap-6 mb-4">
                  <div>
                    <span className="flex items-center gap-1 text-xs mb-1" style={{ color: '#999999' }}>
                      <Euro className="w-3 h-3" />
                      Montant
                    </span>
                    <span className="text-sm" style={{ color: '#111111' }}>{formatCurrency(Number(quote.totalTtc))}</span>
                  </div>
                </div>
                <div className="pt-4 border-t flex justify-end" style={{ borderColor: '#EEEEEE' }}>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: '#FEF3CD', color: '#F0783C' }}>
                    <Clock className="w-3 h-3" />
                    En attente
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Objectif & Trésorerie */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Objectif du mois */}
        <div
          className="rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium" style={{ color: '#111111' }}>Objectif mensuel</h3>
            <span className="text-sm" style={{ color: '#999999' }}>{formatCurrency(stats.monthlyGoal)}</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress Ring */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#EEEEEE"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  fill="none"
                  stroke="#0064FA"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${goalProgress * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-medium" style={{ color: '#111111' }}>{Math.round(goalProgress)}%</span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#666666' }}>Réalisé</span>
                <span className="text-sm font-medium" style={{ color: '#111111' }}>{formatCurrency(stats.monthlyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#666666' }}>Restant</span>
                <span className="text-sm font-medium" style={{ color: '#111111' }}>{formatCurrency(Math.max(0, stats.monthlyGoal - stats.monthlyRevenue))}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: '#EEEEEE' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ background: '#0064FA', width: `${goalProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trésorerie */}
        <div
          className="rounded-[16px] p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium" style={{ color: '#111111' }}>Trésorerie attendue</h3>
            <Link href="/treasury" className="text-[13px] font-medium hover:underline" style={{ color: '#0064FA' }}>
              Voir détail
            </Link>
          </div>

          <div className="space-y-3">
            {stats.treasury.overdue > 0 && (
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#EEEEEE' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#F04B69' }} />
                  <span className="text-sm" style={{ color: '#444444' }}>En retard</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#F04B69' }}>{formatCurrency(stats.treasury.overdue)}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#EEEEEE' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#0064FA' }} />
                <span className="text-sm" style={{ color: '#444444' }}>Cette semaine</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#111111' }}>{formatCurrency(stats.treasury.thisWeek)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#EEEEEE' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#14B4E6' }} />
                <span className="text-sm" style={{ color: '#444444' }}>Ce mois</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#111111' }}>{formatCurrency(stats.treasury.thisMonth)}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#AEAEAE' }} />
                <span className="text-sm" style={{ color: '#444444' }}>Plus tard</span>
              </div>
              <span className="text-sm font-medium" style={{ color: '#111111' }}>{formatCurrency(stats.treasury.later)}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#DDDDDD' }}>
              <span className="text-sm font-medium" style={{ color: '#111111' }}>Total</span>
              <span className="text-lg font-medium" style={{ color: '#0064FA' }}>
                {formatCurrency(stats.treasury.overdue + stats.treasury.thisWeek + stats.treasury.thisMonth + stats.treasury.later)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dernières factures */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] leading-[28px] font-medium" style={{ color: '#111111' }}>Dernières factures</h2>
          <Link href="/invoices" className="text-[13px] font-medium hover:underline" style={{ color: '#0064FA' }}>
            Voir tout ({stats.totalInvoices})
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {stats.recentInvoices.map((invoice) => (
            <Link
              key={invoice.id.toString()}
              href={`/invoices/${invoice.id}`}
              className="rounded-[16px] p-4 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`px-[10px] py-1 rounded-full text-[11px] font-medium ${
                  invoice.status === "paid" ? "text-[#28B95F]" :
                  invoice.status === "sent" ? "text-[#0064FA]" :
                  invoice.status === "overdue" ? "text-[#F04B69]" :
                  "text-[#999999]"
                }`} style={{
                  background: invoice.status === "paid" ? "#D4EDDA" :
                    invoice.status === "sent" ? "#E3F2FD" :
                    invoice.status === "overdue" ? "#FEE2E8" : "#F5F5F7"
                }}>
                  {invoice.status === "paid" ? "Payée" : invoice.status === "sent" ? "Envoyée" : invoice.status === "overdue" ? "En retard" : "Brouillon"}
                </span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#111111' }}>{invoice.invoiceNumber}</p>
              <p className="text-xs truncate mb-3" style={{ color: '#666666' }}>{invoice.client.companyName}</p>
              <p className="text-lg font-medium" style={{ color: '#111111' }}>{formatCurrency(Number(invoice.totalTtc))}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Tout est à jour */}
      {stats.overdueInvoicesList.length === 0 && stats.draftInvoicesList.length === 0 && stats.pendingQuotesList.length === 0 && (
        <div
          className="rounded-[16px] p-12 text-center"
          style={{ background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#D4EDDA' }}>
            <CheckCircle className="w-10 h-10" style={{ color: '#28B95F' }} />
          </div>
          <h3 className="text-lg font-medium mb-2" style={{ color: '#111111' }}>Tout est à jour !</h3>
          <p className="text-sm" style={{ color: '#666666' }}>Aucun élément en attente de traitement.</p>
        </div>
      )}
    </div>
  )
}
