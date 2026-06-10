import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Hook pra gerenciar tema light/dark, com:
//   - Suporte a tema POR APP (financas, agenda)
//   - Persistência DUPLA: localStorage (cache rápido) + Supabase (entre dispositivos)
//
// Estratégia de leitura:
//   1) localStorage primeiro (síncrono, sem flicker no boot)
//   2) Supabase em background (atualiza se for diferente)
//
// Estratégia de escrita:
//   - localStorage IMEDIATO (UI responde na hora)
//   - Supabase ASYNC (best-effort, não bloqueia)
//
// Uso:
//   const { theme, setTheme, toggle } = useTheme()           // global
//   const { theme, setTheme, toggle } = useTheme('financas') // específico
//   const { theme, setTheme, toggle } = useTheme('agenda')

const GLOBAL_KEY = 'domus:theme'
const APP_KEY_PREFIX = 'domus:theme:'

function readStored(appKey) {
  if (typeof window === 'undefined') return null
  try {
    if (appKey) {
      const v = localStorage.getItem(APP_KEY_PREFIX + appKey)
      if (v === 'light' || v === 'dark') return v
    }
    const g = localStorage.getItem(GLOBAL_KEY)
    if (g === 'light' || g === 'dark') return g
  } catch {}
  return null
}

function readInitial(appKey) {
  return readStored(appKey) || 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#f5f4ef' : '#070912')
  }
}

// ---- Persistência no Supabase ----
async function loadThemeFromSupabase(appKey) {
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
    if (appKey && (prefs[appKey] === 'light' || prefs[appKey] === 'dark')) {
      return prefs[appKey]
    }
    if (prefs.global === 'light' || prefs.global === 'dark') {
      return prefs.global
    }
  } catch (err) {
    console.warn('loadThemeFromSupabase:', err)
  }
  return null
}

async function saveThemeToSupabase(appKey, theme) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Lê o jsonb atual pra não sobrescrever as outras chaves
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('theme_prefs')
      .eq('user_id', user.id)
      .maybeSingle()
    const prefs = (profile?.theme_prefs && typeof profile.theme_prefs === 'object') ? { ...profile.theme_prefs } : {}
    prefs[appKey || 'global'] = theme
    await supabase
      .from('user_profiles')
      .update({ theme_prefs: prefs })
      .eq('user_id', user.id)
  } catch (err) {
    console.warn('saveThemeToSupabase:', err)
  }
}

export function useTheme(appKey = null) {
  const [theme, setThemeState] = useState(() => readInitial(appKey))
  const skipNextSync = useRef(false)  // evita re-save quando carrega do Supabase

  // Re-lê localStorage quando appKey muda (navegação entre apps)
  useEffect(() => {
    const next = readInitial(appKey)
    setThemeState(next)
    applyTheme(next)
  }, [appKey])

  // Sincroniza com Supabase no mount (background, sem bloquear UI)
  useEffect(() => {
    let cancelled = false
    loadThemeFromSupabase(appKey).then((serverTheme) => {
      if (cancelled || !serverTheme) return
      // Só atualiza se for diferente do que tá em memória
      if (serverTheme !== theme) {
        skipNextSync.current = true
        setThemeState(serverTheme)
      }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appKey])

  // Aplica + persiste local + sync com servidor sempre que tema muda
  useEffect(() => {
    applyTheme(theme)

    // localStorage imediato
    try {
      if (appKey) {
        localStorage.setItem(APP_KEY_PREFIX + appKey, theme)
        // Também atualiza o GLOBAL — assim a Launcher (sem appKey) e o
        // bootstrap inicial refletem a última escolha do user.
        localStorage.setItem(GLOBAL_KEY, theme)
      } else {
        localStorage.setItem(GLOBAL_KEY, theme)
      }
    } catch {}

    // Supabase async — pula se foi setado pelo próprio load do servidor
    if (skipNextSync.current) {
      skipNextSync.current = false
      return
    }
    saveThemeToSupabase(appKey, theme)
    // Se setou em app específico, também salva como global no servidor
    if (appKey) saveThemeToSupabase(null, theme)
  }, [theme, appKey])

  const setTheme = useCallback((next) => {
    if (next === 'light' || next === 'dark') setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggle, isLight: theme === 'light', isDark: theme === 'dark' }
}

// Inicializa o tema antes do React montar — evita "flash" do tema errado.
// No boot, usa o GLOBAL local (Supabase é carregado depois pelo hook).
export function bootstrapTheme() {
  applyTheme(readInitial(null))
}
