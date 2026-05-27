import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import EmailInput from '../../components/EmailInput'

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

function maskPhone(input) {
  const d = String(input || '').replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Email mismatch ao vivo (só mostra se o user já digitou algo no campo confirmar)
  const emailMismatch = emailConfirm.length > 0 && email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validações obrigatórias
    if (!name.trim()) { setError('Informe seu nome'); return }
    if (!email.trim()) { setError('Informe seu email'); return }
    if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
      setError('Os emails não coincidem. Confira se digitou exatamente igual nos dois campos.')
      return
    }

    const cpfDigits = cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) {
      setError('CPF é obrigatório (11 dígitos)')
      return
    }

    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('Celular é obrigatório — com DDD (10 ou 11 dígitos)')
      return
    }
    // Normaliza pra formato internacional BR (55 + DDD + número)
    const phoneFull = phoneDigits.startsWith('55') ? phoneDigits : '55' + phoneDigits

    if (password.length < 6) { setError('Senha deve ter ao menos 6 caracteres'); return }
    if (!acceptedPrivacy) { setError('Você precisa aceitar a Política de Privacidade pra continuar'); return }

    setLoading(true)

    // 1) Valida CPF antes de criar conta
    try {
      const { data: existingEmail, error: lookupErr } = await supabase
        .rpc('lookup_email_by_cpf', { p_cpf: cpfDigits })
      if (lookupErr) console.warn('CPF check error (continuando):', lookupErr)
      if (existingEmail) {
        setLoading(false)
        setError('Este CPF já está cadastrado. Tente entrar com sua senha — você pode usar o CPF no campo de login.')
        return
      }
    } catch (e) {
      console.warn('CPF check exception:', e)
    }

    // 2) Cria a conta no Auth
    const { error: err, data } = await signUp(email, password, name.trim(), cpfDigits, phoneFull)
    if (err) {
      setLoading(false)
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        setError('Este email já está cadastrado. Tente entrar — ou recupere a senha pelo email "Esqueceu a senha?".')
      } else if (msg.includes('invalid email')) {
        setError('Email inválido. Confira o endereço.')
      } else if (msg.includes('weak password') || msg.includes('password')) {
        setError('Senha muito fraca. Use ao menos 6 caracteres.')
      } else {
        setError(err.message)
      }
      return
    }

    // Detecta "email já cadastrado" no fluxo silencioso do Supabase
    // (quando o email já existe, Supabase retorna data.user sem identities
    // — sem erro explícito, por anti-enumeration. A gente captura aqui.)
    const identities = data?.user?.identities
    if (Array.isArray(identities) && identities.length === 0) {
      setLoading(false)
      setError('Este email já está cadastrado. Tente entrar — ou recupere a senha por "Esqueceu a senha?".')
      return
    }

    // 3) Salva CPF + telefone no profile
    if (data?.user?.id) {
      try {
        const { error: upsertErr } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: data.user.id,
            cpf: cpfDigits,
            whatsapp_phone: phoneFull,
          }, { onConflict: 'user_id' })
        if (upsertErr) console.warn('Erro ao salvar profile:', upsertErr)
      } catch (err) {
        console.warn('Exceção ao salvar profile:', err)
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
        <p className="text-sm text-white/45">Cuide das suas finanças com Alfred</p>
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
            required
            autoComplete="name"
            style={inputStyle}
            className="placeholder:text-white/20 focus:border-white/25"
          />
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">E-mail</label>
          <EmailInput
            id="signup-email"
            value={email}
            onChange={setEmail}
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Confirmar e-mail</label>
          <input
            type="email"
            value={emailConfirm}
            onChange={(e) => setEmailConfirm(e.target.value)}
            placeholder="digite o e-mail de novo"
            required
            autoComplete="email"
            onPaste={(e) => e.preventDefault()}
            style={{
              ...inputStyle,
              border: `1px solid ${emailMismatch ? 'rgba(244,63,94,0.45)' : 'rgba(255,255,255,0.1)'}`,
            }}
            className="placeholder:text-white/20 focus:border-white/25"
          />
          {emailMismatch && (
            <p className="text-xs text-rose-300 mt-1.5 px-1">⚠ Os emails não coincidem</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">CPF</label>
          <input
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            placeholder="000.000.000-00"
            required
            maxLength={14}
            autoComplete="off"
            style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
            className="placeholder:text-white/20 focus:border-white/25"
          />
        </div>
        <div>
          <label className="block text-xs text-white/45 mb-1.5 uppercase tracking-widest">Celular</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            required
            maxLength={15}
            autoComplete="tel"
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

      {/* Justificativa dos dados extras */}
      <div className="text-xs text-white/55 leading-relaxed flex items-start gap-2 px-1">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-amber-300/70" />
        <span>
          CPF e celular ajudam você a recuperar o acesso se um dia esquecer o email ou perder o acesso a ele.
        </span>
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
        disabled={loading || !acceptedPrivacy || emailMismatch}
        style={{
          background: (loading || !acceptedPrivacy || emailMismatch) ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.9)',
          color: '#070912',
          fontWeight: 600,
          width: '100%',
          padding: '11px',
          borderRadius: 10,
          fontSize: 14,
          cursor: (loading || !acceptedPrivacy || emailMismatch) ? 'not-allowed' : 'pointer',
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
