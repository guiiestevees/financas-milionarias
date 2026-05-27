import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const SUPPORT_EMAIL = 'alquimiadigital08@gmail.com'

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  outline: 'none',
  width: '100%',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  boxSizing: 'border-box',
}

export default function ForgotPassword() {
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
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl text-white">
          Verifique seu e-mail
        </h2>
        <p className="text-sm text-white/55 leading-relaxed">
          Se esse e-mail tiver uma conta cadastrada, você vai receber um link para redefinir sua senha em instantes.
        </p>
        <Link to="/login" className="block text-sm text-white/40 hover:text-white/70 transition mt-4">
          ← Voltar para o login
        </Link>

        {/* Suporte caso não receba ou tenha esquecido o email */}
        <div className="mt-6 pt-4 border-t border-white/5 text-xs text-white/40 leading-relaxed">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <LifeBuoy size={11} />
            <strong>Sem acesso ao email cadastrado?</strong>
          </div>
          <p>
            Escreva para{' '}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Recuperação de conta — Domus`} className="text-amber-300/85 hover:text-amber-300 underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
            {' '}com seu CPF e celular cadastrados.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
          className="text-2xl text-white mb-1"
        >
          Redefinir senha
        </h2>
        <p className="text-sm text-white/45">Vamos enviar um link para seu e-mail.</p>
      </div>

      {error && (
        <div
          className="text-sm p-3 rounded-lg"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'rgba(255,255,255,0.85)' }}
        >
          {error}
        </div>
      )}

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

      <button
        type="submit"
        disabled={loading}
        style={{
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
        }}
      >
        {loading ? 'Enviando…' : 'Enviar link de redefinição'}
      </button>

      <p className="text-center">
        <Link to="/login" className="text-sm text-white/40 hover:text-white/70 transition">
          ← Voltar para o login
        </Link>
      </p>

      {/* Suporte */}
      <div className="mt-2 pt-4 border-t border-white/5 text-xs text-white/40 leading-relaxed">
        <div className="flex items-center gap-1.5 mb-1">
          <LifeBuoy size={11} />
          <strong>Sem acesso ao email cadastrado?</strong>
        </div>
        <p>
          Escreva para{' '}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Recuperação de conta — Domus`} className="text-amber-300/85 hover:text-amber-300 underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          {' '}com seu CPF e celular cadastrados.
        </p>
      </div>
    </form>
  )
}
