import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Printer, Share2, Home, MessageCircle } from 'lucide-react'
import { getDonationByReceiptNo } from '../api'

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatAmount(amt) {
  return Number(amt).toLocaleString('en-IN')
}

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (num === 0) return 'Zero'
  if (num < 20) return ones[num]
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '')
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '')
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
}

/* ─── 1. Ganpati SVG Illustration ──────────────────────────────────────────── */
function GanpatiIllustration({ size = 100 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Prabhaval / halo */}
      <circle cx="60" cy="44" r="37" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.8"/>
      <circle cx="60" cy="44" r="32" fill="none" stroke="#FFD700" strokeWidth="1" opacity="0.4"/>

      {/* Mukut / Crown */}
      <path d="M38 20 L42 9 L50 16 L60 6 L70 16 L78 9 L82 20 Z" fill="#FFD700"/>
      <circle cx="50" cy="14" r="2.5" fill="#FF6B00"/>
      <circle cx="60" cy="8"  r="3"   fill="#FF6B00"/>
      <circle cx="70" cy="14" r="2.5" fill="#FF6B00"/>
      <rect x="38" y="19" width="44" height="3" rx="1.5" fill="#FFC107"/>

      {/* Body */}
      <ellipse cx="60" cy="98" rx="30" ry="25" fill="#FFCC80"/>
      {/* Dhoti lines */}
      <path d="M33 108 Q60 120 87 108" stroke="#FFB347" strokeWidth="2"   fill="none"/>
      <path d="M35 114 Q60 124 85 114" stroke="#FFB347" strokeWidth="1.5" fill="none"/>

      {/* Left arm */}
      <ellipse cx="27" cy="91" rx="12" ry="8" fill="#FFCC80" transform="rotate(-25 27 91)"/>
      {/* Right arm */}
      <ellipse cx="93" cy="91" rx="12" ry="8" fill="#FFCC80" transform="rotate(25 93 91)"/>

      {/* Left hand – modak */}
      <ellipse cx="17" cy="98" rx="8" ry="7" fill="#FF9800"/>
      <ellipse cx="17" cy="95" rx="5" ry="4" fill="#FFC107"/>
      <path d="M12 95 Q17 90 22 95" stroke="#FF8F00" strokeWidth="1" fill="none"/>

      {/* Right hand – blessing */}
      <ellipse cx="103" cy="86" rx="7" ry="8" fill="#FFCC80"/>
      <line x1="99"  y1="80" x2="98"  y2="74" stroke="#FFCC80" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="102" y1="79" x2="102" y2="73" stroke="#FFCC80" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="105" y1="80" x2="106" y2="74" stroke="#FFCC80" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="108" y1="82" x2="110" y2="77" stroke="#FFCC80" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Head */}
      <ellipse cx="60" cy="48" rx="26" ry="27" fill="#FFCC80"/>

      {/* Big ears */}
      <ellipse cx="34" cy="52" rx="11" ry="14" fill="#FFCC80"/>
      <ellipse cx="34" cy="52" rx="7"  ry="10" fill="#FFE0B2"/>
      <ellipse cx="86" cy="52" rx="11" ry="14" fill="#FFCC80"/>
      <ellipse cx="86" cy="52" rx="7"  ry="10" fill="#FFE0B2"/>
      {/* Ear ornaments */}
      <circle cx="24" cy="52" r="3.5" fill="#FFD700"/>
      <circle cx="96" cy="52" r="3.5" fill="#FFD700"/>

      {/* Eyes */}
      <ellipse cx="50" cy="45" rx="6.5" ry="7" fill="white"/>
      <ellipse cx="70" cy="45" rx="6.5" ry="7" fill="white"/>
      <circle  cx="50" cy="46" r="4"   fill="#1A1A1A"/>
      <circle  cx="70" cy="46" r="4"   fill="#1A1A1A"/>
      <circle  cx="51.5" cy="44" r="1.5" fill="white"/>
      <circle  cx="71.5" cy="44" r="1.5" fill="white"/>
      {/* Eyebrows */}
      <path d="M44 39 Q50 36 56 39" stroke="#5D4037" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M64 39 Q70 36 76 39" stroke="#5D4037" strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Third eye / tilak */}
      <ellipse cx="60" cy="35" rx="4.5" ry="5.5" fill="#FF6B00"/>
      <ellipse cx="60" cy="35" rx="2.5" ry="3.5" fill="#FFD700"/>
      <circle  cx="60" cy="34" r="1"   fill="#FF6B00"/>

      {/* Trunk curling left */}
      <path d="M55 58 Q46 66 43 74 Q41 80 47 82 Q53 84 55 77 Q57 71 61 69"
            stroke="#FFCC80" strokeWidth="10" fill="none" strokeLinecap="round"/>
      <path d="M55 58 Q46 66 43 74 Q41 80 47 82 Q53 84 55 77 Q57 71 61 69"
            stroke="#FFB347" strokeWidth="7"  fill="none" strokeLinecap="round"/>
      <path d="M61 69 Q65 68 66 72 Q66 77 62 76"
            stroke="#FFB347" strokeWidth="6" fill="none" strokeLinecap="round"/>

      {/* Necklace */}
      <path d="M40 70 Q60 80 80 70" stroke="#FFD700" strokeWidth="2.5" fill="none"/>
      <circle cx="60" cy="75" r="3.5" fill="#FFD700"/>
      <circle cx="51" cy="73" r="2.2" fill="#FF6B00"/>
      <circle cx="69" cy="73" r="2.2" fill="#FF6B00"/>

      {/* Navel */}
      <circle cx="60" cy="97" r="5" fill="#FFB347"/>
      <circle cx="60" cy="97" r="3" fill="#FF9800"/>

      {/* Mouse vahana at feet */}
      <ellipse cx="60" cy="125" rx="9"  ry="5" fill="#BDBDBD"/>
      <ellipse cx="54" cy="121" rx="5"  ry="4" fill="#BDBDBD"/>
      <circle  cx="51" cy="120" r="1.2" fill="#424242"/>
      <path d="M51 120 Q47 117 44 119" stroke="#BDBDBD" strokeWidth="1.2" fill="none"/>
    </svg>
  )
}

