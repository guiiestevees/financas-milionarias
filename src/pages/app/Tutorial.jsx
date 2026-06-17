import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, PlayCircle, Sparkles, Rocket, MessageCircle, CreditCard,
  Target, Coins, Settings, Lightbulb, Clock, Crown,
} from 'lucide-react'

// ===========================================================================
// Página de TUTORIAL — acessada pelo botão "Como usar" no Painel.
//
// Estrutura: seções temáticas, cada uma com vários "vídeos" (cards).
// Cada vídeo pode ter:
//   - videoUrl (YouTube/Vimeo embed) — quando você fizer upload
//   - thumb (opcional) — imagem de capa
//   - duration (label)
//   - description
//
// Por enquanto os vídeos são placeholders. Você só precisa atualizar
// o array TUTORIAL_SECTIONS abaixo conforme for produzindo os vídeos.
// ===========================================================================

// 👇 PRA ADICIONAR UM VÍDEO REAL DEPOIS:
// 1. Faça upload no YouTube (privado/não-listado se quiser)
// 2. Pegue o embed URL: https://www.youtube.com/embed/VIDEO_ID
// 3. Cole no campo videoUrl do item correspondente
// 4. Atualize duration com o tempo real
const TUTORIAL_SECTIONS = [
  {
    title: 'Primeiros passos',
    icon: Rocket,
    accent: '#10b981',
    items: [
      {
        title: 'Boas-vindas ao Domus',
        duration: 'Em breve',
        description: 'Um tour rápido pelas principais áreas do app — Painel, Gastos, Cofres e Configurações.',
        videoUrl: null,
      },
      {
        title: 'Cadastrando seus cartões',
        duration: 'Em breve',
        description: 'Como adicionar seus cartões de crédito com data de vencimento pra organização automática.',
        videoUrl: null,
      },
      {
        title: 'Criando categorias com limite',
        duration: 'Em breve',
        description: 'Por que categorias com limite vão pro topo do painel e como definir seus limites mensais.',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Alfred no WhatsApp',
    icon: MessageCircle,
    accent: '#25D366',
    items: [
      {
        title: 'Vinculando seu WhatsApp ao Alfred',
        duration: 'Em breve',
        description: 'Como salvar o contato do Alfred e começar a usar pelo seu WhatsApp.',
        videoUrl: null,
      },
      {
        title: 'Lançando gastos por mensagem',
        duration: 'Em breve',
        description: 'Exemplos práticos de como mandar mensagens que o Alfred entende.',
        videoUrl: null,
      },
      {
        title: 'Mandando por áudio',
        duration: 'Em breve',
        description: 'Grave um áudio falando o que comprou — o Alfred transcreve e classifica.',
        videoUrl: null,
      },
      {
        title: 'Consultando seu painel pelo WhatsApp',
        duration: 'Em breve',
        description: '"Quanto sobra esse mês?", "Quanto gastei no mercado?" — pergunte ao Alfred.',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Gastos do dia a dia',
    icon: CreditCard,
    accent: '#a78bfa',
    items: [
      {
        title: 'Lançando um gasto manualmente',
        duration: 'Em breve',
        description: 'Direto no app, sem o Alfred — quando preferir digitar tudo de uma vez.',
        videoUrl: null,
      },
      {
        title: 'Parcelados — como cadastrar',
        duration: 'Em breve',
        description: 'Marcou "10x de R$ 200"? O Domus cria todas as parcelas automaticamente.',
        videoUrl: null,
      },
      {
        title: 'Gastos fixos (Netflix, aluguel, etc)',
        duration: 'Em breve',
        description: 'Cadastre uma vez e ele aparece todo mês automaticamente.',
        videoUrl: null,
      },
      {
        title: 'Apagando gastos — só esse mês ou pra sempre',
        duration: 'Em breve',
        description: 'A diferença entre apagar um gasto fixo só de um mês ou permanente.',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Categorias e Orçamento',
    icon: Target,
    accent: '#f43f5e',
    items: [
      {
        title: 'Limite mensal vs. categoria simples',
        duration: 'Em breve',
        description: 'Diferença entre categorias que aparecem no topo (com limite) e as que só agrupam.',
        videoUrl: null,
      },
      {
        title: 'Transferindo saldo entre categorias',
        duration: 'Em breve',
        description: 'Sobrou no Mercado e faltou em Lazer? Mova o orçamento sem perder o controle.',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Cofres e Metas',
    icon: Coins,
    accent: '#06b6d4',
    items: [
      {
        title: 'Criando um cofre com meta',
        duration: 'Em breve',
        description: 'Reserva de emergência, casamento, viagem — defina o alvo e acompanhe.',
        videoUrl: null,
      },
      {
        title: 'Movimentando dinheiro entre cofres',
        duration: 'Em breve',
        description: 'Transferências, entradas, saídas — como movimentar dentro dos cofres.',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Assinatura e Conta',
    icon: Crown,
    accent: '#d4af37',
    items: [
      {
        title: 'Mudando o método de pagamento',
        duration: 'Em breve',
        description: 'Como trocar de PIX pra cartão (ou vice-versa) sem perder o acesso.',
        videoUrl: null,
      },
      {
        title: 'Cancelando ou reativando assinatura',
        duration: 'Em breve',
        description: 'Como cancelar pelo app — você mantém acesso até o fim do período já pago.',
        videoUrl: null,
      },
    ],
  },
  {
    title: 'Dicas avançadas',
    icon: Lightbulb,
    accent: '#f59e0b',
    items: [
      {
        title: 'Gastos compartilhados com terceiros',
        duration: 'Em breve',
        description: 'Comprou pra outra pessoa? Marque como "a receber" e acompanhe quem deve.',
        videoUrl: null,
      },
      {
        title: 'Recuperando acesso (esqueci a senha)',
        duration: 'Em breve',
        description: 'Como entrar usando CPF ou celular quando esquecer o email/senha.',
        videoUrl: null,
      },
    ],
  },
]

export default function Tutorial() {
  const navigate = useNavigate()
  const [openVideo, setOpenVideo] = useState(null)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0))' }}>

        {/* Voltar */}
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 text-sm mb-6 transition hover:opacity-80"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft size={16} /> Voltar pro painel
        </button>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--accent-gold)' }}>
            <PlayCircle size={28} />
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.01em' }} className="text-3xl sm:text-4xl mb-2">
            Como usar o{' '}
            <em style={{ fontStyle: 'italic', background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Domus
            </em>
          </h1>
          <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: 'var(--text-tertiary)' }}>
            🎩 Vídeos curtos e diretos pra você dominar o app em poucos minutos. Sem enrolação.
          </p>
        </div>

        {/* Seções */}
        <div className="space-y-8">
          {TUTORIAL_SECTIONS.map((section, sIdx) => {
            const SectionIcon = section.icon
            // Só mostra itens COM vídeo — e some com a seção inteira se não tiver
            // nenhum (sem cards "Em breve"/placeholder).
            const items = section.items.filter((i) => i.videoUrl)
            if (items.length === 0) return null
            return (
              <section key={sIdx}>
                {/* Título da seção */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-2.5 rounded-xl shrink-0"
                    style={{ background: `${section.accent}15`, color: section.accent }}
                  >
                    <SectionIcon size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl sm:text-2xl">
                      {section.title}
                    </h2>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {items.length} {items.length === 1 ? 'vídeo' : 'vídeos'}
                    </div>
                  </div>
                </div>

                {/* Cards dos vídeos */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {items.map((item, iIdx) => {
                    const hasVideo = !!item.videoUrl
                    return (
                      <button
                        key={iIdx}
                        onClick={() => hasVideo && setOpenVideo({ ...item, sectionTitle: section.title })}
                        disabled={!hasVideo}
                        className="text-left rounded-2xl overflow-hidden transition group disabled:cursor-default"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          opacity: hasVideo ? 1 : 0.7,
                        }}
                      >
                        {/* Thumb / placeholder */}
                        <div
                          className="aspect-video flex items-center justify-center relative"
                          style={{
                            background: `linear-gradient(135deg, ${section.accent}18, ${section.accent}05)`,
                            borderBottom: '1px solid var(--border-soft)',
                          }}
                        >
                          {hasVideo ? (
                            <div className="rounded-full p-3 transition group-hover:scale-110"
                              style={{ background: section.accent, color: '#fff' }}>
                              <PlayCircle size={28} />
                            </div>
                          ) : (
                            <div className="text-center px-4">
                              <Clock size={24} className="mx-auto mb-1.5" style={{ color: section.accent, opacity: 0.7 }} />
                              <div className="text-xs uppercase tracking-widest font-medium" style={{ color: section.accent }}>
                                Em breve
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h3 className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                              {item.title}
                            </h3>
                            {item.duration && hasVideo && (
                              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                                style={{ background: 'var(--bg-elev2)', color: 'var(--text-muted)' }}>
                                {item.duration}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        {/* Final — pedido de feedback */}
        <div className="mt-12 rounded-2xl p-6 text-center"
          style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
          <Sparkles size={20} className="mx-auto mb-3" style={{ color: 'var(--accent-gold)' }} />
          <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg mb-1">
            Não achou o que procurava?
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Mande sua dúvida pra <strong style={{ color: 'var(--text-primary)' }}>alquimiadigital08@gmail.com</strong> — ela pode virar o próximo vídeo.
          </p>
        </div>
      </div>

      {/* Modal de vídeo */}
      {openVideo && (
        <VideoModal video={openVideo} onClose={() => setOpenVideo(null)} />
      )}
    </div>
  )
}

// ---------- VideoModal ----------
function VideoModal({ video, onClose }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(7,9,18,0.8)', backdropFilter: 'blur(8px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl overflow-hidden w-full max-w-[380px]"
        style={{ background: 'var(--bg-app-soft)', border: '1px solid var(--border-medium)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {video.sectionTitle}
            </div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--text-primary)' }} className="text-lg truncate">
              {video.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm transition hover:opacity-80"
            style={{ background: 'var(--bg-elev2)', color: 'var(--text-secondary)' }}
          >
            Fechar
          </button>
        </div>

        {/* Vídeo vertical (9:16) — nativo, sem marca de terceiro */}
        <div className="bg-black w-full" style={{ aspectRatio: '9 / 16' }}>
          <video
            src={video.videoUrl}
            title={video.title}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full"
            style={{ objectFit: 'cover' }}
          />
        </div>

        {video.description && (
          <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {video.description}
          </div>
        )}
      </div>
    </div>
  )
}
