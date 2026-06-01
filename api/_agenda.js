// Helpers da Agenda usados pelo whatsapp-webhook.js
// Mantém aqui pra não inflar mais o webhook (que já tá grandinho).
//
// Exporta:
//   - loadAgendaContext(admin, userId)  → pra ser anexado no prompt do Claude
//   - createAgendaEvent(admin, userId, params)
//   - createAgendaTask(admin, userId, params)
//   - markTaskCompleteByTitle(admin, userId, fuzzyTitle)
//   - listAgendaEvents(admin, userId, fromIso, toIso)
//   - formatEventConfirmation(event, opts)
//   - formatTaskConfirmation(task, project)
//   - formatAgendaList(events)

// ---------- Carrega contexto da agenda pro Claude ----------
// Pega:
//   - projetos ativos (id, name, color, icon)
//   - tarefas pendentes (id, title, project_id)
//   - próximos 14 dias de eventos (expandidos pra ele saber o que já tem)
export async function loadAgendaContext(admin, userId) {
  const [projectsRes, tasksRes, eventsRes] = await Promise.all([
    admin
      .from('agenda_projects')
      .select('id, name, color, icon')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    admin
      .from('agenda_tasks')
      .select('id, title, project_id, priority, completed_at')
      .eq('user_id', userId)
      .is('completed_at', null)
      .order('priority', { ascending: false })
      .limit(30),
    admin
      .from('agenda_events')
      .select('id, title, date, time, end_time, recurring, recurring_weekdays, ends_at, skipped_dates, location')
      .eq('user_id', userId)
      .gte('date', shiftIso(todayIso(), -7))  // pega tb eventos passados que possam recorrer
      .order('date', { ascending: true })
      .limit(100),
  ])

  return {
    projects: projectsRes.data || [],
    tasks: tasksRes.data || [],
    events: eventsRes.data || [],
  }
}

// Formata pro prompt do Claude como string
export function formatAgendaForPrompt(agendaCtx) {
  const lines = []

  if (agendaCtx.projects.length > 0) {
    lines.push('Projetos cadastrados (use o nome EXATO se mencionar):')
    for (const p of agendaCtx.projects) {
      lines.push(`  - ${p.name}${p.icon ? ` ${p.icon}` : ''}`)
    }
  } else {
    lines.push('Projetos cadastrados: nenhum')
  }

  if (agendaCtx.tasks.length > 0) {
    lines.push('')
    lines.push('Tarefas pendentes atuais (até 30):')
    for (const t of agendaCtx.tasks) {
      const projectName = t.project_id
        ? agendaCtx.projects.find((p) => p.id === t.project_id)?.name || '?'
        : null
      lines.push(`  - "${t.title}"${projectName ? ` [projeto: ${projectName}]` : ''}${t.priority ? ' ⭐' : ''}`)
    }
  } else {
    lines.push('')
    lines.push('Tarefas pendentes: nenhuma')
  }

  // Próximos eventos expandidos (próximos 14 dias)
  const today = todayIso()
  const horizon = shiftIso(today, 14)
  const expanded = []
  for (let i = 0; i <= 14; i++) {
    const dateIso = shiftIso(today, i)
    for (const ev of agendaCtx.events) {
      if (eventOccursOnDate(ev, dateIso)) {
        expanded.push({ ...ev, occurrenceDate: dateIso })
      }
    }
  }
  if (expanded.length > 0) {
    lines.push('')
    lines.push(`Próximos compromissos (até ${horizon}):`)
    for (const e of expanded.slice(0, 40)) {
      const time = e.time ? ` ${e.time.slice(0, 5)}` : ''
      lines.push(`  - ${e.occurrenceDate}${time}: ${e.title}`)
    }
    if (expanded.length > 40) lines.push(`  (... +${expanded.length - 40} omitidos)`)
  } else {
    lines.push('')
    lines.push('Próximos compromissos: nenhum agendado')
  }

  return lines.join('\n')
}

// ---------- Cria evento ----------
export async function createAgendaEvent(admin, userId, params) {
  const event = {
    user_id: userId,
    title: params.title || 'Compromisso',
    date: params.date || todayIso(),
    time: params.time || null,
    end_time: params.end_time || null,
    location: params.location || null,
    notes: params.notes || null,
    color: params.color || 'cyan',
    recurring: params.recurring || 'none',
    recurring_weekdays: Array.isArray(params.recurring_weekdays) && params.recurring_weekdays.length > 0
      ? params.recurring_weekdays
      : null,
    ends_at: params.ends_at || null,
    reminder_minutes_before: typeof params.reminder_minutes_before === 'number'
      ? params.reminder_minutes_before
      : null,
    skipped_dates: [],
  }
  const { data, error } = await admin
    .from('agenda_events')
    .insert(event)
    .select()
    .single()
  if (error) {
    console.error('createAgendaEvent error:', error)
    throw error
  }
  return data
}

