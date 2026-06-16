import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, Mail, MessageCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const SUPPORT_EMAIL = 'alquimiadigital08@gmail.com'

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

const goldBtn = (loading) => ({
  background: loading ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.9)',
  color: '#070912',
  fontWeight: 600,
  width: '100%',
  padding: '11px',
  borderRadius: 10,
  fontSize: 14,
  cursor: loading ? 'not-allowed' : 'pointer',
  border: 'none',
  transition: 'opacity 0.15s',
})

function ErrorBox({ children }) {
  return (
    <div className="text-sm p-3 rounded-lg"
      style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'rgba(255,255,255,0.85)' }}>
      {children}
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition"
      style={{
        background: active ? 'rgba(212,175,55,0.12)' : 'transparent',
        color: active ? '#d4af37' : 'var(--text-tertiary)',
        border: `1px solid ${active ? 'rgba(212,175,55,0.35)' : 'transparent'}`,
      }}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

export default function ForgotPassword() {
  const [mode, setMode] = useState('email')

  return (
    <div className="space-y-4">
      <div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl text-white mb-1">
          Redefinir senha
        </h2>
        <p className="text-sm text-white/45">Recupere por e-mail ou pelo seu celular cadastrado.</p>
      </div>

      {/* Toggle E-mail / Celular */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}>
        <TabBtn active={mode === 'email'} onClick={() => setMode('email')} icon={Mail} label="E-mail" />
        <TabBtn active={mode === 'phone'} onClick={() => setMode('phone')} icon={MessageCircle} label="Celular" />
      </div>

      {mode === 'email' ? <EmailRecover /> : <PhoneRecover />}

      <p className="text-center">
        <Link to="/login" className="text-sm text-white/40 hover:text-white/70 transition">
          ← Voltar para o login
        </Link>
      </p>
    </div>
  )
}

// ---------- Recuperação por E-MAIL (fluxo original) ----------
function EmailRecover() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl mb-2">📬</div>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl text-white">
          Verifique seu e-mail
        </h3>
        <p className="text-sm text-white/55 leading-relaxed">
          Se esse e-mail tiver uma conta cadastrada, você vai receber um link para redefinir sua senha em instantes.
        </p>
        <div className="mt-4 pt-4 border-t border-white/5 text-xs text-white/40 leading-relaxed">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <LifeBuoy size={11} />
            <strong>Não chegou o e-mail?</strong>
          </div>
          <p>Confira o spam, ou use a opção <strong className="text-white/70">Celular</strong> acima.</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}
      <div>
        <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          autoComplete="email"
          style={inputStyle}
          className="placeholder:text-white/20 focus:border-white/25"
        />
      </div>
      <button type="submit" disabled={loading} style={goldBtn(loading)}>
        {loading ? 'Enviando…' : 'Enviar link de redefinição'}
      </button>
    </form>
  )
}

// ---------- Recuperação por CELULAR (código no WhatsApp) ----------
function PhoneRecover() {
  const [step, setStep] = useState('enter') // 'enter' | 'code' | 'done'
  const [phone, setPhone] = useState('')
  const [masked, setMasked] = useState('')
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/recover-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar o código.')
      setMasked(data.phoneMasked || '')
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const doReset = async (e) => {
    e?.preventDefault()
    setError('')
    if (pw.length < 6) { setError('A nova senha precisa ter pelo menos 6 caracteres.'); return }
    if (pw !== pw2) { setError('As senhas não conferem.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/recover-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', phone, code, newPassword: pw }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao trocar a senha.')
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="text-center space-y-3 py-2">
        <div className="text-4xl">✅</div>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl text-white">
          Senha alterada!
        </h3>
        <p className="text-sm text-white/55">Pronto — já pode entrar com a nova senha.</p>
        <Link to="/login" className="inline-block text-sm font-semibold underline underline-offset-2" style={{ color: '#d4af37' }}>
          Ir para o login →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={step === 'enter' ? sendCode : doReset} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}

      {step === 'enter' ? (
        <>
          <div>
            <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Celular cadastrado</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="DDD + número (ex: 11 99999-8888)"
              required
              style={inputStyle}
              className="placeholder:text-white/20 focus:border-white/25"
            />
          </div>
          <button type="submit" disabled={loading} style={goldBtn(loading)}>
            {loading ? 'Enviando…' : 'Enviar código no WhatsApp'}
          </button>
          <p className="text-xs text-white/40 leading-relaxed">
            Você vai receber um código de 6 dígitos no WhatsApp do número cadastrado.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-white/55">
            Código enviado pro WhatsApp <strong className="text-white/80">{masked}</strong>. Digite-o abaixo e escolha a nova senha.
          </p>
          <div>
            <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Código (6 dígitos)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: 18 }}
              className="placeholder:text-white/20 focus:border-white/25"
            />
          </div>
          <div>
            <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Nova senha</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="mínimo 6 caracteres"
              required
              autoComplete="new-password"
              style={inputStyle}
              className="placeholder:text-white/20 focus:border-white/25"
            />
          </div>
          <div>
            <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Confirmar nova senha</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="repita a senha"
              required
              autoComplete="new-password"
              style={inputStyle}
              className="placeholder:text-white/20 focus:border-white/25"
            />
          </div>
          <button type="submit" disabled={loading} style={goldBtn(loading)}>
            {loading ? 'Trocando…' : 'Trocar senha'}
          </button>
          <button
            type="button"
            onClick={sendCode}
            disabled={loading}
            className="w-full text-xs text-white/40 hover:text-white/70 transition"
          >
            Não recebeu? Reenviar código
          </button>
        </>
      )}
    </form>
  )
}
