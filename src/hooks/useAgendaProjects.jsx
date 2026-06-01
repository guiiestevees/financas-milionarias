import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Hook dos PROJETOS da agenda — pastas que agrupam tarefas.
// Tarefas com project_id NULL ficam como "avulsas".
//
// API:
//   const { projects, loading, error, refresh,
//           createProject, updateProject, deleteProject, archiveProject } = useAgendaProjects()
export function useAgendaProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!user) { setProjects([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('agenda_projects')
        .select('*')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
    } catch (e) {
      console.error('useAgendaProjects load:', e)
      setError(e.message || 'Erro ao carregar projetos')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const createProject = useCallback(async (payload) => {
    if (!user) throw new Error('Sem usuário')
    const project = {
      user_id: user.id,
      name: payload.name,
      color: payload.color || 'cyan',
      icon: payload.icon || null,
      notes: payload.notes || null,
    }
    const { data, error } = await supabase
      .from('agenda_projects')
      .insert(project)
      .select()
      .single()
    if (error) throw error
    setProjects((prev) => [data, ...prev])
    return data
  }, [user])

  const updateProject = useCallback(async (id, patch) => {
    const allowed = ['name', 'color', 'icon', 'notes', 'archived_at']
    const update = {}
    for (const k of allowed) {
      if (k in patch) update[k] = patch[k]
    }
    const { data, error } = await supabase
      .from('agenda_projects')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setProjects((prev) => {
      // Se arquivou, remove da lista visível
      if (patch.archived_at) return prev.filter((p) => p.id !== id)
      return prev.map((p) => (p.id === id ? data : p))
    })
    return data
  }, [])

  const deleteProject = useCallback(async (id) => {
    const { error } = await supabase
      .from('agenda_projects')
      .delete()
      .eq('id', id)
    if (error) throw error
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const archiveProject = useCallback(async (id) => {
    await updateProject(id, { archived_at: new Date().toISOString() })
  }, [updateProject])

  return {
    projects, loading, error, refresh,
    createProject, updateProject, deleteProject, archiveProject,
  }
}
