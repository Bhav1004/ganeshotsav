import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { getBuildings, getWings } from '../api'

export default function WingsPage() {
  const { buildingId } = useParams()
  const navigate = useNavigate()

  const [building, setBuilding] = useState(null)
  const [wings, setWings]       = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getBuildings(),
      getWings(buildingId),
    ]).then(([bRes, wRes]) => {
      const b = (bRes.data || []).find(x => x.id === buildingId)
      setBuilding(b)
      setWings(wRes.data || [])
      setLoading(false)
    })
  }, [buildingId])

  const WING_COLORS = ['bg-orange-100', 'bg-amber-100', 'bg-yellow-100']
  const WING_ICONS  = ['🅰️', '🅱️', '©️']

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title={building ? `🏢 ${building.name}` : 'Wings'} />

      <div className="px-4 py-4">
        <p className="text-gray-500 text-sm mb-4">Select a wing to view flats</p>

        {loading ? (
          <Spinner text="Loading wings…" />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {wings.map((wing, i) => (
              <button
                key={wing.id}
                onClick={() => navigate(`/wings/${wing.id}/flats`)}
                className="w-full card flex items-center gap-4 active:scale-98 transition-transform touch-manipulation"
              >
                <div className={`w-14 h-14 rounded-xl ${WING_COLORS[i % 3]} flex items-center justify-center flex-shrink-0 text-2xl`}>
                  {wing.name.replace('Wing ', '')}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-800 text-lg">{wing.name}</p>
                  <p className="text-xs text-gray-500">Tap to open flat grid</p>
                </div>
                <ChevronRight size={22} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
