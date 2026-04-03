import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IndianRupee, Users, Building2, RefreshCw,
  LogOut, TrendingUp, CheckCircle2, Clock,
  Banknote, Smartphone, Download, ChevronDown, ChevronUp
} from 'lucide-react'
import { useCollector } from '../context/CollectorContext'
import supabase from '../supabase'
import { BUILDINGS, WINGS, FLATS, DONATIONS } from '../mockData'

const useMock = !import.meta.env.VITE_SUPABASE_URL

async function fetchAdminData() {
  if (useMock) {
    const buildings = BUILDINGS
    const wings     = WINGS
    const flats     = FLATS
    const donations = DONATIONS

    return buildReport(buildings, wings, flats, donations)
  }

  const [bRes, wRes, fRes, dRes] = await Promise.all([
    supabase.from('buildings').select('*').order('name'),
    supabase.from('wings').select('*'),
    supabase.from('flats').select('id, wing_id, status'),
    supabase.from('donations').select('*').order('created_at', { ascending: false }),
  ])

  return buildReport(
    bRes.data || [], wRes.data || [],
    fRes.data || [], dRes.data || []
  )
}

function buildReport(buildings, wings, flats, donations) {
  // Wing map
  const wingMap = {}
  wings.forEach(w => { wingMap[w.id] = w })

  // Per wing stats
  const wingStats = {}
  wings.forEach(w => {
    wingStats[w.id] = { wing: w, totalFlats: 0, paidFlats: 0, amount: 0, donations: [] }
  })
  flats.forEach(f => {
    if (!wingStats[f.wing_id]) return
    wingStats[f.wing_id].totalFlats++
    if (f.status === 'paid') wingStats[f.wing_id].paidFlats++
  })
  donations.forEach(d => {
    const flat = flats.find(f => f.id === d.flat_id)
    if (!flat || !wingStats[flat.wing_id]) return
    wingStats[flat.wing_id].amount += Number(d.amount)
    wingStats[flat.wing_id].donations.push(d)
  })

  // Per building stats
  const buildingStats = buildings.map(b => {
    const bWings = wings.filter(w => w.building_id === b.id)
    const bFlats = flats.filter(f => bWings.some(w => w.id === f.wing_id))
    const bDonations = donations.filter(d => bFlats.some(f => f.id === d.flat_id))
    const paidFlats  = bFlats.filter(f => f.status === 'paid').length
    const totalAmount = bDonations.reduce((s, d) => s + Number(d.amount), 0)
    return {
      building: b,
      wings: bWings.map(w => wingStats[w.id]).filter(Boolean),
      totalFlats: bFlats.length,
      paidFlats,
      pendingFlats: bFlats.length - paidFlats,
      amount: totalAmount,
      donationCount: bDonations.length,
    }
  })

  // Per collector
  const collectorMap = {}
  donations.forEach(d => {
    const k = d.collected_by || 'Unknown'
    if (!collectorMap[k]) collectorMap[k] = { name: k, count: 0, amount: 0, cash: 0, upi: 0 }
    collectorMap[k].count++
    collectorMap[k].amount += Number(d.amount)
    if (d.payment_mode === 'Cash') collectorMap[k].cash += Number(d.amount)
    else collectorMap[k].upi += Number(d.amount)
  })

  const totalAmount  = donations.reduce((s, d) => s + Number(d.amount), 0)
  const cashAmount   = donations.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
  const upiAmount    = totalAmount - cashAmount
  const totalFlats   = flats.length
  const paidFlats    = flats.filter(f => f.status === 'paid').length

  return {
    summary: { totalAmount, cashAmount, upiAmount, totalFlats, paidFlats, donationCount: donations.length },
    buildingStats,
    collectors: Object.values(collectorMap).sort((a, b) => b.amount - a.amount),
    recentDonations: donations.slice(0, 50),
  }
}

function fmt(n) { return Number(n).toLocaleString('en-IN') }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0 }

