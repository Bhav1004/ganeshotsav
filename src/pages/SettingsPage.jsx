import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, ShieldCheck, LogOut } from 'lucide-react'
import Header from '../components/Header'
import { changeVolunteerPin, changeAdminPassword } from '../api'
import { useCollector } from '../context/CollectorContext'

function PinDots({ length }) {
  return (
    <div className="flex justify-center gap-3 mt-2">
      {[0,1,2,3].map(i => (
        <div key={i} className={`w-3 h-3 rounded-full transition-all ${
          i < length ? 'bg-ganesh-orange scale-110' : 'bg-gray-200'
        }`}/>
      ))}
    </div>
  )
}

function PinField({ label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          className="input-field pr-12 tracking-[0.4em] text-center text-xl font-bold"
          placeholder={placeholder || '••••'}
          type={show ? 'text' : 'password'}
          inputMode="numeric"
          maxLength={4}
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation">
          {show ? <EyeOff size={18}/> : <Eye size={18}/>}
        </button>
      </div>
      <PinDots length={value.length}/>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { collectorName, collectorId, isAdmin, logout } = useCollector()
  const backPath = isAdmin ? '/admin' : '/'

  // PIN change state
  const [oldPin, setOldPin]         = useState('')
  const [newPin, setNewPin]         = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showOld, setShowOld]       = useState(false)
  const [showNew, setShowNew]       = useState(false)
  const [showConf, setShowConf]     = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError]     = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)

  // Admin password state
  const [oldPw, setOldPw]     = useState('')
  const [newPw, setNewPw]     = useState('')
  const [confPw, setConfPw]   = useState('')
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError]     = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handlePinChange = async () => {
    setPinError('')
    if (oldPin.length !== 4) return setPinError('Enter your current 4-digit PIN')
    if (newPin.length !== 4) return setPinError('New PIN must be 4 digits')
    if (newPin !== confirmPin) return setPinError('New PINs do not match')
    if (newPin === oldPin) return setPinError('New PIN must be different from current PIN')
    setPinLoading(true)
    const { error } = await changeVolunteerPin(collectorId, oldPin, newPin)
    setPinLoading(false)
    if (error) return setPinError(error)
    setOldPin(''); setNewPin(''); setConfirmPin('')
    setPinSuccess(true)
    setTimeout(() => setPinSuccess(false), 4000)
  }

  const handlePasswordChange = async () => {
    setPwError('')
    if (!oldPw.trim()) return setPwError('Enter your current password')
    if (newPw.length < 6) return setPwError('New password must be at least 6 characters')
    if (newPw !== confPw) return setPwError('New passwords do not match')
    if (newPw === oldPw) return setPwError('New password must be different')
    setPwLoading(true)
    const { error } = await changeAdminPassword(oldPw, newPw)
    setPwLoading(false)
    if (error) return setPwError(error)
    setOldPw(''); setNewPw(''); setConfPw('')
    setPwSuccess(true)
    setTimeout(() => setPwSuccess(false), 4000)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-orange-50">
      <Header title="⚙️ Settings"/>

      <div className="px-4 py-4 space-y-5 pb-10">

        {/* Who is logged in */}
        <div className="bg-white rounded-2xl border border-orange-100 px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center text-ganesh-orange font-bold text-lg flex-shrink-0">
            {(collectorName || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-800">{collectorName || 'Admin'}</p>
            <p className="text-xs text-gray-500">{isAdmin ? '🛡️ Admin' : '🙋 Volunteer'}</p>
          </div>
        </div>

        {/* ── Volunteer PIN change ── */}
        {!isAdmin && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-ganesh-orange"/>
              <p className="font-bold text-gray-800">Change PIN</p>
            </div>

            <PinField
              label="Current PIN"
              value={oldPin}
              onChange={setOldPin}
              show={showOld}
              onToggle={() => setShowOld(s => !s)}
            />
            <PinField
              label="New PIN"
              value={newPin}
              onChange={setNewPin}
              show={showNew}
              onToggle={() => setShowNew(s => !s)}
            />
            <PinField
              label="Confirm New PIN"
              value={confirmPin}
              onChange={setConfirmPin}
              show={showConf}
              onToggle={() => setShowConf(s => !s)}
            />

            {pinError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                ⚠️ {pinError}
              </div>
            )}
            {pinSuccess && (
              <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-green-700 text-sm font-semibold text-center">
                ✅ PIN changed successfully!
              </div>
            )}

            <button className="btn-primary" onClick={handlePinChange} disabled={pinLoading}>
              {pinLoading ? '⏳ Updating…' : '🔐 Update PIN'}
            </button>
          </div>
        )}

        {/* ── Admin password change ── */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-orange-100 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-ganesh-orange"/>
              <p className="font-bold text-gray-800">Change Admin Password</p>
            </div>

            {[
              { label: 'Current Password', val: oldPw, set: setOldPw, show: showOldPw, toggle: () => setShowOldPw(s => !s) },
              { label: 'New Password',     val: newPw, set: setNewPw, show: showNewPw, toggle: () => setShowNewPw(s => !s) },
              { label: 'Confirm New Password', val: confPw, set: setConfPw, show: showNewPw, toggle: () => setShowNewPw(s => !s) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label}>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{label}</label>
                <div className="relative">
                  <input
                    className="input-field pr-12"
                    placeholder={`Enter ${label.toLowerCase()}`}
                    type={show ? 'text' : 'password'}
                    value={val}
                    onChange={e => set(e.target.value)}
                  />
                  <button type="button" onClick={toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 touch-manipulation">
                    {show ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>
            ))}

            {pwError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                ⚠️ {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-green-700 text-sm font-semibold text-center">
                ✅ Password changed successfully!
              </div>
            )}

            <button className="btn-primary" onClick={handlePasswordChange} disabled={pwLoading}>
              {pwLoading ? '⏳ Updating…' : '🔐 Update Password'}
            </button>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 font-semibold active:scale-95 transition-transform touch-manipulation"
        >
          <LogOut size={18}/> Logout
        </button>
      </div>
    </div>
  )
}