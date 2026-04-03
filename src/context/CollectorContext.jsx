import { createContext, useContext, useState } from 'react'
import supabase from '../supabase'

const CollectorContext = createContext(null)

const useMock = !import.meta.env.VITE_SUPABASE_URL

// Mock volunteers for dev mode
const MOCK_VOLUNTEERS = [
  { id: '1', name: 'Rahul Sharma',   pin: '1234' },
  { id: '2', name: 'Priya Patil',    pin: '2345' },
  { id: '3', name: 'Amit Desai',     pin: '3456' },
]
const MOCK_ADMIN_PASSWORD = 'admin123'

export function CollectorProvider({ children }) {
  const [collectorName, setCollectorName] = useState(
    () => localStorage.getItem('gs_collector') || ''
  )
  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem('gs_admin') === 'true'
  )

  // Volunteer PIN login
  const loginVolunteer = async (name, pin) => {
    if (useMock) {
      const v = MOCK_VOLUNTEERS.find(
        x => x.name.toLowerCase() === name.toLowerCase() && x.pin === pin
      )
      if (!v) return { error: 'Invalid name or PIN' }
      localStorage.setItem('gs_collector', v.name)
      setCollectorName(v.name)
      return { error: null }
    }

    const { data, error } = await supabase
      .from('volunteers')
      .select('name, pin')
      .eq('is_active', true)
      .ilike('name', name.trim())
      .single()

    if (error || !data) return { error: 'Volunteer not found' }
    if (data.pin !== pin.trim()) return { error: 'Incorrect PIN' }

    localStorage.setItem('gs_collector', data.name)
    setCollectorName(data.name)
    return { error: null }
  }

  // Admin password login
  const loginAdmin = async (password) => {
    if (useMock) {
      if (password !== MOCK_ADMIN_PASSWORD) return { error: 'Incorrect password' }
      localStorage.setItem('gs_admin', 'true')
      setIsAdmin(true)
      return { error: null }
    }

    const { data, error } = await supabase
      .from('admin_config')
      .select('password')
      .eq('id', 1)
      .single()

    if (error || !data) return { error: 'Could not verify password' }
    if (data.password !== password) return { error: 'Incorrect password' }

    localStorage.setItem('gs_admin', 'true')
    setIsAdmin(true)
    return { error: null }
  }

  const logout = () => {
    localStorage.removeItem('gs_collector')
    localStorage.removeItem('gs_admin')
    setCollectorName('')
    setIsAdmin(false)
  }

  return (
    <CollectorContext.Provider value={{
      collectorName, isAdmin, loginVolunteer, loginAdmin, logout
    }}>
      {children}
    </CollectorContext.Provider>
  )
}

export function useCollector() {
  return useContext(CollectorContext)
}
