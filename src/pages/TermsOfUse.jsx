import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

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

export default function TermsOfUse() {
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
          <FileText size={12} />
          Termos
        </div>
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-3xl sm:text-4xl text-white mb-2"
        >
          Termos de Uso
        </h1>
        <p className="text-sm text-white/45">Última atualização: 27 de maio de 2026</p>

        <SectionTitle>1. Aceitação dos termos</SectionTitle>
        <P>
          Ao criar uma conta ou utilizar o <strong className="text-white/90">Domus</strong>, você
          declara ter lido, entendido e concordado com estes Termos de Uso e com a nossa{' '}
          <Link to="/privacidade" className="text-amber-300/85 hover:text-amber-300 underline underline-offset-2">
            Política de Privacidade
          </Link>.
          Caso não concorde, não deve utilizar o serviço.
        </P>
        <P>
          O Domus é operado por <strong className="text-white/90">Alquimia Digital Ltda</strong>, pessoa jurídica
          de direito privado, inscrita sob CNPJ próprio, doravante denominada simplesmente "Domus".
        </P>

        <SectionTitle>2. Descrição do serviço</SectionTitle>
        <P>
          O Domus é um aplicativo de gestão financeira pessoal que oferece:
        </P>
        <ul className="pl-5 list-disc mb-3">
          <Item>Registro de receitas, despesas, parcelados e gastos fixos</Item>
          <Item>Controle de orçamentos mensais por categoria</Item>
          <Item>Gestão de cofres (reserva de dinheiro com metas)</Item>
          <Item>Atribuição de despesas a terceiros (controle de quem deve)</Item>
          <Item>Assistente conversacional <em>Alfred</em> via WhatsApp, com suporte a texto e áudio</Item>
          <Item>Relatórios e visualizações financeiras pessoais</Item>
        </ul>
        <P>
          O Domus <strong className="text-white/90">não</strong> é instituição financeira, não realiza
          transferências, não armazena dinheiro e não oferece consultoria de investimentos.
        </P>

        <SectionTitle>3. Cadastro e conta</SectionTitle>
        <P>
          Para utilizar o Domus, o usuário deve criar uma conta fornecendo: nome completo, e-mail
          válido, CPF, telefone celular e senha. O usuário declara que:
        </P>
        <ul className="pl-5 list-disc mb-3">
          <Item>Tem pelo menos 18 anos de idade ou está representado por seu responsável legal</Item>
          <Item>As informações fornecidas são verdadeiras, completas e atualizadas</Item>
          <Item>É responsável por manter a confidencialidade da senha</Item>
          <Item>É responsável por todas as atividades realizadas em sua conta</Item>
          <Item>Notificará o Domus imediatamente em caso de uso não autorizado</Item>
        </ul>

        <SectionTitle>4. Período de teste e assinatura</SectionTitle>
        <P>
          O Domus oferece, a seu critério, um período de teste gratuito ao novo usuário. As condições
          atuais do teste estão publicadas na página de assinatura no aplicativo.
        </P>
        <P>
          Para uso continuado após o período de teste, o usuário deve contratar um plano de assinatura.
          Os planos vigentes, valores e periodicidades estão disponíveis na página{' '}
          <strong className="text-white/90">"Assinar"</strong> dentro do aplicativo.
        </P>
        <P>
          A assinatura é renovada automaticamente conforme periodicidade contratada (mensal ou anual),
          até que o usuário cancele.
        </P>

        <SectionTitle>5. Pagamentos</SectionTitle>
        <P>
          Os pagamentos são processados pela <strong className="text-white/90">Asaas Pagamentos S.A.</strong>,
          conforme termos próprios desse parceiro. Aceitamos: cartão de crédito, PIX comum e PIX Automático.
        </P>
        <P>
          O Domus <strong className="text-white/90">não armazena</strong> dados do cartão de crédito.
          Esses dados são coletados e processados diretamente pelo gateway de pagamento.
        </P>
        <P>
          Caso a cobrança falhe (ex: cartão recusado ou expirado), o usuário será notificado por e-mail
          e/ou WhatsApp e terá <strong className="text-white/90">3 dias de tolerância</strong> para
          regularizar antes do bloqueio do acesso.
        </P>

        <SectionTitle>6. Cancelamento e reembolso</SectionTitle>
        <P>
          O usuário pode cancelar a assinatura a qualquer momento, sem multa, diretamente no aplicativo
          em <strong className="text-white/90">Configurações → Assinatura → Cancelar</strong>. Ao cancelar:
        </P>
        <ul className="pl-5 list-disc mb-3">
          <Item>Não serão feitas novas cobranças</Item>
          <Item>O acesso permanece liberado até o fim do período já pago</Item>
          <Item>Os dados continuam preservados; o usuário pode reativar a qualquer momento</Item>
        </ul>
        <P>
          <strong className="text-white/90">Direito de arrependimento (CDC):</strong> conforme o
          Código de Defesa do Consumidor (Art. 49), em caso de contratação à distância, o usuário tem
          até <strong className="text-white/90">7 (sete) dias corridos</strong> a contar do primeiro
          pagamento para solicitar reembolso integral, sem necessidade de justificativa. Solicitações
          devem ser enviadas para{' '}
          <a href="mailto:alquimiadigital08@gmail.com" className="text-amber-300/85 hover:text-amber-300 underline underline-offset-2">
            alquimiadigital08@gmail.com
          </a>{' '}
          com seu CPF e dados da cobrança.
        </P>

        <SectionTitle>7. Uso aceitável</SectionTitle>
        <P>
          Ao usar o Domus, o usuário se compromete a NÃO:
        </P>
        <ul className="pl-5 list-disc mb-3">
          <Item>Utilizar o serviço para fins ilícitos, fraudulentos ou que violem direitos de terceiros</Item>
          <Item>Tentar acessar contas alheias, áreas restritas ou bancos de dados do sistema</Item>
          <Item>Realizar engenharia reversa, descompilação ou copiar partes do software</Item>
          <Item>Enviar conteúdo malicioso, vírus ou tentar prejudicar a infraestrutura</Item>
          <Item>Revender, sublicenciar ou explorar comercialmente o serviço sem autorização</Item>
          <Item>Compartilhar acesso à conta com terceiros</Item>
          <Item>Usar bots automatizados que sobrecarreguem o sistema</Item>
        </ul>
        <P>
          O descumprimento pode resultar em suspensão ou encerramento da conta, sem reembolso e sem
          prejuízo das medidas legais cabíveis.
        </P>

        <SectionTitle>8. Inteligência artificial e Alfred</SectionTitle>
        <P>
          O Domus utiliza modelos de inteligência artificial (incluindo Claude da Anthropic e Whisper
          da OpenAI) para interpretar mensagens, transcrever áudios e responder perguntas via o
          assistente Alfred no WhatsApp.
        </P>
        <P>
          As respostas e classificações geradas pelo Alfred são <strong className="text-white/90">sugestões</strong>{' '}
          baseadas em modelos estatísticos e podem conter imprecisões. <strong className="text-white/90">É
          responsabilidade do usuário revisar e confirmar</strong> cada lançamento no aplicativo antes
          de salvar.
        </P>
        <P>
          O Domus não se responsabiliza por decisões financeiras tomadas com base nas respostas
          automáticas. As informações exibidas têm caráter meramente organizacional.
        </P>

        <SectionTitle>9. Propriedade intelectual</SectionTitle>
        <P>
          Todos os direitos sobre o software Domus, marca, logotipo, design, conteúdos e
          funcionalidades são de propriedade exclusiva da Alquimia Digital Ltda ou de seus licenciadores.
        </P>
        <P>
          O usuário recebe apenas uma licença limitada, não exclusiva, intransferível e revogável para
          utilizar o serviço enquanto a assinatura estiver ativa.
        </P>
        <P>
          Os dados pessoais e financeiros registrados pelo usuário permanecem de propriedade dele,
          conforme detalhado na Política de Privacidade.
        </P>

        <SectionTitle>10. Disponibilidade do serviço</SectionTitle>
        <P>
          O Domus se compromete a manter o serviço disponível com a maior estabilidade possível, mas
          não garante 100% de uptime. Eventuais paradas para manutenção, atualizações ou problemas
          técnicos podem ocorrer.
        </P>
        <P>
          Não nos responsabilizamos por interrupções decorrentes de:
        </P>
        <ul className="pl-5 list-disc mb-3">
          <Item>Indisponibilidade de provedores de infraestrutura (Vercel, Supabase, Asaas, Meta/WhatsApp, Anthropic, OpenAI)</Item>
          <Item>Falhas na conexão de internet do usuário</Item>
          <Item>Eventos de força maior (caso fortuito)</Item>
        </ul>

        <SectionTitle>11. Limitação de responsabilidade</SectionTitle>
        <P>
          Em nenhuma hipótese o Domus será responsabilizado por danos indiretos, lucros cessantes,
          perda de dados, perda de oportunidades ou outros danos decorrentes do uso ou impossibilidade
          de uso do serviço, mesmo que advertido sobre a possibilidade de tais danos.
        </P>
        <P>
          A responsabilidade total do Domus, em qualquer caso, fica limitada ao valor pago pelo usuário
          nos 12 (doze) meses anteriores ao evento que originou a reclamação.
        </P>

        <SectionTitle>12. Alterações nestes termos</SectionTitle>
        <P>
          O Domus pode atualizar estes Termos a qualquer momento. Quando houver mudanças relevantes,
          o usuário será notificado por e-mail e/ou WhatsApp com pelo menos 15 dias de antecedência.
        </P>
        <P>
          O uso continuado após a entrada em vigor das novas versões implica aceitação. Caso discorde,
          o usuário pode cancelar a assinatura nos termos do item 6.
        </P>

        <SectionTitle>13. Encerramento da conta</SectionTitle>
        <P>
          O usuário pode encerrar a conta a qualquer momento em{' '}
          <strong className="text-white/90">Configurações → Conta → Excluir conta</strong>. Ao
          excluir, todos os dados são removidos conforme prazo previsto na Política de Privacidade.
        </P>
        <P>
          O Domus pode encerrar contas que violem estes Termos, mediante aviso prévio quando possível.
        </P>

        <SectionTitle>14. Lei aplicável e foro</SectionTitle>
        <P>
          Estes Termos são regidos pelas leis da República Federativa do Brasil, especialmente pelo
          Código de Defesa do Consumidor (Lei 8.078/1990), Marco Civil da Internet (Lei 12.965/2014)
          e Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </P>
        <P>
          Fica eleito o foro do domicílio do usuário consumidor para dirimir quaisquer controvérsias,
          renunciando-se a qualquer outro, por mais privilegiado que seja.
        </P>

        <SectionTitle>15. Contato</SectionTitle>
        <P>
          Dúvidas, sugestões ou reclamações podem ser enviadas para:
        </P>
        <P>
          <strong className="text-white/90">E-mail:</strong>{' '}
          <a href="mailto:alquimiadigital08@gmail.com" className="text-amber-300/85 hover:text-amber-300 underline underline-offset-2">
            alquimiadigital08@gmail.com
          </a>
        </P>
        <P>
          <strong className="text-white/90">Razão social:</strong> Alquimia Digital Ltda
        </P>

        <div className="mt-12 pt-6 border-t border-white/5 text-xs text-white/35 leading-relaxed">
          🎩 Estes Termos foram redigidos em linguagem simples para que você possa entender de verdade
          o que tá acontecendo. Qualquer dúvida, fala com a gente.
        </div>
      </div>
    </div>
  )
}
