import { useState } from 'react'
import { LayoutDashboard, MessageSquare, BookOpen, AlertCircle, BarChart3, Settings, LogOut } from 'lucide-react'
import type { AdminView } from '../../pages/AdminPage'
import { useAuthStore } from '../../store/authStore'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

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
  const { user, clearAuth } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)

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

      {/* Logged-in user */}
      <div className="p-3 mt-auto relative">
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute left-3 right-3 bottom-[4.25rem] bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { setShowMenu(false); onNavigate('settings') }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings size={14} className="text-gray-400" />
                Settings
              </button>
              <button
                onClick={clearAuth}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="w-full flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl p-2.5 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{user ? initials(user.name) : 'U'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email ?? ''}</p>
          </div>
        </button>
      </div>
    </aside>
  )
}
