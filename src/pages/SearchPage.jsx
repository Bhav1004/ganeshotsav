import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Receipt, Phone, User } from 'lucide-react'
import Header from '../components/Header'
import { searchDonations } from '../api'

function fmt(n) { return Number(n).toLocaleString('en-IN') }

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return }
    setLoading(true); setSearched(true)
    const { data } = await searchDonations(q)
    setResults(data || [])
    setLoading(false)
  }, [])

  const handleChange = (val) => {
    setQuery(val)
    // Debounce
    clearTimeout(window._searchTimer)
    window._searchTimer = setTimeout(() => doSearch(val), 400)
  }

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="🔍 Search" />

      <div className="px-4 pt-4 pb-6">
        {/* Search input */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            className="input-field pl-10 pr-10"
            placeholder="Donor name, mobile, or receipt no…"
            value={query}
            onChange={e => handleChange(e.target.value)}
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation">
              <X size={18}/>
            </button>
          )}
        </div>

        {/* States */}
        {!searched && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">Search by</p>
            <div className="flex justify-center gap-3 mt-3">
              {[['👤','Donor Name'], ['📱','Mobile No.'], ['🧾','Receipt No.']].map(([icon, label]) => (
                <div key={label} className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-center">
                  <p className="text-xl">{icon}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="text-3xl animate-bounce">🔍</div>
            <p className="text-gray-400 text-sm mt-2">Searching…</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">😔</p>
            <p className="text-gray-500 font-medium">No results found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different name, number, or receipt</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              {results.length} result{results.length > 1 ? 's' : ''} found
            </p>
            {results.map(d => (
              <button key={d.id}
                onClick={() => navigate(`/receipt/${d.receipt_no}`)}
                className="w-full bg-white rounded-2xl border border-orange-100 p-4 text-left active:scale-98 transition-transform touch-manipulation">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 flex items-center gap-1.5">
                      <User size={13} className="text-ganesh-orange flex-shrink-0"/>
                      {d.donor_name}
                    </p>
                    {d.mobile && (
                      <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Phone size={12}/> {d.mobile}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Receipt size={11}/> {d.receipt_no}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-bold text-ganesh-deep">₹{fmt(d.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      d.payment_mode === 'Cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>{d.payment_mode}</span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
                {d.flats && (
                  <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                    📍 {d.flats.wings?.buildings?.name} › {d.flats.wings?.name} › Flat {d.flats.flat_number}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
