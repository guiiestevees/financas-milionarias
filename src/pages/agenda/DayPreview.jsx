import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, MapPin, Bell, ArrowLeft, Coffee, Briefcase, Heart, Sun, Sunset, Moon,
  Sparkles, Plus,
} from 'lucide-react'

// =============================================================================
// PREVIEW DAS 3 OPÇÕES DE VISUALIZAÇÃO DO DIA
// Acessar em: /agenda-preview
// =============================================================================

const AGENDA_ACCENT = '#06b6d4'

// Mock de eventos do dia
const MOCK_EVENTS = [
  { id: '1', title: 'Café com Ana', time: '09:00', end_time: '10:00', color: 'amber', icon: '☕', location: null },
  { id: '2', title: 'Consulta médica', time: '10:30', end_time: '12:00', color: 'emerald', icon: '🏥', location: 'Hospital São Luiz' },
  { id: '3', title: 'Reunião com cliente', time: '14:00', end_time: '16:00', color: 'cyan', icon: '💼', location: 'Sala A', reminder: 15 },
  { id: '4', title: 'Jantar com família', time: '20:00', end_time: '22:00', color: 'rose', icon: '🍽', location: null },
]

const NOW_TIME = '13:32'  // mockado pra mostrar o "agora"
const NOW_HOURS = 13 + 32 / 60

export default function DayPreview() {
  const navigate = useNavigate()
  const [variant, setVariant] = useState('stream')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      {/* Header */}
      <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm transition hover:opacity-70 mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: AGENDA_ACCENT, fontWeight: 600 }}>
            Preview · Visualização do Dia
          </div>
          <h1
            style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
            className="text-3xl mt-1"
          >
            Escolha o estilo
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Toque nas abas pra comparar. Os eventos são mockados — sem alterar sua agenda real.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-2xl mb-4"
          style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
        >
          <TabBtn active={variant === 'stream'} onClick={() => setVariant('stream')}>
            Stream com gaps
          </TabBtn>
          <TabBtn active={variant === 'periods'} onClick={() => setVariant('periods')}>
            Períodos
          </TabBtn>
          <TabBtn active={variant === 'focus'} onClick={() => setVariant('focus')}>
            Foco no agora
          </TabBtn>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pb-20">
        {variant === 'stream' && <StreamWithGaps />}
        {variant === 'periods' && <PeriodsOfDay />}
        {variant === 'focus' && <FocusNowList />}
      </main>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition"
      style={{
        background: active ? AGENDA_ACCENT : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  )
}

