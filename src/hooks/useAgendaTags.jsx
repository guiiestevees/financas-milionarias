import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Hook do CATÁLOGO DE ETIQUETAS do user.
// Etiquetas customizáveis pra organizar tarefas (Trabalho, Pessoal, Estudo, etc).
// Cada etiqueta: { id, name, color }
//
// Persistido em user_profiles.tags_catalog (jsonb).
// Se a coluna não existir (migration não rodada), o hook ainda funciona:
//   - Lista vazia
//   - Operações de write não quebram a UI (loga erro silencioso)
//
// API:
//   const { tags, loading, createTag, updateTag, deleteTag } = useAgendaTags()

function genId() {
  // Não usa crypto.randomUUID em todo navegador — fallback simples
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'tag_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

const DEFAULT_COLOR = 'cyan'

export function useAgendaTags() {
  const { user } = useAuth()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setTags([]); setLoading(false); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('tags_catalog')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) {
        // Coluna pode não existir ainda — não trava UI
        console.warn('useAgendaTags load:', error.message)
        setTags([])
      } else {
        const list = Array.isArray(data?.tags_catalog) ? data.tags_catalog : []
        setTags(list)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Salva o array atual no Supabase (sobrescreve completo)
  const persist = useCallback(async (list) => {
    if (!user) return
    try {
      await supabase
        .from('user_profiles')
        .update({ tags_catalog: list })
        .eq('user_id', user.id)
    } catch (e) {
      console.warn('useAgendaTags persist:', e)
    }
  }, [user])

  const createTag = useCallback(async ({ name, color = DEFAULT_COLOR }) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    const tag = { id: genId(), name: trimmed, color }
    const next = [...tags, tag]
    setTags(next)  // otimista
    await persist(next)
    return tag
  }, [tags, persist])

  const updateTag = useCallback(async (id, patch) => {
    const next = tags.map((t) => t.id === id ? { ...t, ...patch } : t)
    setTags(next)
    await persist(next)
  }, [tags, persist])

  const deleteTag = useCallback(async (id) => {
    const next = tags.filter((t) => t.id !== id)
    setTags(next)
    await persist(next)
  }, [tags, persist])

  // Acha pelo ID — útil pra renderizar chip a partir de tag_id
  const findTag = useCallback((id) => tags.find((t) => t.id === id), [tags])

  return {
    tags, loading, refresh,
    createTag, updateTag, deleteTag, findTag,
  }
}
