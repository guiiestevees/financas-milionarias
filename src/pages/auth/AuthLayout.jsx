import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#070912' }}
    >
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles size={14} style={{ color: '#d4af37' }} />
          <span style={{ letterSpacing: '0.25em', color: '#d4af37', fontSize: '11px' }} className="uppercase">
            Finanças Milionárias
          </span>
        </div>
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-4xl text-white"
        >
          Bem-vindo de{' '}
          <em
            style={{
              fontStyle: 'italic',
              background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            volta.
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
