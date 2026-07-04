import { BookOpen, CheckCircle2, Database, TrendingUp, ArrowRightLeft } from 'lucide-react'
import type { AdminMetrics } from '../../types'

interface KPI {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
}

function buildKPIs(m: AdminMetrics): KPI[] {
  return [
    {
      label: 'KNOWLEDGE ARTICLES',
      value: m.knowledge_articles.toLocaleString(),
      sub: m.knowledge_articles === 0 ? 'No files indexed yet' : 'Indexed documents',
      icon: <BookOpen size={18} className="text-gray-400" />,
    },
    {
      label: 'AI RESOLVED TICKETS',
      value: m.tickets_resolved_by_ai.toLocaleString(),
      sub: m.resolution_rate > 0 ? `${m.resolution_rate.toFixed(0)}% resolution rate` : 'No resolutions yet',
      icon: <CheckCircle2 size={18} className="text-gray-400" />,
    },
    {
      label: 'TRANSFERRED TICKETS',
      value: m.transferred_tickets.toLocaleString(),
      sub: m.transferred_tickets === 0 ? 'None transferred yet' : 'Handed off to support',
      icon: <ArrowRightLeft size={18} className="text-gray-400" />,
    },
    {
      label: 'CONNECTED SOURCES',
      value: m.connected_sources,
      sub: m.connected_sources === 0 ? 'No Azure services configured' : 'Azure services active',
      icon: <Database size={18} className="text-gray-400" />,
    },
    {
      label: 'SEARCH SUCCESS RATE',
      value: `${m.search_success_rate.toFixed(0)}%`,
      sub: m.search_success_rate === 0 ? 'No searches yet' : 'Responses with citations',
      icon: <TrendingUp size={18} className="text-gray-400" />,
    },
  ]
}

export default function KPICards({ metrics }: { metrics?: AdminMetrics }) {
  if (!metrics) return null
  const kpis = buildKPIs(metrics)
  return (
    <div className="grid grid-cols-5 gap-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-start justify-between"
        >
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              {k.label}
            </p>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
          </div>
          <div className="mt-0.5">{k.icon}</div>
        </div>
      ))}
    </div>
  )
}
