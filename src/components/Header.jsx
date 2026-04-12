import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut, BarChart3, Settings } from 'lucide-react'
import { useCollector } from '../context/CollectorContext'
import { useLocation } from 'react-router-dom'

export default function Header({ title, showBack = true, showReports = false }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { collectorName, isAdmin, logout } = useCollector()
  const settingsPath = isAdmin ? '/admin/settings' : '/settings'

  return (
    <header className="bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white sticky top-0 z-40 shadow-lg">
      <div className="flex items-center gap-3 px-4 py-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg leading-tight truncate">{title}</h1>
          {collectorName && (
            <p className="text-xs text-orange-100 truncate">
              🙋 {collectorName}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {showReports && (
            <button
              onClick={() => navigate('/reports')}
              className="p-1.5 rounded-lg bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
              title="Reports"
            >
              <BarChart3 size={20} />
            </button>
          )}
          <button
            onClick={() => navigate(settingsPath)}
            className="p-1.5 rounded-lg bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}