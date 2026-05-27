import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, CreditCard, Calendar, Check, X, ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, SectionTitle, Btn } from '../../components/ui'
import { accents } from '../../lib/constants'
import { supabase } from '../../lib/supabase'

// Formata "27 de junho de 2026"
function formatDateLongPT(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}

const STATUS_LABEL = {
  trial: { label: 'Período de teste', color: '#c9a961', bg: 'rgba(201,169,97,0.1)' },
  active: { label: 'Ativa', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  overdue: { label: 'Pagamento atrasado', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  expired: { label: 'Expirada', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  cancelled: { label: 'Cancelada', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
}

const PAYMENT_TYPE_LABEL = {
  CREDIT_CARD: 'Cartão de crédito',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  UNDEFINED: 'Pendente',
}

const PAYMENT_STATUS_LABEL = {
  PENDING: { label: 'Pendente', color: '#94a3b8' },
  RECEIVED: { label: 'Pago', color: '#10b981' },
  CONFIRMED: { label: 'Pago', color: '#10b981' },
  OVERDUE: { label: 'Atrasado', color: '#f59e0b' },
  REFUNDED: { label: 'Estornado', color: '#94a3b8' },
  DELETED: { label: 'Cancelado', color: '#94a3b8' },
}

export default function SubscriptionCard() {
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [changing, setChanging] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')
      const res = await fetch('/api/subscription', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setInfo(data)
    } catch (err) {
      console.error('load subscription:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCancel = async () => {
    setCancelling(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar')
      setShowCancelConfirm(false)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const handleChangePayment = async () => {
    setChanging(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'change-payment' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro')
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError(err.message)
      setChanging(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-4 sm:p-6" accent="gold">
        <SectionTitle icon={Crown} title="Assinatura" subtitle="Carregando..." accent="gold" />
      </Card>
    )
  }

  if (!info) {
    return (
      <Card className="p-4 sm:p-6" accent="gold">
        <SectionTitle icon={Crown} title="Assinatura" subtitle="Erro ao carregar" accent="gold" />
        {error && <div className="text-xs text-rose-300 mt-2">{error}</div>}
      </Card>
    )
  }

  const statusInfo = STATUS_LABEL[info.status] || STATUS_LABEL.trial
  const isTrial = info.status === 'trial'
  const isActive = info.status === 'active'
  const isOverdue = info.status === 'overdue'
  const isCancelled = info.status === 'cancelled' || info.status === 'expired'
  const canCancel = isActive || isOverdue
  const canChangePlan = isActive || isTrial

  const planName = info.planDetails?.name || (info.plan === 'annual' ? 'Anual' : info.plan === 'monthly' ? 'Mensal' : '—')
  const planPrice = info.planDetails?.priceLabel || '—'

  // Próxima cobrança (se ativa) ou expiração (se trial/cancelled)
  const dateLabel = isActive ? 'Próxima cobrança' : isTrial ? 'Trial expira em' : 'Acesso até'

  return (
    <>
      <Card className="p-4 sm:p-6 lg:col-span-2" accent="gold">
        <SectionTitle
          icon={Crown}
          title="Assinatura"
          subtitle="Seu plano e cobranças"
          accent="gold"
          action={
            <button onClick={load} className="text-xs text-white/45 hover:text-white/75 inline-flex items-center gap-1 transition">
              <RefreshCw size={11} /> Atualizar
            </button>
          }
        />

        {/* Status badge + plan */}
        <div className="space-y-4">
          <div className="rounded-xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ background: statusInfo.bg, color: statusInfo.color }}>
                  {statusInfo.label}
                </div>
                <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl">
                  Plano {planName}
                </div>
                {isActive || info.plan ? (
                  <div className="text-xs text-white/55 mt-0.5">{planPrice}</div>
                ) : null}
              </div>
              {isActive && (
                <div className="shrink-0 p-2 rounded-lg" style={{ background: accents.gold.soft, color: accents.gold.hex }}>
                  <Check size={16} />
                </div>
              )}
            </div>

            {/* Data importante */}
            <div className="flex items-center gap-2 text-sm text-white/75 pt-3 border-t border-white/5">
              <Calendar size={14} className="text-white/45" />
              <span className="text-white/55">{dateLabel}:</span>
              <span className="font-medium">{formatDateLongPT(info.until)}</span>
            </div>

            {/* Avisos contextuais */}
            {isOverdue && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <AlertTriangle size={13} className="text-amber-300 shrink-0 mt-0.5" />
                <span className="text-amber-100">
                  Pagamento em aberto. Regularize pra manter o acesso.
                </span>
              </div>
            )}
            {isCancelled && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg text-xs" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <X size={13} className="text-rose-300 shrink-0 mt-0.5" />
                <span className="text-rose-200">
                  Assinatura cancelada. Você pode reativar quando quiser — seus dados ficam preservados.
                </span>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="grid sm:grid-cols-2 gap-2">
            {canChangePlan && (
              <button
                onClick={() => navigate('/assinar?from=config')}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg text-sm transition"
                style={{ background: 'rgba(201,169,97,0.08)', border: '1px solid rgba(201,169,97,0.25)', color: '#c9a961' }}
              >
                <span className="font-medium">{isTrial ? 'Assinar agora' : 'Trocar plano'}</span>
                <ArrowRight size={14} />
              </button>
            )}

            {(isActive || isOverdue) && (
              <button
                onClick={handleChangePayment}
                disabled={changing}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg text-sm transition disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
              >
                <span className="font-medium flex items-center gap-2">
                  <CreditCard size={14} /> Trocar forma de pagamento
                </span>
                {changing ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              </button>
            )}

            {isCancelled && (
              <button
                onClick={() => navigate('/assinar?from=config')}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg text-sm transition sm:col-span-2"
                style={{ background: 'linear-gradient(180deg, #c9a961, #a88a4a)', color: '#070912' }}
              >
                <span className="font-semibold">Reativar assinatura</span>
                <ArrowRight size={14} />
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg text-sm transition sm:col-span-2"
                style={{ background: 'transparent', border: '1px solid rgba(244,63,94,0.25)', color: 'rgba(244,63,94,0.85)' }}
              >
                <span className="font-medium">Cancelar assinatura</span>
                <X size={14} />
              </button>
            )}
          </div>

          {error && (
            <div className="text-xs text-rose-300 px-1">{error}</div>
          )}

          {/* Histórico de pagamentos */}
          {info.payments && info.payments.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <div className="text-xs text-white/45 uppercase tracking-wider mb-2">Últimos pagamentos</div>
              <div className="space-y-1.5">
                {info.payments.slice(0, 5).map((p) => {
                  const status = PAYMENT_STATUS_LABEL[p.status] || { label: p.status, color: '#94a3b8' }
                  const type = PAYMENT_TYPE_LABEL[p.billingType] || p.billingType
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg text-xs hover:bg-white/5 transition">
                      <div className="flex-1 min-w-0">
                        <div className="text-white/85 truncate">{p.description || `${type}`}</div>
                        <div className="text-white/35 text-[10px]">
                          {p.paymentDate ? `Pago em ${formatDateLongPT(p.paymentDate)}` : `Vence em ${formatDateLongPT(p.dueDate)}`}
                          {' · '}{type}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-white/85 tabular-nums">
                          R$ {Number(p.value).toFixed(2).replace('.', ',')}
                        </div>
                        <div className="text-[10px]" style={{ color: status.color }}>{status.label}</div>
                      </div>
                      {p.status === 'PENDING' && p.invoiceUrl && (
                        <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] underline text-amber-300 shrink-0">Pagar</a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modal de confirmação de cancelamento */}
      {showCancelConfirm && (
        <div onClick={() => !cancelling && setShowCancelConfirm(false)} style={{ background: 'rgba(7,9,18,0.7)', backdropFilter: 'blur(8px)' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #0f1525, #0a0d18)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, maxWidth: 460, width: '100%' }} className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                <AlertTriangle size={16} />
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg">Cancelar assinatura?</div>
            </div>

            <p className="text-sm text-white/65 leading-relaxed mb-4">
              🎩 Permita-me uma observação: ao cancelar, manterá o acesso até <strong className="text-white/85">{formatDateLongPT(info.until)}</strong>. Após essa data, não cobraremos mais.
            </p>
            <p className="text-sm text-white/65 leading-relaxed mb-5">
              Seus dados permanecem salvos — pode reativar quando desejar e tudo estará exatamente como deixou.
            </p>

            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>Manter assinatura</Btn>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)' }}
              >
                {cancelling ? <><Loader2 size={14} className="animate-spin" /> Cancelando...</> : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
