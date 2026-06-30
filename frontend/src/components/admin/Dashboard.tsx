import { useEffect, useState } from 'react'
import { MessageSquare, BookOpen, Loader2 } from 'lucide-react'
import KPICards from './KPICards'
import QuickActions from './QuickActions'
import RecentActivity from './RecentActivity'
import { adminApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { AdminMetrics } from '../../types'
import type { AdminView } from '../../pages/AdminPage'

export default function Dashboard({ onNavigate }: { onNavigate: (v: AdminView) => void }) {
  const { user } = useAuthStore()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getMetrics()
      .then(({ data }) => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.name.split(' ')[0] ?? 'Admin'

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome banner */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Powered by CloudLabs AI
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {firstName}.
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 max-w-lg">
              Your AI Lab Support Agent has indexed{' '}
              <strong className="text-gray-800">
                {loading ? '…' : (metrics?.knowledge_articles ?? 0).toLocaleString()} articles
              </strong>{' '}
              across{' '}
              <strong className="text-gray-800">
                {loading ? '…' : metrics?.connected_sources ?? 0} sources
              </strong>
              . Ask anything about labs, products or known issues.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-6">
            <button
              onClick={() => onNavigate('ai-chat')}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <MessageSquare size={15} />
              Ask the Agent
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
          <Loader2 size={20} className="animate-spin text-primary-500" />
        </div>
      ) : (
        <KPICards metrics={metrics ?? undefined} />
      )}

      {/* Quick actions */}
      <QuickActions onNavigate={onNavigate} />

      {/* Recent activity */}
      <RecentActivity />
    </div>
  )
}
