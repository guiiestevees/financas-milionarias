import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, CalendarRange, Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  LayoutGrid, Loader2, AlertCircle, MapPin, Repeat, Clock, ArrowLeft,
  ListChecks, Settings, Sun, Moon, Sparkles, Check, Trash2, Star, CalendarPlus,
  Folder, FolderPlus, FolderOpen, ChevronDown, MoreVertical, Archive, X, MessageCircle,
} from 'lucide-react'
import { useAgenda } from '../../hooks/useAgenda'
import { useAgendaTasks } from '../../hooks/useAgendaTasks'
import { useAgendaProjects } from '../../hooks/useAgendaProjects'
import { useAgendaTags } from '../../hooks/useAgendaTags'
import { useAgendaCompletions } from '../../hooks/useAgendaCompletions'
import { useTheme } from '../../hooks/useTheme'
import { supabase } from '../../lib/supabase'
import AppSwitcher from '../../components/AppSwitcher'
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
  const tagsHook = useAgendaTags()
  const completionsHook = useAgendaCompletions()

  // Aplica o tema do app (tema único — vale pra Finanças e Agenda).
  useTheme()

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

  // Edita SÓ esta ocorrência de um evento recorrente:
  //  1. Adiciona a data ao skipped_dates do original (pula essa ocorrência)
  //  2. Cria um evento single (recurring='none') com os dados editados
  const handleSaveOccurrence = async (payload) => {
    if (!editing) return
    const { event, occurrenceDate } = editing
    const skipDate = occurrenceDate || event.date
    try {
      // Marca aquela ocorrência como pulada no evento original
      await deleteOccurrence(event.id, skipDate)
      // Cria um evento independente com os novos dados (sem recorrência)
      await createEvent({
        ...payload,
        date: payload.date || skipDate,
        recurring: 'none',
        recurring_weekdays: null,
        ends_at: null,
      })
    } catch (err) {
      console.error('handleSaveOccurrence error:', err)
      throw err
    }
    setEditing(null)
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

  const handleDuplicate = async () => {
    if (!editing) return
    const { event } = editing
    // Cria uma cópia idêntica (mesma data e hora). User pode mover depois.
    await createEvent({
      title: event.title,
      date: event.date,
      time: event.time,
      end_time: event.end_time,
      location: event.location,
      notes: event.notes,
      color: event.color,
      recurring: event.recurring,
      recurring_weekdays: event.recurring_weekdays,
      ends_at: event.ends_at,
      reminder_minutes_before: event.reminder_minutes_before,
    })
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
            </div>
          </div>

          {/* Switcher de apps — Agenda destacada + clique pra ir pra Finanças + botão Menu */}
          <AppSwitcher currentApp="agenda" />
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
                completionsHook={completionsHook}
                onMoveEvent={async (eventId, newTime, newEndTime) => {
                  await updateEvent(eventId, {
                    time: newTime,
                    end_time: newEndTime,
                  })
                }}
              />
            )}
            {tab === 'week' && (
              <WeekView
                weekDates={weekDates}
                weekEvents={weekEvents}
                onClickEvent={(occ) => setEditing(occ)}
                onCreate={(date, time) => setCreating({ initialDate: date, initialTime: time })}
                onJumpToDay={(date) => { setRefDate(date); setTab('day') }}
                onMoveEvent={async (eventId, newDate, newTime, newEndTime) => {
                  await updateEvent(eventId, {
                    date: newDate,
                    time: newTime,
                    end_time: newEndTime,
                  })
                }}
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
                tagsHook={tagsHook}
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
          onSaveOccurrence={handleSaveOccurrence}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
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
function DayView({ events, onClickEvent, onCreate, date, completionsHook, onMoveEvent }) {
  const allDay = events.filter((e) => !e.time)
  const timed = events.filter((e) => !!e.time)
  const todayFlag = isToday(date)

  // Stats de progresso pra dopamina
  const totalCount = events.length
  const doneCount = events.filter((ev) =>
    completionsHook?.isCompleted(ev.id, ev.occurrenceDate)
  ).length
  const allDone = totalCount > 0 && doneCount === totalCount

  // Celebração full-screen quando bate 100% — só dispara UMA vez por dia
  // (usa sessionStorage pra não disparar de novo se navegar e voltar)
  const [showCelebration, setShowCelebration] = useState(false)
  const prevAllDone = useMemo(() => ({ value: false }), []) // ref-like
  useEffect(() => {
    if (allDone && !prevAllDone.value) {
      const key = `agenda:celebrated:${date}`
      if (!sessionStorage.getItem(key)) {
        setShowCelebration(true)
        sessionStorage.setItem(key, '1')
      }
    }
    prevAllDone.value = allDone
  }, [allDone, date, prevAllDone])

  return (
    <div className="space-y-3">
      {showCelebration && (
        <DayCompletedCelebration onDismiss={() => setShowCelebration(false)} />
      )}

      {/* Reflexão do dia — sempre visível, ajuda a tomar direção */}
      <DailyReflection date={date} />

      {/* Barra de progresso (só aparece quando tem eventos) */}
      {totalCount > 0 && (
        <ProgressStrip done={doneCount} total={totalCount} allDone={allDone} />
      )}

      {/* CTA sólido ciano — botão de ação principal */}
      <button
        onClick={() => onCreate(date)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold text-sm transition hover:opacity-90 active:scale-[0.99]"
        style={{
          background: AGENDA_ACCENT,
          color: '#fff',
          boxShadow: '0 8px 20px rgba(6,182,212,0.30)',
        }}
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>Adicionar compromisso</span>
      </button>

      {/* Dia inteiro */}
      {allDay.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
            Dia inteiro
          </div>
          <div className="space-y-1.5">
            {allDay.map((ev) => (
              <EventCard
                key={`${ev.id}:${ev.occurrenceDate}`}
                event={ev}
                onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })}
                completed={completionsHook?.isCompleted(ev.id, ev.occurrenceDate)}
                onToggleComplete={() => completionsHook?.toggleCompletion(ev.id, ev.occurrenceDate)}
              />
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
        completionsHook={completionsHook}
        onMoveEvent={onMoveEvent}
      />
    </div>
  )
}

// Timeline do dia: coluna esquerda com horas + coluna direita com slots
function DayTimeline({ events, date, isToday: todayFlag, onClickEvent, onClickEmpty, completionsHook, onMoveEvent }) {
  // Default: 05h-23h (cobre quem acorda cedo). Expande automático se evento sai fora.
  // User pode forçar madrugada/fim-de-noite com os toggles.
  const [showEarly, setShowEarly] = useState(false)   // 00h-04h
  const [showLate, setShowLate] = useState(false)     // 23h-24h
  const PX_PER_HOUR = 60
  const HOURS_COL_W = 48  // largura da coluna de horas

  // Drag state — só Y (não muda dia)
  const [dragging, setDragging] = useState(null)
  // dragging = { event, durationMin, targetStartMin }
  const timelineRef = useRef(null)
  const lastSnapRef = useRef(null)

  let startHour = showEarly ? 0 : 5
  let endHour = showLate ? 24 : 23
  for (const e of events) {
    const sh = Number(e.time?.slice(0, 2) || 0)
    const eh = e.end_time ? Number(e.end_time.slice(0, 2)) : sh + 1
    if (sh < startHour) startHour = Math.max(0, sh)
    if (eh > endHour) endHour = Math.min(24, eh + 1)
  }
  const totalHours = endHour - startHour
  const totalHeight = totalHours * PX_PER_HOUR

  // Auto-show se algum evento já tá nessa zona (pra botão não aparecer redundante)
  const hasEarlyEvent = startHour < 5
  const hasLateEvent = endHour > 23

  // ===== Drag handlers =====
  const computeTargetMin = (clientY) => {
    if (!timelineRef.current) return null
    const rect = timelineRef.current.getBoundingClientRect()
    const yInGrid = clientY - rect.top
    // Snap em 15min
    const minutesInGrid = Math.max(0, Math.min(totalHours * 60 - SNAP_MIN, (yInGrid / PX_PER_HOUR) * 60))
    const snapped = Math.round(minutesInGrid / SNAP_MIN) * SNAP_MIN
    return startHour * 60 + snapped
  }

  const handleDragStart = (ev, durationMin) => {
    setDragging({ event: ev, durationMin, targetStartMin: null })
    lastSnapRef.current = null
    document.body.style.userSelect = 'none'
    document.body.style.overflow = 'hidden'
    // Bloqueia gesture nativo de scroll touch durante o drag
    document.body.style.touchAction = 'none'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.touchAction = 'none'
  }

  const handlePointerMove = (e) => {
    if (!dragging) return
    // preventDefault só funciona se o listener for non-passive — adicionei { passive: false } abaixo
    if (e.cancelable) e.preventDefault()
    const target = computeTargetMin(e.clientY)
    if (target == null) return
    if (lastSnapRef.current !== target && navigator.vibrate) navigator.vibrate(8)
    lastSnapRef.current = target
    setDragging((prev) => prev && { ...prev, targetStartMin: target })
  }

  const handlePointerUp = async (e) => {
    if (!dragging) return
    document.body.style.userSelect = ''
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
    document.documentElement.style.overflow = ''
    document.documentElement.style.touchAction = ''
    lastSnapRef.current = null
    const target = computeTargetMin(e.clientY)
    setDragging(null)
    if (target == null || !onMoveEvent) return
    const newStartMin = target
    const newEndMin = newStartMin + dragging.durationMin
    const newTime = `${String(Math.floor(newStartMin / 60)).padStart(2, '0')}:${String(newStartMin % 60).padStart(2, '0')}`
    const newEndTime = `${String(Math.floor(newEndMin / 60)).padStart(2, '0')}:${String(newEndMin % 60).padStart(2, '0')}`
    const oldTime = dragging.event.time?.slice(0, 5)
    if (newTime === oldTime) return
    try {
      await onMoveEvent(dragging.event.id, newTime, dragging.event.end_time ? newEndTime : null)
      if (navigator.vibrate) navigator.vibrate(30)
    } catch (err) {
      console.error('Failed to move event:', err)
    }
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e) => handlePointerMove(e)
    const up = (e) => handlePointerUp(e)
    const touchBlocker = (e) => { if (e.cancelable) e.preventDefault() }
    // passive: false permite chamar preventDefault — bloqueia scroll do navegador
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('touchmove', touchBlocker, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('touchmove', touchBlocker)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

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

      {/* Toggle: mostrar madrugada (00h-06h) */}
      {!hasEarlyEvent && (
        <button
          onClick={() => setShowEarly((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] transition hover:bg-white/5"
          style={{
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-soft)',
            background: showEarly ? 'rgba(6,182,212,0.04)' : 'transparent',
          }}
        >
          <span>{showEarly ? '▾' : '▸'}</span>
          <span>{showEarly ? 'Esconder madrugada' : 'Mostrar madrugada (00h–04h)'}</span>
        </button>
      )}

      {/* Indicador flutuante no topo da tela durante drag (reaproveita do semanal) */}
      {dragging && dragging.targetStartMin != null && (
        <DragFloatingIndicator dragging={{
          event: dragging.event,
          durationMin: dragging.durationMin,
          targetDate: date,
          targetStartMin: dragging.targetStartMin,
        }} />
      )}

      {/* Timeline em si */}
      <div ref={timelineRef} className="relative" style={{ height: totalHeight }}>
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
                /* Botão de slot inteiro = hora cheia, snap natural já em 1h */
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
        {eventsWithColumns.map(({ ev, top, height, colStart, colSpan, totalCols, startMin, endMin }) => {
          const colWidth = `calc((100% - ${HOURS_COL_W}px) / ${totalCols})`
          const left = `calc(${HOURS_COL_W}px + ${colStart} * ${colWidth} + 4px)`
          const width = `calc(${colSpan} * ${colWidth} - 8px)`
          const isDragging = dragging?.event?.id === ev.id
          return (
            <TimelineEvent
              key={`${ev.id}:${ev.occurrenceDate}`}
              event={ev}
              top={top}
              height={height}
              left={left}
              width={width}
              durationMin={endMin - startMin}
              onClick={() => onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })}
              completed={completionsHook?.isCompleted(ev.id, ev.occurrenceDate)}
              onToggleComplete={() => completionsHook?.toggleCompletion(ev.id, ev.occurrenceDate)}
              onDragStart={() => handleDragStart(ev, endMin - startMin)}
              isDragging={isDragging}
            />
          )
        })}

        {/* Linha guia + ghost durante drag */}
        {dragging && dragging.targetStartMin != null && (
          <DayDragGuide
            dragging={dragging}
            startHour={startHour}
            pxPerHour={PX_PER_HOUR}
            hoursColWidth={HOURS_COL_W}
          />
        )}
      </div>

      {/* Toggle: mostrar fim da noite (23h-24h) */}
      {!hasLateEvent && (
        <button
          onClick={() => setShowLate((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] transition hover:bg-white/5"
          style={{
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-soft)',
            background: showLate ? 'rgba(6,182,212,0.04)' : 'transparent',
          }}
        >
          <span>{showLate ? '▴' : '▸'}</span>
          <span>{showLate ? 'Esconder fim da noite' : 'Mostrar fim da noite (23h–00h)'}</span>
        </button>
      )}
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

function TimelineEvent({ event, top, height, left, width, onClick, completed, onToggleComplete, onDragStart, isDragging, durationMin }) {
  const colorKey = event.color || 'cyan'
  const colorVar = `var(--accent-${colorKey})`
  const tintBg = getColorTint(colorKey, 'bg')
  const tintBorder = getColorTint(colorKey, 'border')
  const compact = height < 50
  const [burst, setBurst] = useState(false)
  const [glow, setGlow] = useState(false)
  const [pressing, setPressing] = useState(false)

  const pressTimer = useRef(null)
  const pressStarted = useRef(null)

  const cleanupPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    pressStarted.current = null
    setPressing(false)
  }

  // Long-press na barra lateral (ou no conteúdo se não tiver onDragStart) → inicia drag
  const handleEventPointerDown = (e) => {
    if (!onDragStart) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()
    pressStarted.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    setPressing(true)
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(20)
      onDragStart()
      cleanupPress()
    }, LONG_PRESS_MS)
  }

  const handleEventPointerMove = (e) => {
    if (!pressStarted.current) return
    const dx = Math.abs(e.clientX - pressStarted.current.x)
    const dy = Math.abs(e.clientY - pressStarted.current.y)
    if (dx > 8 || dy > 8) cleanupPress()
  }

  const handleEventPointerUp = (e) => {
    const started = pressStarted.current
    cleanupPress()
    if (!started) return
    const elapsed = Date.now() - started.time
    const dx = Math.abs(e.clientX - started.x)
    const dy = Math.abs(e.clientY - started.y)
    // Click curto sem movimento → abre modal
    if (elapsed < LONG_PRESS_MS && dx < 5 && dy < 5) {
      e.stopPropagation()
      onClick?.()
    }
  }

  const handleCheck = (e) => {
    e.stopPropagation()
    const wasCompleted = completed
    onToggleComplete?.()
    if (!wasCompleted) {
      // Marcou como concluído → festa!
      setBurst(true)
      setGlow(true)
      setTimeout(() => setBurst(false), 1100)
      setTimeout(() => setGlow(false), 700)
      // Vibração padrão "vitória" — 3 pulsos crescentes
      if (navigator.vibrate) navigator.vibrate([20, 30, 30, 30, 50])
    }
  }

  return (
    <div
      className="absolute"
      style={{
        top, height, left, width,
        transition: 'opacity 0.3s, transform 0.15s',
        opacity: isDragging ? 0.35 : 1,
        transform: pressing ? 'scale(1.03)' : 'scale(1)',
        zIndex: pressing ? 25 : 'auto',
      }}
    >
      {/* CARD */}
      <div
        onPointerDown={handleEventPointerDown}
        onPointerMove={handleEventPointerMove}
        onPointerUp={handleEventPointerUp}
        onPointerCancel={cleanupPress}
        className="absolute inset-0 rounded-lg overflow-hidden flex select-none"
        style={{
          background: tintBg,
          border: `1px solid ${tintBorder}`,
          opacity: completed ? 0.55 : 1,
          transition: 'opacity 0.4s ease, box-shadow 0.15s',
          animation: glow ? 'cardGlow 0.7s ease-out' : 'none',
          boxShadow: pressing
            ? `0 6px 20px ${tintBorder}, 0 0 0 2px ${colorVar}`
            : 'none',
          // pan-y permite scroll vertical do navegador, mas long-press (sem mov) ainda funciona
          // Se começar a scrollar, pointercancel dispara e cleanupPress aborta o timer
          touchAction: onDragStart ? 'pan-y' : 'auto',
          cursor: onDragStart ? 'grab' : 'pointer',
        }}
      >
        {/* Barra colorida lateral */}
        <div style={{ width: 4, background: colorVar, flexShrink: 0 }} />

        {/* Conteúdo (clique abre modal via handler do parent) */}
        <div
          className="flex-1 min-w-0 px-2 py-1 text-left"
          style={{ paddingRight: compact ? 36 : 44 }}
        >
          <div
            className={`font-medium ${compact ? 'text-[11px] truncate' : 'text-xs'}`}
            style={{
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              textDecoration: completed ? 'line-through' : 'none',
              textDecorationColor: colorVar,
              textDecorationThickness: '1.5px',
            }}
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

        {/* CHECK — integrado dentro do card, à direita, centralizado verticalmente */}
        <button
          onClick={handleCheck}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 bottom-0 flex items-center justify-center transition active:scale-90 z-20"
          style={{
            width: compact ? 36 : 44,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            // Bloqueia long-press do parent quando dedo está no check
            touchAction: 'manipulation',
          }}
          title={completed ? 'Marcar como não concluído' : 'Marcar como concluído'}
        >
          <span
            className="flex items-center justify-center transition-all"
            style={{
              width: compact ? 22 : 28,
              height: compact ? 22 : 28,
              borderRadius: '50%',
              border: completed
                ? `2px solid ${colorVar}`
                : `2px solid ${getColorTint(colorKey, 'border')}`,
              background: completed ? colorVar : 'var(--bg-elev1)',
              boxShadow: completed
                ? `0 0 0 3px ${getColorTint(colorKey, 'bg')}, 0 2px 8px ${getColorTint(colorKey, 'border')}`
                : `0 1px 3px rgba(0,0,0,0.10)`,
              animation: burst ? 'checkPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            }}
          >
            {completed && <Check size={compact ? 13 : 17} color="#fff" strokeWidth={3.5} />}
          </span>
        </button>
      </div>

      {/* Confete em volta do check — overflow visível */}
      {burst && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            right: compact ? 18 : 22,
            transform: 'translate(50%, -50%)',
            width: 80,
            height: 80,
          }}
        >
          <CompletionBurst colorVar={colorVar} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// CompletionBurst — confete dopaminérgico (flash + 15 particles + emoji)
// Sem posicionamento próprio: quem chama posiciona com absolute.
// ============================================================
function CompletionBurst({ colorVar }) {
  // Gera partículas espalhadas em 360° em 2 anéis (perto e longe)
  const particles = [
    // Anel interno (mais rápido, mais perto)
    { x: 0, y: -22, c: '#fbbf24', s: 5, delay: 0 },
    { x: 19, y: -11, c: colorVar, s: 4, delay: 10 },
    { x: 19, y: 11, c: '#10b981', s: 5, delay: 20 },
    { x: 0, y: 22, c: '#f43f5e', s: 4, delay: 30 },
    { x: -19, y: 11, c: '#8b5cf6', s: 5, delay: 40 },
    { x: -19, y: -11, c: '#06b6d4', s: 4, delay: 50 },
    // Anel externo (mais lentos, vão mais longe — sensação de profundidade)
    { x: 10, y: -32, c: '#fbbf24', s: 3, delay: 60 },
    { x: 32, y: -8, c: '#f43f5e', s: 3, delay: 70 },
    { x: 26, y: 22, c: '#10b981', s: 3, delay: 80 },
    { x: 0, y: 36, c: '#8b5cf6', s: 3, delay: 90 },
    { x: -26, y: 22, c: '#fbbf24', s: 3, delay: 100 },
    { x: -32, y: -8, c: colorVar, s: 3, delay: 110 },
    { x: -10, y: -32, c: '#f43f5e', s: 3, delay: 120 },
    // Stars pra dar vibe especial
    { x: 28, y: 0, c: '#fde047', s: 4, delay: 90, isStar: true },
    { x: -28, y: 0, c: '#fde047', s: 4, delay: 90, isStar: true },
  ]
  return (
    <>
      {/* Flash radial — onda de luz saindo do centro */}
      <span
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colorVar} 0%, transparent 70%)`,
          animation: 'radialFlash 0.55s ease-out forwards',
        }}
      />

      {/* Partículas explodindo */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            width: p.s,
            height: p.s,
            borderRadius: p.isStar ? '20%' : '50%',
            background: p.c,
            transform: 'translate(-50%, -50%)',
            animation: 'burstParticle 1.0s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            animationDelay: `${p.delay}ms`,
            boxShadow: `0 0 6px ${p.c}`,
            ['--burst-x']: `${p.x}px`,
            ['--burst-y']: `${p.y}px`,
          }}
        />
      ))}

      {/* "+1 ✨" subindo */}
      <span
        className="absolute pointer-events-none whitespace-nowrap"
        style={{
          top: -4,
          left: '50%',
          transform: 'translate(-50%, 0)',
          fontSize: 12,
          fontWeight: 800,
          color: colorVar,
          textShadow: `0 2px 8px ${colorVar}, 0 0 20px color-mix(in srgb, ${colorVar} 40%, transparent)`,
          animation: 'floatUp 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '-0.02em',
        }}
      >
        +1 ✨
      </span>
    </>
  )
}

// Mensagens motivacionais sorteadas pra quando bate 100% do dia
const DAY_COMPLETE_MESSAGES = [
  { emoji: '🎉', title: 'Você completou o dia', sub: 'Excelente.' },
  { emoji: '🏆', title: 'Dia conquistado', sub: 'Continue assim.' },
  { emoji: '🚀', title: 'Tudo riscado', sub: 'Que disciplina admirável.' },
  { emoji: '⭐', title: 'Missão cumprida', sub: 'Você se honrou.' },
  { emoji: '🎩', title: 'Impecável', sub: 'Permita-me parabenizá-lo.' },
  { emoji: '💎', title: 'Brilhante', sub: 'Cada compromisso, honrado.' },
  { emoji: '🔥', title: 'Em chamas', sub: 'Sua consistência é rara.' },
]

// Mensagem celebratória full-card quando bate 100%
function DayCompletedCelebration({ onDismiss }) {
  const [exiting, setExiting] = useState(false)
  const message = useMemo(
    () => DAY_COMPLETE_MESSAGES[Math.floor(Math.random() * DAY_COMPLETE_MESSAGES.length)],
    []
  )

  // Auto-dismiss em 3.5s (mas user pode fechar antes)
  useEffect(() => {
    const t = setTimeout(() => handleDismiss(), 3500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss?.(), 280)
  }

  // Confete fullscreen (40 peças caindo de cima)
  const confetti = useMemo(() => {
    const list = []
    const colors = ['#fbbf24', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#fde047', '#ec4899', '#3b82f6']
    for (let i = 0; i < 40; i++) {
      list.push({
        left: Math.random() * 100,
        delay: Math.random() * 800,
        duration: 1500 + Math.random() * 1500,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: 360 + Math.random() * 720,
        size: 5 + Math.random() * 6,
        shape: Math.random() > 0.5 ? '50%' : '20%',
      })
    }
    return list
  }, [])

  return (
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        animation: exiting ? 'celebrateOut 0.28s ease forwards' : 'none',
      }}
    >
      {/* Confete caindo */}
      {confetti.map((c, i) => (
        <span
          key={i}
          className="fixed top-0 pointer-events-none"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: c.shape,
            boxShadow: `0 0 4px ${c.color}`,
            animation: `confettiFall ${c.duration}ms cubic-bezier(0.4, 0.0, 0.6, 1) forwards`,
            animationDelay: `${c.delay}ms`,
            ['--rot']: `${c.rot}deg`,
          }}
        />
      ))}

      {/* Card central com mensagem */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative rounded-3xl p-8 text-center max-w-sm w-full"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(6,182,212,0.95))',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 30px 60px rgba(16,185,129,0.45), 0 0 0 1px rgba(255,255,255,0.1)',
          animation: 'celebrateIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          position: 'absolute',
        }}
      >
        <div className="text-7xl mb-3" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
          {message.emoji}
        </div>
        <h2
          style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 500,
            color: '#fff',
            letterSpacing: '-0.02em',
          }}
          className="text-3xl mb-2"
        >
          {message.title}
        </h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {message.sub}
        </p>
        <button
          onClick={handleDismiss}
          className="mt-5 px-5 py-2 rounded-full text-xs font-semibold transition hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.95)',
            color: '#10b981',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

// ============================================================
// DailyReflection — perguntas pra direcionar o dia
// 15 perguntas, ordem semi-aleatória (seedada pela data — mesma sequência
// se reabrir o mesmo dia, sequência diferente em dias diferentes)
// ============================================================
const REFLECTIONS = [
  'Qual a tarefa que posso fazer hoje que mais me aproxima da realidade que eu quero viver?',
  'Se eu fosse uma pessoa com permissão alta e sem bloqueios pra prosperar, qual seria a principal atividade do meu dia?',
  'Qual atividade estou adiando hoje que vai me levar pro próximo nível?',
  'Se eu pudesse fazer apenas UMA única coisa hoje que mais traria resultados, qual seria?',
  'O que estou evitando fazer hoje porque tenho medo de errar?',
  'Qual ação de hoje me aproxima do meu objetivo financeiro de longo prazo?',
  'Estou focando em tarefas que geram riqueza ou apenas em tarefas que me deixam ocupado?',
  'Qual tarefa eu estou adiando porque exige coragem, exposição ou decisão? Mas que vai me ajudar a prosperar.',
  'Estou construindo algo escalável ou apenas criando mais trabalho para mim mesmo?',
  'Se eu tivesse 1 hora de foco total hoje, em que eu aplicaria essa hora?',
  'O que eu posso delegar, automatizar ou eliminar hoje?',
  'O que meu "eu mais rico e disciplinado" consideraria a atividade mais importante de hoje?',
  'Qual a tarefa que parece pequena, mas tem um impacto desproporcional?',
  'Quais são as 3 tarefas essenciais de hoje, em ordem de prioridade?',
  'Qual ação de hoje têm maior chance de colocar dinheiro no meu bolso de forma recorrente e escalar?',
  'Qual tarefa é desconfortável, mas pode mudar o jogo?',
]

// Hash determinístico simples — mesma date sempre gera mesma sequência
function seedShuffle(arr, seed) {
  const out = [...arr]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const j = h % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function DailyReflection({ date }) {
  const ordered = useMemo(() => seedShuffle(REFLECTIONS, date), [date])
  const [idx, setIdx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const next = () => {
    setTransitioning(true)
    setTimeout(() => {
      setIdx((i) => (i + 1) % ordered.length)
      setTransitioning(false)
    }, 180)
  }

  return (
    <div
      className="relative rounded-3xl p-5 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(6,182,212,0.08) 60%, rgba(139,92,246,0.10))',
        border: '1px solid rgba(212,175,55,0.25)',
      }}
    >
      {/* Glow decorativo */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'var(--accent-gold)' }}
      />
      <div
        className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: AGENDA_ACCENT }}
      />

      <div className="relative">
        {/* Selo */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)',
                color: '#fff',
                boxShadow: '0 4px 8px rgba(212,175,55,0.30)',
              }}
            >
              <Sparkles size={14} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--accent-gold)' }}>
                Reflexão do dia
              </div>
              <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                pergunta {idx + 1} de {ordered.length} · pra direcionar suas escolhas
              </div>
            </div>
          </div>
          <button
            onClick={next}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(212,175,55,0.15)',
              color: 'var(--accent-gold)',
              border: '1px solid rgba(212,175,55,0.30)',
            }}
            title="Próxima reflexão"
          >
            outra <ChevronRight size={11} />
          </button>
        </div>

        {/* A pergunta — destaque tipográfico */}
        <p
          style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 400,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.35,
            fontStyle: 'italic',
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
          className="text-lg sm:text-xl"
        >
          {ordered[idx]}
        </p>

        {/* Dica sutil */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          <div className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>
            🎩 Use isso pra decidir o que fazer primeiro hoje.
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// WeeklyReflection — perguntas focadas em direção e enriquecimento
// pra usar na aba Semana. Mesma estrutura visual da DailyReflection.
// ============================================================
const WEEKLY_REFLECTIONS = [
  'Se todas as profissões e negócios recebessem o mesmo salário, qual trabalho eu teria?',
  'Que ação consistente, repetida nos próximos 7 dias, mudaria meu jogo financeiro?',
  'Se essa semana o meu eu mais rico e próspero estivesse no comando, o que ele faria?',
  'Se eu só pudesse conquistar uma coisa nesta semana, o que mais mudaria meu jogo?',
  'Que oportunidade de crescimento eu estou ignorando por falta de permissão?',
  'O que eu posso criar uma vez e vender muitas vezes depois?',
  'Qual tarefa eu chamo de "estratégia", mas na verdade é procrastinação disfarçada?',
  'Quais são as 3 prioridades reais da semana?',
  'Qual atitude simples que posso fazer e gerar resultados extraordinários?',
  'O que eu posso construir nesta semana que continuará me trazendo resultado depois que estiver pronto?',
  'Se eu soubesse que ninguém iria me julgar, qual ação eu teria coragem de tomar?',
  'Se eu tivesse certeza de que daria certo, qual projeto eu começaria ou aceleraria agora?',
  'Se eu não tivesse medo de receber um "não", quem eu chamaria para conversar?',
  'Que tipo de parceria posso fazer que alavancaria meus negócios?',
  'Qual decisão o meu eu milionário acharia óbvia, mas eu ainda estou adiando?',
  'Onde eu estou sendo ambicioso em pensamento, mas tímido na execução?',
]

function WeeklyReflection({ weekSeed }) {
  const ordered = useMemo(() => seedShuffle(WEEKLY_REFLECTIONS, weekSeed), [weekSeed])
  const [idx, setIdx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const next = () => {
    setTransitioning(true)
    setTimeout(() => {
      setIdx((i) => (i + 1) % ordered.length)
      setTransitioning(false)
    }, 180)
  }

  return (
    <div
      className="relative rounded-3xl p-5 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(6,182,212,0.08) 60%, rgba(139,92,246,0.10))',
        border: '1px solid rgba(212,175,55,0.25)',
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: 'var(--accent-gold)' }}
      />
      <div
        className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: AGENDA_ACCENT }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)',
                color: '#fff',
                boxShadow: '0 4px 8px rgba(212,175,55,0.30)',
              }}
            >
              <Sparkles size={14} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--accent-gold)' }}>
                Direção da semana
              </div>
              <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                pergunta {idx + 1} de {ordered.length} · pra crescer e enriquecer
              </div>
            </div>
          </div>
          <button
            onClick={next}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-full transition hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(212,175,55,0.15)',
              color: 'var(--accent-gold)',
              border: '1px solid rgba(212,175,55,0.30)',
            }}
            title="Próxima reflexão"
          >
            outra <ChevronRight size={11} />
          </button>
        </div>

        <p
          style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 400,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.35,
            fontStyle: 'italic',
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
          className="text-lg sm:text-xl"
        >
          {ordered[idx]}
        </p>

        <div className="flex items-center justify-between gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
          <div className="text-[10px] italic" style={{ color: 'var(--text-tertiary)' }}>
            🎩 Use isso pra decidir onde colocar foco nos próximos 7 dias.
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ProgressStrip — barra de progresso satisfatória no topo do Dia
// ============================================================
function ProgressStrip({ done, total, allDone }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div
      className="rounded-2xl px-4 py-3 transition-all"
      style={{
        background: allDone
          ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.25))'
          : 'var(--bg-elev2)',
        border: `1px solid ${allDone ? 'rgba(16,185,129,0.40)' : 'var(--border-soft)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {allDone ? (
            <>
              <span className="text-base">🎉</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-emerald)' }}>
                Você completou o dia. Excelente.
              </span>
            </>
          ) : (
            <>
              <span className="text-base">🎯</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {done} de {total} {total === 1 ? 'compromisso' : 'compromissos'} concluído{done === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: allDone ? 'var(--accent-emerald)' : AGENDA_ACCENT, fontFamily: 'JetBrains Mono, monospace' }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elev1)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: allDone
              ? 'linear-gradient(90deg, #34d399, #10b981)'
              : `linear-gradient(90deg, #67e8f9, ${AGENDA_ACCENT})`,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 8px ${allDone ? 'rgba(16,185,129,0.5)' : 'rgba(6,182,212,0.5)'}`,
          }}
        />
      </div>
    </div>
  )
}

// ============================================================
// WEEK VIEW — Foco em tempo livre + visão panorâmica
// "Dia útil" considerado: 06h-23h (17h de janela disponível)
// ============================================================
const WEEK_DAY_START_H = 6
const WEEK_DAY_END_H = 23
const WEEK_DAILY_AVAILABLE_MIN = (WEEK_DAY_END_H - WEEK_DAY_START_H) * 60  // 1020 min

function WeekView({ weekDates, weekEvents, onClickEvent, onCreate, onJumpToDay, onMoveEvent }) {
  // Calcula janelas livres e estatísticas por dia (ainda usado pela grade)
  const weekAnalysis = useMemo(() => analyzeWeek(weekDates, weekEvents), [weekDates, weekEvents])

  // Identificador da semana pra seedar a ordem das reflexões
  const weekSeed = weekDates[0] || ''

  return (
    <div className="space-y-4">
      {/* Reflexão semanal — direção pra foco e enriquecimento */}
      <WeeklyReflection weekSeed={weekSeed} />

      {/* GRADE PANORÂMICA — 7 colunas verticais (drag & drop) */}
      <WeekPanoramicGrid
        weekDates={weekDates}
        weekEvents={weekEvents}
        analysis={weekAnalysis}
        onClickEvent={onClickEvent}
        onJumpToDay={onJumpToDay}
        onCreate={onCreate}
        onMoveEvent={onMoveEvent}
      />
    </div>
  )
}

// ============================================================
// Análise da semana — calcula tempo livre, janelas, etc
// ============================================================
function analyzeWeek(weekDates, weekEvents) {
  const days = weekDates.map((date) => {
    const events = (weekEvents[date] || [])
      .filter((e) => !!e.time)
      .map((e) => {
        const sh = Number(e.time.slice(0, 2))
        const sm = Number(e.time.slice(3, 5)) || 0
        const eh = e.end_time ? Number(e.end_time.slice(0, 2)) : sh + 1
        const em = e.end_time ? (Number(e.end_time.slice(3, 5)) || 0) : 0
        return {
          ev: e,
          startMin: Math.max(0, sh * 60 + sm),
          endMin: Math.min(24 * 60, eh * 60 + em),
        }
      })
      .filter((e) => e.endMin > e.startMin)
      .sort((a, b) => a.startMin - b.startMin)

    // Mescla sobreposições pra calcular tempo ocupado real
    const merged = []
    for (const e of events) {
      const last = merged[merged.length - 1]
      if (last && e.startMin <= last.endMin) {
        last.endMin = Math.max(last.endMin, e.endMin)
      } else {
        merged.push({ startMin: e.startMin, endMin: e.endMin })
      }
    }

    // Tempo ocupado total
    let busyMin = 0
    for (const m of merged) busyMin += m.endMin - m.startMin

    // Janelas livres dentro do "dia útil" (06h-23h)
    const dayStart = WEEK_DAY_START_H * 60
    const dayEnd = WEEK_DAY_END_H * 60
    const gaps = []
    let cursor = dayStart
    for (const m of merged) {
      if (m.endMin <= dayStart) continue
      if (m.startMin >= dayEnd) break
      const gStart = Math.max(cursor, dayStart)
      const gEnd = Math.min(m.startMin, dayEnd)
      if (gEnd > gStart) gaps.push({ date: '', startMin: gStart, endMin: gEnd })
      cursor = Math.max(cursor, m.endMin)
    }
    if (cursor < dayEnd) gaps.push({ date: '', startMin: Math.max(cursor, dayStart), endMin: dayEnd })

    // Considera dia útil clamped pra calcular livre
    const busyWithinDay = Math.min(busyMin, WEEK_DAILY_AVAILABLE_MIN) // approx
    const freeMin = Math.max(0, WEEK_DAILY_AVAILABLE_MIN - gaps.reduce((s, g) => s, 0) === 0 ? 0 : 0)
    // (recalcula direto dos gaps pra ser mais preciso)
    const realFreeMin = gaps.reduce((s, g) => s + (g.endMin - g.startMin), 0)

    return {
      date,
      events,         // [{ev, startMin, endMin}]
      merged,         // intervalos ocupados mesclados
      busyMin,
      freeMin: realFreeMin,
      gaps: gaps.map((g) => ({ ...g, date })),
    }
  })

  // Total semana
  const totalBusyMin = days.reduce((s, d) => s + d.busyMin, 0)
  const totalFreeMin = days.reduce((s, d) => s + d.freeMin, 0)

  // Top 3 melhores janelas livres (maiores)
  const allGaps = days.flatMap((d) => d.gaps).filter((g) => (g.endMin - g.startMin) >= 60)  // só >= 1h
  allGaps.sort((a, b) => (b.endMin - b.startMin) - (a.endMin - a.startMin))
  const bestSlots = allGaps.slice(0, 4)

  return {
    days,
    totalBusyMin,
    totalFreeMin,
    bestSlots,
  }
}

// ============================================================
// Hero — tempo livre em destaque dramático
// ============================================================
function WeekFreeTimeHero({ analysis }) {
  const { totalFreeMin, totalBusyMin } = analysis
  const totalAvailable = analysis.days.length * WEEK_DAILY_AVAILABLE_MIN
  const freePct = totalAvailable > 0 ? Math.round((totalFreeMin / totalAvailable) * 100) : 0

  const freeHours = Math.floor(totalFreeMin / 60)
  const freeMins = totalFreeMin % 60
  const busyHours = Math.floor(totalBusyMin / 60)
  const busyMins = totalBusyMin % 60

  const fmtTime = (h, m) => m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`

  return (
    <div
      className="rounded-3xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(6,182,212,0.10) 60%, rgba(16,185,129,0.18))',
        border: '1px solid rgba(16,185,129,0.30)',
      }}
    >
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: 'var(--accent-emerald)' }}
      />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: 'var(--accent-emerald)' }}>
          🌿 Você tem disponível
        </div>
        <div className="flex items-baseline gap-2">
          <span
            style={{
              fontFamily: 'Fraunces, serif',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}
            className="text-5xl leading-none"
          >
            {fmtTime(freeHours, freeMins)}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            livres essa semana
          </span>
        </div>

        {/* Barra de progresso livre vs ocupado */}
        <div className="mt-4 relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${100 - freePct}%`,
              background: `linear-gradient(90deg, ${AGENDA_ACCENT}, ${AGENDA_ACCENT}cc)`,
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5 text-[10px]">
          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: AGENDA_ACCENT }} />
            {fmtTime(busyHours, busyMins)} ocupadas ({100 - freePct}%)
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--accent-emerald)' }}>
            {freePct}% livre
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-emerald)' }} />
          </span>
        </div>

        <div className="mt-3 pt-3 text-[10px] italic" style={{ color: 'var(--text-tertiary)', borderTop: '1px solid rgba(16,185,129,0.15)' }}>
          🎩 Considerando dia útil de 06h às 23h (17h por dia · 119h na semana).
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Best Slots — top janelas livres maiores
// ============================================================
function WeekBestSlots({ slots, onCreate }) {
  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-2xl p-4 text-center"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          📅 Semana cheia — sem janelas grandes livres (1h+)
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Sparkles size={12} style={{ color: AGENDA_ACCENT }} />
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: AGENDA_ACCENT }}>
          Melhores janelas livres
        </div>
        <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot, i) => (
          <SlotCard key={i} slot={slot} onCreate={onCreate} highlighted={i === 0} />
        ))}
      </div>
    </div>
  )
}

