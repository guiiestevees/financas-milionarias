import { useEffect, useMemo, useState } from 'react'
import { Check, ArrowRight, Sparkles, MessageCircle, Wallet } from 'lucide-react'

// Tela cheia mostrada DEPOIS de pagamento confirmado (Comecar.jsx submit success
// ou /assinar simulate-payment).
//
// Design: paleta light, boutique premium, sem festa exagerada.
// Confete dourado discreto cai do topo enquanto a UI aparece.
//
// Props:
//   userName?: string — primeiro nome pra cumprimento personalizado
//   onContinue: () => void — chamado quando user clica "Acessar Domus"
export default function WelcomeAfterPayment({ userName, onContinue }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Confete discreto e elegante — só tons dourados/champagne, devagar
  const confetti = useMemo(() => {
    const list = []
    // Paleta refinada: dourado claro, dourado, champagne, marfim
    const colors = ['#f4e4a8', '#d4af37', '#c9a961', '#e8d8a3', '#b8860b', '#f5e6c8']
    for (let i = 0; i < 24; i++) {
      list.push({
        left: Math.random() * 100,
        delay: Math.random() * 1500,
        duration: 3500 + Math.random() * 2500,  // mais lento
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: 180 + Math.random() * 540,
        size: 4 + Math.random() * 5,
        shape: Math.random() > 0.6 ? '50%' : '15%',  // mais quadradinhos elegantes
      })
    }
    return list
  }, [])

  const firstName = (userName || '').split(' ')[0] || ''

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.10), transparent 70%),
          radial-gradient(ellipse 60% 40% at 50% 100%, rgba(212,175,55,0.05), transparent 70%),
          linear-gradient(180deg, #fafaf8 0%, #f5f2eb 100%)
        `,
        opacity: show ? 1 : 0,
        transition: 'opacity 0.5s ease',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        className="min-h-full flex items-center justify-center px-4 sm:px-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 32px)',
        }}
      >
      {/* Confete dourado discreto caindo */}
      {confetti.map((c, i) => (
        <span
          key={i}
          className="fixed top-0 pointer-events-none"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: c.shape,
            opacity: 0.85,
            boxShadow: `0 0 3px ${c.color}66`,
            animation: `confettiFall ${c.duration}ms cubic-bezier(0.4, 0.05, 0.55, 0.95) forwards`,
            animationDelay: `${c.delay}ms`,
            ['--rot']: `${c.rot}deg`,
          }}
        />
      ))}

      {/* Linha decorativa dourada no topo (acento sutil) */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)',
        }}
      />

      {/* Card central principal */}
      <div
        className="relative w-full max-w-lg"
        style={{
          animation: show ? 'welcomeBounceIn 0.8s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        }}
      >
        {/* Selo "Pagamento confirmado" flutuando no topo */}
        <div className="flex justify-center mb-6">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: '#ffffff',
              border: '1px solid #e8e4dc',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.12), 0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                width: 20, height: 20,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: '0 2px 6px rgba(16,185,129,0.40)',
              }}
            >
              <Check size={12} color="#fff" strokeWidth={3.5} />
            </div>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: '#0f766e' }}
            >
              Pagamento confirmado
            </span>
          </div>
        </div>

        {/* Card principal */}
        <div
          className="rounded-[28px] px-7 sm:px-10 py-9 sm:py-11 text-center relative overflow-hidden"
          style={{
            background: '#ffffff',
            border: '1px solid #ece8dd',
            boxShadow: `
              0 1px 2px rgba(0,0,0,0.02),
              0 8px 24px rgba(0,0,0,0.04),
              0 24px 64px rgba(212,175,55,0.08)
            `,
          }}
        >
          {/* Ornamento dourado de fundo (linhas finas decorativas no canto) */}
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.08), transparent 70%)',
            }}
          />

          <div className="relative">
            {/* Logo Domus */}
            <div className="flex justify-center mb-5">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: 72, height: 72,
                  background: 'linear-gradient(135deg, #fdfbf3, #f5efe0)',
                  border: '1px solid #ebe3cf',
                  boxShadow: '0 4px 12px rgba(212,175,55,0.10)',
                }}
              >
                <img
                  src="/domus-logo-512.png"
                  alt="Domus"
                  style={{ width: 48, height: 48, objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Tag "Domus" pequena */}
            <div
              className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3"
              style={{ color: '#a88a4a' }}
            >
              Domus · Alquimia Digital
            </div>

            {/* Headline */}
            <h1
              style={{
                fontFamily: 'Fraunces, serif',
                fontWeight: 400,
                letterSpacing: '-0.025em',
                color: '#1a1814',
                lineHeight: 1.1,
              }}
              className="text-[34px] sm:text-[42px] mb-4"
            >
              {firstName ? `Bem-vindo, ` : 'Bem-vindo. '}
              {firstName && (
                <em style={{
                  fontStyle: 'italic',
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, #b8860b, #d4af37 50%, #8b6f2f)',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}>
                  {firstName}.
                </em>
              )}
            </h1>

            {/* Sub headline serifada em itálico */}
            <p
              style={{
                fontFamily: 'Fraunces, serif',
                fontWeight: 300,
                fontStyle: 'italic',
                color: '#5a5648',
                lineHeight: 1.5,
              }}
              className="text-[17px] sm:text-[19px] mb-7 max-w-md mx-auto"
            >
              "Permita-me servi-lo a partir de agora."
            </p>

            {/* Linha divisória dourada elegante */}
            <div
              className="mx-auto mb-7"
              style={{
                width: 60, height: 1,
                background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
              }}
            />

            {/* Mensagem do Alfred */}
            <p
              className="text-sm leading-relaxed mb-8 max-w-sm mx-auto"
              style={{ color: '#3d3a32' }}
            >
              🎩 Sua assinatura está ativa e Alfred ao seu dispor — cuidando das suas finanças,
              sua agenda e do que mais importar, com a discrição que merece.
            </p>

            {/* Próximos passos — cards menores, mais elegantes */}
            <div className="text-left space-y-2 mb-8">
              <NextStep
                icon={<Wallet size={14} />}
                title="Primeiro lançamento"
                text="Registre uma despesa ou receita pra começar"
                iconBg="rgba(16,185,129,0.10)"
                iconColor="#0d8a64"
              />
              <NextStep
                icon={<MessageCircle size={14} />}
                title="WhatsApp com Alfred"
                text="Conecte seu número em Configurações"
                iconBg="rgba(37,211,102,0.10)"
                iconColor="#25D366"
              />
              <NextStep
                icon={<Sparkles size={14} />}
                title="Cofres e categorias"
                text="Organize objetivos e personalize gastos"
                iconBg="rgba(201,169,97,0.12)"
                iconColor="#a88a4a"
              />
            </div>

            {/* CTA principal */}
            <button
              onClick={onContinue}
              className="w-full py-4 rounded-2xl text-sm font-bold transition active:scale-[0.98] flex items-center justify-center gap-2 group"
              style={{
                background: 'linear-gradient(135deg, #1a1814 0%, #2a2620 100%)',
                color: '#f4e4a8',
                boxShadow: `
                  0 1px 0 rgba(255,255,255,0.05) inset,
                  0 12px 32px rgba(26,24,20,0.30),
                  0 4px 12px rgba(212,175,55,0.15)
                `,
              }}
            >
              <span style={{ letterSpacing: '0.02em' }}>Acessar o Domus</span>
              <ArrowRight size={15} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Nota de rodapé */}
            <div
              className="text-[11px] mt-5 flex items-center justify-center gap-1.5"
              style={{ color: '#8a8576' }}
            >
              <span>✉</span>
              Enviamos um e-mail de confirmação com os detalhes
            </div>
          </div>
        </div>

        {/* Selo dourado de garantia abaixo */}
        <div
          className="text-center text-[10px] uppercase tracking-[0.25em] mt-5 font-semibold"
          style={{ color: '#a88a4a' }}
        >
          🎩 7 dias de garantia · reembolso integral
        </div>
      </div>
      </div>
    </div>
  )
}

// Item de "Por onde começar"
function NextStep({ icon, title, text, iconBg, iconColor }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl transition"
      style={{
        background: '#fafaf6',
        border: '1px solid #ece8dd',
      }}
    >
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[13px] font-semibold"
          style={{ color: '#1a1814', lineHeight: 1.3 }}
        >
          {title}
        </div>
        <div
          className="text-[11px] mt-0.5"
          style={{ color: '#7a7565', lineHeight: 1.4 }}
        >
          {text}
        </div>
      </div>
    </div>
  )
}
