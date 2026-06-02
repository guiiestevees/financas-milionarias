import { useNavigate } from 'react-router-dom'
import { Crown, AlertTriangle, Clock, X } from 'lucide-react'
import { useSubscription } from '../hooks/useSubscription'
import { isNativeApp, WEB_APP_URL } from '../lib/platform'

// Banner que aparece no topo do app durante trial / overdue / cancelled-active.
// Some quando assinatura tá ativa.
//
// MODO NATIVO (Reader App): mensagens neutras sem CTA clicável pra checkout.
// Em vez de "Assinar →" botando user na tela de pagamento, mostra "via meudomus.com".
export default function SubscriptionBanner() {
  const sub = useSubscription()
  const navigate = useNavigate()
  const native = isNativeApp()

  if (sub.loading) return null
  if (sub.isActive) return null
  if (sub.isBlocked) return null  // nesse caso a tela de bloqueio assume

  // ----- CANCELADA MAS AINDA COM ACESSO (até a data já paga) -----
  if (sub.cancelledButActive) {
    return (
      <BannerShell
        native={native}
        onClick={() => navigate('/assinar')}
        bg="linear-gradient(180deg, rgba(148,163,184,0.12), rgba(148,163,184,0.05))"
        border="rgba(148,163,184,0.25)"
        icon={<X size={16} className="text-slate-300 shrink-0" />}
        title="🎩 Assinatura cancelada."
        text={
          sub.daysLeft > 1
            ? `Acesso preservado por mais ${sub.daysLeft} dias.`
            : sub.daysLeft === 1
            ? 'Acesso preservado por mais 1 dia.'
            : 'Acesso termina hoje.'
        }
        cta="Reativar →"
        ctaColor="text-slate-300"
      />
    )
  }

  // ----- TRIAL -----
  if (sub.isTrial) {
    const urgent = sub.daysLeft <= 2
    return (
      <BannerShell
        native={native}
        onClick={() => navigate('/assinar')}
        bg={urgent
          ? 'linear-gradient(180deg, rgba(244,63,94,0.12), rgba(244,63,94,0.06))'
          : 'linear-gradient(180deg, rgba(201,169,97,0.1), rgba(201,169,97,0.04))'}
        border={urgent ? 'rgba(244,63,94,0.3)' : 'rgba(201,169,97,0.25)'}
        icon={urgent
          ? <Clock size={16} className="text-rose-300" />
          : <Crown size={16} style={{ color: '#c9a961' }} />}
        title={
          sub.daysLeft === 0
            ? '🎩 Seu período de teste termina hoje.'
            : sub.daysLeft === 1
            ? '🎩 Seu período de teste termina amanhã.'
            : `🎩 ${sub.daysLeft} dias restantes do período de teste.`
        }
        titleClass={urgent ? 'text-rose-300 font-medium' : 'text-white/85'}
        text="Garante seu acesso contínuo com Alfred ao seu dispor."
        cta="Assinar →"
        ctaColor=""
        ctaStyle={{ color: urgent ? '#f43f5e' : '#c9a961' }}
      />
    )
  }

  // ----- OVERDUE (atrasou) -----
  if (sub.isOverdue) {
    return (
      <BannerShell
        native={native}
        onClick={() => navigate('/assinar')}
        bg="linear-gradient(180deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))"
        border="rgba(245,158,11,0.3)"
        icon={<AlertTriangle size={16} className="text-amber-300 shrink-0" />}
        title="🎩 Pagamento em aberto."
        titleClass="text-amber-200 font-medium"
        text={
          sub.daysLeft > 0
            ? `Acesso garantido por mais ${sub.daysLeft} ${sub.daysLeft === 1 ? 'dia' : 'dias'}.`
            : 'Regularize agora pra continuar usando.'
        }
        cta="Regularizar →"
        ctaColor="text-amber-300"
      />
    )
  }

  return null
}

// Shell visual do banner — em modo nativo vira <div> com texto neutro
// ("via meudomus.com") em vez de <button> clicável que leva pra checkout.
function BannerShell({
  native, onClick, bg, border, icon, title, titleClass = 'text-white/85',
  text, cta, ctaColor = '', ctaStyle,
}) {
  const Component = native ? 'div' : 'button'
  return (
    <Component
      {...(native ? {} : { onClick })}
      className={`w-full text-left ${!native ? 'transition hover:brightness-110' : ''}`}
      style={{
        background: bg,
        borderBottom: `1px solid ${border}`,
      }}
    >
      <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <div className="text-xs sm:text-sm min-w-0">
            <span className={titleClass}>{title}</span>
            <span className="hidden sm:inline text-white/55 ml-2">{text}</span>
          </div>
        </div>
        <div
          className={`shrink-0 text-xs sm:text-sm font-semibold whitespace-nowrap ${ctaColor}`}
          style={ctaStyle}
        >
          {native ? `via ${WEB_APP_URL}` : cta}
        </div>
      </div>
    </Component>
  )
}
