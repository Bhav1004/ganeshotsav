import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IndianRupee, Banknote, Smartphone, StickyNote, CheckCircle2, Clock } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { submitHandover, getMyHandovers } from '../api'
import { useCollector } from '../context/CollectorContext'

function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }

export default function HandoverPage() {
  const navigate = useNavigate()
  const { collectorName } = useCollector()

  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  const [form, setForm] = useState({ cash_amount: '', upi_amount: '', note: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const loadHistory = async () => {
    const { data } = await getMyHandovers(collectorName)
    setHistory(data || [])
    setLoading(false)
  }

  useEffect(() => { loadHistory() }, [])

  const totalCash = history.filter(h => h.status === 'confirmed').reduce((s, h) => s + Number(h.cash_amount), 0)
  const totalUPI  = history.filter(h => h.status === 'confirmed').reduce((s, h) => s + Number(h.upi_amount), 0)
  const pending   = history.filter(h => h.status === 'pending')

  const handleSubmit = async () => {
    setError('')
    const cash = Number(form.cash_amount || 0)
    const upi  = Number(form.upi_amount  || 0)
    if (cash <= 0 && upi <= 0) return setError('Enter at least one amount (Cash or UPI)')
    setSubmitting(true)
    const { error: err } = await submitHandover({
      volunteer_name: collectorName,
      cash_amount:    cash,
      upi_amount:     upi,
      note:           form.note.trim(),
    })
    setSubmitting(false)
    if (err) return setError(err.message || 'Failed to submit. Try again.')
    setForm({ cash_amount: '', upi_amount: '', note: '' })
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    loadHistory()
  }

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="💰 Submit Collection" />

      <div className="px-4 py-4 space-y-5 pb-10">

        {/* Confirmed summary */}
        {(totalCash > 0 || totalUPI > 0) && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">✅ Total Confirmed by Admin</p>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-gray-500">Cash</p>
                <p className="font-bold text-green-700 text-lg">₹{fmt(totalCash)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">UPI</p>
                <p className="font-bold text-green-700 text-lg">₹{fmt(totalUPI)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending warning */}
        {pending.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-center gap-2">
            <Clock size={18} className="text-amber-600 flex-shrink-0"/>
            <p className="text-sm text-amber-700 font-medium">
              {pending.length} submission{pending.length > 1 ? 's' : ''} pending admin confirmation
            </p>
          </div>
        )}

        {/* Submission form */}
        <div className="card space-y-4">
          <p className="font-bold text-gray-800">📤 New Submission</p>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Banknote size={15}/> Cash Amount (₹)
            </label>
            <input
              className="input-field"
              placeholder="Enter cash amount"
              type="number" inputMode="numeric" min={0}
              value={form.cash_amount}
              onChange={e => set('cash_amount', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Smartphone size={15}/> UPI Amount (₹)
            </label>
            <input
              className="input-field"
              placeholder="Enter UPI amount"
              type="number" inputMode="numeric" min={0}
              value={form.upi_amount}
              onChange={e => set('upi_amount', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <StickyNote size={15}/> Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. Submitted at office"
              value={form.note}
              onChange={e => set('note', e.target.value)}
            />
          </div>

          {/* Total preview */}
          {(Number(form.cash_amount) > 0 || Number(form.upi_amount) > 0) && (
            <div className="bg-orange-50 rounded-xl px-4 py-2.5 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600">Total submitting</span>
              <span className="font-bold text-ganesh-deep text-lg">
                ₹{fmt(Number(form.cash_amount || 0) + Number(form.upi_amount || 0))}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {error}</div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-green-700 text-sm font-semibold text-center">
              ✅ Submitted! Waiting for admin confirmation.
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '⏳ Submitting…' : '📤 Submit to Admin'}
          </button>
        </div>

        {/* History */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Submission History</p>
          {loading ? <Spinner text="Loading…"/> : history.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">No submissions yet</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="bg-white rounded-xl border border-orange-100 px-4 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-3">
                        {Number(h.cash_amount) > 0 && (
                          <span className="text-sm font-semibold text-gray-700">💵 ₹{fmt(h.cash_amount)}</span>
                        )}
                        {Number(h.upi_amount) > 0 && (
                          <span className="text-sm font-semibold text-gray-700">📲 ₹{fmt(h.upi_amount)}</span>
                        )}
                      </div>
                      {h.note && <p className="text-xs text-gray-400 mt-0.5">{h.note}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(h.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                      h.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {h.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
