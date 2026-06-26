// Inicialização do app nativo (Capacitor).
// Setup de StatusBar, SplashScreen, Keyboard handlers, etc.
//
// Chamado em src/main.jsx logo no boot. Em web puro, faz nada.

import { Capacitor } from '@capacitor/core'
import { WEB_APP_URL_FULL } from './platform'

// No app nativo o webview roda em capacitor://localhost, então chamadas
// relativas como fetch('/api/...') apontariam pra um host local inexistente.
// Reescrevemos essas chamadas pro backend de produção (meudomus.com), que
// agora libera CORS (ver api/_cors.js). Cobre TODAS as chamadas /api de uma vez.
function patchApiFetch() {
  if (typeof window === 'undefined' || window.__domusApiFetchPatched) return
  const orig = window.fetch.bind(window)
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        input = WEB_APP_URL_FULL + input
      }
    } catch (e) { /* ignore */ }
    return orig(input, init)
  }
  window.__domusApiFetchPatched = true
}

export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return

  // Redireciona chamadas /api pro backend de produção (precisa rodar antes
  // de qualquer fetch — por isso é a primeira coisa no init nativo).
  patchApiFetch()

  try {
    // ===== STATUS BAR =====
    // Segue o tema do app (padrão claro). bootstrapTheme() já rodou antes daqui,
    // então o data-theme no <html> reflete o tema salvo (light por padrão).
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    try {
      const isLight = document.documentElement.getAttribute('data-theme') !== 'dark'
      // Style.Light = ícones escuros (pra fundo claro); Style.Dark = ícones claros (fundo escuro)
      await StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark })
      await StatusBar.setBackgroundColor({ color: isLight ? '#f5f4ef' : '#0a0e1a' })
      await StatusBar.setOverlaysWebView({ overlay: false })
    } catch (e) { /* ignore se não suportar */ }

    // ===== SPLASH SCREEN =====
    // Esconde após a UI carregar (também tem auto-hide no config, mas garante)
    const { SplashScreen } = await import('@capacitor/splash-screen')
    try {
      setTimeout(() => SplashScreen.hide(), 800)
    } catch (e) { /* ignore */ }

    // ===== KEYBOARD =====
    // No iOS o teclado cobre os inputs. Em vez de depender do "resize" (que é
    // furado no WebView), fazemos na mão: quando o teclado abre, sabemos a
    // altura dele → (1) abrimos um espaço embaixo (--kb-height, usado no CSS do
    // body) pra ter onde rolar, e (2) rolamos o campo focado pra ACIMA do teclado.
    const { Keyboard } = await import('@capacitor/keyboard')
    try {
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open')
      })
      // keyboardDidShow: o teclado JÁ terminou de abrir e a tela JÁ encolheu
      // (resize native). SÓ AGORA a área visível tem o tamanho certo, então
      // rolamos o campo focado pro centro dela (acima do teclado). Vale pra
      // TODAS as telas — cadastro, lançar gasto, agenda, etc.
      Keyboard.addListener('keyboardDidShow', () => {
        const el = document.activeElement
        if (el && el !== document.body && typeof el.scrollIntoView === 'function') {
          try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch (e) { /* ignore */ }
        }
      })
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open')
      })
    } catch (e) { /* ignore */ }

    // ===== BACK BUTTON (Android) =====
    // Se não houver histórico, minimiza o app em vez de fechar de uma vez
    const { App } = await import('@capacitor/app')
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          App.minimizeApp()
        }
      })
    } catch (e) { /* ignore */ }

    console.log('🎩 Domus nativo iniciado:', Capacitor.getPlatform())
  } catch (err) {
    console.error('initNativeApp failed:', err)
  }
}
