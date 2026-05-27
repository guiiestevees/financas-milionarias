import { Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

const SectionTitle = ({ children }) => (
  <h2
    style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.01em' }}
    className="text-xl sm:text-2xl text-white mt-8 mb-3"
  >
    {children}
  </h2>
)

const P = ({ children }) => (
  <p className="text-sm sm:text-[15px] text-white/70 leading-relaxed mb-3">{children}</p>
)

const Item = ({ children }) => (
  <li className="text-sm sm:text-[15px] text-white/70 leading-relaxed mb-1.5">{children}</li>
)

export default function PrivacyPolicy() {
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
          <Sparkles size={12} />
          Política
        </div>
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-3xl sm:text-4xl text-white mb-2"
        >
          Política de Privacidade
        </h1>
        <p className="text-sm text-white/45">Última atualização: 09 de maio de 2026</p>

        <SectionTitle>1. Quem somos</SectionTitle>
        <P>
          O <strong className="text-white/90">Domus</strong> é um aplicativo de gestão financeira pessoal.
          Esta política descreve como tratamos seus dados pessoais, em conformidade com a Lei Geral de
          Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </P>

        <SectionTitle>2. Quais dados coletamos</SectionTitle>
        <P>Coletamos apenas o necessário para o app funcionar:</P>
        <ul className="list-disc pl-5 mb-3">
          <Item><strong className="text-white/85">Identificação:</strong> e-mail e senha (a senha é criptografada e nunca armazenada em texto puro).</Item>
          <Item><strong className="text-white/85">Dados financeiros pessoais:</strong> receitas, despesas, categorias, orçamentos, cartões, cofres e demais informações que você registra voluntariamente no app.</Item>
          <Item><strong className="text-white/85">Dados técnicos:</strong> data e hora do último acesso, dados de sessão.</Item>
        </ul>
        <P>
          <strong className="text-white/90">Não coletamos</strong> dados bancários reais, números de cartão de crédito completos,
          documentos de identidade, dados de geolocalização ou qualquer informação sensível além das que
          você informar nos campos do app.
        </P>

        <SectionTitle>3. Para que usamos seus dados</SectionTitle>
        <P>Seus dados são usados exclusivamente para:</P>
        <ul className="list-disc pl-5 mb-3">
          <Item>Permitir o seu acesso ao app (autenticação)</Item>
          <Item>Armazenar e sincronizar suas informações financeiras entre seus dispositivos</Item>
          <Item>Calcular as métricas, gráficos e relatórios exibidos no app</Item>
          <Item>Atender solicitações de exclusão, exportação ou correção de dados</Item>
        </ul>
        <P>
          <strong className="text-white/90">Não vendemos, alugamos nem compartilhamos seus dados</strong> com terceiros para fins
          de marketing. Não treinamos modelos de inteligência artificial com seus dados.
        </P>

        <SectionTitle>4. Onde seus dados ficam armazenados</SectionTitle>
        <P>
          Os dados são armazenados em servidores da <strong className="text-white/85">Supabase</strong> (provedor de infraestrutura
          em nuvem com criptografia em repouso e em trânsito). A Supabase atua como operadora de
          tratamento, sob nossas instruções, conforme art. 39 da LGPD.
        </P>

        <SectionTitle>5. Por quanto tempo guardamos</SectionTitle>
        <P>
          Mantemos seus dados enquanto sua conta estiver ativa. Quando você solicita a exclusão da conta,
          todos os dados associados são apagados de forma permanente em até 30 dias, exceto registros que
          devamos manter por obrigação legal.
        </P>

        <SectionTitle>6. Seus direitos como titular</SectionTitle>
        <P>De acordo com a LGPD, você pode, a qualquer momento:</P>
        <ul className="list-disc pl-5 mb-3">
          <Item><strong className="text-white/85">Acessar</strong> os dados que temos sobre você</Item>
          <Item><strong className="text-white/85">Corrigir</strong> dados incorretos ou desatualizados</Item>
          <Item><strong className="text-white/85">Exportar</strong> seus dados em formato legível (JSON ou planilha)</Item>
          <Item><strong className="text-white/85">Excluir</strong> sua conta e todos os dados associados — disponível em Configurações dentro do app</Item>
          <Item><strong className="text-white/85">Revogar consentimento</strong> a qualquer momento, com efeitos futuros</Item>
        </ul>

        <SectionTitle>7. Segurança</SectionTitle>
        <P>Adotamos medidas técnicas e administrativas para proteger seus dados:</P>
        <ul className="list-disc pl-5 mb-3">
          <Item>Conexão sempre via HTTPS (TLS)</Item>
          <Item>Senhas armazenadas com hash criptográfico (bcrypt)</Item>
          <Item>Isolamento entre usuários por Row Level Security (cada conta só acessa seus próprios dados)</Item>
          <Item>Backups automáticos diários, com retenção segura</Item>
        </ul>

        <SectionTitle>8. Crianças e adolescentes</SectionTitle>
        <P>
          O app é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de crianças
          ou adolescentes. Se isso acontecer, entre em contato para remoção imediata.
        </P>

        <SectionTitle>9. Cookies e tecnologias similares</SectionTitle>
        <P>
          Usamos apenas cookies estritamente necessários para manter sua sessão ativa
          (tokens de autenticação). Não usamos cookies de rastreamento, análise de
          terceiros ou publicidade.
        </P>

        <SectionTitle>10. Alterações nesta política</SectionTitle>
        <P>
          Esta política pode ser atualizada eventualmente. Mudanças significativas serão comunicadas por
          e-mail ou destacadas dentro do app antes de entrar em vigor. A data no topo desta página indica
          quando foi a última revisão.
        </P>

        <SectionTitle>11. Contato</SectionTitle>
        <P>
          Para qualquer dúvida, solicitação ou exercício dos seus direitos como titular, fale com
          o encarregado de dados pelo e-mail abaixo. Respondemos em até 15 dias úteis.
        </P>
        <P>
          <strong className="text-white/90">E-mail:</strong>{' '}
          <a href="mailto:contato@financasmilionarias.com.br" className="text-amber-300 hover:underline">
            contato@financasmilionarias.com.br
          </a>
        </P>

        <div className="mt-12 pt-6 border-t border-white/5 text-xs text-white/35">
          Esta política é redigida em conformidade com a LGPD (Lei nº 13.709/2018).
        </div>
      </div>
    </div>
  )
}
