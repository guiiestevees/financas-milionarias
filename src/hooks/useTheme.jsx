import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Tema light/dark — ÚNICO pro app inteiro (Finanças, Agenda e menu).
//
// Antes havia temas SEPARADOS por app ('financas' / 'agenda' / global), o que
// fazia a cor mudar ao navegar entre os apps e, por causa de uma corrida entre
// salvar local e recarregar do servidor (+ duas gravações concorrentes no
// banco), o tema "voltava" sozinho depois de mudado. Agora é um tema só, com
// persistência robusta e padrão CLARO (light).
//
// Estratégia:
//   - Estado inicial vem do localStorage (síncrono, sem flicker). Padrão: light.
//   - Supabase é lido UMA vez no mount; só aplica se o usuário ainda não mexeu
//     nesta sessão (assim nunca sobrescreve uma troca recém-feita).
//   - Ao trocar: grava localStorage + Supabase (uma única gravação).

const THEME_KEY = 'domus:theme'

function readStored() {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {}
  return null
}

function readInitial() {
  return readStored() || 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#f5f4ef' : '#070912')
  }
}

// ---- Persistência no Supabase (chave única 'global') ----
async function loadThemeFromSupabase() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('user_profiles')
      .select('theme_prefs')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error || !data?.theme_prefs) return null
    const prefs = data.theme_prefs
    if (prefs.global === 'light' || prefs.global === 'dark') return prefs.global
  } catch (err) {
    console.warn('loadThemeFromSupabase:', err)
  }
  return null
}

async function saveThemeToSupabase(theme) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Lê o jsonb atual pra não apagar outras chaves, e grava UMA vez.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('theme_prefs')
      .eq('user_id', user.id)
      .maybeSingle()
    const prefs = (profile?.theme_prefs && typeof profile.theme_prefs === 'object') ? { ...profile.theme_prefs } : {}
    prefs.global = theme
    await supabase
      .from('user_profiles')
      .update({ theme_prefs: prefs })
      .eq('user_id', user.id)
  } catch (err) {
    console.warn('saveThemeToSupabase:', err)
  }
}

// O parâmetro appKey é aceito por compatibilidade com as chamadas existentes,
// mas IGNORADO de propósito — o tema é único no app inteiro.
export function useTheme(_appKey = null) {
  const [theme, setThemeState] = useState(() => readInitial())
  const skipPersist = useRef(true)   // não re-grava no 1º render nem no load do servidor
  const userTouched = useRef(false)  // trava o load do servidor depois que o user troca

  // Aplica + grava sempre que o tema muda (menos no 1º render / load do servidor)
  useEffect(() => {
    applyTheme(theme)
    if (skipPersist.current) {
      skipPersist.current = false
      return
    }
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
    saveThemeToSupabase(theme)
  }, [theme])

  // Carrega do servidor UMA vez. Só aplica se o usuário não mexeu nesta sessão.
  useEffect(() => {
    let cancelled = false
    loadThemeFromSupabase().then((serverTheme) => {
      if (cancelled || !serverTheme || userTouched.current) return
      if (serverTheme !== readStored()) {
        skipPersist.current = true  // veio do servidor: aplica, mas não re-grava
        try { localStorage.setItem(THEME_KEY, serverTheme) } catch {}
        setThemeState(serverTheme)
      }
    })
    return () => { cancelled = true }
  }, [])

  const setTheme = useCallback((next) => {
    if (next !== 'light' && next !== 'dark') return
    userTouched.current = true
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    userTouched.current = true
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggle, isLight: theme === 'light', isDark: theme === 'dark' }
}

// Inicializa o tema antes do React montar — evita "flash" do tema errado.
export function bootstrapTheme() {
  applyTheme(readInitial())
}
