import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, LogOut, Loader2, Check, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useRevenueCat } from '../hooks/useRevenueCat'
import { WEB_APP_URL_FULL } from '../lib/platform'

// Tela de assinatura NATIVA (pagamento In-App da Apple, via RevenueCat).
// Mostra os planos da "offering" atual, botão de assinar, restaurar compras
// e os links obrigatórios (Termos + Privacidade) exigidos pela Apple.
//
// Usada (1) como tela de bloqueio quando a assinatura expira e (2) na rota
// /assinar no app nativo.

function labelFor(pkg) {
  const t = pkg?.packageType
  if (t === 'ANNUAL') return { name: 'Anual', period: 'por ano' }
  if (t === 'MONTHLY') return { name: 'Mensal', period: 'por mês' }
  if (t === 'WEEKLY') return { name: 'Semanal', period: 'por semana' }
  // fallback: usa o título do produto
  return { name: pkg?.product?.title || 'Plano', period: '' }
}

export default function NativePaywall({ reason = 'expired', showSignOut = true, onSuccess }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { loading, offering, purchase, restore, refresh, setError, error } = useRevenueCat()

  const packages = offering?.availablePackages || []
  // Pré-seleciona o anual se existir (melhor custo-benefício), senão o 1º
  const annual = packages.find((p) => p.packageType === 'ANNUAL')
  const [selected, setSelected] = useState(null)
  const chosen = selected || annual || packages[0] || null

  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const isTrialExpired = reason === 'trial_expired'
  const isCancelled = reason === 'cancelled'
  const isOverdueGrace = reason === 'overdue'

  const handleBuy = async () => {
    if (!chosen || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await purchase(chosen)
      if (res?.cancelled) { setBusy(false); return }
      // Compra confirmada — o entitlement atualiza e o app destrava sozinho.
      if (onSuccess) onSuccess()
      else navigate('/app')
    } catch (e) {
      setError(e?.message || 'Não foi possível concluir a compra. Tente novamente.')
      setBusy(false)
    }
  }

  const handleRestore = async () => {
    if (restoring) return
    setRestoring(true)
    setError(null)
    try {
      await restore()
      // Se restaurou um plano ativo, o app destrava sozinho.
      if (onSuccess) onSuccess()
    } catch (e) {
      setError(e?.message || 'Nada para restaurar nesta conta.')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="max-w-md w-full text-center">
        {/* Alfred */}
        <div className="flex justify-center mb-5">
          <img
            src="/alfred.png"
            alt="Alfred"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(201,169,97,0.4)', boxShadow: '0 8px 32px rgba(201,169,97,0.2)' }}
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)' }}>
          <Crown size={12} style={{ color: '#c9a961' }} />
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#c9a961' }}>Domus Premium</span>
        </div>

        <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl sm:text-3xl mb-2">
          {isTrialExpired && 'Seu período de teste terminou'}
          {isCancelled && 'Reative sua assinatura'}
          {isOverdueGrace && 'Continue com o Domus'}
          {!isTrialExpired && !isCancelled && !isOverdueGrace && 'Assine o Domus'}
        </h1>

        <p className="text-white/65 text-sm leading-relaxed mb-6">
          🎩 Escolha um plano e libere o Domus completo — finanças, agenda e o Alfred ao seu dispor.
        </p>

        {/* Lista de planos */}
        {loading ? (
          <div className="py-10"><Loader2 size={26} className="animate-spin mx-auto" style={{ color: '#c9a961' }} /></div>
        ) : packages.length === 0 ? (
          <div className="rounded-xl p-5 mb-4 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}>
            <p className="mb-3">No momento os planos não estão disponíveis. Tente novamente em instantes.</p>
            <button onClick={() => refresh()} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#c9a961' }}>
              <RefreshCw size={13} /> Recarregar
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 mb-4 text-left">
            {packages.map((pkg) => {
              const { name, period } = labelFor(pkg)
              const isSel = chosen?.identifier === pkg.identifier
              const isAnnual = pkg.packageType === 'ANNUAL'
              return (
                <button
                  key={pkg.identifier}
                  onClick={() => setSelected(pkg)}
                  className="w-full rounded-xl p-4 transition flex items-center justify-between gap-3"
                  style={{
                    background: isSel ? 'rgba(201,169,97,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${isSel ? 'rgba(201,169,97,0.6)' : 'var(--border-soft)'}`,
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{name}</span>
                      {isAnnual && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,169,97,0.2)', color: '#c9a961' }}>
                          melhor valor
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/55 mt-0.5">{pkg.product?.priceString} {period}</div>
                  </div>
                  <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ border: `1.5px solid ${isSel ? '#c9a961' : 'var(--border-medium)'}`, background: isSel ? '#c9a961' : 'transparent' }}>
                    {isSel && <Check size={12} style={{ color: '#070912' }} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {error && (
          <p className="text-xs mb-3" style={{ color: '#fda4af' }}>{error}</p>
        )}

        {/* CTA assinar */}
        {packages.length > 0 && (
          <button
            onClick={handleBuy}
            disabled={busy || !chosen}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition mb-3 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(180deg, #c9a961, #a88a4a)', color: '#070912', boxShadow: '0 8px 24px rgba(201,169,97,0.3)' }}
          >
            {busy ? (<><Loader2 size={15} className="animate-spin" /> Processando…</>) : 'Assinar agora'}
          </button>
        )}

        {/* Restaurar compras (obrigatório pela Apple) */}
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="text-xs text-white/55 hover:text-white/85 transition py-2 inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {restoring ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Restaurar compras
        </button>

        {/* Aviso de renovação automática + links legais (exigência Apple) */}
        <p className="text-[10px] leading-relaxed text-white/40 mt-5 px-2">
          A assinatura renova automaticamente ao fim de cada período, pela mesma forma de pagamento,
          a menos que cancelada com pelo menos 24h de antecedência nos Ajustes do seu Apple ID.
          {' '}
          <a href={`${WEB_APP_URL_FULL}/termos`} target="_blank" rel="noreferrer" style={{ color: '#c9a961', textDecoration: 'underline' }}>Termos de Uso</a>
          {' · '}
          <a href={`${WEB_APP_URL_FULL}/privacidade`} target="_blank" rel="noreferrer" style={{ color: '#c9a961', textDecoration: 'underline' }}>Privacidade</a>
        </p>

        {showSignOut && (
          <div className="mt-5">
            <button onClick={() => signOut()} className="text-xs text-white/45 hover:text-white/75 transition py-2 inline-flex items-center gap-1.5">
              <LogOut size={11} /> Sair da conta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
