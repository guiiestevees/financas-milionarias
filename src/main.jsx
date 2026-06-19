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
