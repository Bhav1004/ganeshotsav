import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Printer, Share2, Home, MessageCircle, ImageDown, ArrowRight } from 'lucide-react'
import { getDonationByReceiptNo, getNextPendingFlat } from '../api'
import { MANDAL_LOGO } from '../mandalLogo'

function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatAmount(amt) {
  return Number(amt || 0).toLocaleString('en-IN')
}

function numberToWords(num) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  if (!num || num === 0) return 'Zero'
  if (num < 20)       return ones[num]
  if (num < 100)      return tens[Math.floor(num/10)] + (num%10 ? ' '+ones[num%10] : '')
  if (num < 1000)     return ones[Math.floor(num/100)] + ' Hundred' + (num%100 ? ' '+numberToWords(num%100) : '')
  if (num < 100000)   return numberToWords(Math.floor(num/1000)) + ' Thousand' + (num%1000 ? ' '+numberToWords(num%1000) : '')
  if (num < 10000000) return numberToWords(Math.floor(num/100000)) + ' Lakh' + (num%100000 ? ' '+numberToWords(num%100000) : '')
  return numberToWords(Math.floor(num/10000000)) + ' Crore' + (num%10000000 ? ' '+numberToWords(num%10000000) : '')
}

/* ─── Mandal Stamp — red circle matching logo style ─────────────────────────── */
function MandalStamp() {
  const dotAngles = [0,30,60,90,120,150,180,210,240,270,300,330]
  return (
    <svg width="92" height="92" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Outer rings */}
      <circle cx="50" cy="50" r="48" fill="#CC1010"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="0.8" opacity="0.5"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.4" opacity="0.3"/>

      {/* Dot ring */}
      {dotAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x = 50 + 39 * Math.cos(rad)
        const y = 50 + 39 * Math.sin(rad)
        return <circle key={i} cx={x} cy={y} r="1.3" fill="white" opacity="0.7"/>
      })}

      {/* Top arc — mandal name */}
      <path id="stampTopArc" d="M 13,50 A 37,37 0 0,1 87,50" fill="none"/>
      <text fontSize="6.8" fontFamily="serif" fill="white" fontWeight="bold" letterSpacing="0.5">
        <textPath href="#stampTopArc" startOffset="2%">बाल गोपाळ मित्र मंडळ</textPath>
      </text>

      {/* Bottom arc — year */}
      <path id="stampBotArc" d="M 15,50 A 35,35 0 0,0 85,50" fill="none"/>
      <text fontSize="5.8" fontFamily="sans-serif" fill="white" fontWeight="600">
        <textPath href="#stampBotArc" startOffset="12%">BGMM Ganeshotsav 2026</textPath>
      </text>

      {/* Center: Star Colony logo text */}
      <text x="50" y="40" textAnchor="middle" fontSize="6.5" fill="white"
            fontFamily="serif" fontWeight="bold" opacity="0.9">स्टार कॉलनीचा</text>

      {/* Vighnaharta in large Devanagari */}
      <text x="50" y="54" textAnchor="middle" fontSize="13" fill="white"
            fontFamily="serif" fontWeight="bold">विघ्नहर्ती</text>

      {/* Registration number */}
      <text x="50" y="63" textAnchor="middle" fontSize="4.8" fill="white"
            fontFamily="sans-serif" opacity="0.9">रजि.नं. ठाणे/०००६७१/२०२४</text>

      {/* Cardinal stars */}
      <circle cx="50" cy="25" r="2" fill="white" opacity="0.8"/>
      <circle cx="50" cy="75" r="2" fill="white" opacity="0.8"/>
    </svg>
  )
}

