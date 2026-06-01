// Helpers da Agenda: cálculos de data + expansão de recorrência.

// Cores disponíveis pros compromissos (espelha accents do app)
export const AGENDA_COLORS = [
  { id: 'gold',    name: 'Dourado',   hex: 'var(--accent-gold)' },
  { id: 'emerald', name: 'Verde',     hex: 'var(--accent-emerald)' },
  { id: 'rose',    name: 'Vermelho',  hex: 'var(--accent-rose)' },
  { id: 'amber',   name: 'Âmbar',     hex: 'var(--accent-amber)' },
  { id: 'cyan',    name: 'Ciano',     hex: 'var(--accent-cyan)' },
  { id: 'violet',  name: 'Violeta',   hex: 'var(--accent-violet)' },
  { id: 'sky',     name: 'Azul',      hex: 'var(--accent-sky)' },
  { id: 'fuchsia', name: 'Rosa',      hex: 'var(--accent-fuchsia)' },
]

export const RECURRENCE_OPTIONS = [
  { id: 'none',     label: 'Não se repete',                         short: 'Único' },
  { id: 'daily',    label: 'Todos os dias',                         short: 'Diário' },
  { id: 'weekdays', label: 'Dias específicos da semana',            short: 'Dias da semana' },
  { id: 'weekly',   label: 'Toda semana (mesmo dia da semana)',     short: 'Semanal' },
  { id: 'biweekly', label: 'A cada 2 semanas',                      short: 'Quinzenal' },
  { id: 'monthly',  label: 'Todo mês (mesmo dia do mês)',           short: 'Mensal' },
]

// Helpers de dias da semana (0=dom, 1=seg, ..., 6=sáb)
export const WEEKDAY_LABELS = [
  { id: 0, short: 'D', label: 'Domingo' },
  { id: 1, short: 'S', label: 'Segunda' },
  { id: 2, short: 'T', label: 'Terça' },
  { id: 3, short: 'Q', label: 'Quarta' },
  { id: 4, short: 'Q', label: 'Quinta' },
  { id: 5, short: 'S', label: 'Sexta' },
  { id: 6, short: 'S', label: 'Sábado' },
]

// Presets úteis pra "dias da semana"
export const WEEKDAY_PRESETS = [
  { id: 'weekdays_workdays', label: 'Seg–Sex (dias úteis)', days: [1, 2, 3, 4, 5] },
  { id: 'weekdays_weekends', label: 'Sáb–Dom (fim de semana)', days: [0, 6] },
]

// ---------- Formatação ----------

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)  // construtor local — evita UTC shift
}

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAY_NAMES_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function formatDateBR(iso) {
  const d = parseISODate(iso)
  if (!d) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

export function formatDateLong(iso) {
  const d = parseISODate(iso)
  if (!d) return ''
  return `${DAY_NAMES_LONG[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`
}

export function formatDateShort(iso) {
  const d = parseISODate(iso)
  if (!d) return ''
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getDayName(iso, long = false) {
  const d = parseISODate(iso)
  if (!d) return ''
  return (long ? DAY_NAMES_LONG : DAY_NAMES)[d.getDay()]
}

export function isToday(iso) {
  return iso === todayISO()
}

export function isTomorrow(iso) {
  const d = parseISODate(iso)
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return d && d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

export function isYesterday(iso) {
  const d = parseISODate(iso)
  const t = new Date()
  t.setDate(t.getDate() - 1)
  return d && d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

// "Hoje", "Amanhã", "Ontem", "Quarta, 25/jan" etc
export function formatFriendlyDate(iso) {
  if (isToday(iso)) return 'Hoje'
  if (isTomorrow(iso)) return 'Amanhã'
  if (isYesterday(iso)) return 'Ontem'
  return formatDateShort(iso)
}

// ---------- Semana ----------

// Retorna a segunda-feira da semana de uma data (semana BR começa segunda)
export function getStartOfWeek(iso) {
  const d = parseISODate(iso) || new Date()
  const day = d.getDay()  // 0 = dom, 1 = seg, ...
  const diff = day === 0 ? -6 : 1 - day  // ajusta pra segunda
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

// Retorna array de 7 ISOs começando na segunda da semana
export function getWeekDates(refIso) {
  const start = parseISODate(getStartOfWeek(refIso))
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(toISODate(d))
  }
  return dates
}

// Avança/retrocede X dias
export function shiftDays(iso, days) {
  const d = parseISODate(iso) || new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// ---------- Recorrência: expansão ----------

// Dado um evento "raiz" (recurring != 'none'), retorna se ele OCORRE numa data específica.
function eventOccursOnDate(event, targetIso) {
  if (event.recurring === 'none') {
    return event.date === targetIso
  }

  const targetDate = parseISODate(targetIso)
  const startDate = parseISODate(event.date)
  if (!targetDate || !startDate) return false
  if (targetDate < startDate) return false

  // Acabou (ends_at)
  if (event.ends_at) {
    const endDate = parseISODate(event.ends_at)
    if (targetDate > endDate) return false
  }

  // Pulado individualmente
  if (Array.isArray(event.skipped_dates) && event.skipped_dates.includes(targetIso)) {
    return false
  }

  const diffMs = targetDate.getTime() - startDate.getTime()
  const diffDays = Math.round(diffMs / 86400000)

  switch (event.recurring) {
    case 'daily':    return diffDays >= 0
    case 'weekly':   return diffDays >= 0 && diffDays % 7 === 0
    case 'biweekly': return diffDays >= 0 && diffDays % 14 === 0
    case 'monthly':  {
      if (startDate.getDate() !== targetDate.getDate()) return false
      const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12
        + (targetDate.getMonth() - startDate.getMonth())
      return monthsDiff >= 0
    }
    case 'weekdays': {
      // Acontece nos dias da semana listados em recurring_weekdays
      const wd = Array.isArray(event.recurring_weekdays) ? event.recurring_weekdays : []
      if (wd.length === 0) return false
      return diffDays >= 0 && wd.includes(targetDate.getDay())
    }
    default: return false
  }
}

// Pega TODOS os eventos que ocorrem numa data específica.
// Considera eventos únicos + recorrentes (expandidos virtualmente).
// Retorna cada ocorrência como { ...event, occurrenceDate: targetIso, isOccurrence: true }
export function getEventsForDate(events, targetIso) {
  return (events || [])
    .filter((e) => eventOccursOnDate(e, targetIso))
    .map((e) => ({
      ...e,
      occurrenceDate: targetIso,
      isOccurrence: e.recurring !== 'none',
    }))
    .sort((a, b) => {
      // Ordena por hora (eventos sem hora vão pro fim)
      const aTime = a.time || '99:99'
      const bTime = b.time || '99:99'
      return aTime.localeCompare(bTime)
    })
}

// Pega eventos do range (pra visualização semanal). Map { isoDate: [events] }
export function getEventsForRange(events, fromIso, toIso) {
  const fromDate = parseISODate(fromIso)
  const toDate = parseISODate(toIso)
  if (!fromDate || !toDate) return {}

  const byDate = {}
  let cursor = new Date(fromDate)
  while (cursor <= toDate) {
    const iso = toISODate(cursor)
    const evs = getEventsForDate(events, iso)
    if (evs.length > 0) byDate[iso] = evs
    cursor.setDate(cursor.getDate() + 1)
  }
  return byDate
}

// Formata hora HH:MM (sem segundos)
export function formatTime(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

export function formatTimeRange(start, end) {
  if (!start) return 'Dia inteiro'
  const s = formatTime(start)
  if (!end) return s
  return `${s} – ${formatTime(end)}`
}