// ---------- Cria tarefa ----------
// projectName é fuzzy match contra os projetos cadastrados
export async function createAgendaTask(admin, userId, params, agendaCtx) {
  let projectId = null
  if (params.project_name && agendaCtx?.projects) {
    const found = findProjectByName(agendaCtx.projects, params.project_name)
    if (found) projectId = found.id
  }
  const task = {
    user_id: userId,
    title: params.title || 'Tarefa',
    notes: params.notes || null,
    color: 'cyan',
    priority: params.priority ? 1 : 0,
    project_id: projectId,
  }
  const { data, error } = await admin
    .from('agenda_tasks')
    .insert(task)
    .select()
    .single()
  if (error) {
    console.error('createAgendaTask error:', error)
    throw error
  }
  return { task: data, project: agendaCtx?.projects?.find((p) => p.id === projectId) || null }
}

// ---------- Marca tarefa como feita (fuzzy por título) ----------
export async function markTaskCompleteByTitle(admin, userId, fuzzyTitle, agendaCtx) {
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const target = norm(fuzzyTitle)
  const candidates = (agendaCtx?.tasks || []).map((t) => ({
    t, score: similarity(norm(t.title), target),
  })).sort((a, b) => b.score - a.score)

  const best = candidates[0]
  if (!best || best.score < 0.4) return null

  const { data, error } = await admin
    .from('agenda_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', best.t.id)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) {
    console.error('markTaskComplete error:', error)
    return null
  }
  return data
}

// Similaridade simples (token-based) entre 0 e 1
function similarity(a, b) {
  if (a === b) return 1
  if (!a || !b) return 0
  if (a.includes(b) || b.includes(a)) return 0.85
  const ta = new Set(a.split(/\s+/).filter((s) => s.length >= 3))
  const tb = new Set(b.split(/\s+/).filter((s) => s.length >= 3))
  if (ta.size === 0 || tb.size === 0) return 0
  let common = 0
  for (const t of ta) if (tb.has(t)) common++
  return common / Math.max(ta.size, tb.size)
}

// ---------- Lista eventos num range ----------
export async function listAgendaEvents(admin, userId, fromIso, toIso) {
  const { data, error } = await admin
    .from('agenda_events')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  if (error) {
    console.error('listAgendaEvents error:', error)
    return []
  }
  const result = []
  const start = fromIso || todayIso()
  const end = toIso || shiftIso(start, 7)
  let cursor = start
  while (cursor <= end) {
    for (const ev of data || []) {
      if (eventOccursOnDate(ev, cursor)) result.push({ ...ev, occurrenceDate: cursor })
    }
    cursor = shiftIso(cursor, 1)
  }
  return result.sort((a, b) => {
    const cmp = a.occurrenceDate.localeCompare(b.occurrenceDate)
    if (cmp !== 0) return cmp
    return (a.time || '99').localeCompare(b.time || '99')
  })
}

// ---------- Encontra projeto por nome fuzzy ----------
function findProjectByName(projects, name) {
  if (!name) return null
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const target = norm(name)
  // 1) Match exato
  let found = projects.find((p) => norm(p.name) === target)
  if (found) return found
  // 2) Contém
  found = projects.find((p) => norm(p.name).includes(target) || target.includes(norm(p.name)))
  if (found) return found
  return null
}

// ---------- Formatadores de mensagem (estilo Alfred) ----------
export function formatEventConfirmation(event) {
  const lines = ['🗓 *Compromisso anotado*', '']
  lines.push(`*${event.title}*`)
  lines.push(`📅 ${formatDateBR(event.date)}${event.time ? ` às ${event.time.slice(0, 5)}` : ' (dia inteiro)'}`)
  if (event.end_time) lines.push(`⏰ Até ${event.end_time.slice(0, 5)}`)
  if (event.location) lines.push(`📍 ${event.location}`)
  if (event.recurring && event.recurring !== 'none') {
    const recLabel = {
      daily: 'todo dia',
      weekly: 'toda semana',
      biweekly: 'a cada duas semanas',
      monthly: 'todo mês',
      weekdays: 'em dias específicos da semana',
    }[event.recurring] || event.recurring
    lines.push(`🔁 Repete: ${recLabel}`)
  }
  if (event.reminder_minutes_before != null) {
    const m = event.reminder_minutes_before
    let when
    if (m === 0) when = 'na hora'
    else if (m < 60) when = `${m} min antes`
    else if (m === 60) when = '1 hora antes'
    else if (m < 1440) when = `${Math.round(m / 60)} horas antes`
    else if (m === 1440) when = '1 dia antes'
    else when = `${Math.round(m / 1440)} dias antes`
    lines.push(`🔔 Aviso: ${when}`)
  }
  lines.push('')
  lines.push('🎩 _Anotado em sua agenda. Cuidarei do lembrete._')
  return lines.join('\n')
}

