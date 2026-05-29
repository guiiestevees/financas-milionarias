import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, CreditCard, QrCode, Loader2, Lock, ShieldCheck, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import EmailInput from '../../components/EmailInput'
import AddressFields, { isAddressValid } from '../../components/AddressFields'
import CardPreview from '../../components/CardPreview'
import PixCheckout from '../../components/PixCheckout'
import {
  maskCardNumber, maskCardExpiry, maskCardCvv, detectCardBrand,
  validateCardNumber, validateCardExpiry, parseExpiry,
} from '../../lib/cardUtils'
import { playSuccess } from '../../lib/sounds'

// ----- Máscaras -----
function maskCpf(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
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
    description: 'Cobrança recorrente. Cancele quando quiser.',
    accent: 'emerald',
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 167.00,
    priceLabel: 'R$ 167',
    period: 'por ano',
    description: 'Pague 1× e fique 12 meses tranquilo. Economia de R$ 61.',
    badge: 'Mais escolhido',
    accent: 'gold',
  },
]

const METHODS_BY_PLAN = {
  monthly: [
    { id: 'CREDIT_CARD', name: 'Cartão de Crédito', description: 'Cobrança recorrente automática', icon: CreditCard },
  ],
  annual: [
    { id: 'PIX', name: 'PIX à vista', description: 'Pague R$ 167 agora e fique 12 meses', icon: QrCode, accent: '#10b981' },
    { id: 'CREDIT_CARD', name: 'Cartão de Crédito', description: 'Em até 12× sem juros', icon: CreditCard, accent: '#c9a961' },
  ],
}

const inputStyle = {
  background: 'var(--bg-elev1)',
  border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  boxSizing: 'border-box',
}

