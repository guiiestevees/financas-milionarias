import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, LifeBuoy } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

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

// Mapeia códigos de erro do Supabase em mensagens amigáveis
function parseHashError() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.slice(1)  // tira o #
  if (!hash || !hash.includes('error')) return null
  const params = new URLSearchParams(hash)
  const error = params.get('error')
  const code = params.get('error_code')
  const description = params.get('error_description')
  if (!error) return null
  return { error, code, description: decodeURIComponent(description || '').replace(/\+/g, ' ') }
}

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [linkError, setLinkError] = useState(null)
  const [hasSession, setHasSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Checa se o link veio com erro (#error=...) E se há sessão ativa
  useEffect(() => {
    const hashErr = parseHashError()
    if (hashErr) {
      setLinkError(hashErr)
      setCheckingSession(false)
      return
    }
    // Aguarda o Supabase processar o hash de recovery (#access_token=...)
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data?.session)
      setCheckingSession(false)
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) {
      // Erros amigáveis
      const m = (err.message || '').toLowerCase()
      if (m.includes('session') || m.includes('missing')) {
        setError('Sessão expirada. Peça um novo link de redefinição.')
      } else if (m.includes('same') || m.includes('different')) {
        setError('A nova senha precisa ser diferente da atual.')
      } else {
        setError(err.message)
      }
      return
    }
    setDone(true)
    setTimeout(() => navigate('/'), 2000)
  }

  // ----- Carregando estado da sessão -----
  if (checkingSession) {
    return (
      <div className="text-center text-sm text-white/40 py-8">
        Validando link…
      </div>
    )
  }

  // ----- Link veio com erro do Supabase -----
  if (linkError) {
    const isExpired = linkError.code === 'otp_expired' || /expir/i.test(linkError.description)
    const isUsed = /already.*used|invalid/i.test(linkError.description)
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-2"
          style={{ background: 'rgba(244,63,94,0.12)', color: '#fda4af' }}>
          <AlertTriangle size={26} />
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl text-white">
          Link inválido
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          {isExpired
            ? 'Este link de redefinição expirou. Links são válidos por 1 hora.'
            : isUsed
              ? 'Este link já foi utilizado. Cada link só funciona uma vez.'
              : 'Não foi possível validar este link de redefinição.'}
        </p>
        <p className="text-xs text-white/45 leading-relaxed">
          Peça um novo link clicando em "Esqueceu a senha?" na tela de login.
        </p>

        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition mt-2"
          style={{
            background: 'linear-gradient(180deg,#c9a961,#a88a4a)',
            color: '#070912',
          }}
        >
          Pedir novo link
        </Link>

        <Link to="/login" className="block text-sm text-white/40 hover:text-white/70 transition mt-2">
          ← Voltar para o login
        </Link>

        {/* Suporte */}
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
          </p>
        </div>
      </div>
    )
  }

  // ----- Sem sessão (não veio do email) -----
  if (!hasSession) {
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-2"
          style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37' }}>
          <AlertTriangle size={26} />
        </div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl text-white">
          Esta página é só por email
        </h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Pra redefinir sua senha, você precisa acessar o link enviado pelo Alfred no seu email.
        </p>
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition mt-2"
          style={{
            background: 'linear-gradient(180deg,#c9a961,#a88a4a)',
            color: '#070912',
          }}
        >
          Pedir link de redefinição
        </Link>
        <Link to="/login" className="block text-sm text-white/40 hover:text-white/70 transition mt-2">
          ← Voltar para o login
        </Link>
      </div>
    )
  }

  // ----- Tela de sucesso -----
  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl mb-2">✅</div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-2xl text-white">
          Senha atualizada!
        </h2>
        <p className="text-sm text-white/55">Redirecionando para o app…</p>
      </div>
    )
  }

  // ----- Form normal de redefinir -----
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
          className="text-2xl text-white mb-1"
        >
          Nova senha
        </h2>
        <p className="text-sm text-white/45">Escolha uma senha segura.</p>
      </div>

      {error && (
        <div
          className="text-sm p-3 rounded-lg"
          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'rgba(255,255,255,0.85)' }}
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Nova senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            autoComplete="new-password"
            style={inputStyle}
            className="placeholder:text-white/20 focus:border-white/25"
          />
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Confirmar senha</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
            required
            autoComplete="new-password"
            style={inputStyle}
            className="placeholder:text-white/20 focus:border-white/25"
          />
        </div>
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
        {loading ? 'Salvando…' : 'Redefinir senha'}
      </button>
    </form>
  )
}
