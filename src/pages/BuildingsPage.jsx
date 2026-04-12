import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, BarChart3, Search, Store, Wallet } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { getBuildings } from '../api'
import { useCollector } from '../context/CollectorContext'

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading]     = useState(true)
  const navigate = useNavigate()
  const { assignedBuildings } = useCollector()

  useEffect(() => {
    getBuildings(assignedBuildings).then(({ data }) => {
      setBuildings(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="🏢 Select Building" showBack={false} showReports />
      <div className="bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white px-4 pb-4 pt-1">
        <p className="text-orange-100 text-sm text-center">🙏 BGMM Ganeshotsav 2026 – Donation Collection</p>
      </div>

      <div className="px-4 py-4">
        {loading ? <Spinner text="Loading buildings…" /> : (
          <div className="space-y-2">
            {buildings.map((b) => (
              <button key={b.id} onClick={() => navigate(`/buildings/${b.id}/wings`)}
                className="w-full card flex items-center gap-4 active:scale-98 transition-transform touch-manipulation">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={24} className="text-ganesh-orange" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-800">{b.name}</p>
                  <p className="text-xs text-gray-500">Tap to view wings</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2">
          <button onClick={() => navigate('/search')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 font-semibold text-sm active:scale-95 transition-transform touch-manipulation">
            <Search size={18} /> Search Donor / Receipt
          </button>
          <button onClick={() => navigate('/special')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-semibold text-sm active:scale-95 transition-transform touch-manipulation">
            <Store size={18} /> Special Collections (Shops / VIPs)
          </button>

          <button onClick={() => navigate('/handover')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-green-400 text-green-700 font-semibold text-sm active:scale-95 transition-transform touch-manipulation">
            <Wallet size={18} /> 💰 Submit Collection to Admin
          </button>

          <button onClick={() => navigate('/reports')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-orange-300 text-ganesh-orange font-semibold text-sm active:scale-95 transition-transform touch-manipulation">
            <BarChart3 size={18} /> View Collection Report (हिशोब)
          </button>
        </div>
      </div>
    </div>
  )
}