import { useEffect, useState, useRef } from 'react'
import { Search, Loader2, ChevronLeft, Send, RefreshCw, CheckCircle2 } from 'lucide-react'
import { adminApi } from '../../services/api'
import type { Ticket, TicketStatus, Message } from '../../types'
import { format } from 'date-fns'
import { renderMarkdown } from '../../utils/markdown'

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

const STATUS_FILTERS = [
  { label: 'Raised', value: 'open' },
  { label: 'L1 Support', value: 'transferred_to_support' },
  { label: 'L2 Engineer', value: 'l2_escalated' },
  { label: 'Lab Owner', value: 'owner_escalated' },
  { label: 'Closed', value: 'closed' },
  { label: 'All', value: '' },
]

export default function IssueExplorer() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [statusDraft, setStatusDraft] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusUpdated, setStatusUpdated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    adminApi
      .getTickets({ limit: 100, status: statusFilter || undefined })
      .then(({ data }) => setTickets(data.tickets))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  const loadMessages = async (ticket: Ticket) => {
    setMsgLoading(true)
    try {
      const { data } = await adminApi.getSessionMessages(ticket.session_id)
      setMessages(data)
    } catch {
      setMessages([])
    } finally {
      setMsgLoading(false)
    }
  }

  useEffect(() => {
    if (selected) {
      loadMessages(selected)
      setStatusDraft(selected.status)
      setStatusUpdated(false)
    }
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleRefreshMessages = async () => {
    if (!selected) return
    setRefreshing(true)
    try {
      const { data } = await adminApi.getSessionMessages(selected.session_id)
      setMessages(data)
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selected || !statusDraft || updatingStatus) return
    setUpdatingStatus(true)
    try {
      await adminApi.updateTicketStatus(selected.id, statusDraft)
      const { data } = await adminApi.getTicket(selected.id)
      setSelected(data)
      setTickets((prev) => prev.map((t) => (t.id === data.id ? data : t)))
      setStatusUpdated(true)
      setTimeout(() => setStatusUpdated(false), 2000)
    } catch {
      // ignore
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSend = async () => {
    if (!reply.trim() || !selected || sending) return
    const text = reply.trim()
    setReply('')
    setSending(true)
    try {
      await adminApi.sendSessionMessage(selected.session_id, text)
      await loadMessages(selected)
    } catch {
      setReply(text)
    } finally {
      setSending(false)
    }
  }

  const filtered = tickets.filter(
    (t) =>
      !search ||
      (t.user_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.user_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return (
      <div className="flex h-[calc(100vh-7rem)] max-w-5xl gap-0 bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Left: ticket info */}
        <div className="w-64 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
            >
              <ChevronLeft size={14} />
              All Tickets
            </button>
            <p className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mb-2">
              #{selected.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="font-semibold text-gray-900 text-sm">{selected.user_name ?? '—'}</p>
            <p className="text-xs text-gray-500">{selected.user_email}</p>
            <span className={`mt-2 inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>
              {STATUS_LABELS[selected.status]}
            </span>
          </div>
          <div className="p-4 text-xs text-gray-500 space-y-1.5">
            <p><span className="font-medium text-gray-700">Created:</span> {format(new Date(selected.created_at), 'MMM d, h:mm aa')}</p>
            <p><span className="font-medium text-gray-700">Updated:</span> {format(new Date(selected.updated_at), 'MMM d, h:mm aa')}</p>
            {selected.message_count != null && (
              <p><span className="font-medium text-gray-700">Messages:</span> {selected.message_count}</p>
            )}
          </div>

          {/* Status update */}
          <div className="p-4 border-t border-gray-100 space-y-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Update Status</p>
            <select
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="open">Open</option>
              <option value="resolved_by_ai">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus || statusDraft === selected.status}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : statusUpdated ? <CheckCircle2 size={12} /> : null}
              {updatingStatus ? 'Updating…' : statusUpdated ? 'Updated!' : 'Update Status'}
            </button>
          </div>
        </div>

        {/* Right: conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Conversation</p>
            <button
              onClick={handleRefreshMessages}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Refresh messages"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Loader2 size={18} className="animate-spin mr-2" />
                Loading conversation…
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No messages yet
              </div>
            ) : (
              messages.map((m) => {
                const isSupport = m.role === 'assistant' && m.content.startsWith('[Support]')
                const displayContent = isSupport ? m.content.replace(/^\[Support\]\s*/, '') : m.content
                const isUser = m.role === 'user'
                const avatarLabel = isUser
                  ? (selected.user_name?.[0] ?? 'U').toUpperCase()
                  : isSupport ? 'S' : 'AI'
                const avatarClass = isUser
                  ? 'bg-primary-100 text-primary-700'
                  : isSupport ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                const bubbleClass = isUser
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : isSupport
                    ? 'bg-purple-50 border border-purple-100 text-purple-900 rounded-tl-sm'
                    : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                return (
                  <div key={m.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${avatarClass}`}>
                      {avatarLabel}
                    </div>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed break-words ${bubbleClass}`}>
                      {isUser ? displayContent : renderMarkdown(displayContent)}
                      <p className={`text-[10px] mt-1 ${isUser ? 'text-primary-200' : 'text-gray-400'}`}>
                        {format(new Date(m.created_at), 'hh:mm aa')}
                        {isSupport && <span className="ml-1 font-semibold">· Support</span>}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                }}
                placeholder="Reply as support agent… (Enter to send)"
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!reply.trim() || sending}
                className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Tickets</h2>
        <span className="text-sm text-gray-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, email, or ticket ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={18} className="animate-spin text-primary-500" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Ticket ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Last Update</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Msgs</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No tickets found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        #{t.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.user_name ?? '—'}</p>
                      <p className="text-xs text-gray-500">{t.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {format(new Date(t.created_at), 'MMM d, h:mm aa')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {format(new Date(t.updated_at), 'MMM d, h:mm aa')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {t.message_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-primary-600 font-medium hover:underline">
                        View chat →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
