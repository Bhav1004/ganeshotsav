import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollector } from '../context/CollectorContext'

export default function LoginPage() {
  const [name, setName] = useState('')
  const { login } = useCollector()
  const navigate   = useNavigate()

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    login(trimmed)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col items-center justify-center px-6">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-8xl mb-4 drop-shadow-lg">🙏</div>
        <h1
          className="text-3xl font-bold text-ganesh-deep leading-tight"
          style={{ fontFamily: "'Tiro Devanagari Hindi', serif" }}
        >
          गणेशोत्सव 2026
        </h1>
        <p className="text-ganesh-orange font-semibold text-lg mt-1">
          Donation Collection App
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Shri Ganesh Utsav Mandal
        </p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-orange-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Welcome, Volunteer!</h2>
        <p className="text-gray-500 text-sm mb-5">Enter your name to start collecting</p>

        <input
          className="input-field mb-4"
          type="text"
          placeholder="Your full name (e.g. Rahul Sharma)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!name.trim()}
        >
          🚀 Start Collecting
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">
        Ganeshotsav 2026 · Digital Receipt System
      </p>
    </div>
  )
}
