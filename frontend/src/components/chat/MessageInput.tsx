import { useRef, useState, KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import FileUpload from './FileUpload'
import { useChatStore } from '../../store/chatStore'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  dark?: boolean
}

export default function MessageInput({ onSend, disabled, dark }: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { pendingAttachments } = useChatStore()

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed && pendingAttachments.length === 0) return
    onSend(trimmed || '(attachment)')
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled) submit()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className={dark ? '' : 'border-t border-gray-100 bg-gray-50'}>
      <div className="flex items-end gap-2 px-4 py-3">
        <FileUpload dark={dark} />

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder="Describe your lab issue or ask anything…"
          className={`flex-1 resize-none bg-transparent text-sm focus:outline-none py-1 max-h-[120px] scrollbar-thin ${
            dark ? 'text-white placeholder-slate-400' : 'text-gray-800 placeholder-gray-400'
          }`}
        />

        <button
          type="button"
          onClick={submit}
          disabled={disabled || (!text.trim() && pendingAttachments.length === 0)}
          className="w-8 h-8 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowUp size={16} className="text-white" />
        </button>
      </div>

      <p className={`text-center text-[11px] pb-2 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
        Enter to send · Shift+Enter for newline ·{' '}
        <span className={dark ? 'font-semibold text-slate-400' : 'font-semibold text-gray-500'}>Powered by CloudLabs AI</span>
      </p>
    </div>
  )
}
