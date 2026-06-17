import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, PlayCircle, Sparkles, Rocket, MessageCircle, CreditCard,
  Target, Coins, Settings, Lightbulb, Clock, Crown, Wallet, Calendar,
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

// Vídeos hospedados no Supabase Storage (bucket público "tutorial").
// Pra adicionar/editar: suba o MP4 no bucket e ajuste o videoUrl abaixo.
const VIDEO_BASE = 'https://rtiehvkvbjblaulyupkv.supabase.co/storage/v1/object/public/tutorial'

const TUTORIAL_SECTIONS = [
  {
    title: 'Finanças',
    app: 'financas',
    icon: Wallet,
    accent: '#10b981',
    items: [
      { title: 'Configurações iniciais', description: 'Comece por aqui: ajuste o essencial pra deixar o app com a sua cara.', videoUrl: `${VIDEO_BASE}/financas-aula-1.mp4` },
      { title: 'Entradas', description: 'Como registrar suas receitas e manter o mês no azul.', videoUrl: `${VIDEO_BASE}/financas-aula-2.mp4` },
      { title: 'Gastos', description: 'Lançando despesas — no app e pelo Alfred, parcelados e fixos.', videoUrl: `${VIDEO_BASE}/financas-aula-3.mp4` },
      { title: 'Atribuídos a terceiros', description: 'Comprou pra alguém? Marque como "a receber" e saiba quem te deve.', videoUrl: `${VIDEO_BASE}/financas-aula-4.mp4` },
      { title: 'Dança das categorias', description: 'Limites por categoria e como transferir saldo entre elas.', videoUrl: `${VIDEO_BASE}/financas-aula-5.mp4` },
      { title: 'Cofres', description: 'Crie cofres com metas e acompanhe seus objetivos visualmente.', videoUrl: `${VIDEO_BASE}/financas-aula-6.mp4` },
    ],
  },
  {
    title: 'Agenda',
    app: 'agenda',
    icon: Calendar,
    accent: '#06b6d4',
    items: [
      { title: 'Como cadastrar compromissos', description: 'O básico pra anotar e organizar seus compromissos.', videoUrl: `${VIDEO_BASE}/agenda-aula-1.mp4` },
      { title: 'Cronograma semanal e mensal', description: 'Visões de semana e mês pra enxergar tudo de uma vez.', videoUrl: `${VIDEO_BASE}/agenda-aula-2.mp4` },
      { title: 'Tarefas, projetos e configurações', description: 'Organize tarefas e projetos, e ajuste a agenda do seu jeito.', videoUrl: `${VIDEO_BASE}/agenda-aula-3.mp4` },
      { title: 'Como usar o Alfred', description: 'Marque compromissos e receba lembretes pelo WhatsApp com o Alfred.', videoUrl: `${VIDEO_BASE}/agenda-aula-4.mp4` },
    ],
  },
]

export default function Tutorial() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [openVideo, setOpenVideo] = useState(null)

  // Cada app abre só o SEU tutorial via ?app=financas | agenda. Sem param, mostra tudo.
  const appFilter = searchParams.get('app')
  const sections = appFilter ? TUTORIAL_SECTIONS.filter((s) => s.app === appFilter) : TUTORIAL_SECTIONS

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0))' }}>

        {/* Voltar */}
        <button
          onClick={() => navigate(appFilter === 'agenda' ? '/agenda' : '/app')}
          className="flex items-center gap-2 text-sm mb-6 transition hover:opacity-80"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft size={16} /> Voltar{appFilter === 'agenda' ? ' pra agenda' : ' pro painel'}
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
          {sections.map((section, sIdx) => {
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
  const videoRef = useRef(null)
  const [rate, setRate] = useState(1)
  const SPEEDS = [1, 1.5, 2]
  const changeSpeed = (r) => {
    setRate(r)
    if (videoRef.current) videoRef.current.playbackRate = r
  }
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
            ref={videoRef}
            src={video.videoUrl}
            title={video.title}
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={() => { if (videoRef.current) videoRef.current.playbackRate = rate }}
            className="w-full h-full"
            style={{ objectFit: 'cover' }}
          />
        </div>

        {/* Velocidade — fácil de achar, um toque */}
        <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Velocidade</span>
          <div className="flex gap-1.5">
            {SPEEDS.map((s) => {
              const active = rate === s
              return (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                  style={{
                    background: active ? 'var(--accent-gold)' : 'var(--bg-elev2)',
                    color: active ? '#070912' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'var(--accent-gold)' : 'var(--border-soft)'}`,
                  }}
                >
                  {String(s).replace('.', ',')}x
                </button>
              )
            })}
          </div>
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