export function formatTaskConfirmation(task, project) {
  const lines = ['✅ *Tarefa anotada*', '']
  lines.push(`*${task.title}*`)
  if (project) lines.push(`📁 Projeto: ${project.icon ? project.icon + ' ' : ''}${project.name}`)
  if (task.priority === 1) lines.push('⭐ Marcada como importante')
  lines.push('')
  lines.push('🎩 _Adicionei à sua lista. Quando definir o dia, posso agendar._')
  return lines.join('\n')
}

export function formatAgendaList(events, label) {
  if (!events || events.length === 0) {
    return `🎩 ${label ? `Para ${label.toLowerCase()}: ` : ''}sua agenda está livre. Aproveite.`
  }
  const lines = [`🗓 *${label || 'Próximos compromissos'}*`, '']
  // Agrupa por data
  const byDate = {}
  for (const e of events) {
    if (!byDate[e.occurrenceDate]) byDate[e.occurrenceDate] = []
    byDate[e.occurrenceDate].push(e)
  }
  for (const date of Object.keys(byDate).sort()) {
    lines.push(`📅 *${formatDateBR(date)}*`)
    for (const e of byDate[date]) {
      const time = e.time ? `${e.time.slice(0, 5)}${e.end_time ? `–${e.end_time.slice(0, 5)}` : ''}` : 'dia todo'
      lines.push(`  • ${time} — ${e.title}${e.location ? ` (${e.location})` : ''}`)
    }
  }
  lines.push('')
  lines.push('🎩 _Algo a acrescentar?_')
  return lines.join('\n')
}

// ---------- Date utils ----------
export function todayIso() {
  // Hora São Paulo (UTC-3) — calcula data BR
  const now = new Date()
  const br = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const y = br.getUTCFullYear()
  const m = String(br.getUTCMonth() + 1).padStart(2, '0')
  const d = String(br.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const ny = dt.getUTCFullYear()
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const nd = String(dt.getUTCDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

function formatDateBR(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const today = todayIso()
  const tomorrow = shiftIso(today, 1)
  const yest = shiftIso(today, -1)
  if (iso === today) return `hoje (${d}/${String(m).padStart(2, '0')})`
  if (iso === tomorrow) return `amanhã (${d}/${String(m).padStart(2, '0')})`
  if (iso === yest) return `ontem (${d}/${String(m).padStart(2, '0')})`
  // Próximos 6 dias mostra dia da semana
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dtToday = new Date(today + 'T00:00:00Z')
  const diff = Math.round((dt - dtToday) / 86400000)
  if (diff > 0 && diff <= 6) {
    const wd = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][dt.getUTCDay()]
    return `${wd} (${d}/${String(m).padStart(2, '0')})`
  }
  return `${d} de ${months[m - 1]}${y !== new Date().getFullYear() ? ` de ${y}` : ''}`
}

// ---------- Lógica de recorrência (mesma do agendaUtils, replicada aqui) ----------
function eventOccursOnDate(event, targetIso) {
  if (!event) return false
  if (!event.recurring || event.recurring === 'none') return event.date === targetIso

  const targetDate = parseIso(targetIso)
  const startDate = parseIso(event.date)
  if (!targetDate || !startDate) return false
  if (targetDate < startDate) return false

  if (event.ends_at) {
    const endDate = parseIso(event.ends_at)
    if (targetDate > endDate) return false
  }

  if (Array.isArray(event.skipped_dates) && event.skipped_dates.includes(targetIso)) return false

  const diffDays = Math.round((targetDate - startDate) / 86400000)

  switch (event.recurring) {
    case 'daily': return diffDays >= 0
    case 'weekly': return diffDays >= 0 && diffDays % 7 === 0
    case 'biweekly': return diffDays >= 0 && diffDays % 14 === 0
    case 'monthly': {
      if (startDate.getUTCDate() !== targetDate.getUTCDate()) return false
      const md = (targetDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12
        + (targetDate.getUTCMonth() - startDate.getUTCMonth())
      return md >= 0
    }
    case 'weekdays': {
      const wd = Array.isArray(event.recurring_weekdays) ? event.recurring_weekdays : []
      return diffDays >= 0 && wd.length > 0 && wd.includes(targetDate.getUTCDay())
    }
    default: return false
  }
}

function parseIso(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
