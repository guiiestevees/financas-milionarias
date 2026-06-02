import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Clock, Loader2, CheckCircle2, AlertCircle, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { playSuccess } from '../lib/sounds'

// Mensagens rotativas durante a espera do PIX — passa sensação de
// "tô acompanhando seu pagamento em tempo real"
const WAITING_MESSAGES = [
  'Confira o app do seu banco e finalize o PIX',
  'O PIX cai em segundos — tô de olho aqui',
  'Assim que você pagar, libero seu acesso na hora',
  'Pode levar 5-30 segundos pra confirmar depois do pagamento',
  'Estou monitorando seu pagamento em tempo real',
]

// Mostra QR Code PIX + copia-cola + polling automático do status.
// Quando paga, dispara onSuccess.
//
// Props:
//   qrCode: { encodedImage, payload, expirationDate }
//   paymentId: string
//   value: number
//   onSuccess: () => void
//   onFail: (error) => void
export default function PixCheckout({ qrCode, paymentId, value, onSuccess, onFail }) {
  const [status, setStatus] = useState('pending')
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const [lastCheck, setLastCheck] = useState(Date.now())
  const pollRef = useRef(null)
  const timerRef = useRef(null)
  const msgTimerRef = useRef(null)

  // Rotaciona mensagens de espera a cada 4s
  useEffect(() => {
    if (status !== 'pending') return
    msgTimerRef.current = setInterval(() => {
      setMsgIndex((i) => (i + 1) % WAITING_MESSAGES.length)
    }, 4000)
    return () => clearInterval(msgTimerRef.current)
  }, [status])

  // Polling do status a cada 3 segundos
  useEffect(() => {
    if (status !== 'pending') return

    const check = async () => {
      setLastCheck(Date.now())
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/checkout-status?paymentId=${paymentId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        if (data.isPaid) {
          setStatus('paid')
          playSuccess()  // 🎵 ding-ding refinado
          onSuccess?.()
        } else if (data.isFailed) {
          setStatus('failed')
          onFail?.(data.status)
        }
      } catch (err) {
        console.warn('poll error:', err)
      }
    }

    // Primeiro check imediato (rápido), depois intervalo
    check()
    pollRef.current = setInterval(check, 3000)
    return () => clearInterval(pollRef.current)
  }, [paymentId, status, onSuccess, onFail])

  // Countdown da expiração
  useEffect(() => {
    if (!qrCode?.expirationDate) return
    const update = () => {
      const ms = new Date(qrCode.expirationDate).getTime() - Date.now()
      if (ms <= 0) { setTimeLeft('expirado'); return }
      const min = Math.floor(ms / 60000)
      const sec = Math.floor((ms % 60000) / 1000)
      setTimeLeft(`${min}:${String(sec).padStart(2, '0')}`)
    }
    update()
    timerRef.current = setInterval(update, 1000)
    return () => clearInterval(timerRef.current)
  }, [qrCode?.expirationDate])

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(qrCode.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('clipboard error:', err)
    }
  }

  // ----- Tela de sucesso -----
  if (status === 'paid') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
          <CheckCircle2 size={32} />
        </div>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl mb-2">
          Pagamento confirmado
        </h3>
        <p className="text-white/65 text-sm">
          🎩 Excelente. Liberando seu acesso completo agora mesmo...
        </p>
        <Loader2 size={20} className="animate-spin mx-auto mt-4 text-white/45" />
      </div>
    )
  }

  // ----- Tela de falha -----
  if (status === 'failed') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
          <AlertCircle size={32} />
        </div>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl mb-2">
          Pagamento não confirmado
        </h3>
        <p className="text-white/65 text-sm mb-4">
          A cobrança expirou ou foi cancelada. Tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
        >
          Tentar de novo
        </button>
      </div>
    )
  }

  // ----- Tela principal de QR + copia-cola -----
  return (
    <div className="space-y-4">
      {/* Header com valor */}
      <div className="text-center pb-3 border-b border-white/5">
        <div className="text-xs text-white/45 uppercase tracking-wider mb-1">Total a pagar</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-3xl font-semibold tabular-nums">
          R$ {Number(value).toFixed(2).replace('.', ',')}
        </div>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="p-3 rounded-2xl bg-white" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {qrCode?.encodedImage ? (
            <img
              src={`data:image/png;base64,${qrCode.encodedImage}`}
              alt="QR Code PIX"
              style={{ width: 220, height: 220, display: 'block' }}
            />
          ) : (
            <div style={{ width: 220, height: 220 }} className="flex items-center justify-center text-black/40">
              <Loader2 size={32} className="animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="text-center text-sm text-white/65 leading-relaxed">
        Abra o app do seu banco, escolha <strong className="text-white/85">PIX → Ler QR Code</strong> e aponte para a tela.
      </div>

      {/* Identificação do recebedor — transparência pro cliente */}
      <div className="rounded-lg px-3 py-2.5 text-xs text-white/60 leading-relaxed"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="flex items-start gap-2">
          <span className="text-white/40 shrink-0">ℹ</span>
          <div>
            No app do banco, o pagamento aparecerá em nome de{' '}
            <strong className="text-white/85">Alquimia Digital Ltda</strong>
            {' '}— CNPJ <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>58.491.823/0001-47</span>.
          </div>
        </div>
      </div>

      {/* PIX copia-cola */}
      <div>
        <div className="text-xs text-white/55 mb-1.5 text-center">Ou copie o código PIX:</div>
        <button
          onClick={copyPayload}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition"
          style={{
            background: copied ? 'rgba(16,185,129,0.1)' : 'var(--bg-elev1)',
            border: `1px solid ${copied ? 'rgba(16,185,129,0.35)' : 'var(--border-medium)'}`,
            color: copied ? '#10b981' : 'var(--text-primary)',
          }}
        >
          <span className="text-xs font-mono truncate flex-1 text-left" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {qrCode?.payload?.slice(0, 40)}...
          </span>
          <span className="text-xs font-medium flex items-center gap-1 shrink-0">
            {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </span>
        </button>
      </div>

      {/* Status box vivo — mensagem rotativa + pulse animation */}
      <div
        className="rounded-2xl px-4 py-3.5"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.06))',
          border: '1px solid rgba(16,185,129,0.25)',
        }}
      >
        <div className="flex items-start gap-3">
          {/* Olho com pulse — feedback de "tô olhando" */}
          <div className="relative shrink-0 mt-0.5">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'rgba(16,185,129,0.4)',
                animation: 'pixPulse 1.6s ease-out infinite',
              }}
            />
            <div
              className="relative flex items-center justify-center w-7 h-7 rounded-full"
              style={{ background: 'var(--accent-emerald)', color: '#fff' }}
            >
              <Eye size={13} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent-emerald)' }}>
                Aguardando pagamento
              </span>
              {timeLeft && timeLeft !== 'expirado' && (
                <span className="text-[10px] tabular-nums opacity-60 flex items-center gap-1 ml-auto" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  <Clock size={10} /> expira em {timeLeft}
                </span>
              )}
            </div>
            <div
              className="text-xs leading-relaxed transition-opacity duration-500"
              style={{ color: 'var(--text-secondary)' }}
              key={msgIndex}
            >
              {WAITING_MESSAGES[msgIndex]}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
        🎩 Esta tela atualiza automaticamente — não precisa recarregar.
      </div>
    </div>
  )
}
