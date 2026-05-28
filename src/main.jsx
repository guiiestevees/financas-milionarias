import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './hooks/useAuth'
import { bootstrapTheme } from './hooks/useTheme'
import App from './App'
import './index.css'

// Aplica o tema salvo ANTES de montar o React.
// Sem isso, o app pisca em dark e depois muda pra light.
bootstrapTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
