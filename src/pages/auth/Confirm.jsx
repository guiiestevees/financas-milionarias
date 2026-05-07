import { Link } from 'react-router-dom'

export default function Confirm() {
  return (
    <div className="space-y-4 text-center">
      <div className="text-4xl mb-2">📧</div>
      <h2
        style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}
        className="text-2xl text-white"
      >
        Confirme seu e-mail
      </h2>
      <p className="text-sm text-white/55 leading-relaxed">
        Enviamos um link de confirmação para o seu endereço de e-mail. Clique no link para ativar sua conta.
      </p>
      <p className="text-xs text-white/35">
        Não recebeu? Verifique a pasta de spam ou tente criar a conta novamente.
      </p>
      <div className="pt-2">
        <Link
          to="/login"
          className="text-sm text-white/40 hover:text-white/70 transition"
        >
          ← Voltar para o login
        </Link>
      </div>
    </div>
  )
}
