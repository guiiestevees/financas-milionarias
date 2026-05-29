import { useEffect, useState, useCallback } from 'react'

// Hook simples pra gerenciar tema light/dark.
// - Persistência: localStorage (sem trip pro Supabase pra ficar instantâneo)
// - Default: 'dark' (preserva o look original do app)
// - Aplicação: seta data-theme no <html>, o CSS faz o resto via variáveis
//
// Uso:
//   const { theme, setTheme, toggle } = useTheme()
//   <button onClick={toggle}>Trocar tema</button>

const STORAGE_KEY = 'domus:theme'

function readInitial() {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'light'  // default
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

export function useTheme() {
  const [theme, setThemeState] = useState(readInitial)

  // Aplica na montagem e quando muda
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const setTheme = useCallback((next) => {
    if (next === 'light' || next === 'dark') setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, setTheme, toggle, isLight: theme === 'light', isDark: theme === 'dark' }
}

// Inicializa o tema antes do React montar — evita "flash" do tema errado
// quando a página carrega. Chame isso no main.jsx antes de renderizar o app.
export function bootstrapTheme() {
  applyTheme(readInitial())
}
