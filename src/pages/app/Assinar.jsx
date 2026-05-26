import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Check, ArrowLeft, Loader2, Sparkles, Flame, Lock, CreditCard, QrCode } from 'lucide-react'
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
    price: 26.00,
    priceLabel: 'R$ 26',
    originalPrice: 'R$ 29,90',
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
    price: 197.00,
    priceLabel: 'R$ 197',
    originalPrice: 'R$ 249',
    period: 'por ano',
    accent: 'gold',
    badge: 'Mais escolhido',
    description: 'Pague 1× e fique 12 meses tranquilo.',
    features: [
      'Tudo do plano Mensal',
      '✨ ~37% de desconto (R$ 16,42/mês)',
      'Sem preocupação com cobrança mensal',
      'Garantia de 7 dias',
    ],
  },
]

export default function Assinar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const subscription = useSubscription()

  // ----- State global de toda a jornada -----
  const [step, setStep] = useState(1)  // 1=plano+dados, 2=método, 3=pagamento
  const [selectedPlan, setSelectedPlan] = useState('annual')
  const [name, setName] = useState(user?.user_metadata?.name || '')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState(null)  // 'PIX' | 'CREDIT_CARD'

  // Resultado do checkout-pay (QR code do PIX)
  const [pixData, setPixData] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  const plan = PLANS.find((p) => p.id === selectedPlan)

  // ----- Step 1 → 2: valida dados e avança -----
  const goToMethod = () => {
    setError(null)
    if (!name.trim()) { setError('Informe seu nome completo'); return }
    if (!cpfCnpj.replace(/\D/g, '').match(/^\d{11}$|^\d{14}$/)) { setError('CPF ou CNPJ inválido'); return }
    setStep(2)
  }

  // ----- Step 2 → 3: cria pagamento -----
  const selectMethod = async (m) => {
    setMethod(m)
    setError(null)
    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      if (m === 'PIX') {
        // Gera QR Code via API
        const res = await fetch('/api/checkout-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            planId: selectedPlan,
            method: 'PIX',
            holder: {
              name: name.trim(),
              email: user?.email,
              cpfCnpj: cpfCnpj.replace(/\D/g, ''),
              phone: phone.replace(/\D/g, '') || undefined,
            },
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar PIX')
        setPixData({ qrCode: data.qrCode, paymentId: data.paymentId, value: data.value })
        setStep(3)
      } else {
        // Cartão: vai pra step 3 que mostra o form do cartão
        setStep(3)
      }
    } catch (err) {
      console.error('select method error:', err)
      setError(err.message)
      setMethod(null)
    } finally {
      setCreating(false)
    }
  }

  // ----- Pagamento confirmado (PIX ou cartão) -----
  const onPaymentSuccess = () => {
    // Aguarda 1s pra dar tempo do webhook chegar e atualizar
    setTimeout(() => {
      subscription.refresh?.()
      navigate('/')
    }, 1500)
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #070912 0%, #0a0d18 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
          className="flex items-center gap-2 text-white/55 hover:text-white text-sm mb-6 transition"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-7">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full transition" style={{
                background: step >= s ? '#c9a961' : 'rgba(255,255,255,0.15)',
                boxShadow: step === s ? '0 0 0 4px rgba(201,169,97,0.15)' : 'none',
              }} />
              {s < 3 && <div className="w-8 h-px" style={{ background: step > s ? '#c9a961' : 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>

        {/* ========== STEP 1 — PLANO + DADOS ========== */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)' }}>
                <Flame size={13} className="text-rose-300" />
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">
                  Preço de Lançamento — Edição Fundador
                </span>
              </div>
              <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-3">
                Escolha seu plano
              </h1>
              <p className="text-white/65 text-sm max-w-lg mx-auto leading-relaxed">
                🎩 Os primeiros assinantes garantem um <strong className="text-white/85">preço congelado pra sempre</strong> — mesmo quando o valor padrão subir, você continua pagando o de hoje.
              </p>
            </div>

            {/* Planos */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
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
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                      style={{ background: '#070912', border: `1px solid ${accentColor}`, color: accentColor }}>
                      <Flame size={9} /> Fundador
                    </div>

                    <div className="flex items-baseline justify-between mb-1 mt-1.5">
                      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: accentColor }} className="text-xl">{p.name}</div>
                      {isSelected && <Check size={18} style={{ color: accentColor }} />}
                    </div>
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-3xl font-semibold tabular-nums">{p.priceLabel}</span>
                      <span className="text-xs text-white/45">{p.period}</span>
                      {p.originalPrice && (
                        <span className="text-xs text-white/35 line-through tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.originalPrice}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/55 mb-3">{p.description}</div>
                    <div className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded text-[10px]" style={{ background: `${accentColor}10`, color: accentColor }}>
                      <Lock size={9} /> <span className="font-medium">Preço congelado pra sempre</span>
                    </div>
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

            {/* Dados do cliente */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-sm font-medium mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-300" />
                Seus dados pra cobrança
              </div>
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
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
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

                {error && (
                  <div className="rounded-lg px-3 py-2.5 text-xs text-rose-300" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={goToMethod}
                  className="w-full mt-2 py-3.5 rounded-xl text-sm font-semibold transition"
                  style={{
                    background: 'linear-gradient(180deg, #c9a961, #a88a4a)',
                    color: '#070912',
                    boxShadow: '0 8px 24px rgba(201,169,97,0.25)',
                  }}
                >
                  Continuar — escolher forma de pagamento
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========== STEP 2 — ESCOLHA FORMA DE PAGAMENTO ========== */}
        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl sm:text-3xl mb-2">
                Como deseja pagar?
              </h1>
              <p className="text-white/55 text-sm">
                Plano {plan.name} — <strong className="text-white/85">{plan.priceLabel}</strong> {plan.period}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => selectMethod('PIX')}
                disabled={creating}
                className="w-full flex items-center justify-between gap-3 p-5 rounded-2xl transition disabled:opacity-50"
                style={{
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    <QrCode size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white">PIX</div>
                    <div className="text-xs text-white/55">Aprovação instantânea · Sem fricção</div>
                  </div>
                </div>
                {creating && method === 'PIX' ? <Loader2 size={16} className="animate-spin text-emerald-300" /> : <ArrowLeft size={16} className="rotate-180 text-emerald-300" />}
              </button>

              <button
                onClick={() => selectMethod('CREDIT_CARD')}
                disabled={creating}
                className="w-full flex items-center justify-between gap-3 p-5 rounded-2xl transition disabled:opacity-50"
                style={{
                  background: 'rgba(201,169,97,0.05)',
                  border: '1px solid rgba(201,169,97,0.25)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(201,169,97,0.12)', color: '#c9a961' }}>
                    <CreditCard size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white">Cartão de crédito</div>
                    <div className="text-xs text-white/55">Cobrança recorrente automática</div>
                  </div>
                </div>
                <ArrowLeft size={16} className="rotate-180" style={{ color: '#c9a961' }} />
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg px-3 py-2.5 text-xs text-rose-300" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
                {error}
              </div>
            )}

            <div className="mt-6 text-center text-xs text-white/40 flex items-center justify-center gap-1.5">
              <Lock size={11} /> Pagamento seguro · Processado por Asaas
            </div>
          </>
        )}

        {/* ========== STEP 3 — CHECKOUT EMBARCADO ========== */}
        {step === 3 && (
          <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {method === 'PIX' && pixData && (
              <PixCheckout
                qrCode={pixData.qrCode}
                paymentId={pixData.paymentId}
                value={pixData.value}
                onSuccess={onPaymentSuccess}
                onFail={(err) => setError(err)}
              />
            )}
            {method === 'CREDIT_CARD' && (
              <CardCheckout
                planId={selectedPlan}
                value={plan.price}
                holder={{
                  name: name.trim(),
                  email: user?.email,
                  cpfCnpj: cpfCnpj.replace(/\D/g, ''),
                  phone: phone.replace(/\D/g, '') || undefined,
                }}
                onSuccess={onPaymentSuccess}
                onBack={() => setStep(2)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
