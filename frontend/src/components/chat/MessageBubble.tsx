import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import type { Message } from '../../types'
import SuggestionChips from './SuggestionChips'
import { renderMarkdown } from '../../utils/markdown'
import { parseSupportMessage } from '../../utils/supportMessage'

interface Props {
  message: Message
  isFirst?: boolean
  onSuggestion?: (text: string) => void
  onEdit?: (messageId: string, content: string) => Promise<void>
  onDelete?: (messageId: string) => Promise<void>
  dark?: boolean
}

export default function MessageBubble({ message, isFirst, onSuggestion, onEdit, onDelete, dark }: Props) {
  const isAI = message.role === 'assistant'
  const time = format(new Date(message.created_at), 'hh:mm aa')
  const { isSupport, senderName, content } = parseSupportMessage(message.content)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const canModify = !isAI && !!(onEdit || onDelete)

  const startEdit = () => {
    setDraft(content)
    setEditing(true)
  }

  const saveEdit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === content || !onEdit) {
      setEditing(false)
      return
    }
    setBusy(true)
    try {
      await onEdit(message.id, trimmed)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!onDelete) return
    setBusy(true)
    try {
      await onDelete(message.id)
    } finally {
      setBusy(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <div className={`flex gap-3 group ${isAI ? '' : 'flex-row-reverse'}`}>
      {isAI && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isSupport ? 'bg-purple-600' : 'bg-primary-600'
        }`}>
          <span className="text-white text-xs font-bold">{isSupport ? senderName[0]?.toUpperCase() : 'AI'}</span>
        </div>
      )}

      <div className={`max-w-[75%] ${isAI ? '' : 'items-end'} flex flex-col`}>
        {isAI && isSupport && (
          <span className={`text-[11px] font-semibold mb-1 px-1 ${dark ? 'text-purple-300' : 'text-purple-600'}`}>
            {senderName} · Support
          </span>
        )}

        {editing ? (
          <div className="w-full min-w-[220px]">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={2}
              className={`w-full text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                dark ? 'bg-white/10 border border-white/20 text-white' : 'bg-white border border-gray-200 text-gray-800'
              }`}
            />
            <div className="flex items-center gap-2 mt-1.5 justify-end">
              <button
                onClick={() => setEditing(false)}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={busy || !draft.trim()}
                className="flex items-center gap-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
              isAI
                ? isSupport
                  ? dark
                    ? 'bg-purple-500/15 border border-purple-400/30 text-white rounded-tl-sm'
                    : 'bg-purple-50 border border-purple-100 text-purple-900 rounded-tl-sm'
                  : dark
                    ? 'bg-white/10 border border-white/10 text-white rounded-tl-sm'
                    : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
                : 'bg-primary-600 text-white rounded-tr-sm whitespace-pre-wrap'
            }`}
          >
            {isAI ? (
              message.is_streaming ? (
                <span>
                  {renderMarkdown(content, dark)}
                  <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
                </span>
              ) : (
                renderMarkdown(content, dark)
              )
            ) : (
              content
            )}
          </div>
        )}

        {isAI && isFirst && onSuggestion && (
          <SuggestionChips onSelect={onSuggestion} dark={dark} />
        )}

        {!editing && (
          <div className="flex items-center gap-2 mt-1 px-1">
            <span className={`text-[11px] ${dark ? 'text-slate-500' : 'text-gray-400'}`}>{time}</span>

            {canModify && !confirmingDelete && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button onClick={startEdit} title="Edit message" className={`p-0.5 rounded ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}>
                    <Pencil size={11} />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => setConfirmingDelete(true)} title="Delete message" className={`p-0.5 rounded ${dark ? 'text-slate-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            )}

            {confirmingDelete && (
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] ${dark ? 'text-slate-400' : 'text-gray-500'}`}>Delete?</span>
                <button
                  onClick={confirmDelete}
                  disabled={busy}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className={`p-0.5 rounded ${dark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  <X size={11} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
