import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useVerified } from './hooks/useVerified'
import AppShell from './pages/app/AppShell'
import Assinar from './pages/app/Assinar'
import AuthLayout from './pages/auth/AuthLayout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Confirm from './pages/auth/Confirm'
import VerifyAccount from './pages/auth/VerifyAccount'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'
import Landing from './pages/Landing'

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#070912' }}>
      <div className="text-white/30 text-sm">Carregando…</div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const { verified, loading: vLoading } = useVerified()
  if (loading || vLoading) return <FullscreenLoader />
  if (!user) return <Navigate to="/login" replace />
  // Conta não verificada → forçar verificação antes de acessar o app
  if (verified === false) return <Navigate to="/verify" replace />
  return children
}

// Rota /verify só pra logados que AINDA NÃO verificaram
function VerifyRoute({ children }) {
  const { user, loading } = useAuth()
  const { verified, loading: vLoading } = useVerified()
  if (loading || vLoading) return <FullscreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (verified === true) return <Navigate to="/app" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (user) return <Navigate to="/app" replace />
  return children
}

// Rota raiz "/": decide se mostra a landing (não-logado) ou o app
function RootRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (user) return <Navigate to="/app" replace />
  return <Landing />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Raiz: landing pra visitantes / redirect pro app pra logados */}
        <Route path="/" element={<RootRoute />} />

        {/* App protegido (logado) */}
        <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
        <Route path="/assinar" element={<ProtectedRoute><Assinar /></ProtectedRoute>} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfUse />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/verify" element={<VerifyRoute><VerifyAccount /></VerifyRoute>} />
        </Route>

        {/* Fallback: tudo desconhecido vai pra raiz */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
