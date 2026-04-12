import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Store, User, Tag, MapPin, IndianRupee, CreditCard, Hash, Ban } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import UpiQR from '../components/UpiQR'
import {
  addSpecialEntry, submitSpecialDonation,
  refuseSpecialEntry, getSpecialDonationByEntryId,
} from '../api'
import { useCollector } from '../context/CollectorContext'

const CATEGORIES     = ['Shop', 'VIP', 'Bungalow']
const CAT_ICON       = { Shop: '🏪', VIP: '⭐', Bungalow: '🏠' }
const CAT_BG         = { Shop: 'bg-blue-500', VIP: 'bg-yellow-500', Bungalow: 'bg-purple-500' }
const PRESET_AMOUNTS = [101, 201, 501, 1001, 2001, 5001, 11000, 21000]

function Row({ label, value, bold, mono, highlight }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <p className="text-gray-500 text-sm flex-shrink-0">{label}</p>
      <p className={`text-right text-sm break-all
        ${bold      ? 'font-bold text-gray-800'     : 'text-gray-700'}
        ${mono      ? 'font-mono text-xs'           : ''}
        ${highlight ? 'text-blue-600 font-semibold' : ''}
      `}>{value}</p>
    </div>
  )
}

export default function SpecialFormPage() {
  const { id }    = useParams()
  const location  = useLocation()
  const navigate  = useNavigate()
  const { collectorName } = useCollector()

  const isNew     = !id || id === 'new'
  const initEntry = location.state?.entry || null

  const [step, setStep]       = useState('entry')
  const [entry, setEntry]     = useState(initEntry)
  const [donation, setDonation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [showRefuse, setShowRefuse] = useState(false)
  const [refuseNote, setRefuseNote] = useState('')

  const [entryForm, setEntryForm] = useState({
    name: '', owner_name: '', category: 'Shop', area: '',
  })
  const [form, setForm] = useState({
    amount: '', payment_mode: 'Cash', transaction_id: '',
  })

  useEffect(() => {
    if (!isNew && initEntry) {
      setEntry(initEntry)
      setStep('donation')
      if (initEntry.status === 'paid') {
        setLoading(true)
        getSpecialDonationByEntryId(initEntry.id).then(({ data }) => {
          setDonation(data)
          setLoading(false)
        })
      }
    }
  }, [])

  const setE = (k, v) => setEntryForm(f => ({ ...f, [k]: v }))
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSaveEntry = async () => {
    setError('')
    if (!entryForm.name.trim()) return setError('Name is required')
    setSubmitting(true)
    const { data, error: err } = await addSpecialEntry({
      name:       entryForm.name.trim(),
      owner_name: entryForm.owner_name.trim(),
      category:   entryForm.category,
      area:       entryForm.area.trim(),
      created_by: collectorName,
    })
    setSubmitting(false)
    if (err) return setError(err.message || 'Failed to save. Try again.')
    setEntry(data)
    setStep('donation')
  }

  const handleSubmitDonation = async () => {
    setError('')
    if (!form.amount || Number(form.amount) <= 0) return setError('Valid amount is required')
    setSubmitting(true)
    const { data, error: err } = await submitSpecialDonation({
      special_entry_id: entry.id,
      flat_id:          null,
      donor_name:       entry.owner_name || entry.name,
      mobile:           '',
      amount:           Number(form.amount),
      payment_mode:     form.payment_mode,
      transaction_id:   form.transaction_id.trim(),
      collected_by:     collectorName,
    })
    setSubmitting(false)
    if (err) return setError(err.message || 'Failed to save. Try again.')
    navigate('/thankyou', {
      state: {
        receiptNo: data.receipt_no,
        donation:  data,
        flat: {
          flat_number: entry.name,
          wings: { name: entry.category, buildings: { name: entry.area || '' } },
        },
      },
    })
  }

  const handleRefuse = async () => {
    setSubmitting(true)
    await refuseSpecialEntry(entry.id, collectorName, refuseNote)
    setSubmitting(false)
    navigate(-1)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-dvh bg-orange-50">
        <Header title="Special Entry" />
        <Spinner />
      </div>
    )
  }

  // Already paid
  if (!isNew && entry?.status === 'paid' && donation) {
    return (
      <div className="min-h-dvh bg-orange-50">
        <Header title={`${CAT_ICON[entry.category] || '🏪'} ${entry.name}`} />
        <div className="px-4 py-4 space-y-4">
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5">
            <p className="text-3xl text-center mb-2">✅</p>
            <p className="font-bold text-green-700 text-center text-lg mb-4">Donation Collected!</p>
            <div className="space-y-2.5">
              <Row label="Entry"    value={entry.name} />
              <Row label="Category" value={`${CAT_ICON[entry.category]} ${entry.category}`} />
              {entry.owner_name && <Row label="Owner" value={entry.owner_name} />}
              {entry.area       && <Row label="Area"  value={entry.area} />}
              <div className="border-t border-dashed border-green-200 pt-2.5">
                <Row label="Amount"      value={`₹ ${Number(donation.amount).toLocaleString('en-IN')}`} bold />
                <Row label="Payment"     value={donation.payment_mode} />
                <Row label="Receipt No." value={donation.receipt_no} mono />
                <Row label="Collected By" value={donation.collected_by || '—'} highlight />
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate(`/receipt/${donation.receipt_no}`, {
              state: {
                donation,
                flat: {
                  flat_number: entry.name,
                  wings: { name: entry.category, buildings: { name: entry.area || '' } },
                },
              },
            })}
          >
            🧾 View & Reprint Receipt
          </button>
          <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    )
  }

  // Already refused
  if (!isNew && entry?.status === 'refused') {
    return (
      <div className="min-h-dvh bg-orange-50">
        <Header title={`${CAT_ICON[entry.category] || '🏪'} ${entry.name}`} />
        <div className="px-4 py-4">
          <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-2">🚫</p>
            <p className="font-bold text-gray-700">Marked as Refused</p>
            {entry.notes && (
              <p className="text-sm text-gray-500 mt-2 italic">"{entry.notes}"</p>
            )}
          </div>
          <button className="btn-secondary mt-4" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    )
  }

  // Main form
  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title={isNew ? '➕ New Special Entry' : `${CAT_ICON[entry?.category] || '🏪'} ${entry?.name}`} />

      {/* Step indicator */}
      <div className="bg-white border-b border-orange-100 px-4 py-2.5 flex items-center gap-3">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${
          step === 'entry' ? 'text-ganesh-orange' : 'text-green-600'
        }`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
            step === 'entry' ? 'bg-ganesh-orange' : 'bg-green-500'
          }`}>
            {step === 'entry' ? '1' : '✓'}
          </span>
          Entry Details
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 rounded" />
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${
          step === 'donation' ? 'text-ganesh-orange' : 'text-gray-400'
        }`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
            step === 'donation' ? 'bg-ganesh-orange' : 'bg-gray-300'
          }`}>
            2
          </span>
          Donation
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 pb-10">

        {/* ── Step 1: Entry Details ── */}
        {step === 'entry' && (
          <>
            {/* Category */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Tag size={15} /> Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setE('category', cat)}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-all touch-manipulation flex flex-col items-center gap-1 ${
                      entryForm.category === cat
                        ? `${CAT_BG[cat]} text-white border-transparent shadow-lg`
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    <span className="text-xl">{CAT_ICON[cat]}</span>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Store size={15} />
                {entryForm.category === 'Shop' ? 'Shop Name'
                  : entryForm.category === 'VIP' ? 'VIP Name / Title'
                  : 'Bungalow Name'} *
              </label>
              <input
                className="input-field"
                placeholder={
                  entryForm.category === 'Shop' ? 'e.g. Sharma General Store'
                    : entryForm.category === 'VIP' ? 'e.g. Councillor Joshi'
                    : 'e.g. Mehta Bungalow'
                }
                value={entryForm.name}
                onChange={e => setE('name', e.target.value)}
                autoCapitalize="words"
              />
            </div>

            {/* Owner */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={15} /> Owner / Contact Name
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. Ramesh Sharma"
                value={entryForm.owner_name}
                onChange={e => setE('owner_name', e.target.value)}
                autoCapitalize="words"
              />
            </div>

            {/* Area */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={15} /> Area / Street
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. Main Market, Station Road"
                value={entryForm.area}
                onChange={e => setE('area', e.target.value)}
                autoCapitalize="words"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button className="btn-primary" onClick={handleSaveEntry} disabled={submitting}>
              {submitting ? '⏳ Saving…' : 'Next: Enter Donation →'}
            </button>
          </>
        )}

        {/* ── Step 2: Donation ── */}
        {step === 'donation' && entry && (
          <>
            {/* Entry summary */}
            <div className={`rounded-2xl p-4 text-white ${CAT_BG[entry.category] || 'bg-ganesh-orange'}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{CAT_ICON[entry.category] || '🏪'}</span>
                <div>
                  <p className="font-bold text-lg leading-tight">{entry.name}</p>
                  {entry.owner_name && <p className="text-sm opacity-80">👤 {entry.owner_name}</p>}
                  {entry.area       && <p className="text-xs opacity-70">📍 {entry.area}</p>}
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <IndianRupee size={15} /> Amount (₹) *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setF('amount', String(amt))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors touch-manipulation ${
                      form.amount === String(amt)
                        ? 'bg-ganesh-orange text-white border-ganesh-orange'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <input
                className="input-field"
                placeholder="Or enter custom amount"
                type="number"
                inputMode="numeric"
                min={1}
                value={form.amount}
                onChange={e => setF('amount', e.target.value)}
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <CreditCard size={15} /> Payment Mode *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['Cash', 'UPI'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setF('payment_mode', mode)}
                    className={`py-4 rounded-xl font-bold text-base border-2 transition-all touch-manipulation ${
                      form.payment_mode === mode
                        ? mode === 'Cash'
                          ? 'bg-green-500 text-white border-green-500 shadow-lg'
                          : 'bg-blue-500 text-white border-blue-500 shadow-lg'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {mode === 'Cash' ? '💵 Cash' : '📲 UPI'}
                  </button>
                ))}
              </div>
            </div>

            {form.payment_mode === 'UPI' && (
              <>
                {form.amount && Number(form.amount) > 0 && <UpiQR amount={form.amount} />}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Hash size={15} /> Transaction ID
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    className="input-field font-mono"
                    placeholder="UPI transaction reference"
                    value={form.transaction_id}
                    onChange={e => setF('transaction_id', e.target.value)}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button className="btn-success" onClick={handleSubmitDonation} disabled={submitting}>
              {submitting ? '⏳ Saving…' : '✅ Save & Generate Receipt'}
            </button>

            {/* Refuse */}
            {!showRefuse ? (
              <button
                onClick={() => setShowRefuse(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold text-sm active:scale-95 transition-transform touch-manipulation"
              >
                <Ban size={16} /> Mark as Refused
              </button>
            ) : (
              <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-4 space-y-3">
                <p className="font-semibold text-gray-700 text-center">🚫 Reason for refusal?</p>
                <input
                  className="input-field text-sm"
                  placeholder="e.g. Not interested, Will donate later…"
                  value={refuseNote}
                  onChange={e => setRefuseNote(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowRefuse(false)}
                    className="py-2.5 rounded-xl border-2 border-gray-300 font-semibold text-gray-600 text-sm touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefuse}
                    disabled={submitting}
                    className="py-2.5 rounded-xl bg-gray-500 text-white font-semibold text-sm touch-manipulation"
                  >
                    {submitting ? 'Saving…' : 'Confirm Refused'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}