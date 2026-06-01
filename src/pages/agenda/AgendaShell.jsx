import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, CalendarRange, Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  LayoutGrid, Loader2, AlertCircle, MapPin, Repeat, Clock, ArrowLeft,
  ListChecks, Settings, Sun, Moon,
} from 'lucide-react'
import { useAgenda } from '../../hooks/useAgenda'
import { useTheme } from '../../hooks/useTheme'
import EventForm from './EventForm'
import {
  AGENDA_COLORS, todayISO, parseISODate, toISODate, formatDateLong,
  formatFriendlyDate, getEventsForDate, getEventsForRange, getStartOfWeek,
  getWeekDates, shiftDays, formatTime, formatTimeRange, isToday,
} from '../../lib/agendaUtils'

// ===========================================================================
// Agenda — compromissos, recorrência, visualização dia/semana/mês.
// Visual ciano (azul-esverdeado) — destaca como "outra área" do Domus.
// ===========================================================================

const AGENDA_ACCENT = '#06b6d4'  // ciano
const AGENDA_ACCENT_GRADIENT = 'linear-gradient(90deg,#67e8f9,#06b6d4,#0e7490)'

const TABS = [
  { id: 'day',           label: 'Dia',          icon: CalendarDays },
  { id: 'week',          label: 'Semana',       icon: CalendarRange },
  { id: 'month',         label: 'Mês',          icon: CalendarIcon },
  { id: 'list',          label: 'Compromissos', icon: ListChecks },
  { id: 'settings',      label: 'Ajustes',      icon: Settings },
]

