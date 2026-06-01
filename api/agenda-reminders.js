// Cron job — envia lembretes da agenda via WhatsApp do Alfred.
//
// Roda a cada 5 minutos via Vercel Cron (vercel.json).
// Busca eventos com reminder_minutes_before configurado, expande ocorrências
// próximas, e pra cada uma que cair na janela de "tempo de avisar", manda
// mensagem pelo Alfred.
//
// Pra evitar duplicar lembretes: registra na tabela agenda_reminders_sent
// (event_id + occurrence_date como PK).

import { createClient } from '@supabase/supabase-js'
import { sendWhatsApp } from './_whatsapp.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRON_SECRET = process.env.CRON_SECRET  // protege o endpoint

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Verifica se um evento ocorre numa data específica (mesma lógica do agendaUtils)
function eventOccursOnDate(event, targetIso) {
  if (event.recurring === 'none') return event.date === targetIso

  const targetDate = parseISO(targetIso)
  const startDate = parseISO(event.date)
  if (!targetDate || !startDate) return false
  if (targetDate < startDate) return false

  if (event.ends_at) {
    const endDate = parseISO(event.ends_at)
    if (targetDate > endDate) return false
  }

  if (Array.isArray(event.skipped_dates) && event.skipped_dates.includes(targetIso)) return false

  const diffDays = Math.round((targetDate - startDate) / 86400000)

  switch (event.recurring) {
    case 'daily':    return diffDays >= 0
    case 'weekly':   return diffDays >= 0 && diffDays % 7 === 0
    case 'biweekly': return diffDays >= 0 && diffDays % 14 === 0
    case 'monthly': {
      if (startDate.getUTCDate() !== targetDate.getUTCDate()) return false
      const md = (targetDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12
        + (targetDate.getUTCMonth() - startDate.getUTCMonth())
      return md >= 0
    }
    case 'weekdays': {
      const wd = Array.isArray(event.recurring_weekdays) ? event.recurring_weekdays : []
      // dia da semana em BR (UTC pode dar dia errado se evento é noturno;
      // pra horário do BR usamos getDay local convertido)
      return diffDays >= 0 && wd.length > 0 && wd.includes(targetDate.getUTCDay())
    }
    default: return false
  }
}

function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// Hora atual em São Paulo (UTC-3)
function nowBR() {
  const now = new Date()
  return new Date(now.getTime() - 3 * 60 * 60 * 1000)
}

function toISODateBR(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(t) {
  return t ? t.slice(0, 5) : ''
}

function formatReminderMessage(event, occurrenceDate, minsAhead) {
  const t = formatTime(event.time)
  const endStr = event.end_time ? ` – ${formatTime(event.end_time)}` : ''

  let whenStr
  if (minsAhead === 0) whenStr = 'agora'
  else if (minsAhead < 60) whenStr = `em ${minsAhead} minutos`
  else if (minsAhead === 60) whenStr = 'em 1 hora'
  else if (minsAhead < 1440) whenStr = `em ${Math.round(minsAhead / 60)} horas`
  else if (minsAhead === 1440) whenStr = 'amanhã'
  else whenStr = `em ${Math.round(minsAhead / 1440)} dias`

  return [
    `🎩 *Lembrete de compromisso*`,
    '',
    `*${event.title}*`,
    `⏰ ${t}${endStr} — ${whenStr}`,
    '',
    'Permita-me lembrá-lo. Até já.',
  ].join('\n')
}

export default async function handler(req, res) {
  // Proteção: só aceita request com header secreto OU do Vercel Cron (que envia x-vercel-cron)
  const auth = req.headers.authorization || ''
  const isCron = req.headers['x-vercel-cron'] === '1'
  if (!isCron && CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const a = admin()

    // 1) Busca todos eventos com reminder configurado
    const { data: events, error } = await a
      .from('agenda_events')
      .select('id, user_id, title, date, time, end_time, recurring, recurring_weekdays, ends_at, skipped_dates, reminder_minutes_before')
      .not('reminder_minutes_before', 'is', null)
      .not('time', 'is', null)
    if (error) throw error
    if (!events || events.length === 0) {
      return res.status(200).json({ ok: true, checked: 0, sent: 0 })
    }

    const now = nowBR()
    let sentCount = 0
    let checkedCount = 0

    // 2) Pra cada evento, calcula próxima ocorrência e verifica janela
    for (const event of events) {
      checkedCount++
      const remindMins = Number(event.reminder_minutes_before)
      if (isNaN(remindMins) || remindMins < 0) continue

      // Testa hoje e amanhã (cobre lembretes que cruzam dia, ex: 1 dia antes)
      for (const dayOffset of [0, 1, 2]) {
        const targetDay = new Date(now)
        targetDay.setUTCDate(targetDay.getUTCDate() + dayOffset)
        const targetIso = toISODateBR(targetDay)
        if (!eventOccursOnDate(event, targetIso)) continue

        // Calcula timestamp do evento em BR
        const [hh, mm] = event.time.split(':').map(Number)
        const eventTime = new Date(targetDay)
        eventTime.setUTCHours(hh, mm, 0, 0)

        // Hora pra mandar lembrete = eventTime - remindMins
        const remindTime = new Date(eventTime.getTime() - remindMins * 60 * 1000)

        // Janela de 5 min (uma execução do cron). Se now está nessa janela, manda.
        const diff = remindTime.getTime() - now.getTime()
        // Janela: -2 min a +5 min (pra cobrir delays de cron)
        if (diff < -2 * 60 * 1000 || diff > 5 * 60 * 1000) continue

        // Já mandou? Checa tabela auxiliar
        const { data: sentBefore } = await a
          .from('agenda_reminders_sent')
          .select('event_id')
          .eq('event_id', event.id)
          .eq('occurrence_date', targetIso)
          .maybeSingle()

        if (sentBefore) continue  // já avisado, pula

        // Busca telefone do usuário
        const { data: profile } = await a
          .from('user_profiles')
          .select('whatsapp_phone')
          .eq('user_id', event.user_id)
          .maybeSingle()

        if (!profile?.whatsapp_phone) {
          console.warn(`Evento ${event.id} (${event.title}): user sem whatsapp, skip`)
          continue
        }

        // Manda mensagem
        const msg = formatReminderMessage(event, targetIso, remindMins)
        const ok = await sendWhatsApp(profile.whatsapp_phone, msg)

        if (ok) {
          // Registra envio
          await a.from('agenda_reminders_sent').insert({
            event_id: event.id,
            occurrence_date: targetIso,
          })
          sentCount++
          console.log(`✅ Lembrete enviado: ${event.title} (${targetIso} ${event.time})`)
        }

        break  // achou a ocorrência relevante, sai do loop de offset
      }
    }

    return res.status(200).json({ ok: true, checked: checkedCount, sent: sentCount })
  } catch (err) {
    console.error('agenda-reminders error:', err)
    return res.status(500).json({ error: err.message || 'Erro interno' })
  }
}