function SlotCard({ slot, onCreate, highlighted }) {
  const d = parseISODate(slot.date)
  const todayFlag = isToday(slot.date)
  const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()]
  const durMin = slot.endMin - slot.startMin
  const h = Math.floor(durMin / 60)
  const m = durMin % 60
  const durStr = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
  const startTime = `${String(Math.floor(slot.startMin / 60)).padStart(2, '0')}:${String(slot.startMin % 60).padStart(2, '0')}`
  const endTime = `${String(Math.floor(slot.endMin / 60)).padStart(2, '0')}:${String(slot.endMin % 60).padStart(2, '0')}`

  return (
    <button
      onClick={() => onCreate(slot.date, startTime)}
      className="text-left rounded-2xl p-3 transition hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
      style={{
        background: highlighted
          ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.18))'
          : 'var(--bg-elev2)',
        border: `1px solid ${highlighted ? 'rgba(16,185,129,0.35)' : 'var(--border-soft)'}`,
      }}
    >
      {highlighted && (
        <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
          style={{ background: 'var(--accent-emerald)', color: '#fff' }}>
          maior
        </div>
      )}
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: highlighted ? 'var(--accent-emerald)' : 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {durStr}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          livre
        </span>
      </div>
      <div className="text-xs mt-1.5" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
        {todayFlag ? 'Hoje' : dayName}
        <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>
          {' '} · {String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="text-[10px] tabular-nums mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
        {startTime}–{endTime}
      </div>
      <div className="text-[9px] mt-2 inline-flex items-center gap-1" style={{ color: AGENDA_ACCENT }}>
        <Plus size={9} /> agendar nessa janela
      </div>
    </button>
  )
}