export default function AgendaShell() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('day')
  const [refDate, setRefDate] = useState(todayISO())
  const [editing, setEditing] = useState(null)        // { event, occurrenceDate } | null
  const [creating, setCreating] = useState(null)      // { initialDate } | null

  const {
    events, loading, error,
    createEvent, updateEvent, deleteEvent,
    deleteOccurrence, deleteForever,
  } = useAgenda()

  // Eventos do dia atual (memoized)
  const dayEvents = useMemo(() => getEventsForDate(events, refDate), [events, refDate])
  const weekDates = useMemo(() => getWeekDates(refDate), [refDate])
  const weekEvents = useMemo(() => {
    const map = {}
    for (const d of weekDates) map[d] = getEventsForDate(events, d)
    return map
  }, [events, weekDates])

  const handleSave = async (payload) => {
    if (editing) {
      await updateEvent(editing.event.id, payload)
      setEditing(null)
    } else {
      await createEvent(payload)
      setCreating(null)
    }
  }

  const handleDelete = async (mode) => {
    if (!editing) return
    const { event, occurrenceDate } = editing
    if (event.recurring === 'none' || mode === 'forever') {
      if (event.recurring === 'none') await deleteEvent(event.id)
      else await deleteForever(event.id, occurrenceDate || event.date)
    } else {
      await deleteOccurrence(event.id, occurrenceDate)
    }
    setEditing(null)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>

      {/* Header próprio da Agenda — ciano */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-6 sm:pt-8 pb-4">
        <div className="flex items-center justify-between gap-3 mb-5">
          {/* Brand ciano */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: 'rgba(6,182,212,0.15)', color: AGENDA_ACCENT }}
            >
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <div style={{ letterSpacing: '0.2em', fontSize: '10px', fontWeight: 600, color: AGENDA_ACCENT }} className="uppercase">
                Domus · Agenda
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                {TABS.find((t) => t.id === tab)?.label}
                {tab !== 'settings' && tab !== 'list' && events.length > 0 && (
                  <span> · {events.length} {events.length === 1 ? 'compromisso' : 'compromissos'} cadastrado{events.length === 1 ? '' : 's'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Botão "Menu Domus" (volta pro launcher) — destaque ciano pra ficar óbvio */}
          <button
            onClick={() => navigate('/launcher')}
            title="Voltar ao menu de apps"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition hover:opacity-90 shrink-0"
            style={{
              background: 'rgba(6,182,212,0.12)',
              border: '1px solid rgba(6,182,212,0.35)',
              color: AGENDA_ACCENT,
            }}
          >
            <LayoutGrid size={15} />
            <span className="text-xs sm:text-sm font-semibold">Menu</span>
          </button>
        </div>

        {/* Título grande estilo Finanças, mas em ciano */}
        <h1
          style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
          className="text-4xl sm:text-5xl"
        >
          {tab === 'day' && (<>O dia <em style={titleEm}>de hoje.</em></>)}
          {tab === 'week' && (<>Sua <em style={titleEm}>semana.</em></>)}
          {tab === 'month' && (<>Seu <em style={titleEm}>mês.</em></>)}
          {tab === 'list' && (<>Todos os <em style={titleEm}>compromissos.</em></>)}
          {tab === 'settings' && (<>Ajustes da <em style={titleEm}>Agenda.</em></>)}
        </h1>
      </div>

      {/* Conteúdo */}
      <main
        className="flex-1 w-full max-w-4xl mx-auto px-4 pt-2"
        style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0))' }}
      >
        {/* Erro */}
        {error && (
          <div className="mb-4 rounded-lg p-3 text-sm flex items-start gap-2"
            style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div className="min-w-0">{error}</div>
          </div>
        )}

        {/* Loading inicial */}
        {loading && events.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 size={28} className="animate-spin mx-auto mb-2" style={{ color: AGENDA_ACCENT }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Carregando agenda…</p>
          </div>
        ) : (
          <>
            {(tab === 'day' || tab === 'week' || tab === 'month') && (
              <DateNav view={tab} refDate={refDate} setRefDate={setRefDate} onCreate={() => setCreating({ initialDate: refDate })} />
            )}

            {tab === 'day' && (
              <DayView
                events={dayEvents}
                onClickEvent={(occ) => setEditing(occ)}
                onCreate={(date) => setCreating({ initialDate: date })}
                date={refDate}
              />
            )}
            {tab === 'week' && (
              <WeekView
                weekDates={weekDates}
                weekEvents={weekEvents}
                onClickEvent={(occ) => setEditing(occ)}
                onCreate={(date) => setCreating({ initialDate: date })}
              />
            )}
            {tab === 'month' && (
              <MonthView
                events={events}
                refDate={refDate}
                setRefDate={setRefDate}
                setView={setTab}
              />
            )}
            {tab === 'list' && (
              <ListView
                events={events}
                onClickEvent={(occ) => setEditing(occ)}
                onCreate={() => setCreating({ initialDate: todayISO() })}
              />
            )}
            {tab === 'settings' && <SettingsView />}
          </>
        )}
      </main>

      {/* Bottom nav própria */}
      <AgendaBottomNav tab={tab} setTab={setTab} />

      {/* Modal — criar/editar */}
      {(creating || editing) && (
        <EventForm
          event={editing?.event}
          occurrenceDate={editing?.occurrenceDate}
          initialDate={creating?.initialDate}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setCreating(null); setEditing(null) }}
        />
      )}
    </div>
  )
}

const titleEm = {
  fontStyle: 'italic',
  background: AGENDA_ACCENT_GRADIENT,
  WebkitBackgroundClip: 'text',
  color: 'transparent',
}

