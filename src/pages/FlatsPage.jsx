import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Clock, RefreshCw, X, Receipt, User, IndianRupee, Calendar, Wifi } from 'lucide-react'
import Header from '../components/Header'
import Spinner from '../components/Spinner'
import { getFlats, getDonationByFlatId } from '../api'
import supabase from '../supabase'

const useMock = !import.meta.env.VITE_SUPABASE_URL

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Bottom sheet for paid/refused flat detail ─────────────────────────────────
function FlatDetailSheet({ flat, onClose, onViewReceipt }) {
  const [donation, setDonation] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!flat) return
    getDonationByFlatId(flat.id).then(({ data }) => {
      setDonation(data)
      setLoading(false)
    })
  }, [flat])

  if (!flat) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-md mx-auto"
           style={{ animation: 'slideUp 0.25s ease-out' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full"/>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Flat {flat.flat_number}</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              flat.status === 'paid'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {flat.status === 'paid' ? '✅ Paid' : '🚫 Refused'}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 touch-manipulation">
            <X size={18} className="text-gray-600"/>
          </button>
        </div>

        <div className="px-5 py-4 pb-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-3xl animate-bounce">🙏</div>
              <p className="text-gray-400 text-sm mt-2">Loading details…</p>
            </div>
          ) : flat.status === 'refused' ? (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <p className="text-3xl mb-2">🚫</p>
                <p className="font-semibold text-gray-600">Owner refused to donate</p>
                {flat.notes && (
                  <p className="text-sm text-gray-400 mt-2 italic">"{flat.notes}"</p>
                )}
              </div>
              <button onClick={onClose} className="btn-secondary">Close</button>
            </div>
          ) : donation ? (
            <div className="space-y-4">
              {/* Detail rows */}
              <div className="bg-orange-50 rounded-2xl p-4 space-y-3">
                <DetailRow icon={<User size={15} className="text-ganesh-orange"/>}
                  label="Donor" value={donation.donor_name} bold/>
                <DetailRow icon={<IndianRupee size={15} className="text-green-600"/>}
                  label="Amount" value={`₹ ${Number(donation.amount).toLocaleString('en-IN')}`} bold large/>
                <DetailRow icon={<User size={15} className="text-blue-500"/>}
                  label="Collected by" value={donation.collected_by || '—'} highlight/>
                <DetailRow icon={<Receipt size={15} className="text-purple-500"/>}
                  label="Receipt No." value={donation.receipt_no} mono/>
                <DetailRow
                  icon={<span className="text-sm">{donation.payment_mode === 'Cash' ? '💵' : '📲'}</span>}
                  label="Payment" value={donation.payment_mode}/>
                {donation.mobile && (
                  <DetailRow icon={<span className="text-sm">📱</span>}
                    label="Mobile" value={donation.mobile}/>
                )}
                <DetailRow icon={<Calendar size={15} className="text-gray-400"/>}
                  label="Date" value={formatDate(donation.created_at)}/>
              </div>

              {/* Actions */}
              <button
                onClick={() => onViewReceipt(donation.receipt_no)}
                className="btn-primary"
              >
                <span className="flex items-center justify-center gap-2">
                  <Receipt size={16}/> View & Reprint Receipt
                </span>
              </button>
              <button onClick={onClose} className="btn-secondary">Close</button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No donation record found</p>
              <button onClick={onClose} className="btn-secondary mt-4">Close</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function DetailRow({ icon, label, value, bold, large, mono, highlight }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 flex justify-between items-start gap-2 min-w-0">
        <p className="text-gray-500 text-sm flex-shrink-0">{label}</p>
        <p className={`text-right break-all
          ${bold      ? 'font-bold text-gray-800'   : 'text-gray-700'}
          ${large     ? 'text-lg text-green-700'    : 'text-sm'}
          ${mono      ? 'font-mono text-xs'         : ''}
          ${highlight ? 'text-blue-600 font-semibold' : ''}
        `}>{value}</p>
      </div>
    </div>
  )
}

// ── Main FlatsPage ────────────────────────────────────────────────────────────
export default function FlatsPage() {
  const { wingId } = useParams()
  const navigate   = useNavigate()

  const [flats, setFlats]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedFlat, setSelectedFlat] = useState(null)
  const [isLive, setIsLive]         = useState(false)
  const channelRef = useRef(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true)
    const { data } = await getFlats(wingId)
    setFlats(data || [])
    setLoading(false)
    setRefreshing(false)
  }, [wingId])

  // Initial load
  useEffect(() => { load() }, [load])

  // ── Supabase Realtime subscription ──────────────────────────────────────────
  useEffect(() => {
    if (useMock) return // No realtime in mock mode

    const channel = supabase
      .channel(`wing-flats-${wingId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'flats',
          filter: `wing_id=eq.${wingId}`,
        },
        (payload) => {
          // Update just the changed flat in state — no full reload needed
          setFlats(prev => prev.map(f =>
            f.id === payload.new.id ? { ...f, ...payload.new } : f
          ))
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      setIsLive(false)
    }
  }, [wingId])

  const handleFlatTap = (flat) => {
    if (flat.status === 'paid' || flat.status === 'refused') {
      setSelectedFlat(flat)
    } else {
      navigate(`/flats/${flat.id}/donate`)
    }
  }

  const handleViewReceipt = (receiptNo) => {
    setSelectedFlat(null)
    navigate(`/receipt/${receiptNo}`)
  }

  // Group by floor
  const byFloor = flats.reduce((acc, flat) => {
    if (!acc[flat.floor]) acc[flat.floor] = []
    acc[flat.floor].push(flat)
    return acc
  }, {})
  const floors = Object.keys(byFloor).sort((a, b) => b - a)

  const paidCount    = flats.filter(f => f.status === 'paid').length
  const refusedCount = flats.filter(f => f.status === 'refused').length
  const pendingCount = flats.length - paidCount - refusedCount
  const pct          = flats.length ? Math.round((paidCount / flats.length) * 100) : 0

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="🏠 Flat Status"/>

      {/* Progress bar */}
      <div className="bg-white border-b border-orange-100 px-4 py-3">
        <div className="flex justify-between text-sm font-medium mb-1.5">
          <span className="text-green-700 flex items-center gap-1">
            <CheckCircle2 size={14}/> {paidCount} Paid
          </span>
          <span className="text-gray-500 font-bold">{pct}%</span>
          <span className="text-red-600 flex items-center gap-1">
            <Clock size={14}/> {pendingCount} Pending
          </span>
        </div>
        <div className="h-3 bg-red-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500"
               style={{ width: `${pct}%` }}/>
        </div>
      </div>

      {/* Legend + live indicator + refresh */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex gap-2 text-xs text-gray-600 flex-wrap items-center">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-400 inline-block"/> Paid
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-300 inline-block"/> Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-400 inline-block"/> Refused
          </span>
          {/* Live indicator */}
          {!useMock && (
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
              isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}/>
              {isLive ? 'Live' : 'Offline'}
            </span>
          )}
        </div>
        <button onClick={() => load(true)}
          className="p-1.5 rounded-lg text-gray-500 active:text-ganesh-orange touch-manipulation">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/>
        </button>
      </div>

      {/* Hint for paid flats */}
      {paidCount > 0 && !loading && (
        <p className="text-center text-xs text-gray-400 pb-1">
          Tap ✅ paid flat to view donation details
        </p>
      )}

      {/* Flat grid */}
      <div className="px-3 pb-24">
        {loading ? <Spinner text="Loading flats…"/> : (
          <div className="space-y-4">
            {floors.map(floor => (
              <div key={floor}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Floor {floor}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {byFloor[floor].map(flat => (
                    <button
                      key={flat.id}
                      onClick={() => handleFlatTap(flat)}
                      className={`relative rounded-xl text-center py-2 text-sm font-semibold
                        cursor-pointer active:scale-95 transition-transform border-2 ${
                        flat.status === 'paid'
                          ? 'bg-green-100 border-green-400 text-green-800'
                          : flat.status === 'refused'
                          ? 'bg-gray-100 border-gray-400 text-gray-500'
                          : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {flat.notes && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full
                          text-white flex items-center justify-center text-[9px]">
                          📝
                        </span>
                      )}
                      <span className="block text-lg">
                        {flat.status === 'paid' ? '✅' : flat.status === 'refused' ? '🚫' : '❌'}
                      </span>
                      <span className="block">{flat.flat_number}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {selectedFlat && (
        <FlatDetailSheet
          flat={selectedFlat}
          onClose={() => setSelectedFlat(null)}
          onViewReceipt={handleViewReceipt}
        />
      )}
    </div>
  )
}