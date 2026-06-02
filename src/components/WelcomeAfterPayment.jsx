import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, MessageCircle, ArrowRight, Check } from 'lucide-react'

// Tela cheia mostrada DEPOIS de pagamento confirmado (Comecar.jsx submit success).
// Substitui o redirect direto e dá uma pausa pra celebrar + apresentar o Alfred.
//
// Props:
//   userName?: string — primeiro nome pra cumprimento personalizado
//   onContinue: () => void — chamado quando user clica "Começar" (redirect pra /app)
export default function WelcomeAfterPayment({ userName, onContinue }) {
  const [show, setShow] = useState(false)

  // Animação de entrada
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Confete celebratório (igual ao do agenda completion)
  const confetti = useMemo(() => {
    const list = []
    const colors = ['#c9a961', '#fbbf24', '#10b981', '#06b6d4', '#f43f5e', '#8b5cf6', '#fde047']
    for (let i = 0; i < 60; i++) {
      list.push({
        left: Math.random() * 100,
        delay: Math.random() * 1200,
        duration: 2000 + Math.random() * 2000,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: 360 + Math.random() * 720,
        size: 4 + Math.random() * 7,
        shape: Math.random() > 0.5 ? '50%' : '20%',
      })
    }
    return list
  }, [])

  const firstName = (userName || '').split(' ')[0] || ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(212,175,55,0.20), rgba(7,9,18,0.98) 70%)',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Confete caindo */}
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
            boxShadow: `0 0 6px ${c.color}`,
            animation: `confettiFall ${c.duration}ms cubic-bezier(0.4, 0, 0.6, 1) forwards`,
            animationDelay: `${c.delay}ms`,
            ['--rot']: `${c.rot}deg`,
          }}
        />
      ))}

      {/* Card central */}
      <div
        className="relative max-w-md w-full rounded-3xl p-7 sm:p-9 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(168,138,74,0.05))',
          border: '1px solid rgba(212,175,55,0.30)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          animation: show ? 'welcomeBounceIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        }}
      >
        {/* Glow decorativo */}
        <div
          className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: '#c9a961' }}
        />

        <div className="relative">
          {/* Selo "PAGAMENTO CONFIRMADO" no topo */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5"
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            <Check size={13} style={{ color: 'var(--accent-emerald)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-emerald)' }}>
              Pagamento confirmado
            </span>
          </div>

          {/* Logo + título */}
          <div className="flex justify-center mb-4">
            <img
              src="/domus-logo-512.png"
              alt="Domus"
              style={{
                width: 80,
                height: 80,
                filter: 'drop-shadow(0 8px 24px rgba(212,175,55,0.4))',
              }}
            />
          </div>

          <h1
            style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
            className="text-3xl sm:text-4xl mb-3 leading-tight"
          >
            Bem-vindo{firstName ? `, ${firstName}` : ''}.{' '}
            <em style={{
              fontStyle: 'italic',
              background: 'linear-gradient(135deg, #f4e4a8, #c9a961 50%, #8b6f2f)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              Permita-me servi-lo.
            </em>
          </h1>

          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
            🎩 Sua conta está ativa e Alfred está ao seu dispor. Cuidaremos das suas
            finanças, sua agenda e do que mais importar — com a discrição que merece.
          </p>

          {/* Próximos passos compactos */}
          <div
            className="text-left rounded-2xl p-4 mb-6"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(212,175,55,0.15)' }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#c9a961' }}>
              📋 Por onde começar
            </div>
            <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <Sparkles size={12} className="mt-0.5 shrink-0" style={{ color: '#c9a961' }} />
                <span>Registre seu primeiro lançamento (despesa ou receita)</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle size={12} className="mt-0.5 shrink-0" style={{ color: '#10b981' }} />
                <span>Conecte o WhatsApp pra falar com o Alfred (em Configurações)</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight size={12} className="mt-0.5 shrink-0" style={{ color: '#06b6d4' }} />
                <span>Crie cofres de objetivos e categorias personalizadas</span>
              </li>
            </ul>
          </div>

          {/* CTA principal */}
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition hover:opacity-95 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b8860b)',
              color: '#070912',
              boxShadow: '0 12px 32px rgba(212,175,55,0.35)',
            }}
          >
            <span>Acessar o Domus</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>

          <div className="text-[10px] mt-4" style={{ color: 'var(--text-tertiary)' }}>
            🎩 Permita-me lembrá-lo: enviamos um e-mail de confirmação com os detalhes.
          </div>
        </div>
      </div>
    </div>
  )
}
