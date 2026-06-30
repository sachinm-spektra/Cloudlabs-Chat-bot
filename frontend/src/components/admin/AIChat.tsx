import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Loader2, ChevronDown } from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { Ticket, Message } from '../../types'
import { renderMarkdown } from '../../utils/markdown'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: string
}

const WELCOME: Msg = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm the CloudLabs AI Agent.\n\nI can help with lab provisioning, VM issues, lab guide questions, billing, and more.\n\nOptionally select a user ticket below to ask questions in context of that conversation.",
  ts: new Date().toISOString(),
}

export default function AIChat() {
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTicketPicker, setShowTicketPicker] = useState(false)
  const [ticketHistory, setTicketHistory] = useState<Message[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    adminApi
      .getTickets({ limit: 50 })
      .then(({ data }) => setTickets(data.tickets))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedTicket) {
      setTicketHistory([])
      return
    }
    setHistoryLoading(true)
    adminApi
      .getSessionMessages(selectedTicket.session_id)
      .then(({ data }) => setTicketHistory(data))
      .catch(() => setTicketHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [selectedTicket?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  const send = async () => {
    const q = text.trim()
    if (!q || loading) return
    setText('')

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: q, ts: new Date().toISOString() }
    setMsgs((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const { data } = await adminApi.aiQuery(q, selectedTicket?.session_id)
      const aiMsg: Msg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        ts: new Date().toISOString(),
      }
      setMsgs((prev) => [...prev, aiMsg])
    } catch {
      setMsgs((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          ts: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Chat</h2>
          <p className="text-sm text-gray-500">Ask anything about lab operations and knowledge.</p>
        </div>

        {/* Ticket context selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowTicketPicker((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-700"
          >
            <span className="max-w-[200px] truncate">
              {selectedTicket
                ? `#${selectedTicket.id.slice(0, 8).toUpperCase()} — ${selectedTicket.user_name ?? selectedTicket.user_email}`
                : 'No ticket context'}
            </span>
            <ChevronDown size={13} className="text-gray-400 shrink-0" />
          </button>

          {showTicketPicker && (
            <div className="absolute right-0 top-full mt-1 z-10 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setSelectedTicket(null); setShowTicketPicker(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!selectedTicket ? 'font-medium text-primary-600' : 'text-gray-700'}`}
                >
                  No ticket context
                </button>
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTicket(t); setShowTicketPicker(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-t border-gray-50 ${selectedTicket?.id === t.id ? 'font-medium text-primary-600' : 'text-gray-700'}`}
                  >
                    <p className="font-mono text-xs text-gray-500">#{t.id.slice(0, 8).toUpperCase()}</p>
                    <p className="truncate">{t.user_name ?? t.user_email}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTicket && (
        <div className="mb-3 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-primary-50 border-b border-primary-100">
            <p className="text-xs font-semibold text-primary-700">
              Ticket #{selectedTicket.id.slice(0, 8).toUpperCase()} — {selectedTicket.user_name ?? selectedTicket.user_email}
            </p>
            <button onClick={() => setSelectedTicket(null)} className="text-primary-400 hover:text-primary-700 transition-colors text-sm">✕</button>
          </div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-4 bg-white">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          ) : ticketHistory.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-3 bg-white">No messages in this ticket.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto bg-white p-3 space-y-2">
              {ticketHistory.map((m) => {
                const isSupport = m.role === 'assistant' && m.content.startsWith('[Support]')
                const content = isSupport ? m.content.replace(/^\[Support\]\s*/, '') : m.content
                return (
                  <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`max-w-[80%] px-2.5 py-1.5 rounded-lg text-xs leading-relaxed break-words ${
                      m.role === 'user'
                        ? 'bg-primary-100 text-primary-800 rounded-tr-sm'
                        : isSupport
                          ? 'bg-purple-50 border border-purple-100 text-purple-800 rounded-tl-sm'
                          : 'bg-gray-100 text-gray-700 rounded-tl-sm'
                    }`}>
                      {m.role === 'user' ? content : renderMarkdown(content)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                m.role === 'assistant' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {m.role === 'assistant' ? 'AI' : (user?.name[0] ?? 'A')}
              </div>
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                m.role === 'assistant'
                  ? 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                  : 'bg-primary-600 text-white rounded-tr-sm whitespace-pre-wrap'
              }`}>
                {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm">
                <Loader2 size={14} className="animate-spin text-primary-500" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything about labs, billing, or…"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={loading || !text.trim()}
            className="w-8 h-8 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors"
          >
            <ArrowUp size={15} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
