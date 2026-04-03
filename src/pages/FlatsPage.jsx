import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { getFlats } from '../api'

export default function FlatsPage() {
  const { wingId } = useParams()
  const navigate   = useNavigate()

  const [flats, setFlats]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    const { data } = await getFlats(wingId)
    setFlats(data || [])
    setLoading(false)
    setRefreshing(false)
  }, [wingId])

  useEffect(() => { load() }, [load])

  // Group by floor
  const byFloor = flats.reduce((acc, flat) => {
    const f = flat.floor
    if (!acc[f]) acc[f] = []
    acc[f].push(flat)
    return acc
  }, {})

  const floors    = Object.keys(byFloor).sort((a, b) => b - a) // top floor first
  const paidCount = flats.filter(f => f.status === 'paid').length
  const total     = flats.length
  const pct       = total ? Math.round((paidCount / total) * 100) : 0

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="🏠 Flat Status" />

      {/* Progress bar */}
      <div className="bg-white border-b border-orange-100 px-4 py-3">
        <div className="flex justify-between text-sm font-medium mb-1.5">
          <span className="text-green-700 flex items-center gap-1">
            <CheckCircle2 size={14} /> {paidCount} Paid
          </span>
          <span className="text-gray-500 font-bold">{pct}%</span>
          <span className="text-red-600 flex items-center gap-1">
            <Clock size={14} /> {total - paidCount} Pending
          </span>
        </div>
        <div className="h-3 bg-red-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Legend + refresh */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-400 inline-block" /> Paid
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-300 inline-block" /> Pending
          </span>
        </div>
        <button
          onClick={() => load(true)}
          className="p-1.5 rounded-lg text-gray-500 active:text-ganesh-orange transition-colors touch-manipulation"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="px-3 pb-6">
        {loading ? (
          <Spinner text="Loading flats…" />
        ) : (
          <div className="space-y-4">
            {floors.map(floor => (
              <div key={floor}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Floor {floor}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {byFloor[floor].map(flat => (
                    <button
                      key={flat.id}
                      onClick={() => navigate(`/flats/${flat.id}/donate`)}
                      className={flat.status === 'paid' ? 'flat-paid' : 'flat-pending'}
                    >
                      <span className="block text-lg">
                        {flat.status === 'paid' ? '✅' : '❌'}
                      </span>
                      <span className="block">{flat.flat_number}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
