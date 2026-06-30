import { useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import Dashboard from '../components/admin/Dashboard'
import ConversationList from '../components/admin/ConversationList'
import Analytics from '../components/admin/Analytics'
import IssueExplorer from '../components/admin/IssueExplorer'
import KnowledgeBase from '../components/admin/KnowledgeBase'
import AIChat from '../components/admin/AIChat'

export type AdminView =
  | 'dashboard'
  | 'ai-chat'
  | 'knowledge-base'
  | 'tickets'
  | 'analytics'
  | 'settings'

export default function AdminPage() {
  const [activeView, setActiveView] = useState<AdminView>('dashboard')

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':      return <Dashboard onNavigate={setActiveView} />
      case 'ai-chat':        return <AIChat />
      case 'knowledge-base': return <KnowledgeBase />
      case 'tickets':        return <IssueExplorer />
      case 'analytics':      return <Analytics />
      case 'settings':       return <SettingsPlaceholder />
      default:               return <Dashboard onNavigate={setActiveView} />
    }
  }

  return (
    <AdminLayout activeView={activeView} onNavigate={setActiveView}>
      {renderView()}
    </AdminLayout>
  )
}

function SettingsPlaceholder() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <p className="text-sm">Settings coming soon</p>
    </div>
  )
}
