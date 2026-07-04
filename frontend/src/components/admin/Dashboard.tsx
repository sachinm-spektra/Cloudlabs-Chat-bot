import { useEffect, useRef, useState } from 'react'
import { MessageSquare, BookOpen } from 'lucide-react'
import KPICards from './KPICards'
import QuickActions from './QuickActions'
import RecentActivity from './RecentActivity'
import OrbitLoader from '../OrbitLoader'
import HeroOrb from '../HeroOrb'
import { adminApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { AdminMetrics } from '../../types'
import type { AdminView } from '../../pages/AdminPage'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface Props {
  onNavigate: (v: AdminView) => void
  onOpenTicket: (ticketId: string) => void
}

export default function Dashboard({ onNavigate, onOpenTicket }: Props) {
  const { user } = useAuthStore()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    adminApi.getMetrics()
      .then(({ data }) => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.name.split(' ')[0] ?? 'Admin'

  const handleBannerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = bannerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setTilt({ x: x * 6, y: -y * 6 })
  }

  const handleBannerMouseLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome banner */}
      <div
        ref={bannerRef}
        onMouseMove={handleBannerMouseMove}
        onMouseLeave={handleBannerMouseLeave}
        className="relative bg-white rounded-2xl border border-gray-100 p-6 overflow-hidden min-h-[170px]"
      >
        {/* very subtle flowing dotted grid backdrop */}
        <div
          className="absolute inset-0 pointer-events-none animate-grid-flow"
          style={{
            backgroundImage: 'radial-gradient(circle, #6B3FE4 1px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            opacity: 0.06,
          }}
        />

        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-6 h-full">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Powered by CloudLabs AI
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {getGreeting()}, {firstName}.
              {loading && <OrbitLoader size={26} />}
            </h1>
          </div>

          <HeroOrb size={100} tiltX={tilt.x} tiltY={tilt.y} />

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => onNavigate('ai-chat')}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <MessageSquare size={15} />
              AI Chat
            </button>
            <button
              onClick={() => onNavigate('knowledge-base')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              <BookOpen size={15} />
              Knowledge Base
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="flex items-center justify-center h-28">
          <OrbitLoader size={48} label="Loading your workspace…" />
        </div>
      ) : (
        <KPICards metrics={metrics ?? undefined} />
      )}

      {/* Quick actions */}
      <QuickActions onNavigate={onNavigate} />

      {/* Recent activity */}
      <RecentActivity onNavigate={onNavigate} onOpenTicket={onOpenTicket} />
    </div>
  )
}