function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    orange: 'bg-orange-50 border-orange-200 text-ganesh-deep',
    green:  'bg-green-50  border-green-200  text-green-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    amber:  'bg-amber-50  border-amber-200  text-amber-700',
  }
  return (
    <div className={`rounded-2xl border-2 p-3 ${colors[color] || colors.orange}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max, color = 'bg-green-500' }) {
  const p = pct(value, max)
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
    </div>
  )
}

export default function AdminPage() {
  const { logout } = useCollector()
  const navigate   = useNavigate()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedBuilding, setExpandedBuilding] = useState(null)
  const [activeTab, setActiveTab] = useState('buildings') // buildings | collectors | donations

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    const result = await fetchAdminData()
    setData(result)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Receipt No', 'Donor Name', 'Mobile', 'Amount', 'Payment Mode', 'Transaction ID', 'Collected By', 'Date'],
      ...data.recentDonations.map(d => [
        d.receipt_no, d.donor_name, d.mobile || '',
        d.amount, d.payment_mode, d.transaction_id || '',
        d.collected_by || '', new Date(d.created_at).toLocaleDateString('en-IN')
      ])
    ]
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'ganeshotsav2026_donations.csv'; a.click()
  }

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-dvh bg-orange-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <h1 className="font-bold text-lg">🛡️ Admin Panel</h1>
            <p className="text-xs text-orange-100">Ganeshotsav 2026 – Collection Report</p>
          </div>
          <button onClick={() => load(true)} className="p-2 rounded-xl bg-white/20 touch-manipulation">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="p-2 rounded-xl bg-white/20 touch-manipulation" title="Export CSV">
            <Download size={18} />
          </button>
          <button onClick={handleLogout} className="p-2 rounded-xl bg-white/20 touch-manipulation">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-5xl animate-bounce">🙏</div>
          <p className="text-gray-500 text-sm">Loading report…</p>
        </div>
      ) : data ? (
        <div className="px-4 py-4 space-y-5 pb-10 max-w-2xl mx-auto">

          {/* Summary cards */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">💰 Overall Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<IndianRupee size={14}/>} label="Total Collected"
                value={`₹${fmt(data.summary.totalAmount)}`}
                sub={`${data.summary.donationCount} donations`} color="orange" />
              <StatCard icon={<TrendingUp size={14}/>} label="Coverage"
                value={`${pct(data.summary.paidFlats, data.summary.totalFlats)}%`}
                sub={`${data.summary.paidFlats} / ${data.summary.totalFlats} flats`} color="amber" />
              <StatCard icon={<Banknote size={14}/>} label="Cash"
                value={`₹${fmt(data.summary.cashAmount)}`} color="green" />
              <StatCard icon={<Smartphone size={14}/>} label="UPI"
                value={`₹${fmt(data.summary.upiAmount)}`} color="blue" />
            </div>
          </section>

          {/* Tab bar */}
          <div className="bg-white rounded-2xl border border-orange-100 p-1 flex gap-1">
            {[
              { id: 'buildings', label: '🏢 Buildings' },
              { id: 'collectors', label: '🏆 Collectors' },
              { id: 'donations', label: '📋 Donations' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all touch-manipulation ${
                  activeTab === t.id ? 'bg-ganesh-orange text-white shadow-sm' : 'text-gray-500'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Buildings tab */}
          {activeTab === 'buildings' && (
            <section className="space-y-3">
              {data.buildingStats
                .sort((a, b) => b.amount - a.amount)
                .map(bs => (
                <div key={bs.building.id} className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
                  {/* Building row */}
                  <button
                    className="w-full px-4 py-3 flex items-center gap-3 touch-manipulation active:bg-orange-50"
                    onClick={() => setExpandedBuilding(
                      expandedBuilding === bs.building.id ? null : bs.building.id
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-ganesh-orange" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-gray-800 truncate">{bs.building.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ProgressBar value={bs.paidFlats} max={bs.totalFlats} />
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {bs.paidFlats}/{bs.totalFlats}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-ganesh-deep text-sm">₹{fmt(bs.amount)}</p>
                      <p className="text-xs text-gray-400">{bs.donationCount} collected</p>
                    </div>
                    {expandedBuilding === bs.building.id
                      ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                      : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    }
                  </button>

                  {/* Expanded wings */}
                  {expandedBuilding === bs.building.id && (
                    <div className="border-t border-orange-100 divide-y divide-orange-50">
                      {bs.wings.map(ws => (
                        <div key={ws.wing.id} className="px-4 py-2.5 flex items-center gap-3 bg-orange-50/50">
                          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-ganesh-orange">
                            {ws.wing.name.replace('Wing ', '')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-700">{ws.wing.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <ProgressBar value={ws.paidFlats} max={ws.totalFlats} />
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {ws.paidFlats}/{ws.totalFlats}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-sm text-gray-700">₹{fmt(ws.amount)}</p>
                            <div className="flex gap-1 justify-end mt-0.5">
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-medium">
                                ✅ {ws.paidFlats}
                              </span>
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-medium">
                                ❌ {ws.totalFlats - ws.paidFlats}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Collectors tab */}
          {activeTab === 'collectors' && (
            <section className="space-y-2">
              {data.collectors.length === 0 && (
                <p className="text-center text-gray-400 py-10">No collections yet</p>
              )}
              {data.collectors.map((c, i) => (
                <div key={c.name} className="bg-white rounded-2xl border border-orange-100 p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                    i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-orange-200 text-ganesh-deep'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{c.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-md font-medium">
                        💵 ₹{fmt(c.cash)}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                        📲 ₹{fmt(c.upi)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-ganesh-deep">₹{fmt(c.amount)}</p>
                    <p className="text-xs text-gray-400">{c.count} receipts</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Donations tab */}
          {activeTab === 'donations' && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Recent Donations (last 50)
                </p>
                <button onClick={exportCSV}
                  className="flex items-center gap-1 text-xs text-ganesh-orange font-semibold touch-manipulation">
                  <Download size={13} /> Export CSV
                </button>
              </div>
              <div className="space-y-2">
                {data.recentDonations.length === 0 && (
                  <p className="text-center text-gray-400 py-10">No donations yet</p>
                )}
                {data.recentDonations.map(d => (
                  <div key={d.id} className="bg-white rounded-xl border border-orange-100 px-4 py-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-800 truncate">{d.donor_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-mono">{d.receipt_no}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-bold text-ganesh-deep">₹{fmt(d.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          d.payment_mode === 'Cash'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {d.payment_mode === 'Cash' ? '💵' : '📲'} {d.payment_mode}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                      <span>By: {d.collected_by || '—'}</span>
                      <span>{new Date(d.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-20">Could not load data</p>
      )}
    </div>
  )
}
