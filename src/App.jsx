import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppShell from './pages/app/AppShell'
import AuthLayout from './pages/auth/AuthLayout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Confirm from './pages/auth/Confirm'
import PrivacyPolicy from './pages/PrivacyPolicy'

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#070912' }}>
      <div className="text-white/30 text-sm">Carregando…</div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm" element={<Confirm />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
