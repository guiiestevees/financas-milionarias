import { useNavigate } from 'react-router-dom'
import { Crown, AlertTriangle, Clock } from 'lucide-react'
import { useSubscription } from '../hooks/useSubscription'

// Banner que aparece no topo do app durante trial / overdue.
// Some quando assinatura tá ativa.
export default function SubscriptionBanner() {
  const sub = useSubscription()
  const navigate = useNavigate()

  if (sub.loading) return null
  if (sub.isActive) return null
  if (sub.isBlocked) return null  // nesse caso a tela de bloqueio assume

  // ----- TRIAL -----
  if (sub.isTrial) {
    const urgent = sub.daysLeft <= 2
    return (
      <button
        onClick={() => navigate('/assinar')}
        className="w-full text-left transition hover:brightness-110"
        style={{
          background: urgent
            ? 'linear-gradient(180deg, rgba(244,63,94,0.12), rgba(244,63,94,0.06))'
            : 'linear-gradient(180deg, rgba(201,169,97,0.1), rgba(201,169,97,0.04))',
          borderBottom: `1px solid ${urgent ? 'rgba(244,63,94,0.3)' : 'rgba(201,169,97,0.25)'}`,
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0">
              {urgent
                ? <Clock size={16} className="text-rose-300" />
                : <Crown size={16} style={{ color: '#c9a961' }} />}
            </div>
            <div className="text-xs sm:text-sm min-w-0">
              <span className={urgent ? 'text-rose-300 font-medium' : 'text-white/85'}>
                {sub.daysLeft === 0
                  ? '🎩 Seu período de teste termina hoje.'
                  : sub.daysLeft === 1
                  ? '🎩 Seu período de teste termina amanhã.'
                  : `🎩 ${sub.daysLeft} dias restantes do período de teste.`}
              </span>
              <span className="hidden sm:inline text-white/55 ml-2">
                Garante seu acesso contínuo com Alfred ao seu dispor.
              </span>
            </div>
          </div>
          <div className="shrink-0 text-xs sm:text-sm font-semibold whitespace-nowrap"
            style={{ color: urgent ? '#f43f5e' : '#c9a961' }}>
            Assinar →
          </div>
        </div>
      </button>
    )
  }

  // ----- OVERDUE (atrasou) -----
  if (sub.isOverdue) {
    return (
      <button
        onClick={() => navigate('/assinar')}
        className="w-full text-left transition hover:brightness-110"
        style={{
          background: 'linear-gradient(180deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={16} className="text-amber-300 shrink-0" />
            <div className="text-xs sm:text-sm min-w-0">
              <span className="text-amber-200 font-medium">
                🎩 Pagamento em aberto.
              </span>
              <span className="text-white/65 ml-2">
                {sub.daysLeft > 0
                  ? `Acesso garantido por mais ${sub.daysLeft} ${sub.daysLeft === 1 ? 'dia' : 'dias'}.`
                  : 'Regularize agora pra continuar usando.'}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-xs sm:text-sm font-semibold whitespace-nowrap text-amber-300">
            Regularizar →
          </div>
        </div>
      </button>
    )
  }

  return null
}
