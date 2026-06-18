import { Link } from 'react-router-dom'
import { ArrowLeft, Trash2, Sparkles } from 'lucide-react'

const SectionTitle = ({ children }) => (
  <h2
    style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.01em' }}
    className="text-xl sm:text-2xl text-white mt-8 mb-3"
  >
    {children}
  </h2>
)

const P = ({ children }) => (
  <p className="text-sm sm:text-[15px] text-white/85 leading-relaxed mb-3">{children}</p>
)

const Item = ({ children }) => (
  <li className="text-sm sm:text-[15px] text-white/85 leading-relaxed mb-1.5">{children}</li>
)

// Página dedicada à exclusão de conta — exigida pela Google Play
// (link público que descreve as etapas e os dados afetados).
export default function DeleteAccount() {
  return (
    <div className="min-h-screen" style={{ background: '#070912' }}>
      <div className="w-full max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white/80 transition mb-6"
        >
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div className="flex items-center gap-2 text-xs uppercase mb-3" style={{ letterSpacing: '0.25em', color: '#d4af37' }}>
          <Trash2 size={12} />
          Exclusão de conta
        </div>
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-3xl sm:text-4xl text-white mb-2"
        >
          Como excluir sua conta do Domus
        </h1>
        <p className="text-sm text-white/60">
          Domus — Mordomo Financeiro · desenvolvido por Guilherme Esteves (Alquimia Digital)
        </p>

        <SectionTitle>Excluir pelo aplicativo (recomendado)</SectionTitle>
        <P>
          Você pode excluir sua conta e todos os dados a qualquer momento, direto no app, em poucos toques:
        </P>
        <ol className="list-decimal pl-5 mb-3">
          <Item>Abra o app <strong className="text-white/90">Domus</strong> e faça login</Item>
          <Item>Toque em <strong className="text-white/90">Ajustes</strong> (ícone de engrenagem, no menu inferior)</Item>
          <Item>Role até o final, na seção <strong className="text-white/90">"Zona de perigo"</strong></Item>
          <Item>Toque em <strong className="text-white/90">"Excluir minha conta"</strong></Item>
          <Item>Digite <strong className="text-white/90">EXCLUIR</strong> para confirmar e conclua</Item>
        </ol>
        <P>
          A exclusão é imediata e <strong className="text-white/90">não pode ser desfeita</strong>.
        </P>

        <SectionTitle>Excluir por e-mail</SectionTitle>
        <P>
          Se você não tiver mais acesso ao app, envie um e-mail solicitando a exclusão a partir do
          mesmo endereço cadastrado na sua conta. Concluímos a exclusão em até 7 dias.
        </P>
        <P>
          <strong className="text-white/90">E-mail:</strong>{' '}
          <a href="mailto:alquimiadigital08@gmail.com" className="text-amber-300 hover:underline">
            alquimiadigital08@gmail.com
          </a>
        </P>

        <SectionTitle>Quais dados são excluídos</SectionTitle>
        <P>Ao excluir sua conta, apagamos de forma permanente:</P>
        <ul className="list-disc pl-5 mb-3">
          <Item>Seus dados de identificação (nome, e-mail, telefone, endereço)</Item>
          <Item>Todas as receitas, despesas, categorias, orçamentos, cartões e cofres</Item>
          <Item>Compromissos, tarefas, projetos e etiquetas da agenda</Item>
          <Item>Preferências, configurações e histórico de uso</Item>
        </ul>

        <SectionTitle>Dados mantidos por obrigação legal</SectionTitle>
        <P>
          Registros fiscais e financeiros relacionados a pagamentos de assinatura podem ser mantidos
          pelo prazo exigido pela legislação brasileira (até 5 anos), de forma isolada e usados apenas
          para cumprimento de obrigações legais. Nenhum outro dado é retido após a exclusão.
        </P>

        <SectionTitle>Prazo</SectionTitle>
        <P>
          A exclusão feita pelo app é <strong className="text-white/90">imediata</strong>. Solicitações por
          e-mail são concluídas em até <strong className="text-white/90">7 dias</strong>.
        </P>

        <div className="mt-12 pt-6 border-t border-white/5 text-xs text-white/35">
          Para mais detalhes sobre o tratamento dos seus dados, veja a{' '}
          <Link to="/privacidade" className="text-white/55 hover:text-white/80 underline underline-offset-2">
            Política de Privacidade
          </Link>.
        </div>
      </div>
    </div>
  )
}
