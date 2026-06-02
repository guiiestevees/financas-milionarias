// Detecção de plataforma — diferencia PWA/web do app nativo (Capacitor).
//
// Quando o app for empacotado com Capacitor.js, window.Capacitor.isNativePlatform()
// retorna true. Antes disso (modo dev/PWA), retorna false.
//
// IMPORTANTE — Reader App: quando isNativeApp() === true, escondemos
// caminhos de pagamento (preços, botões de assinar, checkout, etc) pra
// cumprir as regras da Apple/Google e não pagar comissão de 15-30%.
//
// PRA TESTAR no browser sem ter Capacitor instalado:
// - adicione ?native=1 na URL OU
// - cole no console: localStorage.setItem('domus:simulate-native', '1')
// (use isso só pra desenvolvimento — em prod o flag manual é ignorado)

const SIMULATE_KEY = 'domus:simulate-native'

let simulateOverride = null  // cache

function readSimulateFlag() {
  if (typeof window === 'undefined') return false
  if (simulateOverride !== null) return simulateOverride
  // URL param tem prioridade
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('native') === '1') {
      localStorage.setItem(SIMULATE_KEY, '1')
      simulateOverride = true
      return true
    }
    if (params.get('native') === '0') {
      localStorage.removeItem(SIMULATE_KEY)
      simulateOverride = false
      return false
    }
  } catch (e) { /* ignore */ }
  // Fallback: localStorage
  try {
    simulateOverride = localStorage.getItem(SIMULATE_KEY) === '1'
    return simulateOverride
  } catch (e) {
    simulateOverride = false
    return false
  }
}

export function isNativeApp() {
  if (typeof window === 'undefined') return false
  // Capacitor real
  if (window.Capacitor?.isNativePlatform?.()) return true
  if (window.Capacitor?.platform === 'ios' || window.Capacitor?.platform === 'android') return true
  // Simulação local (dev)
  return readSimulateFlag()
}

export function isIOSApp() {
  if (typeof window === 'undefined') return false
  return window.Capacitor?.platform === 'ios'
}

export function isAndroidApp() {
  if (typeof window === 'undefined') return false
  return window.Capacitor?.platform === 'android'
}

export function isWeb() {
  return !isNativeApp()
}

// URL canônica do site (pra mensagens "acesse em meudomus.com")
export const WEB_APP_URL = 'meudomus.com'
export const WEB_APP_URL_FULL = 'https://meudomus.com'
