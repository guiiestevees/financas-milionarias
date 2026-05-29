import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles, MessageCircle, Mic, Wallet, Target, Users, ChevronRight,
  CheckCircle2, Check, Lock, Smartphone, Crown, Zap, ShieldCheck, AlertCircle,
  FileSpreadsheet, ClockAlert, Inbox, BarChart3, ArrowRight, Quote,
  PiggyBank, CreditCard, Calendar, Heart,
} from 'lucide-react'

// ============================================================
// Landing page — apresentação do produto pra visitantes não-logados
// Estrutura persuasiva: Problema → Solução → Como Funciona → Prova
// → Pricing → Garantia → FAQ → CTA
// ============================================================
export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Background decorativo — fica sutil nos dois temas */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at top, rgba(212,175,55,0.08), transparent 60%),
            radial-gradient(ellipse at bottom, rgba(16,185,129,0.05), transparent 60%)
          `,
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
        <Nav />
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <Demo />
        <HowItWorks />
        <Features />
        <WhoFor />
        <Pricing />
        <Guarantee />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  )
}

// ============================================================
// NAV
// ============================================================
function Nav() {
  return (
    <nav className="flex items-center justify-between mb-12 sm:mb-20">
      <div className="flex items-center gap-2.5">
        <img src="/domus-logo-512.png" alt="Domus" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        <span style={{ letterSpacing: '0.2em', color: 'var(--accent-gold)', fontSize: '12px', fontWeight: 600 }} className="uppercase">
          Domus
        </span>
      </div>
      <div className="flex items-center gap-4">
        <a href="#planos" className="hidden sm:inline text-sm transition hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          Planos
        </a>
        <a href="#faq" className="hidden sm:inline text-sm transition hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          Dúvidas
        </a>
        <Link to="/login" className="text-sm transition hover:underline" style={{ color: 'var(--text-secondary)' }}>
          Entrar →
        </Link>
      </div>
    </nav>
  )
}

// ============================================================
// HERO
// ============================================================
function Hero() {
  return (
    <section className="text-center mb-20 sm:mb-28">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}>
        <Crown size={11} style={{ color: 'var(--accent-gold)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-gold)' }}>
          Garantia de 7 dias · Reembolso integral
        </span>
      </div>

      <h1
        style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05 }}
        className="text-4xl sm:text-6xl mb-5"
      >
        Cuide das suas finanças{' '}
        <em
          style={{
            fontStyle: 'italic',
            background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          conversando.
        </em>
      </h1>

      <p className="text-base sm:text-xl max-w-2xl mx-auto leading-relaxed mb-8 px-2" style={{ color: 'var(--text-secondary)' }}>
        Mande mensagem ou áudio pelo WhatsApp pro <strong style={{ color: 'var(--text-primary)' }}>Alfred</strong>, seu mordomo financeiro.
        Ele entende, classifica e organiza pra você. Sem planilha, sem calculadora, sem fricção.
      </p>

      {/* Foto do Alfred + CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mb-10">
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
            to="/comecar"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm sm:text-base transition"
            style={{
              background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
              color: '#070912',
              boxShadow: '0 12px 28px rgba(212,175,55,0.3)',
            }}
          >
            🎩 Quero começar agora
            <ChevronRight size={16} />
          </Link>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <ShieldCheck size={11} /> 7 dias de garantia · Sem letras miúdas
          </div>
        </div>
      </div>

      {/* Trust line */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5"><Mic size={11} /> Aceita áudio</span>
        <span className="flex items-center gap-1.5"><MessageCircle size={11} /> WhatsApp</span>
        <span className="flex items-center gap-1.5"><Smartphone size={11} /> Funciona em qualquer celular</span>
        <span className="flex items-center gap-1.5"><Lock size={11} /> Dados criptografados (LGPD)</span>
      </div>
    </section>
  )
}

// ============================================================
// PROBLEMA — gera identificação antes de oferecer solução
// ============================================================
function ProblemSection() {
  const problems = [
    {
      icon: AlertCircle,
      title: 'O dinheiro some e você não sabe pra onde foi',
      desc: 'Chega no fim do mês com a sensação de que ganhou mais do que recebeu. Mas onde foi parar tudo aquilo?',
    },
    {
      icon: FileSpreadsheet,
      title: 'Planilha você abandona em 2 semanas',
      desc: 'Comece com disciplina, depois esquece de lançar um dia. Aí dois. Em um mês está obsoleta — e desistir vira o caminho mais fácil.',
    },
    {
      icon: ClockAlert,
      title: 'Apps são complicados ou consomem muito tempo',
      desc: 'Categorias, sub-categorias, etiquetas, relatórios complexos... você quer controle, não um segundo emprego.',
    },
    {
      icon: Inbox,
      title: 'O cartão fechou — e veio surpresa',
      desc: 'Esqueceu daquela compra parcelada, do streaming que cobrou sem avisar, do almoço daquela quarta. Fatura virou ansiedade.',
    },
  ]

  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-rose)' }}>
          Você reconhece isso?
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Cuidar do dinheiro <em style={{ fontStyle: 'italic', color: 'var(--accent-rose)' }}>não devia</em> ser tão difícil.
        </h2>
        <p className="max-w-xl mx-auto text-sm sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
          A maioria dos métodos exige disciplina demais, tempo demais ou conhecimento demais.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {problems.map((p, i) => {
          const Icon = p.icon
          return (
            <div
              key={i}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--bg-elev2)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3"
                style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>
                <Icon size={16} />
              </div>
              <h3 className="font-semibold mb-1.5 text-base" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{p.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================
// SOLUÇÃO — apresenta o Alfred como caminho
// ============================================================
function SolutionSection() {
  return (
    <section className="mb-20 sm:mb-28">
      <div className="rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(16,185,129,0.04))',
          border: '1px solid rgba(212,175,55,0.2)',
        }}>
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-emerald)' }}>
          A solução
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-5xl mb-5">
          Tem um <em style={{ fontStyle: 'italic', color: 'var(--accent-gold)' }}>mordomo</em> pra cuidar disso.
        </h2>
        <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          O <strong style={{ color: 'var(--text-primary)' }}>Alfred</strong> mora no seu WhatsApp.
          Conversa com você como qualquer outro contato — só que ao invés de "oi, tudo bem?", você diz{' '}
          <em style={{ color: 'var(--accent-gold)', fontStyle: 'italic' }}>"gastei 80 no mercado"</em>{' '}
          e ele anota, organiza e mostra no seu painel.
        </p>
        <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mt-4" style={{ color: 'var(--text-secondary)' }}>
          Sem planilha. Sem calculadora. Sem categoria pra escolher. Sem esforço.
        </p>
      </div>
    </section>
  )
}

// ============================================================
// DEMO — exemplos de conversa
// ============================================================
function Demo() {
  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
          Veja em ação
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Conversa natural. Resultados precisos.
        </h2>
        <p className="max-w-xl mx-auto text-sm sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
          Mande como falaria com um amigo. Alfred entende, classifica e registra.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <ChatExample
          title="Despesa rápida"
          messages={[
            { from: 'user', text: 'calça 200 nubank parcelado 4x' },
            { from: 'alfred', text: '🎩 Compreendido. Registrei R$ 200 em 4× no Nubank — "Calça". Confirme no aplicativo quando puder.' },
          ]}
        />

        <ChatExample
          title="Mande por áudio"
          messages={[
            { from: 'user', audio: '🎤 0:12 ▶' },
            { from: 'alfred', text: '🎩 Transcrevi: "gastei 80 no mercado pix e recebi 200 do consultório". Lancei as 2 transações.' },
          ]}
        />

        <ChatExample
          title="Consulte na hora"
          messages={[
            { from: 'user', text: 'quanto sobra do mês?' },
            { from: 'alfred', text: 'Sobram *R$ 1.840,00* depois das despesas fixas. Excelente disciplina, se me permite o comentário.' },
          ]}
        />

        <ChatExample
          title="Acompanhe metas"
          messages={[
            { from: 'user', text: 'como tá meu cofre do casamento?' },
            { from: 'alfred', text: 'Cofre Casamento com *R$ 8.400,00* — 28% da meta de R$ 30.000. Cada vez mais perto. Admirável.' },
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
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}>
      <div className="text-xs uppercase tracking-wider mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>{title}</div>
      <div className="space-y-2.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.from === 'user' ? 'ml-auto' : ''}`}
            style={
              m.from === 'user'
                ? { background: 'linear-gradient(180deg, #1e2547, #161b35)', color: 'rgba(255,255,255,0.92)', borderBottomRightRadius: 6 }
                : { background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', borderBottomLeftRadius: 6 }
            }
          >
            {m.audio ? <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.65)' }}>{m.audio}</span> : m.text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// COMO FUNCIONA — 3 passos
// ============================================================
function HowItWorks() {
  const steps = [
    {
      num: '1',
      title: 'Crie sua conta em 3 minutos',
      desc: 'Email, senha e dados básicos. Sem questionários complicados. Você já entra direto no app.',
    },
    {
      num: '2',
      title: 'Vincule seu WhatsApp ao Alfred',
      desc: 'Salve o contato do Alfred e mande "oi". Ele se apresenta e configura tudo em uma conversa.',
    },
    {
      num: '3',
      title: 'Use no dia a dia',
      desc: 'Mensagem ou áudio quando gastar, receber ou consultar. O painel se atualiza sozinho. Você só vê o resultado.',
    },
  ]

  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
          Tudo simples
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Pronto pra usar em 3 passos.
        </h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
        {steps.map((s, i) => (
          <div key={i} className="text-center px-2">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 text-2xl font-semibold"
              style={{
                background: 'linear-gradient(180deg, rgba(212,175,55,0.18), rgba(212,175,55,0.05))',
                color: 'var(--accent-gold)',
                border: '1px solid rgba(212,175,55,0.3)',
                fontFamily: 'Fraunces, serif',
              }}
            >
              {s.num}
            </div>
            <h3 className="font-semibold mb-2 text-lg" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================
// FEATURES — orientadas a BENEFÍCIO, não feature
// ============================================================
function Features() {
  const features = [
    {
      icon: MessageCircle,
      title: 'Alfred no WhatsApp',
      desc: 'Texto ou áudio. Você fala como falaria com um amigo. Ele entende gírias, valores escritos por extenso, abreviações.',
      accent: 'gold',
    },
    {
      icon: Target,
      title: 'Categorias com limite mensal',
      desc: 'Defina quanto pode gastar com Mercado, Lazer, Saídas. Veja em tempo real quando tá apertando — antes do fim do mês.',
      accent: 'rose',
    },
    {
      icon: PiggyBank,
      title: 'Cofres com metas',
      desc: 'Reserva de emergência, casamento, viagem, IPVA. Crie cofres com valor objetivo e acompanhe o progresso visualmente.',
      accent: 'cyan',
    },
    {
      icon: Users,
      title: 'Gastos compartilhados',
      desc: 'Comprou pro Pedro? Atribua a ele. Marque como "a receber" e veja quem deve quanto pra você. Sem confusão.',
      accent: 'amber',
    },
    {
      icon: Sparkles,
      title: 'Parcelados inteligentes',
      desc: 'Você diz "10x de 200 no Nubank" e o Alfred cria as 10 parcelas nos próximos meses. Sem precisar lançar uma a uma.',
      accent: 'violet',
    },
    {
      icon: Calendar,
      title: 'Gastos fixos automáticos',
      desc: 'Aluguel, Netflix, academia — uma vez cadastrado, rola todo mês sem você fazer nada. Foco no que é variável.',
      accent: 'emerald',
    },
    {
      icon: CreditCard,
      title: 'Cartões organizados',
      desc: 'Cadastre seus cartões com data de vencimento. Quando gastar, o Alfred já sabe em qual cartão lançar. Faturas previsíveis.',
      accent: 'sky',
    },
    {
      icon: BarChart3,
      title: 'Painel visual',
      desc: 'Gráfico de pizza por categoria, total disponível pra gastar, receita vs despesa. Tudo em uma tela, sem rolar.',
      accent: 'fuchsia',
    },
  ]

  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
          Tudo no Domus
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Recursos pensados pra quem<br className="hidden sm:block" /> quer controle, não complexidade.
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {features.map((f, i) => {
          const Icon = f.icon
          const colorVar = `var(--accent-${f.accent})`
          return (
            <div
              key={i}
              className="p-5 rounded-2xl"
              style={{
                background: 'var(--bg-elev2)',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                  style={{
                    background: `${colorVar}1a`,  // 10% opacity hex
                    color: colorVar,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold mb-1.5 text-base" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{f.desc}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================
// PRA QUEM É — segmentação clara
// ============================================================
function WhoFor() {
  const targets = [
    {
      title: 'Profissionais ocupados',
      desc: 'Você não tem tempo pra abrir planilha, categorizar e calcular. Quer controle entre uma reunião e outra — 30 segundos no WhatsApp resolvem.',
      icon: '👔',
    },
    {
      title: 'Quem tentou planilha (e desistiu)',
      desc: 'A planilha ficou obsoleta porque exige disciplina demais. Com o Alfred, você só precisa lembrar de mandar mensagem — ele faz o resto.',
      icon: '📊',
    },
    {
      title: 'Casais & famílias',
      desc: 'Compartilhe gastos, atribua compras pra outras pessoas, acompanhe quem deve quanto. Sem brigas no fim do mês, sem mistério.',
      icon: '👨‍👩‍👧',
    },
    {
      title: 'Quem quer parar de adiar',
      desc: 'Você sabe que precisa organizar. Só não sabe por onde começar. O Alfred começa pra você — basta criar conta e mandar a primeira mensagem.',
      icon: '🎯',
    },
  ]

  return (
    <section className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
          Pra quem é
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Pensado pra quem perdeu paciência<br className="hidden sm:block" /> com método tradicional.
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {targets.map((t, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl"
            style={{
              background: 'var(--bg-elev2)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div className="text-3xl mb-3">{t.icon}</div>
            <h3 className="font-semibold mb-1.5 text-base" style={{ color: 'var(--text-primary)' }}>{t.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================
// PRICING — corrigido (sem prometer "grátis" porque não é)
// ============================================================
function Pricing() {
  return (
    <section id="planos" className="mb-20 sm:mb-28">
      <div className="text-center mb-10">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
          Investimento
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
          Menos que um café por semana.
        </h2>
        <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: 'var(--text-tertiary)' }}>
          7 dias de garantia. Cancele quando quiser. Sem letras miúdas.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Mensal */}
        <div className="p-6 rounded-2xl relative"
          style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-medium)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg mb-1" >Mensal</div>
          <div className="flex items-baseline gap-1 mb-1">
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-4xl font-semibold">R$ 19</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/mês</span>
          </div>
          <div className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Cobrança recorrente no cartão. Cancele quando quiser.</div>
          <ul className="space-y-2 mb-5">
            {['Acesso completo ao app', 'Alfred no WhatsApp (texto + áudio)', 'Cofres, categorias, parcelados', 'Garantia de 7 dias (CDC)'].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Check size={14} style={{ color: 'var(--accent-emerald)', marginTop: 2 }} className="shrink-0" />
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
            Economia de 27%
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--accent-gold)' }} className="text-lg mb-1">Anual</div>
          <div className="flex items-baseline gap-1 mb-1">
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-4xl font-semibold">R$ 167</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ano</span>
          </div>
          <div className="text-xs mb-4" style={{ color: 'var(--accent-gold)' }}>Equivale a R$ 13,92/mês — economiza R$ 61</div>
          <ul className="space-y-2 mb-5">
            {['Tudo do plano Mensal', 'Pague 1× (PIX ou cartão em até 12×)', 'Sem preocupação com cobrança mensal', 'Garantia de 7 dias (CDC)'].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Check size={14} style={{ color: 'var(--accent-gold)', marginTop: 2 }} className="shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-center mt-8">
        <Link
          to="/comecar"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition"
          style={{
            background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
            color: '#070912',
            boxShadow: '0 8px 24px rgba(212,175,55,0.25)',
          }}
        >
          🎩 Quero assinar agora
          <ChevronRight size={16} />
        </Link>
        <div className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          7 dias de garantia · Cancele quando quiser
        </div>
      </div>
    </section>
  )
}

// ============================================================
// GARANTIA — destaca o risco zero
// ============================================================
function Guarantee() {
  return (
    <section className="mb-20 sm:mb-28">
      <div className="rounded-3xl p-8 sm:p-10 text-center max-w-3xl mx-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))',
          border: '1px solid rgba(16,185,129,0.25)',
        }}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)' }}>
          <ShieldCheck size={32} />
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl sm:text-3xl mb-3">
          O risco é todo nosso.
        </h2>
        <p className="text-sm sm:text-base leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Você tem <strong style={{ color: 'var(--accent-emerald)' }}>7 dias</strong> pra testar sem compromisso.
          Se não gostar, basta mandar um email pra{' '}
          <strong style={{ color: 'var(--text-primary)' }}>alquimiadigital08@gmail.com</strong> —
          devolvemos 100% do valor, sem perguntas, sem burocracia.
        </p>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Garantia respaldada pelo Código de Defesa do Consumidor (art. 49).
        </p>
      </div>
    </section>
  )
}

// ============================================================
// FAQ
// ============================================================
function FAQ() {
  const faqs = [
    {
      q: 'Como funciona o Alfred no WhatsApp?',
      a: 'Depois de criar conta, você vincula seu número de celular nas configurações e salva o contato do Alfred. A partir daí, é só mandar mensagem natural — texto ou áudio — e ele entende, classifica e registra. Você sempre confirma no app antes de salvar definitivamente.',
    },
    {
      q: 'Preciso instalar algum aplicativo?',
      a: 'Não. O Domus funciona direto no navegador (Chrome, Safari, Edge) de qualquer celular ou computador. Você pode adicionar à tela inicial pra parecer um app, mas é opcional. Em breve teremos versão Android na Play Store.',
    },
    {
      q: 'Meus dados ficam seguros?',
      a: 'Sim. Tudo armazenado em servidores criptografados (Supabase, mesma tecnologia que startups como Mozilla e GitHub usam). Você é o único que vê seus dados. Não compartilhamos, não vendemos, não enviamos pra ninguém. 100% LGPD compliant.',
    },
    {
      q: 'Como funciona a garantia de 7 dias?',
      a: 'É como o Código de Defesa do Consumidor garante (art. 49). Em até 7 dias após a primeira cobrança, basta escrever pra alquimiadigital08@gmail.com pedindo reembolso. Devolvemos o valor integral, sem perguntas. É raro, mas pode acontecer.',
    },
    {
      q: 'Posso cancelar quando quiser?',
      a: 'Pode, sem ligações nem burocracia. Acessa Configurações → Assinatura → Cancelar. Mantém o acesso até o fim do período já pago. Pode reativar quando quiser — seus dados ficam preservados.',
    },
    {
      q: 'Funciona pra controlar finanças do casal?',
      a: 'Hoje cada conta é individual, mas você pode atribuir gastos a outras pessoas (cônjuge, filhos) e acompanhar quem deve o quê. Plano família com acesso compartilhado real está nos planos pros próximos meses.',
    },
    {
      q: 'E se o Alfred não entender o que eu mandar?',
      a: 'Ele pergunta. Tipo "Você quis dizer R$ 80 ou R$ 800?". E sempre mostra como interpretou antes de salvar — você confirma ou ajusta. Conforme você usa, ele aprende seus padrões e fica mais preciso.',
    },
    {
      q: 'Posso usar pra empresa também?',
      a: 'O Domus é otimizado pra finanças pessoais (incluindo MEI/autônomo). Pra empresa com mais complexidade (vários sócios, NF-e, DRE detalhado), recomendo soluções específicas pra empresariais.',
    },
  ]

  const [open, setOpen] = useState(null)

  return (
    <section id="faq" className="mb-20 sm:mb-28 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--accent-gold)' }}>
          Tira-dúvidas
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
              background: open === i ? 'var(--bg-elev1)' : 'var(--bg-elev2)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-sm sm:text-base">{f.q}</span>
              <ChevronRight size={16} className={`shrink-0 transition-transform ${open === i ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
            </div>
            {open === i && (
              <div className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {f.a}
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

// ============================================================
// FINAL CTA
// ============================================================
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
          Pronto pra começar?
        </h2>
        <p className="max-w-md mx-auto mb-6 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          🎩 Alfred aguarda suas instruções. Suas finanças nunca foram tão simples de cuidar.
        </p>

        <Link
          to="/comecar"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-base transition"
          style={{
            background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
            color: '#070912',
            boxShadow: '0 12px 32px rgba(212,175,55,0.3)',
          }}
        >
          Quero ter o Alfred
          <ChevronRight size={18} />
        </Link>
        <div className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          7 dias de garantia · Cancele quando quiser · Sem amarras
        </div>
      </div>
    </section>
  )
}

// ============================================================
// FOOTER
// ============================================================
function Footer() {
  return (
    <footer className="pt-8 pb-8 border-t" style={{ borderColor: 'var(--border-soft)' }}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={12} style={{ color: 'var(--accent-gold)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Domus © {new Date().getFullYear()} · Alquimia Digital LTDA · CNPJ 58.491.823/0001-47
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <Link to="/termos" className="transition hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>Termos de Uso</Link>
          <Link to="/privacidade" className="transition hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>Privacidade</Link>
          <Link to="/login" className="transition hover:opacity-80" style={{ color: 'var(--text-tertiary)' }}>Entrar</Link>
        </div>
      </div>
    </footer>
  )
}
