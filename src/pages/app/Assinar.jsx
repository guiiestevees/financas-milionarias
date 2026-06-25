import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ArrowLeft, Loader2, Lock, CreditCard, QrCode, AlertCircle, Crown, ShieldCheck, Zap, Sparkles, MessageCircle, X, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSubscription } from '../../hooks/useSubscription'
import { useIsAdmin } from '../../hooks/useIsAdmin'
import { supabase } from '../../lib/supabase'
import PixCheckout from '../../components/PixCheckout'
import CardCheckout from '../../components/CardCheckout'
import AddressFields, { isAddressValid } from '../../components/AddressFields'
import WelcomeAfterPayment from '../../components/WelcomeAfterPayment'

// ---------- Máscaras BR ----------
function maskCpfCnpj(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskPhone(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const PLANS = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 19.00,
    priceLabel: 'R$ 19',
    perMonthLabel: 'R$ 19',
    period: 'por mês',
    accent: 'emerald',
    description: 'Cobrança recorrente. Cancele quando quiser.',
    features: [
      'Acesso completo ao app',
      'Alfred no WhatsApp (texto e áudio)',
      'Cofres, orçamentos e controle ilimitados',
      'Cancele a qualquer momento',
    ],
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 167.00,
    priceLabel: 'R$ 167',
    perMonthLabel: 'R$ 13,92',  // R$ 167 / 12
    period: 'por ano',
    accent: 'gold',
    description: 'Pague uma vez e fique 12 meses ao seu dispor.',
    savings: 'Economize R$ 61 (~27% off)',
    features: [
      'Tudo do plano Mensal',
      'Pague 1× e esqueça por 12 meses',
      'Economiza R$ 61 — equivalente a 3 meses grátis',
      'Reembolso garantido em até 7 dias',
    ],
  },
]

// Métodos disponíveis variam por plano:
// - Mensal: só Cartão (recorrência garantida sem QR todo mês)
// - Anual: só PIX (pagamento único, 12 meses de uma vez)
// (PIX Automático Bacen vai voltar quando contractId for cadastrado)
const METHODS_BY_PLAN = {
  monthly: [
    {
      id: 'CREDIT_CARD',
      name: 'Cartão de Crédito',
      description: 'Cobrança recorrente automática no cartão — sem precisar pagar todo mês',
      icon: CreditCard,
      accent: '#c9a961',
      accentSoft: 'rgba(201,169,97,0.08)',
    },
  ],
  annual: [
    {
      id: 'PIX',
      name: 'PIX à vista',
      description: 'Pague R$ 167 agora e fique 12 meses ao seu dispor',
      icon: QrCode,
      accent: '#10b981',
      accentSoft: 'rgba(16,185,129,0.08)',
    },
    {
      id: 'CREDIT_CARD',
      name: 'Cartão de Crédito',
      description: 'Parcele em até 12× sem juros (R$ 13,92/mês no cartão se for 12x)',
      icon: CreditCard,
      accent: '#c9a961',
      accentSoft: 'rgba(201,169,97,0.08)',
    },
  ],
}