// ============================================================
// BOTTOM NAV
// ============================================================
function AgendaBottomNav({ tab, setTab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'var(--bg-app-soft)',
        borderTop: '1px solid var(--border-soft)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div className="max-w-4xl mx-auto flex items-stretch">
        {TABS.map((it) => {
          const Icon = it.icon
          const active = tab === it.id
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3.5 sm:py-4 transition relative"
              style={{
                color: active ? AGENDA_ACCENT : 'var(--text-muted)',
                minHeight: 64,
              }}
            >
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full transition-all"
                  style={{ background: AGENDA_ACCENT }}
                />
              )}
              <Icon size={24} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] sm:text-[11px] font-medium" style={{ letterSpacing: '0.01em' }}>
                {it.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ============================================================
// DATE NAV — botões de navegação + criar
// ============================================================
function DateNav({ view, refDate, setRefDate, onCreate }) {
  const shift = view === 'day' ? 1 : view === 'week' ? 7 : 30
  const goPrev = () => setRefDate(shiftDays(refDate, -shift))
  const goNext = () => setRefDate(shiftDays(refDate, shift))
  const goToday = () => setRefDate(todayISO())

  let label = ''
  if (view === 'day') {
    label = formatDateLong(refDate)
  } else if (view === 'week') {
    const start = parseISODate(getStartOfWeek(refDate))
    const end = new Date(start); end.setDate(end.getDate() + 6)
    label = `${String(start.getDate()).padStart(2,'0')}/${String(start.getMonth()+1).padStart(2,'0')} – ${String(end.getDate()).padStart(2,'0')}/${String(end.getMonth()+1).padStart(2,'0')}`
  } else {
    const d = parseISODate(refDate)
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    label = `${months[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={goPrev}
        className="p-2 rounded-xl transition hover:opacity-80 shrink-0"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}
      >
        <ChevronLeft size={16} />
      </button>

      <div className="text-center flex-1 min-w-0">
        <div className="text-sm sm:text-base font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        {!isToday(refDate) && view === 'day' && (
          <button onClick={goToday} className="text-xs underline transition" style={{ color: AGENDA_ACCENT }}>
            Voltar pra hoje
          </button>
        )}
      </div>

      <button
        onClick={goNext}
        className="p-2 rounded-xl transition hover:opacity-80 shrink-0"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}
      >
        <ChevronRight size={16} />
      </button>

      <button
        onClick={onCreate}
        className="ml-1 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition shrink-0"
        style={{
          background: AGENDA_ACCENT,
          color: '#fff',
          boxShadow: '0 6px 16px rgba(6,182,212,0.25)',
        }}
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Novo</span>
      </button>
    </div>
  )
}

// ============================================================
// DAY VIEW
// ============================================================
function DayView({ events, onClickEvent, onCreate, date }) {
  if (events.length === 0) {
    return <EmptyState
      icon="📅"
      title={`Nada marcado pra ${isToday(date) ? 'hoje' : 'este dia'}`}
      text="🎩 Aproveite o tempo livre — ou marque algo importante."
      ctaLabel="Adicionar compromisso"
      onCta={() => onCreate(date)}
    />
  }

  const allDay = events.filter((e) => !e.time)
  const timed = events.filter((e) => !!e.time)

  return (
    <div className="space-y-3">
      {allDay.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
            Dia inteiro
          </div>
          <div className="space-y-1.5">
            {allDay.map((ev) => (
              <EventCard key={`${ev.id}:${ev.occurrenceDate}`} event={ev} onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })} />
            ))}
          </div>
        </div>
      )}

      {timed.length > 0 && (
        <div className="space-y-1.5">
          {timed.map((ev) => (
            <EventCard key={`${ev.id}:${ev.occurrenceDate}`} event={ev} onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// WEEK VIEW
// ============================================================
function WeekView({ weekDates, weekEvents, onClickEvent, onCreate }) {
  return (
    <div className="space-y-2">
      {weekDates.map((date) => {
        const evs = weekEvents[date] || []
        return (
          <DayRow
            key={date}
            date={date}
            events={evs}
            onClickEvent={onClickEvent}
            onCreate={() => onCreate(date)}
          />
        )
      })}
    </div>
  )
}

function DayRow({ date, events, onClickEvent, onCreate }) {
  const d = parseISODate(date)
  const dayNum = d.getDate()
  const todayFlag = isToday(date)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: todayFlag ? 'rgba(6,182,212,0.06)' : 'var(--bg-elev2)',
        border: `1px solid ${todayFlag ? 'rgba(6,182,212,0.3)' : 'var(--border-soft)'}`,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: events.length > 0 ? '1px solid var(--border-soft)' : 'none' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg"
            style={{
              background: todayFlag ? 'rgba(6,182,212,0.15)' : 'var(--bg-elev1)',
              color: todayFlag ? AGENDA_ACCENT : 'var(--text-primary)',
            }}
          >
            <div className="text-[9px] uppercase tracking-wider leading-none">
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]}
            </div>
            <div className="text-sm font-semibold tabular-nums leading-tight" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {dayNum}
            </div>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {events.length === 0 ? 'Livre' : `${events.length} ${events.length === 1 ? 'compromisso' : 'compromissos'}`}
            {todayFlag && <span className="ml-2 font-medium" style={{ color: AGENDA_ACCENT }}>· Hoje</span>}
          </div>
        </div>
        <button
          onClick={onCreate}
          className="p-1.5 rounded-lg transition hover:bg-white/5"
          title="Adicionar nesse dia"
          style={{ color: 'var(--text-muted)' }}
        >
          <Plus size={14} />
        </button>
      </div>

      {events.length > 0 && (
        <div className="p-2 space-y-1.5">
          {events.map((ev) => (
            <EventCard
              key={`${ev.id}:${ev.occurrenceDate}`}
              event={ev}
              onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })}
              compact
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// MONTH VIEW
// ============================================================
function MonthView({ events, refDate, setRefDate, setView }) {
  const d = parseISODate(refDate)
  const year = d.getFullYear()
  const month = d.getMonth()

  const firstDay = new Date(year, month, 1)
  const startWeekDay = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekDay; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = toISODate(new Date(year, month, day))
    const evs = getEventsForDate(events, dateIso)
    cells.push({ day, dateIso, events: evs })
  }

  return (
    <div className="rounded-2xl p-3 sm:p-4"
      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d) => (
          <div key={d} className="text-center text-[10px] uppercase font-semibold tracking-wider py-1.5"
            style={{ color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} className="aspect-square" />
          const todayFlag = isToday(cell.dateIso)
          const hasEvents = cell.events.length > 0
          return (
            <button
              key={cell.dateIso}
              onClick={() => { setRefDate(cell.dateIso); setView('day') }}
              className="aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 transition hover:opacity-80"
              style={{
                background: todayFlag ? 'rgba(6,182,212,0.15)' : (hasEvents ? 'var(--bg-elev1)' : 'transparent'),
                border: `1px solid ${todayFlag ? 'rgba(6,182,212,0.4)' : 'transparent'}`,
                color: todayFlag ? AGENDA_ACCENT : 'var(--text-primary)',
              }}
            >
              <div className="text-xs sm:text-sm font-semibold tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {cell.day}
              </div>
              {hasEvents && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full px-0.5">
                  {cell.events.slice(0, 3).map((ev, j) => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: `var(--accent-${ev.color || 'cyan'})` }} />
                  ))}
                  {cell.events.length > 3 && (
                    <div className="text-[8px] leading-none" style={{ color: 'var(--text-muted)' }}>
                      +{cell.events.length - 3}
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
        Toque num dia pra ver os compromissos
      </div>
    </div>
  )
}

// ============================================================
// LIST VIEW — todos os compromissos agrupados por mês
// ============================================================
function ListView({ events, onClickEvent, onCreate }) {
  // Expande TODAS as ocorrências dos próximos 90 dias
  const expanded = useMemo(() => {
    const range = []
    const today = todayISO()
    for (let i = 0; i < 90; i++) {
      const date = shiftDays(today, i)
      const evs = getEventsForDate(events, date)
      evs.forEach((ev) => range.push(ev))
    }
    return range
  }, [events])

  if (expanded.length === 0) {
    return <EmptyState
      icon="📋"
      title="Nenhum compromisso agendado"
      text="🎩 Que tal começar criando o primeiro?"
      ctaLabel="Adicionar compromisso"
      onCta={onCreate}
    />
  }

  // Agrupa por mês YYYY-MM
  const byMonth = {}
  for (const ev of expanded) {
    const ym = ev.occurrenceDate.slice(0, 7)
    if (!byMonth[ym]) byMonth[ym] = []
    byMonth[ym].push(ev)
  }
  const months = Object.keys(byMonth).sort()

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const formatMonthLabel = (ym) => {
    const [y, m] = ym.split('-').map(Number)
    return `${monthNames[m - 1]} ${y}`
  }

  return (
    <div className="space-y-6">
      {months.map((ym) => (
        <div key={ym}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-base">
              {formatMonthLabel(ym)}
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              · {byMonth[ym].length} {byMonth[ym].length === 1 ? 'compromisso' : 'compromissos'}
            </span>
          </div>

          {/* Agrupa por dia dentro do mês */}
          {Object.entries(groupByDate(byMonth[ym])).map(([date, evs]) => (
            <div key={date} className="mb-2">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {formatFriendlyDate(date)}
                </div>
              </div>
              <div className="space-y-1.5">
                {evs.map((ev) => (
                  <EventCard key={`${ev.id}:${ev.occurrenceDate}`} event={ev} onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function groupByDate(events) {
  const out = {}
  for (const ev of events) {
    if (!out[ev.occurrenceDate]) out[ev.occurrenceDate] = []
    out[ev.occurrenceDate].push(ev)
  }
  return out
}

// ============================================================
// SETTINGS VIEW
// ============================================================
function SettingsView() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-4">
      {/* Navegação rápida entre apps */}
      <div className="rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Trocar de app
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/launcher')}
            className="flex items-center gap-3 p-3 rounded-xl text-left transition hover:opacity-90"
            style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--accent-gold)' }}>
              <LayoutGrid size={16} />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Menu de apps
            </div>
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-3 p-3 rounded-xl text-left transition hover:opacity-90"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <div className="p-2 rounded-lg shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' }}>
              <ArrowLeft size={16} />
            </div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Ir para Finanças
            </div>
          </button>
        </div>
      </div>

      {/* Tema */}
      <div className="rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Aparência
        </div>
        <div className="flex gap-3">
          <ThemeOption current={theme} value="light" icon={Sun} label="Claro" onSelect={() => setTheme('light')} />
          <ThemeOption current={theme} value="dark" icon={Moon} label="Escuro" onSelect={() => setTheme('dark')} />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          Em breve
        </div>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-start gap-2">
            <span style={{ color: AGENDA_ACCENT }}>•</span>
            Lembrete via WhatsApp pelo Alfred no dia/hora do compromisso
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: AGENDA_ACCENT }}>•</span>
            Sincronização com Google Calendar
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: AGENDA_ACCENT }}>•</span>
            Editar uma ocorrência específica de evento recorrente
          </li>
        </ul>
      </div>

      <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Tem sugestão? Mande pra <strong>alquimiadigital08@gmail.com</strong>
      </div>
    </div>
  )
}

function ThemeOption({ current, value, icon: Icon, label, onSelect }) {
  const isSel = current === value
  return (
    <button
      onClick={onSelect}
      className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition"
      style={{
        background: isSel ? 'rgba(6,182,212,0.1)' : 'var(--bg-elev1)',
        border: `1.5px solid ${isSel ? AGENDA_ACCENT : 'var(--border-soft)'}`,
      }}
    >
      <Icon size={20} style={{ color: isSel ? AGENDA_ACCENT : 'var(--text-tertiary)' }} />
      <span className="text-xs font-medium" style={{ color: isSel ? AGENDA_ACCENT : 'var(--text-secondary)' }}>
        {label}
      </span>
    </button>
  )
}

// ============================================================
// EventCard — card de evento
// ============================================================
function EventCard({ event, onClick, compact = false }) {
  const colorVar = `var(--accent-${event.color || 'cyan'})`
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl transition hover:opacity-95 flex items-stretch overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      <div style={{ width: 4, background: colorVar, flexShrink: 0 }} />

      <div className={`flex-1 min-w-0 ${compact ? 'p-2.5' : 'p-3'}`}>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="font-medium text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>
            {event.title}
          </div>
          {event.isOccurrence && (
            <Repeat size={11} className="shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} title="Recorrente" />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
          <span className="inline-flex items-center gap-1 tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <Clock size={11} />
            {formatTimeRange(event.time, event.end_time)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin size={11} /> {event.location}
            </span>
          )}
        </div>

        {event.notes && !compact && (
          <div className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {event.notes}
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================================
// EmptyState
// ============================================================
function EmptyState({ icon, title, text, ctaLabel, onCta }) {
  return (
    <div className="text-center py-12 px-4 rounded-2xl"
      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
      <div className="text-4xl mb-3">{icon}</div>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl mb-1.5">
        {title}
      </h3>
      <p className="text-sm max-w-xs mx-auto mb-5" style={{ color: 'var(--text-tertiary)' }}>
        {text}
      </p>
      <button
        onClick={onCta}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
        style={{
          background: AGENDA_ACCENT,
          color: '#fff',
          boxShadow: '0 6px 16px rgba(6,182,212,0.25)',
        }}
      >
        <Plus size={14} /> {ctaLabel}
      </button>
    </div>
  )
}
