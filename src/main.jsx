import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './hooks/useAuth'
import { RevenueCatProvider } from './hooks/useRevenueCat'
import { bootstrapTheme } from './hooks/useTheme'
import { initNativeApp } from './lib/nativeInit'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import './index.css'

// Aplica o tema salvo ANTES de montar o React.
// Sem isso, o app pisca em dark e depois muda pra light.
bootstrapTheme()

// Inicializa integrações nativas (StatusBar, SplashScreen, etc).
// Em web puro, faz nada — early return interno.
initNativeApp()

// Quando um campo recebe foco (ex.: no cadastro), rola pra ele ficar VISÍVEL
// acima do teclado. Sem isso, em telas com vários campos a pessoa não enxerga
// o que está digitando. O delay espera o teclado terminar de abrir.
if (typeof window !== 'undefined') {
  window.addEventListener('focusin', (e) => {
    // No app nativo, a rolagem é feita no evento keyboardDidShow (nativeInit),
    // que dispara DEPOIS da tela encolher — timing certo. Aqui é só pro web/PWA.
    if (window.Capacitor?.isNativePlatform?.()) return
    const el = e.target
    const tag = el?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      setTimeout(() => {
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch (_) { /* ignore */ }
      }, 350)
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <RevenueCatProvider>
          <App />
        </RevenueCatProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
