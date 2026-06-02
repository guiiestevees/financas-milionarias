// Inicialização do app nativo (Capacitor).
// Setup de StatusBar, SplashScreen, Keyboard handlers, etc.
//
// Chamado em src/main.jsx logo no boot. Em web puro, faz nada.

import { Capacitor } from '@capacitor/core'

export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return

  try {
    // ===== STATUS BAR =====
    // Cor sólida combinando com o background do app (dark)
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    try {
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#0a0e1a' })
      await StatusBar.setOverlaysWebView({ overlay: false })
    } catch (e) { /* ignore se não suportar */ }

    // ===== SPLASH SCREEN =====
    // Esconde após a UI carregar (também tem auto-hide no config, mas garante)
    const { SplashScreen } = await import('@capacitor/splash-screen')
    try {
      setTimeout(() => SplashScreen.hide(), 800)
    } catch (e) { /* ignore */ }

    // ===== KEYBOARD =====
    // Em iOS o teclado pode cobrir inputs — escutamos eventos pra rolar a view
    const { Keyboard } = await import('@capacitor/keyboard')
    try {
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open')
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
