import { useState, useEffect } from 'react'
import { X, Loader2, Check, AlertTriangle, Trash2, Gift, ShieldCheck, Edit2, XCircle, ExternalLink, Mail, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const fmtBRL = (n) => `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('pt-BR') : '—'

export default function AdminUserDetail({ userId, onClose, onChange }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)  // null | 'name' | 'email' | 'phone' | 'cpf'
  const [draft, setDraft] = useState('')
  const [pendingAction, setPendingAction] = useState(null)  // null | 'cancel' | 'grant' | 'verify' | 'delete'
  const [actionLoading, setActionLoading] = useState(false)
  const [grantDays, setGrantDays] = useState(30)
  const [successMsg, setSuccessMsg] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/admin?resource=user&id=${userId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erro')
      setData(j)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  const callAction = async (action, body) => {
    setActionLoading(true)
    setError(null)
    setSuccessMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/admin?resource=user&id=${userId}&action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body || {}),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erro')
      setSuccessMsg('✓ Atualizado')
      setTimeout(() => setSuccessMsg(''), 2500)
      setPendingAction(null)
      setEditing(null)
      onChange?.()
      if (action === 'delete') {
        onClose()
        return
      }
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const startEdit = (field, currentValue) => {
    setEditing(field)
    setDraft(currentValue || '')
    setError(null)
  }

  const saveEdit = () => {
    if (!editing) return
    callAction('update', { [editing]: draft.trim() })
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(7,9,18,0.75)', backdropFilter: 'blur(8px)' }}>
      <div onClick={(e) => e.stopPropagation()} className="rounded-2xl w-full max-w-2xl my-4"
        style={{ background: 'var(--bg-app-soft)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Detalhes do usuário</div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl sm:text-2xl truncate">
              {data?.authUser?.userMetadata?.name || data?.authUser?.email || 'Carregando…'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition hover:bg-white/5" style={{ color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Mensagens */}
        {error && (
          <div className="mx-5 mt-4 rounded-lg p-3 text-sm flex items-start gap-2" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 rounded-lg p-2.5 text-sm flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
            <Check size={14} /> {successMsg}
          </div>
        )}

        {loading && !data ? (
          <div className="p-12 text-center">
            <Loader2 size={28} className="animate-spin mx-auto" style={{ color: '#d4af37' }} />
          </div>
        ) : data && (
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

            {/* Identidade — campos editáveis */}
            <Section title="Identidade">
              <Field label="Nome" value={data.authUser?.userMetadata?.name} field="name" editing={editing} draft={draft} setDraft={setDraft} startEdit={startEdit} saveEdit={saveEdit} cancel={() => setEditing(null)} actionLoading={actionLoading} />
              <Field label="Email" value={data.authUser?.email} field="email" editing={editing} draft={draft} setDraft={setDraft} startEdit={startEdit} saveEdit={saveEdit} cancel={() => setEditing(null)} actionLoading={actionLoading} />
              <Field label="CPF" value={data.profile?.cpf} field="cpf" editing={editing} draft={draft} setDraft={setDraft} startEdit={startEdit} saveEdit={saveEdit} cancel={() => setEditing(null)} actionLoading={actionLoading} format={formatCpf} />
              <Field label="Celular" value={data.profile?.whatsapp_phone} field="phone" editing={editing} draft={draft} setDraft={setDraft} startEdit={startEdit} saveEdit={saveEdit} cancel={() => setEditing(null)} actionLoading={actionLoading} format={formatPhone} />
            </Section>

            {/* Assinatura */}
            <Section title="Assinatura">
              <InfoRow label="Status" value={
                <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded font-medium" style={statusStyle(data.profile?.subscription_status)}>
                  {data.profile?.subscription_status || '—'}
                </span>
              } />
              <InfoRow label="Plano" value={data.profile?.plan_id || '—'} />
              <InfoRow label="Acesso até" value={fmtDate(data.profile?.subscription_until)} />
              <InfoRow label="Asaas Subscription ID" value={data.profile?.asaas_subscription_id || '—'} mono />
              <InfoRow label="Asaas Customer ID" value={data.profile?.asaas_customer_id || '—'} mono />
            </Section>

            {/* Asaas — info real */}
            {data.asaas?.subscription && (
              <Section title="Asaas — assinatura">
                <InfoRow label="Status no Asaas" value={data.asaas.subscription.status} />
                <InfoRow label="Próxima cobrança" value={fmtDate(data.asaas.subscription.nextDueDate)} />
                <InfoRow label="Valor" value={fmtBRL(data.asaas.subscription.value)} />
                <InfoRow label="Forma" value={data.asaas.subscription.billingType} />
              </Section>
            )}

            {/* Pagamentos */}
            {data.asaas?.payments?.length > 0 && (
              <Section title={`Histórico de pagamentos (${data.asaas.payments.length})`}>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {data.asaas.payments.slice(0, 10).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs gap-2 py-1.5 px-2 rounded" style={{ background: 'var(--bg-elev2)' }}>
                      <div className="min-w-0">
                        <div className="truncate">{p.description || p.billingType}</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {fmtDate(p.paymentDate || p.dueDate)} · <span style={{ color: paymentStatusColor(p.status) }}>{p.status}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {fmtBRL(p.value)}
                        {p.invoiceUrl && (
                          <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="block text-[10px] underline" style={{ color: '#d4af37' }}>
                            ver <ExternalLink size={9} className="inline" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Verificação */}
            <Section title="Verificação">
              <InfoRow label="Verificado em" value={fmtDateTime(data.profile?.account_verified_at)} />
              <InfoRow label="Método" value={data.profile?.verification_method || '—'} />
              <InfoRow label="Email confirmado em" value={fmtDateTime(data.authUser?.emailConfirmedAt)} />
              <InfoRow label="Último login" value={fmtDateTime(data.authUser?.lastSignInAt)} />
            </Section>

            {/* Ações */}
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Ações administrativas
              </div>

              {pendingAction === 'grant' ? (
                <div className="space-y-2 mb-3 p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <div className="text-sm">Dar acesso por quantos dias?</div>
                  <input type="number" value={grantDays} onChange={(e) => setGrantDays(Number(e.target.value))} min={1} max={365}
                    style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', borderRadius: 8, padding: '6px 10px', fontSize: 14, width: 100, fontFamily: 'JetBrains Mono, monospace' }} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setPendingAction(null)} className="text-xs px-3 py-1.5 rounded" style={{ color: 'var(--text-tertiary)' }}>Cancelar</button>
                    <button onClick={() => callAction('grant-access', { days: grantDays })} disabled={actionLoading} className="text-xs px-3 py-1.5 rounded font-medium" style={{ background: '#10b981', color: 'white' }}>
                      {actionLoading ? 'Aplicando…' : `Liberar ${grantDays} dias`}
                    </button>
                  </div>
                </div>
              ) : pendingAction === 'cancel' ? (
                <ConfirmBox
                  message={data.profile?.asaas_subscription_id ? (
                    <>Cancelar assinatura no Asaas e marcar acesso como <strong>cancelled</strong>?
                    <br /><span className="text-xs opacity-70">Não estorna pagamentos já feitos.</span></>
                  ) : (
                    <>Marcar acesso como <strong>cancelled</strong>?
                    <br /><span className="text-xs opacity-70">Esse usuário não tem subscription recorrente (provavelmente pagou via PIX/parcelado). Só vai cortar o acesso ao app.</span></>
                  )}
                  onConfirm={() => callAction('cancel-subscription')}
                  onCancel={() => setPendingAction(null)}
                  loading={actionLoading}
                  danger
                />
              ) : pendingAction === 'delete' ? (
                <ConfirmBox
                  message={<><strong className="text-rose-300">Excluir definitivamente</strong> esse usuário do Auth e do banco? Esta ação não pode ser desfeita.</>}
                  onConfirm={() => callAction('delete')}
                  onCancel={() => setPendingAction(null)}
                  loading={actionLoading}
                  danger
                  confirmLabel="Excluir permanentemente"
                />
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <ActionBtn onClick={() => setPendingAction('grant')} icon={Gift} color="#10b981">Dar acesso (cortesia)</ActionBtn>
                <ActionBtn onClick={() => callAction('mark-verified')} icon={ShieldCheck} color="#06b6d4" disabled={!!data.profile?.account_verified_at}>
                  {data.profile?.account_verified_at ? 'Já verificado' : 'Marcar verificado'}
                </ActionBtn>
                <ActionBtn
                  onClick={() => setPendingAction('cancel')}
                  icon={XCircle}
                  color="#f59e0b"
                  disabled={data.profile?.subscription_status === 'cancelled' || data.profile?.subscription_status === 'expired'}
                >
                  {data.profile?.subscription_status === 'cancelled' ? 'Já cancelada'
                    : data.profile?.subscription_status === 'expired' ? 'Já expirada'
                    : 'Cancelar acesso'}
                </ActionBtn>
                <ActionBtn onClick={() => setPendingAction('delete')} icon={Trash2} color="#f43f5e">Excluir usuário</ActionBtn>
              </div>

              {/* Notificações ao cliente */}
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                  Avisar cliente do cancelamento
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ActionBtn
                    onClick={() => callAction('notify-email')}
                    icon={Mail}
                    color="#d4af37"
                  >
                    Enviar email
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => callAction('notify-whatsapp')}
                    icon={MessageCircle}
                    color="#25D366"
                    disabled={!data.profile?.whatsapp_phone}
                  >
                    {data.profile?.whatsapp_phone ? 'Enviar WhatsApp' : 'Sem WhatsApp'}
                  </ActionBtn>
                </div>
                <div className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  💡 Mensagem padrão de confirmação de cancelamento com a data até quando o acesso continua válido.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Sub-componentes ----------

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1.5 px-2 rounded" style={{ background: 'var(--bg-elev2)' }}>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="truncate text-right" style={{ fontFamily: mono ? 'JetBrains Mono, monospace' : undefined, fontSize: mono ? 12 : 14 }}>{value}</span>
    </div>
  )
}

function Field({ label, value, field, editing, draft, setDraft, startEdit, saveEdit, cancel, actionLoading, format }) {
  const isEditing = editing === field
  const display = format ? format(value) : (value || '—')
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1.5 px-2 rounded" style={{ background: 'var(--bg-elev2)' }}>
      <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancel() }}
            style={{ background: 'var(--bg-elev3)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: 13, flex: 1, minWidth: 0 }}
          />
          <button onClick={saveEdit} disabled={actionLoading} className="p-1 rounded" style={{ background: '#10b981', color: 'white' }}>
            {actionLoading ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button onClick={cancel} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
            <X size={11} />
          </button>
        </div>
      ) : (
        <button onClick={() => startEdit(field, value || '')} className="flex items-center gap-1.5 truncate hover:opacity-80 transition group">
          <span className="truncate">{display}</span>
          <Edit2 size={11} className="opacity-30 group-hover:opacity-80 shrink-0" />
        </button>
      )}
    </div>
  )
}

function ActionBtn({ children, onClick, icon: Icon, color, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: `${color}15`,
        border: `1px solid ${color}40`,
        color: color,
      }}
    >
      <Icon size={13} />
      {children}
    </button>
  )
}

function ConfirmBox({ message, onConfirm, onCancel, loading, danger, confirmLabel = 'Confirmar' }) {
  return (
    <div className="mb-3 p-3 rounded-lg text-sm" style={{
      background: danger ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
      border: `1px solid ${danger ? 'rgba(244,63,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
      color: danger ? '#fda4af' : '#fbbf24'
    }}>
      <div className="mb-2">{message}</div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} disabled={loading} className="text-xs px-3 py-1.5 rounded" style={{ color: 'var(--text-tertiary)' }}>Cancelar</button>
        <button onClick={onConfirm} disabled={loading} className="text-xs px-3 py-1.5 rounded font-medium" style={{ background: danger ? '#f43f5e' : '#f59e0b', color: 'white' }}>
          {loading ? 'Aplicando…' : confirmLabel}
        </button>
      </div>
    </div>
  )
}

