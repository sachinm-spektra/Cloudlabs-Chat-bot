import { useEffect, useState } from 'react'
import { Loader2, ChevronRight, ArrowRightLeft } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { Ticket, TicketStatus } from '../../types'
import { format } from 'date-fns'

const STATUS_COLORS: Record<TicketStatus, string> = {
  new:                    'bg-blue-100 text-blue-700',
  in_progress_ai:         'bg-yellow-100 text-yellow-700',
  resolved_by_ai:         'bg-green-100 text-green-700',
  open:                   'bg-orange-100 text-orange-700',
  transferred_to_support: 'bg-purple-100 text-purple-700',
  l2_escalated:           'bg-yellow-100 text-yellow-800',
  owner_escalated:        'bg-red-100 text-red-700',
  closed:                 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  new:                    'New',
  in_progress_ai:         'In Progress',
  resolved_by_ai:         'Resolved by AI',
  open:                   'Open',
  transferred_to_support: 'L1 Support',
  l2_escalated:           'L2 Engineer',
  owner_escalated:        'Lab Owner',
  closed:                 'Closed',
}

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All',         value: '' },
  { label: 'Active',      value: 'in_progress_ai' },
  { label: 'Open',        value: 'open' },
  { label: 'Resolved',    value: 'resolved_by_ai' },
  { label: 'Transferred', value: 'transferred_to_support' },
]

export default function ConversationList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [msgs, setMsgs] = useState<Array<{ id: string; role: string; content: string; created_at: string }>>([])

  useEffect(() => {
    setLoading(true)
    adminApi
      .getTickets({ status: filter || undefined })
      .then(({ data }) => {
        setTickets(data.tickets)
        setTotal(data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  const loadMessages = async (t: Ticket) => {
    setSelected(t)
    const { data } = await adminApi.getSessionMessages(t.session_id)
    setMsgs(data as typeof msgs)
  }

  const transfer = async (ticketId: string) => {
    await adminApi.transferTicket(ticketId)
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: 'transferred_to_support' as TicketStatus } : t
      )
    )
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* List */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Conversations ({total})</h2>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={18} className="animate-spin text-primary-500" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No conversations found
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => loadMessages(t)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selected?.id === t.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {(t.user_name ?? 'U')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {t.user_name ?? t.user_email ?? 'Unknown user'}
                    </p>
                    <span
                      className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[t.status]
                      }`}
                    >
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {t.last_message ?? `Ticket #${t.id.slice(0, 8).toUpperCase()}`}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {format(new Date(t.created_at), 'MMM d, h:mm aa')}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-300 shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      {selected && (
        <div className="w-96 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selected.user_name ?? 'Unknown user'}
              </p>
              <p className="text-xs text-gray-500">{selected.user_email}</p>
            </div>
            {selected.status === 'open' && (
              <button
                onClick={() => transfer(selected.id)}
                className="flex items-center gap-1.5 text-xs text-purple-600 border border-purple-200 rounded-lg px-2.5 py-1.5 hover:bg-purple-50 transition-colors"
              >
                <ArrowRightLeft size={12} />
                Transfer
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
