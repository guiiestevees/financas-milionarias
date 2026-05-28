import { useNavigate } from 'react-router-dom'
import { Crown, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// Tela cheia que aparece quando trial expirou OU assinatura cancelada/expirada.
// Bloqueia o uso do app até a pessoa assinar (ou fazer logout).
export default function SubscriptionBlocked({ reason = 'expired' }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const isTrialExpired = reason === 'trial_expired'
  const isCancelled = reason === 'cancelled'
  const isOverdueGrace = reason === 'overdue'

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="max-w-md w-full text-center">
        {/* Alfred image */}
        <div className="flex justify-center mb-6">
          <img
            src="/alfred.png"
            alt="Alfred"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(201,169,97,0.4)',
              boxShadow: '0 8px 32px rgba(201,169,97,0.2)',
            }}
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)' }}>
          <Crown size={12} style={{ color: '#c9a961' }} />
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#c9a961' }}>Alfred aguarda</span>
        </div>

        <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl sm:text-3xl mb-3">
          {isTrialExpired && 'Seu período de teste terminou'}
          {isCancelled && 'Assinatura inativa'}
          {isOverdueGrace && 'Pagamento em aberto'}
          {!isTrialExpired && !isCancelled && !isOverdueGrace && 'Acesso encerrado'}
        </h1>

        <p className="text-white/65 text-sm leading-relaxed mb-7">
          {isTrialExpired && '🎩 Permita-me agradecer pelos dias em que servi. Para que eu continue cuidando de suas finanças, escolha um plano. Seus dados estão a salvo e o acesso retorna imediatamente após a confirmação.'}
          {isCancelled && '🎩 Sua assinatura foi encerrada. Pode reativá-la a qualquer momento — encontrarei tudo exatamente como deixou.'}
          {isOverdueGrace && '🎩 Permita-me lembrar: o pagamento mais recente não foi confirmado. Regularize para que eu continue ao seu dispor.'}
          {!isTrialExpired && !isCancelled && !isOverdueGrace && '🎩 Para continuar, escolha um plano. Estarei aguardando.'}
        </p>

        <button
          onClick={() => navigate('/assinar')}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition mb-3"
          style={{
            background: 'linear-gradient(180deg, #c9a961, #a88a4a)',
            color: '#070912',
            boxShadow: '0 8px 24px rgba(201,169,97,0.3)',
          }}
        >
          Ver planos e assinar
        </button>

        <button
          onClick={() => signOut()}
          className="text-xs text-white/45 hover:text-white/75 transition py-2 inline-flex items-center gap-1.5"
        >
          <LogOut size={11} /> Sair da conta
        </button>
      </div>
    </div>
  )
}