// ============================================================================
// OPÇÃO 1 — STREAM COM GAPS
// ============================================================================
function StreamWithGaps() {
  // Calcula gaps entre eventos
  const items = []
  for (let i = 0; i < MOCK_EVENTS.length; i++) {
    items.push({ type: 'event', event: MOCK_EVENTS[i] })
    if (i < MOCK_EVENTS.length - 1) {
      const cur = MOCK_EVENTS[i]
      const next = MOCK_EVENTS[i + 1]
      const gapMins = timeToMinutes(next.time) - timeToMinutes(cur.end_time)
      if (gapMins > 0) {
        items.push({ type: 'gap', mins: gapMins, from: cur.end_time, to: next.time })
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Header com resumo */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, rgba(6,182,212,0.10), rgba(6,182,212,0.18))`,
          border: '1px solid rgba(6,182,212,0.30)',
        }}
      >
        <div className="text-3xl">🎩</div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: AGENDA_ACCENT, fontWeight: 600 }}>
            Hoje · 4 compromissos · 6h ocupadas
          </div>
          <div className="text-sm mt-1 font-medium" style={{ color: 'var(--text-primary)' }}>
            Próximo: Reunião com cliente em <span style={{ color: AGENDA_ACCENT, fontWeight: 700 }}>28 min</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition"
        style={{ background: AGENDA_ACCENT, color: '#fff', boxShadow: '0 8px 20px rgba(6,182,212,0.30)' }}
      >
        <Plus size={18} strokeWidth={2.5} />
        Adicionar compromisso
      </button>

      {/* Stream cronológica */}
      <div className="space-y-1">
        {items.map((item, i) => (
          item.type === 'event'
            ? <StreamEventCard key={i} event={item.event} />
            : <GapDivider key={i} mins={item.mins} from={item.from} to={item.to} showNow={NOW_HOURS >= timeToHours(item.from) && NOW_HOURS < timeToHours(item.to)} />
        ))}
      </div>
    </div>
  )
}

function StreamEventCard({ event }) {
  const colorVar = `var(--accent-${event.color})`
  const tintBg = getTint(event.color, 0.08)
  const tintBorder = getTint(event.color, 0.30)
  const dur = formatDuration(timeToMinutes(event.end_time) - timeToMinutes(event.time))

  return (
    <div className="flex gap-3">
      {/* Coluna de horas */}
      <div className="flex flex-col items-end shrink-0" style={{ width: 56 }}>
        <div
          className="text-base font-bold tabular-nums"
          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}
        >
          {event.time}
        </div>
        <div className="flex-1 my-1" style={{ width: 2, background: colorVar, opacity: 0.4, minHeight: 16 }} />
        <div
          className="text-xs tabular-nums"
          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}
        >
          {event.end_time}
        </div>
      </div>

      {/* Card do evento */}
      <button
        className="flex-1 rounded-2xl p-4 text-left transition hover:scale-[1.01] active:scale-[0.99]"
        style={{
          background: tintBg,
          border: `1px solid ${tintBorder}`,
          borderLeft: `4px solid ${colorVar}`,
        }}
      >
        <div className="flex items-start gap-3 mb-2">
          <span className="text-2xl shrink-0">{event.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              {event.title}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Duração · <span style={{ color: colorVar, fontWeight: 600 }}>{dur}</span>
            </div>
          </div>
        </div>
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <MapPin size={11} style={{ color: colorVar }} /> {event.location}
          </div>
        )}
        {event.reminder && (
          <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            <Bell size={11} style={{ color: colorVar }} /> Aviso {event.reminder} min antes
          </div>
        )}
      </button>
    </div>
  )
}

function GapDivider({ mins, from, to, showNow }) {
  return (
    <div className="ml-[56px] pl-3 py-1">
      {showNow && (
        <div className="flex items-center gap-2 mb-2 py-1.5 px-3 rounded-full"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
          <div className="text-xs font-semibold" style={{ color: '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
            AGORA · {NOW_TIME}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
        <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-muted)', background: 'var(--bg-elev2)' }}>
          {formatDuration(mins)} livre{mins > 60 ? 's' : ''}
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
      </div>
    </div>
  )
}

// ============================================================================
// OPÇÃO 2 — PERÍODOS DO DIA
// ============================================================================
function PeriodsOfDay() {
  const morning = MOCK_EVENTS.filter((e) => timeToHours(e.time) < 12)
  const afternoon = MOCK_EVENTS.filter((e) => timeToHours(e.time) >= 12 && timeToHours(e.time) < 18)
  const evening = MOCK_EVENTS.filter((e) => timeToHours(e.time) >= 18)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
      >
        <div className="text-[10px] uppercase tracking-widest" style={{ color: AGENDA_ACCENT, fontWeight: 600 }}>
          🎩 Hoje · sábado, 1 de junho
        </div>
        <div className="text-sm mt-1.5" style={{ color: 'var(--text-primary)' }}>
          4 compromissos espalhados pelo dia
        </div>
      </div>

      {/* CTA */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition"
        style={{ background: AGENDA_ACCENT, color: '#fff', boxShadow: '0 8px 20px rgba(6,182,212,0.30)' }}
      >
        <Plus size={18} strokeWidth={2.5} />
        Adicionar compromisso
      </button>

      <PeriodCard
        icon={<Sun size={18} />}
        label="Manhã"
        gradient="linear-gradient(135deg, rgba(251,191,36,0.10), rgba(249,115,22,0.08))"
        borderColor="rgba(251,191,36,0.30)"
        accentColor="#f59e0b"
        events={morning}
      />
      <PeriodCard
        icon={<Sunset size={18} />}
        label="Tarde"
        gradient="linear-gradient(135deg, rgba(244,63,94,0.08), rgba(217,70,239,0.06))"
        borderColor="rgba(244,63,94,0.25)"
        accentColor="#f43f5e"
        events={afternoon}
        isNow={true}
      />
      <PeriodCard
        icon={<Moon size={18} />}
        label="Noite"
        gradient="linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.10))"
        borderColor="rgba(139,92,246,0.25)"
        accentColor="#8b5cf6"
        events={evening}
      />
    </div>
  )
}

function PeriodCard({ icon, label, gradient, borderColor, accentColor, events, isNow }) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: gradient, border: `1px solid ${borderColor}` }}
    >
      {/* Header do período */}
      <div className="px-5 py-3 flex items-center justify-between gap-3"
        style={{ borderBottom: events.length > 0 ? `1px solid ${borderColor}` : 'none' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: accentColor, color: '#fff' }}
          >
            {icon}
          </div>
          <div>
            <div className="font-semibold text-base" style={{ color: 'var(--text-primary)', fontFamily: 'Fraunces, serif' }}>
              {label}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {events.length === 0 ? 'Livre' : `${events.length} ${events.length === 1 ? 'evento' : 'eventos'}`}
              {isNow && <span className="ml-2 font-bold" style={{ color: '#ef4444' }}>● AGORA</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Eventos */}
      {events.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          🌿 Tempo livre — aproveite
        </div>
      ) : (
        <div className="px-3 py-2 space-y-1">
          {events.map((ev) => (
            <PeriodEventRow key={ev.id} event={ev} accentColor={accentColor} />
          ))}
        </div>
      )}
    </div>
  )
}

function PeriodEventRow({ event, accentColor }) {
  const colorVar = `var(--accent-${event.color})`
  const dur = formatDuration(timeToMinutes(event.end_time) - timeToMinutes(event.time))
  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition hover:bg-white/10"
    >
      <span className="text-xl">{event.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          {event.title}
        </div>
        {event.location && (
          <div className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
            📍 {event.location}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
          {event.time}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {dur}
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// OPÇÃO 3 — FOCO NO AGORA + LISTA LIMPA
// ============================================================================
function FocusNowList() {
  // Próximo evento (no mock, é o das 14:00)
  const next = MOCK_EVENTS.find((e) => timeToHours(e.time) > NOW_HOURS)
  const later = MOCK_EVENTS.filter((e) => e.id !== next?.id && timeToHours(e.time) > NOW_HOURS)
  const past = MOCK_EVENTS.filter((e) => timeToHours(e.end_time) <= NOW_HOURS)

  return (
    <div className="space-y-4">
      {/* HERO — Próximo */}
      {next && <HeroNextCard event={next} />}

      {/* CTA */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition"
        style={{ background: AGENDA_ACCENT, color: '#fff', boxShadow: '0 8px 20px rgba(6,182,212,0.30)' }}
      >
        <Plus size={18} strokeWidth={2.5} />
        Adicionar compromisso
      </button>

      {/* Mais tarde */}
      {later.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              Mais tarde hoje
            </div>
            <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {later.length} {later.length === 1 ? 'evento' : 'eventos'}
            </div>
          </div>
          <div className="space-y-2">
            {later.map((ev) => <LaterEventCard key={ev.id} event={ev} />)}
          </div>
        </div>
      )}

      {/* Já passou */}
      {past.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Concluído ✓
            </div>
            <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
          </div>
          <div className="space-y-1.5">
            {past.map((ev) => <PastEventCard key={ev.id} event={ev} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function HeroNextCard({ event }) {
  const colorVar = `var(--accent-${event.color})`
  const dur = formatDuration(timeToMinutes(event.end_time) - timeToMinutes(event.time))
  const minsUntil = Math.round((timeToMinutes(event.time) - (NOW_HOURS * 60)))
  const untilStr = minsUntil < 60 ? `em ${minsUntil} min` : `em ${Math.floor(minsUntil / 60)}h ${minsUntil % 60}min`

  return (
    <div
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${getTint(event.color, 0.18)}, ${getTint(event.color, 0.08)})`,
        border: `1px solid ${getTint(event.color, 0.35)}`,
      }}
    >
      {/* Glow decorativo */}
      <div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: colorVar }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ef4444' }} />
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: '#ef4444' }}>
            Próximo · {untilStr}
          </div>
        </div>

        <div className="flex items-start gap-3 mb-3">
          <span className="text-4xl">{event.icon}</span>
          <div className="flex-1">
            <h2
              style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--text-primary)' }}
              className="text-2xl leading-tight"
            >
              {event.title}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              Horário
            </div>
            <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
              {event.time}–{event.end_time}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {dur}
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.05)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              Onde
            </div>
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {event.location || '—'}
            </div>
          </div>
        </div>

        {event.reminder && (
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Bell size={12} style={{ color: colorVar }} />
            Você será avisado <strong>{event.reminder} min antes</strong>
          </div>
        )}
      </div>
    </div>
  )
}

