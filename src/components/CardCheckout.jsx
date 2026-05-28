import { useState } from 'react'
import { Loader2, Lock, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react'
import { maskCardNumber, maskCardExpiry, maskCardCvv, maskCep, detectCardBrand, validateCardNumber, validateCardExpiry, parseExpiry } from '../lib/cardUtils'
import { supabase } from '../lib/supabase'
import { playSuccess } from '../lib/sounds'
import CardPreview from './CardPreview'

// Form embarcado de cartão de crédito.
// Coleta dados, valida, e chama /api/checkout-pay pra processar.
//
// Props:
//   planId, holder (nome/email/cpfCnpj/phone do step anterior), value
//   onSuccess: () => void
//   onBack: () => void
// maxInstallments: número máximo de parcelas no cartão.
// - 1 (default): pagamento à vista (1×)
// - >1 (ex: 12): mostra seletor de parcelas, deixa user escolher 1× até N×
export default function CardCheckout({ planId, holder, value, onSuccess, onBack, maxInstallments = 1 }) {
  const [number, setNumber] = useState('')
  const [holderName, setHolderName] = useState(holder?.name || '')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [installments, setInstallments] = useState(1)  // 1× por padrão
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('form')
  const [error, setError] = useState(null)
  const [focused, setFocused] = useState(null)

  const showInstallments = maxInstallments > 1
  const installmentValue = Number(value) / installments

  const brand = detectCardBrand(number)
  const numberDigits = number.replace(/\D/g, '')
  const numValid = validateCardNumber(numberDigits)
  const expValid = validateCardExpiry(expiry)
  const cvvValid = cvv.length >= 3

  const formValid = numValid && expValid && cvvValid && holderName.trim().length > 2 && postalCode.replace(/\D/g, '').length === 8 && addressNumber.trim()

  const submit = async () => {
    if (!formValid || submitting) return
    setSubmitting(true)
    setError(null)
    setStatus('processing')

    try {
      const exp = parseExpiry(expiry)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const res = await fetch('/api/checkout-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId,
          method: 'CREDIT_CARD',
          installments,  // 1 (à vista) ou N (parcelado, só pra plano anual)
          holder: {
            ...holder,
            postalCode: postalCode.replace(/\D/g, ''),
            addressNumber: addressNumber.trim(),
          },
          card: {
            number: numberDigits,
            holderName: holderName.trim().toUpperCase(),
            expiryMonth: exp.month,
            expiryYear: exp.year,
            ccv: cvv,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Pagamento recusado')

      // Asaas pode retornar vários status. Só liberamos acesso pra
      // cartão REALMENTE autorizado (CONFIRMED ou RECEIVED).
      const cardStatus = data.status || 'UNKNOWN'

      if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(cardStatus)) {
        // ✅ Cartão autorizado, libera acesso
        setStatus('success')
        playSuccess()
        setTimeout(() => onSuccess?.(), 1500)
      } else if (cardStatus === 'AWAITING_RISK_ANALYSIS') {
        // 🔍 Em análise antifraude — Asaas vai resolver em minutos/horas.
        // NÃO libera acesso ainda.
        throw new Error('Pagamento em análise antifraude. Aguarde o email de confirmação ou tente outra forma de pagamento.')
      } else if (cardStatus === 'PENDING') {
        // ⏳ Pendente — operadora não autorizou ainda ou recusou
        throw new Error('Cartão não autorizado pela operadora. Verifique limite, dados e tente novamente — ou use outro cartão.')
      } else if (['REFUSED', 'DELETED'].includes(cardStatus)) {
        throw new Error('Pagamento recusado. Verifique os dados e tente outro cartão.')
      } else {
        // Status desconhecido — não libera, manda usuário tentar de novo
        console.warn('Status inesperado:', cardStatus, data)
        throw new Error(`Status inesperado (${cardStatus}). Tente novamente.`)
      }
    } catch (err) {
      console.error('card payment error:', err)
      setError(err.message || 'Não foi possível processar o pagamento')
      setStatus('error')
      setSubmitting(false)
    }
  }

  // ----- Sucesso -----
  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
          <CheckCircle2 size={32} />
        </div>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl mb-2">
          Pagamento aprovado
        </h3>
        <p className="text-white/65 text-sm">
          🎩 Excelente. Liberando seu acesso completo...
        </p>
        <Loader2 size={20} className="animate-spin mx-auto mt-4 text-white/45" />
      </div>
    )
  }

  // ----- Processando -----
  if (status === 'processing') {
    return (
      <div className="text-center py-12">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#c9a961' }} />
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg mb-2">
          Processando seu pagamento
        </h3>
        <p className="text-white/55 text-sm">
          🎩 Permita-me um instante. Verificando com a operadora...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Valor */}
      <div className="text-center pb-3 border-b border-white/5">
        <div className="text-xs text-white/45 uppercase tracking-wider mb-1">Total</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-2xl font-semibold tabular-nums">
          R$ {Number(value).toFixed(2).replace('.', ',')}
        </div>
        {showInstallments && installments > 1 && (
          <div className="text-xs text-white/55 mt-1">
            em <strong className="text-white/85">{installments}×</strong> de R$ {installmentValue.toFixed(2).replace('.', ',')} no cartão (sem juros)
          </div>
        )}
      </div>

      {/* Preview 3D do cartão — vira quando foca no CVV */}
      <CardPreview
        number={number}
        holderName={holderName}
        expiry={expiry}
        cvv={cvv}
        focused={focused}
      />

      {/* Seletor de parcelas — só aparece se maxInstallments > 1 (plano anual) */}
      {showInstallments && (
        <div>
          <label className="text-xs text-white/55 mb-1 block">Parcelas no cartão</label>
          <select
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px',
              fontSize: 14, outline: 'none',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: 36,
            }}
            className="focus:border-amber-400"
          >
            {Array.from({ length: maxInstallments }, (_, i) => {
              const n = i + 1
              const valuePerInstallment = (Number(value) / n).toFixed(2).replace('.', ',')
              return (
                <option key={n} value={n} style={{ background: '#0f1525' }}>
                  {n === 1
                    ? `À vista — R$ ${Number(value).toFixed(2).replace('.', ',')}`
                    : `${n}× de R$ ${valuePerInstallment} sem juros`}
                </option>
              )
            })}
          </select>
        </div>
      )}

      {/* Número do cartão */}
      <div>
        <label className="text-xs text-white/55 mb-1 block flex items-center gap-2">
          <CreditCard size={11} /> Número do cartão
          {brand && brand !== 'unknown' && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ml-auto"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}>
              {brand}
            </span>
          )}
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(maskCardNumber(e.target.value))}
          onFocus={() => setFocused('number')}
          onBlur={() => setFocused(null)}
          placeholder="0000 0000 0000 0000"
          maxLength={19}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${number && !numValid ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: 'white', width: '100%', borderRadius: 10, padding: '11px 14px',
            fontSize: 15, outline: 'none', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em',
          }}
          className="placeholder:text-white/30 focus:border-amber-400"
        />
      </div>

      {/* Nome no cartão */}
      <div>
        <label className="text-xs text-white/55 mb-1 block">Nome no cartão</label>
        <input
          type="text"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value.toUpperCase())}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
          placeholder="COMO IMPRESSO NO CARTÃO"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px',
            fontSize: 14, outline: 'none',
          }}
          className="placeholder:text-white/30 focus:border-amber-400"
        />
      </div>

      {/* Validade + CVV */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/55 mb-1 block">Validade</label>
          <input
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => setExpiry(maskCardExpiry(e.target.value))}
            onFocus={() => setFocused('expiry')}
            onBlur={() => setFocused(null)}
            placeholder="MM/AA"
            maxLength={5}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${expiry && !expValid ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px',
              fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace',
            }}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-white/55 mb-1 block">CVV</label>
          <input
            type="text"
            inputMode="numeric"
            value={cvv}
            onChange={(e) => setCvv(maskCardCvv(e.target.value))}
            onFocus={() => setFocused('cvv')}
            onBlur={() => setFocused(null)}
            placeholder="000"
            maxLength={4}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px',
              fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace',
            }}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
      </div>

      {/* CEP + número (Asaas exige pra antifraude) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/55 mb-1 block">CEP do titular</label>
          <input
            type="text"
            inputMode="numeric"
            value={postalCode}
            onChange={(e) => setPostalCode(maskCep(e.target.value))}
            placeholder="00000-000"
            maxLength={9}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px',
              fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace',
            }}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
        <div>
          <label className="text-xs text-white/55 mb-1 block">Número</label>
          <input
            type="text"
            inputMode="numeric"
            value={addressNumber}
            onChange={(e) => setAddressNumber(e.target.value.replace(/[^\dA-Za-z]/g, '').slice(0, 6))}
            placeholder="123"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', width: '100%', borderRadius: 10, padding: '10px 14px',
              fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace',
            }}
            className="placeholder:text-white/30 focus:border-amber-400"
          />
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-lg px-3 py-2.5 text-xs flex items-start gap-2"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-4 py-3 rounded-xl text-sm transition"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
        >
          Voltar
        </button>
        <button
          onClick={submit}
          disabled={!formValid || submitting}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-40"
          style={{
            background: 'linear-gradient(180deg, #c9a961, #a88a4a)',
            color: '#070912',
            boxShadow: formValid ? '0 8px 24px rgba(201,169,97,0.25)' : 'none',
          }}
        >
          {submitting ? (
            <><Loader2 size={14} className="animate-spin" /> Processando...</>
          ) : (
            <>🎩 Pagar R$ {Number(value).toFixed(2).replace('.', ',')}</>
          )}
        </button>
      </div>

      {/* Trust */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-white/40">
        <Lock size={11} /> Dados criptografados · Processado por Asaas
      </div>
    </div>
  )
}
