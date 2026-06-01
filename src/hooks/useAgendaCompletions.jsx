import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Hook das CONCLUSÕES de compromissos.
// Chave: (event_id, occurrence_date) — recorrentes têm check por dia.
//
// API:
//   const { completions, isCompleted, toggleCompletion, loading } = useAgendaCompletions()
//   isCompleted(eventId, occurrenceDate) → boolean
//   toggleCompletion(eventId, occurrenceDate) → marca/desmarca
export function useAgendaCompletions() {
  const { user } = useAuth()
  const [completions, setCompletions] = useState({})  // { "eventId:occurrenceDate": completedAt }
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setCompletions({}); setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('agenda_event_completions')
        .select('event_id, occurrence_date, completed_at')
        .eq('user_id', user.id)
      if (error) throw error
      const map = {}
      for (const c of data || []) {
        map[`${c.event_id}:${c.occurrence_date}`] = c.completed_at
      }
      setCompletions(map)
    } catch (e) {
      console.error('useAgendaCompletions load:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const isCompleted = useCallback(
    (eventId, occurrenceDate) => !!completions[`${eventId}:${occurrenceDate}`],
    [completions]
  )

  const toggleCompletion = useCallback(async (eventId, occurrenceDate) => {
    if (!user) return
    const key = `${eventId}:${occurrenceDate}`
    const alreadyDone = !!completions[key]

    // Optimistic update (UI responde na hora)
    setCompletions((prev) => {
      const next = { ...prev }
      if (alreadyDone) delete next[key]
      else next[key] = new Date().toISOString()
      return next
    })

    try {
      if (alreadyDone) {
        await supabase
          .from('agenda_event_completions')
          .delete()
          .eq('event_id', eventId)
          .eq('occurrence_date', occurrenceDate)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('agenda_event_completions')
          .upsert(
            {
              event_id: eventId,
              occurrence_date: occurrenceDate,
              user_id: user.id,
              completed_at: new Date().toISOString(),
            },
            { onConflict: 'event_id,occurrence_date' }
          )
      }
    } catch (err) {
      console.error('toggleCompletion failed:', err)
      // Reverte se deu ruim
      setCompletions((prev) => {
        const next = { ...prev }
        if (alreadyDone) next[key] = new Date().toISOString()
        else delete next[key]
        return next
      })
    }
  }, [user, completions])

  return { completions, isCompleted, toggleCompletion, loading, refresh }
}
