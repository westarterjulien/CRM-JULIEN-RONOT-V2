import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"
import {
  Users,
  FileText,
  FileCheck,
  Euro,
  Ticket,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Activity,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { DateDisplay } from "@/components/ui/date-display"

async function getDashboardStats() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const startOfYear = new Date(currentYear, 0, 1)
  const startOfMonth = new Date(currentYear, currentMonth, 1)
  const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1)
  const endOfLastMonth = new Date(currentYear, currentMonth, 0)

  const [
    totalClients,
    activeClients,
    newClientsThisMonth,
    totalInvoices,
    unpaidInvoices,
    paidInvoicesThisYear,
    totalQuotes,
    pendingQuotes,
    openTickets,
    revenueThisYear,
    revenueLastMonth,
    revenueThisMonth,
    recentInvoices,
    recentQuotes,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { status: "active" } }),
    prisma.client.count({
      where: { createdAt: { gte: startOfMonth } }
    }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: { in: ["sent", "overdue"] } } }),
    prisma.invoice.count({
      where: { status: "paid", paymentDate: { gte: startOfYear } }
    }),
    prisma.quote.count(),
    prisma.quote.count({ where: { status: { in: ["draft", "sent"] } } }),
    prisma.ticket.count({ where: { status: { in: ["new", "open", "pending"] } } }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: { status: "paid", paymentDate: { gte: startOfYear } },
    }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: {
        status: "paid",
        paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth }
      },
    }),
    prisma.invoice.aggregate({
      _sum: { totalTtc: true },
      where: { status: "paid", paymentDate: { gte: startOfMonth } },
    }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { companyName: true } } },
    }),
    prisma.quote.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { companyName: true } } },
    }),
  ])

  const revenueThisYearAmount = Number(revenueThisYear._sum.totalTtc || 0)
  const revenueLastMonthAmount = Number(revenueLastMonth._sum.totalTtc || 0)
  const revenueThisMonthAmount = Number(revenueThisMonth._sum.totalTtc || 0)

  const monthlyGrowth = revenueLastMonthAmount > 0
    ? ((revenueThisMonthAmount - revenueLastMonthAmount) / revenueLastMonthAmount) * 100
    : 0

  return {
    totalClients,
    activeClients,
    newClientsThisMonth,
    totalInvoices,
    unpaidInvoices,
    paidInvoicesThisYear,
    totalQuotes,
    pendingQuotes,
    openTickets,
    revenueThisYear: revenueThisYearAmount,
    revenueThisMonth: revenueThisMonthAmount,
    monthlyGrowth,
    recentInvoices,
    recentQuotes,
  }
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300",
  sent: "bg-blue-500/20 text-blue-300",
  paid: "bg-emerald-500/20 text-emerald-300",
  overdue: "bg-red-500/20 text-red-300",
  accepted: "bg-emerald-500/20 text-emerald-300",
  refused: "bg-red-500/20 text-red-300",
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  accepted: "Accepté",
  refused: "Refusé",
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Bonjour <span className="bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">!</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperçu de votre activité
          </p>
        </div>
        <DateDisplay />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="col-span-2 p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Euro className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/60">Chiffre d&apos;affaires</p>
                <p className="text-xs text-white/40">{currentYear}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${stats.monthlyGrowth >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {stats.monthlyGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(stats.monthlyGrowth).toFixed(1)}%
            </div>
          </div>
          <p className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
            {formatCurrency(stats.revenueThisYear)}
          </p>
          <p className="text-sm text-white/50 mt-2">
            <span className="text-emerald-400 font-medium">{formatCurrency(stats.revenueThisMonth)}</span> ce mois
          </p>
          {/* Mini chart */}
          <div className="flex items-end gap-1 h-10 mt-4">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 95, 70].map((height, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500/50 to-emerald-500/10"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* Clients */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-white" />
            </div>
            <Link href="/clients" className="text-xs text-white/40 hover:text-violet-400 transition-colors">
              Voir
            </Link>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
          <p className="text-xs text-white/50 mt-1">Clients</p>
        </div>

        {/* Actifs */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl group hover:border-violet-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <p className="text-3xl font-bold text-white mt-4">{stats.activeClients}</p>
          <p className="text-xs text-white/50 mt-1">Actifs</p>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Factures */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <Link href="/invoices" className="text-xs text-white/40 hover:text-violet-400 transition-colors">
              Voir
            </Link>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalInvoices}</p>
          <p className="text-xs text-white/50 mt-1">Factures</p>
        </div>

        {/* Devis */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <FileCheck className="h-5 w-5 text-white" />
            </div>
            <Link href="/quotes" className="text-xs text-white/40 hover:text-violet-400 transition-colors">
              Voir
            </Link>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalQuotes}</p>
          <p className="text-xs text-white/50 mt-1">Devis</p>
        </div>

        {/* Tickets */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl group hover:border-red-500/30 transition-all relative">
          {stats.openTickets > 0 && (
            <div className="absolute top-4 right-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            </div>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <p className="text-3xl font-bold text-white mt-4">{stats.openTickets}</p>
          <p className="text-xs text-white/50 mt-1">Tickets ouverts</p>
        </div>

        {/* Croissance */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl group hover:border-indigo-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <p className={`text-3xl font-bold mt-4 ${stats.monthlyGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {stats.monthlyGrowth >= 0 ? "+" : ""}{stats.monthlyGrowth.toFixed(0)}%
          </p>
          <p className="text-xs text-white/50 mt-1">Croissance</p>
        </div>

        {/* Nouveaux */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl group hover:border-pink-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {stats.newClientsThisMonth > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-medium">
                +{stats.newClientsThisMonth}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-white">{stats.newClientsThisMonth}</p>
          <p className="text-xs text-white/50 mt-1">Nouveaux clients</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl">
        <p className="text-sm font-medium text-white/60 mb-4">Actions rapides</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/clients/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </Link>
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </Link>
          <Link
            href="/quotes/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Link>
        </div>
      </div>

      {/* Recent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Dernières factures</h3>
                <p className="text-xs text-white/40">Les 5 plus récentes</p>
              </div>
            </div>
            <Link href="/invoices" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Voir tout
            </Link>
          </div>

          <div className="space-y-2">
            {stats.recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">
                Aucune facture
              </div>
            ) : (
              stats.recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id.toString()}
                  href={`/invoices/${invoice.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                      {invoice.client?.companyName?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90 group-hover:text-violet-400 transition-colors">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-white/40 truncate max-w-[140px]">
                        {invoice.client?.companyName || "Client inconnu"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(Number(invoice.totalTtc))}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[invoice.status || "draft"]}`}>
                      {statusLabels[invoice.status || "draft"]}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Quotes */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#110c22]/80 to-[#0d0a1c]/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Derniers devis</h3>
                <p className="text-xs text-white/40">Les 5 plus recents</p>
              </div>
            </div>
            <Link href="/quotes" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Voir tout
            </Link>
          </div>

          <div className="space-y-2">
            {stats.recentQuotes.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">
                Aucun devis
              </div>
            ) : (
              stats.recentQuotes.map((quote) => (
                <Link
                  key={quote.id.toString()}
                  href={`/quotes/${quote.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white/60">
                      {quote.client?.companyName?.slice(0, 2).toUpperCase() || "??"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90 group-hover:text-violet-400 transition-colors">
                        {quote.quoteNumber}
                      </p>
                      <p className="text-xs text-white/40 truncate max-w-[140px]">
                        {quote.client?.companyName || "Client inconnu"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCurrency(Number(quote.totalTtc))}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[quote.status || "draft"]}`}>
                      {statusLabels[quote.status || "draft"]}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
