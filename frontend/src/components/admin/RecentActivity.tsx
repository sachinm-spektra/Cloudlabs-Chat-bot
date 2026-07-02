import { useEffect, useState } from 'react'
import { Clock, Search } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { ActivityItem } from '../../types'
import type { AdminView } from '../../pages/AdminPage'
import { formatDistanceToNow } from 'date-fns'

const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

function extractSearchTerm(detail: string) {
  const match = detail.match(/^"(.*)"$/)
  return match ? match[1] : detail
}

interface Props {
  onNavigate: (v: AdminView) => void
  onOpenTicket: (ticketId: string) => void
}

export default function RecentActivity({ onNavigate, onOpenTicket }: Props) {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getActivity()
      .then(({ data }) => setActivity(data))
      .catch(() => setActivity([]))
      .finally(() => setLoading(false))
  }, [])

  const recentSearches = activity
    .filter((a) => a.action === 'asked agent')
    .slice(0, 5)
    .map((a) => ({ id: a.id, label: extractSearchTerm(a.detail), ticketId: a.ticket_id }))

  const openActivity = (item: ActivityItem) => {
    if (item.ticket_id) onOpenTicket(item.ticket_id)
    else onNavigate('tickets')
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-4">
      {/* Activity */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Recent activity</h3>
            <p className="text-xs text-gray-500">What your team has been doing.</p>
          </div>
          <button
            onClick={() => onNavigate('tickets')}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            View all
          </button>
        </div>

        <div className="space-y-1">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity yet.</p>
          ) : (
            activity.map((item, i) => (
              <button
                key={item.id}
                onClick={() => openActivity(item)}
                title={item.ticket_id ? 'Open this ticket' : 'Open Tickets'}
                className="w-full flex items-start gap-3 text-left hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                    COLORS[i % COLORS.length]
                  }`}
                >
                  {item.user_initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">
                    <span className="font-medium">{item.user_name}</span>{' '}
                    <span className="text-gray-500">{item.action}</span>{' '}
                    <span className="font-medium text-gray-800">{item.detail}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
                  <Clock size={11} />
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Recent searches */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Recent searches</h3>
          <p className="text-xs text-gray-500">Pick up where you left off.</p>
        </div>

        <div className="space-y-2.5">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : recentSearches.length === 0 ? (
            <p className="text-sm text-gray-400">No recent searches yet.</p>
          ) : (
            recentSearches.map((q) => (
              <button
                key={q.id}
                onClick={() => (q.ticketId ? onOpenTicket(q.ticketId) : onNavigate('ai-chat'))}
                title={q.ticketId ? 'Open this ticket' : 'Open AI Chat'}
                className="w-full flex items-center gap-2.5 text-left hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors group"
              >
                <Search size={13} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 group-hover:text-primary-700 truncate">{q.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
