import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => navigate('/'), 2000)
  }

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
