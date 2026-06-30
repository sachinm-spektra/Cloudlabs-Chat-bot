import Sidebar from './Sidebar'
import TopBar from './TopBar'
import type { AdminView } from '../../pages/AdminPage'

interface Props {
  activeView: AdminView
  onNavigate: (view: AdminView) => void
  children: React.ReactNode
}

export default function AdminLayout({ activeView, onNavigate, children }: Props) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active={activeView} onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
