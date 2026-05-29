import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, X } from 'lucide-react'
import { useVerified } from '../hooks/useVerified'

// Banner suave que aparece dentro do app pedindo verificação opcional.
// Pode ser dispensado pra sessão (não volta a aparecer até próximo login).
const DISMISS_KEY = 'domus:verification-banner-dismissed'

export default function VerificationBanner() {
  const navigate = useNavigate()
  const { verified, loading } = useVerified()
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  if (loading || verified || dismissed) return null

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
    setDismissed(true)
  }

  return (
    <button
      onClick={() => navigate('/verify')}
      className="w-full text-left transition hover:brightness-110"
      style={{
        background: 'linear-gradient(180deg, rgba(212,175,55,0.10), rgba(212,175,55,0.04))',
        borderBottom: '1px solid rgba(212,175,55,0.25)',
      }}
    >
      <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldCheck size={16} style={{ color: '#c9a961' }} className="shrink-0" />
          <div className="text-xs sm:text-sm min-w-0">
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              🎩 Verifique sua conta
            </span>
            <span className="hidden sm:inline ml-2" style={{ color: 'var(--text-tertiary)' }}>
              Pra mais segurança e poder recuperar acesso por WhatsApp se precisar.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: '#c9a961' }}>
            Verificar →
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss() }}
            className="p-1 rounded transition hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
            title="Dispensar"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </button>
  )
}
