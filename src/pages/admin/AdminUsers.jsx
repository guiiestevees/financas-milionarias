import { useEffect, useState, useMemo } from 'react'
import { Loader2, Search, Eye, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminUserDetail from './AdminUserDetail'

const STATUS_LABELS = {
  active: { label: 'Ativa', color: '#10b981' },
  trial: { label: 'Trial', color: '#06b6d4' },
  overdue: { label: 'Atrasada', color: '#f59e0b' },
  cancelled: { label: 'Cancelada', color: '#94a3b8' },
  expired: { label: 'Expirada', color: '#f43f5e' },
}

const STATUS_FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'trial', label: 'Trial' },
  { id: 'overdue', label: 'Atrasados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'expired', label: 'Expirados' },
]

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams()
      params.set('resource', 'users')
      if (status) params.set('status', status)
      params.set('limit', '500')
      const res = await fetch(`/api/admin?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setUsers(data.users || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const target = `${u.email} ${u.name} ${u.cpf} ${u.phone}`.toLowerCase()
      return target.includes(q)
    })
  }, [users, search])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, CPF ou celular..."
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              flex: 1,
              outline: 'none',
              fontSize: 14,
              padding: '6px 0',
            }}
            className="placeholder:text-white/30"
          />
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
            style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatus(f.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition"
              style={{
                background: status === f.id ? 'rgba(212,175,55,0.15)' : 'var(--bg-elev2)',
                border: `1px solid ${status === f.id ? 'rgba(212,175,55,0.4)' : 'var(--border-soft)'}`,
                color: status === f.id ? '#d4af37' : 'var(--text-tertiary)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}>
        <div className="text-xs uppercase tracking-widest px-4 py-3 border-b" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-soft)' }}>
          {filtered.length} {filtered.length === 1 ? 'usuário' : 'usuários'}
        </div>

        {loading && filtered.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 size={24} className="animate-spin mx-auto" style={{ color: '#d4af37' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum usuário encontrado
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
            {filtered.map((u) => {
              const statusInfo = STATUS_LABELS[u.subscriptionStatus] || STATUS_LABELS.expired
              return (
                <button
                  key={u.userId}
                  onClick={() => setSelectedId(u.userId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
                  style={{ borderTop: '1px solid var(--border-soft)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {u.name || u.email}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
                        style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {u.email}
                      {u.cpf && <span style={{ color: 'var(--text-muted)' }}> · {formatCpf(u.cpf)}</span>}
                      {u.phone && <span style={{ color: 'var(--text-muted)' }}> · {formatPhone(u.phone)}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                      Criado: {fmtDate(u.createdAt)}
                    </div>
                    {u.subscriptionUntil && (
                      <div className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        Até: {fmtDate(u.subscriptionUntil)}
                      </div>
                    )}
                  </div>
                  <Eye size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de detalhe */}
      {selectedId && (
        <AdminUserDetail
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChange={() => { load() }}
        />
      )}
    </div>
  )
}

function formatCpf(d) {
  const s = String(d || '').replace(/\D/g, '')
  if (s.length !== 11) return s
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(d) {
  const s = String(d || '').replace(/\D/g, '')
  if (s.length < 10) return s
  const tail = s.length === 13 ? s.slice(-11) : (s.length === 12 ? s.slice(-10) : s.slice(-11))
  if (tail.length === 11) return `(${tail.slice(0, 2)}) ${tail.slice(2, 7)}-${tail.slice(7)}`
  return `(${tail.slice(0, 2)}) ${tail.slice(2, 6)}-${tail.slice(6)}`
}
