import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AtSign, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

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

// Aplica máscara de CPF se for puro número (e tiver começado a digitar CPF)
function maskCpfIfNumeric(input) {
  const trimmed = String(input || '')
  // Se tem @ ou letras, é email — não aplica máscara
  if (/[a-zA-Z@]/.test(trimmed)) return trimmed
  // É puro número → aplica máscara de CPF (000.000.000-00)
  const d = trimmed.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function Login() {
  const { signInWithIdentifier } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Detecta visualmente se tá digitando CPF (pra ícone + máscara)
  const looksLikeCpf = !identifier.includes('@') && identifier.replace(/\D/g, '').length > 0 && !/[a-zA-Z]/.test(identifier)
  const Icon = looksLikeCpf ? User : AtSign

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signInWithIdentifier(identifier, password)
    setLoading(false)
    if (err) { setError(err.message); return }
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
          className="text-2xl text-white mb-1"
        >
          Entrar
        </h2>
        <p className="text-sm text-white/45">Acesse com email ou CPF</p>
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
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">
            Email ou CPF
          </label>
          <div className="relative">
            <Icon
              size={14}
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                transition: 'color 0.15s',
              }}
            />
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(maskCpfIfNumeric(e.target.value))}
              placeholder="seu@email.com  ou  000.000.000-00"
              required
              autoComplete="username"
              maxLength={50}
              style={{ ...inputStyle, paddingLeft: 36 }}
              className="placeholder:text-white/20 focus:border-white/25"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            style={inputStyle}
            className="placeholder:text-white/20 focus:border-white/25"
          />
        </div>
      </div>

      <div className="text-right">
        <Link to="/forgot-password" className="text-xs text-white/40 hover:text-white/70 transition">
          Esqueceu a senha?
        </Link>
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
        {loading ? 'Entrando…' : 'Entrar'}
      </button>

      <p className="text-center text-sm text-white/40">
        Não tem conta?{' '}
        <Link to="/signup" className="text-white/70 hover:text-white transition underline underline-offset-2">
          Criar conta
        </Link>
      </p>

      <p className="text-center text-xs text-white/30 pt-2">
        Precisa de ajuda?{' '}
        <a
          href="mailto:alquimiadigital08@gmail.com?subject=Suporte — Domus"
          className="text-white/50 hover:text-amber-300 transition"
        >
          alquimiadigital08@gmail.com
        </a>
      </p>
    </form>
  )
}