/* ─── Main Receipt Page ──────────────────────────────────────────────────────── */
export default function ReceiptPage({ publicMode = false }) {
  const { receiptNo } = useParams()
  const location      = useLocation()
  const navigate      = useNavigate()

  const [donation, setDonation]   = useState(location.state?.donation || null)
  const [flat, setFlat]           = useState(location.state?.flat || null)
  const [loading, setLoading]     = useState(!location.state?.donation)
  const [loadError, setLoadError] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [nextFlat, setNextFlat]   = useState(null)
  const receiptRef = useRef(null)

  // Always fetch from DB for freshness
  useEffect(() => {
    getDonationByReceiptNo(receiptNo).then(({ data, error }) => {
      if (error || !data) {
        if (!location.state?.donation) setLoadError(true)
      } else {
        setDonation(data)
        setFlat(data?.flats || location.state?.flat || null)
      }
      setLoading(false)
    })
  }, [receiptNo])

  // Next pending flat — volunteers only
  useEffect(() => {
    if (publicMode || !donation) return
    const wingId = flat?.wing_id || flat?.wings?.id
    const flatId = donation?.flat_id
    if (wingId && flatId) {
      getNextPendingFlat(wingId, flatId).then(({ data }) => setNextFlat(data || null))
    }
  }, [donation, flat, publicMode])

  const handlePrint = () => window.print()

  const handleShare = async () => {
    const text =
      `🙏 BGMM Ganeshotsav 2026 - Donation Receipt\n\n` +
      `Donor: ${donation.donor_name}\n` +
      `Flat: ${flat?.flat_number || ''}\n` +
      `Amount: ₹${formatAmount(donation.amount)}\n` +
      `Receipt No: ${donation.receipt_no}\n` +
      `Mode: ${donation.payment_mode}\n\n` +
      `Thank you! गणपती बाप्पा मोरया! 🙏\n– बाल गोपाळ मित्र मंडळ`
    if (navigator.share) {
      await navigator.share({ title: 'Donation Receipt', text })
    } else {
      await navigator.clipboard.writeText(text)
      alert('Receipt details copied!')
    }
  }

  const captureImage = useCallback(async () => {
    const { toPng } = await import('html-to-image')
    return toPng(receiptRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      style: { borderRadius: '0' },
    })
  }, [])

  const handleWhatsAppImage = async () => {
    setShareLoading(true)
    try {
      const dataUrl = await captureImage()
      const res     = await fetch(dataUrl)
      const blob    = await res.blob()
      const file    = new File([blob], `receipt-${donation.receipt_no}.png`, { type: 'image/png' })
      const phone   = donation.mobile ? donation.mobile.replace(/\D/g, '') : ''
      const text    = `🙏 BGMM Ganeshotsav 2026\n\nDonor: ${donation.donor_name}\nAmount: ₹${formatAmount(donation.amount)}\nReceipt No: ${donation.receipt_no}\n\nगणपती बाप्पा मोरया! 🙏`

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl; a.download = `receipt-${donation.receipt_no}.png`; a.click()
        setTimeout(() => {
          window.open(`https://wa.me/${phone ? '91'+phone : ''}?text=${encodeURIComponent(text)}`, '_blank')
        }, 800)
      }
    } catch(e) {
      console.error(e)
      alert('Could not generate image. Try Print / PDF instead.')
    }
    setShareLoading(false)
  }

  const handleDownloadImage = async () => {
    setShareLoading(true)
    try {
      const dataUrl = await captureImage()
      const a = document.createElement('a')
      a.href = dataUrl; a.download = `receipt-${donation.receipt_no}.png`; a.click()
    } catch(e) {
      console.error(e)
      alert('Could not generate image. Try Print / PDF instead.')
    }
    setShareLoading(false)
  }

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-orange-50">
      <div className="text-center">
        <div className="text-5xl animate-bounce mb-3">🙏</div>
        <p className="text-gray-500">Loading receipt…</p>
      </div>
    </div>
  )

  if (loadError || !donation) return (
    <div className="min-h-dvh flex items-center justify-center bg-orange-50 px-6">
      <div className="text-center">
        <p className="text-4xl mb-3">😔</p>
        <p className="font-bold text-gray-700 mb-1">Receipt not found</p>
        <p className="text-gray-500 text-sm mb-4">Please check the receipt number and try again.</p>
        {publicMode
          ? <button className="btn-primary" onClick={() => navigate('/lookup')}>← Back to Lookup</button>
          : <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>}
      </div>
    </div>
  )

  const flatNo        = flat?.flat_number || ''
  const collectorName = donation.collected_by || ''
  const wingName      = flat?.wings?.name || ''
  const buildingName  = flat?.wings?.buildings?.name || ''
  const mandalName    = import.meta.env.VITE_MANDAL_NAME || 'बाल गोपाळ मित्र मंडळ'
  const mandalAddress = import.meta.env.VITE_MANDAL_ADDRESS || 'स्टार कॉलनी, ठाणे'
  const mandalContact = import.meta.env.VITE_MANDAL_CONTACT || '+91 98765 43210'

  return (
    <div className="min-h-dvh bg-gray-100">

      {/* Top bar */}
      {!publicMode && (
        <div className="no-print bg-gradient-to-r from-red-800 to-red-600 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">🎉 Receipt Generated!</p>
              <p className="text-xs text-red-200">{donation.receipt_no}</p>
            </div>
            <button onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white/20 active:bg-white/30 touch-manipulation">
              <Home size={20}/>
            </button>
          </div>
        </div>
      )}

      {publicMode && (
        <div className="no-print bg-gradient-to-r from-red-800 to-red-600 text-white px-4 py-3 text-center">
          <p className="font-semibold text-sm">🙏 BGMM Ganeshotsav 2026 – Donation Receipt</p>
        </div>
      )}

      <div className="px-4 py-4 max-w-md mx-auto">

        {/* ══ RECEIPT CARD — captured as image ══ */}
        <div ref={receiptRef}
          className="receipt-container bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-red-200">

          {/* ── HEADER ── */}
          <div className="text-white text-center relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #8B0000 0%, #CC1010 50%, #E53535 100%)' }}>

            {/* Subtle Om watermark */}
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                 style={{ opacity: 0.05 }}>
              <span style={{ fontSize: 170, fontFamily: 'serif', lineHeight: 1 }}>ॐ</span>
            </div>

            {/* ── Corner labels: स्थापना left, वर्ष right ── */}
            <div className="relative z-10 flex justify-between items-start px-4 pt-3">
              <div className="text-left bg-black/20 rounded-lg px-2 py-1">
                <p className="text-red-200 leading-tight" style={{ fontSize: '9px' }}>स्थापना</p>
                <p className="font-bold text-white leading-tight text-sm"
                   style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>१९८४</p>
              </div>
              <div className="text-right bg-black/20 rounded-lg px-2 py-1">
                <p className="text-red-200 leading-tight" style={{ fontSize: '9px' }}>वर्ष</p>
                <p className="font-bold text-white leading-tight text-sm"
                   style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>४३ वे</p>
              </div>
            </div>

            {/* ── MANDAL LOGO (replaces Ganpati SVG) ── */}
            <div className="relative z-10 flex justify-center pt-3 pb-2">
              <div className="rounded-full overflow-hidden border-4 border-white/30 shadow-lg"
                   style={{ width: 100, height: 100 }}>
                <img
                  src={MANDAL_LOGO}
                  alt="बाल गोपाळ मित्र मंडळ"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            {/* Mandal name */}
            <div className="relative z-10 pb-4 px-4">
              <h1 className="text-2xl font-bold leading-tight"
                  style={{ fontFamily: "'Tiro Devanagari Hindi', serif",
                           textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                {mandalName}
              </h1>
              <p className="text-red-100 text-sm mt-0.5">{mandalAddress}</p>
              {/* Registration number */}
              <p className="text-red-200 text-xs mt-0.5 font-medium">
                रजि.नं. ठाणे/०००६७१/२०२४
              </p>
            </div>
          </div>

          {/* ── RECEIPT META ── */}
          <div className="bg-red-50 border-b border-red-100 px-5 py-2.5 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Receipt No.</p>
              <p className="font-bold text-red-800 font-mono text-sm">{donation.receipt_no}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
              <p className="font-semibold text-gray-700 text-sm">{formatDate(donation.created_at)}</p>
            </div>
          </div>

          {/* ── DONATION DETAILS ── */}
          <div className="px-5 py-4 space-y-3">
            <Row label="Donor Name"   value={donation.donor_name} bold/>
            {(flatNo || wingName || buildingName) && (
              <Row label="Flat No."
                value={[buildingName, wingName, flatNo].filter(Boolean).join(' › ')}/>
            )}
            {donation.mobile && <Row label="Mobile" value={donation.mobile}/>}
            <div className="border-t border-dashed border-red-100 pt-3">
              <Row label="Amount" value={`₹ ${formatAmount(donation.amount)}`} bold large/>
              <p className="text-xs text-gray-400 mt-0.5 italic">
                ({numberToWords(Number(donation.amount))} Rupees Only)
              </p>
            </div>
            <Row label="Payment Mode" value={donation.payment_mode}/>
            {donation.transaction_id && (
              <Row label="Transaction ID" value={donation.transaction_id} mono/>
            )}
            {donation.collected_by && (
              <Row label="Collected By" value={donation.collected_by}/>
            )}
          </div>

          {/* ── THANK YOU ── */}
          <div className="border-t border-red-100 px-5 py-3 text-center"
               style={{ background: 'linear-gradient(to right, #fff5f5, #fff8f0)' }}>
            <p className="font-bold text-base"
               style={{ color: '#8B0000', fontFamily: "'Tiro Devanagari Hindi', serif" }}>
              🙏 गणपती बाप्पा मोरया!
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Thank you for your generous contribution to BGMM Ganeshotsav 2026
            </p>
            <p className="text-xs text-gray-400 mt-1">{mandalContact}</p>
          </div>

          {/* ── SIGNATURE + STAMP ── */}
          <div className="px-5 py-4 flex justify-between items-end border-t border-gray-100 gap-4">
            {/* Collector signature */}
            <div className="text-center min-w-[110px]">
              {collectorName ? (
                <p className="leading-tight mb-1"
                   style={{
                     color: '#8B0000',
                     fontFamily: "'Brush Script MT', cursive",
                     fontSize: '16px',
                     fontStyle: 'italic',
                     whiteSpace: 'nowrap',
                     overflow: 'hidden',
                     textOverflow: 'ellipsis',
                     maxWidth: '120px',
                   }}>
                  {collectorName}
                </p>
              ) : <div className="h-7 mb-1"/>}
              <div className="border-b-2 border-gray-500 w-28"/>
              <p className="text-xs text-gray-500 mt-1">Collector's Signature</p>
            </div>

            {/* Mandal stamp */}
            <div style={{ opacity: 0.88 }}>
              <MandalStamp/>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="text-white text-center py-2 px-4"
               style={{ background: '#8B0000' }}>
            <p className="text-xs opacity-80">
              BGMM Ganeshotsav 2026 · Digital Receipt System
            </p>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="no-print mt-4 space-y-3 pb-8">
          <button onClick={handleWhatsAppImage} className="btn-success" disabled={shareLoading}>
            <span className="flex items-center justify-center gap-2">
              <MessageCircle size={18}/>
              {shareLoading ? 'Preparing image…' : 'Share Receipt on WhatsApp'}
            </span>
          </button>

          <button onClick={handleDownloadImage} className="btn-secondary" disabled={shareLoading}>
            <span className="flex items-center justify-center gap-2">
              <ImageDown size={16}/> Download Receipt Image
            </span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handlePrint} className="btn-secondary">
              <span className="flex items-center justify-center gap-2">
                <Printer size={16}/> Print / PDF
              </span>
            </button>
            <button onClick={handleShare} className="btn-secondary">
              <span className="flex items-center justify-center gap-2">
                <Share2 size={16}/> Share Text
              </span>
            </button>
          </div>

          {!publicMode && nextFlat && (
            <button onClick={() => navigate(`/flats/${nextFlat.id}/donate`)}
              className="btn-primary">
              <span className="flex items-center justify-center gap-2">
                Next Pending Flat ({nextFlat.flat_number}) <ArrowRight size={18}/>
              </span>
            </button>
          )}

          {publicMode ? (
            <button onClick={() => navigate('/lookup')}
              className="w-full text-center text-red-700 font-semibold py-2 active:opacity-70 touch-manipulation">
              ← Back to Receipt Lookup
            </button>
          ) : (
            <button onClick={() => navigate(-2)}
              className="w-full text-center text-red-700 font-semibold py-2 active:opacity-70 touch-manipulation">
              ← Back to Flat Grid
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, large, mono }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <p className="text-gray-500 text-sm flex-shrink-0">{label}</p>
      <p className={`text-right
        ${bold  ? 'font-bold text-gray-800'  : 'text-gray-700'}
        ${large ? 'text-xl font-bold'        : 'text-sm'}
        ${mono  ? 'font-mono text-xs'        : ''}
      `.trim()} style={large ? { color: '#8B0000' } : {}}>
        {value}
      </p>
    </div>
  )
}