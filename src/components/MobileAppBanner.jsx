import { useEffect, useState } from 'react'
import { X, Smartphone } from 'lucide-react'
import { isNativeApp } from '../lib/platform'

// Banner sutil no topo do app web mobile sugerindo baixar o app nativo.
//
// Regras de exibição:
// - SÓ aparece em mobile (telas pequenas + user agent)
// - NÃO aparece dentro do app nativo (Capacitor)
// - NÃO aparece se user dispensou (lembra por 14 dias)
// - SÓ aparece se pelo menos uma das URLs (Android/iOS) estiver configurada
//
// Pra ativar quando o app for publicado nas lojas:
// - Vercel env: VITE_ANDROID_APP_URL=https://play.google.com/store/apps/details?id=com.alquimiadigital.domus
// - Vercel env: VITE_IOS_APP_URL=https://apps.apple.com/br/app/domus/idXXXXXX
// (Se uma estiver vazia, o banner aparece só pra plataforma que tá disponível)

const DISMISS_KEY = 'domus:hide-app-banner-until'
const DISMISS_DAYS = 14

function detectMobilePlatform() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/iPhone|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  // iPad com iPadOS 13+ se identifica como Mac — checa touch
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios'
  return null
}

export default function MobileAppBanner() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState(null)

  useEffect(() => {
    // Não mostra dentro do app nativo
    if (isNativeApp()) return

    // Detecta plataforma mobile
    const p = detectMobilePlatform()
    if (!p) return

    // Tem URL pra essa plataforma?
    const androidUrl = import.meta.env.VITE_ANDROID_APP_URL
    const iosUrl = import.meta.env.VITE_IOS_APP_URL
    const url = p === 'android' ? androidUrl : iosUrl
    if (!url) return

    // Dispensou recentemente?
    try {
      const until = localStorage.getItem(DISMISS_KEY)
      if (until && Number(until) > Date.now()) return
    } catch (e) { /* ignore */ }

    setPlatform(p)
    // Pequeno atraso pra não competir com outras animações de boot
    const t = setTimeout(() => setShow(true), 800)
    return () => clearTimeout(t)
  }, [])

  if (!show || !platform) return null

  const url = platform === 'android'
    ? import.meta.env.VITE_ANDROID_APP_URL
    : import.meta.env.VITE_IOS_APP_URL

  const storeName = platform === 'android' ? 'Play Store' : 'App Store'

  const dismiss = () => {
    try {
      const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
      localStorage.setItem(DISMISS_KEY, String(until))
    } catch (e) { /* ignore */ }
    setShow(false)
  }

  return (
    <div
      className="sticky top-0 z-40 w-full"
      style={{
        animation: 'appBannerSlideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      <div
        className="max-w-screen-xl mx-auto px-3 py-2 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.95), rgba(168,138,74,0.95))',
          color: '#070912',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(7,9,18,0.15)' }}
        >
          <Smartphone size={18} strokeWidth={2.2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold leading-tight">
            🎩 Baixe o app Domus
          </div>
          <div className="text-[11px] leading-tight opacity-80 mt-0.5">
            Experiência completa na {storeName}
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
          style={{
            background: '#070912',
            color: '#c9a961',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          Baixar
        </a>

        <button
          onClick={dismiss}
          className="shrink-0 p-1.5 rounded-lg transition hover:bg-black/10 active:scale-90"
          aria-label="Fechar"
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
