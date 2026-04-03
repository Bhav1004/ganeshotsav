import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, Users, CheckCircle2, Clock,
  Banknote, Smartphone, RefreshCw, Trophy
} from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { getReportData } from '../api'

function StatCard({ icon, label, value, sub, color = 'orange' }) {
  const colors = {
    orange: 'bg-orange-50 border-orange-200 text-ganesh-deep',
    green:  'bg-green-50  border-green-200  text-green-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    red:    'bg-red-50    border-red-200    text-red-700',
    amber:  'bg-amber-50  border-amber-200  text-amber-700',
  }
  return (
    <div className={`rounded-2xl border-2 p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    const { data: d } = await getReportData()
    setData(d)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const pct = data ? Math.round((data.paidFlats / data.totalFlats) * 100) : 0

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="📊 हिशोब (Reports)" />

      <div className="px-4 py-4 space-y-5 pb-10">

        {/* Refresh */}
        <div className="flex justify-end">
          <button
            onClick={() => load(true)}
            className="flex items-center gap-1.5 text-sm text-ganesh-orange font-semibold active:opacity-70 touch-manipulation"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <Spinner text="Loading report…" />
        ) : data ? (
          <>
            {/* Summary grid */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                💰 Collection Summary
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<IndianRupee size={16} />}
                  label="Total Collected"
                  value={`₹${Number(data.totalAmount).toLocaleString('en-IN')}`}
                  sub={`${data.totalDonations} donations`}
                  color="orange"
                />
                <StatCard
                  icon={<Users size={16} />}
                  label="Donors"
                  value={data.totalDonations}
                  sub="receipts generated"
                  color="amber"
                />
                <StatCard
                  icon={<Banknote size={16} />}
                  label="Cash"
                  value={`₹${Number(data.cashTotal).toLocaleString('en-IN')}`}
                  color="green"
                />
                <StatCard
                  icon={<Smartphone size={16} />}
                  label="UPI"
                  value={`₹${Number(data.upiTotal).toLocaleString('en-IN')}`}
                  color="blue"
                />
              </div>
            </section>

            {/* Flat progress */}
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                🏠 Flat Coverage
              </h2>
              <div className="card">
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={14} /> {data.paidFlats} Paid
                  </span>
                  <span className="font-bold text-gray-700">{pct}% done</span>
                  <span className="text-red-500 flex items-center gap-1">
                    <Clock size={14} /> {data.pendingFlats} Pending
                  </span>
                </div>
                <div className="h-5 bg-red-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                    style={{ width: `${pct}%` }}
                  >
                    {pct > 15 && (
                      <span className="text-white text-xs font-bold">{pct}%</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>{data.totalFlats} total flats</span>
                </div>
              </div>
            </section>

            {/* Collector leaderboard */}
            {data.byCollector.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                  🏆 Collector-wise Total
                </h2>
                <div className="space-y-2">
                  {data.byCollector
                    .sort((a, b) => b.amount - a.amount)
                    .map((c, i) => (
                      <div key={c.name} className="card flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${
                          i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.count} donations</p>
                        </div>
                        <p className="font-bold text-ganesh-deep text-sm">
                          ₹{Number(c.amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {data.totalDonations === 0 && (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">🙏</p>
                <p className="text-gray-500 font-medium">No donations yet.</p>
                <p className="text-gray-400 text-sm mt-1">Start collecting to see reports here.</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-500 py-10">Could not load report data.</p>
        )}
      </div>
    </div>
  )
}
