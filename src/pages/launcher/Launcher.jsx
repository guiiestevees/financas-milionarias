import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Calendar, ShoppingCart, ArrowRight, LogOut, Check,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAppPreference } from '../../hooks/useAppPreference'
import { useTheme } from '../../hooks/useTheme'

// ===========================================================================
// App Launcher — tela inicial que mostra os apps do Domus.
// Usuário escolhe qual quer abrir e pode definir um como padrão.
// ===========================================================================

const APPS = [
  {
    id: 'financas',
    name: 'Finanças',
    description: 'Cuide do seu dinheiro com clareza.',
    icon: Wallet,
    color: '#10b981',
    route: '/app',
    available: true,
  },
  {
    id: 'agenda',
    name: 'Agenda',
    description: 'Anote compromissos e lembretes.',
    icon: Calendar,
    color: '#06b6d4',
    route: '/agenda',
    available: true,
  },
  {
    id: 'mercado',
    name: 'Mercado',
    description: 'Listas de compras inteligentes.',
    icon: ShoppingCart,
    color: '#a78bfa',
    route: null,
    available: false,
    comingSoon: true,
  },
]

export default function Launcher() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { defaultApp, setDefaultApp } = useAppPreference()
  const [prefsOpen, setPrefsOpen] = useState(false)

  // Aplica o tema GLOBAL (sem appKey) — espelha o último tema escolhido em qualquer app
  useTheme()

  const firstName = (user?.user_metadata?.name || '').trim().split(' ')[0] || ''

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-3xl w-full mx-auto px-5 py-6 sm:py-10 flex-1">

        {/* Header */}
        <div className="flex items-center justify-between mb-12 sm:mb-16">
          <div className="flex items-center gap-2.5">
            <img src="/domus-logo-512.png" alt="Domus" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div>
              <div style={{ letterSpacing: '0.2em', color: 'var(--accent-gold)', fontSize: '11px', fontWeight: 600 }} className="uppercase">
                Domus
              </div>
              {firstName && (
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Bem-vindo, {firstName}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sair"
            className="p-2 rounded-xl transition hover:opacity-80"
            style={{
              background: 'var(--bg-elev1)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-tertiary)',
            }}
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Pergunta principal */}
        <div className="text-center mb-10 sm:mb-14">
          <h1
            style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
            className="text-3xl sm:text-5xl mb-3"
          >
            Como posso{' '}
            <em style={{ fontStyle: 'italic', background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              servi-lo
            </em>{' '}
            hoje?
          </h1>
          <p className="text-sm sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
            🎩 Escolha o app que deseja utilizar.
          </p>
        </div>

        {/* Grid de apps */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {APPS.map((app) => {
            const Icon = app.icon
            const isDefault = defaultApp === app.id
            return (
              <button
                key={app.id}
                onClick={() => app.available && navigate(app.route)}
                disabled={!app.available}
                className="text-left p-5 sm:p-6 rounded-2xl transition group relative disabled:cursor-default"
                style={{
                  background: 'var(--card-bg)',
                  border: `1px solid ${app.available ? `${app.color}40` : 'var(--card-border)'}`,
                  opacity: app.available ? 1 : 0.55,
                }}
              >
                {/* Badge "padrão" */}
                {isDefault && app.available && (
                  <div
                    className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"
                    style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)' }}
                  >
                    <Check size={10} /> Padrão
                  </div>
                )}

                {/* Badge "em breve" */}
                {app.comingSoon && (
                  <div
                    className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: 'var(--bg-elev2)', color: 'var(--text-muted)' }}
                  >
                    Em breve
                  </div>
                )}

                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition group-hover:scale-105"
                  style={{
                    background: app.available ? `${app.color}20` : 'var(--bg-elev2)',
                    color: app.color,
                  }}
                >
                  <Icon size={28} />
                </div>

                <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl mb-1">
                  {app.name}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {app.description}
                </p>

                {app.available && (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: app.color }}>
                    Abrir <ArrowRight size={14} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Preferências (expansível) */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
        >
          <button
            onClick={() => setPrefsOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 p-4 transition hover:opacity-80"
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              ⚙️ Ao abrir o Domus, ir para…
            </span>
            {prefsOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
          </button>

          {prefsOpen && (
            <div className="px-4 pb-4 space-y-2">
              {[
                { id: 'launcher', label: 'Sempre mostrar este menu', desc: 'Você escolhe a cada acesso.' },
                { id: 'financas', label: 'Finanças', desc: 'Abre direto no controle financeiro.' },
                { id: 'agenda', label: 'Agenda', desc: 'Abre direto nos seus compromissos.' },
              ].map((opt) => {
                const isSel = defaultApp === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setDefaultApp(opt.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition"
                    style={{
                      background: isSel ? 'rgba(212,175,55,0.1)' : 'var(--bg-elev1)',
                      border: `1px solid ${isSel ? 'rgba(212,175,55,0.4)' : 'var(--border-soft)'}`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5"
                      style={{
                        background: isSel ? 'var(--accent-gold)' : 'transparent',
                        border: `2px solid ${isSel ? 'var(--accent-gold)' : 'var(--border-strong)'}`,
                      }}
                    >
                      {isSel && <Check size={11} style={{ color: '#070912' }} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {opt.label}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
