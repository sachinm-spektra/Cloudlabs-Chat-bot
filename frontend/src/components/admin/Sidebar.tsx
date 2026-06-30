import { LayoutDashboard, MessageSquare, BookOpen, AlertCircle, BarChart3, Settings, Sparkles } from 'lucide-react'
import type { AdminView } from '../../pages/AdminPage'

interface NavItem {
  id: AdminView
  label: string
  icon: React.ReactNode
  badge?: string
}

const NAV: NavItem[] = [
  { id: 'dashboard',      label: 'Dashboard',      icon: <LayoutDashboard size={16} /> },
  { id: 'ai-chat',        label: 'AI Chat',         icon: <MessageSquare size={16} />, badge: 'New' },
  { id: 'knowledge-base', label: 'Knowledge Base',  icon: <BookOpen size={16} /> },
  { id: 'tickets',        label: 'Tickets',          icon: <AlertCircle size={16} /> },
  { id: 'analytics',      label: 'Analytics',       icon: <BarChart3 size={16} /> },
  { id: 'settings',       label: 'Settings',        icon: <Settings size={16} /> },
]

interface Props {
  active: AdminView
  onNavigate: (view: AdminView) => void
}

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="w-48 bg-white border-r border-gray-100 flex flex-col shrink-0 h-screen">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">CL</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 leading-tight">CloudLabs</p>
            <p className="text-[10px] text-gray-500 leading-tight">Lab Support Agent</p>
          </div>
        </div>
      </div>

      <div className="px-3 mb-2">
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1">
          Workspace
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors group ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}>
                  {item.icon}
                </span>
                {item.label}
              </div>
              {item.badge && (
                <span className="text-[10px] bg-primary-100 text-primary-700 font-medium px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <div className="w-1 h-4 bg-primary-600 rounded-full ml-auto -mr-1" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer tip */}
      <div className="p-3 mt-auto">
        <div className="bg-primary-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={13} className="text-primary-500" />
            <span className="text-xs font-semibold text-primary-700">AI Pro Tips</span>
          </div>
          <p className="text-[11px] text-primary-600 leading-tight">
            Press <kbd className="font-mono bg-primary-100 px-1 rounded text-[10px]">/</kbd> anywhere to focus · search across labs.
          </p>
        </div>
      </div>
    </aside>
  )
}
