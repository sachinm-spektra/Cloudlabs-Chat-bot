import { format } from 'date-fns'
import type { Message } from '../../types'
import SuggestionChips from './SuggestionChips'
import { renderMarkdown } from '../../utils/markdown'

interface Props {
  message: Message
  isFirst?: boolean
  onSuggestion?: (text: string) => void
  dark?: boolean
}

export default function MessageBubble({ message, isFirst, onSuggestion, dark }: Props) {
  const isAI = message.role === 'assistant'
  const time = format(new Date(message.created_at), 'hh:mm aa')

  return (
    <div className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}

      <div className={`max-w-[75%] ${isAI ? '' : 'items-end'} flex flex-col`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
            isAI
              ? dark
                ? 'bg-white/10 border border-white/10 text-white rounded-tl-sm'
                : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
              : 'bg-primary-600 text-white rounded-tr-sm whitespace-pre-wrap'
          }`}
        >
          {isAI ? (
            message.is_streaming ? (
              <span>
                {renderMarkdown(message.content, dark)}
                <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
              </span>
            ) : (
              renderMarkdown(message.content, dark)
            )
          ) : (
            message.content
          )}
        </div>

        {isAI && isFirst && onSuggestion && (
          <SuggestionChips onSelect={onSuggestion} dark={dark} />
        )}

        <span className={`text-[11px] mt-1 px-1 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>{time}</span>
      </div>
    </div>
  )
}
