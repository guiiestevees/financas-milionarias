import { useEffect, useState, useCallback } from 'react'

// Hook pra gerenciar tema light/dark, com SUPORTE A TEMA POR APP.
// - Cada app (finanças, agenda) pode ter seu próprio tema salvo
// - Existe também um tema 'global' como fallback
// - Aplicado via data-theme no <html>, CSS responde via variáveis
//
// Uso:
//   const { theme, setTheme, toggle } = useTheme()           // global
//   const { theme, setTheme, toggle } = useTheme('financas') // específico do app
//   const { theme, setTheme, toggle } = useTheme('agenda')
//
// Lógica de leitura:
//   - Se appKey passado E tem valor salvo pra ele → usa esse
//   - Senão, cai no global
//   - Senão, usa default 'light'

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
  // Atualiza a meta theme-color pra barra do navegador combinar
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#f5f4ef' : '#070912')
  }
}

export function useTheme(appKey = null) {
  const [theme, setThemeState] = useState(() => readInitial(appKey))

  // Re-lê quando o appKey muda (ex: usuário navega entre Finanças e Agenda)
  useEffect(() => {
    const next = readInitial(appKey)
    setThemeState(next)
    applyTheme(next)
  }, [appKey])

  // Aplica + persiste sempre que tema muda
  useEffect(() => {
    applyTheme(theme)
    try {
      if (appKey) {
        // Salva o tema desse app específico
        localStorage.setItem(APP_KEY_PREFIX + appKey, theme)
      } else {
        // Sem appKey: atualiza o global
        localStorage.setItem(GLOBAL_KEY, theme)
      }
    } catch {}
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
// No boot, usa o GLOBAL (app específico é aplicado depois quando o componente monta).
export function bootstrapTheme() {
  applyTheme(readInitial(null))
}