export default function Assinar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const subscription = useSubscription()

  // Lembra de onde o user veio: /app?tab=config se veio das Configurações
  // ou simplesmente /app (painel) se chegou direto pelo banner/bloqueio
  const from = searchParams.get('from')
  const backUrl = from === 'config' ? '/app?tab=config' : '/app'

  // ----- Dados do formulário (tela única) -----
  // (Todos os hooks DEVEM ser chamados antes de qualquer return condicional —
  // Rules of Hooks. Mesmo no modo nativo, os hooks são chamados.)
  const [selectedPlan, setSelectedPlan] = useState('annual')
  const [name, setName] = useState(user?.user_metadata?.name || '')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })
  const [method, setMethod] = useState(null)

  // ----- State do pagamento embarcado -----
  const [pixData, setPixData] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // Auto-scroll pra área de pagamento quando método for escolhido
  const paymentRef = useRef(null)

  // Admin: botão "simular pagamento" pra testar UX pós-pagamento sem cobrar
  const { isAdmin } = useIsAdmin()
  const [simulating, setSimulating] = useState(false)
  const [simulateSuccess, setSimulateSuccess] = useState(false)

  const handleSimulatePayment = async () => {
    if (simulating) return
    setSimulating(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')
      const res = await fetch('/api/admin?resource=simulate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId: selectedPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao simular pagamento')
      // Mostra a tela de boas-vindas (mesma do checkout real)
      setSimulateSuccess(true)
    } catch (err) {
      console.error('simulate payment error:', err)
      setError(err.message)
    } finally {
      setSimulating(false)
    }
  }

  const plan = PLANS.find((p) => p.id === selectedPlan)
  // Métodos de pagamento disponíveis pra esse plano
  const availableMethods = METHODS_BY_PLAN[selectedPlan] || []
  const cpfCnpjDigits = cpfCnpj.replace(/\D/g, '')
  const validCpfCnpj = /^\d{11}$|^\d{14}$/.test(cpfCnpjDigits)
  const addressOk = isAddressValid(address)
  const formValid = name.trim().length >= 3 && validCpfCnpj && addressOk

  // ----- Quando user escolhe método de pagamento -----
  const selectMethod = async (m) => {
    setError(null)

    if (!formValid) {
      const missing = []
      if (name.trim().length < 3) missing.push('nome completo')
      if (!validCpfCnpj) missing.push('CPF/CNPJ')
      if (!addressOk) missing.push('endereço completo')
      setError(`Preencha ${missing.join(', ')} acima antes de continuar`)
      // scroll suave pro form
      window.scrollTo({ top: 350, behavior: 'smooth' })
      return
    }

    setMethod(m)

    // Pra PIX e PIX_AUTOMATIC, geramos QR code logo
    if (m === 'PIX' || m === 'PIX_AUTOMATIC') {
      setCreating(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sessão expirada')

        const res = await fetch('/api/checkout-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            planId: selectedPlan,
            method: m,
            holder: {
              name: name.trim(),
              email: user?.email,
              cpfCnpj: cpfCnpjDigits,
              phone: phone.replace(/\D/g, '') || undefined,
              address: {
                postalCode: address.cep.replace(/\D/g, ''),
                street: address.street.trim(),
                addressNumber: address.number.trim(),
                complement: address.complement.trim() || undefined,
                neighborhood: address.neighborhood.trim(),
                city: address.city.trim(),
                state: address.state.trim().toUpperCase(),
              },
            },
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar pagamento')
        setPixData({
          qrCode: data.qrCode,
          paymentId: data.paymentId,
          value: data.value,
          invoiceUrl: data.invoiceUrl,
          isAutomatic: m === 'PIX_AUTOMATIC',
        })
      } catch (err) {
        console.error('select method error:', err)
        setError(err.message)
        setMethod(null)
        setCreating(false)
        return
      }
      setCreating(false)
    }

    // Scroll suave até a área de pagamento
    setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const onPaymentSuccess = () => {
    // 2.5s dá tempo do webhook + polling sincronizarem o status antes
    // de carregar o painel. Refresh duplo: refresh, depois navigate.
    setTimeout(() => {
      subscription.refresh?.()
      navigate(backUrl)
    }, 2500)
  }

  // ===== Tela de boas-vindas após simular pagamento (admin) =====
  if (simulateSuccess) {
    return (
      <WelcomeAfterPayment
        userName={user?.user_metadata?.name || user?.email?.split('@')[0]}
        onContinue={() => {
          subscription.refresh?.()
          navigate(backUrl)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Background decorativo sutil */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          background: `
            radial-gradient(ellipse at top, rgba(212,175,55,0.10), transparent 55%),
            radial-gradient(ellipse at bottom, rgba(16,185,129,0.06), transparent 60%)
          `,
        }}
      />

      <div className="relative max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Voltar */}
        <button
          onClick={() => navigate(backUrl)}
          className="flex items-center gap-2 text-sm mb-6 transition hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* ============ HERO ============ */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
            style={{
              background: 'rgba(212,175,55,0.10)',
              border: '1px solid rgba(212,175,55,0.30)',
            }}
          >
            <Crown size={12} style={{ color: '#c9a961' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#c9a961' }}>
              Alfred aguarda suas ordens
            </span>
          </div>
          <h1
            style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
            className="text-3xl sm:text-5xl mb-4 leading-tight"
          >
            Comece a usar Domus<br />
            <em style={{
              fontStyle: 'italic',
              background: 'linear-gradient(135deg, #f4e4a8, #c9a961 50%, #8b6f2f)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              por menos de R$ 14 por mês.
            </em>
          </h1>
          <p
            className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            🎩 Controle financeiro, agenda, Alfred no WhatsApp e tudo mais.
            Sem fidelidade, sem letras miúdas — cancele quando quiser.
          </p>
        </div>

        {/* ============ POR QUE ASSINAR (mini-grid de benefícios) ============ */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
          <BenefitCard
            icon={<MessageCircle size={16} />}
            title="Alfred 24/7"
            text="Texto e áudio no WhatsApp"
            color="#10b981"
          />
          <BenefitCard
            icon={<Sparkles size={16} />}
            title="Tudo num lugar"
            text="Finanças, agenda, cofres"
            color="#06b6d4"
          />
          <BenefitCard
            icon={<ShieldCheck size={16} />}
            title="7 dias garantia"
            text="Reembolso integral"
            color="#c9a961"
          />
        </div>

        {/* ============ SECTION: PLANOS ============ */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
            1 · Escolha o plano
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PLANS.map((p) => {
              const isSelected = selectedPlan === p.id
              const accentColor = p.accent === 'gold' ? '#c9a961' : '#10b981'
              const accentSoft = p.accent === 'gold' ? 'rgba(201,169,97,0.10)' : 'rgba(16,185,129,0.08)'
              const isHighlight = p.id === 'annual'
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPlan(p.id); setMethod(null); setPixData(null) }}
                  className="text-left p-5 rounded-2xl transition relative overflow-hidden"
                  style={{
                    background: isSelected
                      ? (isHighlight
                          ? `linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))`
                          : accentSoft)
                      : 'var(--bg-elev2)',
                    border: `2px solid ${isSelected ? accentColor : 'var(--border-medium)'}`,
                    boxShadow: isSelected
                      ? `0 12px 32px ${accentColor}30, 0 0 0 4px ${accentColor}15`
                      : 'none',
                    transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  {/* Glow decorativo no Anual */}
                  {isHighlight && (
                    <div
                      className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle, rgba(212,175,55,0.25), transparent 70%)',
                        opacity: isSelected ? 1 : 0.4,
                      }}
                    />
                  )}

                  {p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, #8b6f2f)`, color: '#fff' }}>
                      {p.badge}
                    </div>
                  )}

                  <div className="relative">
                    <div className="flex items-baseline justify-between mb-1">
                      <div
                        style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: accentColor }}
                        className="text-xl italic"
                      >
                        {p.name}
                      </div>
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 22, height: 22,
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? accentColor : 'var(--border-medium)'}`,
                          background: isSelected ? accentColor : 'transparent',
                        }}
                      >
                        {isSelected && <Check size={13} color="#fff" strokeWidth={3.5} />}
                      </div>
                    </div>

                    {/* Preço com hierarquia: principal + equivalente */}
                    {isHighlight ? (
                      <>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span
                            style={{ fontFamily: 'JetBrains Mono, monospace' }}
                            className="text-3xl font-semibold tabular-nums"
                          >
                            {p.perMonthLabel}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            equivalente por mês
                          </span>
                        </div>
                        <div className="text-[11px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                          {p.priceLabel} pagos uma vez · {p.period}
                        </div>
                        {p.savings && (
                          <div
                            className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3"
                            style={{
                              background: 'rgba(16,185,129,0.15)',
                              color: 'var(--accent-emerald)',
                              border: '1px solid rgba(16,185,129,0.30)',
                            }}
                          >
                            💰 {p.savings}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span
                            style={{ fontFamily: 'JetBrains Mono, monospace' }}
                            className="text-3xl font-semibold tabular-nums"
                          >
                            {p.priceLabel}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {p.period}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                      {p.description}
                    </div>
                    <ul className="space-y-1.5">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Check size={12} style={{ color: accentColor, marginTop: 2 }} className="shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ============ ADMIN: SIMULAR PAGAMENTO (teste sem cobrar) ============ */}
        {isAdmin && (
          <div className="mb-8">
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(139,92,246,0.05))',
                border: '1.5px dashed rgba(139,92,246,0.40)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                  style={{ background: 'rgba(139,92,246,0.20)', color: '#a78bfa' }}
                >
                  <Shield size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a78bfa' }}>
                    Modo Admin · Teste sem cobrança
                  </div>
                  <div className="text-[11px] mt-1 mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Ativa o plano {selectedPlan === 'annual' ? 'Anual' : 'Mensal'} sem passar pelo Asaas.
                    Útil pra testar a UX pós-pagamento (boas-vindas, redirect, banner, etc).
                    Nenhuma cobrança real é feita.
                  </div>
                  <button
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                    style={{
                      background: '#8b5cf6',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(139,92,246,0.30)',
                    }}
                  >
                    {simulating ? (
                      <><Loader2 size={13} className="animate-spin" /> Simulando…</>
                    ) : (
                      <><Shield size={13} /> Simular pagamento aprovado</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ SECTION: DADOS PESSOAIS ============ */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3 px-1">2 · Seus dados</div>
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elev2)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/55 mb-1 block">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como aparece no seu documento"
                  style={{ background: 'var(--bg-elev1)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '100%', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none' }}
                  className="placeholder:text-white/30 focus:border-amber-400"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/55 mb-1 block">CPF ou CNPJ</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    style={{
                      background: 'var(--bg-elev1)',
                      border: `1px solid ${cpfCnpj && !validCpfCnpj ? 'rgba(244,63,94,0.4)' : 'var(--border-medium)'}`,
                      color: 'var(--text-primary)', width: '100%', borderRadius: 10, padding: '10px 14px',
                      fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace',
                    }}
                    className="placeholder:text-white/30 focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/55 mb-1 block">Celular <span className="text-white/35">(opcional)</span></label>
                  <input
                    type="text"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    style={{ background: 'var(--bg-elev1)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '100%', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
                    className="placeholder:text-white/30 focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Endereço (pra nota fiscal + cadastro do cliente) */}
              <div className="pt-2 mt-1 border-t border-white/5">
                <AddressFields value={address} onChange={setAddress} />
              </div>
            </div>
          </div>
        </div>

        {/* ============ SECTION: MÉTODO DE PAGAMENTO ============ */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3 px-1">3 · Forma de pagamento</div>
          <div className="space-y-2.5">
            {availableMethods.map((m) => {
              const isSelected = method === m.id
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => selectMethod(m.id)}
                  disabled={creating}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl transition disabled:opacity-50 relative"
                  style={{
                    background: isSelected ? m.accentSoft : 'var(--bg-elev2)',
                    border: `2px solid ${isSelected ? m.accent : 'var(--border-medium)'}`,
                    boxShadow: isSelected ? `0 4px 16px ${m.accent}25` : 'none',
                  }}
                >
                  {m.badge && (
                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{ background: m.accent, color: '#070912' }}>
                      {m.badge}
                    </div>
                  )}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl shrink-0" style={{ background: `${m.accent}20`, color: m.accent }}>
                      <Icon size={18} />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-semibold text-white text-sm sm:text-base">{m.name}</div>
                      <div className="text-xs text-white/55 leading-snug">{m.description}</div>
                    </div>
                  </div>
                  {creating && method === m.id ? (
                    <Loader2 size={16} className="animate-spin shrink-0" style={{ color: m.accent }} />
                  ) : isSelected ? (
                    <Check size={16} className="shrink-0" style={{ color: m.accent }} />
                  ) : (
                    <ArrowLeft size={16} className="rotate-180 shrink-0 text-white/30" />
                  )}
                </button>
              )
            })}
          </div>
          {error && (
            <div className="mt-3 rounded-lg px-3 py-2.5 text-xs flex items-start gap-2"
              style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ============ SECTION: PAGAMENTO EMBARCADO ============ */}
        {method && (
          <div ref={paymentRef} className="rounded-2xl p-5 sm:p-6 mt-2" style={{ background: 'var(--bg-elev2)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-4 px-1">4 · Concluir pagamento</div>

            {/* PIX ou PIX Automático */}
            {(method === 'PIX' || method === 'PIX_AUTOMATIC') && pixData && (
              <>
                {pixData.isAutomatic && (
                  <div className="mb-4 rounded-lg p-3 text-xs flex items-start gap-2"
                    style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <Zap size={13} className="text-emerald-300 shrink-0 mt-0.5" />
                    <div className="text-white/75 leading-relaxed">
                      <strong className="text-emerald-300">PIX Automático ativado.</strong> Ao pagar este PIX, você autoriza o débito automático no seu banco — sem se preocupar com renovação todo mês.
                    </div>
                  </div>
                )}
                <PixCheckout
                  qrCode={pixData.qrCode}
                  paymentId={pixData.paymentId}
                  value={pixData.value}
                  onSuccess={onPaymentSuccess}
                  onFail={(err) => setError(err)}
                />
              </>
            )}

            {/* Cartão */}
            {method === 'CREDIT_CARD' && (
              <CardCheckout
                planId={selectedPlan}
                value={plan.price}
                maxInstallments={selectedPlan === 'annual' ? 12 : 1}
                holder={{
                  name: name.trim(),
                  email: user?.email,
                  cpfCnpj: cpfCnpjDigits,
                  phone: phone.replace(/\D/g, '') || undefined,
                  address: {
                    postalCode: address.cep.replace(/\D/g, ''),
                    street: address.street.trim(),
                    addressNumber: address.number.trim(),
                    complement: address.complement.trim() || undefined,
                    neighborhood: address.neighborhood.trim(),
                    city: address.city.trim(),
                    state: address.state.trim().toUpperCase(),
                  },
                }}
                onSuccess={onPaymentSuccess}
                onBack={() => setMethod(null)}
              />
            )}
          </div>
        )}

        {/* ============ TRUST BAR (garantias) ============ */}
        {!method && (
          <div className="mt-8 space-y-4">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))',
                border: '1px solid rgba(16,185,129,0.25)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                  style={{ background: 'rgba(16,185,129,0.20)', color: 'var(--accent-emerald)' }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--text-primary)' }}
                    className="text-base mb-1"
                  >
                    Sem risco — 7 dias de garantia
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Se Domus não for pra você, devolvemos o valor integralmente em até 7 dias da contratação,
                    sem perguntas. Garantia prevista pelo Código de Defesa do Consumidor (Art. 49).
                  </p>
                </div>
              </div>
            </div>

            {/* Mini-trust grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <TrustItem icon={<Lock size={12} />} label="Pagamento seguro" sub="via Asaas" />
              <TrustItem icon={<X size={12} />} label="Cancele quando quiser" sub="sem fidelidade" />
              <TrustItem icon={<Sparkles size={12} />} label="Atualizações grátis" sub="pra sempre" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Mini-card de benefício no topo
function BenefitCard({ icon, title, text, color }) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: 'var(--bg-elev2)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </div>
      <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
        {title}
      </div>
      <div className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--text-tertiary)' }}>
        {text}
      </div>
    </div>
  )
}

// Item da trust bar no fim
function TrustItem({ icon, label, sub }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div style={{ color: 'var(--text-secondary)' }}>{icon}</div>
      <div className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}
