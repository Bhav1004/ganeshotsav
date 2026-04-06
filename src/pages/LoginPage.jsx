import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollector } from '../context/CollectorContext'
import { Eye, EyeOff, Shield, User } from 'lucide-react'

export default function LoginPage() {
  const { loginVolunteer, loginAdmin } = useCollector()
  const navigate = useNavigate()

  const [tab, setTab]         = useState('volunteer') // 'volunteer' | 'admin'
  const [name, setName]       = useState('')
  const [pin, setPin]         = useState('')
  const [adminPw, setAdminPw] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleVolunteer = async () => {
    setError('')
    if (!name.trim()) return setError('Please enter your name')
    if (pin.length !== 4) return setError('PIN must be 4 digits')
    setLoading(true)
    const { error: err } = await loginVolunteer(name, pin)
    setLoading(false)
    if (err) return setError(err)
    navigate('/', { replace: true })
  }

  const handleAdmin = async () => {
    setError('')
    if (!adminPw.trim()) return setError('Please enter the admin password')
    setLoading(true)
    const { error: err } = await loginAdmin(adminPw)
    setLoading(false)
    if (err) return setError(err)
    navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col items-center justify-center px-6">

      {/* Hero */}
      <div className="text-center mb-8">
        <div className="text-8xl mb-3 drop-shadow-lg">🙏</div>
        <h1 className="text-3xl font-bold text-ganesh-deep leading-tight"
            style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}>
          BGMM गणेशोत्सव 2026
        </h1>
        <p className="text-ganesh-orange font-semibold text-lg mt-1">BGMM Ganeshotsav 2026</p>
        <p className="text-gray-500 text-sm mt-1">बाल गोपाळ मित्र मंडळ</p>
      </div>

      {/* Tab switcher */}
      <div className="w-full max-w-sm bg-orange-100 rounded-2xl p-1 flex mb-4">
        <button
          onClick={() => { setTab('volunteer'); setError('') }}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
            tab === 'volunteer' ? 'bg-white text-ganesh-deep shadow-sm' : 'text-gray-500'
          }`}
        >
          <User size={15} /> Volunteer
        </button>
        <button
          onClick={() => { setTab('admin'); setError('') }}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
            tab === 'admin' ? 'bg-white text-ganesh-deep shadow-sm' : 'text-gray-500'
          }`}
        >
          <Shield size={15} /> Admin
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-orange-100 p-6">

        {tab === 'volunteer' ? (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Volunteer Login</h2>
            <p className="text-gray-500 text-sm mb-5">Enter your name and 4-digit PIN</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Your Name</label>
                <input
                  className="input-field"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoCapitalize="words"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">4-Digit PIN</label>
                <div className="relative">
                  <input
                    className="input-field pr-12 tracking-[0.4em] text-center text-xl font-bold"
                    placeholder="••••"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    onKeyDown={e => e.key === 'Enter' && handleVolunteer()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* PIN dots indicator */}
                <div className="flex justify-center gap-3 mt-2">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`w-3 h-3 rounded-full transition-all ${
                      i < pin.length ? 'bg-ganesh-orange scale-110' : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button className="btn-primary mt-5" onClick={handleVolunteer} disabled={loading}>
              {loading ? '⏳ Verifying…' : '🚀 Start Collecting'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Admin Login</h2>
            <p className="text-gray-500 text-sm mb-5">Enter the admin password to view reports</p>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Admin Password</label>
              <div className="relative">
                <input
                  className="input-field pr-12"
                  placeholder="Enter admin password"
                  type={showPw ? 'text' : 'password'}
                  value={adminPw}
                  onChange={e => setAdminPw(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdmin()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button className="btn-primary mt-5" onClick={handleAdmin} disabled={loading}>
              {loading ? '⏳ Verifying…' : '🔐 Enter Admin Panel'}
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        BGMM Ganeshotsav 2026 · Digital Receipt System
      </p>
    </div>
  )
}