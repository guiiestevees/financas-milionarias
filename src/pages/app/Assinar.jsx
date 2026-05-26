import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Check, ArrowLeft, Loader2, MessageCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useSubscription } from '../../hooks/useSubscription'
import { supabase } from '../../lib/supabase'

// ---------- Máscaras BR ----------
// Detecta CPF (11 dígitos) vs CNPJ (14 dígitos) automaticamente
// e aplica a máscara correta enquanto o usuário digita.
function maskCpfCnpj(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    // CPF: 000.000.000-00
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  // CNPJ: 00.000.000/0000-00
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

// Celular BR: (00) 00000-0000 (11 dígitos) ou (00) 0000-0000 (10 dígitos)
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
    price: 29.90,
    priceLabel: 'R$ 29,90',
    period: 'por mês',
    accent: 'emerald',
    description: 'Cobrança recorrente. Cancele quando quiser.',
    features: [
      'Acesso completo ao app',
      'Alfred no WhatsApp (texto e áudio)',
      'Cofres, orçamentos e controle ilimitados',
      '7 dias grátis pra testar',
      'Cancele a qualquer momento',
    ],
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 249.00,
    priceLabel: 'R$ 249',
    period: 'por ano',
    accent: 'gold',
    badge: 'Economia de R$ 110',
    description: 'Pague 1× e fique 12 meses tranquilo.',
    features: [
      'Tudo do plano Mensal',
      '✨ 30% de desconto (R$ 20,75/mês)',
      'Sem preocupação com cobrança mensal',
      '7 dias grátis pra testar',
      'Garantia de 7 dias',
    ],
  },
]

export default function Assinar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const subscription = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState('annual')
  const [name, setName] = useState(user?.user_metadata?.name || '')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const startCheckout = async () => {
    setError(null)
    if (!name.trim()) { setError('Informe seu nome completo'); return }
    if (!cpfCnpj.trim()) { setError('Informe seu CPF ou CNPJ'); return }

    setSubmitting(true)
    try {
      // Pega o token do usuário pra autenticar a chamada
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada — faça login novamente')

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId: selectedPlan,
          name: name.trim(),
          email: user?.email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          phone: phone.replace(/\D/g, '') || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar cobrança')

      if (data.checkoutUrl) {
        // Redireciona o cliente pro checkout do Asaas
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('Link de pagamento não foi gerado')
      }
    } catch (err) {
      console.error('checkout error:', err)
      setError(err.message || 'Erro inesperado')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #070912 0%, #0a0d18 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/55 hover:text-white text-sm mb-6 transition"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: 'rgba(201,169,97,0.1)', border: '1px solid rgba(201,169,97,0.3)' }}>
            <Crown size={14} style={{ color: '#c9a961' }} />
            <span className="text-xs font-medium" style={{ color: '#c9a961' }}>Continue com Alfred ao seu dispor</span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl sm:text-4xl mb-2">
            Escolha seu plano
          </h1>
          <p className="text-white/55 text-sm max-w-md mx-auto">
            7 dias grátis pra experimentar. Sem compromisso — cancela quando quiser.
          </p>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id
            const accentColor = plan.accent === 'gold' ? '#c9a961' : '#10b981'
            const accentSoft = plan.accent === 'gold' ? 'rgba(201,169,97,0.1)' : 'rgba(16,185,129,0.08)'
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className="text-left p-5 rounded-2xl transition relative"
                style={{
                  background: isSelected ? accentSoft : 'rgba(255,255,255,0.025)',
                  border: `2px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isSelected ? `0 8px 24px ${accentColor}25` : 'none',
                }}
              >
                {plan.badge && (
                  <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: accentColor, color: '#070912' }}>
                    {plan.badge}
                  </div>
                )}
                <div className="flex items-baseline justify-between mb-1">
                  <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: accentColor }} className="text-xl">{plan.name}</div>
                  {isSelected && <Check size={18} style={{ color: accentColor }} />}
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-3xl font-semibold tabular-nums">{plan.priceLabel}</span>
                  <span className="text-xs text-white/45">{plan.period}</span>
                </div>
                <div className="text-xs text-white/55 mb-4">{plan.description}</div>
                <ul className="space-y-1.5">
                  {plan.features.map((f, i) => (
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

        {/* Form */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-sm font-medium mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-300" />
            Quase lá — só faltam alguns dados
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

            <div className="text-xs text-white/45 leading-relaxed pt-1">
              Você vai pra página segura do nosso parceiro de pagamentos pra concluir. Aceitamos PIX, cartão e PIX Automático.
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2.5 text-xs text-rose-300" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
                {error}
              </div>
            )}

            <button
              onClick={startCheckout}
              disabled={submitting}
              className="w-full mt-2 py-3.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #c9a961, #a88a4a)',
                color: '#070912',
                boxShadow: '0 8px 24px rgba(201,169,97,0.25)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Gerando link de pagamento...
                </>
              ) : (
                <>
                  🎩 Assinar plano {PLANS.find((p) => p.id === selectedPlan)?.name}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/40 flex-wrap">
          <div className="flex items-center gap-1.5">
            <MessageCircle size={12} /> Alfred ao seu dispor
          </div>
          <div>🔒 Pagamento seguro</div>
          <div>↩ Cancele quando quiser</div>
        </div>
      </div>
    </div>
  )
}
