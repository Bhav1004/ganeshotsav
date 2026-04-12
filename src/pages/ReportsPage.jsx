import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, Users, CheckCircle2, Clock,
  Banknote, Smartphone, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { getReportData, getMyDailyCollection } from '../api'
import { useCollector } from '../context/CollectorContext'

function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0 }

function StatCard({ icon, label, value, sub, color = 'orange' }) {
  const colors = {
    orange: 'bg-orange-50 border-orange-200 text-ganesh-deep',
    green:  'bg-green-50  border-green-200  text-green-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    amber:  'bg-amber-50  border-amber-200  text-amber-700',
  }
  return (
    <div className={`rounded-2xl border-2 p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// Group donations by date
function groupByDate(donations) {
  const map = {}
  donations.forEach(d => {
    const date = new Date(d.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', weekday: 'short'
    })
    if (!map[date]) map[date] = []
    map[date].push(d)
  })
  // Sort dates descending
  return Object.entries(map).sort((a, b) =>
    new Date(b[1][0].created_at) - new Date(a[1][0].created_at)
  )
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const { collectorName } = useCollector()

  const [data, setData]         = useState(null)
  const [myDonations, setMyDonations] = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')
  const [expandedDate, setExpandedDate] = useState(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true)
    const [rep, mine] = await Promise.all([
      getReportData(),
      getMyDailyCollection(collectorName),
    ])
    setData(rep.data)
    setMyDonations(mine.data || [])
    setLoading(false); setRefreshing(false)
  }, [collectorName])

  useEffect(() => { load() }, [load])

  const myTotal     = myDonations.reduce((s, d) => s + Number(d.amount), 0)
  const myCash      = myDonations.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
  const myUPI       = myDonations.filter(d => d.payment_mode === 'UPI').reduce((s, d) => s + Number(d.amount), 0)
  const dailyGroups = groupByDate(myDonations)

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="📊 Reports"/>

      {/* Tabs */}
      <div className="bg-white border-b border-orange-100 px-4 py-2 flex gap-2">
        {[
          { id: 'summary', label: '📊 Summary' },
          { id: 'daily',   label: '📅 My Daily' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation ${
              activeTab === t.id ? 'bg-ganesh-orange text-white' : 'text-gray-500 bg-gray-100'
            }`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => load(true)}
          className="ml-auto p-2 rounded-xl text-gray-500 touch-manipulation">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/>
        </button>
      </div>

      <div className="px-4 py-4 space-y-5 pb-10">
        {loading ? <Spinner text="Loading…"/> : (
          <>
            {/* ── Summary Tab ── */}
            {activeTab === 'summary' && data && (
              <>
                <section>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">💰 Overall</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={<IndianRupee size={14}/>} label="Total Collected"
                      value={`₹${fmt(data.totalAmount)}`}
                      sub={`${data.totalDonations} donations`} color="orange"/>
                    <StatCard icon={<Users size={14}/>} label="Coverage"
                      value={`${pct(data.paidFlats, data.totalFlats)}%`}
                      sub={`${data.paidFlats}/${data.totalFlats} flats`} color="amber"/>
                    <StatCard icon={<Banknote size={14}/>} label="Cash"
                      value={`₹${fmt(data.cashTotal)}`} color="green"/>
                    <StatCard icon={<Smartphone size={14}/>} label="UPI"
                      value={`₹${fmt(data.upiTotal)}`} color="blue"/>
                  </div>
                </section>

                {/* Flat progress */}
                <section>
                  <div className="card">
                    <div className="flex justify-between text-sm font-semibold mb-2">
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={14}/> {data.paidFlats} Paid
                      </span>
                      <span className="font-bold text-gray-700">
                        {pct(data.paidFlats, data.totalFlats)}% done
                      </span>
                      <span className="text-red-500 flex items-center gap-1">
                        <Clock size={14}/> {data.pendingFlats} Pending
                      </span>
                    </div>
                    <div className="h-4 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-700"
                           style={{ width: `${pct(data.paidFlats, data.totalFlats)}%` }}/>
                    </div>
                    {data.refusedFlats > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 text-center">
                        🚫 {data.refusedFlats} refused
                      </p>
                    )}
                  </div>
                </section>

                {/* Collector leaderboard */}
                {data.byCollector.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">🏆 Collectors</h2>
                    <div className="space-y-2">
                      {data.byCollector.sort((a, b) => b.amount - a.amount).map((c, i) => (
                        <div key={c.name} className="card flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${
                            i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-orange-200 text-ganesh-deep'
                          }`}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.count} donations</p>
                          </div>
                          <p className="font-bold text-ganesh-deep text-sm">₹{fmt(c.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* ── Daily Tab ── */}
            {activeTab === 'daily' && (
              <>
                {/* My totals */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl border border-orange-100 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Total</p>
                    <p className="font-bold text-ganesh-deep text-base">₹{fmt(myTotal)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-green-100 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">💵 Cash</p>
                    <p className="font-bold text-green-700 text-base">₹{fmt(myCash)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-blue-100 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">📲 UPI</p>
                    <p className="font-bold text-blue-700 text-base">₹{fmt(myUPI)}</p>
                  </div>
                </div>

                {dailyGroups.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-4xl mb-3">📅</p>
                    <p className="text-gray-500 font-medium">No collections yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dailyGroups.map(([date, donations]) => {
                      const dayTotal = donations.reduce((s, d) => s + Number(d.amount), 0)
                      const dayCash  = donations.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
                      const dayUPI   = donations.filter(d => d.payment_mode === 'UPI').reduce((s, d) => s + Number(d.amount), 0)
                      const isExpanded = expandedDate === date

                      return (
                        <div key={date} className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
                          {/* Day header */}
                          <button
                            className="w-full px-4 py-3 flex items-center justify-between touch-manipulation active:bg-orange-50"
                            onClick={() => setExpandedDate(isExpanded ? null : date)}
                          >
                            <div className="text-left">
                              <p className="font-bold text-gray-800 text-sm">{date}</p>
                              <div className="flex gap-2 mt-0.5">
                                {dayCash > 0 && <span className="text-xs text-green-600">💵 ₹{fmt(dayCash)}</span>}
                                {dayUPI  > 0 && <span className="text-xs text-blue-600">📲 ₹{fmt(dayUPI)}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <p className="font-bold text-ganesh-deep">₹{fmt(dayTotal)}</p>
                                <p className="text-xs text-gray-400">{donations.length} donations</p>
                              </div>
                              {isExpanded
                                ? <ChevronUp size={16} className="text-gray-400"/>
                                : <ChevronDown size={16} className="text-gray-400"/>}
                            </div>
                          </button>

                          {/* Day donations list */}
                          {isExpanded && (
                            <div className="divide-y divide-gray-50 border-t border-orange-100">
                              {donations.map(d => {
                                const location =
                                  d.special_entries?.name ||
                                  [
                                    d.flats?.wings?.buildings?.name,
                                    d.flats?.wings?.name,
                                    d.flats?.flat_number,
                                  ].filter(Boolean).join(' › ')
                                return (
                                  <div key={d.id} className="px-4 py-2.5 flex items-center gap-3 bg-orange-50/30">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 truncate">{d.donor_name}</p>
                                      {location && <p className="text-xs text-gray-400 truncate">📍 {location}</p>}
                                      <p className="text-[10px] text-gray-400 font-mono">{d.receipt_no}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="font-bold text-ganesh-deep text-sm">₹{fmt(d.amount)}</p>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        d.payment_mode === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                      }`}>{d.payment_mode}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}