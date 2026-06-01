import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Mail, Loader2, ArrowLeft, CheckCircle2, RotateCcw, ClipboardPaste } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useVerified } from '../../hooks/useVerified'
import { supabase } from '../../lib/supabase'
import { playSuccess } from '../../lib/sounds'

// Tela mostrada DEPOIS do signup, antes de liberar o acesso ao app.
// Padrão: tenta WhatsApp. Se falhar (template não aprovado / sem número), oferece email.
//
// Estados:
//   - 'idle': nada enviado ainda — botão "Enviar código no WhatsApp"
//   - 'sending': mandando código
//   - 'awaiting': código enviado, esperando input do user
//   - 'verifying': checando código
//   - 'verified': sucesso (transição rápida pro app)
//   - 'email_sent': fallback de email disparado
//
// PERSISTÊNCIA: state, code, phoneMasked, cooldown são salvos em sessionStorage.
// Isso preserva a tela "awaiting" quando o usuário sai pro WhatsApp pra copiar o
// código e volta — em mobile (especialmente iOS) o navegador pode desmontar
// o componente quando você troca de app.

const SS_KEY = 'domus:verify-state'

const inputStyle = {
  background: 'var(--bg-elev1)',
  border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
  borderRadius: 10,
  padding: '14px 16px',
  fontSize: 22,
  textAlign: 'center',
  letterSpacing: '0.5em',
  fontFamily: 'JetBrains Mono, monospace',
  boxSizing: 'border-box',
}

// Lê o state salvo no sessionStorage (se houver)
function readSaved() {
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw)
    // Expira após 15 min — não vale a pena restaurar
    if (obj.savedAt && Date.now() - obj.savedAt > 15 * 60 * 1000) {
      sessionStorage.removeItem(SS_KEY)
      return null
    }
    return obj
  } catch { return null }
}

function saveState(state, extras) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({
      state, ...extras, savedAt: Date.now(),
    }))
  } catch {}
}

function clearSaved() {
  try { sessionStorage.removeItem(SS_KEY) } catch {}
}

