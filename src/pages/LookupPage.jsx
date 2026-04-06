import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Receipt, Phone, X, ExternalLink } from 'lucide-react'
import { getDonationByReceiptNo, getDonationsByMobile } from '../api'

function fmt(n) { return Number(n).toLocaleString('en-IN') }

export default function LookupPage() {
  const navigate     = useNavigate()
  const [query, setQuery]     = useState('')
  const [mode, setMode]       = useState('mobile') // 'mobile' | 'receipt'
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setError(''); setLoading(true); setSearched(true); setResults([])

    if (mode === 'receipt') {
      const { data, error: err } = await getDonationByReceiptNo(q.toUpperCase())
      setLoading(false)
      if (err || !data) { setError('Receipt not found. Please check the number.'); return }
      setResults([data])
    } else {
      if (q.length < 10) { setLoading(false); setError('Please enter a valid 10-digit mobile number.'); return }
      const { data, error: err } = await getDonationsByMobile(q)
      setLoading(false)
      if (err) { setError('Something went wrong. Please try again.'); return }
      if (!data || data.length === 0) { setError('No donations found for this mobile number.'); return }
      setResults(data)
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white px-4 py-5 text-center">
        <div className="text-4xl mb-2">🙏</div>
        <h1 className="font-bold text-xl" style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
          Receipt Lookup
        </h1>
        <p className="text-orange-100 text-sm mt-1">बाल गोपाळ मित्र मंडळ 2026</p>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto">
        {/* Mode toggle */}
        <div className="bg-white rounded-2xl border border-orange-100 p-1 flex mb-4">
          <button onClick={() => { setMode('mobile'); setResults([]); setSearched(false); setError('') }}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
              mode === 'mobile' ? 'bg-ganesh-orange text-white shadow-sm' : 'text-gray-500'
            }`}>
            <Phone size={14}/> Mobile Number
          </button>
          <button onClick={() => { setMode('receipt'); setResults([]); setSearched(false); setError('') }}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
              mode === 'receipt' ? 'bg-ganesh-orange text-white shadow-sm' : 'text-gray-500'
            }`}>
            <Receipt size={14}/> Receipt No.
          </button>
        </div>

        {/* Input */}
        <div className="relative mb-4">
          <input
            className="input-field pr-10"
            placeholder={mode === 'mobile' ? 'Enter your 10-digit mobile number' : 'Enter receipt no. e.g. GS2026-00001'}
            type={mode === 'mobile' ? 'tel' : 'text'}
            inputMode={mode === 'mobile' ? 'numeric' : 'text'}
            maxLength={mode === 'mobile' ? 10 : 15}
            value={query}
            onChange={e => setQuery(mode === 'mobile' ? e.target.value.replace(/\D/g,'') : e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); setSearched(false); setError('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation">
              <X size={18}/>
            </button>
          )}
        </div>

        <button onClick={handleSearch} disabled={loading || !query.trim()} className="btn-primary mb-5">
          <span className="flex items-center justify-center gap-2">
            <Search size={17}/> {loading ? 'Searching…' : 'Find Receipt'}
          </span>
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center mb-4">
            😔 {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider text-center">
              {results.length} receipt{results.length > 1 ? 's' : ''} found
            </p>
            {results.map(d => (
              <div key={d.id} className="bg-white rounded-2xl border-2 border-orange-200 overflow-hidden shadow-md">
                {/* Mini receipt header */}
                <div className="bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white px-4 py-3 text-center">
                  <p className="font-bold text-lg" style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
                    श्री गणेश उत्सव मंडळ
                  </p>
                  <p className="text-orange-100 text-xs">BGMM Ganeshotsav 2026</p>
                </div>

                <div className="px-4 py-4 space-y-2.5">
                  <Row label="Receipt No."  value={d.receipt_no} mono bold />
                  <Row label="Date"         value={new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
                  <Row label="Donor Name"   value={d.donor_name} bold />
                  {d.mobile && <Row label="Mobile" value={d.mobile} />}
                  <div className="border-t border-dashed border-orange-200 pt-2.5">
                    <Row label="Amount" value={`₹ ${fmt(d.amount)}`} bold large />
                  </div>
                  <Row label="Payment Mode" value={d.payment_mode} />
                  {d.flats && (
                    <Row label="Flat"
                      value={`${d.flats.wings?.buildings?.name || ''} › ${d.flats.wings?.name || ''} › ${d.flats.flat_number}`} />
                  )}
                </div>

                <div className="bg-orange-50 border-t border-orange-100 px-4 py-3 text-center">
                  <p className="text-ganesh-deep font-bold text-sm" style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
                    🙏 गणपती बाप्पा मोरया!
                  </p>
                </div>

                {/* View full receipt */}
                <div className="px-4 pb-4 pt-2">
                  <button
                    onClick={() => navigate(`/receipt-view/${d.receipt_no}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-ganesh-orange text-ganesh-orange font-semibold text-sm touch-manipulation active:scale-95 transition-transform"
                  >
                    <ExternalLink size={15}/> View Full Receipt & Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!searched && !loading && (
          <div className="text-center py-8">
            <p className="text-5xl mb-4">🧾</p>
            <p className="text-gray-600 font-medium">Find your donation receipt</p>
            <p className="text-gray-400 text-sm mt-2">
              Search by the mobile number you gave during donation, or enter your receipt number directly.
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 pb-8">
        बाल गोपाळ मित्र मंडळ · स्था. १९८४ · BGMM Ganeshotsav 2026
      </p>
    </div>
  )
}

function Row({ label, value, bold, large, mono }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <p className="text-gray-500 text-sm flex-shrink-0">{label}</p>
      <p className={`text-right ${bold ? 'font-bold text-gray-800' : 'text-gray-700'} ${large ? 'text-xl text-ganesh-deep' : 'text-sm'} ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </p>
    </div>
  )
}