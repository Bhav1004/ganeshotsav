import { createContext, useContext, useState, useEffect } from 'react'

const CollectorContext = createContext(null)

export function CollectorProvider({ children }) {
  const [collectorName, setCollectorName] = useState(() =>
    localStorage.getItem('gs_collector') || ''
  )

  const login = (name) => {
    localStorage.setItem('gs_collector', name)
    setCollectorName(name)
  }

  const logout = () => {
    localStorage.removeItem('gs_collector')
    setCollectorName('')
  }

  return (
    <CollectorContext.Provider value={{ collectorName, login, logout }}>
      {children}
    </CollectorContext.Provider>
  )
}

export function useCollector() {
  return useContext(CollectorContext)
}
