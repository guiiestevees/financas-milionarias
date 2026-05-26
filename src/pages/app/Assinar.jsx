import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowLeft, Loader2, Lock, CreditCard, Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSubscription } from '../../hooks/useSubscription'
import { supabase } from '../../lib/supabase'
import PixCheckout from '../../components/PixCheckout'
import CardCheckout from '../../components/CardCheckout'

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
    period: 'por ano',
    accent: 'gold',
    badge: 'Mais escolhido',
    description: 'Pague 1× e fique 12 meses tranquilo.',
    features: [
      'Tudo do plano Mensal',
      '✨ Economia de R$ 61 (~27% off)',
      'Sem preocupação com cobrança mensal',
      'Garantia de 7 dias',
    ],
  },
]

const METHODS = [
  {
    id: 'PIX_AUTOMATIC',
    name: 'PIX Automático',
    description: 'Pague o primeiro PIX e autorize débito recorrente no app do banco',
    icon: Zap,
    accent: '#10b981',
    accentSoft: 'rgba(16,185,129,0.08)',
    badge: 'Recomendado',
  },
  {
    id: 'CREDIT_CARD',
    name: 'Cartão de Crédito',
    description: 'Cobrança recorrente automática no cartão',
    icon: CreditCard,
    accent: '#c9a961',
    accentSoft: 'rgba(201,169,97,0.08)',
  },
]

export default function Assinar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const subscription = useSubscription()

  // ----- Dados do formulário (tela única) -----
  const [selectedPlan, setSelectedPlan] = useState('annual')
  const [name, setName] = useState(user?.user_metadata?.name || '')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState(null)

  // ----- State do pagamento embarcado -----
  const [pixData, setPixData] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // Auto-scroll pra área de pagamento quando método for escolhido
  const paymentRef = useRef(null)

  const plan = PLANS.find((p) => p.id === selectedPlan)
  const cpfCnpjDigits = cpfCnpj.replace(/\D/g, '')
  const validCpfCnpj = /^\d{11}$|^\d{14}$/.test(cpfCnpjDigits)
  const formValid = name.trim().length >= 3 && validCpfCnpj

  // ----- Quando user escolhe método de pagamento -----
  const selectMethod = async (m) => {
    setError(null)

    if (!formValid) {
      setError('Preencha nome e CPF/CNPJ acima primeiro')
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
    setTimeout(() => {
      subscription.refresh?.()
      navigate('/')
    }, 1500)
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #070912 0%, #0a0d18 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Voltar */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/55 hover:text-white text-sm mb-6 transition"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* ============ HEADER ============ */}
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
            Assinar Finanças Milionárias
          </h1>
          <p className="text-white/65 text-sm max-w-lg mx-auto leading-relaxed">
            🎩 Escolha seu plano e forma de pagamento — Alfred fica ao seu dispor logo em seguida.
          </p>
        </div>

        {/* ============ SECTION: PLANOS ============ */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3 px-1">1 · Escolha o plano</div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PLANS.map((p) => {
              const isSelected = selectedPlan === p.id
              const accentColor = p.accent === 'gold' ? '#c9a961' : '#10b981'
              const accentSoft = p.accent === 'gold' ? 'rgba(201,169,97,0.1)' : 'rgba(16,185,129,0.08)'
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className="text-left p-5 rounded-2xl transition relative"
                  style={{
                    background: isSelected ? accentSoft : 'rgba(255,255,255,0.025)',
                    border: `2px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isSelected ? `0 8px 24px ${accentColor}25` : 'none',
                  }}
                >
                  {p.badge && (
                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{ background: accentColor, color: '#070912' }}>
                      {p.badge}
                    </div>
                  )}

                  <div className="flex items-baseline justify-between mb-1">
                    <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: accentColor }} className="text-xl">{p.name}</div>
                    {isSelected && <Check size={18} style={{ color: accentColor }} />}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-3xl font-semibold tabular-nums">{p.priceLabel}</span>
                    <span className="text-xs text-white/45">{p.period}</span>
                  </div>
                  <div className="text-xs text-white/55 mb-3">{p.description}</div>
                  <ul className="space-y-1.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white/75">
                        <Check size={12} style={{ color: accentColor, marginTop: 2 }} className="shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>
        </div>

        {/* ============ SECTION: DADOS PESSOAIS ============ */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3 px-1">2 · Seus dados</div>
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/55 mb-1 block">Nome completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como aparece no seu documento"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none' }}
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
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${cpfCnpj && !validCpfCnpj ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px',
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
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
                    className="placeholder:text-white/30 focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============ SECTION: MÉTODO DE PAGAMENTO ============ */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3 px-1">3 · Forma de pagamento</div>
          <div className="space-y-2.5">
            {METHODS.map((m) => {
              const isSelected = method === m.id
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => selectMethod(m.id)}
                  disabled={creating}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl transition disabled:opacity-50 relative"
                  style={{
                    background: isSelected ? m.accentSoft : 'rgba(255,255,255,0.025)',
                    border: `2px solid ${isSelected ? m.accent : 'rgba(255,255,255,0.08)'}`,
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
          <div ref={paymentRef} className="rounded-2xl p-5 sm:p-6 mt-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
                holder={{
                  name: name.trim(),
                  email: user?.email,
                  cpfCnpj: cpfCnpjDigits,
                  phone: phone.replace(/\D/g, '') || undefined,
                }}
                onSuccess={onPaymentSuccess}
                onBack={() => setMethod(null)}
              />
            )}
          </div>
        )}

        {/* Trust */}
        {!method && (
          <div className="mt-6 text-center text-xs text-white/40 flex items-center justify-center gap-1.5">
            <Lock size={11} /> Pagamento seguro · Processado por Asaas
          </div>
        )}
      </div>
    </div>
  )
}
