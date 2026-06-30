import { ArrowUpRight, MessageSquare, AlertCircle, BookOpen, BarChart3 } from 'lucide-react'
import type { AdminView } from '../../pages/AdminPage'

interface Action {
  id: AdminView
  label: string
  desc: string
  icon: React.ReactNode
  color: string
}

const ACTIONS: Action[] = [
  {
    id: 'ai-chat',
    label: 'Ask the AI Agent',
    desc: 'Get instant answers grounded in your lab knowledge.',
    icon: <MessageSquare size={20} className="text-white" />,
    color: 'bg-primary-500',
  },
  {
    id: 'tickets',
    label: 'Tickets',
    desc: 'Search and manage support tickets by user or status.',
    icon: <AlertCircle size={20} className="text-white" />,
    color: 'bg-cyan-500',
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    desc: 'Inspect connected sources and sync status.',
    icon: <BookOpen size={20} className="text-white" />,
    color: 'bg-emerald-500',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    desc: 'See trends across queries and resolutions.',
    icon: <BarChart3 size={20} className="text-white" />,
    color: 'bg-orange-400',
  },
]

export default function QuickActions({ onNavigate }: { onNavigate: (v: AdminView) => void }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick actions</h3>
      <div className="grid grid-cols-4 gap-4">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => onNavigate(a.id)}
            className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:border-primary-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center`}>
                {a.icon}
              </div>
              <ArrowUpRight
                size={14}
                className="text-gray-300 group-hover:text-primary-500 transition-colors"
              />
            </div>
            <p className="text-sm font-semibold text-gray-900">{a.label}</p>
            <p className="text-xs text-gray-500 mt-1 leading-snug">{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
