import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, CalendarRange, Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  LayoutGrid, Loader2, AlertCircle, MapPin, Repeat, Clock, ArrowLeft,
} from 'lucide-react'
import { useAgenda } from '../../hooks/useAgenda'
import EventForm from './EventForm'
import {
  AGENDA_COLORS, todayISO, parseISODate, toISODate, formatDateLong,
  formatFriendlyDate, getEventsForDate, getEventsForRange, getStartOfWeek,
  getWeekDates, shiftDays, formatTime, formatTimeRange, isToday,
} from '../../lib/agendaUtils'

// ===========================================================================
// Agenda — compromissos, recorrência, visualização dia/semana/mês.
// Visual harmônico com Finanças (dourado, mesma tipografia).
// ===========================================================================

const VIEWS = [
  { id: 'day',   label: 'Dia',    icon: CalendarDays },
  { id: 'week',  label: 'Semana', icon: CalendarRange },
  { id: 'month', label: 'Mês',    icon: CalendarIcon },
]

export default function AgendaShell() {
  const navigate = useNavigate()
  const [view, setView] = useState('day')
  const [refDate, setRefDate] = useState(todayISO())  // data de referência (depende da view)
  const [editing, setEditing] = useState(null)        // { event, occurrenceDate } | null
  const [creating, setCreating] = useState(null)      // { initialDate } | null

  const {
    events, loading, error, refresh,
    createEvent, updateEvent, deleteEvent,
    deleteOccurrence, deleteForever,
  } = useAgenda()

  // Eventos do dia/semana/mês atual (memoized)
  const dayEvents = useMemo(() => getEventsForDate(events, refDate), [events, refDate])
  const weekDates = useMemo(() => getWeekDates(refDate), [refDate])
  const weekEvents = useMemo(() => {
    const map = {}
    for (const d of weekDates) map[d] = getEventsForDate(events, d)
    return map
  }, [events, weekDates])

  // Stats do dia
  const total = dayEvents.length

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
      // Único OU "pra sempre" — chama deleteForever que decide
      if (event.recurring === 'none') {
        await deleteEvent(event.id)
      } else {
        await deleteForever(event.id, occurrenceDate || event.date)
      }
    } else {
      // 'single' em recorrente
      await deleteOccurrence(event.id, occurrenceDate)
    }
    setEditing(null)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)' }}>
      <div className="w-full max-w-4xl mx-auto px-4 pt-6 sm:pt-8" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0))' }}>

        {/* Header — mesma estética das Finanças */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <button
              onClick={() => navigate('/launcher')}
              className="flex items-center gap-1.5 text-xs uppercase mb-2 transition hover:opacity-80"
              style={{ letterSpacing: '0.25em', color: 'var(--accent-gold)' }}
            >
              <ArrowLeft size={11} /> Voltar ao menu
            </button>
            <h1
              style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
              className="text-4xl sm:text-5xl"
            >
              Sua{' '}
              <em style={{ fontStyle: 'italic', background: 'linear-gradient(90deg,#f4d676,#d4af37,#a87f1f)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                agenda.
              </em>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão novo */}
            <button
              onClick={() => setCreating({ initialDate: refDate })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{
                background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
                color: '#070912',
                boxShadow: '0 8px 24px rgba(212,175,55,0.25)',
              }}
            >
              <Plus size={15} />
              Novo
            </button>
          </div>
        </header>

        {/* Seletor de visualização */}
        <div className="flex items-center gap-1 mb-5 rounded-xl p-1 w-fit"
          style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
          {VIEWS.map((v) => {
            const Icon = v.icon
            const active = view === v.id
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{
                  background: active ? 'rgba(212,175,55,0.15)' : 'transparent',
                  color: active ? 'var(--accent-gold)' : 'var(--text-tertiary)',
                }}
              >
                <Icon size={13} />
                {v.label}
              </button>
            )
          })}
        </div>

        {/* Navegação de data */}
        <DateNav view={view} refDate={refDate} setRefDate={setRefDate} />

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
            <Loader2 size={28} className="animate-spin mx-auto mb-2" style={{ color: 'var(--accent-gold)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Carregando agenda…</p>
          </div>
        ) : (
          <>
            {view === 'day' && <DayView events={dayEvents} onClickEvent={(occurrence) => setEditing(occurrence)} onCreate={(date) => setCreating({ initialDate: date })} date={refDate} />}
            {view === 'week' && <WeekView weekDates={weekDates} weekEvents={weekEvents} onClickEvent={(occurrence) => setEditing(occurrence)} onCreate={(date) => setCreating({ initialDate: date })} />}
            {view === 'month' && <MonthView events={events} refDate={refDate} setRefDate={setRefDate} setView={setView} />}
          </>
        )}
      </div>

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

