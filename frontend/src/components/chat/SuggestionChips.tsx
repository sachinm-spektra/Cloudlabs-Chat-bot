const SUGGESTIONS = [
  "Lab won't launch",
  'VM not accessible',
  'Lab guide issue',
  'Need more time for lab',
]

export default function SuggestionChips({
  onSelect,
  dark,
}: {
  onSelect: (text: string) => void
  dark?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${
            dark
              ? 'border-white/20 text-slate-300 hover:bg-white/10 hover:text-white'
              : 'border-primary-300 text-primary-700 bg-white hover:bg-primary-50'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