// ============================================================
// Grade Panorâmica — 7 colunas verticais com timeline GRANDE + DRAG & DROP
// Mobile: scroll horizontal pra ver toda semana (coluna fixa de horas)
// Long-press num evento → entra em modo arrastar; solta → muda dia/hora.
// ============================================================
const SNAP_MIN = 15           // snap em 15min
const LONG_PRESS_MS = 350     // tempo pra ativar drag

function WeekPanoramicGrid({ weekDates, weekEvents, analysis, onClickEvent, onJumpToDay, onCreate, onMoveEvent }) {
  const PX_PER_HOUR = 56
  const totalHours = WEEK_DAY_END_H - WEEK_DAY_START_H  // 17h
  const gridHeight = totalHours * PX_PER_HOUR  // 952px
  const COL_WIDTH = 110
  const HOURS_COL_WIDTH = 44
  const COL_GAP = 4  // gap entre colunas

  // Drag state
  const [dragging, setDragging] = useState(null)
  // dragging = { event, originalDate, durationMin, pointerY, pointerX, targetDate, targetStartMin, targetColIdx }

  const gridRef = useRef(null)
  const columnsContainerRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const lastSnapRef = useRef(null)  // pra detectar mudança de slot e vibrar
  const autoScrollRef = useRef(null)

  // Linhas de hora a cada 1h
  const allHours = []
  for (let h = WEEK_DAY_START_H; h <= WEEK_DAY_END_H; h++) allHours.push(h)

  // Calcula target date+time baseado em posição do pointer.
  // O columnsContainerRef agora aponta pro GRID inteiro (inclui col de horas).
  // Precisa descontar: padding-left (8) + HOURS_COL_WIDTH (44) + COL_GAP (4) = 56
  // pra chegar no início da PRIMEIRA coluna de dia.
  const GRID_PADDING_LEFT = 8  // px-2
  const GRID_PADDING_TOP = 4   // pt-1
  const COLS_OFFSET_X = GRID_PADDING_LEFT + HOURS_COL_WIDTH + COL_GAP

  const computeTarget = (clientX, clientY) => {
    if (!columnsContainerRef.current) return null
    const rect = columnsContainerRef.current.getBoundingClientRect()
    const xInCols = clientX - rect.left - COLS_OFFSET_X
    const yInGrid = clientY - rect.top - GRID_PADDING_TOP
    // Detecta coluna pelo X
    const colIdx = Math.max(0, Math.min(6, Math.floor((xInCols + COL_GAP / 2) / (COL_WIDTH + COL_GAP))))
    // Detecta hora pelo Y (snap em SNAP_MIN)
    const minutesInGrid = Math.max(0, Math.min(totalHours * 60 - SNAP_MIN, (yInGrid / PX_PER_HOUR) * 60))
    const snapped = Math.round(minutesInGrid / SNAP_MIN) * SNAP_MIN
    const targetStartMin = WEEK_DAY_START_H * 60 + snapped
    return {
      targetDate: weekDates[colIdx],
      targetColIdx: colIdx,
      targetStartMin,
    }
  }

  // Auto-scroll horizontal quando drag chega nas bordas
  const handleAutoScroll = (clientX) => {
    if (!scrollContainerRef.current) return
    const rect = scrollContainerRef.current.getBoundingClientRect()
    const margin = 60  // zona de auto-scroll
    let dx = 0
    if (clientX < rect.left + margin) {
      dx = -((rect.left + margin - clientX) / margin) * 8  // até 8px/frame
    } else if (clientX > rect.right - margin) {
      dx = ((clientX - (rect.right - margin)) / margin) * 8
    }
    if (dx !== 0) {
      scrollContainerRef.current.scrollLeft += dx
    }
  }

  // Handlers de drag
  const handleDragStart = (ev, durationMin, originalDate) => {
    setDragging({
      event: ev,
      originalDate,
      durationMin,
      targetDate: originalDate,
      targetStartMin: null,
    })
    lastSnapRef.current = null
    // Bloqueia scroll do body/html e touch gestures durante o drag
    document.body.style.userSelect = 'none'
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.touchAction = 'none'
  }

  const handlePointerMove = (e) => {
    if (!dragging) return
    if (e.cancelable) e.preventDefault()
    const target = computeTarget(e.clientX, e.clientY)
    if (!target) return

    // Vibração sutil quando muda de slot (15min ou de dia)
    const snapKey = `${target.targetDate}:${target.targetStartMin}`
    if (lastSnapRef.current && lastSnapRef.current !== snapKey && navigator.vibrate) {
      navigator.vibrate(8)
    }
    lastSnapRef.current = snapKey

    setDragging((prev) => prev && { ...prev, ...target, pointerX: e.clientX, pointerY: e.clientY })
    handleAutoScroll(e.clientX)
  }

  const handlePointerUp = async (e) => {
    if (!dragging) return
    document.body.style.userSelect = ''
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
    document.documentElement.style.overflow = ''
    document.documentElement.style.touchAction = ''
    lastSnapRef.current = null
    const finalTarget = computeTarget(e.clientX, e.clientY)
    setDragging(null)
    if (!finalTarget || !onMoveEvent) return

    const { targetDate, targetStartMin } = finalTarget
    const targetEndMin = targetStartMin + dragging.durationMin
    const newTime = `${String(Math.floor(targetStartMin / 60)).padStart(2, '0')}:${String(targetStartMin % 60).padStart(2, '0')}`
    const newEndTime = `${String(Math.floor(targetEndMin / 60)).padStart(2, '0')}:${String(targetEndMin % 60).padStart(2, '0')}`

    // Se nada mudou, não chama API
    const oldTime = dragging.event.time?.slice(0, 5)
    if (targetDate === dragging.originalDate && newTime === oldTime) return

    try {
      await onMoveEvent(dragging.event.id, targetDate, newTime, dragging.event.end_time ? newEndTime : null)
      if (navigator.vibrate) navigator.vibrate(30)
    } catch (err) {
      console.error('Failed to move event:', err)
    }
  }

  // Listeners globais durante drag
  useEffect(() => {
    if (!dragging) return
    const move = (e) => handlePointerMove(e)
    const up = (e) => handlePointerUp(e)
    const touchBlocker = (e) => { if (e.cancelable) e.preventDefault() }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('touchmove', touchBlocker, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('touchmove', touchBlocker)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Clock size={12} style={{ color: AGENDA_ACCENT }} />
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: AGENDA_ACCENT }}>
          Panorama 06h–23h
        </div>
        <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
        <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          segure pra mover compromisso · arraste pro lado →
        </div>
      </div>

      {/* Overlay GIGANTE flutuante no topo da tela durante drag */}
      {dragging && dragging.targetStartMin != null && (
        <DragFloatingIndicator dragging={dragging} />
      )}

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
      >
        {/* Scroll horizontal container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ minWidth: HOURS_COL_WIDTH + (COL_WIDTH * 7) + (COL_GAP * 7) + 16 }}>
            {/* Headers dos dias — CSS Grid pra garantir alinhamento perfeito com a grade abaixo */}
            <div
              className="sticky top-0 z-30 px-2 pt-2 pb-2"
              style={{
                background: 'var(--bg-elev2)',
                borderBottom: '1px solid var(--border-soft)',
                display: 'grid',
                gridTemplateColumns: `${HOURS_COL_WIDTH}px repeat(7, ${COL_WIDTH}px)`,
                gap: COL_GAP,
              }}
            >
              <div /> {/* placeholder da coluna de horas */}
              {weekDates.map((date) => {
                const d = parseISODate(date)
                const todayFlag = isToday(date)
                const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()]
                const dayStats = analysis.days.find((dd) => dd.date === date)
                const freeHours = Math.floor((dayStats?.freeMin || 0) / 60)
                const freeMinsRem = (dayStats?.freeMin || 0) % 60
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <button
                    key={date}
                    onClick={() => onJumpToDay?.(date)}
                    className="flex flex-col items-center justify-center rounded-xl py-2 px-1 transition hover:opacity-90"
                    style={{
                      background: todayFlag ? AGENDA_ACCENT : 'var(--bg-elev1)',
                      color: todayFlag ? '#fff' : 'var(--text-primary)',
                      border: todayFlag ? 'none' : '1px solid var(--border-soft)',
                    }}
                  >
                    <div
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ opacity: todayFlag ? 0.9 : (isWeekend ? 0.5 : 0.7) }}
                    >
                      {dayName}
                    </div>
                    <div className="text-lg font-bold tabular-nums leading-none mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {d.getDate()}
                    </div>
                    <div
                      className="text-[10px] mt-1 font-semibold"
                      style={{
                        color: todayFlag ? 'rgba(255,255,255,0.9)' : 'var(--accent-emerald)',
                      }}
                    >
                      {freeMinsRem === 0 ? `${freeHours}h` : `${freeHours}h${String(freeMinsRem).padStart(2, '0')}`} livre
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Grid timeline — usa MESMO CSS Grid do header pra alinhamento perfeito */}
            <div
              ref={columnsContainerRef}
              className="px-2 pb-2 pt-1 relative"
              style={{
                display: 'grid',
                gridTemplateColumns: `${HOURS_COL_WIDTH}px repeat(7, ${COL_WIDTH}px)`,
                gap: COL_GAP,
                height: gridHeight + 8,
              }}
            >
              {/* Coluna de horas (col 1, linha 1) */}
              <div className="relative" style={{ height: gridHeight, gridRow: 1, gridColumn: 1 }}>
                {allHours.map((h) => {
                  const top = (h - WEEK_DAY_START_H) * PX_PER_HOUR
                  return (
                    <div
                      key={h}
                      className="absolute right-2 text-[10px] tabular-nums font-semibold"
                      style={{
                        top: top - 6,
                        color: 'var(--text-muted)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  )
                })}
                <div
                  className="absolute top-0 bottom-0 right-0"
                  style={{ width: 1, background: 'var(--border-soft)' }}
                />
              </div>

              {/* Linhas horizontais — overlay sobre cols 2-8 */}
              <div
                className="pointer-events-none relative"
                style={{ gridColumn: '2 / -1', gridRow: 1, zIndex: 0, height: gridHeight }}
              >
                {allHours.map((h, idx) => {
                  if (idx === 0) return null
                  const top = (h - WEEK_DAY_START_H) * PX_PER_HOUR
                  const isMajor = h % 4 === 2
                  return (
                    <div
                      key={h}
                      className="absolute left-0 right-0"
                      style={{
                        top,
                        height: 1,
                        background: isMajor ? 'var(--border-soft)' : 'rgba(0,0,0,0.04)',
                      }}
                    />
                  )
                })}
              </div>

              {/* Colunas dos 7 dias — filhos diretos do grid (cada um em col 2-8, linha 1) */}
              {weekDates.map((date, dayIdx) => {
                const dayStats = analysis.days.find((dd) => dd.date === date)
                const todayFlag = isToday(date)
                return (
                  <div key={date} style={{ gridRow: 1, gridColumn: dayIdx + 2, position: 'relative', zIndex: 1 }}>
                    <DayColumn
                      date={date}
                      dayStats={dayStats}
                      todayFlag={todayFlag}
                      gridHeight={gridHeight}
                      pxPerHour={PX_PER_HOUR}
                      colWidth={COL_WIDTH}
                      onClickEvent={onClickEvent}
                      onClickEmpty={(time) => onCreate?.(date, time)}
                      onDragStart={handleDragStart}
                      draggingEventId={dragging?.event?.id}
                      isDropTarget={dragging?.targetDate === date}
                    />
                  </div>
                )
              })}

              {/* Drag ghost + guide line — overlay absoluto sobre cols 2-8 */}
              {dragging && dragging.targetStartMin != null && (
                <div
                  className="pointer-events-none"
                  style={{ gridColumn: '2 / -1', gridRow: 1, zIndex: 25, position: 'relative', height: gridHeight }}
                >
                  <DragGhost
                    dragging={dragging}
                    pxPerHour={PX_PER_HOUR}
                    colWidth={COL_WIDTH}
                    colGap={COL_GAP}
                    weekDates={weekDates}
                  />
                  <DragGuideLine
                    dragging={dragging}
                    pxPerHour={PX_PER_HOUR}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DayColumn({ date, dayStats, todayFlag, gridHeight, pxPerHour, colWidth, onClickEvent, onClickEmpty, onDragStart, draggingEventId, isDropTarget }) {
  const events = dayStats?.events || []
  const colRef = useRef(null)
  const [hoverY, setHoverY] = useState(null)  // posição Y do hover pra mostrar preview do slot

  // Linha "agora" se é hoje
  let nowOffset = null
  if (todayFlag) {
    const now = new Date()
    const nowH = now.getHours() + now.getMinutes() / 60
    if (nowH >= WEEK_DAY_START_H && nowH <= WEEK_DAY_END_H) {
      nowOffset = (nowH - WEEK_DAY_START_H) * pxPerHour
    }
  }

  // Handler de click em área vazia — calcula hora baseado no Y e dispara onClickEmpty
  // SNAP de 1h (60min) pra criação rápida — user clica "perto" das 15h e cai em 15:00
  // Drag continua com snap fino (15min) pra precisão ao reposicionar.
  const SNAP_CREATE_MIN = 60
  const handleColumnClick = (e) => {
    if (!colRef.current || !onClickEmpty) return
    const rect = colRef.current.getBoundingClientRect()
    const yInCol = e.clientY - rect.top
    if (yInCol < 0 || yInCol > gridHeight) return
    const minutesInGrid = Math.max(0, Math.min(gridHeight - 1, yInCol) / pxPerHour * 60)
    const snapped = Math.round(minutesInGrid / SNAP_CREATE_MIN) * SNAP_CREATE_MIN
    const totalMin = WEEK_DAY_START_H * 60 + snapped
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0')
    const mm = String(totalMin % 60).padStart(2, '0')
    onClickEmpty(`${hh}:${mm}`)
  }

  // Hover preview (desktop) — também snap em hora cheia pra refletir onde vai cair
  const handleColumnMouseMove = (e) => {
    if (!colRef.current) return
    const rect = colRef.current.getBoundingClientRect()
    const yInCol = e.clientY - rect.top
    if (yInCol < 0 || yInCol > gridHeight) {
      setHoverY(null)
      return
    }
    const minutesInGrid = (yInCol / pxPerHour) * 60
    const snapped = Math.round(minutesInGrid / SNAP_CREATE_MIN) * SNAP_CREATE_MIN
    setHoverY((snapped / 60) * pxPerHour)
  }

  return (
    <div
      ref={colRef}
      onClick={handleColumnClick}
      onMouseMove={handleColumnMouseMove}
      onMouseLeave={() => setHoverY(null)}
      className="relative rounded-lg shrink-0 transition-colors cursor-pointer"
      style={{
        width: colWidth,
        height: gridHeight,
        background: isDropTarget
          ? 'rgba(6,182,212,0.18)'
          : (todayFlag ? 'rgba(6,182,212,0.05)' : 'rgba(16,185,129,0.03)'),
        border: `1.5px ${isDropTarget ? 'dashed' : 'solid'} ${isDropTarget ? AGENDA_ACCENT : (todayFlag ? 'rgba(6,182,212,0.25)' : 'transparent')}`,
        boxShadow: isDropTarget ? `0 0 0 4px rgba(6,182,212,0.10)` : 'none',
      }}
    >
      {/* Eventos posicionados */}
      {events.map(({ ev, startMin, endMin }, i) => {
        const startH = startMin / 60
        const endH = endMin / 60
        const visStart = Math.max(startH, WEEK_DAY_START_H)
        const visEnd = Math.min(endH, WEEK_DAY_END_H)
        if (visEnd <= visStart) return null
        const top = (visStart - WEEK_DAY_START_H) * pxPerHour
        const height = Math.max(20, (visEnd - visStart) * pxPerHour)
        const durationMin = endMin - startMin
        const isDragging = draggingEventId === ev.id
        return (
          <DraggableEventBlock
            key={`${ev.id}:${i}`}
            ev={ev}
            top={top}
            height={height}
            durationMin={durationMin}
            isDragging={isDragging}
            originalDate={date}
            onClickEvent={onClickEvent}
            onDragStart={onDragStart}
          />
        )
      })}

      {/* Preview do slot ao passar mouse — ghost de "+ 1h aqui" */}
      {hoverY !== null && !isDropTarget && !draggingEventId && (
        <div
          className="absolute left-1 right-1 pointer-events-none rounded-md flex items-center justify-center transition-opacity"
          style={{
            top: hoverY,
            height: Math.min(60, gridHeight - hoverY - 1),
            background: 'rgba(6,182,212,0.15)',
            border: `1.5px dashed ${AGENDA_ACCENT}`,
            opacity: 0.85,
          }}
        >
          <span className="text-[10px] font-bold" style={{ color: AGENDA_ACCENT }}>
            + criar aqui
          </span>
        </div>
      )}

      {/* Linha "agora" */}
      {nowOffset !== null && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{ top: nowOffset }}
        >
          <div
            className="absolute -left-1 -top-1 w-2 h-2 rounded-full"
            style={{ background: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.25)' }}
          />
          <div className="h-px" style={{ background: '#ef4444' }} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// DraggableEventBlock — long-press pra arrastar, click pra abrir
// ============================================================
function DraggableEventBlock({ ev, top, height, durationMin, isDragging, originalDate, onClickEvent, onDragStart }) {
  const colorKey = ev.color || 'cyan'
  const colorVar = `var(--accent-${colorKey})`
  const tintBg = getColorTint(colorKey, 'bg')
  const tintBorder = getColorTint(colorKey, 'border')
  const showFull = height >= 50
  const showTitle = height >= 26

  const pressTimer = useRef(null)
  const pressStarted = useRef(null)  // { x, y, time }
  const [pressing, setPressing] = useState(false)

  const cleanup = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    pressStarted.current = null
    setPressing(false)
  }

  const handlePointerDown = (e) => {
    // Não interfere em scroll vertical via teclado/mouse-wheel
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.stopPropagation()  // evita disparar click na DayColumn
    pressStarted.current = { x: e.clientX, y: e.clientY, time: Date.now() }
    setPressing(true)

    pressTimer.current = setTimeout(() => {
      // Long press detectado → inicia drag
      if (navigator.vibrate) navigator.vibrate(20)
      onDragStart?.(ev, durationMin, originalDate)
      cleanup()
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = (e) => {
    if (!pressStarted.current) return
    const dx = Math.abs(e.clientX - pressStarted.current.x)
    const dy = Math.abs(e.clientY - pressStarted.current.y)
    // Se moveu mais de 8px antes de virar long-press, cancela (foi scroll)
    if (dx > 8 || dy > 8) cleanup()
  }

  const handlePointerUp = (e) => {
    const started = pressStarted.current
    cleanup()
    if (!started) return
    e.stopPropagation()  // evita disparar click na DayColumn
    const elapsed = Date.now() - started.time
    const dx = Math.abs(e.clientX - started.x)
    const dy = Math.abs(e.clientY - started.y)
    // Click curto (< LONG_PRESS_MS) sem movimento → abre modal
    if (elapsed < LONG_PRESS_MS && dx < 5 && dy < 5) {
      onClickEvent({ event: ev, occurrenceDate: ev.occurrenceDate })
    }
  }

  // Bloqueia o onClick padrão do React (bubble) pra não disparar criação
  const stopClick = (e) => { e.stopPropagation() }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cleanup}
      onClick={stopClick}
      className="absolute rounded-lg overflow-hidden flex select-none"
      style={{
        top: top + 1,
        left: 2,
        right: 2,
        height: height - 2,
        background: tintBg,
        border: `1px solid ${tintBorder}`,
        boxShadow: pressing
          ? `0 4px 16px ${tintBorder}, 0 0 0 2px ${colorVar}`
          : `0 1px 4px rgba(0,0,0,0.05)`,
        transform: pressing ? 'scale(1.04)' : 'scale(1)',
        opacity: isDragging ? 0.35 : 1,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease',
        cursor: 'grab',
        // manipulation = pan-x + pan-y + pinch (sem tap delay), permite scroll mas captura long-press parado
        touchAction: 'manipulation',
      }}
      title={`${ev.title} · ${ev.time?.slice(0, 5)}${ev.end_time ? `–${ev.end_time.slice(0, 5)}` : ''} · segure pra mover`}
    >
      <div style={{ width: 3, background: colorVar, flexShrink: 0 }} />
      <div className="flex-1 min-w-0" style={{ padding: showFull ? '4px 6px' : '2px 5px' }}>
        <div
          className="text-[10px] font-bold tabular-nums leading-none"
          style={{ color: colorVar, fontFamily: 'JetBrains Mono, monospace' }}
        >
          {ev.time?.slice(0, 5)}
          {showFull && ev.end_time && (
            <span className="opacity-70 font-normal"> –{ev.end_time.slice(0, 5)}</span>
          )}
        </div>
        {showTitle && (
          <div
            className="text-[11px] mt-0.5 leading-tight"
            style={{
              color: 'var(--text-primary)',
              fontWeight: 500,
              display: '-webkit-box',
              WebkitLineClamp: showFull ? 3 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ev.title}
          </div>
        )}
        {showFull && ev.location && (
          <div
            className="text-[9px] mt-1 truncate flex items-center gap-0.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <MapPin size={8} /> {ev.location}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// DragGhost — preview do evento no slot alvo (sem tooltip, indicador é externo)
// ============================================================
function DragGhost({ dragging, pxPerHour, colWidth, colGap, weekDates }) {
  const { event, durationMin, targetDate, targetStartMin } = dragging
  if (targetStartMin == null) return null
  const colIdx = weekDates.indexOf(targetDate)
  if (colIdx < 0) return null

  const colorKey = event.color || 'cyan'
  const colorVar = `var(--accent-${colorKey})`
  const top = ((targetStartMin / 60) - WEEK_DAY_START_H) * pxPerHour
  const height = Math.max(24, (durationMin / 60) * pxPerHour)
  const left = colIdx * (colWidth + colGap)

  const startH = Math.floor(targetStartMin / 60)
  const startM = targetStartMin % 60
  const endTotalMin = targetStartMin + durationMin
  const endH = Math.floor(endTotalMin / 60)
  const endM = endTotalMin % 60
  const newTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}–${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

  return (
    <div
      className="absolute pointer-events-none rounded-lg z-40"
      style={{
        top: top + 1,
        left: left + 2,
        width: colWidth - 4,
        height: height - 2,
        background: getColorTint(colorKey, 'bg'),
        border: `2px solid ${colorVar}`,
        boxShadow: `0 8px 24px color-mix(in srgb, ${colorVar} 40%, transparent), 0 0 0 4px rgba(6,182,212,0.15)`,
        animation: 'dragGhostPulse 1.2s ease-in-out infinite',
      }}
    >
      <div className="flex h-full">
        <div style={{ width: 3, background: colorVar, flexShrink: 0 }} />
        <div className="flex-1 min-w-0 p-1.5">
          <div
            className="text-[10px] font-bold tabular-nums leading-none"
            style={{ color: colorVar, fontFamily: 'JetBrains Mono, monospace' }}
          >
            {newTimeStr}
          </div>
          <div
            className="text-[11px] mt-0.5 leading-tight font-medium"
            style={{ color: 'var(--text-primary)', overflow: 'hidden' }}
          >
            {event.title}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// DayDragGuide — versão da DragGuideLine pra timeline do Dia
// (offset pela coluna de horas, com ghost block embaixo)
// ============================================================
function DayDragGuide({ dragging, startHour, pxPerHour, hoursColWidth }) {
  const { event, targetStartMin, durationMin } = dragging
  if (targetStartMin == null) return null
  const colorVar = `var(--accent-${event.color || 'cyan'})`
  const top = ((targetStartMin / 60) - startHour) * pxPerHour
  const height = Math.max(28, (durationMin / 60) * pxPerHour)
  return (
    <>
      {/* Ghost do bloco no slot alvo */}
      <div
        className="absolute pointer-events-none rounded-lg z-30"
        style={{
          top: top + 1,
          left: hoursColWidth + 4,
          right: 4,
          height: height - 2,
          background: getColorTint(event.color || 'cyan', 'bg'),
          border: `2px solid ${colorVar}`,
          boxShadow: `0 8px 24px color-mix(in srgb, ${colorVar} 40%, transparent), 0 0 0 4px rgba(6,182,212,0.15)`,
          animation: 'dragGhostPulse 1.2s ease-in-out infinite',
        }}
      >
        <div className="flex items-stretch h-full">
          <div style={{ width: 4, background: colorVar, flexShrink: 0 }} />
          <div className="flex-1 min-w-0 p-2">
            <div
              className="text-[11px] font-bold tabular-nums leading-none"
              style={{ color: colorVar, fontFamily: 'JetBrains Mono, monospace' }}
            >
              {String(Math.floor(targetStartMin / 60)).padStart(2, '0')}:{String(targetStartMin % 60).padStart(2, '0')}
            </div>
            <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-primary)' }}>
              {event.title}
            </div>
          </div>
        </div>
      </div>

      {/* Linha guia horizontal tracejada */}
      <div
        className="absolute pointer-events-none z-30"
        style={{ top, left: hoursColWidth, right: 0, height: 2 }}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${colorVar} 0 8px, transparent 8px 14px)`,
            opacity: 0.85,
          }}
        />
        {/* Label de hora na coluna de horas */}
        <div
          className="absolute -top-2 text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded shadow"
          style={{
            right: `calc(100% + 4px)`,
            background: colorVar,
            color: '#fff',
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {String(Math.floor(targetStartMin / 60)).padStart(2, '0')}:{String(targetStartMin % 60).padStart(2, '0')}
        </div>
      </div>
    </>
  )
}

// ============================================================
// DragGuideLine — linha horizontal grossa atravessando toda a grade
// no horário alvo (visual de "onde vai cair") — usado no semanal
// ============================================================
function DragGuideLine({ dragging, pxPerHour }) {
  const { event, targetStartMin } = dragging
  if (targetStartMin == null) return null
  const colorVar = `var(--accent-${event.color || 'cyan'})`
  const top = ((targetStartMin / 60) - WEEK_DAY_START_H) * pxPerHour

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-30"
      style={{ top, height: 2 }}
    >
      {/* Linha tracejada animada */}
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${colorVar} 0 8px, transparent 8px 14px)`,
          opacity: 0.65,
        }}
      />
      {/* Label de hora à esquerda da linha */}
      <div
        className="absolute right-full mr-1 -top-2 text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded shadow"
        style={{
          background: colorVar,
          color: '#fff',
          fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
        }}
      >
        {String(Math.floor(targetStartMin / 60)).padStart(2, '0')}:{String(targetStartMin % 60).padStart(2, '0')}
      </div>
    </div>
  )
}

// ============================================================
// DragFloatingIndicator — overlay GIGANTE sticky no topo da tela
// Sempre visível, fora do scroll container, com o dia + hora exata
// ============================================================
function DragFloatingIndicator({ dragging }) {
  const { event, durationMin, targetDate, targetStartMin } = dragging
  if (targetStartMin == null) return null

  const colorVar = `var(--accent-${event.color || 'cyan'})`
  const startH = Math.floor(targetStartMin / 60)
  const startM = targetStartMin % 60
  const endTotalMin = targetStartMin + durationMin
  const endH = Math.floor(endTotalMin / 60)
  const endM = endTotalMin % 60
  const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
  const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

  const d = parseISODate(targetDate)
  const todayFlag = isToday(targetDate)
  const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()]
  const monthName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][d.getMonth()]

  return (
    <div
      className="fixed left-1/2 z-[100] pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top, 0) + 12px)',
        transform: 'translateX(-50%)',
        animation: 'dragIndicatorIn 0.18s ease-out forwards',
      }}
    >
      <div
        className="rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4"
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: `2px solid ${colorVar}`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 4px color-mix(in srgb, ${colorVar} 20%, transparent)`,
          minWidth: 240,
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {/* Cor + título */}
        <div className="flex items-center gap-2 min-w-0">
          <div style={{ width: 4, height: 36, background: colorVar, borderRadius: 2 }} />
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-widest font-bold opacity-60" style={{ color: '#fff' }}>
              Movendo
            </div>
            <div className="text-xs font-semibold truncate" style={{ color: '#fff', maxWidth: 140 }}>
              {event.title}
            </div>
          </div>
        </div>

        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.15)' }} />

        {/* Dia + horário grandes */}
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: colorVar }}>
            {todayFlag ? 'HOJE' : dayName.slice(0, 3).toUpperCase()} · {d.getDate()} {monthName.slice(0, 3)}
          </div>
          <div
            className="text-2xl font-bold tabular-nums leading-tight"
            style={{
              color: '#fff',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '-0.02em',
            }}
          >
            {startStr}
            <span className="text-sm opacity-70 font-normal mx-1">–</span>
            <span className="text-base opacity-70">{endStr}</span>
          </div>
        </div>
      </div>
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
// TASKS VIEW — TODOs sem data + projetos (pastas)
// ============================================================
function TasksView({ tasksHook, projectsHook, tagsHook, onSchedule }) {
  const { pending, completed, loading, error, createTask, toggleTask, deleteTask, updateTask } = tasksHook
  const { projects, createProject, updateProject, deleteProject } = projectsHook
  const { tags, createTag, updateTag, deleteTag } = tagsHook

  const [newTitle, setNewTitle] = useState('')
  const [important, setImportant] = useState(false)
  const [newTagIds, setNewTagIds] = useState([])  // tags marcadas no form de criar tarefa
  const [newProjectId, setNewProjectId] = useState(null)  // projeto selecionado (null = avulsa)
  const [adding, setAdding] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [openProjects, setOpenProjects] = useState({})  // { [projectId]: true }
  const [editingProject, setEditingProject] = useState(null)
  const [showTagManager, setShowTagManager] = useState(false)
  // Etiquetas: estado de colapso lembrado entre sessões
  const [tagsCollapsed, setTagsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('domus:tags-collapsed') === 'true'
  })
  const toggleTagsCollapsed = () => {
    setTagsCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('domus:tags-collapsed', next ? 'true' : 'false') } catch {}
      return next
    })
  }
  const newTitleRef = useRef(null)

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
      await createTask({
        title,
        priority: important,
        tags: newTagIds,
        project_id: newProjectId,
      })
      setNewTitle('')
      setImportant(false)
      setNewTagIds([])
      setNewProjectId(null)
      // Reseta altura do textarea (escapa do auto-resize)
      if (newTitleRef.current) newTitleRef.current.style.height = 'auto'
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const isEmpty = pending.length === 0 && completed.length === 0 && projects.length === 0

  return (
    <div className="space-y-4">
      {/* Explicação curta — reforça o "tira da cabeça" */}
      <div className="rounded-2xl p-3 px-4"
        style={{
          background: 'rgba(6,182,212,0.06)',
          border: '1px solid rgba(6,182,212,0.20)',
        }}
      >
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: AGENDA_ACCENT }}>💭 Tire da cabeça</strong> — anote aqui qualquer coisa
          que você precisa fazer mas ainda não sabe quando. Clica na tarefa pra adicionar <strong>notas</strong> (contato, prazo, link).
          Quando souber o dia, vira compromisso com 📅. Use <strong>projetos</strong> pra agrupar tarefas relacionadas.
        </div>
      </div>

      {/* Form rápido de tarefa avulsa — destacado, label clara */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl p-3.5"
        style={{
          background: 'var(--bg-elev2)',
          border: `1.5px solid ${newTitle.trim() ? AGENDA_ACCENT + '60' : 'var(--border-soft)'}`,
          transition: 'border-color 0.15s',
        }}
      >
        <label className="text-[10px] uppercase tracking-widest mb-2 block flex items-center gap-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          <span style={{ fontSize: 13 }}>💭</span>
          Anote uma tarefa
        </label>
        <textarea
          ref={newTitleRef}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAdd(e)
            }
          }}
          placeholder="Ex: comprar livro X, agendar reunião com fulano…"
          rows={1}
          className="w-full bg-transparent outline-none px-1 py-1 resize-none"
          style={{
            color: 'var(--text-primary)',
            lineHeight: 1.45,
            minHeight: 32,
            maxHeight: 140,
            fontSize: 15,
          }}
          maxLength={500}
          onInput={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'
          }}
        />

        {/* Etiquetas disponíveis pra marcar nessa tarefa */}
        {tags && tags.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <div className="text-[10px] uppercase tracking-widest mb-1.5 flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
              <span>🏷️ Etiquetas</span>
              {newTagIds.length > 0 && (
                <span className="normal-case tracking-normal" style={{ color: 'var(--text-tertiary)' }}>
                  {newTagIds.length} marcada{newTagIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tg) => {
                const checked = newTagIds.includes(tg.id)
                return (
                  <button
                    key={tg.id}
                    type="button"
                    onClick={() => setNewTagIds((ids) => checked ? ids.filter((x) => x !== tg.id) : [...ids, tg.id])}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition"
                    style={{
                      fontSize: 12,
                      background: checked ? `var(--accent-${tg.color || 'cyan'})20` : 'var(--bg-elev1)',
                      color: checked ? `var(--accent-${tg.color || 'cyan'})` : 'var(--text-secondary)',
                      border: `1px solid ${checked ? `var(--accent-${tg.color || 'cyan'})60` : 'var(--border-soft)'}`,
                      fontWeight: checked ? 600 : 400,
                    }}
                  >
                    <span
                      className="flex items-center justify-center rounded"
                      style={{
                        width: 13, height: 13,
                        background: checked ? `var(--accent-${tg.color || 'cyan'})` : 'transparent',
                        border: `1.5px solid ${checked ? `var(--accent-${tg.color || 'cyan'})` : 'var(--border-strong)'}`,
                      }}
                    >
                      {checked && <Check size={8} color="#fff" strokeWidth={3} />}
                    </span>
                    {tg.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Onde a tarefa vai: avulsa ou dentro de um projeto */}
        {projects && projects.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
            <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
              📂 Onde colocar?
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Avulsa (sem projeto) */}
              <button
                type="button"
                onClick={() => setNewProjectId(null)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition"
                style={{
                  fontSize: 12,
                  background: newProjectId === null ? 'rgba(6,182,212,0.15)' : 'var(--bg-elev1)',
                  color: newProjectId === null ? AGENDA_ACCENT : 'var(--text-secondary)',
                  border: `1px solid ${newProjectId === null ? 'rgba(6,182,212,0.5)' : 'var(--border-soft)'}`,
                  fontWeight: newProjectId === null ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 11 }}>📋</span>
                Avulsa
              </button>
              {projects.map((p) => {
                const selected = newProjectId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewProjectId(p.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition"
                    style={{
                      fontSize: 12,
                      background: selected ? `var(--accent-${p.color || 'cyan'})20` : 'var(--bg-elev1)',
                      color: selected ? `var(--accent-${p.color || 'cyan'})` : 'var(--text-secondary)',
                      border: `1px solid ${selected ? `var(--accent-${p.color || 'cyan'})60` : 'var(--border-soft)'}`,
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    {p.icon ? (
                      <span style={{ fontSize: 11 }}>{p.icon}</span>
                    ) : (
                      <Folder size={11} style={{ color: `var(--accent-${p.color || 'cyan'})` }} />
                    )}
                    {p.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Linha de ação: só o botão Adicionar (à direita) */}
        <div className="flex items-center justify-end gap-2 mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border-soft)' }}>
          <button
            type="submit"
            disabled={!newTitle.trim() || adding}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
            style={{
              background: newTitle.trim() ? AGENDA_ACCENT : 'var(--bg-elev1)',
              color: newTitle.trim() ? '#fff' : 'var(--text-muted)',
              boxShadow: newTitle.trim() ? '0 4px 12px rgba(6,182,212,0.25)' : 'none',
            }}
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Adicionar
          </button>
        </div>
      </form>

      {/* ====== Seção de Etiquetas — sempre visível, retrátil ====== */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--border-soft)',
        }}
      >
        {/* Cabeçalho clicável — colapsa/expande */}
        <button
          type="button"
          onClick={toggleTagsCollapsed}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/5"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{ background: 'rgba(6,182,212,0.15)', color: AGENDA_ACCENT }}
          >
            <span style={{ fontSize: 14 }}>🏷️</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Etiquetas
              {tags && tags.length > 0 && (
                <span className="ml-1.5 font-normal" style={{ color: 'var(--text-tertiary)' }}>
                  · {tags.length}
                </span>
              )}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {tags && tags.length === 0
                ? 'Toque pra criar — categorize suas tarefas'
                : (tagsCollapsed
                    ? 'Toque pra mostrar e marcar nas tarefas'
                    : 'Marque embaixo pra aplicar na próxima tarefa')
              }
            </div>
          </div>
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-muted)',
              transform: tagsCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {/* Corpo expandido: chips de etiquetas + botão Gerenciar */}
        {!tagsCollapsed && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-2.5" style={{ borderTop: '1px solid var(--border-soft)' }}>
            {tags && tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-2.5">
                {tags.map((tg) => {
                  const checked = newTagIds.includes(tg.id)
                  return (
                    <button
                      key={tg.id}
                      type="button"
                      onClick={() => setNewTagIds((ids) => checked ? ids.filter((x) => x !== tg.id) : [...ids, tg.id])}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition"
                      style={{
                        background: checked ? `var(--accent-${tg.color || 'cyan'})20` : 'var(--bg-elev1)',
                        color: checked ? `var(--accent-${tg.color || 'cyan'})` : 'var(--text-secondary)',
                        border: `1px solid ${checked ? `var(--accent-${tg.color || 'cyan'})60` : 'var(--border-soft)'}`,
                      }}
                    >
                      <span
                        className="flex items-center justify-center rounded"
                        style={{
                          width: 14, height: 14,
                          background: checked ? `var(--accent-${tg.color || 'cyan'})` : 'transparent',
                          border: `1.5px solid ${checked ? `var(--accent-${tg.color || 'cyan'})` : 'var(--border-strong)'}`,
                        }}
                      >
                        {checked && <Check size={9} color="#fff" strokeWidth={3} />}
                      </span>
                      {tg.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-center py-2" style={{ color: 'var(--text-tertiary)' }}>
                Você ainda não tem etiquetas. Clique no botão abaixo pra criar a primeira.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTagManager(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
              style={{
                background: 'var(--bg-elev1)',
                border: '1px dashed var(--border-medium)',
                color: 'var(--text-secondary)',
              }}
            >
              <Plus size={14} />
              {tags && tags.length > 0 ? 'Criar / editar etiquetas' : 'Criar primeira etiqueta'}
            </button>
          </div>
        )}
      </div>

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
                    allTags={tags}
                    isOpen={isOpen}
                    onToggleOpen={() => setOpenProjects((o) => ({ ...o, [p.id]: !o[p.id] }))}
                    onAddTask={(title, prio) => createTask({ title, priority: prio, project_id: p.id })}
                    onToggleTask={(id) => toggleTask(id)}
                    onDeleteTask={(id) => deleteTask(id)}
                    onScheduleTask={(t) => onSchedule(t)}
                    onTogglePriority={(t) => updateTask(t.id, { priority: t.priority ? 0 : 1 })}
                    onMoveTaskOut={(t) => updateTask(t.id, { project_id: null })}
                    onUpdateTask={(id, patch) => updateTask(id, patch)}
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
                  allTags={tags}
                  onToggle={() => toggleTask(t.id)}
                  onDelete={() => deleteTask(t.id)}
                  onSchedule={() => onSchedule(t)}
                  onTogglePriority={() => updateTask(t.id, { priority: t.priority ? 0 : 1 })}
                  onMoveToProject={(pid) => updateTask(t.id, { project_id: pid })}
                  onUpdate={(patch) => updateTask(t.id, patch)}
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
                  allTags={tags}
                  onToggle={() => toggleTask(t.id)}
                  onDelete={() => deleteTask(t.id)}
                  onSchedule={() => onSchedule(t)}
                  onTogglePriority={() => updateTask(t.id, { priority: t.priority ? 0 : 1 })}
                  onMoveToProject={(pid) => updateTask(t.id, { project_id: pid })}
                  onUpdate={(patch) => updateTask(t.id, patch)}
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

      {/* Modal gerenciar etiquetas */}
      {showTagManager && (
        <TagManager
          tags={tags}
          onCreate={createTag}
          onUpdate={updateTag}
          onDelete={deleteTag}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  )
}

// ============================================================
// TAG MANAGER — modal pra criar / editar / apagar etiquetas
// ============================================================
function TagManager({ tags, onCreate, onUpdate, onDelete, onClose }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('cyan')
  const [editing, setEditing] = useState(null)  // tag em edição
  const [confirmDelete, setConfirmDelete] = useState(null)  // tag id pra confirmar exclusão
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleCreate = async (e) => {
    e?.preventDefault?.()
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      await onCreate({ name, color: newColor })
      setNewName('')
      setNewColor('cyan')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editing || !editing.name.trim()) return
    setSaving(true)
    try {
      await onUpdate(editing.id, { name: editing.name.trim(), color: editing.color })
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setSaving(true)
    try {
      await onDelete(id)
      setConfirmDelete(null)
    } finally {
      setSaving(false)
    }
  }

  // Lista das cores disponíveis (mesmo set usado em projetos)
  const COLORS = AGENDA_COLORS

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'rgba(6,182,212,0.15)', color: AGENDA_ACCENT }}>
              <span style={{ fontSize: 16 }}>🏷️</span>
            </div>
            <div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg leading-tight">
                Etiquetas
              </h2>
              <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Categorize suas tarefas
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Criar nova */}
          <form onSubmit={handleCreate} className="rounded-xl p-3 space-y-2.5"
            style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
          >
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Nova etiqueta
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Trabalho, Casa, Estudo, Saúde…"
              className="w-full bg-transparent outline-none px-2 py-1.5 rounded-lg text-sm"
              style={{
                background: 'var(--bg-elev1)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
              }}
              maxLength={30}
            />
            <div>
              <div className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>Cor</div>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewColor(c.id)}
                    title={c.name}
                    className="w-8 h-8 rounded-full transition shrink-0"
                    style={{
                      background: `var(--accent-${c.id})`,
                      outline: newColor === c.id ? `2.5px solid var(--accent-${c.id})` : 'none',
                      outlineOffset: 2,
                      transform: newColor === c.id ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: newColor === c.id ? `0 0 0 2px var(--bg-elev1)` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || saving}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-40"
              style={{ background: AGENDA_ACCENT, color: '#fff' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Criar etiqueta
            </button>
          </form>

          {/* Lista existente */}
          {tags.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                Suas etiquetas · {tags.length}
              </div>
              <div className="space-y-1.5">
                {tags.map((tg) => {
                  if (editing?.id === tg.id) {
                    return (
                      <div key={tg.id} className="rounded-lg p-3 space-y-2"
                        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-medium)' }}
                      >
                        <input
                          type="text"
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                          style={{
                            background: 'var(--bg-elev1)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-primary)',
                          }}
                          maxLength={30}
                          autoFocus
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setEditing({ ...editing, color: c.id })}
                              title={c.name}
                              className="w-7 h-7 rounded-full transition shrink-0"
                              style={{
                                background: `var(--accent-${c.id})`,
                                outline: editing.color === c.id ? `2.5px solid var(--accent-${c.id})` : 'none',
                                outlineOffset: 2,
                                transform: editing.color === c.id ? 'scale(1.15)' : 'scale(1)',
                                boxShadow: editing.color === c.id ? `0 0 0 2px var(--bg-elev1)` : 'none',
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => setEditing(null)}
                            disabled={saving}
                            className="px-2.5 py-1.5 rounded-lg text-xs transition"
                            style={{ color: 'var(--text-tertiary)', background: 'var(--bg-elev1)' }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            disabled={!editing.name.trim() || saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                            style={{ background: AGENDA_ACCENT, color: '#fff' }}
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    )
                  }
                  if (confirmDelete === tg.id) {
                    return (
                      <div key={tg.id} className="rounded-lg p-3 flex items-center gap-3"
                        style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.30)' }}
                      >
                        <div className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Apagar "<strong>{tg.name}</strong>"? Tarefas com essa etiqueta vão perdê-la.
                        </div>
                        <button onClick={() => setConfirmDelete(null)} disabled={saving}
                          className="text-xs px-2 py-1 rounded transition" style={{ color: 'var(--text-tertiary)' }}>
                          Cancelar
                        </button>
                        <button onClick={() => handleDelete(tg.id)} disabled={saving}
                          className="text-xs px-2 py-1 rounded font-semibold transition"
                          style={{ background: 'var(--accent-rose)', color: '#fff' }}>
                          Apagar
                        </button>
                      </div>
                    )
                  }
                  return (
                    <div key={tg.id} className="rounded-lg px-3 py-2.5 flex items-center gap-2.5"
                      style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: `var(--accent-${tg.color || 'cyan'})` }} />
                      <div className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {tg.name}
                      </div>
                      <button onClick={() => setEditing({ ...tg })} className="p-1.5 rounded transition hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }} title="Editar">
                        <span style={{ fontSize: 13 }}>✏️</span>
                      </button>
                      <button onClick={() => setConfirmDelete(tg.id)} className="p-1.5 rounded transition hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }} title="Apagar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Crie sua primeira etiqueta acima ☝️
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PROJECT CARD — pasta expandível com tarefas dentro
// ============================================================
function ProjectCard({
  project, pendingTasks, completedTasks, allTags, isOpen, onToggleOpen,
  onAddTask, onToggleTask, onDeleteTask, onScheduleTask, onTogglePriority,
  onMoveTaskOut, onUpdateTask, onEditProject,
}) {
  const [prioritizing, setPrioritizing] = useState(false)
  const [newInside, setNewInside] = useState('')
  const [insideAdding, setInsideAdding] = useState(false)
  const tintBg = getColorTint(project.color, 'bg')
  const tintBorder = getColorTint(project.color, 'border')
  const colorVar = `var(--accent-${project.color})`

  // Barra de progresso — % de tarefas feitas
  const totalTasks = pendingTasks.length + completedTasks.length
  const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks.length / totalTasks) * 100)

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
            <div className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
              {totalTasks === 0 ? (
                <span>Vazio — toque pra adicionar tarefas</span>
              ) : (
                <>
                  <span>{completedTasks.length}/{totalTasks} feitas</span>
                  <span>·</span>
                  <span style={{ color: colorVar, fontWeight: 600 }}>{progressPct}%</span>
                </>
              )}
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

      {/* Barra de progresso (só aparece se tem ao menos 1 tarefa) */}
      {totalTasks > 0 && (
        <div className="px-3 pb-2">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{
              height: 6,
              background: 'rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                background: colorVar,
                transition: 'width 0.35s ease',
                boxShadow: progressPct === 100 ? `0 0 8px ${colorVar}` : 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Conteúdo expandido */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-2"
          style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}
        >
          {/* Form de adicionar dentro do projeto — aceita texto longo */}
          <form
            onSubmit={handleAddInside}
            className="flex items-start gap-2 rounded-lg p-2"
            style={{ background: 'var(--bg-elev2)' }}
          >
            <textarea
              value={newInside}
              onChange={(e) => setNewInside(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddInside(e)
                }
              }}
              placeholder="Adicionar tarefa neste projeto…"
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none px-1 py-1 resize-none"
              style={{ color: 'var(--text-primary)', lineHeight: 1.4, minHeight: 30, maxHeight: 120 }}
              maxLength={500}
              onInput={(e) => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'
              }}
            />
            <button
              type="submit"
              disabled={!newInside.trim() || insideAdding}
              className="p-1.5 rounded-md text-sm font-semibold transition disabled:opacity-50 shrink-0"
              style={{ background: colorVar, color: '#fff' }}
            >
              {insideAdding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            </button>
          </form>

          {/* Botão "Ajude-me a priorizar" — só aparece com 2+ pendentes */}
          {pendingTasks.length >= 2 && !prioritizing && (
            <button
              onClick={() => setPrioritizing(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition hover:opacity-90 text-left"
              style={{
                background: `color-mix(in srgb, ${colorVar} 8%, transparent)`,
                border: `1px dashed color-mix(in srgb, ${colorVar} 31%, transparent)`,
                color: colorVar,
              }}
            >
              <div className="text-base shrink-0">🎯</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Me ajude a priorizar</div>
                <div className="text-[10px] opacity-80">
                  Alfred faz perguntas pra você definir o que vem primeiro
                </div>
              </div>
            </button>
          )}

          {/* Tarefas pendentes */}
          {pendingTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              insideProject
              allTags={allTags}
              onToggle={() => onToggleTask(t.id)}
              onDelete={() => onDeleteTask(t.id)}
              onSchedule={() => onScheduleTask(t)}
              onTogglePriority={() => onTogglePriority(t)}
              onMoveOut={() => onMoveTaskOut(t)}
              onUpdate={(patch) => onUpdateTask?.(t.id, patch)}
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

      {/* Wizard de priorização */}
      {prioritizing && (
        <PrioritizeWizard
          project={project}
          tasks={pendingTasks}
          colorVar={colorVar}
          onClose={() => setPrioritizing(false)}
          onUpdateTask={onUpdateTask}
        />
      )}
    </div>
  )
}

// ============================================================
// PRIORITIZE WIZARD — Alfred faz perguntas pra você definir
// o que precisa ser feito primeiro nesse projeto
// ============================================================
function PrioritizeWizard({ project, tasks, colorVar, onClose, onUpdateTask }) {
  // 3 etapas:
  //   0) "Qual destrava as outras?" → escolhe 1 (vira a top-1)
  //   1) "Qual tem prazo curto ou bloqueia outra coisa?" → escolhe 1 (vira top-2, marca importante)
  //   2) "O resto pode esperar — qual você gostaria de tirar do caminho rapidinho?" → escolhe 1
  // Resultado: até 3 tarefas marcadas importantes, na ordem de seleção
  const [step, setStep] = useState(0)
  const [picks, setPicks] = useState([])  // [taskId, taskId, taskId]
  const [saving, setSaving] = useState(false)

  // Bloqueia scroll body enquanto aberto
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  const STEPS = [
    {
      icon: '🔓',
      title: 'Qual destrava as outras?',
      hint: 'Pense: se eu fizer só uma, qual abre caminho pro resto andar? Sem essa, o projeto trava.',
    },
    {
      icon: '⏰',
      title: 'Qual tem prazo curto?',
      hint: 'Alguma tem data marcada, depende de outra pessoa, ou se você adiar vira problema?',
    },
    {
      icon: '⚡',
      title: 'Qual é rapidinha?',
      hint: 'Alguma dessas dá pra resolver em 5-10 minutos? Tirar do caminho dá um alívio.',
    },
  ]

  const pickedIds = picks.map((p) => p.id)
  const remaining = tasks.filter((t) => !pickedIds.includes(t.id))
  const current = STEPS[step]
  const totalSteps = Math.min(3, tasks.length)

  // Mapa de passo → quadrante Eisenhower:
  //   Step 0 (destrava o projeto)    → 3 = FAZER AGORA (urgente + importante)
  //   Step 1 (prazo curto)           → 2 = URGENTE
  //   Step 2 (rapidinha — alívio)    → 1 = IMPORTANTE (planejar logo)
  const STEP_PRIORITY = [3, 2, 1]

  const handlePick = (id) => {
    const stepIdx = step
    setPicks((p) => [...p, { id, stepIdx }])
    if (step + 1 >= totalSteps || remaining.length <= 1) {
      finalize([...picks, { id, stepIdx }])
    } else {
      setStep((s) => s + 1)
    }
  }

  const handleSkip = () => {
    if (step + 1 >= totalSteps) {
      finalize(picks)
    } else {
      setStep((s) => s + 1)
    }
  }

  const finalize = async (finalPicks) => {
    if (finalPicks.length === 0) {
      onClose()
      return
    }
    setSaving(true)
    try {
      // Mapeia cada pick pra um quadrante Eisenhower (ver STEP_PRIORITY)
      for (const pick of finalPicks) {
        const priority = STEP_PRIORITY[pick.stepIdx] ?? 1
        await onUpdateTask?.(pick.id, { priority })
      }
    } finally {
      setSaving(false)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-start gap-3">
            <img
              src="/alfred.png"
              alt="Alfred"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${colorVar}` }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Alfred · priorizando "{project.name}"
              </div>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }} className="text-lg leading-tight">
                {current.icon} {current.title}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg transition hover:opacity-70 shrink-0"
              style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Progresso */}
          <div className="flex items-center gap-1.5 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition"
                style={{ background: i <= step ? colorVar : 'var(--bg-elev3)' }}
              />
            ))}
            <div className="text-[10px] ml-2" style={{ color: 'var(--text-muted)' }}>
              {step + 1}/{totalSteps}
            </div>
          </div>
        </div>

        {/* Pergunta */}
        <div className="px-5 py-4">
          <div className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            🎩 {current.hint}
          </div>

          {remaining.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Nenhuma tarefa restante.
            </div>
          ) : (
            <div className="space-y-1.5">
              {remaining.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handlePick(t.id)}
                  disabled={saving}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'var(--bg-elev2)',
                    border: '1px solid var(--border-soft)',
                  }}
                >
                  <div
                    className="text-sm"
                    style={{
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.4,
                    }}
                  >
                    {t.title}
                  </div>
                  {t.notes && (
                    <div
                      className="text-[11px] mt-1"
                      style={{
                        color: 'var(--text-tertiary)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {t.notes}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Já escolhidas */}
          {picks.length > 0 && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Você já escolheu · {picks.length}
              </div>
              <div className="space-y-1">
                {picks.map((pick, idx) => {
                  const pickedTask = tasks.find((tt) => tt.id === pick.id)
                  if (!pickedTask) return null
                  const q = getQuadrant(STEP_PRIORITY[pick.stepIdx])
                  return (
                    <div key={pick.id} className="text-[11px] flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                      <span className="font-semibold" style={{ color: q.hex || colorVar }}>#{idx + 1}</span>
                      {q.id === 3 && <span>🔥</span>}
                      {q.id === 2 && <span>⚡</span>}
                      {q.id === 1 && <span>⭐</span>}
                      <span className="truncate">{pickedTask.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t" style={{ borderColor: 'var(--border-soft)' }}>
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-xs px-3 py-2 rounded-lg transition hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Pular essa pergunta
          </button>
          <button
            onClick={() => finalize(picks)}
            disabled={saving}
            className="text-xs px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
            style={{ background: colorVar, color: '#fff' }}
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : null}
            Terminar agora
          </button>
        </div>
      </div>
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

function QuadrantOption({ active, icon, label, hint, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 transition hover:bg-white/5 flex items-start gap-2.5"
      style={{
        background: active ? `${typeof color === 'string' && color.startsWith('#') ? color + '15' : 'var(--bg-elev2)'}` : 'transparent',
        borderTop: '1px solid var(--border-soft)',
      }}
    >
      <div className="text-base shrink-0 mt-0.5" style={{ minWidth: 20, textAlign: 'center' }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold" style={{ color: active ? color : 'var(--text-primary)' }}>
          {label}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </div>
      </div>
      {active && <Check size={14} style={{ color, marginTop: 2 }} />}
    </button>
  )
}

function TaskRow({ task, projects, allTags, insideProject, onToggle, onDelete, onSchedule, onTogglePriority, onMoveToProject, onMoveOut, onUpdate }) {
  const done = !!task.completed_at
  const isImportant = (Number(task.priority) || 0) >= 1 && !done
  const hasNotes = !!(task.notes && task.notes.trim())
  // Tags da tarefa (resolvidas pra objetos {id,name,color} usando o catálogo)
  const taskTagIds = Array.isArray(task.tags) ? task.tags : []
  const taskTags = (allTags || []).filter((t) => taskTagIds.includes(t.id))
  const [showMove, setShowMove] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title || '')
  const [editNotes, setEditNotes] = useState(task.notes || '')
  const [editTagIds, setEditTagIds] = useState(taskTagIds)
  const [saving, setSaving] = useState(false)

  // Confirma exclusão em 2 cliques (sem dialog feio do navegador)
  // Clique 1: botão vira "Confirmar?" por 3 segundos
  // Clique 2: deleta de fato
  useEffect(() => {
    if (!confirmDelete) return
    const id = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(id)
  }, [confirmDelete])

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete?.()
    } else {
      setConfirmDelete(true)
    }
  }

  // Toggle de uma tag direto (salva imediatamente, sem precisar de modo expandido)
  const toggleTag = async (tagId) => {
    if (!onUpdate) return
    const has = taskTagIds.includes(tagId)
    const next = has ? taskTagIds.filter((x) => x !== tagId) : [...taskTagIds, tagId]
    await onUpdate({ tags: next })
  }

  // Sincroniza valores locais com mudanças externas (ex: reordenação)
  useEffect(() => {
    if (!expanded) {
      setEditTitle(task.title || '')
      setEditNotes(task.notes || '')
      setEditTagIds(taskTagIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.title, task.notes, expanded, JSON.stringify(taskTagIds)])

  const handleSave = async () => {
    const t = editTitle.trim()
    if (!t) return
    const patch = {}
    if (t !== task.title) patch.title = t
    const newNotes = editNotes.trim() || null
    if (newNotes !== (task.notes || null)) patch.notes = newNotes
    // Compara tags (ordem-insensível)
    const oldIds = [...taskTagIds].sort().join(',')
    const newIds = [...editTagIds].sort().join(',')
    if (oldIds !== newIds) patch.tags = editTagIds
    if (Object.keys(patch).length === 0) { setExpanded(false); return }
    setSaving(true)
    try {
      await onUpdate?.(patch)
      setExpanded(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditTitle(task.title || '')
    setEditNotes(task.notes || '')
    setEditTagIds(taskTagIds)
    setExpanded(false)
  }

  return (
    <div
      className="rounded-xl transition relative"
      style={{
        background: taskTags.length > 0
          ? getColorTint(taskTags[0].color, 'bg')
          : 'var(--bg-elev2)',
        border: `1px solid ${
          taskTags.length > 0
            ? getColorTint(taskTags[0].color, 'border')
            : (expanded ? 'var(--border-medium)' : 'var(--border-soft)')
        }`,
        opacity: done ? 0.55 : 1,
      }}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          onClick={onToggle}
          className="shrink-0 flex items-center justify-center transition mt-0.5"
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
          <button
            type="button"
            onClick={() => onUpdate && !done && setExpanded((v) => !v)}
            className="w-full text-left"
            disabled={!onUpdate || done}
            style={{ cursor: onUpdate && !done ? 'pointer' : 'default' }}
          >
            {/* Etiquetas da tarefa */}
            {taskTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {taskTags.map((tg) => (
                  <span key={tg.id}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      background: `var(--accent-${tg.color || 'cyan'})20`,
                      color: `var(--accent-${tg.color || 'cyan'})`,
                      border: `1px solid var(--accent-${tg.color || 'cyan'})40`,
                    }}
                  >
                    {tg.name}
                  </span>
                ))}
              </div>
            )}
            <div
              style={{
                color: 'var(--text-primary)',
                textDecoration: done ? 'line-through' : 'none',
                fontWeight: 500,
                fontSize: 16,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.35,
              }}
            >
              {task.title}
            </div>
            {hasNotes && !expanded && (
              <div
                className="text-[11px] mt-1"
                style={{
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {task.notes}
              </div>
            )}
          </button>
        </div>

        {/* Quando feita ou expandida: ícone de delete no canto */}
        {(done || expanded) && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg transition hover:opacity-70 shrink-0"
            title="Apagar"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* ===== Barra de ações: 3 botões — Etiqueta / Agendar / Excluir ===== */}
      {/* Centralizados, simétricos, com respiro do título */}
      {!done && !expanded && (
        <div className="flex items-center justify-center gap-3 px-3 pb-3 pt-2 flex-wrap">
          {/* Etiqueta — popover com checkboxes */}
          <div className="relative">
            <button
              onClick={() => {
                if (!allTags || allTags.length === 0) return
                setShowTagPicker((v) => !v)
              }}
              disabled={!onUpdate || !allTags || allTags.length === 0}
              className="flex items-center justify-center gap-1 px-3 py-1 rounded-md transition font-medium disabled:opacity-40"
              style={{
                fontSize: 12,
                minHeight: 30,
                background: taskTags.length > 0 ? 'rgba(139,92,246,0.15)' : 'var(--bg-elev1)',
                color: taskTags.length > 0 ? 'var(--accent-violet)' : 'var(--text-secondary)',
                border: `1px solid ${taskTags.length > 0 ? 'rgba(139,92,246,0.4)' : 'var(--border-soft)'}`,
              }}
              title={!allTags || allTags.length === 0 ? 'Crie etiquetas no topo da aba' : ''}
            >
              <span style={{ fontSize: 12 }}>🏷️</span>
              <span>Etiqueta{taskTags.length > 0 ? ` · ${taskTags.length}` : ''}</span>
            </button>
            {showTagPicker && allTags && allTags.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTagPicker(false)} />
                <div
                  className="absolute left-0 bottom-full mb-1 z-20 rounded-xl shadow-xl overflow-hidden min-w-[220px] p-2"
                  style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)' }}
                >
                  <div className="text-[9px] uppercase tracking-wider mb-1.5 px-1"
                    style={{ color: 'var(--text-muted)' }}>
                    Etiquetas
                  </div>
                  <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                    {allTags.map((tg) => {
                      const checked = taskTagIds.includes(tg.id)
                      return (
                        <button
                          key={tg.id}
                          onClick={() => toggleTag(tg.id)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition hover:bg-white/5 text-left"
                        >
                          <span
                            className="flex items-center justify-center rounded shrink-0"
                            style={{
                              width: 16, height: 16,
                              background: checked ? `var(--accent-${tg.color || 'cyan'})` : 'transparent',
                              border: `1.5px solid ${checked ? `var(--accent-${tg.color || 'cyan'})` : 'var(--border-strong)'}`,
                            }}
                          >
                            {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                          </span>
                          <span className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: `var(--accent-${tg.color || 'cyan'})` }} />
                          <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                            {tg.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Agendar */}
          <button
            onClick={onSchedule}
            disabled={!onSchedule}
            className="flex items-center justify-center gap-1 px-3 py-1 rounded-md transition font-medium disabled:opacity-40"
            style={{
              fontSize: 12,
              minHeight: 30,
              background: 'rgba(6,182,212,0.15)',
              color: AGENDA_ACCENT,
              border: '1px solid rgba(6,182,212,0.4)',
            }}
          >
            <CalendarPlus size={12} />
            <span>Agendar</span>
          </button>

          {/* Excluir (2 cliques pra confirmar) */}
          <button
            onClick={handleDeleteClick}
            className="flex items-center justify-center gap-1 px-3 py-1 rounded-md transition font-medium"
            style={{
              fontSize: 12,
              minHeight: 30,
              background: confirmDelete ? 'var(--accent-rose)' : 'rgba(244,63,94,0.10)',
              color: confirmDelete ? '#fff' : 'var(--accent-rose)',
              border: `1px solid ${confirmDelete ? 'var(--accent-rose)' : 'rgba(244,63,94,0.30)'}`,
            }}
          >
            <Trash2 size={12} />
            <span>{confirmDelete ? 'Confirmar?' : 'Excluir'}</span>
          </button>
        </div>
      )}

      {/* ===== Modo expandido: editar título + notas ===== */}
      {expanded && !done && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'var(--border-soft)', paddingTop: 10 }}>
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              Título
            </div>
            <textarea
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              rows={2}
              className="w-full text-sm outline-none rounded-lg px-2.5 py-2 resize-none"
              style={{
                background: 'var(--bg-elev1)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                lineHeight: 1.4,
              }}
              maxLength={500}
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              Notas / contexto
              <span className="ml-2 normal-case tracking-normal" style={{ color: 'var(--text-tertiary)' }}>
                (tudo o que você precisa lembrar sobre essa tarefa)
              </span>
            </div>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              placeholder="Ex: prazo até sexta, telefone do contador é 11 9999-8888, levar documento X…"
              className="w-full text-sm outline-none rounded-lg px-2.5 py-2 resize-none"
              style={{
                background: 'var(--bg-elev1)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
              maxLength={2000}
            />
          </div>

          {/* Seletor de etiquetas (checkbox) */}
          {allTags && allTags.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Etiquetas
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tg) => {
                  const checked = editTagIds.includes(tg.id)
                  return (
                    <button
                      key={tg.id}
                      type="button"
                      onClick={() => {
                        setEditTagIds((ids) => checked ? ids.filter((x) => x !== tg.id) : [...ids, tg.id])
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition"
                      style={{
                        background: checked ? `var(--accent-${tg.color || 'cyan'})20` : 'var(--bg-elev1)',
                        color: checked ? `var(--accent-${tg.color || 'cyan'})` : 'var(--text-tertiary)',
                        border: `1px solid ${checked ? `var(--accent-${tg.color || 'cyan'})50` : 'var(--border-medium)'}`,
                      }}
                    >
                      <span
                        className="flex items-center justify-center rounded"
                        style={{
                          width: 14, height: 14,
                          background: checked ? `var(--accent-${tg.color || 'cyan'})` : 'transparent',
                          border: `1.5px solid ${checked ? `var(--accent-${tg.color || 'cyan'})` : 'var(--border-strong)'}`,
                        }}
                      >
                        {checked && <Check size={9} color="#fff" strokeWidth={3} />}
                      </span>
                      {tg.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {editNotes.length > 0 ? `${editNotes.length}/2000` : 'Anote pra tirar da cabeça'}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs transition hover:opacity-80 disabled:opacity-50"
                style={{ color: 'var(--text-tertiary)', background: 'var(--bg-elev1)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editTitle.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: AGENDA_ACCENT, color: '#fff' }}
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
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
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className="w-8 h-8 rounded-lg transition"
                  style={{
                    background: `var(--accent-${c.id})`,
                    border: color === c.id ? '2.5px solid var(--text-primary)' : '2.5px solid transparent',
                    boxShadow: color === c.id ? `0 0 0 2px var(--bg-elev1)` : 'none',
                  }}
                  title={c.name}
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
      {/* Tema */}
      <div className="rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
          Aparência
        </div>
        <div className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
          🎩 Tema do app — vale para a Agenda e o Finanças.
        </div>
        <div className="flex gap-3">
          <ThemeOption current={theme} value="light" icon={Sun} label="Claro" onSelect={() => setTheme('light')} />
          <ThemeOption current={theme} value="dark" icon={Moon} label="Escuro" onSelect={() => setTheme('dark')} />
        </div>
      </div>

      {/* Alfred no WhatsApp */}
      <AgendaWhatsAppCard />

      <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Tem sugestão? Mande pra <strong>alquimiadigital08@gmail.com</strong>
      </div>
    </div>
  )
}

// Cadastro do número do WhatsApp pra falar com o Alfred — auto-contido
// (lê/grava user_profiles.whatsapp_phone direto, mesmo campo do app de Finanças,
// então fica sincronizado entre os dois).
function AgendaWhatsAppCard() {
  const BOT_PHONE = '5519997472896'
  const waLink = `https://wa.me/${BOT_PHONE}?text=${encodeURIComponent('Oi, quero começar')}`

  const [phone, setPhone] = useState(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedJustNow, setSavedJustNow] = useState(false)

  const normalize = (input) => {
    const digits = (input || '').replace(/\D/g, '')
    if (!digits) return null
    if (digits.startsWith('55') && digits.length >= 12) return digits
    if (digits.length === 10 || digits.length === 11) return '55' + digits
    if (digits.length >= 10) return digits
    return null
  }
  const formatBR = (digits) => {
    if (!digits) return ''
    const d = digits.replace(/\D/g, '')
    if (d.length === 13 && d.startsWith('55')) return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
    if (d.length === 12 && d.startsWith('55')) return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
    return '+' + d
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('user_profiles')
            .select('whatsapp_phone')
            .eq('user_id', user.id)
            .maybeSingle()
          if (!cancelled) {
            const v = data?.whatsapp_phone || null
            setPhone(v)
            setDraft(v ? formatBR(v) : '')
          }
        }
      } catch (e) { console.warn('load whatsapp (agenda):', e) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const persist = async (value) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_profiles')
          .upsert({ user_id: user.id, whatsapp_phone: value }, { onConflict: 'user_id' })
        setPhone(value)
      }
    } catch (e) { console.warn('save whatsapp (agenda):', e) }
    setSaving(false)
  }

  const save = async () => {
    await persist(normalize(draft))
    setSavedJustNow(true)
    setTimeout(() => setSavedJustNow(false), 2500)
  }
  const remove = async () => { setDraft(''); await persist(null) }

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-elev2)', border: '1px solid var(--border-soft)' }}>
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
        Alfred no WhatsApp
      </div>
      <div className="flex items-center gap-3 mb-3">
        <img
          src="/alfred.png"
          alt="Alfred"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(37,211,102,0.35)' }}
        />
        <div className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          Cadastre seu número pra falar com o <strong style={{ color: '#25D366' }}>Alfred</strong> 🎩 — ele anota compromissos e gastos por mensagem ou áudio.
        </div>
      </div>

      {loading ? (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Carregando…</div>
      ) : phone ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{formatBR(phone)}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>vinculado a essa conta</div>
            </div>
            <button onClick={remove} disabled={saving} className="text-xs transition shrink-0 disabled:opacity-50" style={{ color: 'var(--text-muted)' }}>Desvincular</button>
          </div>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition w-full"
            style={{ background: '#25D366', color: 'white', boxShadow: '0 4px 14px rgba(37,211,102,0.25)' }}
          >
            <MessageCircle size={16} /> Abrir conversa com Alfred
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="tel"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Seu número com DDD (ex: 11 99999-8888)"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={save}
            disabled={saving || !draft.trim()}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition w-full disabled:opacity-50"
            style={{ background: AGENDA_ACCENT, color: '#06121a' }}
          >
            {saving ? 'Salvando…' : savedJustNow ? 'Salvo!' : 'Salvar número'}
          </button>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Depois de salvar, é só mandar mensagem pro Alfred desse número.
          </p>
        </div>
      )}
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
function EventCard({ event, onClick, compact = false, completed, onToggleComplete }) {
  const colorKey = event.color || 'cyan'
  const colorVar = `var(--accent-${colorKey})`
  const [burst, setBurst] = useState(false)

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

  const [glow, setGlow] = useState(false)

  const handleCheck = (e) => {
    e.stopPropagation()
    const wasCompleted = completed
    onToggleComplete?.()
    if (!wasCompleted) {
      setBurst(true)
      setGlow(true)
      setTimeout(() => setBurst(false), 1100)
      setTimeout(() => setGlow(false), 700)
      if (navigator.vibrate) navigator.vibrate([20, 30, 30, 30, 50])
    }
  }

  return (
    <div
      className="w-full relative rounded-xl flex items-stretch overflow-visible transition-opacity"
      style={{
        background: tintBg,
        border: `1px solid ${tintBorder}`,
        opacity: completed ? 0.6 : 1,
        animation: glow ? 'cardGlow 0.7s ease-out' : 'none',
      }}
    >
      {/* Barra lateral mais espessa pra reforçar a cor */}
      <div style={{ width: 5, background: colorVar, flexShrink: 0 }} />

      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left transition hover:opacity-95"
        style={{ padding: `${verticalPad}px 12px`, paddingRight: onToggleComplete ? 52 : 12 }}
      >
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div
            className="font-medium text-sm sm:text-base truncate"
            style={{
              color: 'var(--text-primary)',
              textDecoration: completed ? 'line-through' : 'none',
              textDecorationColor: colorVar,
              textDecorationThickness: '2px',
            }}
          >
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
      </button>

      {/* CHECK — integrado dentro do card, à direita, centralizado verticalmente */}
      {onToggleComplete && (
        <>
          <button
            onClick={handleCheck}
            className="absolute top-0 right-0 bottom-0 flex items-center justify-center transition active:scale-90 z-10"
            style={{
              width: 52,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            title={completed ? 'Marcar como não concluído' : 'Marcar como concluído'}
          >
            <span
              className="flex items-center justify-center transition-all"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: completed
                  ? `2px solid ${colorVar}`
                  : `2px solid ${tintBorder}`,
                background: completed ? colorVar : 'var(--bg-elev1)',
                boxShadow: completed
                  ? `0 0 0 4px ${tintBg}, 0 2px 12px ${tintBorder}`
                  : `0 1px 4px rgba(0,0,0,0.10)`,
                animation: burst ? 'checkPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
              }}
            >
              {completed && <Check size={18} color="#fff" strokeWidth={3.5} />}
            </span>
          </button>
          {burst && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: '50%',
                right: 26,
                transform: 'translate(50%, -50%)',
                width: 80,
                height: 80,
              }}
            >
              <CompletionBurst colorVar={colorVar} />
            </div>
          )}
        </>
      )}
    </div>
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
// ============================================================
// EISENHOWER — matriz de 4 quadrantes pra priorizar tarefas.
// Codificada no campo `priority` (INTEGER) via bitwise:
//   bit 0 (1) = Importante
//   bit 1 (2) = Urgente
// Mapa:
//   0 → nem urgente nem importante (sem destaque)
//   1 → importante mas não urgente   → PLANEJAR (cyan)
//   2 → urgente mas não importante   → DELEGAR  (amber)
//   3 → urgente E importante         → FAZER AGORA (rose)
// ============================================================
const QUADRANTS = {
  0: { id: 0, label: null,           short: null,        hex: null,       bg: null,                        border: null },
  1: { id: 1, label: 'Importante',   short: 'IMP',       hex: '#06b6d4',  bg: 'rgba(6,182,212,0.10)',      border: 'rgba(6,182,212,0.35)' },
  2: { id: 2, label: 'Urgente',      short: 'URG',       hex: '#f59e0b',  bg: 'rgba(245,158,11,0.10)',     border: 'rgba(245,158,11,0.40)' },
  3: { id: 3, label: 'Fazer agora!', short: 'AGORA',     hex: '#f43f5e',  bg: 'rgba(244,63,94,0.10)',      border: 'rgba(244,63,94,0.45)' },
}
function getQuadrant(priority) {
  const p = Number(priority) || 0
  return QUADRANTS[p] || QUADRANTS[0]
}
function setUrgent(priority, on) {
  const p = Number(priority) || 0
  return on ? (p | 2) : (p & ~2)
}
function setImportant(priority, on) {
  const p = Number(priority) || 0
  return on ? (p | 1) : (p & ~1)
}
function isImportantP(p) { return ((Number(p) || 0) & 1) === 1 }
function isUrgentP(p)    { return ((Number(p) || 0) & 2) === 2 }

function getColorTint(colorKey, mode) {
  // Mapeamento manual rgba pra cada accent (não dá pra usar CSS var em alpha)
  // Opacidades calibradas pra ficarem visíveis tanto em fundo escuro quanto claro.
  const tints = {
    gold:    { bg: 'rgba(212,175,55,0.20)',  border: 'rgba(212,175,55,0.55)'  },
    emerald: { bg: 'rgba(16,185,129,0.20)',  border: 'rgba(16,185,129,0.55)'  },
    rose:    { bg: 'rgba(244,63,94,0.18)',   border: 'rgba(244,63,94,0.55)'   },
    amber:   { bg: 'rgba(245,158,11,0.20)',  border: 'rgba(245,158,11,0.55)'  },
    cyan:    { bg: 'rgba(6,182,212,0.18)',   border: 'rgba(6,182,212,0.55)'   },
    violet:  { bg: 'rgba(139,92,246,0.18)',  border: 'rgba(139,92,246,0.55)'  },
    sky:     { bg: 'rgba(14,165,233,0.18)',  border: 'rgba(14,165,233,0.55)'  },
    fuchsia: { bg: 'rgba(217,70,239,0.18)',  border: 'rgba(217,70,239,0.55)'  },
    lime:    { bg: 'rgba(132,204,22,0.20)',  border: 'rgba(132,204,22,0.55)'  },
    orange:  { bg: 'rgba(249,115,22,0.20)',  border: 'rgba(249,115,22,0.55)'  },
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
