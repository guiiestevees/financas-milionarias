import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useVerified } from './hooks/useVerified'
import { useAppPreference } from './hooks/useAppPreference'
import AppShell from './pages/app/AppShell'
import Assinar from './pages/app/Assinar'
import AuthLayout from './pages/auth/AuthLayout'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Confirm from './pages/auth/Confirm'
import VerifyAccount from './pages/auth/VerifyAccount'
import Comecar from './pages/auth/Comecar'
import AdminPage from './pages/admin/AdminPage'
import Tutorial from './pages/app/Tutorial'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfUse from './pages/TermsOfUse'
import Landing from './pages/Landing'
import Launcher from './pages/launcher/Launcher'
import AgendaShell from './pages/agenda/AgendaShell'
import NativeCheckoutBlock from './pages/NativeCheckoutBlock'
import MobileAppBanner from './components/MobileAppBanner'
import { isNativeApp } from './lib/platform'

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
      <div className="text-white/30 text-sm">Carregando…</div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (!user) return <Navigate to="/login" replace />
  // Verificação não bloqueia mais — vira um banner opcional dentro do app
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
  if (user) return <Navigate to="/inicio" replace />
  return children
}

// Rota raiz "/": decide se mostra a landing (não-logado) ou o app preferido
function RootRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (user) return <Navigate to="/inicio" replace />
  return <Landing />
}

// Rota "/inicio": entrypoint pós-login. Decide pra onde mandar baseado
// na preferência do usuário (Launcher, Finanças ou Agenda).
function StartRoute() {
  const { user, loading } = useAuth()
  const { defaultApp } = useAppPreference()
  if (loading) return <FullscreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (defaultApp === 'financas') return <Navigate to="/app" replace />
  if (defaultApp === 'agenda') return <Navigate to="/agenda" replace />
  return <Navigate to="/launcher" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Banner topo sugerindo baixar app nativo (só mobile web, com URLs configuradas) */}
      <MobileAppBanner />
      <Routes>
        {/* Raiz: landing pra visitantes / redirect pro app pra logados */}
        <Route path="/" element={<RootRoute />} />

        {/* Entrypoint pós-login: decide pra onde mandar baseado em preferência */}
        <Route path="/inicio" element={<StartRoute />} />

        {/* Launcher — menu de apps */}
        <Route path="/launcher" element={<ProtectedRoute><Launcher /></ProtectedRoute>} />

        {/* App de Finanças (rota mantida pra não quebrar links existentes) */}
        <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />

        {/* App de Agenda */}
        <Route path="/agenda" element={<ProtectedRoute><AgendaShell /></ProtectedRoute>} />

        {/* /assinar — checkout completo no web, ou mensagem neutra no app nativo (Reader App) */}
        <Route path="/assinar" element={
          <ProtectedRoute>
            {isNativeApp() ? <NativeCheckoutBlock variant="manage" /> : <Assinar />}
          </ProtectedRoute>
        } />

        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos" element={<TermsOfUse />} />

        {/* /comecar — signup + checkout no web, ou redireciona pro login no nativo */}
        <Route path="/comecar" element={
          isNativeApp() ? <NativeCheckoutBlock variant="signup" /> : <Comecar />
        } />

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
