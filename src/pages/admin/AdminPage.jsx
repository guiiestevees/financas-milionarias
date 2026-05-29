import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, Users, ShieldCheck } from 'lucide-react'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import AdminDashboard from './AdminDashboard'
import AdminUsers from './AdminUsers'

// Painel admin com 2 tabs: Dashboard | Usuários
// Só acessível pra emails listados em VITE_ADMIN_EMAILS.
// Backend faz validação dupla nos endpoints /api/admin/*.
export default function AdminPage() {
  const navigate = useNavigate()
  const { isAdmin } = useIsAdmin()
  const [tab, setTab] = useState('dashboard')

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-app)' }}>
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl mb-2">
            Acesso restrito
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Esta área é só pra administradores.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="mt-6 px-4 py-2 rounded-lg text-sm transition"
            style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
          >
            Voltar pro app
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 text-sm mb-5 transition"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} style={{ color: '#d4af37' }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: '#d4af37' }}>
              Painel administrativo
            </span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl">
            Métricas do Domus
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 -mx-1 px-1 overflow-x-auto">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={LayoutDashboard} label="Dashboard" />
          <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={Users} label="Usuários" />
        </div>

        {tab === 'dashboard' && <AdminDashboard />}
        {tab === 'users' && <AdminUsers />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition"
      style={{
        background: active ? 'var(--bg-elev1)' : 'transparent',
        border: `1px solid ${active ? 'var(--border-medium)' : 'transparent'}`,
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
