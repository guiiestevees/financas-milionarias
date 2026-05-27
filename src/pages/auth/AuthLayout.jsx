import { Outlet, useLocation, Link } from 'react-router-dom'
import { Sparkles, ArrowLeft } from 'lucide-react'

// Mensagens contextuais por rota
const HEADINGS = {
  '/login': { lead: 'Bem-vindo de', accent: 'volta.', back: true },
  '/signup': { lead: 'Crie sua', accent: 'conta.', back: true },
  '/forgot-password': { lead: 'Recupere o', accent: 'acesso.', back: true },
  '/reset-password': { lead: 'Nova', accent: 'senha.', back: false },
  '/confirm': { lead: 'Quase', accent: 'lá.', back: false },
}

export default function AuthLayout() {
  const { pathname } = useLocation()
  const h = HEADINGS[pathname] || HEADINGS['/login']

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative"
      style={{ background: '#070912' }}
    >
      {/* Botão pra voltar pra landing */}
      {h.back && (
        <Link
          to="/"
          className="absolute top-5 left-5 text-xs text-white/45 hover:text-white/85 transition flex items-center gap-1.5"
        >
          <ArrowLeft size={13} /> Voltar
        </Link>
      )}

      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={14} style={{ color: '#d4af37' }} />
          <span style={{ letterSpacing: '0.25em', color: '#d4af37', fontSize: '11px' }} className="uppercase">
            Domus
          </span>
        </div>
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-4xl text-white"
        >
          {h.lead}{' '}
          <em
            style={{
              fontStyle: 'italic',
              background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {h.accent}
          </em>
        </h1>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Outlet />
      </div>
    </div>
  )
}
