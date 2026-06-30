import { useState } from 'react'
import { Loader2, HeadphonesIcon, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import { useChat } from '../../hooks/useChat'
import { useChatStore } from '../../store/chatStore'
import type { TicketStatus } from '../../types'

const TICKET_STATUS_INFO: Record<TicketStatus, { label: string; color: string; icon: React.ReactNode }> = {
  new:                    { label: 'AI Support',        color: 'text-blue-400',   icon: <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> },
  in_progress_ai:         { label: 'AI Support',        color: 'text-blue-400',   icon: <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> },
  resolved_by_ai:         { label: 'Resolved',          color: 'text-green-400',  icon: <CheckCircle2 size={12} className="text-green-400 inline" /> },
  open:                   { label: 'Awaiting Support',  color: 'text-orange-400', icon: <Clock size={12} className="text-orange-400 inline" /> },
  transferred_to_support: { label: 'Support is helping you', color: 'text-purple-400', icon: <HeadphonesIcon size={12} className="text-purple-400 inline" /> },
  l2_escalated:           { label: 'L2 Engineer',       color: 'text-yellow-400', icon: <AlertCircle size={12} className="text-yellow-400 inline" /> },
  owner_escalated:        { label: 'Lab Owner',         color: 'text-red-400',    icon: <AlertCircle size={12} className="text-red-400 inline" /> },
  closed:                 { label: 'Closed',            color: 'text-gray-400',   icon: <CheckCircle2 size={12} className="text-gray-400 inline" /> },
}

const HUMAN_STATUSES: TicketStatus[] = ['open', 'transferred_to_support', 'l2_escalated', 'owner_escalated']

export default function ChatWidget() {
  const { messages, isLoading, isStarting, sendMessage, raiseTicket, isRaising } = useChat()
  const { session, ticket } = useChatStore()
  const [showRaiseConfirm, setShowRaiseConfirm] = useState(false)

  const handleSuggestion = (text: string) => sendMessage(text)

  const handleRaise = async () => {
    setShowRaiseConfirm(false)
    await raiseTicket()
  }

  const ticketStatus = ticket?.status ?? 'new'
  const statusInfo = TICKET_STATUS_INFO[ticketStatus]
  const isHumanHandling = HUMAN_STATUSES.includes(ticketStatus)
  const canRaise = ticket && !isHumanHandling && ticketStatus !== 'resolved_by_ai' && ticketStatus !== 'closed'

  if (isStarting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary-900/50">
            <span className="text-white font-bold text-xl">AI</span>
          </div>
          <Loader2 size={24} className="animate-spin text-primary-400 mx-auto" />
          <p className="text-slate-400 text-sm">Starting your support session…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-screen max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/50 shrink-0">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">CloudLabs Lab Support</p>
          <p className={`text-xs flex items-center gap-1.5 ${statusInfo.color}`}>
            {statusInfo.icon}
            {statusInfo.label}
            {ticket && (
              <span className="text-slate-500 font-mono ml-1">· #{ticket.id.slice(0, 8).toUpperCase()}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canRaise && (
            showRaiseConfirm ? (
              <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-1.5">
                <span className="text-xs text-orange-300">Raise to support?</span>
                <button
                  onClick={handleRaise}
                  disabled={isRaising}
                  className="text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-2 py-0.5 rounded-lg transition-colors"
                >
                  {isRaising ? 'Raising…' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowRaiseConfirm(false)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRaiseConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-300 border border-orange-500/30 hover:bg-orange-500/10 rounded-xl transition-colors"
              >
                <HeadphonesIcon size={12} />
                Raise Support Ticket
              </button>
            )
          )}

          {isHumanHandling && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <HeadphonesIcon size={12} />
              {ticketStatus === 'transferred_to_support' || ticketStatus === 'l2_escalated' || ticketStatus === 'owner_escalated'
                ? 'Support team is helping you'
                : 'Support team will contact you'}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden bg-white/5">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onSuggestion={handleSuggestion}
          dark
        />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-white/5">
        <MessageInput onSend={sendMessage} disabled={isLoading || !session} dark />
      </div>
    </div>
  )
}
