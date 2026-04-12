import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, X } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { getSpecialEntries } from '../api'

const CATEGORIES = ['All', 'Shop', 'VIP', 'Bungalow']
const CAT_ICON   = { Shop: '🏪', VIP: '⭐', Bungalow: '🏠' }
const CAT_COLOR  = {
  Shop:     'bg-blue-100 text-blue-700 border-blue-300',
  VIP:      'bg-yellow-100 text-yellow-700 border-yellow-300',
  Bungalow: 'bg-purple-100 text-purple-700 border-purple-300',
}

export default function SpecialListPage() {
  const navigate = useNavigate()
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch]       = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true)
    const { data } = await getSpecialEntries()
    setEntries(data || [])
    setLoading(false); setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter(e => {
    const matchCat    = activeTab === 'All' || e.category === activeTab
    const matchSearch = !search || 
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.area || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const paidCount    = filtered.filter(e => e.status === 'paid').length
  const pendingCount = filtered.filter(e => e.status === 'pending').length
  const pct = filtered.length ? Math.round((paidCount / filtered.length) * 100) : 0

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="🏪 Special Collections"/>

      {/* Stats bar */}
      <div className="bg-white border-b border-orange-100 px-4 py-3">
        <div className="flex justify-between text-sm font-medium mb-1.5">
          <span className="text-green-700">✅ {paidCount} Paid</span>
          <span className="text-gray-500 font-bold">{pct}%</span>
          <span className="text-red-600">❌ {pendingCount} Pending</span>
        </div>
        <div className="h-2.5 bg-red-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500"
               style={{ width: `${pct}%` }}/>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            className="input-field pl-9 pr-9 py-2.5 text-sm"
            placeholder="Search by name, owner, area…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation">
              <X size={15}/>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all touch-manipulation ${
              activeTab === cat
                ? 'bg-ganesh-orange text-white border-ganesh-orange'
                : 'bg-white text-gray-600 border-gray-200'
            }`}>
            {cat === 'All' ? `All (${entries.length})` : `${CAT_ICON[cat]} ${cat}`}
          </button>
        ))}
        <button onClick={() => load(true)}
          className="flex-shrink-0 p-1.5 rounded-full bg-white border border-gray-200 text-gray-500 touch-manipulation">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/>
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-gray-400 pb-1">
        Tap ✅ paid entry to view details · Tap ❌ pending to collect
      </p>

      {/* List */}
      <div className="px-4 pb-28 space-y-2">
        {loading ? <Spinner text="Loading…"/> : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">{activeTab === 'All' ? '🏪' : CAT_ICON[activeTab]}</p>
            <p className="text-gray-500 font-medium">No entries found</p>
            {search && <p className="text-gray-400 text-sm mt-1">Try a different search</p>}
          </div>
        ) : (
          filtered.map(entry => (
            <button key={entry.id}
              onClick={() => navigate(`/special/${entry.id}`, { state: { entry } })}
              className="w-full bg-white rounded-2xl border border-orange-100 p-4 text-left active:scale-98 transition-transform touch-manipulation">
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${
                  entry.status === 'paid'    ? 'bg-green-100' :
                  entry.status === 'refused' ? 'bg-gray-100'  : 'bg-orange-100'
                }`}>
                  {entry.status === 'paid' ? '✅' : entry.status === 'refused' ? '🚫' : CAT_ICON[entry.category] || '🏪'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-800 truncate">{entry.name}</p>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLOR[entry.category]}`}>
                      {entry.category}
                    </span>
                  </div>
                  {entry.owner_name && (
                    <p className="text-sm text-gray-500 mt-0.5">👤 {entry.owner_name}</p>
                  )}
                  {entry.area && (
                    <p className="text-xs text-gray-400 mt-0.5">📍 {entry.area}</p>
                  )}
                  {entry.status === 'paid' && (
                    <p className="text-xs text-green-600 font-semibold mt-1">✅ Donation collected</p>
                  )}
                  {entry.status === 'refused' && (
                    <p className="text-xs text-gray-500 mt-1">🚫 {entry.notes || 'Refused'}</p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* FAB — Add New */}
      <div className="fixed bottom-6 left-0 right-0 px-4 max-w-md mx-auto">
        <button
          onClick={() => navigate('/special/new')}
          className="w-full bg-ganesh-orange text-white font-bold py-4 rounded-2xl shadow-xl
                     active:scale-95 transition-transform touch-manipulation flex items-center justify-center gap-2
                     shadow-orange-300">
          <Plus size={22}/> Add New Entry
        </button>
      </div>
    </div>
  )
}