export default function VerifyAccount() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh: refreshVerified } = useVerified()

  // Inicialização — restaura do sessionStorage se houver (ex.: voltou do WhatsApp)
  const saved = readSaved()
  const [state, setState] = useState(saved?.state || 'idle')
  const [error, setError] = useState('')
  const [code, setCode] = useState(saved?.code || '')
  const [phoneMasked, setPhoneMasked] = useState(saved?.phoneMasked || '')
  const [cooldown, setCooldown] = useState(saved?.cooldown || 0)
  const [pasteHint, setPasteHint] = useState('')  // mensagem quando colar dá erro
  const codeInputRef = useRef(null)

  const phoneFromMeta = user?.user_metadata?.phone || ''

  // Persiste mudanças do state — sobrevive desmontagem do componente
  useEffect(() => {
    if (state === 'awaiting' || state === 'verifying') {
      saveState(state, { code, phoneMasked, cooldown })
    } else if (state === 'verified' || state === 'idle') {
      clearSaved()
    }
  }, [state, code, phoneMasked, cooldown])

  // Cooldown de reenvio
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Foco automático no input quando entra em 'awaiting'
  useEffect(() => {
    if (state === 'awaiting') {
      setTimeout(() => codeInputRef.current?.focus(), 100)
    }
  }, [state])

  const sendCode = async (method = 'whatsapp') => {
    setError('')
    setState('sending')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sessão expirada. Faça login novamente.')
        setState('idle')
        return
      }
      const res = await fetch('/api/verify-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ method }),
      })
      const data = await res.json()

      if (data.alreadyVerified) {
        clearSaved()
        await refreshVerified()
        navigate('/app', { replace: true })
        return
      }

      if (!res.ok) {
        setError(data.error || 'Falha ao enviar código')
        setState('idle')
        if (data.fallback === 'email' && method === 'whatsapp') {
          setError((data.error || 'WhatsApp indisponível.') + ' Clique abaixo pra receber por email.')
        }
        return
      }

      if (method === 'email') {
        setState('email_sent')
        return
      }

      setPhoneMasked(data.phoneMasked || '')
      setCooldown(60)
      setCode('')
      setState('awaiting')
    } catch (e) {
      console.error('sendCode error:', e)
      setError('Erro de rede. Tente novamente.')
      setState('idle')
    }
  }

  const checkCode = async (codeOverride) => {
    const codeToCheck = codeOverride ?? code
    if (codeToCheck.length !== 6) return
    setError('')
    setState('verifying')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sessão expirada.')
        setState('awaiting')
        return
      }
      const res = await fetch('/api/verify-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: codeToCheck }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Código incorreto')
        setState('awaiting')
        setCode('')
        return
      }

      setState('verified')
      clearSaved()
      playSuccess()
      await refreshVerified()
      setTimeout(() => navigate('/app', { replace: true }), 1200)
    } catch (e) {
      console.error('checkCode error:', e)
      setError('Erro de rede. Tente novamente.')
      setState('awaiting')
    }
  }

  // Lê código do clipboard (botão Colar)
  const handlePaste = async () => {
    setPasteHint('')
    try {
      const text = await navigator.clipboard.readText()
      const digits = (text || '').replace(/\D/g, '').slice(0, 6)
      if (digits.length === 6) {
        setCode(digits)
        // Auto-submit logo após colar 6 dígitos
        setTimeout(() => checkCode(digits), 150)
      } else if (digits.length > 0) {
        setCode(digits)
        setPasteHint('Faltam dígitos — copie o código completo')
      } else {
        setPasteHint('Não encontrei um código no clipboard — copie do WhatsApp e tente novamente')
      }
    } catch (e) {
      // Navegador bloqueou clipboard.readText (algumas combinações de iOS Safari)
      setPasteHint('Permissão negada — toque no campo e cole com 👆')
      codeInputRef.current?.focus()
    }
  }

  // ----- Tela: sucesso -----
  if (state === 'verified') {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl mb-2">
          Conta confirmada
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          🎩 Excelente. Abrindo o app...
        </p>
        <Loader2 size={20} className="animate-spin mx-auto mt-4" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  // ----- Tela: email enviado -----
  if (state === 'email_sent') {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full"
          style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37' }}>
          <Mail size={28} />
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl">
          Email enviado
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Mandamos um link de confirmação pro seu email.
          Abra a mensagem, clique no link, e seu acesso será liberado automaticamente.
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Não recebeu? Confira a pasta de spam ou volte e tente o WhatsApp.
        </p>
        <button
          onClick={() => { setState('idle'); setError(''); clearSaved() }}
          className="text-xs inline-flex items-center gap-1 transition hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={11} /> Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl mb-1">
          Confirme sua conta
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Vou te mandar um código pra confirmar que você é você.
        </p>
      </div>

      {error && (
        <div
          className="text-sm p-3 rounded-lg"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--text-primary)' }}
        >
          {error}
        </div>
      )}

      {/* IDLE: escolha do método */}
      {state === 'idle' && (
        <div className="space-y-3">
          <button
            onClick={() => sendCode('whatsapp')}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition text-left"
            style={{
              background: 'rgba(37,211,102,0.08)',
              border: '1px solid rgba(37,211,102,0.3)',
            }}
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: '#25D366', color: 'white' }}>
              <MessageCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                Receber código no WhatsApp
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {phoneFromMeta
                  ? `Pro número que você cadastrou (${maskRawPhone(phoneFromMeta)})`
                  : 'Pro número que você cadastrou'}
              </div>
            </div>
          </button>

          <button
            onClick={() => sendCode('email')}
            className="w-full flex items-center gap-3 p-4 rounded-xl transition text-left"
            style={{
              background: 'var(--bg-elev2)',
              border: '1px solid var(--border-medium)',
            }}
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}>
              <Mail size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                Receber link no email
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Mais demorado, use se não tiver WhatsApp.
              </div>
            </div>
          </button>

          <p className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
            🎩 Permita-me apenas um instante. É só pra confirmar.
          </p>
        </div>
      )}

      {/* SENDING */}
      {state === 'sending' && (
        <div className="text-center py-8">
          <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: '#d4af37' }} />
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Enviando código…</p>
        </div>
      )}

      {/* AWAITING: input do código */}
      {(state === 'awaiting' || state === 'verifying') && (
        <div className="space-y-4">
          <div className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Mandei um código de <strong>6 dígitos</strong> pro WhatsApp
            {phoneMasked && (
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {phoneMasked}
              </div>
            )}
          </div>

          {/* Botão de COLAR — bem visível, fácil pra mobile */}
          <button
            type="button"
            onClick={handlePaste}
            disabled={state === 'verifying'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition disabled:opacity-50"
            style={{
              background: 'rgba(37,211,102,0.1)',
              border: '1px solid rgba(37,211,102,0.35)',
              color: '#25D366',
            }}
          >
            <ClipboardPaste size={15} />
            Colar código copiado
          </button>

          {pasteHint && (
            <div className="text-xs text-center px-2" style={{ color: 'var(--text-muted)' }}>
              {pasteHint}
            </div>
          )}

          <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            ou digite manualmente:
          </div>

          <input
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(onlyDigits)
              if (onlyDigits.length === 6) {
                setTimeout(() => {
                  if (onlyDigits.length === 6) checkCode(onlyDigits)
                }, 150)
              }
            }}
            placeholder="000000"
            maxLength={6}
            disabled={state === 'verifying'}
            style={inputStyle}
            className="placeholder:text-white/20 focus:border-amber-400"
          />

          <button
            onClick={() => checkCode()}
            disabled={code.length !== 6 || state === 'verifying'}
            className="w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{
              background: 'rgba(212,175,55,0.9)',
              color: '#070912',
              cursor: code.length === 6 ? 'pointer' : 'not-allowed',
            }}
          >
            {state === 'verifying' ? (
              <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Validando...</span>
            ) : 'Confirmar'}
          </button>

          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <button
              onClick={() => sendCode('whatsapp')}
              disabled={cooldown > 0 || state === 'verifying'}
              className="inline-flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={11} />
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
            </button>
            <button
              onClick={() => sendCode('email')}
              disabled={state === 'verifying'}
              className="inline-flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <Mail size={11} /> Receber por email
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Mascara um telefone bruto (5511987654321) → "(11) *****-4321"
function maskRawPhone(raw) {
  const s = String(raw).replace(/\D/g, '')
  if (s.length < 6) return raw
  const last4 = s.slice(-4)
  const ddd = s.length >= 11 ? s.slice(-11, -9) : s.slice(0, 2)
  return `(${ddd}) *****-${last4}`
}
