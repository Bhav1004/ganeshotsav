import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IndianRupee, Smartphone, User, Hash, CreditCard, Ban } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import UpiQR from '../components/UpiQR'
import { getFlatById, submitDonation, refuseFlat } from '../api'
import { useCollector } from '../context/CollectorContext'

const PRESET_AMOUNTS = [101, 201, 501, 1001, 2001, 5001]

export default function DonationForm() {
  const { flatId } = useParams()
  const navigate   = useNavigate()
  const { collectorName } = useCollector()

  const [flat, setFlat]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refusing, setRefusing]     = useState(false)
  const [error, setError]           = useState('')
  const [showRefuseConfirm, setShowRefuseConfirm] = useState(false)

  const [form, setForm] = useState({
    donor_name: '', mobile: '', amount: '', payment_mode: 'Cash', transaction_id: '',
  })

  useEffect(() => {
    getFlatById(flatId).then(({ data }) => { setFlat(data); setLoading(false) })
  }, [flatId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    if (!form.donor_name.trim()) return setError('Donor name is required')
    if (!form.amount || Number(form.amount) <= 0) return setError('Valid amount is required')
    setSubmitting(true)
    const { data, error: err } = await submitDonation({
      flat_id: flatId, donor_name: form.donor_name.trim(),
      mobile: form.mobile.trim(), amount: Number(form.amount),
      payment_mode: form.payment_mode, transaction_id: form.transaction_id.trim(),
      collected_by: collectorName,
    })
    setSubmitting(false)
    if (err) return setError(err.message || 'Failed to save. Please try again.')
    navigate(`/receipt/${data.receipt_no}`, { state: { donation: data, flat } })
  }

  const handleRefuse = async () => {
    setRefusing(true)
    await refuseFlat(flatId, collectorName)
    setRefusing(false)
    navigate(-1)
  }

  if (loading) return <div className="min-h-dvh bg-orange-50"><Header title="Donation" /><Spinner /></div>

  const alreadyPaid    = flat?.status === 'paid'
  const alreadyRefused = flat?.status === 'refused'

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title={`🏠 Flat ${flat?.flat_number || ''}`} />
      <div className="bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white px-4 py-3">
        <p className="text-sm opacity-90">Recording donation for</p>
        <p className="font-bold text-xl">Flat {flat?.flat_number}</p>
      </div>

      <div className="px-4 py-4 space-y-4 pb-10">
        {alreadyPaid && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">✅</p>
            <p className="font-bold text-green-700">Already Paid!</p>
            <p className="text-sm text-green-600">This flat has already been collected.</p>
            <button className="mt-3 btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
          </div>
        )}

        {alreadyRefused && (
          <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🚫</p>
            <p className="font-bold text-gray-700">Marked as Refused</p>
            <p className="text-sm text-gray-500">Owner refused to donate.</p>
            <button className="mt-3 btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
          </div>
        )}

        {!alreadyPaid && !alreadyRefused && (
          <>
            {/* Donor Name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={15}/> Donor Name *
              </label>
              <input className="input-field" placeholder="Full name of donor"
                value={form.donor_name} onChange={e => set('donor_name', e.target.value)} autoCapitalize="words"/>
            </div>

            {/* Mobile */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Smartphone size={15}/> Mobile <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input className="input-field" placeholder="10-digit mobile number"
                type="tel" inputMode="numeric" maxLength={10}
                value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))}/>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <IndianRupee size={15}/> Amount (₹) *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_AMOUNTS.map(amt => (
                  <button key={amt} onClick={() => set('amount', String(amt))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors touch-manipulation ${
                      form.amount === String(amt) ? 'bg-ganesh-orange text-white border-ganesh-orange' : 'bg-white text-gray-700 border-gray-200'
                    }`}>₹{amt}</button>
                ))}
              </div>
              <input className="input-field" placeholder="Or enter custom amount"
                type="number" inputMode="numeric" min={1}
                value={form.amount} onChange={e => set('amount', e.target.value)}/>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <CreditCard size={15}/> Payment Mode *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['Cash', 'UPI'].map(mode => (
                  <button key={mode} onClick={() => set('payment_mode', mode)}
                    className={`py-4 rounded-xl font-bold text-base border-2 transition-all touch-manipulation ${
                      form.payment_mode === mode
                        ? mode === 'Cash' ? 'bg-green-500 text-white border-green-500 shadow-lg' : 'bg-blue-500 text-white border-blue-500 shadow-lg'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}>
                    {mode === 'Cash' ? '💵 Cash' : '📲 UPI'}
                  </button>
                ))}
              </div>
            </div>

            {form.payment_mode === 'UPI' && (
              <>
                {form.amount && Number(form.amount) > 0 && <UpiQR amount={form.amount}/>}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Hash size={15}/> Transaction ID <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input className="input-field font-mono" placeholder="UPI transaction reference"
                    value={form.transaction_id} onChange={e => set('transaction_id', e.target.value)}/>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button className="btn-success" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '⏳ Saving…' : '✅ Save & Generate Receipt'}
            </button>

            {/* Refuse button */}
            {!showRefuseConfirm ? (
              <button onClick={() => setShowRefuseConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold text-sm active:scale-95 transition-transform touch-manipulation">
                <Ban size={16}/> Mark as Refused
              </button>
            ) : (
              <div className="bg-gray-50 border-2 border-gray-300 rounded-2xl p-4">
                <p className="font-semibold text-gray-700 text-center mb-3">
                  🚫 Confirm: Owner refused to donate?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowRefuseConfirm(false)}
                    className="py-2.5 rounded-xl border-2 border-gray-300 font-semibold text-gray-600 text-sm touch-manipulation">
                    Cancel
                  </button>
                  <button onClick={handleRefuse} disabled={refusing}
                    className="py-2.5 rounded-xl bg-gray-500 text-white font-semibold text-sm touch-manipulation">
                    {refusing ? 'Saving…' : 'Yes, Refused'}
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