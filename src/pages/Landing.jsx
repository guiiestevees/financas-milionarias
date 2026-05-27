import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, MessageCircle, Mic, Wallet, Target, Users, ChevronRight,
  CheckCircle2, Check, Lock, Smartphone, Crown, Zap, ShieldCheck,
} from 'lucide-react'

// ============================================================
// Landing page — apresentação do produto pra visitantes não-logados
// ============================================================
export default function Landing() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#070912' }}>
      {/* Background decorativo — pontos dourados sutis */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at top, rgba(212,175,55,0.08), transparent 60%),
            radial-gradient(ellipse at bottom, rgba(16,185,129,0.06), transparent 60%)
          `,
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
        {/* ===== NAV ===== */}
        <nav className="flex items-center justify-between mb-12 sm:mb-20">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: '#d4af37' }} />
            <span style={{ letterSpacing: '0.2em', color: '#d4af37', fontSize: '11px' }} className="uppercase font-semibold">
              Finanças Milionárias
            </span>
          </div>
          <Link
            to="/login"
            className="text-sm text-white/65 hover:text-white transition"
          >
            Entrar →
          </Link>
        </nav>

        {/* ===== HERO ===== */}
        <Hero />

        {/* ===== DEMO ALFRED ===== */}
        <Demo />

        {/* ===== FEATURES ===== */}
        <Features />

        {/* ===== PRICING ===== */}
        <Pricing />

        {/* ===== FAQ ===== */}
        <FAQ />

        {/* ===== CTA FINAL ===== */}
        <FinalCTA />

        {/* ===== FOOTER ===== */}
        <Footer />
      </div>
    </div>
  )
}

// ---------- Hero ----------
function Hero() {
  return (
    <section className="text-center mb-20 sm:mb-28">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}>
        <Crown size={11} style={{ color: '#d4af37' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#d4af37' }}>
          7 dias grátis · sem cartão
        </span>
      </div>

      <h1
        style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05 }}
        className="text-4xl sm:text-6xl text-white mb-5"
      >
        Suas finanças,{' '}
        <em
          style={{
            fontStyle: 'italic',
            background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          em boas mãos.
        </em>
      </h1>

      <p className="text-base sm:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed mb-8 px-2">
        Converse com o <strong className="text-white/85">Alfred</strong>, seu mordomo financeiro no WhatsApp. Diga "gastei 50 no mercado pix" — ele entende, organiza e cuida pra você.
      </p>

      {/* Foto do Alfred + CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mb-12">
        <img
          src="/alfred.png"
          alt="Alfred"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{
            width: 96, height: 96, borderRadius: '50%', objectFit: 'cover',
            border: '3px solid rgba(212,175,55,0.4)',
            boxShadow: '0 8px 32px rgba(212,175,55,0.2)',
          }}
        />
        <div className="flex flex-col items-center sm:items-start gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm sm:text-base transition"
            style={{
              background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
              color: '#070912',
              boxShadow: '0 12px 28px rgba(212,175,55,0.3)',
            }}
          >
            🎩 Começar grátis por 7 dias
            <ChevronRight size={16} />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-white/45">
            <Lock size={11} /> Sem cartão de crédito · Cancele quando quiser
          </div>
        </div>
      </div>

      {/* Trust line */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/45">
        <span className="flex items-center gap-1.5"><Mic size={11} /> Aceita áudio</span>
        <span className="flex items-center gap-1.5"><MessageCircle size={11} /> WhatsApp</span>
        <span className="flex items-center gap-1.5"><Smartphone size={11} /> Funciona no celular</span>
        <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> Dados criptografados</span>
      </div>
    </section>
  )
}

// ---------- Demo ----------
function Demo() {
  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#d4af37' }}>
          Como funciona
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Conversa natural. Resultados precisos.
        </h2>
        <p className="text-white/55 max-w-xl mx-auto text-sm sm:text-base">
          Mande mensagem como falaria com um amigo. Alfred entende, classifica e registra. Você só confirma.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Conversa 1 — gasto simples */}
        <ChatExample
          title="Despesa rápida"
          messages={[
            { from: 'user', text: 'calça 200 nubank parcelado 4x' },
            { from: 'alfred', text: '🎩 Compreendido. Registrei R$ 200 em 4× no Nubank — Calça. Confirme no aplicativo quando puder.' },
          ]}
        />

        {/* Conversa 2 — áudio */}
        <ChatExample
          title="Mande por áudio"
          messages={[
            { from: 'user', audio: '🎤 0:12  ▶' },
            { from: 'alfred', text: '🎩 Transcrevi: "gastei 80 no mercado pix e recebi 200 do consultório". Lancei as 2 transações.' },
          ]}
        />

        {/* Conversa 3 — consulta */}
        <ChatExample
          title="Consulte na hora"
          messages={[
            { from: 'user', text: 'quanto sobra do mês?' },
            { from: 'alfred', text: 'Sobram *R$ 1.840,00* depois das despesas fixas. Excelente disciplina, se me permite o comentário.' },
          ]}
        />

        {/* Conversa 4 — cofre */}
        <ChatExample
          title="Cuide das suas metas"
          messages={[
            { from: 'user', text: 'como tá meu cofre do casamento?' },
            { from: 'alfred', text: 'Cofre Casamento com *R$ 8.400,00* — 28% da meta de R$ 30.000. Está cada vez mais perto. Admirável.' },
          ]}
        />
      </div>
    </section>
  )
}

function ChatExample({ title, messages }) {
  return (
    <div className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="text-xs uppercase tracking-wider text-white/40 mb-3 font-medium">{title}</div>
      <div className="space-y-2.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.from === 'user' ? 'ml-auto' : ''}`}
            style={
              m.from === 'user'
                ? { background: 'linear-gradient(180deg, #1e2547, #161b35)', color: 'rgba(255,255,255,0.92)', borderBottomRightRadius: 6 }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: 6 }
            }
          >
            {m.audio ? <span className="text-white/65 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{m.audio}</span> : m.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Features ----------
function Features() {
  const features = [
    { icon: MessageCircle, title: 'Alfred no WhatsApp', desc: 'Mande mensagem ou áudio. Ele entende português natural, mesmo com gírias.' },
    { icon: Target, title: 'Orçamentos por categoria', desc: 'Mercado, Lazer, Saídas — defina limites e veja em tempo real onde tá apertando.' },
    { icon: Wallet, title: 'Cofres com metas', desc: 'Guarde dinheiro pro casamento, viagem ou reserva. Acompanhe a evolução.' },
    { icon: Users, title: 'Gastos compartilhados', desc: 'Comprou pro Pedro? Atribua a ele e acompanhe quem deve quanto pra você.' },
    { icon: Sparkles, title: 'Parcelados inteligentes', desc: 'Falou "10x de 200 no Nubank" e pronto — todas as parcelas geradas automaticamente.' },
    { icon: Zap, title: 'Despesas recorrentes', desc: 'Aluguel, Netflix, academia — fixos rolam todo mês sem você precisar lançar.' },
  ]

  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#d4af37' }}>
          O que faz por você
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Tudo que você precisa.<br className="hidden sm:block" /> Nada que você não use.
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => {
          const Icon = f.icon
          return (
            <div
              key={i}
              className="p-5 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#d4af37' }}>
                <Icon size={18} />
              </div>
              <h3 className="font-semibold mb-1.5 text-base">{f.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------- Pricing ----------
function Pricing() {
  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#d4af37' }}>
          Investimento
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Menos que um café por semana.
        </h2>
        <p className="text-white/55 text-sm sm:text-base max-w-lg mx-auto">
          Comece grátis. Decida depois. Sem letras miúdas.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Mensal */}
        <div className="p-6 rounded-2xl relative"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg mb-1 text-white/80">Mensal</div>
          <div className="flex items-baseline gap-1 mb-1">
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-4xl font-semibold">R$ 19</span>
            <span className="text-xs text-white/45">/mês</span>
          </div>
          <div className="text-xs text-white/45 mb-4">Cobrança recorrente. Cancele quando quiser.</div>
          <ul className="space-y-2 mb-5">
            {['Acesso completo ao app', 'Alfred no WhatsApp', 'Áudio, parcelados, cofres', 'Cancele a qualquer momento'].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/75">
                <Check size={14} style={{ color: '#10b981', marginTop: 2 }} className="shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Anual — destaque */}
        <div className="p-6 rounded-2xl relative"
          style={{
            background: 'linear-gradient(180deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))',
            border: '2px solid rgba(212,175,55,0.4)',
            boxShadow: '0 12px 32px rgba(212,175,55,0.1)',
          }}>
          <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: '#d4af37', color: '#070912' }}>
            Mais escolhido
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: '#d4af37' }} className="text-lg mb-1">Anual</div>
          <div className="flex items-baseline gap-1 mb-1">
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-4xl font-semibold">R$ 167</span>
            <span className="text-xs text-white/45">/ano</span>
          </div>
          <div className="text-xs mb-4" style={{ color: '#d4af37' }}>Economize R$ 61 (~27% off)</div>
          <ul className="space-y-2 mb-5">
            {['Tudo do plano Mensal', 'Pague 1× e fique 12 meses', 'Cerca de R$ 13,92/mês', 'Garantia de 7 dias'].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/85">
                <Check size={14} style={{ color: '#d4af37', marginTop: 2 }} className="shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-center mt-8">
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition"
          style={{
            background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
            color: '#070912',
            boxShadow: '0 8px 24px rgba(212,175,55,0.25)',
          }}
        >
          🎩 Começar com 7 dias grátis
          <ChevronRight size={16} />
        </Link>
        <div className="text-xs text-white/40 mt-3">
          Não cobra nada durante o teste · Cancele quando quiser
        </div>
      </div>
    </section>
  )
}

// ---------- FAQ ----------
function FAQ() {
  const faqs = [
    {
      q: 'Como funciona o Alfred no WhatsApp?',
      a: 'Depois de criar conta, você vincula seu número e salva o contato dele. A partir daí, é só mandar mensagem natural — texto ou áudio — e o Alfred entende, classifica e registra. Você sempre confirma no app antes de salvar.',
    },
    {
      q: 'Meus dados ficam seguros?',
      a: 'Sim. Tudo armazenado criptografado no Supabase com Row Level Security — só você vê seus dados. Não vendemos, não compartilhamos com ninguém. LGPD compliant.',
    },
    {
      q: 'Posso cancelar quando quiser?',
      a: 'Pode. Cancelamento direto no app, sem ligações ou processos burocráticos. Mantém o acesso até o fim do período já pago.',
    },
    {
      q: 'O que acontece quando os 7 dias acabam?',
      a: 'Você só paga se quiser continuar. Sem cobrança surpresa, sem pegadinha. Se não pagar, o app pede pra você escolher um plano — e seus dados ficam guardados caso queira voltar depois.',
    },
    {
      q: 'Funciona no meu celular?',
      a: 'Funciona no navegador de qualquer celular (Android, iPhone) e desktop. Não precisa instalar nada. Você pode adicionar à tela inicial pra ficar parecido com um app.',
    },
    {
      q: 'Posso usar pra controlar finanças da família?',
      a: 'Pode atribuir gastos a outras pessoas (filhos, cônjuge, mãe) e acompanhar quem deve o quê. Cada conta é individual — pra família compartilhar tudo, futuramente teremos plano família.',
    },
  ]

  const [open, setOpen] = useState(null)

  return (
    <section className="mb-20 sm:mb-28 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#d4af37' }}>
          Dúvidas comuns
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl">
          Perguntas frequentes
        </h2>
      </div>

      <div className="space-y-2.5">
        {faqs.map((f, i) => (
          <button
            key={i}
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left p-4 rounded-xl transition"
            style={{
              background: open === i ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-sm sm:text-base">{f.q}</span>
              <ChevronRight size={16} className={`text-white/40 shrink-0 transition-transform ${open === i ? 'rotate-90' : ''}`} />
            </div>
            {open === i && (
              <div className="mt-3 text-sm text-white/65 leading-relaxed">
                {f.a}
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

// ---------- Final CTA ----------
function FinalCTA() {
  return (
    <section className="mb-16 sm:mb-20">
      <div className="rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(212,175,55,0.1), rgba(212,175,55,0.02))',
          border: '1px solid rgba(212,175,55,0.25)',
        }}>
        <img
          src="/alfred.png"
          alt="Alfred"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{
            width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
            border: '3px solid rgba(212,175,55,0.4)',
            margin: '0 auto 16px',
          }}
        />

        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Pronto para começar?
        </h2>
        <p className="text-white/65 max-w-md mx-auto mb-6 text-sm sm:text-base">
          🎩 Alfred aguarda suas instruções. Suas finanças nunca foram tão simples de cuidar.
        </p>

        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base transition"
          style={{
            background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
            color: '#070912',
            boxShadow: '0 12px 32px rgba(212,175,55,0.3)',
          }}
        >
          Começar grátis
          <ChevronRight size={18} />
        </Link>
        <div className="text-xs text-white/40 mt-4">
          7 dias grátis · Sem cartão · Sem amarras
        </div>
      </div>
    </section>
  )
}

// ---------- Footer ----------
function Footer() {
  return (
    <footer className="border-t border-white/5 pt-8 pb-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: '#d4af37' }} />
          <span className="text-xs text-white/40">Finanças Milionárias © {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-white/40">
          <Link to="/privacidade" className="hover:text-white/65 transition">Política de Privacidade</Link>
          <Link to="/login" className="hover:text-white/65 transition">Entrar</Link>
        </div>
      </div>
    </footer>
  )
}
