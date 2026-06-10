import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Hook das TAREFAS da agenda — coisas pra fazer SEM data marcada.
// Diferente do useAgenda (que cuida de compromissos com data/hora).
//
// API:
//   const { tasks, pending, completed, loading, error, refresh,
//           createTask, updateTask, toggleTask, deleteTask } = useAgendaTasks()
export function useAgendaTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('agenda_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
    } catch (e) {
      console.error('useAgendaTasks load:', e)
      setError(e.message || 'Erro ao carregar tarefas')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const createTask = useCallback(async (payload) => {
    if (!user) throw new Error('Sem usuário')
    const task = {
      user_id: user.id,
      title: payload.title,
      notes: payload.notes || null,
      color: payload.color || 'cyan',
      priority: payload.priority ? 1 : 0,
      project_id: payload.project_id || null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
    }
    const { data, error } = await supabase
      .from('agenda_tasks')
      .insert(task)
      .select()
      .single()
    if (error) throw error
    setTasks((prev) => [data, ...prev])
    return data
  }, [user])

  const updateTask = useCallback(async (id, patch) => {
    const allowed = ['title', 'notes', 'color', 'priority', 'completed_at', 'project_id', 'tags']
    const update = {}
    for (const k of allowed) {
      if (k in patch) update[k] = patch[k]
    }
    const { data, error } = await supabase
      .from('agenda_tasks')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTasks((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }, [])

  // Marca como feita / desmarca
  const toggleTask = useCallback(async (id) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const completed_at = task.completed_at ? null : new Date().toISOString()
    await updateTask(id, { completed_at })
  }, [tasks, updateTask])

  const deleteTask = useCallback(async (id) => {
    const { error } = await supabase
      .from('agenda_tasks')
      .delete()
      .eq('id', id)
    if (error) throw error
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pending = tasks.filter((t) => !t.completed_at)
  const completed = tasks.filter((t) => !!t.completed_at)

  return {
    tasks, pending, completed,
    loading, error, refresh,
    createTask, updateTask, toggleTask, deleteTask,
  }
}