function LaterEventCard({ event }) {
  const colorVar = `var(--accent-${event.color})`
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition hover:scale-[1.01]"
      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 text-xl"
        style={{ background: getTint(event.color, 0.15), border: `1px solid ${getTint(event.color, 0.30)}` }}
      >
        {event.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
          {event.title}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
          {event.time} · {formatDuration(timeToMinutes(event.end_time) - timeToMinutes(event.time))}
          {event.location && <span> · 📍 {event.location}</span>}
        </div>
      </div>
    </button>
  )
}

function PastEventCard({ event }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl opacity-50"
      style={{ background: 'var(--bg-elev2)' }}
    >
      <span className="text-lg">{event.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs line-through truncate" style={{ color: 'var(--text-secondary)' }}>
          {event.title}
        </div>
      </div>
      <div className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
        {event.time}
      </div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function timeToHours(t) {
  return timeToMinutes(t) / 60
}
function formatDuration(mins) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}
function getTint(colorKey, alpha) {
  const colors = {
    gold: '212,175,55', emerald: '16,185,129', rose: '244,63,94',
    amber: '245,158,11', cyan: '6,182,212', violet: '139,92,246',
    sky: '14,165,233', fuchsia: '217,70,239', lime: '132,204,22',
    orange: '249,115,22',
  }
  return `rgba(${colors[colorKey] || colors.cyan}, ${alpha})`
}
