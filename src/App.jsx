import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CollectorProvider, useCollector } from './context/CollectorContext'
import LoginPage    from './pages/LoginPage'
import BuildingsPage from './pages/BuildingsPage'
import WingsPage    from './pages/WingsPage'
import FlatsPage    from './pages/FlatsPage'
import DonationForm from './pages/DonationForm'
import ReceiptPage  from './pages/ReceiptPage'
import ReportsPage  from './pages/ReportsPage'

function ProtectedRoute({ children }) {
  const { collectorName } = useCollector()
  if (!collectorName) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><BuildingsPage /></ProtectedRoute>} />
      <Route path="/buildings/:buildingId/wings" element={<ProtectedRoute><WingsPage /></ProtectedRoute>} />
      <Route path="/wings/:wingId/flats" element={<ProtectedRoute><FlatsPage /></ProtectedRoute>} />
      <Route path="/flats/:flatId/donate" element={<ProtectedRoute><DonationForm /></ProtectedRoute>} />
      <Route path="/receipt/:receiptNo" element={<ProtectedRoute><ReceiptPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CollectorProvider>
        <AppRoutes />
      </CollectorProvider>
    </BrowserRouter>
  )
}