function statusStyle(status) {
  const map = {
    active: { bg: 'rgba(16,185,129,0.15)', fg: '#10b981' },
    trial: { bg: 'rgba(6,182,212,0.15)', fg: '#06b6d4' },
    overdue: { bg: 'rgba(245,158,11,0.15)', fg: '#f59e0b' },
    cancelled: { bg: 'rgba(148,163,184,0.15)', fg: '#94a3b8' },
    expired: { bg: 'rgba(244,63,94,0.15)', fg: '#f43f5e' },
  }
  const s = map[status] || map.expired
  return { background: s.bg, color: s.fg }
}

function paymentStatusColor(status) {
  return {
    CONFIRMED: '#10b981', RECEIVED: '#10b981', RECEIVED_IN_CASH: '#10b981',
    PENDING: '#94a3b8', AWAITING_RISK_ANALYSIS: '#06b6d4',
    OVERDUE: '#f59e0b', REFUNDED: '#94a3b8',
    REFUSED: '#f43f5e', DELETED: '#f43f5e',
  }[status] || '#94a3b8'
}

function formatCpf(d) {
  const s = String(d || '').replace(/\D/g, '')
  if (s.length !== 11) return s
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(d) {
  const s = String(d || '').replace(/\D/g, '')
  if (!s) return ''
  if (s.length >= 12) {
    const tail = s.slice(-11)
    return `+${s.slice(0, s.length - 11)} (${tail.slice(0, 2)}) ${tail.slice(2, 7)}-${tail.slice(7)}`
  }
  return s
}
