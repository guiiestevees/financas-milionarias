import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ChevronRight, ChevronLeft, Sparkles, MessageCircle, CreditCard,
  Target, Check, Crown, ArrowRight,
} from 'lucide-react'

// Welcome tour mostrado no primeiro acesso ao app.
// 3 passos curtos + tela final de "tudo pronto".
// Dismissível, salva flag no localStorage.
//
// Props:
//   userName: string  — opcional, pra personalizar
//   onClose: () => void
export default function WelcomeTour({ userName = '', onClose }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // ESC fecha o modal
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const firstName = (userName || '').trim().split(' ')[0]

  // Steps
  const steps = [
    // STEP 0 — Welcome
    {
      title: firstName ? `Olá, ${firstName}.` : 'Olá.',
      subtitle: '🎩 Ao seu dispor.',
      body: (
        <>
          <p className="text-white/75 leading-relaxed mb-4">
            Eu sou o <strong className="text-white">Alfred</strong>, seu mordomo financeiro.
            Cuidarei das suas finanças com a discrição e o zelo que merecem.
          </p>
          <p className="text-white/65 text-sm leading-relaxed">
            Permita-me orientá-lo nos primeiros passos — leva apenas 1 minuto e deixará tudo prontinho para você.
          </p>
        </>
      ),
      cta: 'Vamos começar',
    },

    // STEP 1 — Cartões e bancos
    {
      title: 'Cadastre seus cartões',
      subtitle: 'Pra eu reconhecer onde você gasta',
      icon: CreditCard,
      body: (
        <>
          <p className="text-white/75 leading-relaxed mb-3">
            Vá em <strong>Configurações → Cartões e bancos</strong> e adicione:
          </p>
          <ul className="space-y-2 text-sm text-white/65">
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              Cartões de crédito (Nubank, Itaú, Inter...)
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              Bancos (pra gastos em débito ou PIX)
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-lg text-xs text-white/65" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            🎩 <em>"Assim, quando disser 'gastei 200 no Nubank', saberei exatamente do que se trata."</em>
          </div>
        </>
      ),
      cta: 'Próximo',
    },

    // STEP 2 — Categorias / orçamentos
    {
      title: 'Crie seus orçamentos',
      subtitle: 'Defina limites do mês',
      icon: Target,
      body: (
        <>
          <p className="text-white/75 leading-relaxed mb-3">
            Crie categorias com limite mensal — Mercado, Saídas, Lazer, Gasolina:
          </p>
          <ul className="space-y-2 text-sm text-white/65">
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              Vá em <strong className="text-white/85">Configurações → Orçamentos</strong>
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              Crie suas categorias e defina o limite mensal
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              Veja em tempo real onde tá estourando
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-lg text-xs text-white/65" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            💡 Comece com 3-5 categorias. Você ajusta com o tempo.
          </div>
        </>
      ),
      cta: 'Próximo',
    },

    // STEP 3 — WhatsApp Alfred
    {
      title: 'Vincule seu WhatsApp',
      subtitle: 'Me chame a qualquer momento',
      icon: MessageCircle,
      body: (
        <>
          <p className="text-white/75 leading-relaxed mb-3">
            Vincule seu número e converse comigo no WhatsApp:
          </p>
          <ul className="space-y-2 text-sm text-white/65">
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong className="text-white/85">Configurações → WhatsApp</strong> — cadastre seu número</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              Salve <strong className="text-white/85">Alfred</strong> nos contatos (eu te passo o número)
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              Mande "oi" e siga a conversa
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-lg text-xs text-white/65" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
            🎙 Aceita áudio também — basta falar como faria a um amigo.
          </div>
        </>
      ),
      cta: 'Próximo',
    },

    // STEP 4 — Pronto
    {
      title: 'Tudo pronto.',
      subtitle: '🎩 Aguardo suas instruções',
      icon: Crown,
      body: (
        <>
          <p className="text-white/75 leading-relaxed mb-4">
            Permaneço ao seu dispor. Pode começar registrando uma despesa, criando um cofre ou conversando comigo no WhatsApp.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <ShortcutPill
              icon="💸"
              label="Adicionar despesa"
              onClick={() => { onClose?.(); }}
              hint="No painel"
            />
            <ShortcutPill
              icon="🏦"
              label="Criar cofre"
              onClick={() => { onClose?.(); }}
              hint="No painel"
            />
            <ShortcutPill
              icon="⚙️"
              label="Configurar tudo"
              onClick={() => { onClose?.(); navigate('/app?tab=config') }}
              hint="Cartões, orçamentos..."
            />
            <ShortcutPill
              icon="🎩"
              label="Chamar Alfred"
              onClick={() => { onClose?.(); navigate('/app?tab=config') }}
              hint="Vincule WhatsApp"
            />
          </div>
        </>
      ),
      cta: 'Começar a usar',
    },
  ]

  const cur = steps[step]
  const isLast = step === steps.length - 1
  const total = steps.length

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 backdrop-blur-md"
      style={{ background: 'rgba(7,9,18,0.85)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl"
        style={{
          background: 'linear-gradient(180deg, #11162a, #0a0d18)',
          border: '1px solid rgba(212,175,55,0.18)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(212,175,55,0.05)',
        }}
      >
        {/* Botão fechar */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 rounded-full transition text-white/40 hover:text-white/85 hover:bg-white/5 z-10"
        >
          <X size={16} />
        </button>

        {/* Header com foto do Alfred (só step 0 e último) */}
        {(step === 0 || isLast) && (
          <div className="flex justify-center pt-7 pb-2">
            <img
              src="/alfred.png"
              alt="Alfred"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
              style={{
                width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
                border: '3px solid rgba(212,175,55,0.4)',
                boxShadow: '0 8px 24px rgba(212,175,55,0.18)',
              }}
            />
          </div>
        )}

        {/* Ícone (steps intermediários) */}
        {step !== 0 && !isLast && cur.icon && (
          <div className="flex justify-center pt-8 pb-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
              style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37' }}>
              <cur.icon size={26} />
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="text-center mb-5">
            {cur.subtitle && (
              <div className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#d4af37' }}>
                {cur.subtitle}
              </div>
            )}
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl sm:text-3xl">
              {cur.title}
            </h2>
          </div>
          <div>{cur.body}</div>
        </div>

        {/* Footer: progresso + navegação */}
        <div className="px-6 sm:px-8 pb-6 pt-2 border-t border-white/5">
          {/* Dots de progresso */}
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 22 : 6,
                  height: 6,
                  background: i === step ? '#d4af37' : i < step ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>

          {/* Botões */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-lg text-sm transition text-white/65 hover:text-white hover:bg-white/5 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Voltar
              </button>
            )}

            {step === 0 && (
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-sm transition text-white/45 hover:text-white/85"
              >
                Pular tour
              </button>
            )}

            <button
              onClick={() => isLast ? onClose?.() : setStep(step + 1)}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition"
              style={{
                background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
                color: '#070912',
                boxShadow: '0 6px 16px rgba(212,175,55,0.25)',
              }}
            >
              {cur.cta}
              {isLast ? <Sparkles size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShortcutPill({ icon, label, onClick, hint }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-0.5 p-3 rounded-xl transition text-left"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="text-lg leading-none">{icon}</div>
      <div className="text-xs font-medium text-white/85 leading-tight">{label}</div>
      <div className="text-[10px] text-white/40">{hint}</div>
    </button>
  )
}
