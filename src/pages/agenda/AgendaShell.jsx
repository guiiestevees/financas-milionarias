import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, CalendarRange, ListTodo, Bell, Settings,
  LayoutGrid, Sparkles,
} from 'lucide-react'

// ===========================================================================
// AgendaShell — shell do "App Agenda" dentro da suíte Domus.
// Estrutura paralela ao AppShell (Finanças), com bottom nav própria.
// Por enquanto contém placeholders pra cada tab — features virão depois.
// ===========================================================================

const TABS = [
  { id: 'hoje',      label: 'Hoje',     icon: CalendarDays },
  { id: 'semana',    label: 'Semana',   icon: CalendarRange },
  { id: 'tarefas',   label: 'Tarefas',  icon: ListTodo },
  { id: 'lembretes', label: 'Lembrar',  icon: Bell },
  { id: 'ajustes',   label: 'Ajustes',  icon: Settings },
]

export default function AgendaShell() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('hoje')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>

      {/* Header próprio da Agenda */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-between gap-3 mb-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}
            >
              <CalendarDays size={18} />
            </div>
            <div>
              <div style={{ letterSpacing: '0.2em', fontSize: '10px', fontWeight: 600, color: '#06b6d4' }} className="uppercase">
                Domus · Agenda
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {TABS.find((t) => t.id === tab)?.label}
              </div>
            </div>
          </div>

          {/* Botão "trocar app" (volta pro launcher) */}
          <button
            onClick={() => navigate('/launcher')}
            title="Trocar app"
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition hover:opacity-80"
            style={{
              background: 'var(--bg-elev1)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
            }}
          >
            <LayoutGrid size={14} />
            <span className="text-xs font-medium hidden sm:inline">Trocar app</span>
          </button>
        </div>

        {/* Título da tela */}
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-4xl sm:text-5xl"
        >
          {tab === 'hoje' && (<>O dia <em style={titleEm}>de hoje.</em></>)}
          {tab === 'semana' && (<>Sua <em style={titleEm}>semana.</em></>)}
          {tab === 'tarefas' && (<>Suas <em style={titleEm}>tarefas.</em></>)}
          {tab === 'lembretes' && (<>Seus <em style={titleEm}>lembretes.</em></>)}
          {tab === 'ajustes' && (<>Ajustes da <em style={titleEm}>Agenda.</em></>)}
        </h1>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 mt-4" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0))' }}>
        <Placeholder tab={tab} />
      </main>

      {/* Bottom nav própria da Agenda */}
      <AgendaTabs tab={tab} setTab={setTab} />
    </div>
  )
}

const titleEm = {
  fontStyle: 'italic',
  background: 'linear-gradient(90deg, #67e8f9, #06b6d4, #0e7490)',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
}

// ---------- Placeholder ----------
// Conteúdo provisório enquanto a Agenda não tem features.
function Placeholder({ tab }) {
  const messages = {
    hoje: {
      icon: '📅',
      title: 'Agenda em construção',
      text: 'Em breve você poderá anotar seus compromissos do dia aqui. Hora, local, descrição — tudo o que precisa pra não esquecer.',
    },
    semana: {
      icon: '🗓️',
      title: 'Visão semanal',
      text: 'Veja tudo o que está marcado pra semana de uma só vez. Em desenvolvimento.',
    },
    tarefas: {
      icon: '✅',
      title: 'Lista de tarefas',
      text: 'Anote o que precisa fazer (sem data específica), marque como concluído. Em desenvolvimento.',
    },
    lembretes: {
      icon: '🔔',
      title: 'Lembretes inteligentes',
      text: 'Receba avisos pelo WhatsApp do Alfred no dia/hora dos seus compromissos. Em desenvolvimento.',
    },
    ajustes: {
      icon: '⚙️',
      title: 'Ajustes da Agenda',
      text: 'Configure notificações, primeiro dia da semana e outras preferências. Em desenvolvimento.',
    },
  }
  const m = messages[tab] || messages.hoje

  return (
    <div
      className="rounded-3xl p-8 sm:p-12 text-center mt-6"
      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
    >
      <div className="text-5xl mb-4">{m.icon}</div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl sm:text-3xl mb-3">
        {m.title}
      </h2>
      <p className="text-sm sm:text-base max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        {m.text}
      </p>

      <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
        style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--accent-gold)' }}>
        <Sparkles size={11} />
        Tem ideias do que quer ver aqui? Mande pra alquimiadigital08@gmail.com
      </div>
    </div>
  )
}

// ---------- AgendaTabs (bottom nav própria) ----------
function AgendaTabs({ tab, setTab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'var(--bg-app-soft)',
        borderTop: '1px solid var(--border-soft)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div className="max-w-4xl mx-auto flex items-stretch">
        {TABS.map((it) => {
          const Icon = it.icon
          const active = tab === it.id
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3.5 sm:py-4 transition relative"
              style={{
                color: active ? '#06b6d4' : 'var(--text-muted)',
                minHeight: 64,
              }}
            >
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full transition-all"
                  style={{ background: '#06b6d4' }}
                />
              )}
              <Icon size={26} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[11px] sm:text-[12px] font-medium" style={{ letterSpacing: '0.01em' }}>
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
