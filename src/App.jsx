import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CollectorProvider, useCollector } from './context/CollectorContext'
import LoginPage        from './pages/LoginPage'
import BuildingsPage    from './pages/BuildingsPage'
import WingsPage        from './pages/WingsPage'
import FlatsPage        from './pages/FlatsPage'
import DonationForm     from './pages/DonationForm'
import ReceiptPage      from './pages/ReceiptPage'
import ReportsPage      from './pages/ReportsPage'
import AdminPage        from './pages/AdminPage'
import SearchPage       from './pages/SearchPage'
import ThankYouPage     from './pages/ThankYouPage'
import LookupPage       from './pages/LookupPage'
import SpecialListPage  from './pages/SpecialListPage'
import SpecialFormPage  from './pages/SpecialFormPage'
import HandoverPage     from './pages/HandoverPage'
import SettingsPage     from './pages/SettingsPage'

function VolunteerRoute({ children }) {
  const { collectorName } = useCollector()
  if (!collectorName) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAdmin } = useCollector()
  if (!isAdmin) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/login"                   element={<LoginPage />} />
      <Route path="/lookup"                  element={<LookupPage />} />
      <Route path="/receipt-view/:receiptNo" element={<ReceiptPage publicMode />} />

      {/* ── Volunteer ── */}
      <Route path="/"                            element={<VolunteerRoute><BuildingsPage /></VolunteerRoute>} />
      <Route path="/buildings/:buildingId/wings" element={<VolunteerRoute><WingsPage /></VolunteerRoute>} />
      <Route path="/wings/:wingId/flats"         element={<VolunteerRoute><FlatsPage /></VolunteerRoute>} />
      <Route path="/flats/:flatId/donate"        element={<VolunteerRoute><DonationForm /></VolunteerRoute>} />
      <Route path="/thankyou"                    element={<VolunteerRoute><ThankYouPage /></VolunteerRoute>} />
      <Route path="/receipt/:receiptNo"          element={<VolunteerRoute><ReceiptPage /></VolunteerRoute>} />
      <Route path="/reports"                     element={<VolunteerRoute><ReportsPage /></VolunteerRoute>} />
      <Route path="/search"                      element={<VolunteerRoute><SearchPage /></VolunteerRoute>} />

      {/* ── Special Collections ── */}
      <Route path="/special"     element={<VolunteerRoute><SpecialListPage /></VolunteerRoute>} />
      <Route path="/special/new" element={<VolunteerRoute><SpecialFormPage /></VolunteerRoute>} />
      <Route path="/special/:id" element={<VolunteerRoute><SpecialFormPage /></VolunteerRoute>} />
      <Route path="/handover"    element={<VolunteerRoute><HandoverPage /></VolunteerRoute>} />
      <Route path="/settings"    element={<VolunteerRoute><SettingsPage /></VolunteerRoute>} />

      <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />

      {/* ── Admin ── */}
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

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