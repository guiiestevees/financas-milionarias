import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, CreditCard, QrCode, Loader2, Lock, ShieldCheck,
  AlertCircle, CheckCircle2,
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
    features: ['Acesso completo ao app', 'Alfred no WhatsApp', 'Cancele a qualquer momento'],
    accent: 'emerald',
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 167.00,
    priceLabel: 'R$ 167',
    period: 'por ano',
    description: 'Pague 1× e fique 12 meses tranquilo. Economia de R$ 61.',
    features: ['Tudo do plano Mensal', 'Economia de R$ 61 (~27%)', 'Sem preocupação com cobrança mensal'],
    accent: 'gold',
  },
]

const METHODS_BY_PLAN = {
  monthly: [
    { id: 'CREDIT_CARD', name: 'Cartão de Crédito', description: 'Cobrança recorrente automática', icon: CreditCard, accent: '#c9a961' },
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
  const [step, setStep] = useState(1)

  // ---- Plano ----
  const [planId, setPlanId] = useState('annual')
  const plan = PLANS.find((p) => p.id === planId)

  // ---- Dados pessoais ----
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  // ---- Validações em tempo real (status: null | 'checking' | 'taken') ----
  const [emailStatus, setEmailStatus] = useState(null)
  const [cpfStatus, setCpfStatus] = useState(null)
  const [phoneStatus, setPhoneStatus] = useState(null)

  // Verifica se email já tem cadastro
  const handleEmailBlur = async () => {
    const clean = email.trim().toLowerCase()
    if (!clean || !clean.includes('@') || clean.length < 5) { setEmailStatus(null); return }
    setEmailStatus('checking')
    try {
      const { data, error } = await supabase.rpc('check_email_exists', { p_email: clean })
      if (error) { console.warn('email check:', error); setEmailStatus(null); return }
      setEmailStatus(data ? 'taken' : null)
    } catch (e) { console.warn('email check:', e); setEmailStatus(null) }
  }

  // Verifica se CPF já tem cadastro
  const handleCpfBlur = async () => {
    const d = cpf.replace(/\D/g, '')
    if (d.length !== 11) { setCpfStatus(null); return }
    setCpfStatus('checking')
    try {
      const { data, error } = await supabase.rpc('lookup_email_by_cpf', { p_cpf: d })
      if (error) { console.warn('cpf check:', error); setCpfStatus(null); return }
      setCpfStatus(data ? 'taken' : null)
    } catch (e) { console.warn('cpf check:', e); setCpfStatus(null) }
  }

  // Verifica se celular já tem cadastro
  const handlePhoneBlur = async () => {
    const d = phone.replace(/\D/g, '')
    if (d.length < 10 || d.length > 11) { setPhoneStatus(null); return }
    setPhoneStatus('checking')
    try {
      const { data, error } = await supabase.rpc('lookup_email_by_phone', { p_phone: d })
      if (error) { console.warn('phone check:', error); setPhoneStatus(null); return }
      setPhoneStatus(data ? 'taken' : null)
    } catch (e) { console.warn('phone check:', e); setPhoneStatus(null) }
  }

  // ---- Endereço ----
  const [address, setAddress] = useState({
    cep: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '',
  })

  // ---- Pagamento ----
  const [method, setMethod] = useState(null)
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
  const [pixData, setPixData] = useState(null)

  // ---- Validações ----
  const cpfDigits = cpf.replace(/\D/g, '')
  const phoneDigits = phone.replace(/\D/g, '')
  const validCpf = /^\d{11}$/.test(cpfDigits)
  const validPhone = phoneDigits.length >= 10 && phoneDigits.length <= 11
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const validPassword = password.length >= 6
  const passwordsMatch = password === passwordConfirm
  const addressOk = isAddressValid(address)

  const numDigits = cardNumber.replace(/\D/g, '')
  const numValid = validateCardNumber(numDigits)
  const expValid = validateCardExpiry(cardExpiry)
  const cvvValid = cardCvv.length >= 3
  const cardOk = method !== 'CREDIT_CARD' ? true : (
    numValid && expValid && cvvValid && cardHolderName.trim().length > 2
  )

  // Por step
  const step1Valid = !!planId
  const noDuplicates = emailStatus !== 'taken' && cpfStatus !== 'taken' && phoneStatus !== 'taken'
  const step2Valid = name.trim().length >= 3 && validEmail && validCpf && validPhone && validPassword && passwordsMatch && addressOk && noDuplicates
  const step3Valid = method && cardOk && acceptedPrivacy

  const availableMethods = METHODS_BY_PLAN[planId] || []
  const maxInstallments = planId === 'annual' ? 12 : 1
  const showInstallments = method === 'CREDIT_CARD' && maxInstallments > 1
  const installmentValue = method === 'CREDIT_CARD' && installments > 0
    ? Number(plan.price) / installments : Number(plan.price)

  // Quando troca de plano, ajusta método:
  // - Mensal: pré-seleciona cartão (única opção)
  // - Anual: reseta pra usuário escolher entre PIX e cartão
  const onPlanChange = (id) => {
    setPlanId(id)
    setMethod(id === 'monthly' ? 'CREDIT_CARD' : null)
  }

  const goNext = () => {
    setError('')
    if (step === 1 && step1Valid) setStep(2)
    else if (step === 2 && step2Valid) setStep(3)
    // step 3 = submit, vai pelo onClick do botão
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setError('')
    setStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---- Submit ----
  const submit = async (e) => {
    e?.preventDefault?.()
    if (!step3Valid || submitting) return
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
        throw new Error('Conta criada, mas o Supabase exige confirmar email primeiro. Acesse seu email e clique no link, depois faça login.')
      }

      // 2) Profile
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        cpf: cpfDigits,
        whatsapp_phone: phoneFull,
        subscription_status: 'expired',
        subscription_until: new Date().toISOString(),
        trial_started_at: null,
      }, { onConflict: 'user_id' })

      // 3) Holder com endereço
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

      // 4) checkout-pay
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

      // 5) Resposta
      if (method === 'PIX') {
        setPixData({ qrCode: data.qrCode, paymentId: data.paymentId, value: data.value })
        setSubmitting(false)
        return
      }

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

  // ===== TELA: sucesso =====
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

  // ===== TELA: PIX =====
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

  // ===== TELA principal — wizard 3 steps =====
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">

        {/* Voltar pra landing (só no step 1) */}
        {step === 1 && (
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm mb-5 transition" style={{ color: 'var(--text-tertiary)' }}>
            <ArrowLeft size={16} /> Voltar
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <img src="/domus-logo-512.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: '#d4af37' }}>Domus</span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }} className="text-3xl sm:text-4xl mb-2">
            {step === 1 ? 'Escolha seu plano' : step === 2 ? 'Seus dados' : 'Finalizar pagamento'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {step === 1 && '🎩 Comece sua experiência com Alfred.'}
            {step === 2 && 'Precisamos de algumas informações pra criar sua conta.'}
            {step === 3 && 'Escolha como pagar e seu acesso libera na hora.'}
          </p>
        </div>

        {/* Indicador de progresso */}
        <ProgressBar step={step} />

        {error && (
          <div className="mb-5 rounded-lg p-3 text-sm flex items-start gap-2"
            style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); if (step === 3) submit(e); else goNext() }}>

          {/* ====================== STEP 1 — PLANO ====================== */}
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {PLANS.map((p) => {
                const isSel = planId === p.id
                const color = p.accent === 'gold' ? '#c9a961' : '#10b981'
                const soft = p.accent === 'gold' ? 'rgba(201,169,97,0.1)' : 'rgba(16,185,129,0.08)'
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPlanChange(p.id)}
                    className="text-left p-5 rounded-2xl transition relative"
                    style={{
                      background: isSel ? soft : 'var(--bg-elev2)',
                      border: `2px solid ${isSel ? color : 'var(--border-soft)'}`,
                      boxShadow: isSel ? `0 8px 24px ${color}25` : 'none',
                    }}
                  >
                    <div className="flex items-baseline justify-between mb-2">
                      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color }} className="text-xl">{p.name}</div>
                      {isSel && <Check size={18} style={{ color }} />}
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-3xl font-semibold tabular-nums">{p.priceLabel}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.period}</span>
                    </div>
                    <div className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>{p.description}</div>
                    <ul className="space-y-1.5">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Check size={11} style={{ color, marginTop: 2 }} className="shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>
          )}

          {/* ====================== STEP 2 — DADOS + ENDEREÇO ====================== */}
          {step === 2 && (
            <div className="space-y-6 mb-6">

              {/* Dados pessoais */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
                <div className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Conta</div>

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

                  <Field label="E-mail">
                    <EmailInput
                      id="comecar-email"
                      value={email}
                      onChange={(v) => { setEmail(v); if (emailStatus === 'taken') setEmailStatus(null) }}
                      onBlur={handleEmailBlur}
                      placeholder="seu@email.com"
                      required
                      autoComplete="email"
                    />
                    {emailStatus === 'checking' && (
                      <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>verificando…</div>
                    )}
                    {emailStatus === 'taken' && (
                      <div className="text-[11px] mt-1.5 text-rose-300/85 flex items-center gap-2 flex-wrap">
                        <span>⚠ Este email já tem conta.</span>
                        <Link to="/login" className="underline underline-offset-2 hover:opacity-80">Entrar</Link>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <Link to="/forgot-password" className="underline underline-offset-2 hover:opacity-80">Recuperar senha</Link>
                      </div>
                    )}
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="CPF">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cpf}
                        onChange={(e) => { setCpf(maskCpf(e.target.value)); if (cpfStatus === 'taken') setCpfStatus(null) }}
                        onBlur={handleCpfBlur}
                        placeholder="000.000.000-00"
                        required
                        maxLength={14}
                        style={{
                          ...inputStyle,
                          fontFamily: 'JetBrains Mono, monospace',
                          border: `1px solid ${cpfStatus === 'taken' ? 'rgba(244,63,94,0.45)' : 'var(--border-medium)'}`,
                        }}
                        className="placeholder:text-white/25 focus:border-amber-400"
                      />
                      {cpfStatus === 'checking' && (
                        <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>verificando…</div>
                      )}
                      {cpfStatus === 'taken' && (
                        <div className="text-[11px] mt-1.5 text-rose-300/85 flex items-center gap-2 flex-wrap">
                          <span>⚠ Este CPF já tem conta.</span>
                          <Link to="/login" className="underline underline-offset-2 hover:opacity-80">Entrar</Link>
                        </div>
                      )}
                    </Field>
                    <Field label="Celular (com DDD)">
                      <input
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => { setPhone(maskPhone(e.target.value)); if (phoneStatus === 'taken') setPhoneStatus(null) }}
                        onBlur={handlePhoneBlur}
                        placeholder="(00) 00000-0000"
                        required
                        maxLength={15}
                        style={{
                          ...inputStyle,
                          fontFamily: 'JetBrains Mono, monospace',
                          border: `1px solid ${phoneStatus === 'taken' ? 'rgba(244,63,94,0.45)' : 'var(--border-medium)'}`,
                        }}
                        className="placeholder:text-white/25 focus:border-amber-400"
                      />
                      {phoneStatus === 'checking' && (
                        <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>verificando…</div>
                      )}
                      {phoneStatus === 'taken' && (
                        <div className="text-[11px] mt-1.5 text-rose-300/85 flex items-center gap-2 flex-wrap">
                          <span>⚠ Este celular já tem conta.</span>
                          <Link to="/login" className="underline underline-offset-2 hover:opacity-80">Entrar</Link>
                        </div>
                      )}
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
                  <Field label="Confirmar senha">
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="repita a senha"
                      required
                      autoComplete="new-password"
                      onPaste={(e) => e.preventDefault()}
                      style={{ ...inputStyle, border: `1px solid ${passwordConfirm.length > 0 && !passwordsMatch ? 'rgba(244,63,94,0.45)' : 'var(--border-medium)'}` }}
                      className="placeholder:text-white/25 focus:border-amber-400"
                    />
                    {passwordConfirm.length > 0 && !passwordsMatch && (
                      <div className="text-xs text-rose-300/85 mt-1.5">⚠ As senhas não coincidem</div>
                    )}
                  </Field>
                </div>

                <div className="mt-3 text-xs flex items-start gap-2" style={{ color: 'var(--text-tertiary)' }}>
                  <ShieldCheck size={12} className="mt-0.5 shrink-0 text-amber-300/70" />
                  <span>CPF e celular ajudam você a recuperar acesso se um dia perder a senha ou o email.</span>
                </div>
              </div>

              {/* Endereço */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
                <div className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Endereço</div>
                <AddressFields value={address} onChange={setAddress} />
              </div>
            </div>
          )}

          {/* ====================== STEP 3 — PAGAMENTO ====================== */}
          {step === 3 && (
            <div className="space-y-6 mb-6">

              {/* Resumo do plano */}
              <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Plano escolhido</div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xl font-semibold tabular-nums">{plan.priceLabel}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{plan.period}</div>
                </div>
              </div>

              {/* Forma de pagamento */}
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
                <div className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Forma de pagamento</div>

                {/* Aviso do Alfred — só pra plano mensal */}
                {planId === 'monthly' && (
                  <div className="mb-4 rounded-lg p-3 text-xs leading-relaxed flex items-start gap-2"
                    style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--text-secondary)' }}>
                    <span className="shrink-0 mt-0.5">🎩</span>
                    <span>
                      <em>Permita-me apenas uma observação: a recorrência mensal acompanha o cartão para que eu cuide das renovações em seu lugar. Caso prefira PIX, o plano anual o aceita de bom grado — basta voltar ao primeiro passo.</em>
                    </span>
                  </div>
                )}

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
                          background: isSel ? `${color}15` : 'var(--bg-elev1)',
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

                {/* Campos de cartão */}
                {method === 'CREDIT_CARD' && (
                  <div className="mt-5 space-y-4">
                    {showInstallments && (
                      <div>
                        <label className="text-xs mb-1.5 block uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Parcelas</label>
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

                    <CardPreview number={cardNumber} holderName={cardHolderName} expiry={cardExpiry} cvv={cardCvv} focused={cardFocused} />

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
              </div>

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
            </div>
          )}

          {/* Botões de navegação */}
          <NavButtons
            step={step}
            canAdvance={step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid}
            isLastStep={step === 3}
            onBack={goBack}
            onNext={goNext}
            submitting={submitting}
            buttonLabel={step === 3 ? (
              method === 'PIX' ? '🎩 Gerar PIX' : `🎩 Pagar R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`
            ) : 'Próximo'}
          />

          {/* Resumo do parcelamento (só no step 3 com cartão) */}
          {step === 3 && method === 'CREDIT_CARD' && installments > 1 && (
            <div className="text-xs text-center mt-3" style={{ color: 'var(--text-tertiary)' }}>
              {installments}× de R$ {installmentValue.toFixed(2).replace('.', ',')} sem juros
            </div>
          )}

          {/* Trust */}
          {step === 3 && (
            <div className="flex items-center justify-center gap-1.5 text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              <Lock size={11} /> Dados criptografados · Processado por Asaas
            </div>
          )}

          {/* Já tem conta — só no step 1 */}
          {step === 1 && (
            <p className="text-center text-sm mt-6" style={{ color: 'var(--text-tertiary)' }}>
              Já tem conta?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>Entrar</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

// ---------- Sub-componentes ----------

function ProgressBar({ step }) {
  const steps = [
    { num: 1, label: 'Plano' },
    { num: 2, label: 'Dados' },
    { num: 3, label: 'Pagamento' },
  ]
  return (
    <div className="flex items-center justify-center gap-2 mb-7">
      {steps.map((s, idx) => {
        const isActive = step === s.num
        const isDone = step > s.num
        const color = isActive || isDone ? '#d4af37' : 'var(--text-muted)'
        return (
          <div key={s.num} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition"
                style={{
                  background: isDone ? '#d4af37' : isActive ? 'rgba(212,175,55,0.15)' : 'var(--bg-elev2)',
                  color: isDone ? '#070912' : color,
                  border: isActive ? `1.5px solid ${color}` : '1.5px solid transparent',
                }}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : s.num}
              </div>
              <span className="text-xs font-medium hidden sm:inline" style={{ color }}>{s.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className="w-6 sm:w-12 h-px transition" style={{ background: isDone ? '#d4af37' : 'var(--border-medium)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function NavButtons({ step, canAdvance, isLastStep, onBack, onNext, submitting, buttonLabel }) {
  return (
    <div className="flex items-center gap-3">
      {step > 1 && (
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-3 rounded-xl text-sm font-medium transition disabled:opacity-50"
          style={{
            background: 'var(--bg-elev1)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft size={14} className="inline mr-1" /> Voltar
        </button>
      )}
      <button
        type="submit"
        disabled={!canAdvance || submitting}
        className="flex-1 py-3.5 rounded-xl text-base font-semibold transition flex items-center justify-center gap-2 disabled:opacity-40"
        style={{
          background: canAdvance && !submitting ? 'linear-gradient(180deg, #d4af37, #a87f1f)' : 'rgba(212,175,55,0.3)',
          color: '#070912',
          boxShadow: canAdvance && !submitting ? '0 8px 24px rgba(212,175,55,0.25)' : 'none',
          cursor: canAdvance && !submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? (
          <><Loader2 size={16} className="animate-spin" /> Processando…</>
        ) : (
          <>{buttonLabel}{!isLastStep && <ArrowRight size={14} />}</>
        )}
      </button>
    </div>
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
