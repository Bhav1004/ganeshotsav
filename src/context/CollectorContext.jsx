import { createContext, useContext, useState } from 'react'
import supabase from '../supabase'

const CollectorContext = createContext(null)
const useMock = !import.meta.env.VITE_SUPABASE_URL

const MOCK_VOLUNTEERS = [
  { id: '1', name: 'Rahul Sharma',   pin: '1234', logged_in: false, assigned_buildings: [] },
  { id: '2', name: 'Priya Patil',    pin: '2345', logged_in: false, assigned_buildings: [] },
  { id: '3', name: 'Amit Desai',     pin: '3456', logged_in: false, assigned_buildings: [] },
]
const MOCK_ADMIN_PASSWORD = 'admin123'

function genToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function CollectorProvider({ children }) {
  const [collectorName, setCollectorName]   = useState(() => localStorage.getItem('gs_collector') || '')
  const [collectorId, setCollectorId]       = useState(() => localStorage.getItem('gs_collector_id') || '')
  const [sessionToken, setSessionToken]     = useState(() => localStorage.getItem('gs_session') || '')
  const [assignedBuildings, setAssignedBuildings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gs_assigned') || '[]') } catch { return [] }
  })
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('gs_admin') === 'true')

  const loginVolunteer = async (name, pin) => {
    if (useMock) {
      const v = MOCK_VOLUNTEERS.find(
        x => x.name.toLowerCase() === name.trim().toLowerCase() && x.pin === pin
      )
      if (!v) return { error: 'Invalid name or PIN' }
      if (v.logged_in) return { error: 'Already logged in on another device. Ask admin to unlock.' }
      v.logged_in = true
      const token = genToken()
      localStorage.setItem('gs_collector', v.name)
      localStorage.setItem('gs_collector_id', v.id)
      localStorage.setItem('gs_session', token)
      localStorage.setItem('gs_assigned', JSON.stringify(v.assigned_buildings || []))
      setCollectorName(v.name)
      setCollectorId(v.id)
      setSessionToken(token)
      setAssignedBuildings(v.assigned_buildings || [])
      return { error: null }
    }

    const { data: v, error } = await supabase
      .from('volunteers')
      .select('id, name, pin, logged_in, assigned_buildings')
      .ilike('name', name.trim())
      .eq('is_active', true)
      .single()

    if (error || !v) return { error: 'Volunteer not found' }
    if (v.pin !== pin.trim()) return { error: 'Incorrect PIN' }
    if (v.logged_in) return { error: 'Already logged in on another device. Ask admin to unlock.' }

    const token = genToken()
    await supabase.from('volunteers').update({
      logged_in: true,
      session_token: token,
      last_login: new Date().toISOString(),
    }).eq('id', v.id)

    localStorage.setItem('gs_collector', v.name)
    localStorage.setItem('gs_collector_id', v.id)
    localStorage.setItem('gs_session', token)
    localStorage.setItem('gs_assigned', JSON.stringify(v.assigned_buildings || []))
    setCollectorName(v.name)
    setCollectorId(v.id)
    setSessionToken(token)
    setAssignedBuildings(v.assigned_buildings || [])
    return { error: null }
  }

  const loginAdmin = async (password) => {
    if (useMock) {
      if (password !== MOCK_ADMIN_PASSWORD) return { error: 'Incorrect password' }
      localStorage.setItem('gs_admin', 'true')
      setIsAdmin(true)
      return { error: null }
    }
    const { data, error } = await supabase
      .from('admin_config').select('password').eq('id', 1).single()
    if (error || !data) return { error: 'Could not verify password' }
    if (data.password !== password) return { error: 'Incorrect password' }
    localStorage.setItem('gs_admin', 'true')
    setIsAdmin(true)
    return { error: null }
  }

  const logout = async () => {
    if (!useMock && collectorId) {
      await supabase.from('volunteers')
        .update({ logged_in: false, session_token: null })
        .eq('id', collectorId)
    }
    if (useMock) {
      const v = MOCK_VOLUNTEERS.find(x => x.id === collectorId)
      if (v) v.logged_in = false
    }
    localStorage.removeItem('gs_collector')
    localStorage.removeItem('gs_collector_id')
    localStorage.removeItem('gs_session')
    localStorage.removeItem('gs_assigned')
    localStorage.removeItem('gs_admin')
    setCollectorName('')
    setCollectorId('')
    setSessionToken('')
    setAssignedBuildings([])
    setIsAdmin(false)
  }

  return (
    <CollectorContext.Provider value={{
      collectorName, collectorId, sessionToken,
      assignedBuildings, isAdmin,
      loginVolunteer, loginAdmin, logout,
    }}>
      {children}
    </CollectorContext.Provider>
  )
}

export function useCollector() {
  return useContext(CollectorContext)
}