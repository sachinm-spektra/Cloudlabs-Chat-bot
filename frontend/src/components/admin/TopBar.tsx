import { useEffect, useState } from 'react'
import { Search, Bell, Settings, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { adminApi } from '../../services/api'
import type { AdminView } from '../../pages/AdminPage'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface Props {
  onNavigate?: (view: AdminView) => void
}

export default function TopBar({ onNavigate }: Props) {
  const { user, clearAuth } = useAuthStore()
  const [openCount, setOpenCount] = useState(0)
  const [showNotif, setShowNotif] = useState(false)

  useEffect(() => {
    adminApi.getOpenTicketCount()
      .then(({ data }) => setOpenCount(data.count))
      .catch(() => {})

    const interval = setInterval(() => {
      adminApi.getOpenTicketCount()
        .then(({ data }) => setOpenCount(data.count))
        .catch(() => {})
    }, 30_000)

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0 relative">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles, issues, sources…"
            className="w-full pl-8 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotif((v) => !v)}
            className="relative w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <Bell size={16} />
            {openCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {openCount > 99 ? '99+' : openCount}
              </span>
            )}
          </button>

          {showNotif && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotif(false)} />
              <div className="absolute right-0 top-10 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                </div>
                <div className="px-4 py-3">
                  {openCount === 0 ? (
                    <p className="text-sm text-gray-500">No open tickets</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{openCount}</span> open {openCount === 1 ? 'ticket' : 'tickets'} need attention
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => onNavigate?.('settings')}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {/* User */}
        <button
          onClick={clearAuth}
          className="flex items-center gap-2 ml-1 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors"
          title="Sign out"
        >
          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">
              {user ? initials(user.name) : 'U'}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {user?.name.split(' ')[0] ?? 'Admin'}
          </span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>
      </div>
    </header>
  )
}