// ---------- Componente principal ----------
export default function Comecar() {
  const navigate = useNavigate()

  // ---- Plano ----
  const [planId, setPlanId] = useState('annual')
  const plan = PLANS.find((p) => p.id === planId)

  // ---- Dados pessoais ----
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  // ---- Endereço ----
  const [address, setAddress] = useState({
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })

  // ---- Pagamento ----
  const [method, setMethod] = useState(null)  // será setado quando user escolher (PIX ou CREDIT_CARD)
  const [installments, setInstallments] = useState(1)
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardFocused, setCardFocused] = useState(null)

  // ---- Estado de submissão ----
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pixData, setPixData] = useState(null)  // { qrCode, paymentId, value }

  // ---- Validações ----
  const cpfDigits = cpf.replace(/\D/g, '')
  const phoneDigits = phone.replace(/\D/g, '')
  const validCpf = /^\d{11}$/.test(cpfDigits)
  const validPhone = phoneDigits.length >= 10 && phoneDigits.length <= 11
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const emailMatches = email.trim().toLowerCase() === emailConfirm.trim().toLowerCase()
  const validPassword = password.length >= 6
  const addressOk = isAddressValid(address)

  // Validações de cartão (só se método=cartão)
  const numDigits = cardNumber.replace(/\D/g, '')
  const numValid = validateCardNumber(numDigits)
  const expValid = validateCardExpiry(cardExpiry)
  const cvvValid = cardCvv.length >= 3
  const cardOk = method !== 'CREDIT_CARD' ? true : (
    numValid && expValid && cvvValid && cardHolderName.trim().length > 2
  )

  // Métodos disponíveis pra esse plano
  const availableMethods = METHODS_BY_PLAN[planId] || []
  const maxInstallments = planId === 'annual' ? 12 : 1
  const showInstallments = method === 'CREDIT_CARD' && maxInstallments > 1
  const installmentValue = method === 'CREDIT_CARD' && installments > 0
    ? Number(plan.price) / installments : Number(plan.price)

  // Form 100% válido?
  const dataOk = name.trim().length >= 3 && validEmail && emailMatches && validCpf && validPhone && validPassword
  const formValid = dataOk && addressOk && method && cardOk && acceptedPrivacy

  // Pula automaticamente pra próximo step se mudar plano
  const onPlanChange = (id) => {
    setPlanId(id)
    setMethod(null)  // reseta método porque planos têm métodos diferentes
  }

  // ---- Submit ----
  const submit = async (e) => {
    e?.preventDefault?.()
    if (!formValid || submitting) return
    setError('')
    setSubmitting(true)

    try {
      // 1) Cria conta no Supabase
      const phoneFull = phoneDigits.startsWith('55') ? phoneDigits : '55' + phoneDigits
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim(), cpf: cpfDigits, phone: phoneFull } },
      })
      if (signUpErr) {
        const msg = (signUpErr.message || '').toLowerCase()
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          throw new Error('Este email já está cadastrado. Faça login e assine pelas Configurações.')
        }
        if (msg.includes('invalid email')) throw new Error('Email inválido.')
        if (msg.includes('password')) throw new Error('Senha fraca. Use ao menos 6 caracteres.')
        throw new Error(signUpErr.message)
      }
      const user = signUpData?.user
      const session = signUpData?.session
      if (!user) throw new Error('Falha ao criar conta')
      if (!session) {
        // Se Confirm Email tá ON, não retorna sessão — manda pro fluxo antigo
        throw new Error('Conta criada, mas o Supabase exige confirmar email primeiro. Acesse seu email e clique no link, depois faça login.')
      }

      // 2) Cria/atualiza profile
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        cpf: cpfDigits,
        whatsapp_phone: phoneFull,
        subscription_status: 'expired',  // será ativado pelo backend após pagamento
        subscription_until: new Date().toISOString(),
        trial_started_at: null,
      }, { onConflict: 'user_id' })

      // 3) Monta o holder com endereço
      const holder = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        cpfCnpj: cpfDigits,
        phone: phoneFull,
        address: {
          postalCode: address.cep.replace(/\D/g, ''),
          street: address.street.trim(),
          addressNumber: address.number.trim(),
          complement: address.complement.trim() || undefined,
          neighborhood: address.neighborhood.trim(),
          city: address.city.trim(),
          state: address.state.trim().toUpperCase(),
        },
      }

      // 4) Chama /api/checkout-pay
      const body = { planId, method, holder }
      if (method === 'CREDIT_CARD') {
        const exp = parseExpiry(cardExpiry)
        body.installments = installments
        body.card = {
          number: numDigits,
          holderName: cardHolderName.trim().toUpperCase(),
          expiryMonth: exp.month,
          expiryYear: exp.year,
          ccv: cardCvv,
        }
      }

      const res = await fetch('/api/checkout-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Pagamento recusado')

      // 5) Tratamento por método
      if (method === 'PIX') {
        // Mostra QR code + polling
        setPixData({
          qrCode: data.qrCode,
          paymentId: data.paymentId,
          value: data.value,
        })
        setSubmitting(false)
        return
      }

      // Cartão — checa status
      const status = data.status || 'UNKNOWN'
      if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(status)) {
        setSuccess(true)
        playSuccess()
        setTimeout(() => navigate('/app', { replace: true }), 1500)
      } else if (status === 'AWAITING_RISK_ANALYSIS') {
        throw new Error('Pagamento em análise antifraude. Aguarde o email de confirmação ou tente outro cartão.')
      } else if (status === 'PENDING') {
        throw new Error('Cartão não autorizado pela operadora. Verifique limite e dados, ou tente outro cartão.')
      } else if (['REFUSED', 'DELETED'].includes(status)) {
        throw new Error('Pagamento recusado. Verifique os dados e tente outro cartão.')
      } else {
        throw new Error(`Status inesperado (${status}). Tente novamente.`)
      }
    } catch (err) {
      console.error('Comecar submit error:', err)
      setError(err.message || 'Erro ao processar')
      setSubmitting(false)
    }
  }

  // ----- Tela de sucesso -----
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-app)' }}>
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-3xl mb-2">
            Bem-vindo ao Domus
          </h2>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            🎩 Excelente. Pagamento confirmado, liberando seu acesso completo...
          </p>
          <Loader2 size={20} className="animate-spin mx-auto mt-6 text-white/45" />
        </div>
      </div>
    )
  }

  // ----- Tela de PIX (QR code + polling) -----
  if (pixData) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
        <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
          <div className="text-center mb-6">
            <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl mb-1">
              Pagamento via PIX
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Pague o PIX abaixo. Seu acesso libera automaticamente.
            </p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
            <PixCheckout
              qrCode={pixData.qrCode}
              paymentId={pixData.paymentId}
              value={pixData.value}
              onSuccess={() => {
                playSuccess()
                setTimeout(() => navigate('/app', { replace: true }), 1500)
              }}
              onFail={(err) => setError(err)}
            />
          </div>
        </div>
      </div>
    )
  }

  // ----- Tela principal (signup + checkout) -----
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">

        {/* Voltar */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm mb-5 transition" style={{ color: 'var(--text-tertiary)' }}>
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <img src="/domus-logo-512.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: '#d4af37' }}>Domus</span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }} className="text-3xl sm:text-4xl mb-2">
            Comece em poucos minutos
          </h1>
          <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            🎩 Escolha o plano, preencha seus dados, pague — e Alfred fica ao seu dispor.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg p-3 text-sm flex items-start gap-2"
            style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-8">

          {/* ============ 1 · PLANO ============ */}
          <Section number="1" title="Escolha o plano">
            <div className="grid sm:grid-cols-2 gap-3">
              {PLANS.map((p) => {
                const isSel = planId === p.id
                const color = p.accent === 'gold' ? '#c9a961' : '#10b981'
                const soft = p.accent === 'gold' ? 'rgba(201,169,97,0.1)' : 'rgba(16,185,129,0.08)'
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPlanChange(p.id)}
                    className="text-left p-4 rounded-2xl transition relative"
                    style={{
                      background: isSel ? soft : 'var(--bg-elev2)',
                      border: `2px solid ${isSel ? color : 'var(--border-soft)'}`,
                      boxShadow: isSel ? `0 8px 20px ${color}25` : 'none',
                    }}
                  >
                    {p.badge && (
                      <div className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: color, color: '#070912' }}>
                        {p.badge}
                      </div>
                    )}
                    <div className="flex items-baseline justify-between mb-1">
                      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color }} className="text-lg">{p.name}</div>
                      {isSel && <Check size={16} style={{ color }} />}
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-2xl font-semibold tabular-nums">{p.priceLabel}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.period}</span>
                    </div>
                    <div className="text-xs leading-snug" style={{ color: 'var(--text-tertiary)' }}>{p.description}</div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* ============ 2 · DADOS PESSOAIS ============ */}
          <Section number="2" title="Seus dados">
            <div className="space-y-3">
              <Field label="Nome completo">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como aparece no seu documento"
                  required
                  autoComplete="name"
                  style={inputStyle}
                  className="placeholder:text-white/25 focus:border-amber-400"
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="E-mail">
                  <EmailInput
                    id="comecar-email"
                    value={email}
                    onChange={setEmail}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                  />
                </Field>
                <Field label="Confirmar e-mail">
                  <input
                    type="email"
                    value={emailConfirm}
                    onChange={(e) => setEmailConfirm(e.target.value)}
                    placeholder="repita o e-mail"
                    required
                    autoComplete="email"
                    onPaste={(e) => e.preventDefault()}
                    style={{ ...inputStyle, border: `1px solid ${emailConfirm.length > 0 && !emailMatches ? 'rgba(244,63,94,0.45)' : 'var(--border-medium)'}` }}
                    className="placeholder:text-white/25 focus:border-amber-400"
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="CPF">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    required
                    maxLength={14}
                    style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                    className="placeholder:text-white/25 focus:border-amber-400"
                  />
                </Field>
                <Field label="Celular (com DDD)">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    required
                    maxLength={15}
                    style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                    className="placeholder:text-white/25 focus:border-amber-400"
                  />
                </Field>
              </div>

              <Field label="Senha">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  style={inputStyle}
                  className="placeholder:text-white/25 focus:border-amber-400"
                />
              </Field>
            </div>

            <div className="mt-3 text-xs flex items-start gap-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
              <ShieldCheck size={12} className="mt-0.5 shrink-0 text-amber-300/70" />
              <span>CPF e celular ajudam você a recuperar acesso se um dia perder a senha ou o email.</span>
            </div>
          </Section>

          {/* ============ 3 · ENDEREÇO ============ */}
          <Section number="3" title="Endereço">
            <AddressFields value={address} onChange={setAddress} />
          </Section>

          {/* ============ 4 · FORMA DE PAGAMENTO ============ */}
          <Section number="4" title="Forma de pagamento">
            <div className="space-y-2">
              {availableMethods.map((m) => {
                const isSel = method === m.id
                const Icon = m.icon
                const color = m.accent || '#c9a961'
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl transition relative"
                    style={{
                      background: isSel ? `${color}15` : 'var(--bg-elev2)',
                      border: `2px solid ${isSel ? color : 'var(--border-soft)'}`,
                    }}
                  >
                    <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}25`, color }}>
                      <Icon size={18} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.description}</div>
                    </div>
                    {isSel && <Check size={16} style={{ color }} />}
                  </button>
                )
              })}
            </div>

            {/* Campos de cartão (só se método = CREDIT_CARD) */}
            {method === 'CREDIT_CARD' && (
              <div className="mt-5 space-y-4">
                {/* Parcelas */}
                {showInstallments && (
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Parcelas</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      style={{
                        ...inputStyle,
                        fontFamily: 'JetBrains Mono, monospace',
                        cursor: 'pointer',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        paddingRight: 36,
                      }}
                    >
                      {Array.from({ length: maxInstallments }, (_, i) => {
                        const n = i + 1
                        const v = (Number(plan.price) / n).toFixed(2).replace('.', ',')
                        return (
                          <option key={n} value={n} style={{ background: '#0f1525' }}>
                            {n === 1 ? `À vista — R$ ${Number(plan.price).toFixed(2).replace('.', ',')}` : `${n}× de R$ ${v} sem juros`}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                )}

                {/* Preview do cartão */}
                <CardPreview
                  number={cardNumber}
                  holderName={cardHolderName}
                  expiry={cardExpiry}
                  cvv={cardCvv}
                  focused={cardFocused}
                />

                {/* Número */}
                <Field label="Número do cartão">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                    onFocus={() => setCardFocused('number')}
                    onBlur={() => setCardFocused(null)}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    style={{
                      ...inputStyle,
                      border: `1px solid ${cardNumber && !numValid ? 'rgba(244,63,94,0.4)' : 'var(--border-medium)'}`,
                      fontFamily: 'JetBrains Mono, monospace',
                      letterSpacing: '0.05em',
                    }}
                    className="placeholder:text-white/25 focus:border-amber-400"
                  />
                </Field>

                <Field label="Nome no cartão">
                  <input
                    type="text"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                    onFocus={() => setCardFocused('name')}
                    onBlur={() => setCardFocused(null)}
                    placeholder="COMO IMPRESSO NO CARTÃO"
                    style={inputStyle}
                    className="placeholder:text-white/25 focus:border-amber-400"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Validade">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(maskCardExpiry(e.target.value))}
                      onFocus={() => setCardFocused('expiry')}
                      onBlur={() => setCardFocused(null)}
                      placeholder="MM/AA"
                      maxLength={5}
                      style={{
                        ...inputStyle,
                        border: `1px solid ${cardExpiry && !expValid ? 'rgba(244,63,94,0.4)' : 'var(--border-medium)'}`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      className="placeholder:text-white/25 focus:border-amber-400"
                    />
                  </Field>
                  <Field label="CVV">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(maskCardCvv(e.target.value))}
                      onFocus={() => setCardFocused('cvv')}
                      onBlur={() => setCardFocused(null)}
                      placeholder="000"
                      maxLength={4}
                      style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                      className="placeholder:text-white/25 focus:border-amber-400"
                    />
                  </Field>
                </div>
              </div>
            )}
          </Section>

          {/* Termos */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: '#d4af37', cursor: 'pointer' }}
            />
            <span className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Li e concordo com os{' '}
              <Link to="/termos" target="_blank" rel="noopener" className="text-amber-300/90 hover:text-amber-300 underline underline-offset-2">
                Termos de Uso
              </Link>{' '}
              e com a{' '}
              <Link to="/privacidade" target="_blank" rel="noopener" className="text-amber-300/90 hover:text-amber-300 underline underline-offset-2">
                Política de Privacidade
              </Link>.
            </span>
          </label>

          {/* Resumo + Botão final */}
          <div className="rounded-2xl p-5 sticky bottom-3" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-medium)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total</div>
              <div className="text-right">
                <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-2xl font-semibold tabular-nums">
                  R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                </div>
                {method === 'CREDIT_CARD' && installments > 1 && (
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    em {installments}× de R$ {installmentValue.toFixed(2).replace('.', ',')} sem juros
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!formValid || submitting}
              className="w-full py-3.5 rounded-xl text-base font-semibold transition flex items-center justify-center gap-2 disabled:opacity-40"
              style={{
                background: formValid && !submitting ? 'linear-gradient(180deg, #d4af37, #a87f1f)' : 'rgba(212,175,55,0.3)',
                color: '#070912',
                boxShadow: formValid && !submitting ? '0 8px 24px rgba(212,175,55,0.25)' : 'none',
                cursor: formValid && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Processando…</> : <>🎩 Pagar e criar conta</>}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              <Lock size={11} /> Dados criptografados · Processado por Asaas
            </div>
          </div>

          {/* Já tem conta */}
          <p className="text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Já tem conta?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

// ---------- Sub-componentes ----------
function Section({ number, title, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}>
          {number}
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl">{title}</h2>
      </div>
      <div className="pl-0 sm:pl-10">{children}</div>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      {children}
    </div>
  )
}
