import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, CalendarRange, Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  LayoutGrid, Loader2, AlertCircle, MapPin, Repeat, Clock, ArrowLeft,
  ListChecks, Settings, Sun, Moon, Sparkles, Check, Trash2, Star, CalendarPlus,
  Folder, FolderPlus, FolderOpen, ChevronDown, MoreVertical, Archive,
} from 'lucide-react'
import { useAgenda } from '../../hooks/useAgenda'
import { useAgendaTasks } from '../../hooks/useAgendaTasks'
import { useAgendaProjects } from '../../hooks/useAgendaProjects'
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
  { id: 'day',           label: 'Dia',     icon: CalendarDays },
  { id: 'week',          label: 'Semana',  icon: CalendarRange },
  { id: 'month',         label: 'Mês',     icon: CalendarIcon },
  { id: 'tasks',         label: 'Tarefas', icon: ListChecks },
  { id: 'settings',      label: 'Ajustes', icon: Settings },
]

export default function AgendaShell() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('day')
  const [refDate, setRefDate] = useState(todayISO())
  const [editing, setEditing] = useState(null)        // { event, occurrenceDate } | null
  const [creating, setCreating] = useState(null)      // { initialDate, initialTitle } | null

  const {
    events, loading, error,
    createEvent, updateEvent, deleteEvent,
    deleteOccurrence, deleteForever,
  } = useAgenda()

  const tasksHook = useAgendaTasks()
  const projectsHook = useAgendaProjects()

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
      // Se veio de uma tarefa (creating.fromTaskId), marca a tarefa como feita
      if (creating?.fromTaskId) {
        try { await tasksHook.deleteTask(creating.fromTaskId) } catch (e) { /* ignora */ }
      }
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
                {tab !== 'settings' && tab !== 'tasks' && events.length > 0 && (
                  <span> · {events.length} {events.length === 1 ? 'compromisso' : 'compromissos'} cadastrado{events.length === 1 ? '' : 's'}</span>
                )}
                {tab === 'tasks' && tasksHook.pending.length > 0 && (
                  <span> · {tasksHook.pending.length} pendente{tasksHook.pending.length === 1 ? '' : 's'}</span>
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
          {tab === 'tasks' && (<>Suas <em style={titleEm}>tarefas.</em></>)}
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
                onCreate={(date, time) => setCreating({ initialDate: date, initialTime: time })}
                date={refDate}
              />
            )}
            {tab === 'week' && (
              <WeekView
                weekDates={weekDates}
                weekEvents={weekEvents}
                onClickEvent={(occ) => setEditing(occ)}
                onCreate={(date) => setCreating({ initialDate: date })}
                onJumpToDay={(date) => { setRefDate(date); setTab('day') }}
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
            {tab === 'tasks' && (
              <TasksView
                tasksHook={tasksHook}
                projectsHook={projectsHook}
                onSchedule={(task) => setCreating({
                  initialDate: todayISO(),
                  initialTitle: task.title,
                  fromTaskId: task.id,
                })}
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
          initialTitle={creating?.initialTitle}
          initialTime={creating?.initialTime}
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
// DAY VIEW — Timeline vertical com horários e blocos posicionados
// ============================================================
function DayView({ events, onClickEvent, onCreate, date }) {
  const allDay = events.filter((e) => !e.time)
  const timed = events.filter((e) => !!e.time)
  const todayFlag = isToday(date)

  return (
    <div className="space-y-3">
      {/* CTA didático no topo */}
      <button
        onClick={() => onCreate(date)}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition hover:opacity-90 active:scale-[0.99]"
        style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(6,182,212,0.18) 100%)',
          border: '1.5px dashed rgba(6,182,212,0.45)',
          color: AGENDA_ACCENT,
        }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
          style={{ background: 'rgba(6,182,212,0.20)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </div>
        <div className="text-left min-w-0 flex-1">
          <div className="text-sm font-semibold" style={{ color: AGENDA_ACCENT }}>
            Adicionar compromisso {todayFlag ? 'pra hoje' : 'neste dia'}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Reunião, consulta, lembrete… toque pra criar
          </div>
        </div>
        <Sparkles size={14} style={{ color: AGENDA_ACCENT, opacity: 0.7 }} />
      </button>

      {/* Dia inteiro */}
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

      {/* TIMELINE */}
      <DayTimeline
        events={timed}
        date={date}
        isToday={todayFlag}
        onClickEvent={onClickEvent}
        onClickEmpty={(hour) => onCreate(date, hour)}
      />
    </div>
  )
}

// Timeline do dia: coluna esquerda com horas + coluna direita com slots
function DayTimeline({ events, date, isToday: todayFlag, onClickEvent, onClickEmpty }) {
  // Determina range: mín 07:00, máx 23:00, mas expande se evento sair fora
  const PX_PER_HOUR = 60  // 60px por hora — confortável no mobile
  let startHour = 7
  let endHour = 23
  for (const e of events) {
    const sh = Number(e.time?.slice(0, 2) || 0)
    const eh = e.end_time ? Number(e.end_time.slice(0, 2)) : sh + 1
    if (sh < startHour) startHour = Math.max(0, sh)
    if (eh > endHour) endHour = Math.min(24, eh + 1)
  }
  const totalHours = endHour - startHour
  const totalHeight = totalHours * PX_PER_HOUR

  // Linha "agora" — só se é hoje
  let nowOffset = null
  if (todayFlag) {
    const now = new Date()
    const nowH = now.getHours() + now.getMinutes() / 60
    if (nowH >= startHour && nowH <= endHour) {
      nowOffset = (nowH - startHour) * PX_PER_HOUR
    }
  }

  // Calcula posição/altura de cada evento
  const positioned = events.map((ev) => {
    const [sh, sm] = ev.time.split(':').map(Number)
    const startMin = (sh - startHour) * 60 + (sm || 0)
    let endMin
    if (ev.end_time) {
      const [eh, em] = ev.end_time.split(':').map(Number)
      endMin = (eh - startHour) * 60 + (em || 0)
      if (endMin < startMin) endMin = startMin + 30  // virou dia: minimal
    } else {
      endMin = startMin + 30  // sem fim: 30min visual
    }
    const top = (startMin / 60) * PX_PER_HOUR
    const height = Math.max(28, ((endMin - startMin) / 60) * PX_PER_HOUR)
    return { ev, top, height, startMin, endMin }
  }).sort((a, b) => a.startMin - b.startMin)

  // Detecta sobreposições e divide em colunas
  const eventsWithColumns = layoutOverlappingEvents(positioned)

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
    >
      {/* Header da timeline */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-soft)' }}
      >
        <Clock size={12} style={{ color: AGENDA_ACCENT }} />
        <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Horários do dia
        </div>
        {events.length === 0 && (
          <div className="text-[11px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
            Tudo livre 🌿
          </div>
        )}
      </div>

      {/* Timeline em si */}
      <div className="relative" style={{ height: totalHeight }}>
        {/* Linhas de hora + label */}
        {Array.from({ length: totalHours + 1 }).map((_, i) => {
          const hour = startHour + i
          const y = i * PX_PER_HOUR
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: y, height: PX_PER_HOUR }}
            >
              {/* Coluna de horas */}
              <div
                className="shrink-0 flex items-start justify-end pt-1 pr-2"
                style={{
                  width: 48,
                  borderRight: '1px solid var(--border-soft)',
                }}
              >
                <span
                  className="text-[10px] tabular-nums"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
              {/* Slot clicável vazio */}
              <button
                onClick={() => onClickEmpty?.(`${String(hour).padStart(2, '0')}:00`)}
                className="flex-1 transition hover:bg-white/5 group"
                style={{
                  borderBottom: i < totalHours ? '1px solid var(--border-soft)' : 'none',
                }}
                title={`Adicionar às ${String(hour).padStart(2, '0')}:00`}
              >
                <span
                  className="text-[10px] opacity-0 group-hover:opacity-100 transition"
                  style={{ color: AGENDA_ACCENT }}
                >
                  + livre
                </span>
              </button>
            </div>
          )
        })}

        {/* Linha "agora" */}
        {nowOffset !== null && (
          <div
            className="absolute left-12 right-0 z-20 pointer-events-none"
            style={{ top: nowOffset, height: 0 }}
          >
            <div
              className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full"
              style={{ background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.25)' }}
            />
            <div
              className="absolute left-0 right-2 top-0"
              style={{ height: 2, background: '#ef4444' }}
            />
          </div>
        )}

        {/* Eventos posicionados */}
        {eventsWithColumns.map(({ ev, top, height, colStart, colSpan, totalCols }) => {
          const colWidth = `calc((100% - 48px) / ${totalCols})`
          const left = `calc(48px + ${colStart} * ${colWidth} + 4px)`
          const width = `calc(${colSpan} * ${colWidth} - 8px)`
          return (
            <TimelineEvent
              key={`${ev.id}:${ev.occurrenceDate}`}
              event={ev}
              top={top}
              height={height}
              left={left}
              width={width}
              onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })}
            />
          )
        })}
      </div>
    </div>
  )
}

