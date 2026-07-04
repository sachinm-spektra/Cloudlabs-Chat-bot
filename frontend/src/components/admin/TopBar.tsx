import { useEffect, useState } from 'react'
import { Search, Bell, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { adminApi } from '../../services/api'
import type { AdminView } from '../../pages/AdminPage'
import type { Ticket } from '../../types'
import { formatDistanceToNow } from 'date-fns'

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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])

  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Ticket[]>([])

  useEffect(() => {
    const refresh = () => {
      adminApi.getOpenTicketCount()
        .then(({ data }) => setOpenCount(data.count))
        .catch(() => {})
      adminApi.getTickets({ limit: 5 })
        .then(({ data }) => setRecentTickets(data.tickets))
        .catch(() => {})
    }
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const handle = setTimeout(() => {
      adminApi.getTickets({ limit: 200 })
        .then(({ data }) => {
          const lower = q.toLowerCase()
          setResults(
            data.tickets.filter(
              (t) =>
                (t.user_name ?? '').toLowerCase().includes(lower) ||
                (t.user_email ?? '').toLowerCase().includes(lower) ||
                (t.lab_name ?? '').toLowerCase().includes(lower) ||
                (t.deployment_id ?? '').toLowerCase().includes(lower) ||
                t.id.toLowerCase().includes(lower)
            )
          )
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  const goToTicket = () => {
    setShowResults(false)
    setQuery('')
    onNavigate?.('tickets')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0 relative">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="Search articles, issues, sources…"
          className="w-full pl-8 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400"
        />
        {!query && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded">
            ⌘K
          </kbd>
        )}

        {showResults && query.trim() && (
          <div className="absolute left-0 top-11 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {searching ? (
              <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No matching tickets</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {results.map((t) => (
                  <button
                    key={t.id}
                    onMouseDown={goToTicket}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {t.user_name ?? t.user_email ?? 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      #{t.id.slice(0, 8).toUpperCase()}
                      {t.lab_name ? ` · ${t.lab_name}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Settings */}
        <button
          onClick={() => onNavigate?.('settings')}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {/* User */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center gap-2 ml-1 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors"
            title={user?.name ?? 'Admin'}
          >
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">
                {user ? initials(user.name) : 'U'}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {user?.name.split(' ')[0] ?? 'Admin'}
            </span>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-11 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); onNavigate?.('settings') }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={14} className="text-gray-400" />
                  Settings
                </button>
                <button
                  onClick={clearAuth}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

        {/* Notifications — rightmost */}
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
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  {openCount > 0 && (
                    <span className="text-xs text-red-500 font-medium">{openCount} open</span>
                  )}
                </div>
                {recentTickets.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No recent tickets</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {recentTickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setShowNotif(false)
                          onNavigate?.('tickets')
                        }}
                        className="w-full text-left flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 truncate">
                            <span className="font-medium">{t.user_name ?? t.user_email ?? 'Unknown user'}</span>
                            {' · '}
                            <span className="text-gray-500">{t.last_message ?? `Ticket #${t.id.slice(0, 8).toUpperCase()}`}</span>
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
