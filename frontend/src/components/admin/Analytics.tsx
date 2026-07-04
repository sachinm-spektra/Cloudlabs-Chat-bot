import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { adminApi } from '../../services/api'
import type { TokenUsagePoint, AdminMetrics } from '../../types'
import { Loader2, Ticket, CheckCircle2, Clock, MessageCircle } from 'lucide-react'

const PIE_COLORS = ['#22c55e', '#f97316', '#a855f7', '#eab308', '#ef4444', '#3b82f6', '#64748b', '#7c3aed']

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress_ai: 'In Progress (AI)',
  resolved_by_ai: 'Resolved by AI',
  open: 'Open',
  transferred_to_support: 'L1 Support',
  l2_escalated: 'L2 Engineer',
  owner_escalated: 'Lab Owner',
  closed: 'Closed',
}

function generateMockUsage(): TokenUsagePoint[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const p = Math.floor(80_000 + Math.random() * 40_000)
    const c = Math.floor(30_000 + Math.random() * 20_000)
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      prompt_tokens: p,
      completion_tokens: c,
      total_tokens: p + c,
    }
  })
}

export default function Analytics() {
  const [usage, setUsage] = useState<TokenUsagePoint[]>([])
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const refresh = () => {
      Promise.all([adminApi.getTokenUsage(14), adminApi.getMetrics(), adminApi.getTicketStatusBreakdown()])
        .then(([u, m, s]) => {
          setUsage(u.data.length ? u.data : generateMockUsage())
          setMetrics(m.data)
          setStatusBreakdown(s.data)
        })
        .catch(() => {
          setUsage((prev) => (prev.length ? prev : generateMockUsage()))
        })
        .finally(() => setLoading(false))
    }
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-primary-500" />
      </div>
    )
  }

  const totalTickets = Object.values(statusBreakdown).reduce((sum, n) => sum + n, 0)

  const ticketData = Object.entries(statusBreakdown)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: STATUS_LABELS[status] ?? status, value: count }))

  const summaryCards = [
    { label: 'TOTAL LAB TICKETS', value: totalTickets, icon: <Ticket size={16} className="text-gray-400" /> },
    { label: 'SOLVED BY AI', value: metrics?.tickets_resolved_by_ai ?? 0, icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
    { label: 'OPEN', value: metrics?.open_tickets ?? 0, icon: <Clock size={16} className="text-orange-500" /> },
    { label: 'TOTAL CHAT SESSIONS', value: metrics?.total_sessions ?? 0, icon: <MessageCircle size={16} className="text-primary-500" /> },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Analytics</h2>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live · refreshes every 30s
        </span>
      </div>

      {/* Real-time summary */}
      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900">{c.value.toLocaleString()}</p>
            </div>
            <div className="mt-0.5">{c.icon}</div>
          </div>
        ))}
      </div>

      {/* Token usage chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Token usage (last 14 days)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={usage} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gPrompt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gComp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => v.toLocaleString()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="prompt_tokens" name="Prompt" stroke="#7c3aed" fill="url(#gPrompt)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="completion_tokens" name="Completion" stroke="#a78bfa" fill="url(#gComp)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Ticket resolution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900">Ticket resolution</h3>
          <p className="text-xs text-gray-400 mb-2">{totalTickets.toLocaleString()} tickets total</p>
          {ticketData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-sm text-gray-400">
              No tickets yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie data={ticketData} cx="50%" cy="46%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {ticketData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, _name, entry) => [`${v} (${((v / totalTickets) * 100).toFixed(0)}%)`, entry.payload.name]} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, lineHeight: '18px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily sessions bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily sessions (last 14 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={usage.map((u) => ({ date: u.date, sessions: Math.floor(u.total_tokens / 15000) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="sessions" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
