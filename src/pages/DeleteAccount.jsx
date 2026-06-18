import { Link } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'

// Paleta clara fixa (igual ao tema light da página de vendas) — esta página
// é pública (vista por visitantes e pelo revisor da Google), então força fundo
// branco com texto escuro, independente do tema salvo pelo usuário.
const INK = '#11162a'
const INK_75 = 'rgba(17,22,42,0.78)'
const INK_55 = 'rgba(17,22,42,0.55)'
const GOLD = '#a87f1f'

const SectionTitle = ({ children }) => (
  <h2
    style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.01em', color: INK }}
    className="text-xl sm:text-2xl mt-8 mb-3"
  >
    {children}
  </h2>
)

const P = ({ children }) => (
  <p className="text-sm sm:text-[15px] leading-relaxed mb-3" style={{ color: INK_75 }}>{children}</p>
)

const Item = ({ children }) => (
  <li className="text-sm sm:text-[15px] leading-relaxed mb-1.5" style={{ color: INK_75 }}>{children}</li>
)

const B = ({ children }) => <strong style={{ color: INK, fontWeight: 600 }}>{children}</strong>

// Página dedicada à exclusão de conta — exigida pela Google Play
// (link público que descreve as etapas e os dados afetados).
export default function DeleteAccount() {
  return (
    <div className="min-h-screen" style={{ background: '#f5f4ef' }}>
      <div className="w-full max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs transition mb-6 hover:opacity-70"
          style={{ color: INK_55 }}
        >
          <ArrowLeft size={14} /> Voltar
        </Link>

        <div className="flex items-center gap-2 text-xs uppercase mb-3" style={{ letterSpacing: '0.25em', color: GOLD }}>
          <Trash2 size={12} />
          Exclusão de conta
        </div>
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em', color: INK }}
          className="text-3xl sm:text-4xl mb-2"
        >
          Como excluir sua conta do Domus
        </h1>
        <p className="text-sm" style={{ color: INK_55 }}>
          Domus — Mordomo Financeiro · desenvolvido por Guilherme Esteves (Alquimia Digital)
        </p>

        <SectionTitle>Excluir pelo aplicativo (recomendado)</SectionTitle>
        <P>
          Você pode excluir sua conta e todos os dados a qualquer momento, direto no app, em poucos toques:
        </P>
        <ol className="list-decimal pl-5 mb-3">
          <Item>Abra o app <B>Domus</B> e faça login</Item>
          <Item>Toque em <B>Ajustes</B> (ícone de engrenagem, no menu inferior)</Item>
          <Item>Role até o final, na seção <B>"Zona de perigo"</B></Item>
          <Item>Toque em <B>"Excluir minha conta"</B></Item>
          <Item>Digite <B>EXCLUIR</B> para confirmar e conclua</Item>
        </ol>
        <P>
          A exclusão é imediata e <B>não pode ser desfeita</B>.
        </P>

        <SectionTitle>Excluir por e-mail</SectionTitle>
        <P>
          Se você não tiver mais acesso ao app, envie um e-mail solicitando a exclusão a partir do
          mesmo endereço cadastrado na sua conta. Concluímos a exclusão em até 7 dias.
        </P>
        <P>
          <B>E-mail:</B>{' '}
          <a href="mailto:alquimiadigital08@gmail.com" style={{ color: GOLD }} className="hover:underline">
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
          A exclusão feita pelo app é <B>imediata</B>. Solicitações por e-mail são concluídas em até <B>7 dias</B>.
        </P>

        <div className="mt-12 pt-6 text-xs" style={{ borderTop: '1px solid rgba(17,22,42,0.1)', color: INK_55 }}>
          Para mais detalhes sobre o tratamento dos seus dados, veja a{' '}
          <Link to="/privacidade" style={{ color: INK }} className="underline underline-offset-2 hover:opacity-70">
            Política de Privacidade
          </Link>.
        </div>
      </div>
    </div>
  )
}
