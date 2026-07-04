import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Loader2, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react'
import { adminApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { Ticket, Message } from '../../types'
import { renderMarkdown } from '../../utils/markdown'
import { parseSupportMessage } from '../../utils/supportMessage'

interface Msg {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: string
  isSupport?: boolean
  senderName?: string
  /** true when this message is a real, persisted ChatMessage row (from ticket history) */
  persisted?: boolean
}

const WELCOME: Msg = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm the CloudLabs AI Agent.\n\nI can help with lab provisioning, VM issues, lab guide questions, billing, and more.\n\nOptionally select a user ticket below to ask questions in context of that conversation.",
  ts: new Date().toISOString(),
}

function fromTicketHistory(messages: Message[]): Msg[] {
  return messages.map((m) => {
    const { isSupport, senderName, content } = parseSupportMessage(m.content)
    return {
      id: m.id,
      role: m.role,
      content,
      ts: m.created_at,
      isSupport,
      senderName,
      persisted: true,
    }
  })
}

export default function AIChat() {
  const [qa, setQa] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showTicketPicker, setShowTicketPicker] = useState(false)
  const [ticketHistory, setTicketHistory] = useState<Msg[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msgBusy, setMsgBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    adminApi
      .getTickets({ limit: 50 })
      .then(({ data }) => setTickets(data.tickets))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setQa([])
    if (!selectedTicket) {
      setTicketHistory([])
      return
    }
    setHistoryLoading(true)
    adminApi
      .getSessionMessages(selectedTicket.session_id)
      .then(({ data }) => setTicketHistory(fromTicketHistory(data)))
      .catch(() => setTicketHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [selectedTicket?.id])

  const displayMsgs: Msg[] = selectedTicket ? [...ticketHistory, ...qa] : [WELCOME, ...qa]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMsgs.length, loading, historyLoading])

  const send = async () => {
    const q = text.trim()
    if (!q || loading) return
    setText('')

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: q, ts: new Date().toISOString() }
    setQa((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const { data } = await adminApi.aiQuery(q, selectedTicket?.session_id)
      const aiMsg: Msg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        ts: new Date().toISOString(),
      }
      setQa((prev) => [...prev, aiMsg])
    } catch {
      setQa((prev) => [
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

  const startEdit = (m: Msg) => {
    setEditingId(m.id)
    setEditDraft(m.content)
  }

  const saveEdit = async () => {
    if (!editingId) return
    const trimmed = editDraft.trim()
    if (!trimmed) return
    const target = [...ticketHistory, ...qa].find((m) => m.id === editingId)
    if (!target) return

    if (target.persisted && selectedTicket) {
      setMsgBusy(true)
      try {
        await adminApi.updateSessionMessage(selectedTicket.session_id, editingId, trimmed)
        const { data } = await adminApi.getSessionMessages(selectedTicket.session_id)
        setTicketHistory(fromTicketHistory(data))
        setEditingId(null)
      } catch {
        // ignore
      } finally {
        setMsgBusy(false)
      }
    } else {
      setQa((prev) => prev.map((m) => (m.id === editingId ? { ...m, content: trimmed } : m)))
      setEditingId(null)
    }
  }

  const deleteMsg = async (m: Msg) => {
    if (m.persisted && selectedTicket) {
      setMsgBusy(true)
      try {
        await adminApi.deleteSessionMessage(selectedTicket.session_id, m.id)
        const { data } = await adminApi.getSessionMessages(selectedTicket.session_id)
        setTicketHistory(fromTicketHistory(data))
      } catch {
        // ignore
      } finally {
        setMsgBusy(false)
        setDeletingId(null)
      }
    } else {
      setQa((prev) => prev.filter((msg) => msg.id !== m.id))
      setDeletingId(null)
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
        <div className="mb-3 flex items-center justify-between px-3 py-2 bg-primary-50 border border-primary-100 rounded-xl">
          <p className="text-xs font-semibold text-primary-700">
            Ticket #{selectedTicket.id.slice(0, 8).toUpperCase()} — {selectedTicket.user_name ?? selectedTicket.user_email}
          </p>
          <button onClick={() => setSelectedTicket(null)} className="text-primary-400 hover:text-primary-700 transition-colors text-sm">✕</button>
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-primary-500" />
            </div>
          ) : (
            displayMsgs.map((m) => {
              const canModify = (m.role === 'user' && !m.persisted) || (m.role === 'assistant' && !!m.isSupport && !!m.persisted)
              const isEditingThis = editingId === m.id
              return (
                <div key={m.id} className={`flex gap-3 group ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    m.role === 'assistant'
                      ? m.isSupport ? 'bg-purple-600 text-white' : 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {m.role === 'assistant' ? (m.isSupport ? m.senderName?.[0]?.toUpperCase() : 'AI') : (user?.name[0] ?? 'A')}
                  </div>

                  {isEditingThis ? (
                    <div className="max-w-[75%] w-full min-w-[220px]">
                      <textarea
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        rows={2}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="flex items-center justify-end gap-2 mt-1.5">
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-800">Cancel</button>
                        <button
                          onClick={saveEdit}
                          disabled={msgBusy || !editDraft.trim()}
                          className="flex items-center gap-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 px-2.5 py-1 rounded-lg"
                        >
                          {msgBusy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                      m.role === 'assistant'
                        ? m.isSupport
                          ? 'bg-purple-50 border border-purple-100 text-purple-900 rounded-tl-sm'
                          : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                        : 'bg-primary-600 text-white rounded-tr-sm whitespace-pre-wrap'
                    }`}>
                      {m.role === 'assistant' && m.isSupport && (
                        <p className="text-[11px] font-semibold text-purple-600 mb-1">{m.senderName} · Support</p>
                      )}
                      {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}

                      {canModify && (
                        <div className={`flex items-center gap-1.5 mt-1.5 ${m.role === 'user' ? 'justify-end' : ''}`}>
                          {deletingId === m.id ? (
                            <span className="flex items-center gap-1.5">
                              <span className={`text-[10px] ${m.role === 'user' ? 'text-primary-200' : 'text-gray-500'}`}>Delete?</span>
                              <button onClick={() => deleteMsg(m)} disabled={msgBusy} className="text-[10px] font-semibold text-red-400 hover:text-red-300">Yes</button>
                              <button onClick={() => setDeletingId(null)} className={m.role === 'user' ? 'text-primary-200 hover:text-white' : 'text-gray-400 hover:text-gray-700'}>
                                <X size={10} />
                              </button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(m)} title="Edit" className={m.role === 'user' ? 'text-primary-200 hover:text-white' : 'text-gray-400 hover:text-gray-700'}>
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => setDeletingId(m.id)} title="Delete" className={m.role === 'user' ? 'text-primary-200 hover:text-white' : 'text-gray-400 hover:text-red-500'}>
                                <Trash2 size={11} />
                              </button>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
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
