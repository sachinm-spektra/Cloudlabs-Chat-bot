import { useRef } from 'react'
import { Paperclip, X, FileText, Image } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'

const ACCEPTED = '.png,.jpg,.jpeg,.bmp,.webp,.md,.doc,.docx,.pdf'
const MAX_MB = 20

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={12} />
  return <FileText size={12} />
}

export default function FileUpload({ dark }: { dark?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { pendingAttachments, addPendingAttachment, removePendingAttachment } = useChatStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) {
      if (f.size > MAX_MB * 1024 * 1024) {
        alert(`${f.name} exceeds the ${MAX_MB} MB limit.`)
        continue
      }
      addPendingAttachment(f)
    }
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`p-1.5 transition-colors rounded-lg ${dark ? 'text-slate-400 hover:text-primary-400 hover:bg-white/10' : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'}`}
        title="Attach file (screenshot, PDF, doc)"
      >
        <Paperclip size={17} />
      </button>

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {pendingAttachments.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1 bg-primary-50 border border-primary-200 rounded-lg px-2 py-1 text-xs text-primary-700"
            >
              {fileIcon(f.type)}
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removePendingAttachment(i)}
                className="text-primary-400 hover:text-primary-600 ml-0.5"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