// Resolve sobreposição: cada evento ganha (colStart, colSpan, totalCols)
function layoutOverlappingEvents(positioned) {
  const result = []
  // Agrupa eventos que se sobrepõem (transitivamente)
  let i = 0
  while (i < positioned.length) {
    let groupEnd = positioned[i].endMin
    let j = i
    while (j + 1 < positioned.length && positioned[j + 1].startMin < groupEnd) {
      j++
      if (positioned[j].endMin > groupEnd) groupEnd = positioned[j].endMin
    }
    const group = positioned.slice(i, j + 1)
    // Coloca cada um na primeira coluna livre
    const columns = []  // cada col = [endMin do último evento]
    const placed = group.map((p) => {
      let col = 0
      while (col < columns.length && columns[col] > p.startMin) col++
      columns[col] = p.endMin
      return { ...p, colStart: col }
    })
    const totalCols = columns.length
    for (const p of placed) {
      result.push({ ...p, colSpan: 1, totalCols })
    }
    i = j + 1
  }
  return result
}

function TimelineEvent({ event, top, height, left, width, onClick }) {
  const colorKey = event.color || 'cyan'
  const colorVar = `var(--accent-${colorKey})`
  const tintBg = getColorTint(colorKey, 'bg')
  const tintBorder = getColorTint(colorKey, 'border')
  const compact = height < 50
  return (
    <button
      onClick={onClick}
      className="absolute rounded-lg text-left overflow-hidden transition hover:opacity-90 active:scale-[0.99] flex"
      style={{
        top, height, left, width,
        background: tintBg,
        border: `1px solid ${tintBorder}`,
      }}
    >
      <div style={{ width: 4, background: colorVar, flexShrink: 0 }} />
      <div className="flex-1 min-w-0 px-2 py-1">
        <div
          className={`font-medium ${compact ? 'text-[11px] truncate' : 'text-xs'}`}
          style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}
        >
          {event.title}
        </div>
        {!compact && (
          <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
            <span>{formatTime(event.time)}{event.end_time ? `–${formatTime(event.end_time)}` : ''}</span>
            {event.location && height > 70 && (
              <span className="truncate"> · 📍 {event.location}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================================
// WEEK VIEW — Visão semanal com barra horária por dia
// ============================================================
function WeekView({ weekDates, weekEvents, onClickEvent, onCreate, onJumpToDay }) {
  // Stats da semana
  const totalEvents = weekDates.reduce((sum, d) => sum + (weekEvents[d]?.length || 0), 0)
  const busyDays = weekDates.filter((d) => (weekEvents[d]?.length || 0) > 0).length

  return (
    <div className="space-y-3">
      {/* Header com resumo da semana */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
        style={{
          background: 'rgba(6,182,212,0.06)',
          border: '1px solid rgba(6,182,212,0.20)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarRange size={16} style={{ color: AGENDA_ACCENT }} />
          <div className="min-w-0">
            <div className="text-xs font-semibold" style={{ color: AGENDA_ACCENT }}>
              {totalEvents === 0
                ? 'Semana inteira livre 🌿'
                : `${totalEvents} ${totalEvents === 1 ? 'compromisso' : 'compromissos'} esta semana`}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {busyDays} de 7 dias com atividade
            </div>
          </div>
        </div>
      </div>

      {/* Lista de dias com mini-timeline */}
      <div className="space-y-2">
        {weekDates.map((date) => {
          const evs = weekEvents[date] || []
          return (
            <WeekDayRow
              key={date}
              date={date}
              events={evs}
              onClickEvent={onClickEvent}
              onCreate={() => onCreate(date)}
              onJumpToDay={() => onJumpToDay?.(date)}
            />
          )
        })}
      </div>
    </div>
  )
}

function WeekDayRow({ date, events, onClickEvent, onCreate, onJumpToDay }) {
  const d = parseISODate(date)
  const dayNum = d.getDate()
  const todayFlag = isToday(date)
  const monthNum = d.getMonth() + 1
  const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()]

  const timed = events.filter((e) => !!e.time).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const allDay = events.filter((e) => !e.time)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: todayFlag ? 'rgba(6,182,212,0.06)' : 'var(--bg-elev2)',
        border: `1px solid ${todayFlag ? 'rgba(6,182,212,0.3)' : 'var(--border-soft)'}`,
      }}
    >
      {/* Cabeçalho do dia */}
      <button
        onClick={onJumpToDay}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:opacity-90"
        style={{ borderBottom: events.length > 0 ? '1px solid var(--border-soft)' : 'none' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex flex-col items-center justify-center rounded-xl shrink-0"
            style={{
              width: 44, height: 44,
              background: todayFlag ? AGENDA_ACCENT : 'var(--bg-elev1)',
              color: todayFlag ? '#fff' : 'var(--text-primary)',
            }}
          >
            <div className="text-[9px] uppercase tracking-wider leading-none mt-1" style={{ opacity: todayFlag ? 0.9 : 0.7 }}>
              {dayName}
            </div>
            <div className="text-base font-bold tabular-nums leading-none mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {dayNum}
            </div>
            <div className="text-[8px] tabular-nums leading-none mt-0.5 mb-1" style={{ opacity: 0.6 }}>
              /{String(monthNum).padStart(2, '0')}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {todayFlag && <span style={{ color: AGENDA_ACCENT }}>Hoje · </span>}
              {events.length === 0
                ? <span style={{ color: 'var(--text-tertiary)' }}>Dia livre</span>
                : `${events.length} ${events.length === 1 ? 'compromisso' : 'compromissos'}`}
            </div>
            {timed.length > 0 && (
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                {timed[0].time?.slice(0, 5)}{timed.length > 1 ? ` … ${timed[timed.length - 1].time?.slice(0, 5)}` : ''}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onCreate() }}
            className="p-1.5 rounded-lg transition hover:bg-white/5"
            title="Adicionar nesse dia"
            style={{ color: AGENDA_ACCENT }}
          >
            <Plus size={15} />
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </button>

      {/* Mini-timeline horizontal (barra de ocupação 6h-23h) */}
      {timed.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <MiniTimelineBar events={timed} onClickEvent={onClickEvent} />
        </div>
      )}

      {/* Lista de eventos (compacta) */}
      {events.length > 0 && (
        <div className="px-3 pb-3 pt-1 space-y-1">
          {allDay.map((ev) => (
            <CompactEventRow
              key={`${ev.id}:${ev.occurrenceDate}`}
              event={ev}
              onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })}
              allDay
            />
          ))}
          {timed.map((ev) => (
            <CompactEventRow
              key={`${ev.id}:${ev.occurrenceDate}`}
              event={ev}
              onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Mini-barra horizontal mostrando ocupação visual do dia (6h-23h)
function MiniTimelineBar({ events, onClickEvent }) {
  const START_H = 6
  const END_H = 23
  const range = END_H - START_H
  const positions = events.map((ev) => {
    const [sh, sm] = (ev.time || '00:00').split(':').map(Number)
    let startFrac = ((sh - START_H) + (sm || 0) / 60) / range
    let endFrac
    if (ev.end_time) {
      const [eh, em] = ev.end_time.split(':').map(Number)
      endFrac = ((eh - START_H) + (em || 0) / 60) / range
    } else {
      endFrac = startFrac + (30 / 60) / range  // 30 min default
    }
    return {
      ev,
      startFrac: Math.max(0, Math.min(1, startFrac)),
      endFrac: Math.max(0, Math.min(1, endFrac)),
    }
  })

  return (
    <div className="space-y-1">
      <div
        className="relative rounded-full"
        style={{ height: 10, background: 'var(--bg-elev1)' }}
      >
        {positions.map(({ ev, startFrac, endFrac }, i) => {
          const colorVar = `var(--accent-${ev.color || 'cyan'})`
          const left = `${startFrac * 100}%`
          const width = `${Math.max(2, (endFrac - startFrac) * 100)}%`
          return (
            <button
              key={`${ev.id}:${i}`}
              onClick={(e) => { e.stopPropagation(); onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate }) }}
              className="absolute top-0 bottom-0 rounded-full transition hover:scale-y-150 origin-center"
              style={{ left, width, background: colorVar }}
              title={`${ev.title} · ${ev.time?.slice(0, 5)}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[8px] tabular-nums" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  )
}

// Linha compacta de evento na semana
function CompactEventRow({ event, onClick, allDay }) {
  const colorKey = event.color || 'cyan'
  const colorVar = `var(--accent-${colorKey})`
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition hover:bg-white/5 text-left"
    >
      <div style={{ width: 3, height: 18, background: colorVar, borderRadius: 2, flexShrink: 0 }} />
      <div className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace', minWidth: 38 }}>
        {allDay ? 'dia' : event.time?.slice(0, 5)}
      </div>
      <div className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
        {event.title}
      </div>
      {event.location && (
        <span className="text-[10px] truncate shrink-0 max-w-[80px]" style={{ color: 'var(--text-muted)' }}>
          📍 {event.location}
        </span>
      )}
    </button>
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
// TASKS VIEW — TODOs sem data + projetos (pastas)
// ============================================================
function TasksView({ tasksHook, projectsHook, onSchedule }) {
  const { pending, completed, loading, error, createTask, toggleTask, deleteTask, updateTask } = tasksHook
  const { projects, createProject, updateProject, deleteProject } = projectsHook

  const [newTitle, setNewTitle] = useState('')
  const [important, setImportant] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [openProjects, setOpenProjects] = useState({})  // { [projectId]: true }
  const [editingProject, setEditingProject] = useState(null)

  // Tarefas avulsas (sem project_id)
  const looseTasks = pending.filter((t) => !t.project_id)
  const looseCompleted = completed.filter((t) => !t.project_id)

  // Tarefas por projeto
  const tasksByProject = useMemo(() => {
    const map = {}
    for (const t of [...pending, ...completed]) {
      if (!t.project_id) continue
      if (!map[t.project_id]) map[t.project_id] = { pending: [], completed: [] }
      if (t.completed_at) map[t.project_id].completed.push(t)
      else map[t.project_id].pending.push(t)
    }
    return map
  }, [pending, completed])

  const handleAdd = async (e) => {
    e?.preventDefault?.()
    const title = newTitle.trim()
    if (!title) return
    setAdding(true)
    try {
      await createTask({ title, priority: important })
      setNewTitle('')
      setImportant(false)
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const isEmpty = pending.length === 0 && completed.length === 0 && projects.length === 0

  return (
    <div className="space-y-4">
      {/* Explicação curta */}
      <div className="rounded-2xl p-3 px-4"
        style={{
          background: 'rgba(6,182,212,0.06)',
          border: '1px solid rgba(6,182,212,0.20)',
        }}
      >
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: AGENDA_ACCENT }}>💡 Tarefas e projetos</strong> — anote o que precisa
          ser feito (avulso) ou organize em <strong>projetos</strong> (pastas de tarefas relacionadas).
          Quando definir o dia, clica em 📅 pra virar compromisso.
        </div>
      </div>

      {/* Form rápido de tarefa avulsa */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl p-3"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex: Ligar pro contador, comprar café…"
            className="flex-1 bg-transparent text-sm outline-none px-2 py-2"
            style={{ color: 'var(--text-primary)' }}
            maxLength={200}
          />
          <button
            type="button"
            onClick={() => setImportant((v) => !v)}
            title={important ? 'Importante (vai pro topo)' : 'Marcar como importante'}
            className="p-2 rounded-lg transition shrink-0"
            style={{
              background: important ? 'rgba(245,158,11,0.15)' : 'var(--bg-elev1)',
              color: important ? 'var(--accent-amber)' : 'var(--text-muted)',
            }}
          >
            <Star size={16} fill={important ? 'currentColor' : 'none'} />
          </button>
          <button
            type="submit"
            disabled={!newTitle.trim() || adding}
            className="px-3 py-2 rounded-lg text-sm font-semibold transition shrink-0 disabled:opacity-50"
            style={{ background: AGENDA_ACCENT, color: '#fff' }}
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </div>
      </form>

      {/* Botão criar projeto */}
      <button
        onClick={() => setShowProjectForm(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition hover:opacity-90"
        style={{
          background: 'var(--bg-elev2)',
          border: '1.5px dashed var(--border-medium)',
          color: 'var(--text-secondary)',
        }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: 'rgba(6,182,212,0.12)', color: AGENDA_ACCENT }}
        >
          <FolderPlus size={16} />
        </div>
        <div className="text-left flex-1">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Criar projeto
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Pasta pra agrupar tarefas relacionadas
          </div>
        </div>
      </button>

      {error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.1)', color: '#fda4af' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && isEmpty ? (
        <div className="text-center py-8">
          <Loader2 size={20} className="animate-spin mx-auto" style={{ color: AGENDA_ACCENT }} />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-10 px-4 rounded-2xl"
          style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
          <div className="text-4xl mb-3">✨</div>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg mb-1.5">
            Sua lista está vazia
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Anote uma tarefa rápida lá em cima ou crie um projeto.
          </p>
        </div>
      ) : (
        <>
          {/* PROJETOS */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
                Projetos · {projects.length}
              </div>
              {projects.map((p) => {
                const tasks = tasksByProject[p.id] || { pending: [], completed: [] }
                const isOpen = !!openProjects[p.id]
                return (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    pendingTasks={tasks.pending}
                    completedTasks={tasks.completed}
                    isOpen={isOpen}
                    onToggleOpen={() => setOpenProjects((o) => ({ ...o, [p.id]: !o[p.id] }))}
                    onAddTask={(title, prio) => createTask({ title, priority: prio, project_id: p.id })}
                    onToggleTask={(id) => toggleTask(id)}
                    onDeleteTask={(id) => deleteTask(id)}
                    onScheduleTask={(t) => onSchedule(t)}
                    onTogglePriority={(t) => updateTask(t.id, { priority: t.priority ? 0 : 1 })}
                    onMoveTaskOut={(t) => updateTask(t.id, { project_id: null })}
                    onEditProject={() => setEditingProject(p)}
                  />
                )
              })}
            </div>
          )}

          {/* AVULSAS */}
          {(looseTasks.length > 0 || looseCompleted.length > 0) && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest mb-1 px-1" style={{ color: 'var(--text-muted)' }}>
                Avulsas · {looseTasks.length}
              </div>
              {looseTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  projects={projects}
                  onToggle={() => toggleTask(t.id)}
                  onDelete={() => deleteTask(t.id)}
                  onSchedule={() => onSchedule(t)}
                  onTogglePriority={() => updateTask(t.id, { priority: t.priority ? 0 : 1 })}
                  onMoveToProject={(pid) => updateTask(t.id, { project_id: pid })}
                />
              ))}
            </div>
          )}

          {/* FEITAS (avulsas) — colapsado */}
          {looseCompleted.length > 0 && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="text-[10px] uppercase tracking-widest px-1 transition hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                {showCompleted ? '▾' : '▸'} Feitas · {looseCompleted.length}
              </button>
              {showCompleted && looseCompleted.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  projects={projects}
                  onToggle={() => toggleTask(t.id)}
                  onDelete={() => deleteTask(t.id)}
                  onSchedule={() => onSchedule(t)}
                  onTogglePriority={() => updateTask(t.id, { priority: t.priority ? 0 : 1 })}
                  onMoveToProject={(pid) => updateTask(t.id, { project_id: pid })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal criar/editar projeto */}
      {(showProjectForm || editingProject) && (
        <ProjectForm
          project={editingProject}
          onSave={async (payload) => {
            if (editingProject) await updateProject(editingProject.id, payload)
            else await createProject(payload)
            setShowProjectForm(false)
            setEditingProject(null)
          }}
          onDelete={editingProject ? async () => {
            await deleteProject(editingProject.id)
            setEditingProject(null)
          } : null}
          onClose={() => { setShowProjectForm(false); setEditingProject(null) }}
        />
      )}
    </div>
  )
}

// ============================================================
// PROJECT CARD — pasta expandível com tarefas dentro
// ============================================================
function ProjectCard({
  project, pendingTasks, completedTasks, isOpen, onToggleOpen,
  onAddTask, onToggleTask, onDeleteTask, onScheduleTask, onTogglePriority,
  onMoveTaskOut, onEditProject,
}) {
  const [newInside, setNewInside] = useState('')
  const [insideAdding, setInsideAdding] = useState(false)
  const tintBg = getColorTint(project.color, 'bg')
  const tintBorder = getColorTint(project.color, 'border')
  const colorVar = `var(--accent-${project.color})`

  const handleAddInside = async (e) => {
    e?.preventDefault?.()
    const title = newInside.trim()
    if (!title) return
    setInsideAdding(true)
    try {
      await onAddTask(title, false)
      setNewInside('')
    } finally {
      setInsideAdding(false)
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: tintBg,
        border: `1px solid ${tintBorder}`,
      }}
    >
      {/* Cabeçalho clicável */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={onToggleOpen}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left transition hover:opacity-80"
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: `${colorVar}`, color: '#fff' }}
          >
            {project.icon ? (
              <span className="text-base">{project.icon}</span>
            ) : (
              isOpen ? <FolderOpen size={18} /> : <Folder size={18} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {pendingTasks.length === 0 && completedTasks.length === 0
                ? 'Vazio — toque pra adicionar tarefas'
                : `${pendingTasks.length} pendente${pendingTasks.length === 1 ? '' : 's'}${completedTasks.length > 0 ? ` · ${completedTasks.length} feita${completedTasks.length === 1 ? '' : 's'}` : ''}`}
            </div>
          </div>
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        <button
          onClick={onEditProject}
          className="p-1.5 rounded-lg transition hover:opacity-70 shrink-0"
          title="Editar projeto"
          style={{ color: 'var(--text-muted)' }}
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {/* Conteúdo expandido */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-2"
          style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}
        >
          {/* Form de adicionar dentro do projeto */}
          <form
            onSubmit={handleAddInside}
            className="flex items-center gap-2 rounded-lg p-2"
            style={{ background: 'var(--bg-elev2)' }}
          >
            <input
              type="text"
              value={newInside}
              onChange={(e) => setNewInside(e.target.value)}
              placeholder="Adicionar tarefa neste projeto…"
              className="flex-1 bg-transparent text-sm outline-none px-1"
              style={{ color: 'var(--text-primary)' }}
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!newInside.trim() || insideAdding}
              className="p-1.5 rounded-md text-sm font-semibold transition disabled:opacity-50"
              style={{ background: colorVar, color: '#fff' }}
            >
              {insideAdding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            </button>
          </form>

          {/* Tarefas pendentes */}
          {pendingTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              insideProject
              onToggle={() => onToggleTask(t.id)}
              onDelete={() => onDeleteTask(t.id)}
              onSchedule={() => onScheduleTask(t)}
              onTogglePriority={() => onTogglePriority(t)}
              onMoveOut={() => onMoveTaskOut(t)}
            />
          ))}

          {/* Tarefas feitas (compactas) */}
          {completedTasks.length > 0 && (
            <CompletedSection
              tasks={completedTasks}
              insideProject
              onToggle={(id) => onToggleTask(id)}
              onDelete={(id) => onDeleteTask(id)}
            />
          )}

          {pendingTasks.length === 0 && completedTasks.length === 0 && (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Adicione tarefas neste projeto acima 👆
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CompletedSection({ tasks, insideProject, onToggle, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] uppercase tracking-widest transition hover:opacity-70 px-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {open ? '▾' : '▸'} Feitas · {tasks.length}
      </button>
      {open && tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          insideProject={insideProject}
          onToggle={() => onToggle(t.id)}
          onDelete={() => onDelete(t.id)}
        />
      ))}
    </>
  )
}

function TaskRow({ task, projects, insideProject, onToggle, onDelete, onSchedule, onTogglePriority, onMoveToProject, onMoveOut }) {
  const done = !!task.completed_at
  const isImportant = task.priority === 1 && !done
  const [showMove, setShowMove] = useState(false)

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition relative"
      style={{
        background: isImportant ? 'rgba(245,158,11,0.06)' : (insideProject ? 'var(--bg-elev2)' : 'var(--bg-elev2)'),
        border: `1px solid ${isImportant ? 'rgba(245,158,11,0.25)' : 'var(--border-soft)'}`,
        opacity: done ? 0.55 : 1,
      }}
    >
      <button
        onClick={onToggle}
        className="shrink-0 flex items-center justify-center transition"
        style={{
          width: 22, height: 22, borderRadius: 6,
          border: `1.5px solid ${done ? AGENDA_ACCENT : 'var(--border-medium)'}`,
          background: done ? AGENDA_ACCENT : 'transparent',
        }}
        title={done ? 'Marcar como não feita' : 'Marcar como feita'}
      >
        {done && <Check size={14} color="#fff" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="text-sm truncate"
          style={{
            color: 'var(--text-primary)',
            textDecoration: done ? 'line-through' : 'none',
            fontWeight: isImportant ? 600 : 400,
          }}
        >
          {isImportant && <Star size={11} className="inline mr-1 mb-0.5" fill="currentColor" style={{ color: 'var(--accent-amber)' }} />}
          {task.title}
        </div>
      </div>

      {!done && (
        <>
          {onTogglePriority && (
            <button
              onClick={onTogglePriority}
              className="p-1.5 rounded-lg transition hover:opacity-70 shrink-0"
              title={isImportant ? 'Tirar destaque' : 'Marcar como importante'}
              style={{ color: isImportant ? 'var(--accent-amber)' : 'var(--text-muted)' }}
            >
              <Star size={14} fill={isImportant ? 'currentColor' : 'none'} />
            </button>
          )}
          {onSchedule && (
            <button
              onClick={onSchedule}
              className="p-1.5 rounded-lg transition hover:opacity-70 shrink-0"
              title="Agendar pra um dia"
              style={{ color: AGENDA_ACCENT }}
            >
              <CalendarPlus size={15} />
            </button>
          )}
          {/* Mover entre projetos (só aparece se tem projetos pra mover) */}
          {((projects && projects.length > 0) || onMoveOut) && (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowMove((v) => !v)}
                className="p-1.5 rounded-lg transition hover:opacity-70"
                title="Mover"
                style={{ color: 'var(--text-muted)' }}
              >
                <Folder size={14} />
              </button>
              {showMove && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMove(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-lg overflow-hidden min-w-[180px]"
                    style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}
                  >
                    {onMoveOut && (
                      <button
                        onClick={() => { onMoveOut(); setShowMove(false) }}
                        className="w-full text-left px-3 py-2 text-xs transition hover:opacity-80 flex items-center gap-2"
                        style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-soft)' }}
                      >
                        <span>📤</span> Tirar do projeto
                      </button>
                    )}
                    {projects && projects.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Mover para:
                        </div>
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { onMoveToProject?.(p.id); setShowMove(false) }}
                            className="w-full text-left px-3 py-2 text-xs transition hover:opacity-80 flex items-center gap-2"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <Folder size={11} style={{ color: `var(--accent-${p.color})` }} />
                            {p.icon && <span>{p.icon}</span>}
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg transition hover:opacity-70 shrink-0"
        title="Apagar"
        style={{ color: 'var(--text-muted)' }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ============================================================
// PROJECT FORM — criar/editar projeto
// ============================================================
function ProjectForm({ project, onSave, onDelete, onClose }) {
  const isEditing = !!project
  const [name, setName] = useState(project?.name || '')
  const [color, setColor] = useState(project?.color || 'cyan')
  const [icon, setIcon] = useState(project?.icon || '')
  const [notes, setNotes] = useState(project?.notes || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({ name: name.trim(), color, icon: icon.trim() || null, notes: notes.trim() || null })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const COMMON_EMOJIS = ['📁', '🚀', '💼', '🏠', '✈️', '💪', '📚', '🎯', '💰', '❤️', '🛒', '🎨']

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: `var(--accent-${color})`, color: '#fff' }}>
              {icon ? <span>{icon}</span> : <Folder size={16} />}
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg">
              {isEditing ? 'Editar projeto' : 'Novo projeto'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg transition hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Nome do projeto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mudança de casa, Site novo, Casamento…"
              className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg-elev2)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-primary)',
              }}
              autoFocus
              maxLength={80}
            />
          </div>

          {/* Cor */}
          <div>
            <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Cor
            </label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {AGENDA_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  className="w-8 h-8 rounded-lg transition"
                  style={{
                    background: `var(--accent-${c.key})`,
                    border: color === c.key ? '2.5px solid var(--text-primary)' : '2.5px solid transparent',
                    boxShadow: color === c.key ? `0 0 0 2px var(--bg-elev1)` : 'none',
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Ícone (emoji) */}
          <div>
            <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Ícone (opcional)
            </label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIcon('')}
                className="w-9 h-9 rounded-lg text-xs flex items-center justify-center transition"
                style={{
                  background: !icon ? `var(--accent-${color})` : 'var(--bg-elev2)',
                  color: !icon ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                Sem
              </button>
              {COMMON_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className="w-9 h-9 rounded-lg text-base flex items-center justify-center transition"
                  style={{
                    background: icon === e ? `var(--accent-${color})` : 'var(--bg-elev2)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Objetivo / notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Mudança pro novo apto até abril/2026"
              rows={2}
              className="w-full mt-1.5 px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{
                background: 'var(--bg-elev2)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-primary)',
              }}
              maxLength={300}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border-soft)' }}>
          {isEditing && onDelete && (
            confirmDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold transition"
                style={{ background: 'rgba(244,63,94,0.15)', color: '#fda4af', border: '1px solid rgba(244,63,94,0.3)' }}
              >
                Confirmar excluir
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-2.5 rounded-xl transition hover:opacity-70"
                title="Excluir projeto"
                style={{ background: 'var(--bg-elev2)', color: 'var(--text-muted)' }}
              >
                <Trash2 size={15} />
              </button>
            )
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
            style={{ background: 'var(--bg-elev2)', color: 'var(--text-secondary)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
            style={{ background: AGENDA_ACCENT, color: '#fff' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : (isEditing ? 'Salvar' : 'Criar projeto')}
          </button>
        </div>
      </form>
    </div>
  )
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
// EventCard — card de evento com TAMANHO PROPORCIONAL à duração
// e COR PRESENTE em todo o fundo (tint).
// ============================================================
function EventCard({ event, onClick, compact = false }) {
  const colorKey = event.color || 'cyan'
  const colorVar = `var(--accent-${colorKey})`

  // Calcula duração em minutos pra escalar altura/padding
  const duration = computeDurationMinutes(event.time, event.end_time)

  // Padding vertical proporcional: <= 30 min = compacto, 1h = padrão, > 1h = generoso
  // Fórmula: 6px base + 0.18px por minuto (mín 8, máx 28)
  const verticalPad = duration
    ? Math.max(8, Math.min(28, Math.round(6 + duration * 0.18)))
    : (compact ? 10 : 12)

  // Background com tint suave da cor (visual da cor presente em todo o card)
  // Usamos rgba derivada do hex (mapeamento manual pq CSS var não funciona em rgba)
  const tintBg = getColorTint(colorKey, 'bg')
  const tintBorder = getColorTint(colorKey, 'border')

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl transition hover:opacity-95 flex items-stretch overflow-hidden"
      style={{
        background: tintBg,
        border: `1px solid ${tintBorder}`,
      }}
    >
      {/* Barra lateral mais espessa pra reforçar a cor */}
      <div style={{ width: 5, background: colorVar, flexShrink: 0 }} />

      <div className="flex-1 min-w-0" style={{ padding: `${verticalPad}px 12px` }}>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="font-medium text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>
            {event.title}
          </div>
          {event.isOccurrence && (
            <Repeat size={11} className="shrink-0 mt-1" style={{ color: colorVar }} title="Recorrente" />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
          <span className="inline-flex items-center gap-1 tabular-nums" style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 500 }}>
            <Clock size={11} style={{ color: colorVar }} />
            {formatTimeRange(event.time, event.end_time)}
            {duration && duration >= 60 && (
              <span className="opacity-60">· {formatDurationShort(duration)}</span>
            )}
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

// Calcula duração em minutos entre time e end_time (formato 'HH:MM:SS' ou 'HH:MM')
function computeDurationMinutes(time, endTime) {
  if (!time || !endTime) return null
  const [sh, sm] = time.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const start = sh * 60 + sm
  let end = eh * 60 + em
  if (end < start) end += 24 * 60  // virou o dia
  return end - start
}

function formatDurationShort(mins) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`
}

// Retorna tint da cor (background suave) ou cor da borda
function getColorTint(colorKey, mode) {
  // Mapeamento manual rgba pra cada accent (não dá pra usar CSS var em alpha)
  const tints = {
    gold:    { bg: 'rgba(212,175,55,0.10)',  border: 'rgba(212,175,55,0.30)'  },
    emerald: { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.30)'  },
    rose:    { bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.30)'   },
    amber:   { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.30)'  },
    cyan:    { bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.30)'   },
    violet:  { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.30)'  },
    sky:     { bg: 'rgba(14,165,233,0.10)',  border: 'rgba(14,165,233,0.30)'  },
    fuchsia: { bg: 'rgba(217,70,239,0.10)',  border: 'rgba(217,70,239,0.30)'  },
    lime:    { bg: 'rgba(132,204,22,0.10)',  border: 'rgba(132,204,22,0.30)'  },
    orange:  { bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.30)'  },
  }
  return (tints[colorKey] || tints.cyan)[mode]
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
