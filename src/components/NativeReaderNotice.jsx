import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { WEB_APP_URL, WEB_APP_URL_FULL, isNativeApp } from '../lib/platform'

// Mensagem neutra que substitui CTAs de pagamento quando rodando como app nativo.
// Cumpre as regras Apple/Google "Reader App":
// - Não mostra preços
// - Não tem botão clicável que leve a checkout
// - Apenas indica que existe gerenciamento externo (sem "vá comprar")
// - Botão "Copiar endereço" é aceito pela Apple (não direciona)
//
// Props:
//   action — string descrevendo o que precisa ser feito (default: "gerencie sua assinatura")
//   subtitle — texto extra opcional
//   compact — versão menor pra usar em banners
export default function NativeReaderNotice({
  action = 'gerencie sua assinatura',
  subtitle,
  compact = false,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(WEB_APP_URL_FULL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (e) { /* ignore */ }
  }

  if (compact) {
    return (
      <div
        className="rounded-xl p-3 text-xs"
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--border-soft)',
          color: 'var(--text-secondary)',
        }}
      >
        Para {action}, acesse <strong style={{ color: 'var(--text-primary)' }}>{WEB_APP_URL}</strong> no seu navegador.
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--bg-elev2)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{
            background: 'rgba(212,175,55,0.15)',
            color: 'var(--accent-gold)',
          }}
        >
          <ExternalLink size={18} />
        </div>
        <div className="min-w-0">
          <h3
            style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--text-primary)' }}
            className="text-base mb-1"
          >
            Acesse pelo seu navegador
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Pra {action}, abra <strong style={{ color: 'var(--text-secondary)' }}>{WEB_APP_URL}</strong> no
            navegador do seu celular ou computador.
          </p>
          {subtitle && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-90"
        style={{
          background: copied ? 'rgba(16,185,129,0.15)' : 'var(--bg-elev1)',
          border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--border-soft)'}`,
          color: copied ? 'var(--accent-emerald)' : 'var(--text-secondary)',
        }}
      >
        {copied ? (
          <>
            <Check size={15} /> Endereço copiado
          </>
        ) : (
          <>
            <Copy size={15} /> Copiar endereço
          </>
        )}
      </button>
    </div>
  )
}

// Hook prático pra usar no JSX condicionalmente
export function useIsNativeApp() {
  return isNativeApp()
}
