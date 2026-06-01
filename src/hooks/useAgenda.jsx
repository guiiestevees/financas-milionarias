import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Hook que gerencia compromissos da agenda.
// CRUD via Supabase + cache local pra UI ser responsiva.
//
// API:
//   const { events, loading, error, refresh,
//           createEvent, updateEvent, deleteEvent,
//           deleteOccurrence, deleteForever } = useAgenda()
export function useAgenda() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) { setEvents([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true })
      if (error) throw error
      setEvents(data || [])
    } catch (e) {
      console.error('useAgenda load:', e)
      setError(e.message || 'Erro ao carregar agenda')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Cria um novo evento
  const createEvent = useCallback(async (payload) => {
    if (!user) throw new Error('Sem usuário')
    const event = {
      user_id: user.id,
      title: payload.title,
      date: payload.date,
      time: payload.time || null,
      end_time: payload.end_time || null,
      location: payload.location || null,
      notes: payload.notes || null,
      color: payload.color || 'gold',
      recurring: payload.recurring || 'none',
      ends_at: payload.ends_at || null,
      skipped_dates: [],
    }
    const { data, error } = await supabase
      .from('agenda_events')
      .insert(event)
      .select()
      .single()
    if (error) throw error
    setEvents((prev) => [...prev, data])
    return data
  }, [user])

  // Atualiza um evento existente (todas as ocorrências se for recorrente)
  const updateEvent = useCallback(async (id, patch) => {
    const allowed = ['title', 'date', 'time', 'end_time', 'location', 'notes', 'color', 'recurring', 'ends_at', 'skipped_dates']
    const update = {}
    for (const k of allowed) {
      if (k in patch) update[k] = patch[k]
    }
    const { data, error } = await supabase
      .from('agenda_events')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setEvents((prev) => prev.map((e) => (e.id === id ? data : e)))
    return data
  }, [])

  // Deleta o evento por completo (todas as ocorrências, se recorrente)
  const deleteEvent = useCallback(async (id) => {
    const { error } = await supabase
      .from('agenda_events')
      .delete()
      .eq('id', id)
    if (error) throw error
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // Pula APENAS uma ocorrência específica de um recorrente (adiciona em skipped_dates)
  const deleteOccurrence = useCallback(async (eventId, occurrenceIso) => {
    const event = events.find((e) => e.id === eventId)
    if (!event) return
    const skipped = Array.isArray(event.skipped_dates) ? [...event.skipped_dates] : []
    if (!skipped.includes(occurrenceIso)) skipped.push(occurrenceIso)
    await updateEvent(eventId, { skipped_dates: skipped })
  }, [events, updateEvent])

  // Termina a recorrência a partir de uma data (mantém histórico passado)
  // Se occurrenceIso é a primeira ocorrência (date original), deleta o evento
  const deleteForever = useCallback(async (eventId, occurrenceIso) => {
    const event = events.find((e) => e.id === eventId)
    if (!event) return
    // Se a ocorrência é a primeira ou anterior à primeira, deleta tudo
    if (occurrenceIso <= event.date) {
      await deleteEvent(eventId)
      return
    }
    // Senão, seta ends_at = dia anterior à occurrenceIso (não inclui ela em diante)
    const d = new Date(occurrenceIso + 'T00:00')
    d.setDate(d.getDate() - 1)
    const endsAt = d.toISOString().slice(0, 10)
    await updateEvent(eventId, { ends_at: endsAt })
  }, [events, deleteEvent, updateEvent])

  return {
    events,
    loading,
    error,
    refresh,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteOccurrence,
    deleteForever,
  }
}
