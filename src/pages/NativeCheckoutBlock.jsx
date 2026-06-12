import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import NativeReaderNotice from '../components/NativeReaderNotice'

// Tela mostrada NO LUGAR de Comecar/Assinar quando o app roda como nativo (Capacitor).
// Cumpre regras Apple/Google "Reader App": sem preços, sem checkout, apenas
// indica que gestão de planos é feita no site.
//
// Props:
//   variant: 'signup' (substitui /comecar) ou 'manage' (substitui /assinar)
//   backTo:  rota pra voltar (default depende do variant)
export default function NativeCheckoutBlock({ variant = 'manage', backTo }) {
  const navigate = useNavigate()
  const isSignup = variant === 'signup'

  const defaultBack = isSignup ? '/login' : '/app'
  const targetBack = backTo || defaultBack

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-md w-full mx-auto px-4 pt-8 pb-12">
        {isSignup ? (
          <Link
            to={targetBack}
            className="inline-flex items-center gap-2 text-sm mb-6 transition hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Voltar
          </Link>
        ) : (
          <button
            onClick={() => navigate(targetBack)}
            className="inline-flex items-center gap-2 text-sm mb-6 transition hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
        )}

        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.20), rgba(212,175,55,0.08))',
              border: '1px solid rgba(212,175,55,0.30)',
            }}
          >
            <Lock size={22} style={{ color: 'var(--accent-gold)' }} />
          </div>
          <h1
            style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--text-primary)' }}
            className="text-2xl sm:text-3xl mb-2"
          >
            {isSignup ? 'Entre com sua conta' : 'Assinatura gerenciada fora do app'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {isSignup
              ? '🎩 Já tem uma conta? É só entrar para começar a usar.'
              : '🎩 Por aqui você usa o app normalmente. A gestão de planos não acontece dentro do aplicativo.'}
          </p>
        </div>

        <NativeReaderNotice
          subtitle={
            isSignup
              ? 'Assim que entrar com uma conta ativa, tudo aparece por aqui.'
              : 'Se você já tem um plano ativo, o acesso aparece automaticamente após entrar.'
          }
        />

        {isSignup && (
          <div className="text-center mt-6">
            <Link
              to="/login"
              className="text-sm font-semibold transition hover:opacity-80"
              style={{ color: 'var(--accent-gold)' }}
            >
              Já tenho conta · Entrar →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
