import { Info } from 'lucide-react'
import { isNativeApp } from '../lib/platform'

// Aviso neutro mostrado no app nativo no lugar de qualquer CTA de pagamento.
//
// Regras Apple/Google (Guideline 3.1.1): o app NÃO pode mostrar preços, links,
// botões ou qualquer "chamada pra ação" que direcione o usuário a comprar fora
// da loja. Por isso este aviso é estritamente factual ("modelo Netflix"):
//   - Não mostra preços
//   - Não nomeia o site nem mostra URL
//   - Não tem botão/link que leve a checkout ou cadastro externo
//   - Apenas informa que a gestão de plano não acontece dentro do app
//
// Props (mantidas por compatibilidade com quem já usa o componente):
//   subtitle — texto extra opcional
//   compact  — versão menor pra usar em banners/cards
export default function NativeReaderNotice({ subtitle, compact = false }) {
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
        Sua assinatura é gerenciada fora do aplicativo. Se já tem um plano ativo, basta entrar com sua conta.
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
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{
            background: 'rgba(212,175,55,0.15)',
            color: 'var(--accent-gold)',
          }}
        >
          <Info size={18} />
        </div>
        <div className="min-w-0">
          <h3
            style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--text-primary)' }}
            className="text-base mb-1"
          >
            Assinatura gerenciada fora do app
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            No momento, planos e pagamentos não são feitos por aqui. Se você já tem um plano ativo,
            é só entrar com sua conta que o acesso aparece automaticamente.
          </p>
          {subtitle && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook prático pra usar no JSX condicionalmente
export function useIsNativeApp() {
  return isNativeApp()
}
