import { useState } from 'react'
import AdminLayout from '../components/admin/AdminLayout'
import Dashboard from '../components/admin/Dashboard'
import Analytics from '../components/admin/Analytics'
import IssueExplorer from '../components/admin/IssueExplorer'
import KnowledgeBase from '../components/admin/KnowledgeBase'
import AIChat from '../components/admin/AIChat'
import SettingsPage from '../components/admin/Settings'

export type AdminView =
  | 'dashboard'
  | 'ai-chat'
  | 'knowledge-base'
  | 'tickets'
  | 'analytics'
  | 'settings'

export default function AdminPage() {
  const [activeView, setActiveView] = useState<AdminView>('dashboard')
  const [focusTicketId, setFocusTicketId] = useState<string | null>(null)

  const openTicket = (ticketId: string) => {
    setFocusTicketId(ticketId)
    setActiveView('tickets')
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':      return <Dashboard onNavigate={setActiveView} onOpenTicket={openTicket} />
      case 'ai-chat':        return <AIChat />
      case 'knowledge-base': return <KnowledgeBase />
      case 'tickets':        return (
        <IssueExplorer
          focusTicketId={focusTicketId}
          onFocusHandled={() => setFocusTicketId(null)}
        />
      )
      case 'analytics':      return <Analytics />
      case 'settings':       return <SettingsPage />
      default:               return <Dashboard onNavigate={setActiveView} onOpenTicket={openTicket} />
    }
  }

  return (
    <AdminLayout activeView={activeView} onNavigate={setActiveView}>
      {renderView()}
    </AdminLayout>
  )
}