/* ─── 4. Mandal Stamp SVG ───────────────────────────────────────────────────── */
function MandalStamp() {
  const dotAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
  return (
    <svg width="88" height="88" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Outer decorative rings */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="#C2410C" strokeWidth="2.5"/>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#C2410C" strokeWidth="0.8"/>
      {/* Background fill */}
      <circle cx="50" cy="50" r="43" fill="#FFF7ED"/>

      {/* Dot ring decoration */}
      {dotAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x = 50 + 40 * Math.cos(rad)
        const y = 50 + 40 * Math.sin(rad)
        return <circle key={i} cx={x} cy={y} r="1.4" fill="#F97316" opacity="0.75"/>
      })}

      {/* Top arc text */}
      <path id="stampTop" d="M 13,50 A 37,37 0 0,1 87,50" fill="none"/>
      <text fontSize="7.2" fontFamily="serif" fill="#C2410C" fontWeight="bold" letterSpacing="0.8">
        <textPath href="#stampTop" startOffset="3%">॥ श्री गणेश उत्सव मंडळ ॥</textPath>
      </text>

      {/* Bottom arc text */}
      <path id="stampBot" d="M 13,50 A 37,37 0 0,0 87,50" fill="none"/>
      <text fontSize="6.5" fontFamily="sans-serif" fill="#C2410C" fontWeight="600">
        <textPath href="#stampBot" startOffset="10%">— Ganeshotsav 2026 —</textPath>
      </text>

      {/* Center Om */}
      <text x="50" y="46" textAnchor="middle" fontSize="22" fill="#F97316"
            fontFamily="serif" fontWeight="bold">ॐ</text>

      {/* Est. year below Om */}
      <text x="50" y="57" textAnchor="middle" fontSize="6.5" fill="#7C2D12"
            fontFamily="sans-serif" fontWeight="700">स्था. १९८४</text>

      {/* Cardinal dots */}
      <circle cx="50" cy="27" r="2.2" fill="#FFD700"/>
      <circle cx="50" cy="73" r="2.2" fill="#FFD700"/>
    </svg>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function ReceiptPage() {
  const { receiptNo } = useParams()
  const location      = useLocation()
  const navigate      = useNavigate()

  const [donation, setDonation] = useState(location.state?.donation || null)
  const [flat, setFlat]         = useState(location.state?.flat || null)
  const [loading, setLoading]   = useState(!location.state?.donation)

  useEffect(() => {
    if (!donation) {
      getDonationByReceiptNo(receiptNo).then(({ data }) => {
        setDonation(data)
        setFlat(data?.flats || null)
        setLoading(false)
      })
    }
  }, [receiptNo])

  const handlePrint = () => window.print()

  const handleShare = async () => {
    const text =
      `🙏 Ganeshotsav 2026 Donation Receipt\n\n` +
      `Donor: ${donation.donor_name}\n` +
      `Flat: ${flat?.flat_number || donation.flat_id}\n` +
      `Amount: ₹${formatAmount(donation.amount)}\n` +
      `Receipt No: ${donation.receipt_no}\n` +
      `Mode: ${donation.payment_mode}\n\n` +
      `Thank you for your generous contribution! 🙏\n– Shri Ganesh Utsav Mandal`
    if (navigator.share) {
      await navigator.share({ title: 'Donation Receipt', text })
    } else {
      await navigator.clipboard.writeText(text)
      alert('Receipt details copied to clipboard!')
    }
  }

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `🙏 Ganeshotsav 2026 – Thank you for your donation!\n\n` +
      `Donor: ${donation.donor_name}\n` +
      `Amount: ₹${formatAmount(donation.amount)}\n` +
      `Receipt No: ${donation.receipt_no}\n` +
      `Mode: ${donation.payment_mode}\n\n` +
      `Jai Ganesh! 🙏`
    )
    const phone = donation.mobile ? donation.mobile.replace(/\D/g, '') : ''
    window.open(`https://wa.me/${phone ? '91' + phone : ''}?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-orange-50">
        <div className="text-center">
          <div className="text-5xl animate-bounce mb-3">🙏</div>
          <p className="text-gray-500">Loading receipt…</p>
        </div>
      </div>
    )
  }

  if (!donation) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-orange-50 px-6">
        <div className="text-center">
          <p className="text-2xl mb-2">❌</p>
          <p className="font-bold text-gray-700">Receipt not found</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    )
  }

  const flatNo        = flat?.flat_number || donation.flat_id
  const collectorName = donation.collected_by || ''

  return (
    <div className="min-h-dvh bg-gray-100">

      {/* Top bar — hidden on print */}
      <div className="no-print bg-gradient-to-r from-ganesh-deep to-ganesh-orange text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">🎉 Receipt Generated!</p>
            <p className="text-xs text-orange-100">{donation.receipt_no}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/20 active:bg-white/30 touch-manipulation"
          >
            <Home size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 max-w-md mx-auto">
        <div className="receipt-container bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-200">

          {/* ── HEADER ────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-ganesh-deep via-ganesh-orange to-ganesh-gold text-white text-center relative overflow-hidden">

            {/* Om watermark */}
            <div
              className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
              style={{ opacity: 0.06 }}
            >
              <span style={{ fontSize: 170, fontFamily: 'serif', lineHeight: 1 }}>ॐ</span>
            </div>

            {/* ── 2. Corner text: स्थापना left, वर्ष right ── */}
            <div className="relative z-10 flex justify-between items-start px-4 pt-3">
              <div className="text-left bg-black/15 rounded-lg px-2 py-1">
                <p className="text-orange-200 leading-tight" style={{ fontSize: '9px' }}>स्थापना</p>
                <p className="font-bold text-white leading-tight text-sm"
                   style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
                  १९८४
                </p>
              </div>
              <div className="text-right bg-black/15 rounded-lg px-2 py-1">
                <p className="text-orange-200 leading-tight" style={{ fontSize: '9px' }}>वर्ष</p>
                <p className="font-bold text-white leading-tight text-sm"
                   style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
                  ४३ वे
                </p>
              </div>
            </div>

            {/* ── 1. Ganpati illustration (replaces elephant emoji) ── */}
            <div className="relative z-10 flex justify-center pt-2 pb-1">
              <div style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                <GanpatiIllustration size={108} />
              </div>
            </div>

            {/* Mandal name */}
            <div className="relative z-10 pb-5">
              <h1
                className="text-2xl font-bold leading-tight"
                style={{
                  fontFamily: "'Tiro Devanagari Hindi', serif",
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                श्री गणेश उत्सव मंडळ
              </h1>
              <p className="text-orange-100 text-sm mt-0.5">
                {import.meta.env.VITE_MANDAL_NAME || 'Shri Ganesh Utsav Mandal'}
              </p>
              <p className="text-orange-200 text-xs mt-0.5">
                {import.meta.env.VITE_MANDAL_ADDRESS || '123, Main Road, Your City'}
              </p>
            </div>
          </div>

          {/* ── RECEIPT META ── */}
          <div className="bg-orange-50 border-b border-orange-200 px-5 py-2.5 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Receipt No.</p>
              <p className="font-bold text-ganesh-deep font-mono text-sm">{donation.receipt_no}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
              <p className="font-semibold text-gray-700 text-sm">{formatDate(donation.created_at)}</p>
            </div>
          </div>

          {/* ── DONATION DETAILS ── */}
          <div className="px-5 py-4 space-y-3">
            <Row label="Donor Name"   value={donation.donor_name} bold />
            <Row label="Flat No."     value={flatNo} />
            {donation.mobile && <Row label="Mobile" value={donation.mobile} />}
            <div className="border-t border-dashed border-orange-200 pt-3">
              <Row label="Amount" value={`₹ ${formatAmount(donation.amount)}`} bold large />
              <p className="text-xs text-gray-400 mt-0.5 italic">
                ({numberToWords(Number(donation.amount))} Rupees Only)
              </p>
            </div>
            <Row label="Payment Mode" value={donation.payment_mode} />
            {donation.transaction_id && (
              <Row label="Transaction ID" value={donation.transaction_id} mono />
            )}
            {donation.collected_by && (
              <Row label="Collected By" value={donation.collected_by} />
            )}
          </div>

          {/* ── THANK YOU ── */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-200 px-5 py-3 text-center">
            <p className="text-ganesh-deep font-bold text-base"
               style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
              🙏 गणपती बाप्पा मोरया!
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Thank you for your generous contribution to Ganeshotsav 2026
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {import.meta.env.VITE_MANDAL_CONTACT || '+91 98765 43210'}
            </p>
          </div>

          {/* ── 3 & 4. SIGNATURE + STAMP ── */}
          <div className="px-5 py-4 flex justify-between items-end border-t border-gray-100 gap-4">

            {/* Collector signature block */}
            <div className="text-center min-w-[110px]">
              {/* ── 3. Collector name shown as "signature" ── */}
              {collectorName ? (
                <p
                  className="text-ganesh-deep leading-tight mb-1"
                  style={{
                    fontFamily: "'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive",
                    fontSize: '16px',
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px',
                  }}
                >
                  {collectorName}
                </p>
              ) : (
                <div className="h-7 mb-1" />
              )}
              <div className="border-b-2 border-gray-500 w-28" />
              <p className="text-xs text-gray-500 mt-1">Collector's Signature</p>
            </div>

            {/* ── 4. Mandal Stamp SVG ── */}
            <div style={{ opacity: 0.82 }}>
              <MandalStamp />
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="bg-ganesh-deep text-white text-center py-2 px-4">
            <p className="text-xs opacity-80">Ganeshotsav 2026 · Digital Receipt System</p>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="no-print mt-4 space-y-3 pb-8">
          <button onClick={handleWhatsApp} className="btn-success">
            <span className="flex items-center justify-center gap-2">
              <MessageCircle size={18} />
              Share on WhatsApp
            </span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handlePrint} className="btn-secondary">
              <span className="flex items-center justify-center gap-2">
                <Printer size={16} /> Print / PDF
              </span>
            </button>
            <button onClick={handleShare} className="btn-secondary">
              <span className="flex items-center justify-center gap-2">
                <Share2 size={16} /> Share
              </span>
            </button>
          </div>

          <button
            onClick={() => navigate(-2)}
            className="w-full text-center text-ganesh-orange font-semibold py-2 active:opacity-70 touch-manipulation"
          >
            ← Back to Flat Grid
          </button>
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
        ${large ? 'text-xl text-ganesh-deep' : 'text-sm'}
        ${mono  ? 'font-mono text-xs'        : ''}
      `.trim()}>
        {value}
      </p>
    </div>
  )
}