// ============================================================
// DATE NAV — < hoje > / setas de avançar/voltar
// ============================================================
function DateNav({ view, refDate, setRefDate }) {
  const shift = view === 'day' ? 1 : view === 'week' ? 7 : 30
  const goPrev = () => setRefDate(shiftDays(refDate, -shift))
  const goNext = () => setRefDate(shiftDays(refDate, shift))
  const goToday = () => setRefDate(todayISO())

  // Label central
  let label = ''
  if (view === 'day') {
    label = formatDateLong(refDate)
  } else if (view === 'week') {
    const start = parseISODate(getStartOfWeek(refDate))
    const end = new Date(start); end.setDate(end.getDate() + 6)
    label = `${start.getDate().toString().padStart(2,'0')}/${(start.getMonth()+1).toString().padStart(2,'0')} – ${end.getDate().toString().padStart(2,'0')}/${(end.getMonth()+1).toString().padStart(2,'0')}`
  } else {
    const d = parseISODate(refDate)
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    label = `${months[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="flex items-center justify-between gap-2 mb-5">
      <button
        onClick={goPrev}
        className="p-2 rounded-xl transition hover:opacity-80"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}
      >
        <ChevronLeft size={16} />
      </button>

      <div className="text-center flex-1 min-w-0">
        <div className="text-sm sm:text-base font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        {!isToday(refDate) && view === 'day' && (
          <button onClick={goToday} className="text-xs underline transition" style={{ color: 'var(--accent-gold)' }}>
            Voltar pra hoje
          </button>
        )}
      </div>

      <button
        onClick={goNext}
        className="p-2 rounded-xl transition hover:opacity-80"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)' }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ============================================================
// DAY VIEW — lista de eventos do dia, ordenada por hora
// ============================================================
function DayView({ events, onClickEvent, onCreate, date }) {
  if (events.length === 0) {
    return (
      <EmptyDay date={date} onCreate={() => onCreate(date)} />
    )
  }

  // Separa eventos com hora e dia inteiro
  const allDay = events.filter((e) => !e.time)
  const timed = events.filter((e) => !!e.time)

  return (
    <div className="space-y-3">
      {/* Eventos sem hora — em cima */}
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

      {/* Eventos com hora */}
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

function EmptyDay({ date, onCreate }) {
  return (
    <div className="text-center py-16 px-4 rounded-2xl"
      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
      <div className="text-4xl mb-3">📅</div>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-xl mb-1.5">
        Nada marcado pra {isToday(date) ? 'hoje' : 'este dia'}
      </h3>
      <p className="text-sm max-w-xs mx-auto mb-5" style={{ color: 'var(--text-tertiary)' }}>
        🎩 Aproveite o tempo livre — ou marque algo importante.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
        style={{
          background: 'linear-gradient(180deg, #d4af37, #a87f1f)',
          color: '#070912',
          boxShadow: '0 8px 20px rgba(212,175,55,0.2)',
        }}
      >
        <Plus size={14} /> Adicionar compromisso
      </button>
    </div>
  )
}

// ============================================================
// EventCard — card individual de evento
// ============================================================
function EventCard({ event, onClick, compact = false }) {
  const colorVar = `var(--accent-${event.color || 'gold'})`
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl transition hover:opacity-95 flex items-stretch overflow-hidden"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      {/* Barra colorida lateral */}
      <div style={{ width: 4, background: colorVar, flexShrink: 0 }} />

      <div className={`flex-1 min-w-0 ${compact ? 'p-2' : 'p-3'}`}>
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
      </div>
    </button>
  )
}

// ============================================================
// WEEK VIEW — 7 colunas com eventos
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
        background: todayFlag ? 'rgba(212,175,55,0.06)' : 'var(--bg-elev2)',
        border: `1px solid ${todayFlag ? 'rgba(212,175,55,0.3)' : 'var(--border-soft)'}`,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: events.length > 0 ? '1px solid var(--border-soft)' : 'none' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex flex-col items-center justify-center w-10 h-10 rounded-lg"
            style={{
              background: todayFlag ? 'rgba(212,175,55,0.15)' : 'var(--bg-elev1)',
              color: todayFlag ? 'var(--accent-gold)' : 'var(--text-primary)',
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
            {todayFlag && <span className="ml-2" style={{ color: 'var(--accent-gold)' }}>· Hoje</span>}
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
// MONTH VIEW — calendário tradicional com dots
// ============================================================
function MonthView({ events, refDate, setRefDate, setView }) {
  const d = parseISODate(refDate)
  const year = d.getFullYear()
  const month = d.getMonth()

  // Primeiro dia do mês + dia da semana (0=dom)
  const firstDay = new Date(year, month, 1)
  const startWeekDay = firstDay.getDay()  // 0 = dom

  // Dias do mês
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Renderiza grid 7 colunas, começando no domingo
  const cells = []
  // Dias do mês anterior pra preencher
  for (let i = 0; i < startWeekDay; i++) {
    cells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateIso = toISODate(new Date(year, month, day))
    const evs = getEventsForDate(events, dateIso)
    cells.push({ day, dateIso, events: evs })
  }

  return (
    <div className="rounded-2xl p-3 sm:p-4"
      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d) => (
          <div key={d} className="text-center text-[10px] uppercase font-semibold tracking-wider py-1.5"
            style={{ color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
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
                background: todayFlag ? 'rgba(212,175,55,0.15)' : (hasEvents ? 'var(--bg-elev1)' : 'transparent'),
                border: `1px solid ${todayFlag ? 'rgba(212,175,55,0.4)' : 'transparent'}`,
                color: todayFlag ? 'var(--accent-gold)' : 'var(--text-primary)',
              }}
            >
              <div className="text-xs sm:text-sm font-semibold tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {cell.day}
              </div>
              {hasEvents && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full px-0.5">
                  {cell.events.slice(0, 3).map((ev, j) => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: `var(--accent-${ev.color || 'gold'})` }} />
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
