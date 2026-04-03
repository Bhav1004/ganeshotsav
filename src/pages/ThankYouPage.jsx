import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function ThankYouPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { receiptNo, donation, flat } = location.state || {}
  const [phase, setPhase] = useState(0) // 0=enter, 1=show, 2=exit

  useEffect(() => {
    if (!receiptNo) { navigate('/', { replace: true }); return }
    // Phase timeline
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => setPhase(2), 2800)
    const t3 = setTimeout(() => {
      navigate(`/receipt/${receiptNo}`, { state: { donation, flat }, replace: true })
    }, 3300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const skip = () => navigate(`/receipt/${receiptNo}`, { state: { donation, flat }, replace: true })

  const amount = donation?.amount ? Number(donation.amount).toLocaleString('en-IN') : ''

  return (
    <div
      onClick={skip}
      className="min-h-dvh flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 40%, #f97316 70%, #fbbf24 100%)',
        transition: 'opacity 0.5s ease',
        opacity: phase === 2 ? 0 : 1,
      }}
    >
      {/* Confetti particles */}
      <Confetti active={phase === 1} />

      {/* Main content */}
      <div
        style={{
          transform: phase === 1 ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(30px)',
          opacity:   phase === 1 ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className="text-center px-8 z-10"
      >
        {/* Ganpati */}
        <div className="text-9xl mb-4 drop-shadow-2xl" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}>
          🙏
        </div>

        <h1
          className="text-4xl font-bold text-white mb-2 drop-shadow-lg"
          style={{ fontFamily: "'Tiro Devanagari Hindi', serif", textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
        >
          गणपती बाप्पा
        </h1>
        <h2
          className="text-3xl font-bold text-yellow-200 mb-6 drop-shadow-lg"
          style={{ fontFamily: "'Tiro Devanagari Hindi', serif", textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
        >
          मोरया! 🎉
        </h2>

        {amount && (
          <div className="bg-white/20 backdrop-blur-sm rounded-3xl px-8 py-4 mb-4 border border-white/30">
            <p className="text-white/80 text-sm font-medium mb-1">Donation Received</p>
            <p className="text-white font-bold text-4xl drop-shadow">₹{amount}</p>
          </div>
        )}

        <p className="text-orange-100 text-base font-medium">
          Thank you for your generous contribution!
        </p>
        <p className="text-orange-200 text-sm mt-1">
          Shri Ganesh Utsav Mandal 2026
        </p>
      </div>

      {/* Tap to skip */}
      <p
        className="absolute bottom-10 text-white/50 text-xs"
        style={{ opacity: phase === 1 ? 1 : 0, transition: 'opacity 1s ease 1s' }}
      >
        Tap anywhere to skip
      </p>
    </div>
  )
}

// ── Confetti component ────────────────────────────────────────────────────────
function Confetti({ active }) {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left:  `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.5}s`,
    dur:   `${1.5 + Math.random() * 1.5}s`,
    size:  `${8 + Math.random() * 10}px`,
    color: ['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#FFA07A','#98D8C8','#F7DC6F','#BB8FCE'][Math.floor(Math.random() * 8)],
    rotate: `${Math.random() * 360}deg`,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  }))

  if (!active) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotate})`,
            animation: `confettiFall ${p.dur} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
