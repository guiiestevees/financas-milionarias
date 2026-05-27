import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

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

function maskCpf(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }
    if (!acceptedPrivacy) { setError('Você precisa aceitar a Política de Privacidade pra continuar'); return }

    const cpfDigits = cpf.replace(/\D/g, '')
    // CPF é OPCIONAL — mas se preencheu, tem que ter 11 dígitos
    if (cpfDigits && cpfDigits.length !== 11) {
      setError('CPF deve ter 11 dígitos (ou deixe em branco)')
      return
    }

    setLoading(true)
    const { error: err, data } = await signUp(email, password, name, cpfDigits || null)
    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }

    // Se o CPF foi informado, salva no profile (RLS deixa porque é o
    // próprio usuário; a row pode já ter sido criada por trigger ou
    // ser criada agora pela primeira gravação)
    if (cpfDigits && data?.user?.id) {
      try {
        await supabase
          .from('user_profiles')
          .upsert({ user_id: data.user.id, cpf: cpfDigits }, { onConflict: 'user_id' })
      } catch (err) {
        console.warn('Erro ao salvar CPF (vai tentar de novo após login):', err)
      }
    }

    setLoading(false)
    navigate('/confirm')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
          className="text-2xl text-white mb-1"
        >
          Criar conta
        </h2>
        <p className="text-sm text-white/45">Comece a controlar suas finanças</p>
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
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Seu nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ana Silva"
            autoComplete="name"
            style={inputStyle}
            className="placeholder:text-white/20 focus:border-white/25"
          />
        </div>
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
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">
            CPF <span className="lowercase tracking-normal text-white/35 normal-case ml-1">(opcional, mas permite login com CPF)</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
            autoComplete="off"
            style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
            className="placeholder:text-white/20 focus:border-white/25"
          />
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Senha</label>
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
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={acceptedPrivacy}
          onChange={(e) => setAcceptedPrivacy(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 2, accentColor: '#d4af37', cursor: 'pointer' }}
        />
        <span className="text-xs text-white/55 leading-relaxed">
          Li e concordo com a{' '}
          <Link to="/privacidade" target="_blank" rel="noopener" className="text-amber-300/90 hover:text-amber-300 underline underline-offset-2">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !acceptedPrivacy}
        style={{
          background: (loading || !acceptedPrivacy) ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.9)',
          color: '#070912',
          fontWeight: 600,
          width: '100%',
          padding: '11px',
          borderRadius: 10,
          fontSize: 14,
          cursor: (loading || !acceptedPrivacy) ? 'not-allowed' : 'pointer',
          border: 'none',
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? 'Criando conta…' : 'Criar conta'}
      </button>

      <p className="text-center text-sm text-white/40">
        Já tem conta?{' '}
        <Link to="/login" className="text-white/70 hover:text-white transition underline underline-offset-2">
          Entrar
        </Link>
      </p>
    </form>
  )
}
