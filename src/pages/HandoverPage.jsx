import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Banknote, Smartphone, StickyNote, TrendingUp } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { submitHandover, getMyHandovers, getMyDailyCollection } from '../api'
import { useCollector } from '../context/CollectorContext'

function fmt(n) { return Number(n || 0).toLocaleString('en-IN') }

function BalanceRow({ label, cash, upi, bold, highlight }) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'border-t border-dashed border-gray-200 mt-1 pt-3' : ''}`}>
      <p className={`text-sm ${highlight ? 'font-bold text-ganesh-deep' : 'text-gray-600'}`}>{label}</p>
      <div className="flex gap-4 text-right">
        <div className="min-w-[70px]">
          <p className={`text-sm ${bold ? 'font-bold text-green-700' : 'text-gray-700'}`}>
            {cash > 0 || bold ? `₹${fmt(cash)}` : '—'}
          </p>
        </div>
        <div className="min-w-[70px]">
          <p className={`text-sm ${bold ? 'font-bold text-blue-700' : 'text-gray-700'}`}>
            {upi > 0 || bold ? `₹${fmt(upi)}` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function HandoverPage() {
  const { collectorName } = useCollector()

  const [handovers, setHandovers]   = useState([])
  const [donations, setDonations]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [activeTab, setActiveTab]   = useState('balance')

  const [form, setForm] = useState({ cash_amount: '', upi_amount: '', note: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true)
    const [hRes, dRes] = await Promise.all([
      getMyHandovers(collectorName),
      getMyDailyCollection(collectorName),
    ])
    setHandovers(hRes.data || [])
    setDonations(dRes.data || [])
    setLoading(false)
    setRefreshing(false)
  }, [collectorName])

  useEffect(() => { load() }, [load])

  // ── Calculated balances ────────────────────────────────────────────────────
  const cashCollected = donations.filter(d => d.payment_mode === 'Cash').reduce((s, d) => s + Number(d.amount), 0)
  const upiCollected  = donations.filter(d => d.payment_mode === 'UPI').reduce((s, d) => s + Number(d.amount), 0)

  const confirmed     = handovers.filter(h => h.status === 'confirmed')
  const cashSubmitted = confirmed.reduce((s, h) => s + Number(h.cash_amount), 0)
  const upiSubmitted  = confirmed.reduce((s, h) => s + Number(h.upi_amount),  0)

  const cashPending   = cashCollected - cashSubmitted
  const upiPending    = upiCollected  - upiSubmitted

  const pendingHandovers = handovers.filter(h => h.status === 'pending')

  // ── Date-wise donations ────────────────────────────────────────────────────
  const byDate = donations.reduce((acc, d) => {
    const date = new Date(d.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', weekday: 'short'
    })
    if (!acc[date]) acc[date] = { cash: 0, upi: 0, count: 0 }
    if (d.payment_mode === 'Cash') acc[date].cash += Number(d.amount)
    else acc[date].upi += Number(d.amount)
    acc[date].count++
    return acc
  }, {})

  const dateRows = Object.entries(byDate).sort((a, b) =>
    new Date(b[1]?.firstDate || 0) - new Date(a[1]?.firstDate || 0)
  )

  const handleSubmit = async () => {
    setError('')
    const cash = Number(form.cash_amount || 0)
    const upi  = Number(form.upi_amount  || 0)
    if (cash <= 0 && upi <= 0) return setError('Enter at least one amount')
    if (cash > cashPending) return setError(`Cash pending is only ₹${fmt(cashPending)}`)
    if (upi  > upiPending)  return setError(`UPI pending is only ₹${fmt(upiPending)}`)
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
    load(true)
  }

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="💰 My Collection"/>

      {/* Tabs */}
      <div className="bg-white border-b border-orange-100 px-4 py-2 flex gap-2">
        {[
          { id: 'balance', label: '📊 Balance' },
          { id: 'submit',  label: '📤 Submit'  },
          { id: 'history', label: '🕐 History' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation ${
              activeTab === t.id ? 'bg-ganesh-orange text-white' : 'text-gray-500 bg-gray-100'
            }`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => load(true)}
          className="ml-auto p-2 rounded-xl text-gray-400 touch-manipulation">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-10">
        {loading ? <Spinner text="Loading…"/> : (
          <>
            {/* ── Balance Tab ── */}
            {activeTab === 'balance' && (
              <>
                {/* Balance card */}
                <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden shadow-sm">
                  {/* Header row */}
                  <div className="bg-orange-50 border-b border-orange-100 px-4 py-2.5 flex justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Overview</p>
                    <div className="flex gap-4">
                      <p className="text-xs font-bold text-green-700 w-[70px] text-right">💵 Cash</p>
                      <p className="text-xs font-bold text-blue-700  w-[70px] text-right">📲 UPI</p>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-0.5">
                    <BalanceRow label="Total Collected"
                      cash={cashCollected} upi={upiCollected}/>
                    <BalanceRow label="Submitted to Admin"
                      cash={cashSubmitted} upi={upiSubmitted}/>
                    <BalanceRow label="⚠️ Pending with me"
                      cash={cashPending} upi={upiPending} bold highlight/>
                  </div>
                </div>

                {/* Pending handover warning */}
                {pendingHandovers.length > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
                    <p className="text-sm font-bold text-amber-700 mb-1">
                      ⏳ {pendingHandovers.length} submission{pendingHandovers.length > 1 ? 's' : ''} awaiting admin confirmation
                    </p>
                    {pendingHandovers.map(h => (
                      <div key={h.id} className="flex justify-between text-xs text-amber-600 mt-1">
                        <span>{new Date(h.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
                        <span>💵 ₹{fmt(h.cash_amount)} + 📲 ₹{fmt(h.upi_amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Date-wise breakdown */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    📅 Day-wise Collection
                  </p>

                  {dateRows.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-6">No collections yet</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex justify-between px-4 text-xs font-semibold text-gray-400">
                        <span>Date</span>
                        <div className="flex gap-3">
                          <span className="w-16 text-right text-green-600">Cash</span>
                          <span className="w-16 text-right text-blue-600">UPI</span>
                          <span className="w-16 text-right text-gray-600">Total</span>
                        </div>
                      </div>
                      {dateRows.map(([date, vals]) => (
                        <div key={date}
                          className="bg-white rounded-xl border border-orange-100 px-4 py-3 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{date}</p>
                            <p className="text-xs text-gray-400">{vals.count} donation{vals.count > 1 ? 's' : ''}</p>
                          </div>
                          <div className="flex gap-3">
                            <p className="text-sm font-semibold text-green-700 w-16 text-right">
                              {vals.cash > 0 ? `₹${fmt(vals.cash)}` : '—'}
                            </p>
                            <p className="text-sm font-semibold text-blue-700 w-16 text-right">
                              {vals.upi > 0 ? `₹${fmt(vals.upi)}` : '—'}
                            </p>
                            <p className="text-sm font-bold text-ganesh-deep w-16 text-right">
                              ₹{fmt(vals.cash + vals.upi)}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Total row */}
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-700">Grand Total</p>
                        <div className="flex gap-3">
                          <p className="text-sm font-bold text-green-700 w-16 text-right">₹{fmt(cashCollected)}</p>
                          <p className="text-sm font-bold text-blue-700  w-16 text-right">₹{fmt(upiCollected)}</p>
                          <p className="text-sm font-bold text-ganesh-deep w-16 text-right">₹{fmt(cashCollected + upiCollected)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Submit Tab ── */}
            {activeTab === 'submit' && (
              <div className="space-y-4">
                {/* Current pending summary */}
                <div className="bg-white rounded-2xl border border-orange-100 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Pending with you</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">💵 Cash</p>
                      <p className="font-bold text-green-700 text-xl">₹{fmt(cashPending)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">📲 UPI</p>
                      <p className="font-bold text-blue-700 text-xl">₹{fmt(upiPending)}</p>
                    </div>
                  </div>
                </div>

                {cashPending <= 0 && upiPending <= 0 ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="font-bold text-green-700">All submitted!</p>
                    <p className="text-gray-400 text-sm mt-1">Nothing pending with you.</p>
                  </div>
                ) : (
                  <div className="card space-y-4">
                    <p className="font-bold text-gray-800">📤 New Submission</p>

                    {cashPending > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Banknote size={15}/> Cash Amount</span>
                          <span className="text-xs text-gray-400 font-normal">max ₹{fmt(cashPending)}</span>
                        </label>
                        <input className="input-field"
                          placeholder={`Enter cash (up to ₹${fmt(cashPending)})`}
                          type="number" inputMode="numeric" min={0} max={cashPending}
                          value={form.cash_amount}
                          onChange={e => set('cash_amount', e.target.value)}/>
                        <button onClick={() => set('cash_amount', String(cashPending))}
                          className="text-xs text-ganesh-orange font-semibold mt-1 touch-manipulation">
                          Submit full cash (₹{fmt(cashPending)})
                        </button>
                      </div>
                    )}

                    {upiPending > 0 && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Smartphone size={15}/> UPI Amount</span>
                          <span className="text-xs text-gray-400 font-normal">max ₹{fmt(upiPending)}</span>
                        </label>
                        <input className="input-field"
                          placeholder={`Enter UPI (up to ₹${fmt(upiPending)})`}
                          type="number" inputMode="numeric" min={0} max={upiPending}
                          value={form.upi_amount}
                          onChange={e => set('upi_amount', e.target.value)}/>
                        <button onClick={() => set('upi_amount', String(upiPending))}
                          className="text-xs text-ganesh-orange font-semibold mt-1 touch-manipulation">
                          Submit full UPI (₹{fmt(upiPending)})
                        </button>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <StickyNote size={15}/> Note <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input className="input-field"
                        placeholder="e.g. Submitted at office, Day 3"
                        value={form.note}
                        onChange={e => set('note', e.target.value)}/>
                    </div>

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
                )}
              </div>
            )}

            {/* ── History Tab ── */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Submission History
                </p>
                {handovers.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No submissions yet</p>
                ) : (
                  handovers.map(h => (
                    <div key={h.id} className="bg-white rounded-xl border border-orange-100 px-4 py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex gap-3 flex-wrap">
                            {Number(h.cash_amount) > 0 && (
                              <span className="text-sm font-semibold text-green-700">💵 ₹{fmt(h.cash_amount)}</span>
                            )}
                            {Number(h.upi_amount) > 0 && (
                              <span className="text-sm font-semibold text-blue-700">📲 ₹{fmt(h.upi_amount)}</span>
                            )}
                          </div>
                          {h.note && <p className="text-xs text-gray-400 mt-0.5">{h.note}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(h.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                          {h.status === 'confirmed' && h.confirmed_at && (
                            <p className="text-xs text-green-600 mt-0.5">
                              ✅ Confirmed {new Date(h.confirmed_at).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ml-2 ${
                          h.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {h.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}